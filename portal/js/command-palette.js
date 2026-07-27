// ═══════════════════════════════════════════════════════════════
// Command palette + global search + keyboard shortcuts.
// ═══════════════════════════════════════════════════════════════

export class CommandPalette {
  constructor(root, assets, opts = {}) {
    this.root = root;
    this.assets = assets;       // all searchable items
    this.onSelect = opts.onSelect || (() => {});
    this.open = false;
    this.query = '';
    this.results = [];
    this.activeIndex = 0;
    this._build();
    this._bindKeys();
  }

  _build() {
    this.root.innerHTML = `
      <div class="cmdk-backdrop" data-cmdk-close></div>
      <div class="cmdk-panel" role="dialog" aria-label="Command palette">
        <div class="cmdk-input-wrap">
          <svg class="cmdk-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="cmdk-input" id="cmdkInput" placeholder="Search the knowledge universe…" autocomplete="off" spellcheck="false" />
          <kbd class="cmdk-esc">ESC</kbd>
        </div>
        <div class="cmdk-results" id="cmdkResults" role="listbox"></div>
        <div class="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>ESC</kbd> close</span>
        </div>
      </div>
    `;
    this.elBackdrop = this.root.querySelector('[data-cmdk-close]');
    this.elInput = this.root.querySelector('#cmdkInput');
    this.elResults = this.root.querySelector('#cmdkResults');

    this.elInput.addEventListener('input', () => {
      this.query = this.elInput.value;
      this._search();
    });
    this.elInput.addEventListener('keydown', (e) => this._onKey(e));
    this.elBackdrop.addEventListener('click', () => this.close());
  }

  _bindKeys() {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl+K opens
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.open ? this.close() : this.openPalette();
      }
      // ESC closes
      if (e.key === 'Escape' && this.open) this.close();
      // "/" opens if not in input
      if (e.key === '/' && !this._isInputTarget(e.target) && !this.open) {
        e.preventDefault();
        this.openPalette();
      }
    });
  }

  _isInputTarget(t) {
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  openPalette() {
    this.open = true;
    this.root.classList.add('cmdk-open');
    this.query = '';
    this.elInput.value = '';
    this.activeIndex = 0;
    this._search();
    setTimeout(() => this.elInput.focus(), 20);
  }

  close() {
    this.open = false;
    this.root.classList.remove('cmdk-open');
  }

  _search() {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.results = this.assets.slice(0, 8);
    } else {
      this.results = this.assets
        .filter((a) => {
          const hay = (a.label + ' ' + (a.blurb || '') + ' ' + (a.name || '') + ' ' + (a.topics || []).join(' ')).toLowerCase();
          return hay.includes(q);
        })
        .slice(0, 12);
    }
    this.activeIndex = Math.min(this.activeIndex, this.results.length - 1);
    if (this.activeIndex < 0) this.activeIndex = 0;
    this._render();
  }

  _render() {
    if (this.results.length === 0) {
      this.elResults.innerHTML = `<div class="cmdk-empty">No matches in the knowledge universe.</div>`;
      return;
    }
    this.elResults.innerHTML = this.results.map((a, i) => `
      <div class="cmdk-item ${i === this.activeIndex ? 'active' : ''}" data-idx="${i}" role="option">
        <span class="cmdk-item-icon cmdk-icon-${a.icon || 'circle'}"></span>
        <div class="cmdk-item-body">
          <div class="cmdk-item-title">${this._highlight(a.label)}</div>
          <div class="cmdk-item-blurb">${this._highlight(a.blurb || a.description || '')}</div>
        </div>
        <span class="cmdk-item-kind">${a.kind || 'repo'}</span>
      </div>
    `).join('');
    this.elResults.querySelectorAll('.cmdk-item').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx, 10);
        this._select(idx);
      });
      el.addEventListener('mouseenter', () => {
        this.activeIndex = parseInt(el.dataset.idx, 10);
        this._render();
      });
    });
  }

  _highlight(text) {
    const q = this.query.trim();
    if (!q) return this._esc(text);
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return this._esc(text).replace(re, '<mark>$1</mark>');
  }

  _esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  _onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIndex = (this.activeIndex + 1) % this.results.length; this._render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex = (this.activeIndex - 1 + this.results.length) % this.results.length; this._render(); }
    else if (e.key === 'Enter') { e.preventDefault(); this._select(this.activeIndex); }
  }

  _select(idx) {
    const item = this.results[idx];
    if (item) {
      this.onSelect(item);
      this.close();
    }
  }

  updateAssets(assets) {
    this.assets = assets;
  }
}
