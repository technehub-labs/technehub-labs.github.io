#version 300 es
// Fullscreen triangle — no vertex attributes needed.
// Renders a single triangle that covers the entire clip space.
precision highp float;
out vec2 vUv;
void main() {
  // Map vertex ID 0,1,2 -> (-1,-1),(3,-1),(-1,3)
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
