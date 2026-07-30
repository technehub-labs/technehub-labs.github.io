// ═══════════════════════════════════════════════════════════════
// HUD — minimalist heads-up display: clock, date, GitHub status,
// repository count. The bottom-left HUD (FPS/RENDER) is hidden
// per the page layout — those values are diagnostic-only.
// Layout: top-right = clock/date, bottom-right = org/status/repos.
// ═══════════════════════════════════════════════════════════════

export class HUD {
  constructor(root, opts = {}) {
    this.root = root;
    this.fps = 0;
    this.repoCount = opts.repoCount || 0;
    this.githubStatus = 'connecting';
    this._build();
    this._startClock();
  }

  _build() {
    this.root.innerHTML = `
      <div class="hud-corner hud-tr">
        <div class="hud-clock" id="hudClock">--:--:--</div>
        <div class="hud-date" id="hudDate">—</div>
      </div>
      <div class="hud-corner hud-br">
        <div class="hud-row"><span class="hud-label">ORG</span><span class="hud-val">technehub-labs</span></div>
        <div class="hud-row"><span class="hud-label">STATUS</span><span class="hud-val" id="hudStatus"><span class="hud-dot"></span>connecting</span></div>
        <div class="hud-row"><span class="hud-label">REPOS</span><span class="hud-val" id="hudRepos">—</span></div>
      </div>
    `;
    this.elClock = this.root.querySelector('#hudClock');
    this.elDate = this.root.querySelector('#hudDate');
    this.elStatus = this.root.querySelector('#hudStatus');
    this.elRepos = this.root.querySelector('#hudRepos');
    this._updateStatic();
  }

  _updateStatic() {
    this.elRepos.textContent = this.repoCount;
  }

  _startClock() {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      this.elClock.textContent = `${hh}:${mm}:${ss}`;
      const opts = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
      this.elDate.textContent = d.toLocaleDateString(undefined, opts);
    };
    tick();
    this._clockInterval = setInterval(tick, 1000);
  }

  setFps(fps) {
    // FPS is no longer displayed in the UI but the callback is kept
    // so the renderer can still emit it (consumers may capture it).
    this.fps = fps;
  }

  setRepoCount(n) {
    this.repoCount = n;
    this._updateStatic();
  }

  setGithubStatus(status) {
    this.githubStatus = status;
    const labels = { connecting: 'connecting', online: 'online', offline: 'offline (cached)' };
    this.elStatus.innerHTML = `<span class="hud-dot hud-dot--${status}"></span>${labels[status] || status}`;
  }

  dispose() {
    clearInterval(this._clockInterval);
  }
}
