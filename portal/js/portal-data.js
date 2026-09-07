// ═══════════════════════════════════════════════════════════════
// Portal data — 5 portal cards with sub-content definitions.
// ═══════════════════════════════════════════════════════════════

export const PORTAL_CARDS = [
  {
    id: 'metaframework',
    label: 'Meta Framework',
    icon: 'grid',
    blurb: 'The 7×7 axiom-derived matrix — every enterprise described by what it does and how its work evolves.',
    module: 'metaframework',
    position: 'right',
  },
  {
    id: 'metamodel',
    label: 'Metamodel',
    icon: 'graph',
    blurb: '23-entity relationship model across six architectural layers — the semantic relationship graph.',
    module: 'metamodel',
    position: 'right',
  },
  {
    id: 'layer-architecture',
    label: 'Layer Architecture',
    icon: 'layers',
    blurb: 'The six-layer architectural breakdown — from Ecosystem & Value Network to Measurement.',
    module: 'layer-architecture',
    position: 'right',
  },
  {
    id: 'assessment-maturity',
    label: 'Assessment & Maturity',
    icon: 'shield',
    blurb: 'Assessment instruments and five-level maturity models — from Ad Hoc to Optimising.',
    module: 'assessment-maturity',
    position: 'bottom',
  },
  {
    id: 'repositories',
    label: 'Repositories & Catalogs',
    icon: 'archive',
    blurb: 'All versioned catalogs, repos, and tooling across the DEA ecosystem — searchable and filterable.',
    module: 'repositories',
    position: 'bottom',
  },
];

export const GITHUB_ORG = 'technehub-labs';

/**
 * Repo name → latest release cache. Hydrated by `loadReleases()` from
 * the GitHub Releases API at portal boot. Each entry has shape:
 *   { tag_name, name, published_at, html_url }
 * or `null` when the repo exists but has no published release yet.
 */
let _RELEASE_CACHE = null;
const RELEASE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RELEASE_STORAGE_KEY = 'th_portal_releases';

/**
 * Fetch the latest release for each named repo in parallel, with localStorage
 * cache. Falls back to empty/null on any API failure (e.g. CORS, rate limit).
 *
 * @param {string[]} names — repo names (without org prefix)
 * @returns {Promise<Record<string, object|null>>}
 */
export async function loadReleases(names) {
  if (_RELEASE_CACHE) return _RELEASE_CACHE;
  const cached = readReleaseCache();
  if (cached) { _RELEASE_CACHE = cached; return cached; }

  const entries = await Promise.all(names.map(async (name) => {
    const url = `https://api.github.com/repos/${GITHUB_ORG}/${name}/releases/latest`;
    try {
      const resp = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
      if (resp.status === 404) return [name, null];      // no releases yet
      if (!resp.ok)             return [name, null];      // transient failure
      const release = await resp.json();
      return [name, {
        tag_name: release.tag_name,
        name: release.name || release.tag_name,
        published_at: release.published_at,
        html_url: release.html_url || `https://github.com/${GITHUB_ORG}/${name}/releases`,
      }];
    } catch (_e) {
      return [name, null];
    }
  }));

  const map = Object.fromEntries(entries);
  _RELEASE_CACHE = map;
  writeReleaseCache(map);
  return map;
}

function readReleaseCache() {
  try {
    const raw = localStorage.getItem(RELEASE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.at || !parsed?.value) return null;
    if (Date.now() - parsed.at > RELEASE_CACHE_TTL_MS) return null;
    return parsed.value;
  } catch (_e) { return null; }
}

function writeReleaseCache(value) {
  try { localStorage.setItem(RELEASE_STORAGE_KEY, JSON.stringify({ at: Date.now(), value })); }
  catch (_e) { /* localStorage may be disabled — skip */ }
}

