// ═══════════════════════════════════════════════════════════════
// TechNeHub Labs — Enterprise Knowledge Universe
// Main application entry point. Wires together the black hole renderer,
// orbit layout, HUD, command palette, and explorer overlays.
// ═══════════════════════════════════════════════════════════════
import { BlackHoleRenderer } from './blackhole-renderer.js';
import { OrbitLayout } from './orbit-layout.js';
import { HUD } from './hud.js';
import { CommandPalette } from './command-palette.js';
import { MetamodelExplorer } from './metamodel-explorer.js';
import { MetaFrameworkExplorer } from './metaframework-explorer.js';
import { ReportsExplorer } from './reports-explorer.js';
import { PRIMARY_ASSETS, fetchRepos, GITHUB_ORG, GITHUB_PAGES } from './portal-data.js';

// ── Quality auto-detection ───────────────────────────────────────
function detectQuality() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return { quality: 'standard', webgl2: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator.deviceMemory || 4);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  // heuristics
  if (isMobile || cores <= 4 || mem <= 4) return { quality: 'standard', webgl2: true };
  if (/Apple M[3-9]|RTX 40|RTX 50|Radeon RX 7/.test(renderer)) return { quality: 'cinematic', webgl2: true };
  if (cores >= 8 && mem >= 8) return { quality: 'ultra', webgl2: true };
  if (cores >= 6) return { quality: 'high', webgl2: true };
  return { quality: 'standard', webgl2: true };
}

// ── Icon SVGs ────────────────────────────────────────────────────
const ICONS = {
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  grid: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  graph: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8 8l4 8M16 8l-4 8"/></svg>',
  document: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  blueprint: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="1"/><path d="M2 9h20M9 3v18"/></svg>',
  archive: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/></svg>',
  book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/></svg>',
  shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  layers: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  pattern: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>',
  code: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  wrench: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.515-.42-.09-1.015-.495-.015-.585.93-.105 1.605.855 1.815 1.215.945 1.59 2.535 1.14 3.165.87.09-.69.36-1.14.645-1.41-2.235-.255-4.575-1.11-4.575-4.935 0-1.095.39-1.995 1.035-2.685-.105-.255-.45-1.275.105-2.655 0 0 .855-.27 2.805 1.035.81-.225 1.695-.345 2.565-.345.87 0 1.755.12 2.565.345 1.95-1.305 2.805-1.035 2.805-1.035.555 1.38.21 2.4.105 2.655.645.69 1.035 1.59 1.035 2.685 0 3.855-2.355 4.68-4.575 4.935.36.315.675.915.675 1.845 0 1.335-.015 2.415-.015 2.745 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>',
  circle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/></svg>',
};

class App {
  constructor() {
    this.quality = detectQuality();
    this.assets = PRIMARY_ASSETS;
    this.repos = [];
    this.overlays = {};
  }

  async init() {
    // ── Synchronous setup (layout, HUD, cards) — runs before any await ──
    this._buildCards();
    this._buildConnectionLayer();

    // orbit layout — synchronous, positions cards immediately
    const cardEls = [...document.querySelectorAll('.nav-card')];
    this.orbit = new OrbitLayout(document.getElementById('orbit-layer'), cardEls, null);
    this._animateLoop();

    // HUD
    this.hud = new HUD(document.getElementById('hud'), {
      quality: this.quality.quality,
      repoCount: this.assets.length,
    });

    // command palette (synchronous)
    this._buildSearchIndex();
    this.cmdk = new CommandPalette(document.getElementById('cmdk'), this.searchIndex, {
      onSelect: (item) => this._handleSelect(item),
    });

    // wire card events (synchronous)
    this._wireCards();
    this._wireQualityControls();
    this._wireKeyboard();
    this._handleDeepLink();

    // overlays (synchronous build, lazy content)
    this.overlays.metamodel = new MetamodelExplorer(document.getElementById('overlay-metamodel'));
    this.overlays.metaframework = new MetaFrameworkExplorer(document.getElementById('overlay-metaframework'));
    this.overlays.reports = new ReportsExplorer(document.getElementById('overlay-reports'));

    // ── Async: black hole renderer + GitHub ──
    const canvas = document.getElementById('bh-canvas');
    this.bh = new BlackHoleRenderer(canvas, {
      quality: this.quality.quality,
      onFps: (fps) => this.hud?.setFps(fps),
    });
    if (!this.quality.webgl2) this._showWebGLFallback();

    // shader init is async — fire and don't await so the page is interactive immediately
    this.bh._initShaders().then(() => this.bh.render());

    // GitHub integration
    this._loadRepos();
  }

