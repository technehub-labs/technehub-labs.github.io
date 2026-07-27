// ═══════════════════════════════════════════════════════════════
// Meta Framework Explorer overlay — interactive 7×7 axiom-derived
// matrix. Zoom, pan, hover, search, semantic highlighting, layer
// visibility, breadcrumbs, contextual descriptions.
// ═══════════════════════════════════════════════════════════════

const DOMAINS = [
  { id: 1, name: 'Customer & Value' },
  { id: 2, name: 'Product & Offering' },
  { id: 3, name: 'Operations & Delivery' },
  { id: 4, name: 'Technology & Platform' },
  { id: 5, name: 'People & Organisation' },
  { id: 6, name: 'Finance & Capital' },
  { id: 7, name: 'Governance & Risk' },
];

const STAGES = [
  { id: 1, name: 'Conceive' },
  { id: 2, name: 'Design' },
  { id: 3, name: 'Build' },
  { id: 4, name: 'Activate' },
  { id: 5, name: 'Operate' },
  { id: 6, name: 'Improve' },
  { id: 7, name: 'Retire' },
];

// Cell content — a curated subset. The matrix is the same shape across
// industries; only the cell content changes.
const CELLS = {
  '1-1': { glyph: '●', objects: ['Strategic Objective', 'Customer Need'], actors: ['CXO', 'Product Owner'] },
  '1-2': { glyph: '★', objects: ['Value Proposition', 'Journey Map'], actors: ['UX Lead', 'Business Architect'] },
  '1-3': { glyph: '●', objects: ['MVP', 'Pilot'], actors: ['Delivery Team'] },
  '1-4': { glyph: '●', objects: ['Go-to-Market'], actors: ['Marketing', 'Sales'] },
  '1-5': { glyph: '●', objects: ['Customer Service', 'Feedback Loop'], actors: ['Support', 'CX'] },
  '1-6': { glyph: '★', objects: ['NPS', 'Churn Analysis'], actors: ['Analyst'] },
  '1-7': { glyph: '·', objects: ['Sunset Comms'], actors: ['CXO'] },
  '2-1': { glyph: '●', objects: ['Product Vision'], actors: ['Product Manager'] },
  '2-2': { glyph: '●', objects: ['Product Spec', 'Roadmap'], actors: ['Product Manager', 'Architect'] },
  '2-3': { glyph: '★', objects: ['Build Pipeline', 'Release'], actors: ['Engineering'] },
  '2-4': { glyph: '●', objects: ['Launch'], actors: ['Product', 'Marketing'] },
  '2-5': { glyph: '●', objects: ['Feature Ops'], actors: ['SRE', 'Product'] },
  '2-6': { glyph: '●', objects: ['A/B Tests', 'Telemetry'], actors: ['Data', 'Product'] },
  '2-7': { glyph: '·', objects: ['End-of-Life'], actors: ['Product'] },
  '3-1': { glyph: '·', objects: ['Ops Model Concept'], actors: ['COO'] },
  '3-2': { glyph: '●', objects: ['Process Design', 'SLA'], actors: ['Process Owner'] },
  '3-3': { glyph: '★', objects: ['Automation', 'Runbook'], actors: ['Ops Engineer'] },
  '3-4': { glyph: '●', objects: ['Service Activation'], actors: ['Ops'] },
  '3-5': { glyph: '●', objects: ['Incident Mgmt', 'Monitoring'], actors: ['SRE', 'NOC'] },
  '3-6': { glyph: '★', objects: ['Process Mining', 'Optimisation'], actors: ['Ops Analyst'] },
  '3-7': { glyph: '·', objects: ['Process Retirement'], actors: ['Ops'] },
  '4-1': { glyph: '·', objects: ['Tech Radar Entry'], actors: ['Chief Architect'] },
  '4-2': { glyph: '★', objects: ['Reference Architecture', 'Design Pattern'], actors: ['Solutions Architect'] },
  '4-3': { glyph: '★', objects: ['IaC', 'Platform Build'], actors: ['Platform Engineer'] },
  '4-4': { glyph: '●', objects: ['Deployment', 'Provisioning'], actors: ['DevOps'] },
  '4-5': { glyph: '●', objects: ['Observability', 'SRE'], actors: ['SRE'] },
  '4-6': { glyph: '●', objects: ['Tech Debt Mgmt', 'Upgrade'], actors: ['Architect'] },
  '4-7': { glyph: '·', objects: ['Decommission'], actors: ['Platform'] },
  '5-1': { glyph: '·', objects: ['Org Design Concept'], actors: ['HR', 'COO'] },
  '5-2': { glyph: '●', objects: ['Role Profiles', 'RACI'], actors: ['HR', 'Manager'] },
  '5-3': { glyph: '●', objects: ['Training', 'Onboarding'], actors: ['L&D'] },
  '5-4': { glyph: '●', objects: ['Team Activation'], actors: ['Manager'] },
  '5-5': { glyph: '●', objects: ['Performance Mgmt'], actors: ['Manager', 'HR'] },
  '5-6': { glyph: '★', objects: ['Skills Gap Analysis'], actors: ['HR', 'L&D'] },
  '5-7': { glyph: '·', objects: ['Offboarding'], actors: ['HR'] },
  '6-1': { glyph: '●', objects: ['Investment Initiative'], actors: ['CFO'] },
  '6-2': { glyph: '★', objects: ['Business Case', 'Budget Plan'], actors: ['Finance', 'PMO'] },
  '6-3': { glyph: '●', objects: ['Capital Allocation'], actors: ['Finance'] },
  '6-4': { glyph: '●', objects: ['Spend Tracking'], actors: ['Finance'] },
  '6-5': { glyph: '●', objects: ['Cost Optimisation', 'FinOps'], actors: ['Finance', 'Ops'] },
  '6-6': { glyph: '★', objects: ['ROI Analysis', 'Value Realisation'], actors: ['Finance', 'PMO'] },
  '6-7': { glyph: '·', objects: ['Asset Disposal'], actors: ['Finance'] },
  '7-1': { glyph: '●', objects: ['Policy Concept'], actors: ['CISO', 'Legal'] },
  '7-2': { glyph: '★', objects: ['Standard', 'Control Design'], actors: ['Risk', 'Compliance'] },
  '7-3': { glyph: '●', objects: ['Control Implementation'], actors: ['Security'] },
  '7-4': { glyph: '●', objects: ['Audit Prep', 'Certification'], actors: ['Audit'] },
  '7-5': { glyph: '★', objects: ['Continuous Monitoring', 'GRC'], actors: ['Risk', 'Security'] },
  '7-6': { glyph: '★', objects: ['Assessment', 'Maturity Review'], actors: ['Audit', 'Architect'] },
  '7-7': { glyph: '·', objects: ['Policy Retirement'], actors: ['Compliance'] },
};

