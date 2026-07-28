// ═══════════════════════════════════════════════════════════════
// Layer Architecture — browsable 6-layer breakdown from entity-graph.json.
// Each layer expands to show its entities with descriptions and repo links.
// ═══════════════════════════════════════════════════════════════

export class LayerArchitecture {
  constructor(bodyEl) {
    this.bodyEl = bodyEl;
    this.entityMap = null;
    this.expandedLayer = null;
  }

  async render() {
    await this._loadData();
    const layers = this.entityMap?.layers || [];
    const entities = this.entityMap?.entities || [];
    const stats = this.entityMap?.stats || {};

    let html = `
      <div class="la-stats" style="margin-bottom:var(--sp-5);display:flex;gap:var(--sp-4);font-family:var(--font-mono);font-size:0.72rem;color:var(--text-3);">
        <span>${stats.total_layers || layers.length} Layers</span>
        <span>${stats.total_entities || entities.length} Entities</span>
        <span>${stats.total_relationships || 0} Relationships</span>
        <span style="color:var(--cyan)">v${this.entityMap?.metamodel_version || '3.0.0'}</span>
      </div>
    `;

    for (const layer of layers) {
      const layerEntities = entities.filter((e) => e.layer === layer.id);
      const color = layer.color_dark || layer.color;
      html += `
        <div class="la-layer" data-layer="${layer.id}">
          <div class="la-layer-header" data-layer-toggle="${layer.id}">
            <span class="la-layer-badge" style="background:${color};color:${layer.color}">${layer.id}</span>
            <span class="la-layer-name">${layer.name}</span>
            <span class="la-layer-sub">${layer.subtitle}</span>
            <span class="la-layer-count">${layerEntities.length} entities</span>
            <svg class="la-layer-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div class="la-layer-entities">
            ${layerEntities.map((e) => `
              <div class="la-entity">
                <span class="la-entity-alias">${e.class_alias}</span>
                <div class="la-entity-body">
                  <div class="la-entity-name">${e.display_name}</div>
                  <div class="la-entity-desc">${e.description || ''}</div>
                  <div class="la-entity-meta">
                    <span class="la-entity-status la-entity-status--${e.status}">${e.status}</span>
                    ${e.catalog_repo ? `<a class="la-entity-repo" href="${e.repo_url}" target="_blank" rel="noopener">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                      ${e.catalog_repo}
                    </a>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    this.bodyEl.innerHTML = html;
    this._bind();
  }

  _bind() {
    this.bodyEl.querySelectorAll('[data-layer-toggle]').forEach((header) => {
      header.addEventListener('click', () => {
        const layerEl = header.closest('.la-layer');
        layerEl.classList.toggle('expanded');
      });
    });
  }

  async _loadData() {
    if (this.entityMap) return;
    try {
      const resp = await fetch('../metamodel/entity-graph.json');
      this.entityMap = await resp.json();
    } catch (e) {
      this.entityMap = { layers: [], entities: [], relationships: [], stats: {} };
    }
  }
}
