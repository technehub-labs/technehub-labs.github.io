# TechNeHub Labs — Enterprise Knowledge Universe

A single-screen, responsive, cinematic, interactive knowledge portal that serves as the entry point into the TechNeHub Labs Enterprise Architecture ecosystem.

At the centre of the experience is a physically accurate **Schwarzschild black hole**, rendered in real time by integrating null geodesics in the fragment shader. Around it orbit every architectural asset as a glass navigation card.

---

## Concept

> **The Enterprise Knowledge Universe**

The black hole represents the **Meta Moat** — the infinite depth of enterprise knowledge. The **Meta Framework** provides the structural coordinate system (classification, representation, organisation, governance). The **Metamodel** provides the semantic relationship graph (relationships, semantics, dependencies, knowledge graph). Together they form the navigation engine for every enterprise asset.

---

## Quick Start

This project runs entirely from a static web server. No bundler, no framework dependencies.

### Option A — Python

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/portal/>

### Option B — Node

```bash
npx serve .
# or
npx http-server -p 8000
```

### Option C — VS Code Live Server

Right-click `portal/index.html` → **Open with Live Server**.

> The Schwarzschild shader and GLSL modules are loaded via `fetch()`, so a real HTTP server is required — opening the HTML file directly via `file://` will not work.

---

## Project Structure

```
project/
├── index.html                  # Redirects to portal/
├── portal/
│   ├── index.html               # Main portal entry point
│   ├── css/
│   │   └── portal.css           # Complete design system + responsive layout
│   ├── js/
│   │   ├── main.js              # App entry — wires everything together
│   │   ├── blackhole-renderer.js # Schwarzschild renderer + post-processing pipeline
│   │   ├── shader-loader.js     # Fetches GLSL files at runtime
│   │   ├── orbit-layout.js      # Responsive card orbit positioning + spring animation
│   │   ├── hud.js               # HUD: clock, date, FPS, quality, GitHub status
│   │   ├── command-palette.js    # Global search + keyboard shortcuts (⌘K / /)
│   │   ├── portal-data.js       # Modular navigation architecture + GitHub API integration
│   │   ├── metamodel-explorer.js # Interactive SVG metamodel overlay
│   │   ├── metaframework-explorer.js # Interactive 7×7 matrix overlay
│   │   └── reports-explorer.js   # Architecture report viewer
│   ├── shaders/
│   │   ├── fullscreen.vert.glsl  # Fullscreen triangle vertex shader
│   │   ├── blackhole.frag.glsl  # Schwarzschild null geodesic integrator
│   │   ├── brightpass.frag.glsl # Bloom bright pass
│   │   ├── blur.frag.glsl       # Separable Gaussian blur
│   │   └── composite.frag.glsl  # Bloom + ACES + grain + CA + vignette + TAA
│   └── data/                    # (reserved for future data assets)
├── vendor/three/
│   └── three.module.js          # Local Three.js (v0.169) — no CDN
├── metamodel/                   # Existing metamodel viewer + SVG
├── dea-metaframework/           # Existing meta framework viewer
└── reports/REPORT.md            # Architecture report
```

---

## Technology Stack

- **Native HTML / CSS / ES Modules** — no bundler, no framework
- **Three.js r169** — vendored locally (no CDN dependency)
- **GLSL shaders** — loaded as text at runtime
- **WebGL2** — required for the Schwarzschild renderer

---

## The Schwarzschild Renderer

The black hole is **not** faked with spheres, textured quads, videos, or HDRI tricks. The fragment shader integrates photon trajectories through curved spacetime in real time.

### Physical phenomena implemented

| Phenomenon | Implementation |
|---|---|
| Schwarzschild null geodesics | Geodesic equation integration: `d²r/dλ² = -1.5 · r_s · h² / r⁵ · r̂` |
| Event horizon | Photon capture at `r < r_s` |
| Photon sphere | Emerges naturally at `r = 1.5 r_s` |
| Multiple accretion disk crossings | Equatorial-plane crossing detection per integration step |
| Gravitational lensing | Photon paths bend around the mass — background stars and galaxies are lensed |
| Relativistic Doppler beaming | Orbital velocity direction vs. line-of-sight → brightness boost/dimming |
| Gravitational redshift | `1 + z = 1/√(1 - r_s/r)` applied to disk emission |
| Procedural accretion disk turbulence | FBM noise with differential (Keplerian) rotation |
| Procedural starfield | Hash-based sparse stars on the celestial sphere with twinkle |
| Procedural galaxies | 4 spiral galaxies + nebula clouds via FBM |

