// ═══════════════════════════════════════════════════════════════
// TechNeHub Labs — Enterprise Knowledge Universe
// Main entry point. 5 portal cards, full-screen pop-ups, black hole
// backdrop paused when a pop-up is open.
// ═══════════════════════════════════════════════════════════════
import { BlackHoleRenderer } from './blackhole-renderer.js';
import { HUD } from './hud.js';
import { CommandPalette } from './command-palette.js';
import { MetamodelExplorer } from './metamodel-explorer.js';
import { MetaFrameworkExplorer } from './metaframework-explorer.js';
import { LayerArchitecture } from './layer-architecture.js';
import { AssessmentMaturity } from './assessment-maturity.js';
import { RepositoriesCatalog } from './repositories-catalog.js';
import { PORTAL_CARDS, fetchRepos } from './portal-data.js';

const ICONS = {
  grid: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  graph: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8 8l4 8M16 8-4 8"/></svg>',
  layers: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  archive: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/></svg>',
};

const PILL_LABELS = {
  metaframework: 'Framework',
  metamodel: 'Metamodel',
  'layer-architecture': 'Architecture',
  'assessment-maturity': 'Assessment',
  repositories: 'Catalogs',
};

const FOOTER_HINTS = {
  metaframework: '7 domains × 7 lifecycle stages — derived from a single grounding axiom',
  metamodel: '6 layers · 23 entities · 31 relationships',
  'layer-architecture': 'Expand each layer to browse its entities and canonical repos',
  'assessment-maturity': 'Assessment instruments and five-level maturity progression',
  repositories: 'Live data from GitHub — searchable and filterable by language',
};

const MILESTONE_GOALS = {
  2025: {
    year: '2025',
    phase: 'Foundation & Axiom Metamodel',
    status: 'Completed',
    statusClass: 'completed',
    repo: 'dea-metamodel',
    goals: [
      'Publish canonical 7×7 Enterprise Concept Framework matrix',
      'Establish 23 core entity schema definitions across 6 layers',
      'Release initial dea-cli & python transformation tooling'
    ]
  },
  2026: {
    year: '2026',
    phase: 'Catalogs & Service Factory',
    status: 'Active Milestone',
    statusClass: 'active',
    repo: 'dea-catalog-reference-models',
    goals: [
      'Roll out digital business service factory & reference architectures',
      'Deploy 5-level EA capability maturity assessment instrument',
      'Launch searchable cross-ecosystem catalog web viewer'
    ]
  },
  2027: {
    year: '2027',
    phase: 'Agent Foundry & Governance',
    status: 'Planned',
    statusClass: 'planned',
    repo: 'dea-catalog-agent-foundry',
    goals: [
      'Deploy autonomous agent patterns & multi-agent orchestration',
      'Automate architecture compliance & viewpoint synthesis',
      'Integrate sprint delivery archetypes into solution hub'
    ]
  },
  2028: {
    year: '2028',
    phase: 'Data Mesh & Continuous Telemetry',
    status: 'Planned',
    statusClass: 'planned',
    repo: 'dea-catalog-metrics',
    goals: [
      'Federate continuous EA metrics across multi-cloud environments',
      'AI-driven capability gap detection & topology optimization',
      'Real-time enterprise dependency streaming telemetry'
    ]
  },
  2029: {
    year: '2029',
    phase: 'Autonomous Operations',
    status: 'Target Horizon',
    statusClass: 'horizon',
    repo: 'dea-catalog-solution-hub',
    goals: [
      'Self-healing enterprise service execution guided by metamodel',
      'Level 5 Optimising maturity operational across all core domains',
      'Automated legacy tech debt detection & continuous modernization'
    ]
  },
  2030: {
    year: '2030',
    phase: 'Marathon 2030: Fully Digital Enterprise',
    status: 'Target Horizon',
    statusClass: 'horizon',
    repo: 'dea-metaframework',
    goals: [
      'Fully autonomous, resilient, self-adapting enterprise ecosystem',
      '100% telemetry coverage from Ecosystem to Measurement',
      'Open DEA framework adopted as global enterprise standard'
    ]
  }
};

