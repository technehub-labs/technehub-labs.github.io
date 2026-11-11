// ═══════════════════════════════════════════════════════════════
// Capabilities Explorer — browses the synced capability catalog
// (portal/data/capabilities.json, release-asset-mirrored by CI).
// Search + lifecycle/layer filters, detail view with ECF coordinates,
// boundaries, evidence, and provenance.
// ═══════════════════════════════════════════════════════════════

export class CapabilitiesExplorer {
  constructor(bodyEl, data) {
    this.bodyEl = bodyEl;
    this.entries = data.entries;      // [{id, name, definition, ...}]
    this.byId = new Map(this.entries.map((e) => [e.id, e]));
    this.query = '';
    this.lifecycle = null;            // selected lifecycle_status or null
    this.layer = null;                // selected capability_layer or null
    this.selectedId = null;
  }

  async render() {
    this.lifecycleOptions = [...new Set(this.entries.map((e) => e.lifecycle_status).filter(Boolean))].sort();
    this.layerOptions = [...new Set(this.entries.map((e) => e.capability_layer).filter(Boolean))].sort();
    this._renderShell();
    this._bind();
    this._renderList();
  }

  _renderShell() {
    this.bodyEl.innerHTML = `
      <div class="cap-toolbar">
        <div class="cap-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="cap-search" id="capSearch" type="text" placeholder="Search capabilities — name, definition, outcome…"
                 autocomplete="off" spellcheck="false" aria-label="Search capabilities" />
        </div>
        <div class="cap-chip-row" id="capLifecycleRow" role="group" aria-label="Filter by lifecycle status">
          <span class="cap-chip-label">lifecycle</span>
          ${this.lifecycleOptions.map((l) => `<button type="button" class="cap-chip" data-cap-lifecycle="${this._esc(l)}">${this._esc(l)}</button>`).join('')}
        </div>
        <div class="cap-chip-row" id="capLayerRow" role="group" aria-label="Filter by capability layer">
          <span class="cap-chip-label">layer</span>
          ${this.layerOptions.map((l) => `<button type="button" class="cap-chip" data-cap-layer="${this._esc(l)}">${this._esc(l)}</button>`).join('')}
        </div>
      </div>
      <div class="cap-count" id="capCount" aria-live="polite"></div>
      <div class="cap-list" id="capList" role="list"></div>
    `;
    this.elSearch = this.bodyEl.querySelector('#capSearch');
    this.elList = this.bodyEl.querySelector('#capList');
    this.elCount = this.bodyEl.querySelector('#capCount');
  }

  _bind() {
    this.elSearch.addEventListener('input', () => {
      this.query = this.elSearch.value;
      this._renderList();
    });
    this.bodyEl.querySelectorAll('[data-cap-lifecycle]').forEach((chip) => {
      chip.addEventListener('click', () => this._toggleChip(chip, 'lifecycle'));
    });
    this.bodyEl.querySelectorAll('[data-cap-layer]').forEach((chip) => {
      chip.addEventListener('click', () => this._toggleChip(chip, 'layer'));
    });
    // Delegated clicks: list items + detail back button + related jumps.
    this.bodyEl.addEventListener('click', (e) => {
      const item = e.target.closest('[data-cap-id]');
      if (item) { this._showDetail(item.dataset.capId); return; }
      if (e.target.closest('[data-cap-back]')) { this.selectedId = null; this._renderList(); return; }
      const jump = e.target.closest('[data-cap-jump]');
      if (jump) this._showDetail(jump.dataset.capJump);
    });
  }

  _toggleChip(chip, kind) {
    const val = kind === 'lifecycle' ? chip.dataset.capLifecycle : chip.dataset.capLayer;
    const active = chip.classList.contains('active');
    this.bodyEl.querySelectorAll(kind === 'lifecycle' ? '[data-cap-lifecycle]' : '[data-cap-layer]')
      .forEach((c) => c.classList.remove('active'));
    if (active) {
      this[kind] = null;
    } else {
      chip.classList.add('active');
      this[kind] = val;
    }
    this._renderList();
  }

