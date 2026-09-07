// ═══════════════════════════════════════════════════════════════
// Meta Framework Explorer — renders into a provided body element.
// Interactive 7×7 axiom-derived matrix with zoom, pan, and a
// contextual detail panel.
//
// Data source: ./data/ecf-matrix.json — fetched same-origin from the
// portal page. Synced from technehub-labs/dea-metaframework on every
// release via sync-metaframework.yml (canonical source-of-truth =
// pages/assets/matrix-data.json). Embedded fallback keeps the matrix
// axes renderable if the fetch fails (offline, partial deploy).
//
// Shape consumed:
//   {
//     domains:  [{id, key, name, shortName, color}],     // 7
//     stages:   [{id, key, name, fullName}],             // 7
//     scenarios: { foundation: {name, description, cells},
//                  telecom:    {…}, digital: {…} },
//     cells:    { "{domain.key}.{stage.key}": { text, glyph, actors[], metamodelEntities[] } }   // 49
//   }
// ═══════════════════════════════════════════════════════════════

const MATRIX_DATA_URL = '../data/ecf-matrix.json';

// Axes-only fallback (no cell content). Matches the canonical v2.3.0+
// domain set. Used when the JSON cannot be fetched.
const FALLBACK_DOMAINS = [
  { id: 1, name: 'Governance & Existence',  shortName: 'Governance' },
  { id: 2, name: 'Strategy & Direction',    shortName: 'Strategy' },
  { id: 3, name: 'Agency & Organization',   shortName: 'Agency' },
  { id: 4, name: 'Party & Relationship',    shortName: 'Party' },
  { id: 5, name: 'Product & Value',         shortName: 'Product' },
  { id: 6, name: 'Operations & Enablement', shortName: 'Operations' },
  { id: 7, name: 'Finance & Accounting',    shortName: 'Finance' },
];
const FALLBACK_STAGES = [
  { id: 1, name: 'Conceive' },
  { id: 2, name: 'Design' },
  { id: 3, name: 'Build' },
  { id: 4, name: 'Activate' },
  { id: 5, name: 'Operate' },
  { id: 6, name: 'Improve' },
  { id: 7, name: 'Retire' },
];

/**
 * Convert the canonical cell payload
 *   { text, glyph, actors: ['platform-engineering'], metamodelEntities: ['Platform Service'] }
 * into the flat shape this renderer's existing markup expects
 *   { glyph, objects: [metamodelEntities], actors: [actors] }
 * (the legacy "objects" field used by the older hardcoded matrix).
 *
 * Either field can be missing — returns safe defaults.
 */
function normalizeCell(c) {
  const glyph = c?.glyph || '·';
  const actors = Array.isArray(c?.actors) ? c.actors : [];
  const objects = Array.isArray(c?.metamodelEntities) ? c.metamodelEntities
                : Array.isArray(c?.objects)            ? c.objects
                : [];
  return { glyph, actors, objects, text: c?.text || '' };
}

/**
 * Fetch the canonical ECF matrix JSON. Falls back to axes-only on any
 * failure (network, parse, schema mismatch). Always resolves.
 */
async function loadMatrixData() {
  try {
    const resp = await fetch(MATRIX_DATA_URL, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data.domains) || data.domains.length !== 7) throw new Error('domains shape');
    if (!Array.isArray(data.stages)  || data.stages.length  !== 7) throw new Error('stages shape');
    if (!data.scenarios || typeof data.scenarios !== 'object')     throw new Error('scenarios shape');
    return data;
  } catch (e) {
    console.warn('[metaframework-explorer] ecf-matrix.json unavailable, using axes-only fallback:', e);
    return {
      domains: FALLBACK_DOMAINS,
      stages:  FALLBACK_STAGES,
      scenarios: {
        foundation: { name: 'Foundation', description: 'Canonical ECF cells (data unavailable offline).', cells: {} },
        telecom:    { name: 'Telecom',    description: 'Telecom scenario (data unavailable offline).',    cells: {} },
        digital:    { name: 'Digital Services', description: 'Digital services scenario (data unavailable offline).', cells: {} },
      },
    };
  }
}