const CARD_TOOLTIP_DATA = {
  metaframework: {
    repo: 'dea-metaframework',
    category: 'AXIOM MATRIX',
    title: 'Enterprise Concept Framework',
    summary: 'Single-axiom matrix modeling enterprise domain capabilities across 7 lifecycle evolution stages.',
    specs: [
      { label: 'Topology', val: '7×7 Grid (49 Nodes)' },
      { label: 'Schemas', val: 'JSON Schema • ECF Spec' },
      { label: 'Status', val: 'v3.0 Specification' },
      { label: 'Primary Repo', val: 'dea-metaframework' }
    ]
  },
  metamodel: {
    repo: 'dea-metamodel',
    category: 'GRAPH METAMODEL',
    title: 'Canonical Entity & Semantic Graph',
    summary: '23 core entity types connected via 31 explicit directional relationships across 6 architectural layers.',
    specs: [
      { label: 'Graph Size', val: '23 Entities • 31 Edges' },
      { label: 'Format', val: 'OWL/RDF • Pydantic • TS' },
      { label: 'Storage', val: 'SQLite • JSON Schemas' },
      { label: 'Primary Repo', val: 'dea-metamodel' }
    ]
  },
  'layer-architecture': {
    repo: 'dea-catalog-reference-models',
    category: 'DERA BLUEPRINT',
    title: 'Six-Layer Architectural Hierarchy',
    summary: 'Decomposes enterprise systems from top-level Value Networks down to baseline Telemetry & Measurement.',
    specs: [
      { label: 'Layers', val: 'L1 to L6 Structural Layers' },
      { label: 'Mapping', val: 'DERA & TOGAF Aligned' },
      { label: 'Components', val: 'Digital Service Factory' },
      { label: 'Primary Repo', val: 'dea-catalog-reference-models' }
    ]
  },
  'assessment-maturity': {
    repo: 'dea-catalog-assessment-tools',
    category: 'DIAGNOSTIC GRC',
    title: 'Assessment & 5-Level Maturity Framework',
    summary: 'Quantitative diagnostic instruments evaluating modernization, tech debt, SRE, and CMMI maturity levels.',
    specs: [
      { label: 'Diagnostic', val: '6 Assessment Instruments' },
      { label: 'Maturity', val: '5 Levels (Ad Hoc → Optimising)' },
      { label: 'Framework', val: 'CMMI & TOGAF Compliant' },
      { label: 'Primary Repo', val: 'dea-catalog-assessment-tools' }
    ]
  },
  repositories: {
    repo: 'dea-catalog-*',
    category: 'ECOSYSTEM CATALOG',
    title: 'Versioned Repositories & Tooling Registry',
    summary: 'Full index of open-source enterprise architecture catalogs, agent foundries, solution hubs, and cli toolsets.',
    specs: [
      { label: 'Repos', val: '14 Active Ecosystem Repos' },
      { label: 'Languages', val: 'TS • Python • YAML • Md' },
      { label: 'Sync Status', val: 'Live GitHub Telemetry' },
      { label: 'Primary Org', val: 'technehub-labs' }
    ]
  }
};

class App {
  constructor() {
    this.cards = PORTAL_CARDS;
    this.repos = [];
    this.activeModule = null;
  }

  async init() {
    this._updateCopyrightYear();
    this._buildCards();
    this._wireCards();
    this._initMarathonTimeline();

    this.hud = new HUD(document.getElementById('hud'), {
      quality: 'high',
      repoCount: this.cards.length,
    });

    this._buildSearchIndex();
    this.cmdk = new CommandPalette(document.getElementById('cmdk'), this.searchIndex, {
      onSelect: (item) => this._openCardById(item.id),
    });

    this._wireKeyboard();
    this._wirePopupClose();

    const canvas = document.getElementById('bh-canvas');
    // BlackHoleRenderer boots itself async via _boot(); no external init call needed.
    this.bh = new BlackHoleRenderer(canvas, {
      onFps: (fps) => this.hud?.setFps(fps),
    });

    this._loadRepos();
  }

