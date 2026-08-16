# technehub-labs.github.io

> GitHub Pages site — TechNe Research & Dev. Labs landing page and the **publication point** for the DEA metamodel viewer artifacts.

**Live site:** <https://technehub-labs.github.io/>

## What this publishes

| Path | Content | Source |
|---|---|---|
| `/` | Org landing site | hand-authored (`index.html`, `css/`, `js/`, `assets/`) |
| `/metamodel/` | Classic metamodel navigator (vanilla JS class-grid) + `entity-graph.json` + `metamodel.svg` | **bot-published** from [`dea-metamodel`](https://github.com/technehub-labs/dea-metamodel) via `.github/workflows/sync-metamodel.yml` |
| `/dea-metaframework/` | Enterprise Concept Framework (7×7 matrix) site | mirrored from [`dea-metaframework`](https://github.com/technehub-labs/dea-metaframework) |

## Consumers

- [`dea-web-viewer`](https://github.com/technehub-labs/dea-web-viewer) — React explorer at `/dea-web-viewer/`; syncs `entity-graph.json` + `metamodel.svg` **from this repo** (not from `dea-metamodel` directly), because this repo is what users actually see and is publicly fetchable from CI without a PAT.

## Editing rules

- `/metamodel/` artifacts are **bot-owned** — hand-edits are overwritten on the next sync. Change the metamodel in `dea-metamodel`; its regeneration bot republishes here.
- Landing page and site chrome are hand-authored here.

## License

Apache 2.0 — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
