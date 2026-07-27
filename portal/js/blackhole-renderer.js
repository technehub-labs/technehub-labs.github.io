// ═══════════════════════════════════════════════════════════════
// Black Hole Renderer — Schwarzschild geodesic integrator + post FX
// Loads GLSL shaders as text, builds a multi-pass WebGL2 pipeline.
// ═══════════════════════════════════════════════════════════════
import * as THREE from '../../vendor/three/three.module.js';
import { shaderCache } from './shader-loader.js';

const QUALITY_PRESETS = {
  standard:   { steps: 90,  stepSize: 0.12, jitter: 0.6, bloom: 0.7,  ca: 0.0015, grain: 0.04, exposure: 1.0 },
  high:       { steps: 140, stepSize: 0.10, jitter: 0.5, bloom: 0.85, ca: 0.0020, grain: 0.03, exposure: 1.05 },
  ultra:      { steps: 200, stepSize: 0.08, jitter: 0.4, bloom: 1.0,  ca: 0.0025, grain: 0.025, exposure: 1.1 },
  cinematic:  { steps: 256, stepSize: 0.06, jitter: 0.3, bloom: 1.2,  ca: 0.0030, grain: 0.02, exposure: 1.15 },
};

export class BlackHoleRenderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.quality = opts.quality || 'standard';
    this.onFps = opts.onFps || (() => {});

    // camera orbit state
    this.cameraYaw = 0.3;
    this.cameraPitch = 0.18;
    this.cameraDist = 8.5;
    this.targetYaw = this.cameraYaw;
    this.targetPitch = this.cameraPitch;
    this.targetDist = this.cameraDist;

    // interaction
    this.userInteracting = false;
    this.autoOrbit = true;
    this.autoOrbitSpeed = 0.04;

    this._initRenderer();
    this._initScenes();
    this._initTargets();
    this._initShaders();
    this._initEvents();

    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.fpsTime = 0;
    this.running = true;
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,           // TAA handles AA
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;
    this._resize();
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    if (this.rtScene) this._initTargets();
  }

  _initScenes() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.PlaneGeometry(2, 2);
  }

  _initTargets() {
    const w = this.width, h = this.height;
    const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    if (this.rtScene) { this.rtScene.dispose(); this.rtBloom.dispose(); this.rtBlur1.dispose(); this.rtBlur2.dispose(); this.rtComposite.dispose(); this.rtHistory.dispose(); }
    this.rtScene   = new THREE.WebGLRenderTarget(w, h, opts);
    this.rtBloom   = new THREE.WebGLRenderTarget(w, h, opts);
    this.rtBlur1  = new THREE.WebGLRenderTarget(w, h, opts);
    this.rtBlur2  = new THREE.WebGLRenderTarget(w, h, opts);
    this.rtComposite = new THREE.WebGLRenderTarget(w, h, opts);
    this.rtHistory = new THREE.WebGLRenderTarget(w, h, opts);
  }

  async _initShaders() {
    const [vert, frag, bright, blur, comp] = await Promise.all([
      shaderCache.load('fullscreen.vert.glsl'),
      shaderCache.load('blackhole.frag.glsl'),
      shaderCache.load('brightpass.frag.glsl'),
      shaderCache.load('blur.frag.glsl'),
      shaderCache.load('composite.frag.glsl'),
    ]);

    const p = QUALITY_PRESETS[this.quality];

    // main black hole pass
    this.bhMat = new THREE.RawShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uTime: { value: 0 },
        uCameraDist: { value: this.cameraDist },
        uCameraYaw: { value: this.cameraYaw },
        uCameraPitch: { value: this.cameraPitch },
        uDiskInner: { value: 2.6 },
        uDiskOuter: { value: 7.5 },
        uDiskThick: { value: 0.35 },
        uDiskBright: { value: 1.4 },
        uDopplerStrength: { value: 1.0 },
        uGravRedshift: { value: 1.0 },
        uNoiseScale: { value: 0.55 },
        uQuality: { value: 1.0 },
        uSteps: { value: p.steps },
        uStepSize: { value: p.stepSize },
        uExposure: { value: 1.0 },
        uStarBrightness: { value: 1.0 },
        uGalaxyBrightness: { value: 0.7 },
        uDiskColorHot: { value: new THREE.Color(0.85, 0.92, 1.0) },
        uDiskColorCool: { value: new THREE.Color(1.0, 0.45, 0.18) },
        uJitter: { value: p.jitter },
      },
    });
    this.bhQuad = new THREE.Mesh(this.quad, this.bhMat);
    this.scene.add(this.bhQuad);

    // bright pass
    this.brightMat = new THREE.RawShaderMaterial({
      vertexShader: vert, fragmentShader: bright,
      uniforms: { uScene: { value: this.rtScene.texture }, uThreshold: { value: 0.7 } },
    });

    // blur pass
    this.blurMat = new THREE.RawShaderMaterial({
      vertexShader: vert, fragmentShader: blur,
      uniforms: { uImage: { value: null }, uTexel: { value: new THREE.Vector2() }, uHorizontal: { value: 1 } },
    });

    // composite
    this.compMat = new THREE.RawShaderMaterial({
      vertexShader: vert, fragmentShader: comp,
      uniforms: {
        uScene: { value: this.rtScene.texture },
        uBloom: { value: this.rtBlur2.texture },
        uHistory: { value: this.rtHistory.texture },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uTime: { value: 0 },
        uBloomStrength: { value: p.bloom },
        uGrainStrength: { value: p.grain },
        uCAStrength: { value: p.ca },
        uVignette: { value: 0.55 },
        uExposure: { value: p.exposure },
        uTAAAlpha: { value: 0.1 },
      },
    });

    this._swap = new THREE.Mesh(this.quad, this.compMat);
    this.scene.add(this._swap);

    // blit material — copies a texture to the framebuffer (GLSL ES 1.00 for simplicity)
    this.blitMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0);}`,
      fragmentShader: `varying vec2 vUv; uniform sampler2D t; void main(){ gl_FragColor=texture2D(t,vUv);}`,
      uniforms: { t: { value: null } },
      depthTest: false, depthWrite: false,
    });

    this._ready = true;
  }

  _initEvents() {
    window.addEventListener('resize', () => this._resize());

    const c = this.canvas;
    let dragging = false, lx = 0, ly = 0;
    c.addEventListener('pointerdown', (e) => {
      dragging = true; this.userInteracting = true; this.autoOrbit = false;
      lx = e.clientX; ly = e.clientY;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      this.targetYaw -= dx * 0.005;
      this.targetPitch = Math.max(-1.2, Math.min(1.2, this.targetPitch + dy * 0.005));
      lx = e.clientX; ly = e.clientY;
    });
    const end = (e) => { dragging = false; if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId); };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetDist = Math.max(4.0, Math.min(20.0, this.targetDist + e.deltaY * 0.005));
    }, { passive: false });

    // touch pinch
    let pinchDist = 0;
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    });
    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.targetDist = Math.max(4.0, Math.min(20.0, this.targetDist + (pinchDist - d) * 0.02));
        pinchDist = d;
      }
    }, { passive: false });
  }

  setQuality(q) {
    this.quality = q;
    if (!this._ready) return;
    const p = QUALITY_PRESETS[q];
    this.bhMat.uniforms.uSteps.value = p.steps;
    this.bhMat.uniforms.uStepSize.value = p.stepSize;
    this.bhMat.uniforms.uJitter.value = p.jitter;
    this.compMat.uniforms.uBloomStrength.value = p.bloom;
    this.compMat.uniforms.uGrainStrength.value = p.grain;
    this.compMat.uniforms.uCAStrength.value = p.ca;
    this.compMat.uniforms.uExposure.value = p.exposure;
  }

  render() {
    if (!this._ready) { requestAnimationFrame(() => this.render()); return; }
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    // spring camera
    this.cameraYaw   += (this.targetYaw - this.cameraYaw) * 0.06;
    this.cameraPitch += (this.targetPitch - this.cameraPitch) * 0.06;
    this.cameraDist  += (this.targetDist - this.cameraDist) * 0.06;
    if (this.autoOrbit) this.targetYaw += this.autoOrbitSpeed * dt;

    this.bhMat.uniforms.uTime.value = t;
    this.bhMat.uniforms.uCameraYaw.value = this.cameraYaw;
    this.bhMat.uniforms.uCameraPitch.value = this.cameraPitch;
    this.bhMat.uniforms.uCameraDist.value = this.cameraDist;
    this.bhMat.uniforms.uResolution.value.set(this.width, this.height);
    this.compMat.uniforms.uTime.value = t;
    this.compMat.uniforms.uResolution.value.set(this.width, this.height);

    // pass 1: render black hole scene
    this.bhQuad.visible = true; this._swap.visible = false;
    this.renderer.setRenderTarget(this.rtScene);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // pass 2: bright pass
    this.bhQuad.visible = false;
    this.brightMat.uniforms.uScene.value = this.rtScene.texture;
    this._swap.material = this.brightMat;
    this._swap.visible = true;
    this.renderer.setRenderTarget(this.rtBloom);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // pass 3: blur horizontal
    this.blurMat.uniforms.uImage.value = this.rtBloom.texture;
    this.blurMat.uniforms.uTexel.value.set(1.0 / this.width, 1.0 / this.height);
    this.blurMat.uniforms.uHorizontal.value = 1;
    this._swap.material = this.blurMat;
    this.renderer.setRenderTarget(this.rtBlur1);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // pass 4: blur vertical
    this.blurMat.uniforms.uImage.value = this.rtBlur1.texture;
    this.blurMat.uniforms.uHorizontal.value = 0;
    this.renderer.setRenderTarget(this.rtBlur2);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // pass 5: composite + TAA — render composite into rtComposite (reads rtHistory, writes rtComposite)
    this.compMat.uniforms.uScene.value = this.rtScene.texture;
    this.compMat.uniforms.uBloom.value = this.rtBlur2.texture;
    this.compMat.uniforms.uHistory.value = this.rtHistory.texture;
    this._swap.material = this.compMat;

    this.renderer.setRenderTarget(this.rtComposite);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // blit composite to screen
    this._swap.material = this.blitMat;
    this.blitMat.uniforms.t.value = this.rtComposite.texture;
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // ping-pong: composite becomes next frame's history
    const tmp = this.rtHistory; this.rtHistory = this.rtComposite; this.rtComposite = tmp;
    this.compMat.uniforms.uHistory.value = this.rtHistory.texture;

    // FPS
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.onFps(Math.round(this.frameCount / this.fpsTime));
      this.frameCount = 0; this.fpsTime = 0;
    }

    if (this.running) requestAnimationFrame(() => this.render());
  }

  dispose() {
    this.running = false;
    this.rtScene.dispose(); this.rtBloom.dispose(); this.rtBlur1.dispose();
    this.rtBlur2.dispose(); this.rtComposite.dispose(); this.rtHistory.dispose();
    this.renderer.dispose();
  }
}
