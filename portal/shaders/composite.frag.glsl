// ═══════════════════════════════════════════════════════════════
// Post-processing composite:
//   HDR Bloom + ACES Filmic Tone Mapping + Film Grain +
//   Chromatic Aberration + Vignette
// ═══════════════════════════════════════════════════════════════
#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uScene;       // HDR scene
uniform sampler2D uBloom;       // blurred bloom buffer
uniform vec2  uResolution;
uniform float uTime;
uniform float uBloomStrength;
uniform float uGrainStrength;
uniform float uCAStrength;       // chromatic aberration
uniform float uVignette;
uniform float uExposure;
uniform float uTAAAlpha;          // TAA blend factor
uniform sampler2D uHistory;      // previous frame for TAA

// ── ACES Filmic tone mapping ────────────────────────────────────
vec3 acesFilmic(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// ── Hash ────────────────────────────────────────────────────────
float hash12(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

void main() {
  vec2 uv = vUv;
  vec2 texel = 1.0 / uResolution;

  // ── Chromatic aberration: offset RGB samples radially ──
  vec2 dir = uv - 0.5;
  float ca = uCAStrength;
  vec2 rOff = dir * ca * texel * 4.0;
  vec2 gOff = dir * ca * texel * 2.0;
  vec2 bOff = dir * ca * texel * 0.0;
  float cr = texture(uScene, uv - rOff).r;
  float cg = texture(uScene, uv - gOff).g;
  float cb = texture(uScene, uv - bOff).b;
  vec3 hdr = vec3(cr, cg, cb);

  // ── Add bloom ──
  vec3 bloom = texture(uBloom, uv).rgb;
  hdr += bloom * uBloomStrength;

  // ── TAA: blend with history ──
  vec3 history = texture(uHistory, uv).rgb;
  hdr = mix(hdr, history, uTAAAlpha);

  // ── Exposure ──
  hdr *= uExposure;

  // ── ACES tone mapping ──
  vec3 ldr = acesFilmic(hdr);

  // ── Film grain ──
  float grain = (hash12(uv * uResolution + uTime * 60.0) - 0.5) * uGrainStrength;
  ldr += grain;

  // ── Vignette ──
  float vig = smoothstep(0.85, 0.25, length(dir));
  ldr *= mix(1.0, vig, uVignette);

  // ── Subtle gamma ──
  ldr = pow(clamp(ldr, 0.0, 1.0), vec3(1.0 / 2.2));

  fragColor = vec4(ldr, 1.0);
}