  _filtered() {
    const q = this.query.trim().toLowerCase();
    return this.entries.filter((e) => {
      if (this.lifecycle && e.lifecycle_status !== this.lifecycle) return false;
      if (this.layer && e.capability_layer !== this.layer) return false;
      if (!q) return true;
      const hay = [e.name, e.definition, e.outcome, e.id, ...(e.business_object ? [e.business_object] : [])]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  _renderList() {
    const list = this._filtered();
    this.elCount.textContent = `${list.length} of ${this.entries.length} capabilities`;
    if (list.length === 0) {
      this.elList.innerHTML = '<div class="cap-empty">No capabilities match the current filters.</div>';
      return;
    }
    this.elList.innerHTML = list.map((e) => `
      <button type="button" class="cap-item" data-cap-id="${this._esc(e.id)}" role="listitem">
        <div class="cap-item-head">
          <span class="cap-item-name">${this._esc(e.name)}</span>
          <span class="cap-badge cap-badge--${this._esc(e.lifecycle_status || 'unknown')}">${this._esc(e.lifecycle_status || 'unknown')}</span>
        </div>
        <div class="cap-item-def">${this._esc(e.definition || '')}</div>
        <div class="cap-item-meta">
          <span class="cap-tag">${this._esc(e.capability_layer || '—')}</span>
          ${this._ecfLabel(e) ? `<span class="cap-tag cap-tag--ecf">${this._esc(this._ecfLabel(e))}</span>` : ''}
        </div>
      </button>
    `).join('');
  }

  _ecfLabel(e) {
    const p = e.ecf?.primary;
    return p ? `${p.domain || '—'} × ${p.stage || '—'}` : null;
  }

  _showDetail(id) {
    const e = this.byId.get(id);
    if (!e) return;
    this.selectedId = id;

    const ecf = e.ecf || {};
    const primary = ecf.primary ? `${ecf.primary.domain} × ${ecf.primary.stage}` : null;
    const secondary = (ecf.secondary || []).map((s) => `${s.domain} × ${s.stage}`);

    this.elList.innerHTML = `
      <div class="cap-detail">
        <button type="button" class="cap-back" data-cap-back>← All capabilities</button>
        <div class="cap-detail-head">
          <h3>${this._esc(e.name)}</h3>
          <span class="cap-badge cap-badge--${this._esc(e.lifecycle_status || 'unknown')}">${this._esc(e.lifecycle_status || 'unknown')}</span>
        </div>
        <div class="cap-detail-id">${this._esc(e.id)} · v${this._esc(e.version || '?')} · ${this._esc(e.capability_layer || '—')} layer</div>

        <div class="cap-section">
          <h4>Definition</h4>
          <p>${this._esc(e.definition || '—')}</p>
        </div>
        ${e.why_capability ? `
        <div class="cap-section">
          <h4>Why this capability</h4>
          <p>${this._esc(e.why_capability)}</p>
        </div>` : ''}
        ${e.outcome ? `
        <div class="cap-section">
          <h4>Outcome</h4>
          <p>${this._esc(e.outcome)}${e.business_object ? ` <span class="cap-muted">(business object: ${this._esc(e.business_object)})</span>` : ''}</p>
        </div>` : ''}
        <div class="cap-section">
          <h4>ECF coordinates</h4>
          ${primary ? `
            <p><span class="cap-tag cap-tag--ecf">${this._esc(primary)}</span> primary</p>
            ${secondary.length ? `<p class="cap-muted">secondary: ${secondary.map((s) => this._esc(s)).join(' · ')}</p>` : ''}
          ` : '<p class="cap-muted">Not yet allocated (see the coverage dashboard).</p>'}
        </div>
        ${e.boundary ? `
        <div class="cap-section">
          <h4>Boundary</h4>
          <p>${this._esc(e.boundary)}</p>
        </div>` : ''}
        ${Array.isArray(e.non_examples) && e.non_examples.length ? `
        <div class="cap-section">
          <h4>Not this capability</h4>
          <ul class="cap-ul">${e.non_examples.map((n) => `<li>${this._esc(n)}</li>`).join('')}</ul>
        </div>` : ''}
        ${Array.isArray(e.related_capabilities) && e.related_capabilities.length ? `
        <div class="cap-section">
          <h4>Related capabilities</h4>
          <div class="cap-chips">
            ${e.related_capabilities.map((r) => {
              const rel = this.byId.get(r);
              return rel ? `<button type="button" class="mm-ctx-chip" data-cap-jump="${this._esc(r)}">${this._esc(rel.name)}</button>`
                         : `<span class="mm-ctx-chip">${this._esc(r)}</span>`;
            }).join('')}
          </div>
        </div>` : ''}
        ${e.evidence ? `
        <div class="cap-section">
          <h4>Evidence</h4>
          <p class="cap-muted">${this._esc(e.evidence.rationale || '')}</p>
          ${Array.isArray(e.evidence.sources) && e.evidence.sources.length ? `<p class="cap-muted">sources: ${e.evidence.sources.map((s) => this._esc(s)).join(' · ')}</p>` : ''}
        </div>` : ''}
        ${e.metamodel_pin ? `
        <div class="cap-section">
          <h4>Metamodel pin</h4>
          <p class="cap-muted">Conformant with OpenDEAM v${this._esc(e.metamodel_pin)}</p>
        </div>` : ''}
      </div>
    `;
    this.elList.scrollTop = 0;
  }

  _esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  dispose() {
    this.selectedId = null;
  }
}