export class MetaFrameworkExplorer {
  constructor(root) {
    this.root = root;
    this.selected = null;
    this.hovered = null;
    this.zoom = 1;
    this.panX = 0; this.panY = 0;
    this.visibleLayers = new Set([1,2,3,4,5,6,7]);
    this._build();
  }

  _build() {
    this.root.innerHTML = `
      <div class="overlay-backdrop" data-overlay-close></div>
      <div class="overlay-panel overlay-panel--wide" role="dialog" aria-label="Meta Framework Explorer">
        <header class="overlay-header">
          <div class="overlay-title">
            <span class="overlay-pill overlay-pill--framework">Meta Framework</span>
            <h2>Enterprise Concept Framework — 7×7 Matrix</h2>
          </div>
          <div class="overlay-tools">
            <div class="overlay-search"><input id="mfSearch" placeholder="Search cells…" /></div>
            <button class="overlay-btn" id="mfReset" title="Reset view">Reset</button>
            <button class="overlay-close" data-overlay-close aria-label="Close">×</button>
          </div>
        </header>
        <div class="overlay-body overlay-body--split">
          <div class="mf-canvas" id="mfCanvas">
            <div class="mf-matrix-scroll" id="mfMatrixScroll">
              <table class="mf-matrix" id="mfMatrix"></table>
            </div>
          </div>
          <aside class="mf-context" id="mfContext">
            <div class="mf-context-empty">Click any cell to inspect its objects, capabilities, and handoffs. The matrix is the same shape across industries; only the cell content changes.</div>
          </aside>
        </div>
        <footer class="overlay-footer">
          <div class="mf-layer-toggles" id="mfLayerToggles">
            ${DOMAINS.map((d) => `<button class="mf-layer-toggle active" data-domain="${d.id}">D${d.id} ${d.name}</button>`).join('')}
          </div>
          <span class="mf-hint">Scroll to zoom · drag to pan · click a cell to inspect</span>
        </footer>
      </div>
    `;
    this.elMatrix = this.root.querySelector('#mfMatrix');
    this.elContext = this.root.querySelector('#mfContext');
    this.elSearch = this.root.querySelector('#mfSearch');
    this.elScroll = this.root.querySelector('#mfMatrixScroll');
    this._renderMatrix();
    this._bind();
    this.root.querySelectorAll('[data-overlay-close]').forEach((el) => el.addEventListener('click', () => this.close()));
  }

