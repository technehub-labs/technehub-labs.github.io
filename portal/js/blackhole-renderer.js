// ═══════════════════════════════════════════════════════════════
// Black Hole Renderer — pure WebGL2, no Three.js.
// Fullscreen triangle via gl_VertexID (drawArrays, 3 verts).
// 5-pass pipeline: BH scene → bright pass → blur H → blur V →
// composite (ACES + bloom + grain + CA + vignette) + TAA ping-pong.
// ═══════════════════════════════════════════════════════════════

const Q = { steps: 140, stepSize: 0.10, jitter: 0.5, bloom: 0.55, ca: 0.002, grain: 0.03, exposure: 1.0 };

const BLIT_VERT = `#version 300 es
void main(){
  vec2 p=vec2((gl_VertexID==1)?3.:-1.,(gl_VertexID==2)?3.:-1.);
  gl_Position=vec4(p,0.,1.);
}`;

const BLIT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
out vec4 o;
void main(){ o=texelFetch(uTex,ivec2(gl_FragCoord.xy),0); }`;

export class BlackHoleRenderer {
  constructor(canvas, opts = {}) {
    this.canvas  = canvas;
    this.onFps   = opts.onFps || (() => {});
    this.running = true;
    this._ready  = false;
    this._startTime = null;
    this._prevNow   = null;
    this._frameCount = 0;
    this._fpsAccum   = 0;

    // camera
    this.cameraYaw      = 0.3;
    this.cameraPitch    = 0.18;
    this.cameraDist     = 8.5;
    this.targetYaw      = this.cameraYaw;
    this.targetPitch    = this.cameraPitch;
    this.targetDist     = this.cameraDist;
    this.autoOrbit      = true;
    this.autoOrbitSpeed = 0.04;

    let gl;
    try {
      gl = canvas.getContext('webgl2', {
        antialias: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        alpha: false,
      });
    } catch (err) {
      this._fallback('WebGL2 is unavailable in this browser.');
      return;
    }
    if (!gl) {
      this._fallback('WebGL2 is unavailable in this browser.');
      return;
    }
    this.gl = gl;

    // Prefer RGBA16F; fall back to RGBA8 on constrained GPUs
    const hdrOk = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    this._intFmt = hdrOk ? gl.RGBA16F     : gl.RGBA8;
    this._type   = hdrOk ? gl.HALF_FLOAT  : gl.UNSIGNED_BYTE;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._initPointer();
    this._boot();
  }

  // ── Init ───────────────────────────────────────────────────────
  async _boot() {
    const base = './shaders/';
    let vert, bhFrag, brightFrag, blurFrag, compFrag;
    try {
      [vert, bhFrag, brightFrag, blurFrag, compFrag] = await Promise.all([
        this._fetch(base + 'fullscreen.vert.glsl'),
        this._fetch(base + 'blackhole.frag.glsl'),
        this._fetch(base + 'brightpass.frag.glsl'),
        this._fetch(base + 'blur.frag.glsl'),
        this._fetch(base + 'composite.frag.glsl'),
      ]);
      // GLSL ES 3.00 spec requires `#version` to be the first line in the
      // shader (comments/whitespace before are tolerated by some drivers,
      // rejected by SwiftShader, Mesa and most mobile GPUs). Normalize each
      // fetched source so the directive is at position 0.
      vert      = this._stripLeadingJunk(vert);
      bhFrag    = this._stripLeadingJunk(bhFrag);
      brightFrag = this._stripLeadingJunk(brightFrag);
      blurFrag  = this._stripLeadingJunk(blurFrag);
      compFrag  = this._stripLeadingJunk(compFrag);
    } catch (e) {
      console.error('BlackHoleRenderer: shader fetch failed —', e);
      return;
    }

    const gl = this.gl;
    try {
      this._pBH     = this._mkProg(vert, bhFrag);
      this._pBright = this._mkProg(vert, brightFrag);
      this._pBlur   = this._mkProg(vert, blurFrag);
      this._pComp   = this._mkProg(vert, compFrag);
      this._pBlit   = this._mkProg(BLIT_VERT, BLIT_FRAG);
    } catch (e) {
      console.error('BlackHoleRenderer: shader compile failed —', e);
      return;
    }

    // Cache uniform locations
    this._uBH     = this._cacheUniforms(this._pBH, ['uResolution','uTime','uCameraDist','uCameraYaw','uCameraPitch','uDiskInner','uDiskOuter','uDiskThick','uDiskBright','uDopplerStrength','uGravRedshift','uNoiseScale','uQuality','uSteps','uStepSize','uExposure','uStarBrightness','uGalaxyBrightness','uDiskColorHot','uDiskColorCool','uJitter']);
    this._uBright = this._cacheUniforms(this._pBright, ['uScene','uThreshold']);
    this._uBlur   = this._cacheUniforms(this._pBlur,   ['uImage','uTexel','uHorizontal']);
    this._uComp   = this._cacheUniforms(this._pComp,   ['uScene','uBloom','uHistory','uResolution','uTime','uBloomStrength','uGrainStrength','uCAStrength','uVignette','uExposure','uTAAAlpha']);
    this._uBlit   = this._cacheUniforms(this._pBlit,   ['uTex']);

    // Empty VAO — fullscreen triangle uses gl_VertexID, no vertex attributes
    this._vao = gl.createVertexArray();

    this._initFBOs();
    this._ready = true;

    if (this.running) {
      this._startTime = performance.now();
      requestAnimationFrame(t => this._tick(t));
    }
  }

  _fetch(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
      return r.text();
    });
  }

  _stripLeadingJunk(src) {
    // Move any `#version` directive in the source to the very first line.
    // Required for strict GLSL ES 3.00 drivers (SwiftShader, Mesa, mobile GPUs).
    const m = src.match(/#version[^\n]*\n/);
    if (!m) return src;
    const version = m[0];
    return version + src.replace(version, '');
  }

  _mkProg(vsrc, fsrc) {
    const gl = this.gl;
    const mkShader = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        console.error('[BlackHole] shader compile failed:', log, '\n--- first 200 chars ---\n', src.slice(0, 200));
        throw new Error(`Shader compile:\n${log}\n\n${src.slice(0, 400)}`);
      }
      return sh;
    };
    const vs = mkShader(gl.VERTEX_SHADER,   vsrc);
    const fs = mkShader(gl.FRAGMENT_SHADER, fsrc);
    const p  = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error('Program link: ' + gl.getProgramInfoLog(p));
    return p;
  }

  _cacheUniforms(prog, names) {
    const gl = this.gl;
    const out = {};
    for (const n of names) out[n] = gl.getUniformLocation(prog, n);
    return out;
  }

  _mkFBO(w, h) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, this._intFmt, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo };
  }

  _delFBO(f) {
    if (!f) return;
    this.gl.deleteTexture(f.tex);
    this.gl.deleteFramebuffer(f.fbo);
  }

  _initFBOs() {
    ['_fboScene','_fboBloom','_fboBlur1','_fboBlur2','_fboComp','_fboHist'].forEach(k => {
      this._delFBO(this[k]);
      this[k] = this._mkFBO(this.width, this.height);
    });
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.width  = Math.floor(window.innerWidth  * dpr);
    this.height = Math.floor(window.innerHeight * dpr);
    this.canvas.width  = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width  = window.innerWidth  + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    if (this.gl) this.gl.viewport(0, 0, this.width, this.height);
    if (this._ready) this._initFBOs();
  }

  // ── Render loop ────────────────────────────────────────────────
  _tick(now) {
    if (!this.running || !this._ready) return;

    const t  = (now - this._startTime) * 0.001;
    const dt = this._prevNow !== null
      ? Math.min((now - this._prevNow) * 0.001, 0.05)
      : 0.016;
    this._prevNow = now;

    // smooth camera
    const k = 0.06;
    this.cameraYaw   += (this.targetYaw   - this.cameraYaw)   * k;
    this.cameraPitch += (this.targetPitch - this.cameraPitch) * k;
    this.cameraDist  += (this.targetDist  - this.cameraDist)  * k;
    if (this.autoOrbit) this.targetYaw += this.autoOrbitSpeed * dt;

    const gl = this.gl;
    const W = this.width, H = this.height;

    // ── Pass 1: Schwarzschild scene ──
    this._bind(this._pBH, this._fboScene.fbo);
    const ub = this._uBH;
    gl.uniform2f(ub.uResolution,       W, H);
    gl.uniform1f(ub.uTime,             t);
    gl.uniform1f(ub.uCameraDist,       this.cameraDist);
    gl.uniform1f(ub.uCameraYaw,        this.cameraYaw);
    gl.uniform1f(ub.uCameraPitch,      this.cameraPitch);
    gl.uniform1f(ub.uDiskInner,        2.6);
    gl.uniform1f(ub.uDiskOuter,        7.5);
    gl.uniform1f(ub.uDiskThick,        0.35);
    gl.uniform1f(ub.uDiskBright,       1.0);
    gl.uniform1f(ub.uDopplerStrength,  1.0);
    gl.uniform1f(ub.uGravRedshift,     1.0);
    gl.uniform1f(ub.uNoiseScale,       0.55);
    gl.uniform1f(ub.uQuality,          1.0);
    gl.uniform1i(ub.uSteps,            Q.steps);
    gl.uniform1f(ub.uStepSize,         Q.stepSize);
    gl.uniform1f(ub.uExposure,         1.0);
    gl.uniform1f(ub.uStarBrightness,   1.0);
    gl.uniform1f(ub.uGalaxyBrightness, 0.7);
    // Hot inner (blue-white) → cool outer (orange-red). Matches GARGANTUA palette.
    gl.uniform3f(ub.uDiskColorHot,     0.85, 0.92, 1.0);
    gl.uniform3f(ub.uDiskColorCool,    1.0,  0.45, 0.18);
    gl.uniform1f(ub.uJitter,           Q.jitter);
    this._draw();

    // ── Pass 2: bright pass — only the very brightest pixels bloom ──
    this._bind(this._pBright, this._fboBloom.fbo);
    this._tex(0, this._fboScene.tex, this._uBright.uScene);
    gl.uniform1f(this._uBright.uThreshold, 0.9);
    this._draw();

    // ── Pass 3: blur H ──
    this._bind(this._pBlur, this._fboBlur1.fbo);
    this._tex(0, this._fboBloom.tex, this._uBlur.uImage);
    gl.uniform2f(this._uBlur.uTexel, 1.0 / W, 1.0 / H);
    gl.uniform1i(this._uBlur.uHorizontal, 1);
    this._draw();

    // ── Pass 4: blur V ──
    this._bind(this._pBlur, this._fboBlur2.fbo);
    this._tex(0, this._fboBlur1.tex, this._uBlur.uImage);
    gl.uniform2f(this._uBlur.uTexel, 1.0 / W, 1.0 / H);
    gl.uniform1i(this._uBlur.uHorizontal, 0);
    this._draw();

    // ── Pass 5: composite → _fboComp ──
    this._bind(this._pComp, this._fboComp.fbo);
    const uc = this._uComp;
    this._tex(0, this._fboScene.tex,  uc.uScene);
    this._tex(1, this._fboBlur2.tex,  uc.uBloom);
    this._tex(2, this._fboHist.tex,   uc.uHistory);
    gl.uniform2f(uc.uResolution,   W, H);
    gl.uniform1f(uc.uTime,         t);
    gl.uniform1f(uc.uBloomStrength, Q.bloom);
    gl.uniform1f(uc.uGrainStrength, Q.grain);
    gl.uniform1f(uc.uCAStrength,    Q.ca);
    gl.uniform1f(uc.uVignette,      0.55);
    gl.uniform1f(uc.uExposure,      Q.exposure);
    gl.uniform1f(uc.uTAAAlpha,      0.1);
    this._draw();

    // ── Pass 6: blit composite → screen ──
    this._bind(this._pBlit, null);
    this._tex(0, this._fboComp.tex, this._uBlit.uTex);
    this._draw();

    // TAA ping-pong: swap composite ↔ history for next frame
    const tmp = this._fboComp; this._fboComp = this._fboHist; this._fboHist = tmp;

    // FPS counter
    this._frameCount++;
    this._fpsAccum += dt;
    if (this._fpsAccum >= 0.5) {
      this.onFps(Math.round(this._frameCount / this._fpsAccum));
      this._frameCount = 0; this._fpsAccum = 0;
    }

    requestAnimationFrame(t => this._tick(t));
  }

  _bind(prog, fbo) {
    const gl = this.gl;
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  _tex(unit, tex, loc) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }

  _draw() {
    const gl = this.gl;
    gl.bindVertexArray(this._vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  // ── Public API ─────────────────────────────────────────────────
  pause() {
    this.running = false;
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this._prevNow = null;
    if (this._ready) requestAnimationFrame(t => this._tick(t));
  }

  dispose() {
    this.running = false;
    const gl = this.gl;
    if (!gl) return;
    ['_fboScene','_fboBloom','_fboBlur1','_fboBlur2','_fboComp','_fboHist'].forEach(k => this._delFBO(this[k]));
    [this._pBH, this._pBright, this._pBlur, this._pComp, this._pBlit].forEach(p => { if (p) gl.deleteProgram(p); });
    if (this._vao) gl.deleteVertexArray(this._vao);
  }

  // ── Input ──────────────────────────────────────────────────────
  _initPointer() {
    const c = this.canvas;
    let dragging = false, lx = 0, ly = 0;
    c.addEventListener('pointerdown', e => {
      dragging = true; this.autoOrbit = false;
      lx = e.clientX; ly = e.clientY;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', e => {
      if (!dragging) return;
      this.targetYaw   -= (e.clientX - lx) * 0.005;
      this.targetPitch  = Math.max(-1.2, Math.min(1.2, this.targetPitch + (e.clientY - ly) * 0.005));
      lx = e.clientX; ly = e.clientY;
    });
    const end = e => { dragging = false; if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId); };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.targetDist = Math.max(4.0, Math.min(20.0, this.targetDist + e.deltaY * 0.005));
    }, { passive: false });

    let p0 = 0;
    c.addEventListener('touchstart', e => {
      if (e.touches.length === 2)
        p0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    });
    c.addEventListener('touchmove', e => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      this.targetDist = Math.max(4.0, Math.min(20.0, this.targetDist + (p0 - d) * 0.02));
      p0 = d;
    }, { passive: false });
  }

  _fallback(msg) {
    const el = document.createElement('div');
    el.className = 'webgl-fallback';
    el.textContent = msg;
    (this.canvas.parentElement || document.body).appendChild(el);
  }
}