  _buildCards() {
    const cluster = document.getElementById('cards-cluster') || document.getElementById('cards-layer');

    this.cards.forEach((card) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `portal-card portal-card--${card.id}`;
      el.setAttribute('aria-label', `${card.label}: ${card.blurb}`);
      el.dataset.cardId = card.id;
      el.innerHTML = `
        <div class="portal-card-card-glow"></div>
        <div class="portal-card-inner">
          <div class="portal-card-icon" tabindex="0" role="button" aria-label="${card.label} technical summary" data-card-id="${card.id}">
            ${ICONS[card.icon] || ICONS.grid}
          </div>
          <div class="portal-card-label">${card.label}</div>
          <div class="portal-card-blurb">${card.blurb}</div>
        </div>
      `;
      cluster.appendChild(el);
    });
  }

  _initMarathonTimeline() {
    const start = new Date('2025-01-01T00:00:00Z').getTime();
    const end = new Date('2030-12-31T23:59:59Z').getTime();
    const now = new Date().getTime();

    // calculate timeline progress percentage between 2025 and 2030
    const progress = Math.min(Math.max((now - start) / (end - start), 0), 1);
    const percentage = (progress * 100).toFixed(1);
    const currentYear = new Date().getFullYear();

    const progressBar = document.getElementById('timeline-progress-bar');
    const rocketMarker = document.getElementById('timeline-rocket');
    const badge = document.getElementById('timeline-progress-badge');

    let isCurrentYearMatch = false;
    document.querySelectorAll('.timeline-tick').forEach((tick) => {
      const yr = parseInt(tick.dataset.year, 10);
      if (yr < currentYear) {
        tick.classList.add('past');
        tick.classList.remove('active');
      } else if (yr === currentYear) {
        tick.classList.add('active');
        tick.classList.remove('past');
        isCurrentYearMatch = true;
      } else {
        tick.classList.remove('past', 'active');
      }
    });

    if (rocketMarker) {
      rocketMarker.style.left = `${percentage}%`;
      if (isCurrentYearMatch) {
        rocketMarker.classList.add('is-current-year');
      } else {
        rocketMarker.classList.remove('is-current-year');
      }
    }

    this._wireMilestonePopups();
  }

  _wireMilestonePopups() {
    const widget = document.getElementById('marathon-timeline');
    const popup = document.getElementById('timeline-milestone-popup');
    if (!widget || !popup) return;

    const ticks = widget.querySelectorAll('.timeline-tick');
    ticks.forEach((tick) => {
      const year = parseInt(tick.dataset.year, 10);
      const data = MILESTONE_GOALS[year];
      if (!data) return;

      const showPopup = () => {
        popup.innerHTML = `
          <div class="milestone-popup-header">
            <span class="milestone-popup-year">${data.year}</span>
            <span class="milestone-popup-badge ${data.statusClass}">${data.status}</span>
          </div>
          <div class="milestone-popup-phase">${data.phase}</div>
          <div class="milestone-popup-repo">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            technehub-labs/${data.repo}
          </div>
          <ul class="milestone-popup-goals">
            ${data.goals.map((g) => `<li class="milestone-popup-goal">${g}</li>`).join('')}
          </ul>
        `;

        // Position popup centered over the hovered tick
        const widgetRect = widget.getBoundingClientRect();
        const tickRect = tick.getBoundingClientRect();
        const tickCenter = tickRect.left - widgetRect.left + tickRect.width / 2;

        const popupWidth = 270;
        const minLeft = popupWidth / 2 + 4;
        const maxLeft = widgetRect.width - popupWidth / 2 - 4;
        const clampedLeft = Math.max(minLeft, Math.min(maxLeft, tickCenter));

        popup.style.left = `${clampedLeft}px`;
        popup.classList.add('visible');
      };

      const hidePopup = () => {
        popup.classList.remove('visible');
      };

      tick.addEventListener('mouseenter', showPopup);
      tick.addEventListener('mouseleave', hidePopup);

      tick.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        if (popup.classList.contains('visible') && popup.dataset.activeYear === String(year)) {
          hidePopup();
          popup.dataset.activeYear = '';
        } else {
          popup.dataset.activeYear = String(year);
          showPopup();
        }
      }, { passive: true });
    });

    document.addEventListener('touchstart', (e) => {
      if (!widget.contains(e.target)) {
        popup.classList.remove('visible');
      }
    });
  }

  _wireCards() {
    document.querySelectorAll('.portal-card').forEach((el) => {
      el.addEventListener('click', (e) => {
        // If click originated on or inside portal-card-icon, don't open popup
        if (e.target.closest('.portal-card-icon')) return;
        this._openCardById(el.dataset.cardId);
      });
    });
    this._wireCardIconTooltips();
  }

  _wireCardIconTooltips() {
    let tooltip = document.getElementById('card-icon-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'card-icon-tooltip';
      tooltip.className = 'card-icon-tooltip-popup';
      tooltip.setAttribute('aria-hidden', 'true');
      document.body.appendChild(tooltip);
    }

    const showTooltip = (iconEl, cardId) => {
      const data = CARD_TOOLTIP_DATA[cardId];
      if (!data) return;

      tooltip.innerHTML = `
        <div class="cit-header">
          <span class="cit-badge">${data.category}</span>
          <span class="cit-repo">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            ${data.repo}
          </span>
        </div>
        <div class="cit-title">${data.title}</div>
        <div class="cit-summary">${data.summary}</div>
        <div class="cit-grid">
          ${data.specs.map(s => `
            <div class="cit-spec-item">
              <span class="cit-spec-lbl">${s.label}</span>
              <span class="cit-spec-val">${s.val}</span>
            </div>
          `).join('')}
        </div>
      `;

      const rect = iconEl.getBoundingClientRect();
      const tooltipWidth = 290;
      const viewportWidth = window.innerWidth;

      let left = rect.left + rect.width / 2;
      const minLeft = tooltipWidth / 2 + 10;
      const maxLeft = viewportWidth - tooltipWidth / 2 - 10;
      left = Math.max(minLeft, Math.min(maxLeft, left));

      let top = rect.top - 12;
      let isBelow = false;
      if (rect.top < 210) {
        top = rect.bottom + 12;
        isBelow = true;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.classList.toggle('position-below', isBelow);
      tooltip.classList.add('visible');
    };

    const hideTooltip = () => {
      tooltip.classList.remove('visible');
    };

    document.querySelectorAll('.portal-card-icon').forEach((iconEl) => {
      const cardId = iconEl.dataset.cardId;

      iconEl.addEventListener('mouseenter', () => showTooltip(iconEl, cardId));
      iconEl.addEventListener('mouseleave', hideTooltip);
      iconEl.addEventListener('focusin', () => showTooltip(iconEl, cardId));
      iconEl.addEventListener('focusout', hideTooltip);

      iconEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tooltip.classList.contains('visible')) {
          hideTooltip();
        } else {
          showTooltip(iconEl, cardId);
        }
      });
      iconEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (tooltip.classList.contains('visible')) {
            hideTooltip();
          } else {
            showTooltip(iconEl, cardId);
          }
        }
      });
    });

    document.addEventListener('touchstart', (e) => {
      if (!e.target.closest('.portal-card-icon') && !e.target.closest('#card-icon-tooltip')) {
        hideTooltip();
      }
    });

    window.addEventListener('scroll', hideTooltip, { passive: true });
    window.addEventListener('resize', hideTooltip, { passive: true });
  }

  _openCardById(id) {
    const card = this.cards.find((c) => c.id === id);
    if (!card) return;
    this._openPopup(card);
  }

  async _openPopup(card) {
    const popup = document.getElementById('popup');
    const header = document.getElementById('popup-header');
    const body = document.getElementById('popup-body');
    const footer = document.getElementById('popup-footer');

    // pause the black hole renderer
    this.bh?.pause();

    // build header
    header.innerHTML = `
      <div class="popup-title">
        <span class="popup-pill">${PILL_LABELS[card.id] || ''}</span>
        <h2>${card.label}</h2>
      </div>
      <div class="popup-tools">
        <button class="popup-close" id="popupClose" aria-label="Close">×</button>
      </div>
    `;

    // build footer
    const currentYear = new Date().getFullYear();
    footer.innerHTML = `<span>${FOOTER_HINTS[card.id] || ''}</span><span style="display:inline-flex;gap:12px;align-items:center;"><span>©TechNe Hub ${currentYear}. All rights reserved.</span><kbd style="font-family:var(--font-mono);padding:1px 5px;background:var(--graphite);border-radius:3px;font-size:0.6rem;">ESC to close</kbd></span>`;

    // reset body classes
    body.className = 'popup-body';
    body.innerHTML = '<div style="padding:var(--sp-6);text-align:center;color:var(--text-3);">Loading…</div>';

    // dispose previous module
    if (this.activeModule?.dispose) this.activeModule.dispose();

    // load module content
    this.activeModule = await this._loadModule(card.module, body);
    if (this.activeModule?.render) await this.activeModule.render();

    // show popup
    popup.classList.add('popup-open');

    // wire close button
    document.getElementById('popupClose').addEventListener('click', () => this._closePopup());
  }

  _closePopup() {
    const popup = document.getElementById('popup');
    popup.classList.remove('popup-open');
    if (this.activeModule?.dispose) this.activeModule.dispose();
    this.activeModule = null;
    // resume the black hole renderer
    this.bh?.resume();
  }

  _wirePopupClose() {
    document.getElementById('popup-backdrop').addEventListener('click', () => this._closePopup());
  }

  async _loadModule(moduleName, body) {
    switch (moduleName) {
      case 'metaframework':
        return new MetaFrameworkExplorer(body);
      case 'metamodel':
        return new MetamodelExplorer(body);
      case 'layer-architecture':
        return new LayerArchitecture(body);
      case 'assessment-maturity':
        return new AssessmentMaturity(body);
      case 'repositories':
        return new RepositoriesCatalog(body, this.repos.length ? this.repos : await fetchRepos());
      default:
        return { render: () => { body.innerHTML = '<div style="padding:var(--sp-5);color:var(--text-3);">Unknown module.</div>'; } };
    }
  }

  _buildSearchIndex() {
    this.searchIndex = this.cards.map((c) => ({
      id: c.id, label: c.label, blurb: c.blurb, kind: 'portal', icon: 'grid',
    }));
  }

  _wireKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const popup = document.getElementById('popup');
        if (popup.classList.contains('popup-open')) this._closePopup();
      }
    });
  }

  async _loadRepos() {
    this.hud.setGithubStatus('connecting');
    this.repos = await fetchRepos();
    this.hud.setRepoCount(this.repos.length);
    this.hud.setGithubStatus(this.repos.length > 0 ? 'online' : 'offline');
    // add repos to search index
    this.searchIndex = [
      ...this.cards.map((c) => ({ id: c.id, label: c.label, blurb: c.blurb, kind: 'portal', icon: 'grid' })),
      ...this.repos.map((r) => ({
        id: 'repo-' + r.name, label: r.name, blurb: r.description,
        kind: 'repo', icon: 'archive', href: r.html_url, name: r.name, topics: r.topics,
      })),
    ];
    this.cmdk.updateAssets(this.searchIndex);
  }

  _updateCopyrightYear() {
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach((el) => {
      el.textContent = currentYear;
    });
  }
}

const app = new App();
app.init().catch((e) => console.error('Portal init failed', e));
