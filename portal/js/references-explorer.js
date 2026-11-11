// ═══════════════════════════════════════════════════════════════
// References Explorer — renders the synced reference-registry card
// data (portal/data/references.json): counts, endpoints, licensing.
// The card tile itself is built by main.js from card_render_hint;
// this module is the popup detail.
// ═══════════════════════════════════════════════════════════════

export class ReferencesExplorer {
  constructor(bodyEl, data) {
    this.bodyEl = bodyEl;
    this.data = data;
  }

  async render() {
    const d = this.data;
    const c = d.content || {};
    const counts = c.counts || {};
    const eps = c.endpoints || {};

    const countEntries = [
      { label: 'IANA Media Types', val: counts.iana_media_types, href: eps.media_types_index, note: 'RFC 6838' },
      { label: 'IANA URI Schemes', val: counts.iana_uri_schemes, href: eps.uri_schemes_index, note: 'RFC 3986 / RFC 7595' },
      { label: 'ECF Coordinates', val: counts.ecf_cells, href: eps.ecf_index, note: '7 × 7 enumeration' },
    ];

    const endpointGroups = [
      { label: 'Registry', links: [[eps.landing, 'Landing page'], [eps.healthcheck, 'Health check']] },
      { label: 'Datasets (JSON)', links: [[eps.media_types_json, 'Media types JSON'], [eps.uri_schemes_json, 'URI schemes JSON'], [eps.ecf_coordinates_json, 'ECF coordinates JSON']] },
      { label: 'Integrity & licensing', links: [[eps.sha256sums, 'SHA256SUMS'], [eps.licensing_page, 'Licensing'], [eps.lia_doc, 'Legitimate-Interest Assessment']] },
    ];

    this.bodyEl.innerHTML = `
      <div class="ref-wrap">
        <div class="ref-header">
          <div>
            <h3 class="ref-title">${this._esc(d.title || 'Reference Registry')}</h3>
            <p class="ref-subtitle">${this._esc(d.subtitle || '')}</p>
          </div>
          <div class="ref-snapshot">snapshot<br><strong>${this._esc(d.snapshot_date || '—')}</strong></div>
        </div>

        <div class="ref-counts">
          ${countEntries.map((e) => `
            <${e.href ? `a href="${this._esc(e.href)}" target="_blank" rel="noopener"` : 'div'} class="ref-count-card">
              <span class="ref-count-val">${e.val != null ? this._esc(e.val.toLocaleString()) : '—'}</span>
              <span class="ref-count-label">${this._esc(e.label)}</span>
              <span class="ref-count-note">${this._esc(e.note)}</span>
            </${e.href ? 'a' : 'div'}>
          `).join('')}
        </div>

        <div class="cap-section">
          <h4>About this mirror</h4>
          <p>${this._esc(c.summary || '')}</p>
          <p class="cap-muted">hosting: ${this._esc(d.hosting || '—')} · source:
            ${d.source_repo ? `<a href="${this._esc(d.source_repo)}" target="_blank" rel="noopener" class="ref-link">catalog repo</a>` : '—'}
          </p>
        </div>

        ${endpointGroups.map((g) => `
          <div class="cap-section">
            <h4>${this._esc(g.label)}</h4>
            <div class="ref-links">
              ${g.links.filter(([href]) => !!href).map(([href, label]) => `
                <a class="ref-link" href="${this._esc(href)}" target="_blank" rel="noopener">
                  ${this._esc(label)}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  _esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  dispose() { /* static render */ }
}
