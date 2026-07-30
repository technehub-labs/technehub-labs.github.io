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
// Cinematic camera profile:
//   Observer distance oscillates 18 → 150 R_s → 18 over a 60s cycle (triangle wave)
//   Disk inclination (camera pitch) oscillates 90° → -90° → 90° in sync
//   Yaw rotates continuously for orbital motion
//   uSteps = 460 (geodetic integration steps per ray)
//   Audio is permanently disabled
// =============================================================================
import * as THREE from '../vendor/three/three.module.js';
import { OrbitControls }    from '../vendor/addons/controls/OrbitControls.js';
import { EffectComposer }   from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from '../vendor/addons/postprocessing/RenderPass.js';
import { ShaderPass }       from '../vendor/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass }  from '../vendor/addons/postprocessing/UnrealBloomPass.js';

import { RAY_VERT, RAY_FRAG, COMPOSITE_VERT, COMPOSITE_FRAG } from './shaders.js';

const DEG = Math.PI / 180;

// Cinematic profile constants.
const OBSERVER_DIST_MIN = 18;       // 18 R_s
const OBSERVER_DIST_MAX = 150;      // 150 R_s
const PITCH_MAX = Math.PI / 2;      // 90°
const PITCH_MIN = -Math.PI / 2;     // -90°
const CYCLE_PERIOD_MS = 60_000;     // 60s full cycle
const YAW_RATE = 0.05;              // continuous orbital rotation per second

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
let onFpsCallback = () => {};
let fpsFrameCount = 0;
const canvas = document.getElementById('bh-canvas');

// Triangle wave over [0, 1] with smooth easing — ramps 0→1 in the first half,
// 1→0 in the second half. Easing makes the camera linger at extremes.
function triangleWave(t) {
    const phase = (t % 1 + 1) % 1;            // 0..1
    return phase < 0.5
        ? smoothstep(0, 0.5, phase)           // 0..1 (first half)
        : smoothstep(1, 0.5, phase);          // 1..0 (second half)
}

function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function lerp(a, b, t) { return a + (b - a) * t; }

const CIN = { startedAt: 0 };

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

    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

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

    const gl = renderer.getContext();
    const halfOK = renderer.capabilities.isWebGL2 &&
        !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

    fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    fsScene = new THREE.Scene();
    rayUni = {
        uRes:        { value: new THREE.Vector2(1, 1) },
        uTime:       { value: 0 },
        uCamPos:     { value: new THREE.Vector3(0, 0, OBSERVER_DIST_MIN) },
        uCamTarget:  { value: new THREE.Vector3(0, 0, 0) },
        uFov:        { value: 1 / Math.tan(44 * DEG / 2) },
        uSteps:      { value: 460 },          // 460 geodetic integration steps per ray
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

    camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.01, 200);
    camera.position.set(0, 0, OBSERVER_DIST_MIN);
    camera.lookAt(0, 0, 0);

    // OrbitControls is kept for parity (camera-pause + interaction),
    // but auto-rotate is off — the cinematic loop drives the camera position.
    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.62;
    controls.maxDistance = 150;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.7;
    controls.enablePan = false;
    controls.autoRotate = false;

    CIN.startedAt = performance.now();

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

function updateCinematicCamera(now) {
    const elapsedSec = (now - CIN.startedAt) / 1000;
    const cycle = (elapsedSec / (CYCLE_PERIOD_MS / 1000)) % 1;

    const yaw = elapsedSec * YAW_RATE;
    const distT = triangleWave(cycle);
    const dist = lerp(OBSERVER_DIST_MIN, OBSERVER_DIST_MAX, distT);
    const pitch = lerp(PITCH_MAX, PITCH_MIN, distT);

    camera.position.set(
        Math.cos(yaw) * Math.cos(pitch) * dist,
        Math.sin(pitch) * dist,
        Math.sin(yaw) * Math.cos(pitch) * dist
    );
    camera.lookAt(0, 0, 0);
    controls.update();
}

// =============================================================================
// Cinematic camera loop
// =============================================================================
function animate() {
    let lastT = performance.now();
    const loop = (now) => {
        requestAnimationFrame(loop);
        if (!STATE.ready || STATE.paused || STATE.contextLost || STATE.renderFaulted) return;

        const dt = Math.min(0.1, (now - lastT) / 1000);
        lastT = now;
        rayUni.uTime.value += dt;
        compUni.uTime.value = rayUni.uTime.value;

        if (!STATE.cameraPause) {
            updateCinematicCamera(now);
        }
        rayUni.uCamPos.value.copy(camera.position);
        rayUni.uCamTarget.value.set(0, 0, 0);

        try {
            composer.render();
            fpsFrameCount++;
            if (fpsFrameCount % 30 === 0) {
                onFpsCallback(Math.round(1 / Math.max(dt, 1e-3)));
            }
        } catch (err) {
            STATE.renderFaulted = true;
            console.error('[TNH] render fault:', err);
        }
    };
    requestAnimationFrame(loop);
}

// =============================================================================
// Pause / resume on tab visibility
// =============================================================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        STATE.paused = true;
    } else if (STATE.paused && !STATE.contextLost) {
        STATE.paused = false;
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
// Audio — permanently disabled. toggleAudio() kept for future opt-in.
// =============================================================================
localStorage.setItem('tnh:audio', '0');

Object.defineProperty(window.TNH, 'toggleAudio', {
    value: () => {
        const v = parseFloat(localStorage.getItem('tnh:audio') ?? '1');
        const next = v === 0 ? 1 : 0;
        localStorage.setItem('tnh:audio', String(next));
        return next === 1;
    }
});

// =============================================================================
// Boot — exposed as a class for main.js
// =============================================================================
export class BlackHoleRenderer {
    constructor(canvas, opts = {}) {
        this.canvas = canvas;
        onFpsCallback = opts.onFps || (() => {});
        fpsFrameCount = 0;
        try {
            initThree();
            if (STATE.ready) {
                animate();
                console.log('[TNH] GARGANTUA-class black-hole renderer initialised.');
            }
        } catch (e) {
            console.error('[TNH] init failed', e);
        }
    }

    pause() {
        STATE.cameraPause = true;
        if (this.canvas) {
            this.canvas.style.transition = 'opacity .25s ease';
            this.canvas.style.opacity = '0.18';
        }
    }

    resume() {
        STATE.cameraPause = false;
        if (this.canvas) {
            this.canvas.style.transition = 'opacity .25s ease';
            this.canvas.style.opacity = '1.0';
        }
    }
}
