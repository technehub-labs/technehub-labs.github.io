# Capabilities

Mirror of [dea-catalog-business-capabilities](https://github.com/technehub-labs/dea-catalog-business-capabilities)
publication pipeline output (CR-DEA-BC-06).

Subdirectories:

- `latest/`  — mutable mirror of the current `v1-alpha.P` baseline (updated on
  every merge to `main` upstream)
- `v<...>/`  — immutable per-tag snapshots (one directory per released tag)

Files per snapshot:

- `poster.svg`, `poster.png` — single-page summary poster
- `map.svg`, `map.png` — ECF coverage map
- `catalog.svg`, `catalog.png` — visual catalog viewer
- `catalog.csv`, `catalog.json` — machine-readable catalog (entry list)
- `overlay.yaml`, `overlay.json` — ECF coordinate overlay (full provenance)
- `dependencies.yaml` — pinned dependency manifest (mirrors the source repo)
- `MANIFEST.md` — release manifest (what's in this snapshot)

Synced by [`.github/workflows/sync-capabilities.yml`](../.github/workflows/sync-capabilities.yml)
(canonical trigger: hourly cron; `repository_dispatch` fast path is opt-in once
`DISPATCH_TOKEN` is configured on the source repo).
