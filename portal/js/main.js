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
  graph: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8 8l4 8M16 8l-4 8"/></svg>',
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

class App {
  constructor() {
    this.cards = PORTAL_CARDS;
    this.repos = [];
    this.activeModule = null;
  }

  async init() {
    this._buildCards();
    this._wireCards();

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
    this.bh = new BlackHoleRenderer(canvas, {
      quality: 'high',
      onFps: (fps) => this.hud?.setFps(fps),
    });
    this.bh._initShaders().then(() => this.bh.render());

    this._loadRepos();
  }

  _buildCards() {
    const layer = document.getElementById('cards-layer');
    this.cards.forEach((card) => {
      const el = document.createElement('button');
      el.className = `portal-card portal-card--${card.position}`;
      el.dataset.cardId = card.id;
      el.innerHTML = `
        <div class="portal-card-card-glow"></div>
        <div class="portal-card-inner">
          <div class="portal-card-icon">${ICONS[card.icon] || ICONS.grid}</div>
          <div class="portal-card-label">${card.label}</div>
          <div class="portal-card-blurb">${card.blurb}</div>
        </div>
      `;
      layer.appendChild(el);
    });
  }

  _wireCards() {
    document.querySelectorAll('.portal-card').forEach((el) => {
      el.addEventListener('click', () => this._openCardById(el.dataset.cardId));
    });
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
    footer.innerHTML = `<span>${FOOTER_HINTS[card.id] || ''}</span><span>Press <kbd style="font-family:var(--font-mono);padding:1px 5px;background:var(--graphite);border-radius:3px;font-size:0.6rem;">ESC</kbd> to close</span>`;

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
}

const app = new App();
app.init().catch((e) => console.error('Portal init failed', e));
