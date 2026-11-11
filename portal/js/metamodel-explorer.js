// ═══════════════════════════════════════════════════════════════
// Metamodel Explorer — renders into a provided body element.
// Loads the canonical SVG + entity-graph.json, makes every entity
// interactive, and derives relationships from the GRAPH (the synced
// SVG no longer carries link groups).
//
// Data contract (validated in _validateContract — a violation renders
// a loud error panel, never a silently degraded explorer):
//   - metamodel.svg contains g.entity[data-alias] groups
//   - entity-graph.json contains entities[] with class_alias
//   - every SVG alias resolves to a graph entity
// ═══════════════════════════════════════════════════════════════

export class MetamodelExplorer {
  constructor(bodyEl) {
    this.bodyEl = bodyEl;
    this.graph = null;
    this.aliasToEntity = new Map();
    this.adjacency = new Map();   // alias -> [{ other, label, dir, relType, cardinality }]
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

    const [svgOk, graphOk] = await Promise.all([this._loadSvg(), this._loadGraph()]);
    if (!svgOk || !graphOk) return;             // error panel already rendered
    if (!this._validateContract()) return;      // loud contract failure

    this._buildAdjacency();
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
      return !!this.svg;
    } catch (e) {
      this._renderContractError(['metamodel.svg failed to load', String(e)]);
      return false;
    }
  }

  async _loadGraph() {
    try {
      const resp = await fetch('../metamodel/entity-graph.json');
      this.graph = await resp.json();
      return true;
    } catch (e) {
      this._renderContractError(['entity-graph.json failed to load', String(e)]);
      return false;
    }
  }

  _validateContract() {
    const problems = [];
    this.entityGroups = [...this.svg.querySelectorAll('g.entity')];
    this.svgAliases = new Set();

    if (this.entityGroups.length === 0) {
      problems.push('SVG contains no g.entity groups — the SVG format changed.');
    }
    for (const g of this.entityGroups) {
      const alias = g.getAttribute('data-alias') || this._aliasFromId(g.id);
      if (!alias) {
        problems.push(`SVG entity group "${g.id}" has neither data-alias nor an elem_<ALIAS> id.`);
        continue;
      }
      g.dataset.alias = alias;
      this.svgAliases.add(alias);
    }

    const graphEntities = this.graph?.entities;
    if (!Array.isArray(graphEntities) || graphEntities.length === 0) {
      problems.push('entity-graph.json has no entities[] array.');
    } else {
      for (const e of graphEntities) {
        if (e.class_alias) this.aliasToEntity.set(e.class_alias, e);
      }
    }
    if (this.aliasToEntity.size === 0) {
      problems.push('No graph entities carry a class_alias.');
    }

    // Every SVG entity must resolve in the graph.
    const unresolved = [...this.svgAliases].filter((a) => !this.aliasToEntity.has(a));
    if (unresolved.length > 0) {
      problems.push(
        `${unresolved.length} SVG entities are missing from entity-graph.json (e.g. ${unresolved.slice(0, 5).join(', ')}).`
      );
    }

    if (problems.length > 0) {
      this._renderContractError(problems);
      return false;
    }
    return true;
  }

  _aliasFromId(id) {
    // Legacy ids ("ent<alias>") and current ids ("elem_<ALIAS>") both
    // reduce to the bare alias.
    const m = /^(?:ent|elem)_?(.+)$/i.exec(id || '');
    return m ? m[1].toUpperCase() : null;
  }

  _buildAdjacency() {
    // Layer metadata drives the context panel's badge (name + color).
    this.layerMeta = new Map((this.graph.layers || []).map((l) => [l.id, l]));
    for (const rel of this.graph.relationships || []) {
      const entry = { other: rel.to, label: rel.label, dir: 'out', relType: rel.rel_type, cardinality: rel.cardinality };
      if (!this.adjacency.has(rel.from)) this.adjacency.set(rel.from, []);
      this.adjacency.get(rel.from).push(entry);
      const back = { other: rel.from, label: rel.label, dir: 'in', relType: rel.rel_type, cardinality: rel.cardinality };
      if (!this.adjacency.has(rel.to)) this.adjacency.set(rel.to, []);
      this.adjacency.get(rel.to).push(back);
    }
  }

  _renderContractError(problems) {
    const list = problems.map((p) => `<li>${this._esc(p)}</li>`).join('');
    this.elContext.innerHTML = `
      <div style="border:1px solid #ef4444;background:rgba(239,68,68,0.08);border-radius:8px;padding:var(--sp-4);font-size:0.78rem;line-height:1.6;color:var(--text-2);">
        <h4 style="color:#ef4444;margin:0 0 var(--sp-2);font-size:0.8rem;letter-spacing:0.05em;">METAMODEL DATA CONTRACT VIOLATION</h4>
        <p style="margin:0 0 var(--sp-2);">The synced artefacts no longer match what this explorer expects. Nothing is shown rather than something wrong.</p>
        <ul style="margin:0 0 var(--sp-3);padding-left:1.1em;">${list}</ul>
        <p style="margin:0;">Cross-check the classic navigator:
          <a href="../metamodel/" target="_blank" rel="noopener" style="color:var(--cyan)">/metamodel/</a>
          — or re-run the metamodel sync workflow.</p>
      </div>
    `;
    this.elCanvas.innerHTML = '<div style="padding:var(--sp-5);color:var(--text-3);">Metamodel unavailable — see the contract report.</div>';
    this.svg = null;
  }

  _esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  _makeInteractive() {
    this.entityGroups.forEach((g) => {
      g.style.cursor = 'pointer';
      g.addEventListener('mouseenter', () => this._onHover(g));
      g.addEventListener('mouseleave', () => this._onUnhover(g));
      g.addEventListener('click', (e) => { e.stopPropagation(); this._onSelect(g); });
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', this.aliasToEntity.get(g.dataset.alias)?.display_name || g.dataset.alias);
      g.addEventListener('focus', () => this._onHover(g));
      g.addEventListener('blur', () => this._onUnhover(g));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._onSelect(g);
        }
      });
    });
  }

  _relatedAliases(alias) {
    const set = new Set();
    for (const { other } of this.adjacency.get(alias) || []) set.add(other);
    return set;
  }

  _onHover(g) {
    if (this.selected) return;
    this.hovered = g.dataset.alias;
    this._highlight(g.dataset.alias);
  }

  _onUnhover() {
    if (this.selected) return;
    this._clearHighlight();
    this.hovered = null;
  }

  _onSelect(g) {
    this._clearHighlight();
    this.selected = g.dataset.alias;
    this._highlight(this.selected);
    this._showContext(this.selected);
  }

  _highlight(alias) {
    const related = this._relatedAliases(alias);
    this.entityGroups.forEach((g) => {
      if (g.dataset.alias === alias) g.classList.add('mm-active');
      else if (related.has(g.dataset.alias)) g.classList.add('mm-related');
      else g.classList.add('mm-dim');
    });
  }

  _clearHighlight() {
    this.entityGroups?.forEach((g) => g.classList.remove('mm-active', 'mm-related', 'mm-dim'));
  }

  _showContext(alias) {
    const entity = this.aliasToEntity.get(alias);
    const rels = this.adjacency.get(alias) || [];
    const nameOf = (a) => this.aliasToEntity.get(a)?.display_name || a;
    const layer = entity?.layer ? this.layerMeta?.get(entity.layer) : null;
    const layerLabel = layer?.name || (entity?.layer || 'Dimension');
    const layerColor = layer?.dark_color || layer?.color || '#9ca3af';

    const relItems = rels.map((r) => {
      const arrow = r.dir === 'out' ? '→' : '←';
      const card = r.cardinality ? ` <span style="color:var(--text-3)">[${this._esc(r.cardinality)}]</span>` : '';
      return `<span class="mm-ctx-rel">${arrow} ${this._esc(r.label)}${card} ${this._esc(nameOf(r.other))}</span>`;
    });

    const relatedChips = [...this._relatedAliases(alias)]
      .map((a) => `<button type="button" class="mm-ctx-chip" data-jump-alias="${this._esc(a)}" title="Inspect ${this._esc(nameOf(a))}">${this._esc(nameOf(a))}</button>`)
      .join('');

    this.elContext.innerHTML = `
      <div class="mm-ctx-header">
        <span class="mm-ctx-layer" style="--c:${layerColor}">${this._esc(layerLabel)}</span>
        <h3>${this._esc(entity?.display_name || alias)}<span style="color:var(--text-3);font-size:0.7em;"> · ${this._esc(alias)}</span></h3>
      </div>
      <p class="mm-ctx-desc">${this._esc(entity?.description || 'No description available.')}</p>
      ${entity?.repo_url ? `
        <a class="mm-ctx-repo" href="${this._esc(entity.repo_url)}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          ${this._esc(entity.catalog_repo || entity.repo_url)}
        </a>` : ''}
      <div class="mm-ctx-section">
        <h4>Relationships (${rels.length})</h4>
        <div class="mm-ctx-rels">${relItems.join('') || '<span style="color:var(--text-3)">None in the current graph.</span>'}</div>
      </div>
      <div class="mm-ctx-section">
        <h4>Connected entities (${rels.length ? this._relatedAliases(alias).size : 0})</h4>
        <div class="mm-ctx-chips">${relatedChips || '<span style="color:var(--text-3)">None.</span>'}</div>
      </div>
      <div class="mm-ctx-section">
        <h4>Status</h4>
        <span class="mm-ctx-status mm-ctx-status--${this._esc(entity?.status || 'planned')}">${this._esc(entity?.status || 'planned')}</span>
      </div>
    `;

    // Connected-entity chips jump straight to that entity.
    this.elContext.querySelectorAll('[data-jump-alias]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const target = this.entityGroups.find((g) => g.dataset.alias === chip.dataset.jumpAlias);
        if (target) this._onSelect(target);
      });
    });
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
