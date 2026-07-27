// Shader loader — fetches GLSL files at runtime and caches them.
// Ensures #version 300 es is the first line, stripping preceding comment lines.
export const shaderCache = {
  _cache: {},
  _base: '../shaders/',
  async load(name) {
    if (this._cache[name]) return this._cache[name];
    const resp = await fetch(this._base + name);
    if (!resp.ok) throw new Error('Failed to load shader: ' + name);
    let txt = await resp.text();
    // #version must be the first non-empty line — move it to position 0
    const versionMatch = txt.match(/(#version\s[^\n]+\n)/);
    if (versionMatch) {
      const version = versionMatch[1];
      const rest = txt.replace(version, '');
      txt = version + rest;
    }
    this._cache[name] = txt;
    return txt;
  },
};

