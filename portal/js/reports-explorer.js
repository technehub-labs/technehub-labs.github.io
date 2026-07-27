// ═══════════════════════════════════════════════════════════════
// Reports overlay — renders the architecture report.
// ═══════════════════════════════════════════════════════════════

export class ReportsExplorer {
  constructor(root) {
    this.root = root;
    this._build();
  }

  _build() {
    this.root.innerHTML = `
      <div class="overlay-backdrop" data-overlay-close></div>
      <div class="overlay-panel" role="dialog" aria-label="Reports">
        <header class="overlay-header">
          <div class="overlay-title">
            <span class="overlay-pill overlay-pill--report">Reports</span>
            <h2>Architecture Reports</h2>
          </div>
          <div class="overlay-tools">
            <a class="overlay-btn" href="https://github.com/technehub-labs/dea-metaframework/blob/main/REPORT.md" target="_blank" rel="noopener">Open on GitHub ↗</a>
            <button class="overlay-close" data-overlay-close aria-label="Close">×</button>
          </div>
        </header>
        <div class="overlay-body" id="reportsBody">
          <div class="reports-loading">Loading report…</div>
        </div>
      </div>
    `;
    this.root.querySelectorAll('[data-overlay-close]').forEach((el) => el.addEventListener('click', () => this.close()));
  }

  async open() {
    this.root.classList.add('overlay-open');
    const body = this.root.querySelector('#reportsBody');
    if (body.dataset.loaded) return;
    try {
      const resp = await fetch('../reports/REPORT.md');
      const txt = await resp.text();
      body.innerHTML = `<div class="reports-content">${this._renderMarkdown(txt)}</div>`;
      body.dataset.loaded = '1';
    } catch (e) {
      body.innerHTML = `<div class="reports-error">Could not load report. <a href="https://github.com/technehub-labs/dea-metaframework/blob/main/REPORT.md" target="_blank">Open on GitHub ↗</a></div>`;
    }
  }

  // minimal markdown renderer — headings, bold, code, lists, links
  _renderMarkdown(md) {
    let html = this._esc(md);
    // code blocks
    html = html.replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c}</code></pre>`);
    // headings
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    // bold / italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    // inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // lists
    html = html.replace(/^[-*] (.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    // paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    return html;
  }

  _esc(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  close() { this.root.classList.remove('overlay-open'); }
}