  _renderMatrix() {
    let html = `<thead><tr><th class="mf-corner"><span>Domain ↓</span><span>Stage →</span></th>`;
    STAGES.forEach((s) => { html += `<th class="mf-stage"><span class="mf-stage-num">${s.id}</span><span class="mf-stage-name">${s.name}</span></th>`; });
    html += `</tr></thead><tbody>`;
    DOMAINS.forEach((d) => {
      html += `<tr><th class="mf-domain" data-domain="${d.id}"><span class="mf-domain-num">D${d.id}</span><span class="mf-domain-name">${d.name}</span></th>`;
      STAGES.forEach((s) => {
        const key = `${d.id}-${s.id}`;
        const cell = CELLS[key] || { glyph: '·', objects: [], actors: [] };
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

    this.root.querySelector('#mfReset')?.addEventListener('click', () => {
      this.zoom = 1; this.panX = 0; this.panY = 0; this._applyTransform();
      this.elMatrix.querySelectorAll('.mf-cell.selected').forEach((c) => c.classList.remove('selected'));
      this.selected = null;
      this.elContext.innerHTML = `<div class="mf-context-empty">Click any cell to inspect its objects, capabilities, and handoffs.</div>`;
    });

    // layer toggles
    this.root.querySelectorAll('.mf-layer-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.domain, 10);
        if (this.visibleLayers.has(id)) { this.visibleLayers.delete(id); btn.classList.remove('active'); }
        else { this.visibleLayers.add(id); btn.classList.add('active'); }
        this._applyLayerFilter();
      });
    });

    // search
    this.elSearch?.addEventListener('input', () => {
      const q = this.elSearch.value.toLowerCase();
      this.elMatrix.querySelectorAll('.mf-cell').forEach((cell) => {
        const key = cell.dataset.key;
        const data = CELLS[key];
        const hay = ((data?.objects || []) + ' ' + (data?.actors || [])).join(' ').toLowerCase();
        if (!q || hay.includes(q)) cell.style.opacity = '1';
        else cell.style.opacity = '0.3';
      });
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

  _applyLayerFilter() {
    this.elMatrix.querySelectorAll('.mf-cell').forEach((cell) => {
      const d = parseInt(cell.dataset.domain, 10);
      cell.style.display = this.visibleLayers.has(d) ? '' : 'none';
    });
    this.elMatrix.querySelectorAll('.mf-domain').forEach((th) => {
      const d = parseInt(th.dataset.domain, 10);
      th.style.display = this.visibleLayers.has(d) ? '' : 'none';
    });
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
    const data = CELLS[key] || { glyph: '·', objects: [], actors: [] };
    const domain = DOMAINS[d-1], stage = STAGES[s-1];
    this.elContext.innerHTML = `
      <div class="mf-ctx-breadcrumb">D${d} ${domain.name} / S${s} ${stage.name}</div>
      <div class="mf-ctx-header">
        <span class="mf-ctx-glyph">${data.glyph}</span>
        <h3>${domain.name} · ${stage.name}</h3>
      </div>
      <p class="mf-ctx-desc">This cell represents the intersection of the <strong>${domain.name}</strong> domain and the <strong>${stage.name}</strong> lifecycle stage. ${data.glyph === '★' ? 'This is a high-risk handoff — invest attention here.' : data.glyph === '·' ? 'This cell is currently empty and needs investigation.' : 'This cell has active objects and capabilities.'}</p>
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

  open() { this.root.classList.add('overlay-open'); }
  close() { this.root.classList.remove('overlay-open'); }
}
