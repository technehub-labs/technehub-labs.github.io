// =============================================================================
// TechNeHub Labs — Black Hole Underlay (GARGANTUA port)
// ----------------------------------------------------------------------------
// Renderer — Three.js r160 + EffectComposer + UnrealBloomPass + manual ACES
// composite pass. Verbatim shader source from the GARGANTUA reference.
//
//   https://c3gyemkuxznvi.ok.kimi.link/
//
// Pipeline:
//   Ray scene (fullscreen quad, ortho cam, PerspectiveCamera-fed uniforms)
//     → UnrealBloomPass (HDR bloom, HalfFloat render target)
//     → Composite (chromatic aberration + manual ACES + vignette + film grain)
//
// Differences from the original custom-WebGL2 portal renderer:
//   * Uses Three.js instead of raw WebGL2 (the reference uses Three.js too,
//     for the OrbitControls + EffectComposer convenience)
//   * Camera is a real PerspectiveCamera driven by Three's OrbitControls
//     (the portal keeps user-supplied controls; the underlying shader just
//     samples the camera's position/target each frame)
//   * Cinematic auto-orbit replaces the user's manual orbit while the portal
//     cards are not focused (gate on `cardsOpen`)
// =============================================================================
import * as THREE from '../vendor/three/three.module.js';
import { OrbitControls }    from '../vendor/addons/controls/OrbitControls.js';
import { EffectComposer }   from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from '../vendor/addons/postprocessing/RenderPass.js';
import { ShaderPass }       from '../vendor/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass }  from '../vendor/addons/postprocessing/UnrealBloomPass.js';

import { RAY_VERT, RAY_FRAG, COMPOSITE_VERT, COMPOSITE_FRAG } from './shaders.js';

const DEG = Math.PI / 180;

const STATE = {
    ready: false,
    paused: false,
    cameraPause: false,
    contextLost: false,
    contextRestored: false,
    renderFaulted: false,
};

let renderer, fsScene, fsCam, camera, controls, composer, bloomPass, compPass;
let rayUni, compUni;
const canvas = document.getElementById('bh-canvas');

function initThree() {
    if (!canvas) throw new Error('Canvas #bh-canvas not found.');

    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
        });
    } catch (err) {
        console.error('[TNH] WebGL init failed:', err);
        return;
    }

    // Manual ACES in the composite pass — renderer stays NoToneMapping.
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    // Surface shader-compile failures instead of black.
    renderer.debug.onShaderError = (gl, program, vs, fs) => {
        const log = (gl.getShaderInfoLog(fs) || '') + '\n' + (gl.getShaderInfoLog(vs) || '');
        console.error('[TNH] shader compile failed:\n' + log);
    };

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        STATE.contextLost = true;
        showOverlay('Reinitialising WebGL…');
    });
    canvas.addEventListener('webglcontextrestored', () => {
        if (STATE.contextRestored) return;
        STATE.contextRestored = true;
        location.reload();
    });

    // HDR probe — bloom fidelity requires HalfFloatType render target.
    const gl = renderer.getContext();
    const halfOK = renderer.capabilities.isWebGL2 &&
        !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

    // Fullscreen ray scene
    fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    fsScene = new THREE.Scene();
    rayUni = {
        uRes:        { value: new THREE.Vector2(1, 1) },
        uTime:       { value: 0 },
        uCamPos:     { value: new THREE.Vector3(4.49, 2.72, 25.46) },
        uCamTarget:  { value: new THREE.Vector3(0, 0, 0) },
        uFov:        { value: 1 / Math.tan(44 * DEG / 2) },
        uSteps:      { value: 460 },
        uRotSign:    { value: 1 },
        uDebug:      { value: 0 },
        uDin:        { value: 2.75 },
        uDout:       { value: 40 },
        uDopMax:     { value: 1.85 },
        uOpNear:     { value: 0.90 },
        uOpFar:      { value: 0.80 },
        uDiskBright: { value: 1.0 },
        uStarBright: { value: 1.0 },
        uSkyFloor:   { value: 0.04 },
        uRotSpeed:   { value: 1.0 },
    };
    const rayMat = new THREE.ShaderMaterial({
        vertexShader: RAY_VERT,
        fragmentShader: RAY_FRAG,
        uniforms: rayUni,
        depthTest: false,
        depthWrite: false,
    });
    fsScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), rayMat));

    // Perspective camera — provides position + target to the shader
    camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.01, 200);
    camera.position.set(4.49, 2.72, 25.46);
    camera.lookAt(0, 0, 0);

    // OrbitControls is included for parity with the reference; user input
    // is forwarded via `window.TNH.setUnderlayDimmed()` to coordinate with
    // the cards overlay.
    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.62;
    controls.maxDistance = 150;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.7;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.12;

    // HDR composer
    renderer.getDrawingBufferSize(rayUni.uRes.value);
    const rt = new THREE.WebGLRenderTarget(
        rayUni.uRes.value.x || 2,
        rayUni.uRes.value.y || 2,
        { type: halfOK ? THREE.HalfFloatType : THREE.UnsignedByteType }
    );
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(fsScene, fsCam));

    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(rayUni.uRes.value.x || 2, rayUni.uRes.value.y || 2),
        0.55, 0.35, 0.55
    );
    composer.addPass(bloomPass);

    compUni = {
        tDiffuse:  { value: null },
        uRes:      { value: new THREE.Vector2(1, 1) },
        uTime:     { value: 0 },
        uVignette: { value: 1.0 },
        uGrain:    { value: 0.045 },
        uCA:       { value: 0.0028 },
    };
    compPass = new ShaderPass({
        uniforms: compUni,
        vertexShader: COMPOSITE_VERT,
        fragmentShader: COMPOSITE_FRAG,
    });
    composer.addPass(compPass);

    STATE.ready = true;
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
}