/**
 * Build the portal's flat key-indexed CELLS map (`{1}-{1}` → cell) for a
 * given scenario, normalised from the canonical domain.key/stage.key map.
 */
function buildCellsMap(scenario) {
  const out = {};
  const cells = scenario?.cells || {};
  for (const [composite, cell] of Object.entries(cells)) {
    const [domainKey, stageKey] = composite.split('.');
    const dIdx = this.domains.findIndex((d) => d.key === domainKey);
    const sIdx = this.stages.findIndex((s) => s.key === stageKey);
    if (dIdx < 0 || sIdx < 0) continue;
    const flatKey = `${dIdx + 1}-${sIdx + 1}`;
    out[flatKey] = normalizeCell(cell);
  }
  return out;
}

export class MetaFrameworkExplorer {
  constructor(bodyEl) {
    this.bodyEl = bodyEl;
    this.selected = null;
    this.hovered = null;
    this.zoom = 1;
    this.panX = 0; this.panY = 0;
    this.visibleLayers = new Set([1,2,3,4,5,6,7]);
    this._ready = this._init();
  }

  async _init() {
    this._data = await loadMatrixData();
    this.domains  = this._data.domains;
    this.stages   = this._data.stages;
    this.scenarios = this._data.scenarios;
    // Default scenario is foundation (matches standalone page behaviour).
    this.activeScenario = 'foundation';
    this.CELLS = this._cellsForScenario(this.activeScenario);
    this.SCENARIO_META = Object.fromEntries(
      Object.entries(this.scenarios).map(([k, s]) => [k, { name: s.name, description: s.description }])
    );
  }

  _cellsForScenario(name) {
    return buildCellsMap.call(this, this.scenarios[name]);
  }

  render() {
    if (this._ready) {
      // Async — fetch is already running. Await it before drawing so we
      // never render before the JSON is loaded (or the fallback is in place).
      return this._ready.then(() => this._render());
    }
    // _ready was already resolved (re-entrant call from a re-render).
    this._render();
  }

  _render() {
    this.bodyEl.classList.add('popup-body--split');
    this.bodyEl.innerHTML = `
      <div class="mf-canvas" id="mfCanvas">
        <div class="mf-matrix-scroll" id="mfMatrixScroll">
          <table class="mf-matrix" id="mfMatrix"></table>
        </div>
      </div>
      <aside class="mf-context" id="mfContext">
        <div class="mf-context-empty">Click any cell to inspect its objects, capabilities, and handoffs. The matrix is the same shape across industries; only the cell content changes.</div>
      </aside>
    `;
    this.elMatrix = this.bodyEl.querySelector('#mfMatrix');
    this.elContext = this.bodyEl.querySelector('#mfContext');
    this.elScroll = this.bodyEl.querySelector('#mfMatrixScroll');
    this._renderMatrix();
    this._bind();
  }

