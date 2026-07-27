// Gaussian blur — separable. Direction set by uHorizontal.
#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uImage;
uniform vec2 uTexel;       // 1.0 / resolution
uniform int   uHorizontal;  // 1 = horizontal, 0 = vertical
void main() {
  vec2 dir = (uHorizontal == 1) ? vec2(uTexel.x, 0.0) : vec2(0.0, uTexel.y);
  // 9-tap gaussian
  float w[5];
  w[0] = 0.227027;
  w[1] = 0.1945946;
  w[2] = 0.1216216;
  w[3] = 0.054054;
  w[4] = 0.016216;
  vec3 sum = texture(uImage, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    sum += texture(uImage, vUv + dir * float(i)).rgb * w[i];
    sum += texture(uImage, vUv - dir * float(i)).rgb * w[i];
  }
  fragColor = vec4(sum, 1.0);
}
