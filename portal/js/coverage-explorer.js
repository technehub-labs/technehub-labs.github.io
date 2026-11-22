// ═══════════════════════════════════════════════════════════════
// Programme Coverage — computes catalogue coverage, status
// distribution, and per-layer allocation from the synced
// entity-graph.json. Same source as the dea-web-viewer's coverage
// dashboard; rendered as a compact programme-health brief.
// Everything shown is computed — no hand-maintained numbers.
// ═══════════════════════════════════════════════════════════════

export class CoverageExplorer {
  constructor(bodyEl) {
    this.bodyEl = bodyEl;
    this.graph = null;
  }

  async render() {
    try {
      const resp = await fetch('../metamodel/entity-graph.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this.graph = await resp.json();
    } catch (e) {
      this.bodyEl.innerHTML = `
        <div style="border:1px solid #ef4444;background:rgba(239,68,68,0.08);border-radius:8px;padding:var(--sp-4);font-size:0.78rem;color:var(--text-2);">
          <h4 style="color:#ef4444;margin:0 0 var(--sp-2);font-size:0.8rem;">COVERAGE DATA UNAVAILABLE</h4>
          <p style="margin:0;">entity-graph.json could not be loaded (${this._esc(String(e))}).
          Coverage is computed from the synced graph — trigger the metamodel sync and retry.</p>
        </div>`;
      return;
    }

    const entities = this.graph.entities || [];
    const rels = this.graph.relationships || [];
    const layers = this.graph.layers || [];
    const total = entities.length;

    // Status distribution.
    const byStatus = new Map();
    for (const e of entities) {
      const s = e.status || 'unknown';
      byStatus.set(s, (byStatus.get(s) || 0) + 1);
    }
    const statusRows = [...byStatus.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `
        <div class="cov-status-row">
          <span class="cov-status-name">${this._esc(s)}</span>
          <div class="cov-bar"><div class="cov-bar-fill" style="width:${total ? ((n / total) * 100).toFixed(1) : 0}%"></div></div>
          <span class="cov-status-count">${n} · ${total ? ((n / total) * 100).toFixed(0) : 0}%</span>
        </div>`).join('');

    // Per-layer allocation + catalog coverage.
    const layerRows = layers.map((l) => {
      const inLayer = entities.filter((e) => e.layer === l.id);
      const cataloged = inLayer.filter((e) => e.catalog_repo).length;
      return `
        <div class="cov-layer-row">
          <span class="cov-layer-badge" style="--c:${this._esc(l.dark_color || l.color || '#9ca3af')}">${this._esc(l.id)}</span>
          <span class="cov-layer-name">${this._esc(l.name)}</span>
          <span class="cov-layer-counts">${inLayer.length} entities · ${cataloged} cataloged</span>
        </div>`;
    }).join('');

    // Dimension (unlayered) entities — surfaced, not hidden.
    const dims = entities.filter((e) => !e.layer);
    const catalogedTotal = entities.filter((e) => e.catalog_repo).length;
    const backlog = entities.filter((e) => !e.catalog_repo);
    const pct = (n) => (total ? ((n / total) * 100).toFixed(0) : 0);

    this.bodyEl.innerHTML = `
      <div class="cov-wrap">
        <div class="cov-headline">
          <div class="cov-headline-item">
            <span class="cov-big">${total}</span>
            <span class="cov-label">entities</span>
          </div>
          <div class="cov-headline-item">
            <span class="cov-big">${rels.length}</span>
            <span class="cov-label">relationships</span>
          </div>
          <div class="cov-headline-item">
            <span class="cov-big">${catalogedTotal} <span style="font-size:0.6em;color:var(--text-3)">/ ${total}</span></span>
            <span class="cov-label">cataloged (${pct(catalogedTotal)}%)</span>
          </div>
          <div class="cov-headline-item">
            <span class="cov-big" style="color:var(--cyan)">v${this._esc(this.graph.metamodel_version || 'unknown')}</span>
            <span class="cov-label">OpenDEAM</span>
          </div>
        </div>

        <div class="cap-section">
          <h4>Status distribution</h4>
          ${statusRows}
        </div>

        <div class="cap-section">
          <h4>Layer allocation</h4>
          ${layerRows}
          <div class="cov-layer-row">
            <span class="cov-layer-badge" style="--c:#9ca3af">DIM</span>
            <span class="cov-layer-name">Cross-cutting dimensions</span>
            <span class="cov-layer-counts">${dims.length} entities · ${dims.filter((e) => e.catalog_repo).length} cataloged</span>
          </div>
        </div>

        <div class="cap-section">
          <h4>Catalogue backlog — ${backlog.length} entities without a canonical repo (${pct(backlog.length)}%)</h4>
          ${backlog.length ? `
            <div class="cov-backlog">
              ${backlog.map((e) => `<span class="cap-tag" title="${this._esc(e.display_name)}">${this._esc(e.class_alias)}</span>`).join(' ')}
            </div>
            <p class="cap-muted" style="margin-top:var(--sp-2)">Closing these gaps is tracked in the dea-web-viewer coverage dashboard and the owning catalog repos.</p>
          ` : '<p class="cap-muted">None — every entity has a canonical catalog.</p>'}
        </div>
      </div>
    `;
  }

  _esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  dispose() { /* static render */ }
}
