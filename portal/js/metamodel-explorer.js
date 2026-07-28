// ═══════════════════════════════════════════════════════════════
// Metamodel Explorer — renders into a provided body element.
// Loads the SVG, makes every entity interactive.
// ═══════════════════════════════════════════════════════════════

export class MetamodelExplorer {
  constructor(bodyEl) {
    this.bodyEl = bodyEl;
    this.entityMap = null;
    this.selected = null;
    this.hovered = null;
    this.zoom = 1;
    this.panX = 0; this.panY = 0;
  }

  async render() {
    this.bodyEl.classList.add('popup-body--split');
    this.bodyEl.innerHTML = `
      <div class="mm-canvas" id="mmCanvas"></div>
      <aside class="mm-context" id="mmContext">
        <div class="mm-context-empty">Select an entity to inspect its relationships, dependencies, and canonical repository.</div>
      </aside>
    `;
    this.elCanvas = this.bodyEl.querySelector('#mmCanvas');
    this.elContext = this.bodyEl.querySelector('#mmContext');

    await this._loadSvg();
    await this._loadEntityData();
    this._makeInteractive();
    this._bindControls();
  }

  async _loadSvg() {
    try {
      const resp = await fetch('../metamodel/metamodel.svg');
      const txt = await resp.text();
      this.elCanvas.innerHTML = txt;
      this.svg = this.elCanvas.querySelector('svg');
      if (this.svg) {
        this.svg.removeAttribute('width');
        this.svg.removeAttribute('height');
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
      }
    } catch (e) {
      this.elCanvas.innerHTML = '<div style="padding:var(--sp-5);color:var(--text-3);">Could not load metamodel SVG.</div>';
    }
  }

  async _loadEntityData() {
    try {
      const resp = await fetch('../metamodel/entity-graph.json');
      this.entityMap = await resp.json();
    } catch (e) {
      this.entityMap = { entities: [] };
    }
  }

  _makeInteractive() {
    if (!this.svg) return;
    const entities = this.svg.querySelectorAll('g.entity');
    entities.forEach((g) => {
      g.style.cursor = 'pointer';
      g.addEventListener('mouseenter', () => this._onHover(g));
      g.addEventListener('mouseleave', () => this._onUnhover(g));
      g.addEventListener('click', (e) => { e.stopPropagation(); this._onSelect(g); });
      g.setAttribute('tabindex', '0');
      g.addEventListener('focus', () => this._onHover(g));
      g.addEventListener('blur', () => this._onUnhover(g));
    });
    this.links = this.svg.querySelectorAll('g.link');
  }

  _relatedLinks(id) {
    const related = [];
    this.links.forEach((l) => {
      const e1 = l.getAttribute('data-entity-1');
      const e2 = l.getAttribute('data-entity-2');
      if (e1 === id || e2 === id) related.push(l);
    });
    return related;
  }

  _onHover(g) {
    if (this.selected) return;
    this.hovered = g.id;
    this._highlight(g.id);
  }

  _onUnhover(g) {
    if (this.selected) return;
    this._clearHighlight();
    this.hovered = null;
  }

  _onSelect(g) {
    this._clearHighlight();
    this.selected = g.id;
    this._highlight(g.id);
    this._showContext(g.id);
  }

  _highlight(id) {
    const related = this.relatedEntitiesCache(id);
    this.svg.querySelectorAll('g.entity').forEach((g) => {
      if (g.id === id) g.classList.add('mm-active');
      else if (related.has(g.id)) g.classList.add('mm-related');
      else g.classList.add('mm-dim');
    });
    this.links.forEach((l) => {
      const e1 = l.getAttribute('data-entity-1');
      const e2 = l.getAttribute('data-entity-2');
      if (e1 === id || e2 === id) l.classList.add('mm-link-active');
      else l.classList.add('mm-link-dim');
    });
  }

  relatedEntitiesCache(id) {
    if (!this._relCache) this._relCache = {};
    if (this._relCache[id]) return this._relCache[id];
    const set = new Set();
    this.links.forEach((l) => {
      const e1 = l.getAttribute('data-entity-1');
      const e2 = l.getAttribute('data-entity-2');
      if (e1 === id) set.add(e2);
      if (e2 === id) set.add(e1);
    });
    this._relCache[id] = set;
    return set;
  }

  _clearHighlight() {
    this.svg?.querySelectorAll('g.entity').forEach((g) => g.classList.remove('mm-active', 'mm-related', 'mm-dim'));
    this.links?.forEach((l) => l.classList.remove('mm-link-active', 'mm-link-dim'));
  }

  _showContext(id) {
    const entity = (this.entityMap?.entities || []).find((e) => e.entity_id === id || 'ent' + e.class_alias.toLowerCase() === id);
    const related = [...this.relatedEntitiesCache(id)].map((rid) => {
      const r = (this.entityMap?.entities || []).find((e) => 'ent' + e.class_alias.toLowerCase() === rid);
      return r ? r.display_name : rid;
    });
    const links = this._relatedLinks(id);
    const relLabels = links.map((l) => l.querySelector('text')?.textContent || '').filter(Boolean);

    this.elContext.innerHTML = `
      <div class="mm-ctx-header">
        <span class="mm-ctx-layer" style="--c:${entity?.color_dark || '#7fc8c0'}">${entity?.layer_name || ''}</span>
        <h3>${entity?.display_name || id}</h3>
      </div>
      <p class="mm-ctx-desc">${entity?.description || 'No description available.'}</p>
      ${entity?.catalog_repo ? `
        <a class="mm-ctx-repo" href="${entity.repo_url}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          ${entity.catalog_repo}
        </a>` : ''}
      <div class="mm-ctx-section">
        <h4>Relationships (${relLabels.length})</h4>
        <div class="mm-ctx-rels">
          ${relLabels.map((l, i) => `<span class="mm-ctx-rel">${l} → ${related[i] || ''}</span>`).join('')}
        </div>
      </div>
      <div class="mm-ctx-section">
        <h4>Connected entities (${related.length})</h4>
        <div class="mm-ctx-chips">
          ${related.map((r) => `<span class="mm-ctx-chip">${r}</span>`).join('')}
        </div>
      </div>
      <div class="mm-ctx-section">
        <h4>Status</h4>
        <span class="mm-ctx-status mm-ctx-status--${entity?.status || 'planned'}">${entity?.status || 'planned'}</span>
      </div>
    `;
  }

  _bindControls() {
    if (!this.elCanvas) return;
    let dragging = false, lx = 0, ly = 0;
    this.elCanvas.addEventListener('pointerdown', (e) => {
      if (e.target.closest('g.entity')) return;
      dragging = true; lx = e.clientX; ly = e.clientY;
      this.elCanvas.setPointerCapture(e.pointerId);
    });
    this.elCanvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.panX += e.clientX - lx; this.panY += e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      this._applyTransform();
    });
    const end = (e) => { dragging = false; if (this.elCanvas.hasPointerCapture(e.pointerId)) this.elCanvas.releasePointerCapture(e.pointerId); };
    this.elCanvas.addEventListener('pointerup', end);
    this.elCanvas.addEventListener('pointercancel', end);
    this.elCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.3, Math.min(3.5, this.zoom * (1 - e.deltaY * 0.001)));
      this._applyTransform();
    }, { passive: false });
  }

  _applyTransform() {
    if (this.svg) this.svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  dispose() {
    this._clearHighlight();
    this.selected = null;
  }
}