export const FALLBACK_REPOS = [
  { name: 'dea-metamodel', description: 'Canonical entity definitions, relationships, and schemas. JSON Schema, OWL/RDF, SQLite, TypeScript, Pydantic.', language: 'TypeScript', updated_at: '2026-07-15T10:00:00Z', topics: ['metamodel','ontology','enterprise-architecture'], html_url: 'https://github.com/technehub-labs/dea-metamodel', stars: 0, forks: 0 },
  { name: 'dea-metaframework', description: 'The Enterprise Concept Framework — 7 domains × 7 lifecycle stages, derived from a single grounding axiom.', language: 'HTML', updated_at: '2026-07-20T12:00:00Z', topics: ['framework','ecf','matrix'], html_url: 'https://github.com/technehub-labs/dea-metaframework', stars: 0, forks: 0 },
  { name: 'dea-catalog-patterns', description: 'Reusable architecture patterns: API Gateway, CQRS, Event Sourcing, Saga, Strangler Fig, and more.', language: 'Markdown', updated_at: '2026-07-10T08:00:00Z', topics: ['patterns','architecture'], html_url: 'https://github.com/technehub-labs/dea-catalog-patterns', stars: 0, forks: 0 },
  { name: 'dea-catalog-reference-models', description: 'Reference architectures: Digital Platform, Integration Hub, Data Mesh, and domain-specific models.', language: 'Markdown', updated_at: '2026-07-05T09:00:00Z', topics: ['reference-models'], html_url: 'https://github.com/technehub-labs/dea-catalog-reference-models', stars: 0, forks: 0 },
  { name: 'dea-catalog-metrics', description: 'EA KPIs and measurements: API adoption, capability maturity, technical debt, compliance metrics.', language: 'Python', updated_at: '2026-07-18T14:00:00Z', topics: ['metrics','kpi'], html_url: 'https://github.com/technehub-labs/dea-catalog-metrics', stars: 0, forks: 0 },
  { name: 'dea-catalog-reference-architecture', description: 'Digital Enterprise Reference Architecture (DERA) — canonical delivery blueprint.', language: 'Markdown', updated_at: '2026-07-12T11:00:00Z', topics: ['dera','reference-architecture'], html_url: 'https://github.com/technehub-labs/dea-catalog-reference-architecture', stars: 0, forks: 0 },
  { name: 'dea-catalog-digital-business-service-factory', description: 'Enterprise business service definitions, capability decompositions, and solution component mappings.', language: 'YAML', updated_at: '2026-07-08T10:00:00Z', topics: ['business-service','capability'], html_url: 'https://github.com/technehub-labs/dea-catalog-digital-business-service-factory', stars: 0, forks: 0 },
  { name: 'dea-catalog-agent-foundry', description: 'Autonomous agent patterns, multi-agent orchestration frameworks, and operational governance policies.', language: 'YAML', updated_at: '2026-07-14T13:00:00Z', topics: ['ai','agents','governance'], html_url: 'https://github.com/technehub-labs/dea-catalog-agent-foundry', stars: 0, forks: 0 },
  { name: 'dea-catalog-solution-hub', description: 'Solution archetypes, sprint-by-sprint delivery templates, and implementation accelerators.', language: 'YAML', updated_at: '2026-07-06T09:30:00Z', topics: ['solution','delivery'], html_url: 'https://github.com/technehub-labs/dea-catalog-solution-hub', stars: 0, forks: 0 },
  { name: 'dea-catalog-assessment-tools', description: 'Enterprise Architecture assessment instruments: modernization, technology, operations, services delivery.', language: 'JSON', updated_at: '2026-07-03T08:00:00Z', topics: ['assessment','maturity'], html_url: 'https://github.com/technehub-labs/dea-catalog-assessment-tools', stars: 0, forks: 0 },
  { name: 'dea-catalog-maturity-models', description: 'EA capability maturity models — five-level progression from Ad Hoc to Optimising.', language: 'Markdown', updated_at: '2026-07-01T07:00:00Z', topics: ['maturity','governance'], html_url: 'https://github.com/technehub-labs/dea-catalog-maturity-models', stars: 0, forks: 0 },
  { name: 'dea-cli', description: 'TypeScript CLI for the DEA ecosystem. Query catalogs, validate entries, generate viewpoints.', language: 'TypeScript', updated_at: '2026-07-19T15:00:00Z', topics: ['cli','tooling'], html_url: 'https://github.com/technehub-labs/dea-cli', stars: 0, forks: 0 },
  { name: 'dea-web-viewer', description: 'React + Vite web UI for browsing DEA catalogs and visualizing viewpoints.', language: 'TypeScript', updated_at: '2026-07-16T12:30:00Z', topics: ['web','react'], html_url: 'https://github.com/technehub-labs/dea-web-viewer', stars: 0, forks: 0 },
  { name: 'dea-scripts', description: 'Python automation: CSV ↔ SQLite ↔ YAML conversion, RDFLib validation, viewpoint generation.', language: 'Python', updated_at: '2026-07-11T10:00:00Z', topics: ['python','automation'], html_url: 'https://github.com/technehub-labs/dea-scripts', stars: 0, forks: 0 },
];

export async function fetchRepos() {
  try {
    const resp = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=100&sort=updated`);
    if (!resp.ok) throw new Error('GitHub API error');
    const repos = await resp.json();
    if (!Array.isArray(repos) || repos.length === 0) throw new Error('No repos');
    return repos.map((r) => ({
      name: r.name,
      description: r.description || '',
      language: r.language || '—',
      updated_at: r.updated_at,
      topics: r.topics || [],
      html_url: r.html_url,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
    }));
  } catch (e) {
    console.warn('GitHub API unavailable, using fallback repos', e);
    return FALLBACK_REPOS;
  }
}