  _renderMatrix() {
    let html = `<thead><tr><th class="mf-corner"><span>Domain ↓</span><span>Stage →</span></th>`;
    this.stages.forEach((s) => { html += `<th class="mf-stage"><span class="mf-stage-num">${s.id}</span><span class="mf-stage-name">${s.name}</span></th>`; });
    html += `</tr></thead><tbody>`;
    this.domains.forEach((d) => {
      html += `<tr><th class="mf-domain" data-domain="${d.id}"><span class="mf-domain-num">D${d.id}</span><span class="mf-domain-name">${d.shortName || d.name}</span></th>`;
      this.stages.forEach((s) => {
        const key = `${d.id}-${s.id}`;
        const cell = this.CELLS[key] || { glyph: '·', objects: [], actors: [] };
        const active = cell.objects.length > 0;
        const risky = cell.glyph === '★';
        html += `<td class="mf-cell ${active ? 'active' : ''} ${risky ? 'risky' : ''}" data-key="${key}" data-domain="${d.id}">
          <span class="mf-glyph">${cell.glyph}</span>
          <span class="mf-cell-count">${cell.objects.length}</span>
        </td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody>`;
    this.elMatrix.innerHTML = html;
  }

  _bind() {
    this.elMatrix.querySelectorAll('.mf-cell').forEach((cell) => {
      cell.addEventListener('click', () => this._selectCell(cell));
      cell.addEventListener('mouseenter', () => this._hoverCell(cell));
      cell.addEventListener('mouseleave', () => this._clearHover());
    });

    // pan & zoom
    let dragging = false, lx = 0, ly = 0;
    this.elScroll.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.mf-cell')) return;
      dragging = true; lx = e.clientX; ly = e.clientY;
      this.elScroll.setPointerCapture(e.pointerId);
    });
    this.elScroll.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.panX += e.clientX - lx; this.panY += e.clientY - ly;
      lx = e.clientX; ly = e.clientY; this._applyTransform();
    });
    const end = (e) => { dragging = false; if (this.elScroll.hasPointerCapture(e.pointerId)) this.elScroll.releasePointerCapture(e.pointerId); };
    this.elScroll.addEventListener('pointerup', end);
    this.elScroll.addEventListener('pointercancel', end);
    this.elScroll.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.5, Math.min(2.5, this.zoom * (1 - e.deltaY * 0.001)));
      this._applyTransform();
    }, { passive: false });
  }

  _applyTransform() {
    this.elMatrix.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  _hoverCell(cell) {
    if (this.selected) return;
    this.elMatrix.querySelectorAll('.mf-cell.hover').forEach((c) => c.classList.remove('hover'));
    cell.classList.add('hover');
  }

  _clearHover() {
    if (this.selected) return;
    this.elMatrix.querySelectorAll('.mf-cell.hover').forEach((c) => c.classList.remove('hover'));
  }

  _selectCell(cell) {
    this.elMatrix.querySelectorAll('.mf-cell.selected').forEach((c) => c.classList.remove('selected'));
    cell.classList.add('selected');
    const key = cell.dataset.key;
    this.selected = key;
    const [d, s] = key.split('-').map(Number);
    const data = this.CELLS[key] || { glyph: '·', objects: [], actors: [], text: '' };
    const domain = this.domains[d-1], stage = this.stages[s-1];
    this.elContext.innerHTML = `
      <div class="mf-ctx-breadcrumb">D${d} ${domain.name} / S${s} ${stage.name}</div>
      <div class="mf-ctx-header">
        <span class="mf-ctx-glyph">${data.glyph}</span>
        <h3>${domain.name} · ${stage.name}</h3>
      </div>
      ${data.text ? `<p class="mf-ctx-desc">${data.text}</p>` : `<p class="mf-ctx-desc">This cell represents the intersection of the <strong>${domain.name}</strong> domain and the <strong>${stage.name}</strong> lifecycle stage. ${data.glyph === '★' ? 'This is a high-risk handoff — invest attention here.' : data.glyph === '·' ? 'This cell is currently empty and needs investigation.' : 'This cell has active objects and capabilities.'}</p>`}
      <div class="mf-ctx-section">
        <h4>Objects (${data.objects.length})</h4>
        <div class="mf-ctx-chips">${data.objects.map((o) => `<span class="mf-ctx-chip">${o}</span>`).join('')}</div>
      </div>
      <div class="mf-ctx-section">
        <h4>Capability Actors (${data.actors.length})</h4>
        <div class="mf-ctx-chips">${data.actors.map((a) => `<span class="mf-ctx-chip mf-ctx-chip--actor">${a}</span>`).join('')}</div>
      </div>
      <div class="mf-ctx-section">
        <h4>Linked Metamodel Entities</h4>
        <p class="mf-ctx-meta">Every cell corresponds to a <strong>Business Capability</strong> in the DEA Metamodel, carrying <code>ecfCoordinates: (Domain, Stage)</code>.</p>
      </div>
      <div class="mf-ctx-actions">
        <a class="mf-ctx-link" href="https://github.com/technehub-labs/dea-metaframework/blob/main/REPORT.md" target="_blank" rel="noopener">Framework report (REPORT.md)</a>
        <a class="mf-ctx-link secondary" href="https://technehub-labs.github.io/metamodel/" target="_blank" rel="noopener">Metamodel Explorer</a>
      </div>
    `;
  }

  dispose() {
    this.selected = null;
  }
}