// ═══════════════════════════════════════════════════════════════
// Orbit layout — positions glass cards around the black hole centre.
// Adapts to aspect ratio / viewport: desktop orbit, ultrawide radial,
// tablet compressed, mobile carousel, portrait arcs.
// ═══════════════════════════════════════════════════════════════

export class OrbitLayout {
  constructor(container, cards, centerEl) {
    this.container = container;
    this.cards = cards;       // array of card DOM elements
    this.centerEl = centerEl; // the black hole center element
    this.selected = null;
    this.hovered = null;

    // per-card spring state: { x, y, scale, opacity, targetX, targetY, ... }
    this.state = cards.map((c, i) => ({
      el: c,
      x: 0, y: 0,
      tx: 0, ty: 0,
      scale: 1, tScale: 1,
      opacity: 1, tOpacity: 1,
      glow: 0, tGlow: 0,
      index: i,
    }));

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.vw = w; this.vh = h;
    this.aspect = w / h;
    this.isPortrait = h > w;
    this.isMobile = w < 768;
    this.isTablet = w >= 768 && w < 1024;
    this.isUltrawide = this.aspect > 2.1;
    this._computeTargets();
  }

  _computeTargets() {
    const cx = this.vw / 2, cy = this.vh / 2;
    const n = this.cards.length;
    const minDim = Math.min(this.vw, this.vh);

    // radius for card centers, relative to viewport
    let radiusX, radiusY;
    if (this.isMobile) {
      // compressed carousel — tighter ring
      radiusX = this.vw * 0.36;
      radiusY = this.vh * 0.36;
    } else if (this.isTablet) {
      radiusX = this.vw * 0.40;
      radiusY = this.vh * 0.40;
    } else if (this.isUltrawide) {
      // expanded radial constellation
      radiusX = this.vw * 0.42;
      radiusY = this.vh * 0.42;
    } else if (this.isPortrait) {
      // stacked orbital arcs
      radiusX = this.vw * 0.38;
      radiusY = this.vh * 0.38;
    } else {
      // desktop orbit
      radiusX = this.vw * 0.40;
      radiusY = this.vh * 0.40;
    }

    // keep cards from overlapping the event horizon (central region)
    const minRadius = minDim * 0.22;
    radiusX = Math.max(radiusX, minRadius);
    radiusY = Math.max(radiusY, minRadius);

    const isFirst = !this._hasComputed;
    this._hasComputed = true;

    for (let i = 0; i < n; i++) {
      const s = this.state[i];
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      s.tx = cx + Math.cos(angle) * radiusX;
      s.ty = cy + Math.sin(angle) * radiusY;
      s.baseAngle = angle;
      s.baseTx = s.tx;
      s.baseTy = s.ty;
      // snap to orbit on first compute — apply transform immediately
      if (isFirst) {
        s.x = s.tx; s.y = s.ty;
        s.el.style.transform = `translate3d(${(s.tx - this.vw/2).toFixed(1)}px, ${(s.ty - this.vh/2).toFixed(1)}px, 0) translate(-50%, -50%) scale(1)`;
        s.el.style.opacity = '1';
      }
    }
  }

  setSelected(id) {
    this.selected = id;
    this._applySelection();
  }

  _applySelection() {
    const cx = this.vw / 2, cy = this.vh / 2;
    for (const s of this.state) {
      const id = s.el.dataset.assetId;
      if (id === this.selected) {
        // foreground: move toward center-bottom, scale up
        s.tx = cx;
        s.ty = cy + Math.min(this.vh * 0.28, 220);
        s.tScale = 1.15;
        s.tOpacity = 1.0;
        s.tGlow = 1.0;
      } else if (this.selected) {
        // recede: shrink and dim, stay on orbit
        s.tx = s.baseTx;
        s.ty = s.baseTy;
        s.tScale = 0.82;
        s.tOpacity = 0.35;
        s.tGlow = 0.0;
      } else {
        s.tx = s.baseTx;
        s.ty = s.baseTy;
        s.tScale = 1.0;
        s.tOpacity = 1.0;
        s.tGlow = 0.0;
      }
    }
  }

  setHovered(id) {
    this.hovered = id;
    if (!this.selected) {
      for (const s of this.state) {
        const sid = s.el.dataset.assetId;
        if (id && sid === id) {
          s.tScale = 1.08;
          s.tGlow = 0.7;
        } else if (id) {
          s.tScale = 0.96;
          s.tGlow = 0.0;
        } else {
          s.tScale = 1.0;
          s.tGlow = 0.0;
        }
      }
    }
  }

  // spring update — call each frame
  update() {
    for (const s of this.state) {
      s.x += (s.tx - s.x) * 0.10;
      s.y += (s.ty - s.y) * 0.10;
      s.scale += (s.tScale - s.scale) * 0.12;
      s.opacity += (s.tOpacity - s.opacity) * 0.12;
      s.glow += (s.tGlow - s.glow) * 0.10;
      s.el.style.transform = `translate3d(${(s.x - this.vw/2).toFixed(1)}px, ${(s.y - this.vh/2).toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.scale.toFixed(3)})`;
      s.el.style.opacity = s.opacity.toFixed(3);
      s.el.style.setProperty('--glow', s.glow.toFixed(3));
    }
  }

  // returns array of {x,y,id} for connection-line drawing
  getCardPositions() {
    return this.state.map((s) => ({ x: s.x, y: s.y, id: s.el.dataset.assetId, glow: s.glow }));
  }

  center() { return { x: this.vw / 2, y: this.vh / 2 }; }

  dispose() {
    window.removeEventListener('resize', this._onResize);
  }
}
