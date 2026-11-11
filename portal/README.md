# TechNeHub Labs — Enterprise Knowledge Universe

A single-screen, cinematic, interactive knowledge portal that serves as the
entry point into the TechNeHub Labs Enterprise Architecture ecosystem.

At the centre of the experience is a physically accurate **Schwarzschild black
hole**, rendered in real time by integrating null geodesics in the fragment
shader. Around it orbit the architectural assets as glass navigation cards.

---

## Concept

> **The Enterprise Knowledge Universe**

The black hole represents the **Meta Moat** — the infinite depth of enterprise
knowledge. The **Meta Framework** provides the structural coordinate system
(classification, representation, organisation, governance). The **Metamodel**
provides the semantic relationship graph (relationships, semantics,
dependencies, knowledge graph). Together they form the navigation engine for
every enterprise asset.

---

## Quick Start

This project runs entirely from a static web server. No bundler, no framework
dependencies. Serve the REPO ROOT (not `portal/`) — the page fetches sibling
datasets (`../metamodel/…`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/portal/
```

Staging: the whole repo is mirrored to the LAN staging box and served by the
user-level Caddy there — review at `http://192.168.50.80:8081/portal/`.
Deploys: `~/Developer/bin/deploy-staging-app.sh portal --branch <ref>`.

---

## Project Structure

```
portal/
├── index.html              Page shell: header, cards layer, marathon
│                           timeline, footer, popup + command-palette roots
├── css/portal.css          All styling (design tokens as custom properties)
├── js/
│   ├── main.js             App shell: cards, popups, timeline, tooltips,
│   │                       search index, dynamic dataset cards, site facts
│   ├── site-facts.js       Live counts computed from the metamodel graph
│   ├── portal-data.js      Static card defs + GitHub org/releases fetching
│   │                       + synced-dataset fetchers (capabilities, references)
│   ├── blackhole-renderer.js  Three.js post-processing pipeline + renderer
│   ├── shaders.js          Inline GLSL (blackhole, bloom, composite) — the
│   │                       single source of shader truth
│   ├── command-palette.js  ⌘K / "/" palette over cards + GitHub repos
│   ├── hud.js              Clock/date + org/status/repos telemetry
│   ├── metamodel-explorer.js   SVG + graph popup (data-contract validated)
│   ├── metaframework-explorer.js  7×7 ECF matrix popup
│   ├── layer-architecture.js   Layer accordion from entity-graph.json
│   ├── capabilities-explorer.js  Synced capability catalog browser
│   ├── references-explorer.js    Reference-registry detail
│   ├── assessment-maturity.js  Static assessment/maturity reference
│   └── repositories-catalog.js GitHub repo grid with release badges
├── data/                   Synced datasets (see data/README.md):
│   ├── capabilities.json   ← sync-capabilities.yml (release assets)
│   ├── ecf-matrix.json     ← sync-metaframework.yml
│   └── references.json     Hand-maintained registry card contract
└── vendor/                 Vendored three.js r160 + patched addons
                            (addons import the module relatively)

Surfaces in the same repo (repo root = site root on GitHub Pages):
- `/`           → redirect to /portal/
- `/metamodel/` → classic navigator (entity grid + SVG, ?entity= deep links)
- `/dea-metaframework/` → standalone ECF matrix viewer
- `/capabilities/` → versioned capability artifacts (catalog.json, poster, …)
- `/reports/`   → metaframework REPORT.md
```

---

## The Schwarzschild Renderer

`js/blackhole-renderer.js` integrates null geodesics in the fragment shader
(`js/shaders.js`) — photon capture, gravitational lensing, relativistic
Doppler beaming, and a thin accretion disc — followed by a post pipeline:
bright-pass → separable blur → bloom → composite (chromatic aberration, ACES
tonemap, vignette, grain).

- Renders via a fullscreen quad; bloom through UnrealBloomPass + custom
  composite pass.
- Cinematic camera: slow distance/pitch triangle wave + continuous yaw.
  OrbitControls are attached for drag/zoom.
- Robustness: WebGL init try/catch, `webglcontextlost` overlay with
  auto-reload on restore, render-fault latch, pause when a popup is open or
  the tab is hidden.
- The importmap maps `three` → `/portal/vendor/three/three.module.js` (site
  root must be the repo root, matching GitHub Pages).

## Interaction

- **Cards** — click to open a full-screen popup module; hover/focus the card
  icon for the technical spec tooltip.
- **⌘K or /** — command palette over portal cards + all org repos (repo
  results open their GitHub page).
- **Marathon timeline** — hover/touch year ticks for milestone goals; the
  progress badge is computed live.
- **Popups** — metamodel (SVG + graph), ECF matrix, layers, capabilities,
  references, repositories; ESC closes; the renderer pauses underneath.

## Data pipeline (CI)

Three sync workflows run on the repo and commit if changed:

| Workflow | Source | Lands in | Consumers |
|---|---|---|---|
| `sync-metamodel.yml` | dea-metamodel artefacts | `metamodel/` | portal popups, `/metamodel/` navigator, dea-web-viewer |
| `sync-metaframework.yml` | dea-metaframework pages assets | `dea-metaframework/`, `portal/data/ecf-matrix.json` | matrix popup + standalone viewer |
| `sync-capabilities.yml` | capabilities catalog release assets | `capabilities/`, `portal/data/capabilities.json` | capabilities popup |

Counts shown anywhere in the UI are computed from the synced graph
(`site-facts.js`) — never hard-coded.

## GitHub Integration

- Org repo list via `api.github.com` (unauthenticated, shared 60 req/hr
  budget). On failure the catalog falls back to a curated list and the HUD
  honestly reports **offline (cached)**.
- Latest releases are fetched per repo with a 1h localStorage cache.

## Browser Compatibility

Evergreen Chromium/Firefox/Safari. Requires WebGL2 for the renderer; when
unavailable the page still serves all data surfaces.

## Accessibility notes (known gaps, tracked in the front-end roadmap)

- Popups lack `role="dialog"`/focus traps; matrix cells and some cards are
  pointer-first.
- `user-scalable=no` is still present in the viewport meta (removal planned).
- The cinematic camera does not yet honour `prefers-reduced-motion`.

## License

Apache License 2.0 — see the repo root `LICENSE` and `NOTICE`.