### Post-processing pipeline

1. **Black hole pass** → HDR scene render target (HalfFloat)
2. **Bright pass** → extract HDR pixels above threshold
3. **Blur horizontal** → 9-tap separable Gaussian
4. **Blur vertical** → 9-tap separable Gaussian
5. **Composite** → bloom + ACES filmic tone mapping + film grain + chromatic aberration + vignette + temporal AA

### Quality modes

| Mode | Geodesic steps | Step size | Bloom | Notes |
|---|---|---|---|---|
| Standard | 90 | 0.12 | 0.7 | Mobile / low-end |
| High | 140 | 0.10 | 0.85 | Default for most desktops |
| Ultra | 200 | 0.08 | 1.0 | High-end GPUs |
| Cinematic | 256 | 0.06 | 1.2 | Flagship GPUs |

Quality is auto-detected from GPU renderer string, CPU cores, and device memory. Manually adjustable via the quality bar at the bottom of the screen.

---

## Interaction

| Action | Input |
|---|---|
| Orbit camera | Click + drag on the black hole |
| Zoom | Scroll wheel / pinch |
| Open search | `⌘K` (Mac) / `Ctrl+K` (Win) / `/` |
| Select asset 1–9 | Number keys |
| Navigate search | `↑` / `↓` then `↵` |
| Close overlay | `Esc` or click backdrop |
| Auto-orbit | Resumes after user interaction stops |

---

## Responsive Behaviour

The layout adapts based on aspect ratio, width, height, and orientation:

| Viewport | Behaviour |
|---|---|
| Desktop (landscape) | Cards orbit the black hole in an ellipse |
| Ultrawide (>2.1 aspect) | Expanded radial constellation |
| Tablet (768–1024px) | Compressed orbital layout |
| Mobile (<768px) | Adaptive circular carousel, blurbs hidden |
| Portrait | Stacked orbital arcs |

The central Schwarzschild renderer is preserved on every viewport. Cards never obstruct the event horizon.

---

## GitHub Integration

The portal fetches live repository data from the GitHub API:

```
GET https://api.github.com/orgs/technehub-labs/repos?per_page=100&sort=updated
```

Repository metadata (name, description, last update, language, topics) populates the command palette search index. If the API is unreachable, a curated fallback list is used and the HUD shows "offline (cached)".

---

## Browser Compatibility

| Browser | Support |
|---|---|
| Chrome 113+ | Full (WebGL2, HalfFloat render targets) |
| Firefox 110+ | Full |
| Safari 16.4+ | Full (WebGL2 on macOS + iOS) |
| Edge 113+ | Full |
| Mobile Safari 16.4+ | Standard quality, touch gestures |
| Chrome Android 113+ | Standard quality, touch gestures |

**Requires WebGL2.** If WebGL2 is unavailable, a static backdrop message is shown.

---

## Performance

The renderer targets 60 FPS on desktop and 30 FPS on mobile. Key optimizations:

- HalfFloat render targets for HDR without full 32-bit float cost
- Adaptive integration step size (smaller near the event horizon)
- Temporal anti-aliasing (TAA) replaces MSAA — cheaper and works with deferred-style rendering
- Quality presets reduce geodesic steps on weaker hardware
- `devicePixelRatio` capped at 2 to avoid Retina overdraw

---

## Accessibility

- Keyboard navigation for all cards and overlays
- `⌘K` / `/` command palette with arrow-key navigation
- Focus-visible states on all interactive elements
- `prefers-reduced-motion` respected (animations disabled)
- ARIA roles on dialogs and listboxes
- Sufficient contrast ratios on all text

---

## License

Licensed under the Apache License, Version 2.0. See [`LICENSE`](https://github.com/technehub-labs/technehub-labs.github.io/blob/main/LICENSE) and [`NOTICE`](https://github.com/technehub-labs/technehub-labs.github.io/blob/main/NOTICE) at the repo root.
