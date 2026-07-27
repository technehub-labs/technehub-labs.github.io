// Bright pass: extract HDR pixels above threshold for bloom.
#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uScene;
uniform float uThreshold;
void main() {
  vec3 c = texture(uScene, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float k = clamp((l - uThreshold) / max(l, 0.0001), 0.0, 1.0);
  fragColor = vec4(c * k, 1.0);
}
