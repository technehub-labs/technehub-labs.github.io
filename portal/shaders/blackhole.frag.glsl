// ═══════════════════════════════════════════════════════════════
// Schwarzschild Black Hole — Null Geodesic Integrator
// Real-time photon trajectory integration in the Schwarzschild metric.
// No fake spheres, no textured quads — photons are traced through curved
// spacetime by integrating the null geodesic equations in the equatorial
// plane (spherical symmetry lets us reduce to 2D without loss of generality).
// ═══════════════════════════════════════════════════════════════
#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

// ── Uniforms ────────────────────────────────────────────────────
uniform vec2  uResolution;
uniform float uTime;
uniform float uCameraDist;     // distance of camera from BH (in units of r_s)
uniform float uCameraYaw;       // orbital camera yaw
uniform float uCameraPitch;     // orbital camera pitch
uniform float uDiskInner;       // accretion disk inner radius
uniform float uDiskOuter;       // accretion disk outer radius
uniform float uDiskThick;       // disk vertical thickness
uniform float uDiskBright;      // disk brightness multiplier
uniform float uDopplerStrength;  // relativistic Doppler beaming strength
uniform float uGravRedshift;    // gravitational redshift strength
uniform float uNoiseScale;       // accretion turbulence scale
uniform float uQuality;          // 0..1 — steps / samples
uniform int   uSteps;            // geodesic integration steps
uniform float uStepSize;         // base integration step in r_s units
uniform float uExposure;         // HDR exposure
uniform float uStarBrightness;   // procedural starfield brightness
uniform float uGalaxyBrightness; // procedural galaxy brightness
uniform vec3  uDiskColorHot;      // inner disk color (hot)
uniform vec3  uDiskColorCool;     // outer disk color (cool)
uniform float uJitter;            // temporal AA jitter amount

// ── Constants ───────────────────────────────────────────────────
const float PI  = 3.141592653589793;
const float TAU = 6.283185307179586;

// Schwarzschild radius = 1 (units). Event horizon at r=1, photon sphere at r=1.5.
const float RS = 1.0;
const float EH = 1.0;          // event horizon
const float PHOTON_SPHERE = 1.5;

// ── Hash / noise utilities ──────────────────────────────────────
float hash11(float n) { return fract(sin(n) * 43758.5453123); }
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
vec2 hash23(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1873));
  p += dot(p, p.yzx + 19.19);
  return fract(vec2((p.x + p.y) * p.z, (p.x + p.z) * p.y));
}

// 3D value noise
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0,0,0));
  float n100 = hash13(i + vec3(1,0,0));
  float n010 = hash13(i + vec3(0,1,0));
  float n110 = hash13(i + vec3(1,1,0));
  float n001 = hash13(i + vec3(0,0,1));
  float n101 = hash13(i + vec3(1,0,1));
  float n011 = hash13(i + vec3(0,1,1));
  float n111 = hash13(i + vec3(1,1,1));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

// Fractal Brownian motion
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

// ── Procedural starfield ─────────────────────────────────────────
// Direction -> star color. Uses a high-frequency hash on the sphere.
vec3 starfield(vec3 dir) {
  // Project direction onto a large celestial sphere and hash cells.
  vec3 s = dir * 220.0;
  vec3 cell = floor(s);
  vec3 f = fract(s);
  float h = hash13(cell);
  // sparse stars
  float star = 0.0;
  if (h > 0.985) {
    vec2 r = hash23(cell + 7.1);
    vec2 d = f.xy - r;
    float dist = length(d);
    float bright = smoothstep(0.06, 0.0, dist) * (h - 0.985) / 0.015;
    // twinkle
    bright *= 0.7 + 0.3 * sin(uTime * (1.5 + r.x * 4.0) + r.y * 6.28);
    // star color temperature
    float temp = r.x;
    vec3 col = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.9, 0.75), temp);
    star = bright;
    return col * star * uStarBrightness;
  }
  return vec3(0.0);
}

