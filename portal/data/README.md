# portal/data

Data files loaded by `portal/index.html` and its JS modules. Each file describes one card group on the portal canvas.

## Files

| File | Card group | Source repo | Sync mechanism |
|---|---|---|---|
| `capabilities.json` | Business Capability cards | `technehub-labs/dea-catalog-business-capabilities` | `repository_dispatch` from CR-DEA-BC-06; see `.github/workflows/sync-capabilities.yml` |
| `ecf-matrix.json` | ECF matrix data | `technehub-labs/dea-metaframework` | `repository_dispatch` from dea-metaframework; see `.github/workflows/sync-metaframework.yml` |
| `references.json` | Reference Registry card (lists.technehub.com) | `technehub-labs/dea-catalog-references` | manual at slice 0 (kanban #412); static until the dynamic-card-render JS picks it up |

## Card render contract

The portal's JS reads each `*.json` file under `portal/data/` and renders one card group per file. Each file's structure is governed by the corresponding source repo's CR; this README is the discovery index, not the schema authority.