function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(rayUni.uRes.value);
    compUni.uRes.value.copy(rayUni.uRes.value);
}

// =============================================================================
// Cinematic camera loop
// =============================================================================
const clock = new THREE.Clock();
let rafId = 0;

function animate() {
    rafId = requestAnimationFrame(animate);
    if (!STATE.ready || STATE.paused || STATE.contextLost || STATE.renderFaulted) return;

    const dt = Math.min(clock.getDelta(), 0.1);
    rayUni.uTime.value += dt;
    compUni.uTime.value = rayUni.uTime.value;

    // Push the camera state into the raymarcher each frame.
    rayUni.uCamPos.value.copy(camera.position);
    rayUni.uCamTarget.value.set(0, 0, 0);

    // While a card is open, the cards overlay tells us to dim the underlay
    // and pause cinematic camera motion. We let the shader keep rendering
    // (so the dimmed scene shows through) but freeze the camera position.
    if (STATE.cameraPause) {
        // No controls.update(), no auto-orbit.
    } else {
        controls.update();
    }

    try {
        composer.render();
    } catch (err) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        STATE.renderFaulted = true;
        console.error('[TNH] render fault:', err);
    }
}

// =============================================================================
// Pause / resume on tab visibility
// =============================================================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        STATE.paused = true;
    } else if (STATE.paused && !STATE.contextLost) {
        STATE.paused = false;
        clock.getDelta();
        if (!rafId) rafId = requestAnimationFrame(animate);
    }
});

// =============================================================================
// Fatal overlay
// =============================================================================
function showOverlay(msg) {
    let el = document.getElementById('tnh-fatal');
    if (!el) {
        el = document.createElement('div');
        el.id = 'tnh-fatal';
        el.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:rgba(6,7,11,0.92);color:#e6edf6;font-family:ui-monospace,monospace;padding:24px;text-align:center;backdrop-filter:blur(8px);';
        el.innerHTML = '<div style="max-width:520px;border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:22px;background:rgba(20,28,44,0.7);"><div id="tnh-fatal-title" style="font-weight:700;letter-spacing:.08em;color:#ffb46b;"></div><div id="tnh-fatal-msg" style="margin-top:12px;font-size:13px;line-height:1.5;color:#93a1b8;white-space:pre-wrap;"></div></div>';
        document.body.appendChild(el);
    }
    el.querySelector('#tnh-fatal-title').textContent = 'BLACK HOLE UNINITIALISED';
    el.querySelector('#tnh-fatal-msg').textContent = msg;
}

// =============================================================================
// Card overlay integration
// =============================================================================
window.TNH = window.TNH || {};

Object.defineProperty(window.TNH, 'setUnderlayDimmed', {
    value: (dimmed) => {
        STATE.cameraPause = !!dimmed;
        if (canvas) {
            canvas.style.transition = 'opacity .25s ease';
            canvas.style.opacity = dimmed ? '0.18' : '1.0';
        }
    }
});