// ── Procedural galaxies ─────────────────────────────────────────
// A few distant galaxy discs placed on the celestial sphere.
vec3 galaxies(vec3 dir) {
  vec3 col = vec3(0.0);
  // 4 galaxies at fixed directions
  vec3 gdir[4];
  gdir[0] = normalize(vec3( 0.4, 0.2, 1.0));
  gdir[1] = normalize(vec3(-0.8, 0.1, 0.5));
  gdir[2] = normalize(vec3( 0.1,-0.6,-0.8));
  gdir[3] = normalize(vec3(-0.3, 0.5,-0.6));
  for (int i = 0; i < 4; i++) {
    vec3 g = gdir[i];
    float d = dot(dir, g);
    // only near the disc plane
    vec3 perp = cross(dir, g);
    float off = length(perp);
    float core = smoothstep(0.06, 0.0, off) * 0.5;
    float arm = smoothstep(0.18, 0.02, off) * 0.18;
    // spiral arms via angular noise
    float ang = atan(perp.y, perp.x);
    float spiral = 0.5 + 0.5 * sin(ang * 2.0 + off * 30.0 + fbm(dir * 8.0 + float(i)) * 6.0);
    float g2 = (core + arm * spiral) * smoothstep(0.0, 0.2, d);
    vec3 gc = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.8, 0.6), float(i) * 0.25);
    col += gc * g2 * uGalaxyBrightness;
  }
  // faint nebula clouds
  float neb = fbm(dir * 3.0 + vec3(uTime * 0.005));
  col += vec3(0.04, 0.06, 0.10) * smoothstep(0.5, 0.9, neb) * uGalaxyBrightness;
  return col;
}

// ── Accretion disk ──────────────────────────────────────────────
// Returns emissive color + density at a point in the disk plane.
// The disk lies near the equatorial (xz) plane; y is the vertical axis.
vec4 sampleDisk(vec3 pos) {
  float r = length(pos.xz);
  if (r < uDiskInner || r > uDiskOuter) return vec4(0.0);

  // vertical falloff — disk has thickness
  float h = abs(pos.y) / uDiskThick;
  float vert = exp(-h * h * 4.0);

  // radial density profile — brighter inner, tapering outer
  float radial = smoothstep(uDiskOuter, uDiskInner, r);
  radial = pow(radial, 1.5);

  // turbulent structure — rotating bands + noise
  float ang = atan(pos.z, pos.x);
  // differential rotation: inner orbits faster (Keplerian-ish)
  float omega = 1.0 / pow(max(r, 0.3), 1.5);
  float t = uTime * 0.15 * omega;
  // coordinate for noise that swirls with rotation
  vec3 np = vec3(cos(ang + t) * r * uNoiseScale, pos.y * uNoiseScale * 3.0,
                 sin(ang + t) * r * uNoiseScale);
  float n = fbm(np);
  float n2 = fbm(np * 2.3 + 11.0);
  float density = radial * vert * (0.5 + 0.8 * n) * (0.6 + 0.5 * n2);

  // temperature gradient: hot inner (blue-white) -> cool outer (orange-red)
  float tempT = smoothstep(uDiskInner, uDiskOuter, r);
  vec3 col = mix(uDiskColorHot, uDiskColorCool, tempT);
  // hot spots
  col += vec3(0.4, 0.5, 0.7) * pow(1.0 - tempT, 3.0) * n2;

  return vec4(col * density, density);
}

// ── Camera ray generation ───────────────────────────────────────
// Build a ray direction for a perspective camera orbiting the BH.
vec3 cameraRay(vec2 uv) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float fov = 1.4; // focal length-ish
  vec3 dir = normalize(vec3(p * fov, -1.0));

  // camera position on a sphere
  float cy = cos(uCameraYaw), sy = sin(uCameraYaw);
  float cp = cos(uCameraPitch), sp = sin(uCameraPitch);
  vec3 camPos = vec3(cy * cp, sp, sy * cp) * uCameraDist;

  // build camera basis
  vec3 forward = normalize(-camPos);
  vec3 right = normalize(cross(vec3(0,1,0), forward));
  vec3 up = cross(forward, right);

  return normalize(dir.x * right + dir.y * up + dir.z * forward);
}

vec3 cameraPos() {
  float cy = cos(uCameraYaw), sy = sin(uCameraYaw);
  float cp = cos(uCameraPitch), sp = sin(uCameraPitch);
  return vec3(cy * cp, sp, sy * cp) * uCameraDist;
}

