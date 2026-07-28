// ═══════════════════════════════════════════════════════════════
// Repositories Catalog — searchable, filterable grid of all GitHub repos.
// ═══════════════════════════════════════════════════════════════

const LANG_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Markdown: '#083fa1',
  YAML: '#cb171e',
  JSON: '#292929',
  '—': '#5c6478',
};

export class RepositoriesCatalog {
  constructor(bodyEl, repos) {
    this.bodyEl = bodyEl;
    this.repos = repos;
    this.filter = 'all';
    this.query = '';
  }

  render() {
    const languages = [...new Set(this.repos.map((r) => r.language))].sort();
    const filtered = this._filter();

    this.bodyEl.innerHTML = `
      <div class="repo-filters" id="repoFilters">
        <button class="repo-filter ${this.filter === 'all' ? 'active' : ''}" data-lang="all">All (${this.repos.length})</button>
        ${languages.map((lang) => {
          const count = this.repos.filter((r) => r.language === lang).length;
          return `<button class="repo-filter ${this.filter === lang ? 'active' : ''}" data-lang="${this._esc(lang)}">${this._esc(lang)} (${count})</button>`;
        }).join('')}
      </div>
      <div class="repo-grid" id="repoGrid">
        ${filtered.length > 0 ? filtered.map((r) => this._repoCard(r)).join('') : '<div class="repo-empty">No repositories match your filter.</div>'}
      </div>
    `;

    this._bind();
  }

  _repoCard(r) {
    const langColor = LANG_COLORS[r.language] || 'var(--cyan)';
    const topics = (r.topics || []).slice(0, 4);
    const updated = r.updated_at ? new Date(r.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    return `
      <div class="repo-card">
        <div class="repo-card-name">${this._esc(r.name)}</div>
        <div class="repo-card-desc">${this._esc(r.description || 'No description available.')}</div>
        ${topics.length > 0 ? `<div class="repo-card-topics">${topics.map((t) => `<span class="repo-card-topic">${this._esc(t)}</span>`).join('')}</div>` : ''}
        <div class="repo-card-meta">
          <span class="repo-card-lang" style="--lang-color:${langColor}">${this._esc(r.language)}</span>
          ${updated ? `<span>Updated ${updated}</span>` : ''}
          ${r.stars ? `<span>★ ${r.stars}</span>` : ''}
        </div>
        <a class="repo-card-link" href="${this._esc(r.html_url)}" target="_blank" rel="noopener">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          View on GitHub ↗
        </a>
      </div>
    `;
  }

  _filter() {
    return this.repos.filter((r) => {
      if (this.filter !== 'all' && r.language !== this.filter) return false;
      if (this.query) {
        const hay = (r.name + ' ' + r.description + ' ' + (r.topics || []).join(' ')).toLowerCase();
        if (!hay.includes(this.query)) return false;
      }
      return true;
    });
  }

  _bind() {
    this.bodyEl.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.lang;
        this.render();
      });
    });
  }

  _esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