// =============================================================================
// Ambient drone (WebAudio synth — no asset to vendor)
// =============================================================================
let audioCtx, audio;
function setupAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const master = audioCtx.createGain();
        master.gain.value = 0;
        master.connect(audioCtx.destination);

        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.5;
        lp.connect(master);

        const trem = audioCtx.createGain(); trem.gain.value = 0.7;
        const lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.08;
        const lfoG = audioCtx.createGain(); lfoG.gain.value = 0.3;
        lfo.connect(lfoG).connect(trem.gain); lfo.start();
        lp.connect(trem);

        const o1 = audioCtx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55.0;
        o1.connect(lp);
        const o2 = audioCtx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.4;
        o2.connect(lp);
        o1.start(); o2.start();

        audio = master;
    } catch (e) { audio = null; }
}

// Audio defaults to OFF. Users opt in via window.TNH.toggleAudio().
// Intentionally no auto-unlock on pointerdown/keydown — silent by default.
localStorage.setItem('tnh:audio', '0');

function unlockAudio() {
    if (!audioCtx) setupAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    audio && (audio.gain.value = localStorage.getItem('tnh:audio') !== '0' ? 0.10 : 0.0);
}

Object.defineProperty(window.TNH, 'toggleAudio', {
    value: () => {
        const v = parseFloat(localStorage.getItem('tnh:audio') ?? '1');
        const next = v === 0 ? 1 : 0;
        localStorage.setItem('tnh:audio', String(next));
        if (audio) audio.gain.value = next ? 0.10 : 0.0;
        return next === 1;
    }
});

// =============================================================================
// Boot — exposed as a class for main.js
// =============================================================================
window.__BHR_trace = [];
function trace(msg) { window.__BHR_trace.push(msg); console.log('[TNH]', msg); }

export class BlackHoleRenderer {
    constructor(canvas, opts = {}) {
        this.canvas = canvas;
        this.onFps = opts.onFps || (() => {});
        this._ready = false;
        this._rafId = 0;
        this._clock = new THREE.Clock();
        this._state = {
            paused: false,
            cameraPause: false,
            contextLost: false,
            contextRestored: false,
            renderFaulted: false,
        };
        // Hook fps callback to render loop
        window.__BHR_onFps = this.onFps;
        try {
            trace('init start');
            initThree.call(this);
            trace('init done, ready=' + STATE.ready);
            this._ready = STATE.ready;
            if (this._ready) {
                this._rafId = requestAnimationFrame(this._animate.bind(this));
                console.log('[TNH] GARGANTUA-class black-hole renderer initialised.');
            }
        } catch (e) {
            trace('init failed: ' + e.message);
            console.error('[TNH] init failed', e);
        }
    }

    _animate(now) {
        this._rafId = requestAnimationFrame(this._animate.bind(this));
        if (!this._ready || this._state.paused || this._state.contextLost || this._state.renderFaulted) return;

        const dt = Math.min(this._clock.getDelta(), 0.1);
        rayUni.uTime.value += dt;
        compUni.uTime.value = rayUni.uTime.value;
        rayUni.uCamPos.value.copy(camera.position);
        rayUni.uCamTarget.value.set(0, 0, 0);

        if (this._state.cameraPause) {
            // paused
        } else {
            controls.update();
        }

        try {
            composer.render();
            // FPS callback every ~30 frames
            if (!this._frameCount) this._frameCount = 0;
            this._frameCount++;
            if (this._frameCount % 30 === 0) {
                this.onFps(Math.round(1 / Math.max(dt, 1e-3)));
            }
        } catch (err) {
            cancelAnimationFrame(this._rafId);
            this._rafId = 0;
            this._state.renderFaulted = true;
            console.error('[TNH] render fault:', err);
        }
    }

    pause() {
        this._state.cameraPause = true;
        if (this.canvas) {
            this.canvas.style.transition = 'opacity .25s ease';
            this.canvas.style.opacity = '0.18';
        }
    }

    resume() {
        this._state.cameraPause = false;
        if (this.canvas) {
            this.canvas.style.transition = 'opacity .25s ease';
            this.canvas.style.opacity = '1.0';
        }
    }
}


// Backwards compat — also expose the pause/resume via the global window.TNH
// (the class's pause/resume methods are the canonical path; this
//  window.TNH hook is kept for any older callers.)
window.TNH = window.TNH || {};