// ── Null geodesic integration (Schwarzschild) ───────────────────
// In the equatorial-plane reduction (spherical symmetry), a photon's
// trajectory is governed by the effective potential:
//   (du/dphi)^2 = (1/b^2) - (1 - 1/r) * u^2
// where u = 1/r and b is the impact parameter. We integrate the photon
// path in Cartesian-ish coordinates using the geodesic equation with the
// Christoffel symbols of the Schwarzschild metric, which is equivalent
// and numerically friendlier for ray-marching.
//
// The geodesic equation in the weak-field form we integrate:
//   d^2 r / dlambda^2 = - (3/2) * r_s * h^2 / r^4 * r_hat
// where h = |r x v| is the conserved angular momentum per unit energy
// (for null geodesics). This is the standard "light bending" acceleration
// used in real-time Schwarzschild renderers; it reproduces the photon
// sphere, multiple disk crossings, and lensing accurately.
vec3 geodesicAccel(vec3 pos, vec3 vel) {
  float r = length(pos);
  if (r < 0.001) return vec3(0.0);
  vec3 h = cross(pos, vel);       // angular momentum
  float h2 = dot(h, h);
  // acceleration: -1.5 * r_s * h^2 / r^5 * r_vec  (r_s = 1)
  float f = -1.5 * RS * h2 / pow(r, 5.0);
  return pos * f;
}

void main() {
  vec2 uv = vUv;
  // temporal jitter for TAA
  uv += (hash23(vec3(gl_FragCoord.xy, uTime)) - 0.5) * uJitter / uResolution;

  vec3 ro = cameraPos();
  vec3 rd = cameraRay(uv);

  // integrate the null geodesic
  vec3 pos = ro;
  vec3 vel = rd;

  vec3 accumColor = vec3(0.0);
  float accumAlpha = 0.0;
  float transmittance = 1.0;

  int steps = uSteps;
  float dt = uStepSize;

  // track disk crossings for ordering
  float prevY = pos.y;

  for (int i = 0; i < 256; i++) {
    if (i >= steps) break;

    float r = length(pos);

    // event horizon — photon captured
    if (r < EH) {
      break;
    }

    // escape to infinity — sample background
    if (r > 60.0) {
      vec3 bg = starfield(normalize(vel)) + galaxies(normalize(vel));
      accumColor += bg * transmittance;
      break;
    }

    // adaptive step: smaller near the BH
    float adaptive = mix(0.25, 1.0, clamp((r - EH) / 8.0, 0.0, 1.0));
    float sdt = dt * adaptive;

    // substep integration (leapfrog-ish) for stability
    vec3 a1 = geodesicAccel(pos, vel);
    vec3 posMid = pos + vel * (sdt * 0.5);
    vec3 aMid = geodesicAccel(posMid, vel + a1 * (sdt * 0.5));
    vec3 velNew = vel + aMid * sdt;
    vec3 posNew = pos + velNew * sdt;

    // ── accretion disk sampling between pos and posNew ──
    // detect equatorial-plane crossing
    if (prevY * posNew.y < 0.0) {
      // linear interp to crossing
      float t = prevY / (prevY - posNew.y);
      vec3 crossPos = mix(pos, posNew, t);
      vec4 disk = sampleDisk(crossPos);
      if (disk.a > 0.001) {
        // relativistic effects at the crossing point
        float cr = length(crossPos);
        // gravitational redshift: 1 + z = 1/sqrt(1 - r_s/r)
        float gravFactor = 1.0 / sqrt(max(1.0 - RS / cr, 0.01));
        float redshift = clamp(1.0 / pow(gravFactor, uGravRedshift), 0.2, 3.0);
        // Doppler beaming: orbital velocity direction vs line of sight
        vec3 orbital = normalize(cross(vec3(0,1,0), crossPos));
        float los = dot(normalize(vel), orbital);
        float v = sqrt(RS / max(cr, EH)) * 0.5; // orbital speed ~ sqrt(r_s/r)
        float doppler = pow(max(1.0 + los * v, 0.01), -uDopplerStrength * 3.0);
        doppler = clamp(doppler, 0.3, 4.0);

        vec3 emit = disk.rgb * uDiskBright * doppler;
        // shift color: redshift dims blue channel, doppler boosts approaching
        emit *= redshift;
        emit.r *= mix(1.0, 1.15, clamp(doppler - 1.0, 0.0, 1.0));
        emit.b *= mix(1.0, 0.7, clamp(redshift - 1.0, 0.0, 1.0));

        float d = disk.a * transmittance;
        accumColor += emit * d;
        accumAlpha += d;
        transmittance *= (1.0 - d * 0.85);
      }
    }

    pos = posNew;
    vel = normalize(velNew); // photons travel at c; keep unit speed
    prevY = pos.y;
  }

  // if we ended inside or near horizon without escaping, it's black
  // (the event horizon shadow)
  vec3 finalColor = accumColor;

  // subtle glow at photon sphere
  float rEnd = length(pos);
  if (rEnd < EH * 1.05 && accumAlpha < 0.01) {
    finalColor = vec3(0.0);
  }

  // exposure
  finalColor *= uExposure;

  fragColor = vec4(finalColor, 1.0);
}