  _buildCards() {
    const layer = document.getElementById('orbit-layer');
    this.assets.forEach((a) => {
      const card = document.createElement('button');
      card.className = 'nav-card';
      card.dataset.assetId = a.id;
      card.dataset.kind = a.kind;
      card.dataset.overlay = a.overlay || '';
      card.innerHTML = `
        <div class="nav-card-glow"></div>
        <div class="nav-card-inner">
          <div class="nav-card-icon">${ICONS[a.icon] || ICONS.circle}</div>
          <div class="nav-card-label">${a.label}</div>
          <div class="nav-card-blurb">${a.blurb}</div>
        </div>
      `;
      layer.appendChild(card);
    });
  }

  _buildConnectionLayer() {
    const svg = document.getElementById('connection-svg');
    this.connSvg = svg;
  }

  _drawConnections() {
    if (!this.orbit || !this.connSvg) return;
    const center = this.orbit.center();
    const positions = this.orbit.getCardPositions();
    let paths = '';
    for (const p of positions) {
      const glow = p.glow || 0;
      if (glow < 0.01) continue;
      paths += `<line x1="${p.x}" y1="${p.y}" x2="${center.x}" y2="${center.y}" stroke="rgba(127,200,192,${(0.15 + glow * 0.4).toFixed(3)})" stroke-width="${(1 + glow * 1.5).toFixed(2)}" />`;
    }
    this.connSvg.innerHTML = paths;
    this.connSvg.setAttribute('width', window.innerWidth);
    this.connSvg.setAttribute('height', window.innerHeight);
  }

  _animateLoop() {
    const loop = () => {
      this.orbit.update();
      this._drawConnections();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _wireCards() {
    document.querySelectorAll('.nav-card').forEach((card) => {
      const id = card.dataset.assetId;
      card.addEventListener('mouseenter', () => this.orbit.setHovered(id));
      card.addEventListener('mouseleave', () => this.orbit.setHovered(null));
      card.addEventListener('click', () => {
        const asset = this.assets.find((a) => a.id === id);
        this._handleSelect(asset);
      });
      card.addEventListener('focus', () => this.orbit.setHovered(id));
      card.addEventListener('blur', () => this.orbit.setHovered(null));
    });
  }

  _handleSelect(asset) {
    if (!asset) return;
    if (asset.kind === 'overlay' && asset.overlay) {
      const overlay = this.overlays[asset.overlay];
      if (overlay) {
        overlay.open();
        this.orbit.setSelected(asset.id);
        this._pushHistory(asset.id);
        return;
      }
    }
    // internal / external link
    if (asset.href && asset.href.startsWith('#')) {
      // welcome — no-op, just select
      this.orbit.setSelected(asset.id);
      this._pushHistory(asset.id);
    } else if (asset.href) {
      window.open(asset.href, '_blank', 'noopener');
    }
  }

  _buildSearchIndex() {
    this.searchIndex = [...this.assets];
  }

  _wireQualityControls() {
    const bar = document.getElementById('quality-bar');
    if (!bar) return;
    bar.querySelectorAll('.quality-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.quality;
        this.bh.setQuality(q);
        this.hud.setQuality(q);
        bar.querySelectorAll('.quality-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  async _loadRepos() {
    this.hud.setGithubStatus('connecting');
    this.repos = await fetchRepos();
    this.hud.setRepoCount(this.repos.length);
    this.hud.setGithubStatus(this.repos.length > 0 ? 'online' : 'offline');
    // add repos to search index
    this.searchIndex = [...this.assets, ...this.repos.map((r) => ({
      id: 'repo-' + r.name,
      label: r.name,
      blurb: r.description,
      kind: 'repo',
      icon: 'github',
      href: r.html_url,
      name: r.name,
      topics: r.topics,
    }))];
    this.cmdk.updateAssets(this.searchIndex);
  }

  _wireKeyboard() {
    document.addEventListener('keydown', (e) => {
      // number keys 1-9 select primary assets
      if (e.key >= '1' && e.key <= '9' && !this.cmdk.open && !this._isInput(e.target)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < this.assets.length) this._handleSelect(this.assets[idx]);
      }
      // 0 -> 10th
      if (e.key === '0' && !this.cmdk.open && !this._isInput(e.target)) {
        if (this.assets.length >= 10) this._handleSelect(this.assets[9]);
      }
    });
  }

  _isInput(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }

  _pushHistory(id) {
    if (history.pushState) history.pushState({ asset: id }, '', '#' + id);
  }

  _handleDeepLink() {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const asset = this.assets.find((a) => a.id === hash);
      if (asset) setTimeout(() => this._handleSelect(asset), 500);
    }
    window.addEventListener('popstate', (e) => {
      const id = e.state?.asset;
      if (id) {
        const asset = this.assets.find((a) => a.id === id);
        if (asset) this._handleSelect(asset);
      }
    });
  }

  _showWebGLFallback() {
    const el = document.createElement('div');
    el.className = 'webgl-fallback';
    el.innerHTML = 'WebGL2 is not available. The black hole simulation requires WebGL2. Showing a static backdrop.';
    document.body.appendChild(el);
  }
}

// boot
const app = new App();
app.init().catch((e) => console.error('Portal init failed', e));
