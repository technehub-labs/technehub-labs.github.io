// ═══════════════════════════════════════════════════════════════
// Portal data — modular navigation architecture.
// Primary architectural assets + dynamic GitHub repo population.
// ═══════════════════════════════════════════════════════════════

// Static primary assets — the fixed architectural navigation objects.
// These are the "pillars" of the enterprise knowledge universe.
export const PRIMARY_ASSETS = [
  {
    id: 'welcome',
    label: 'Welcome',
    kind: 'internal',
    icon: 'home',
    blurb: 'Entry point into the TechNeHub Labs Enterprise Architecture ecosystem.',
    href: '#welcome',
    weight: 0,
  },
  {
    id: 'metaframework',
    label: 'Meta Framework',
    kind: 'overlay',
    icon: 'grid',
    blurb: 'The 7×7 axiom-derived matrix. Every enterprise described by what it does and how its work evolves.',
    href: 'https://technehub-labs.github.io/dea-metaframework/',
    overlay: 'metaframework',
    weight: 1,
  },
  {
    id: 'metamodel',
    label: 'Metamodel',
    kind: 'overlay',
    icon: 'graph',
    blurb: '23-entity relationship model across six architectural layers — ecosystem, strategy, business, digital, technology, measurement.',
    href: 'https://technehub-labs.github.io/metamodel/',
    overlay: 'metamodel',
    weight: 2,
  },
  {
    id: 'reports',
    label: 'Reports',
    kind: 'overlay',
    icon: 'document',
    blurb: 'Architecture reports and analysis across the DEA framework.',
    overlay: 'reports',
    weight: 3,
  },
  {
    id: 'system-blueprint',
    label: 'System Blueprint',
    kind: 'internal',
    icon: 'blueprint',
    blurb: 'Canonical delivery blueprint assembling all DEA framework layers into a practical adoption programme.',
    href: 'https://github.com/technehub-labs/dea-catalog-reference-architecture',
    weight: 4,
  },
  {
    id: 'architecture-repository',
    label: 'Architecture Repository',
    kind: 'internal',
    icon: 'archive',
    blurb: 'Versioned repositories of principles, patterns, standards, and reference models.',
    href: 'https://github.com/technehub-labs/dea-catalog-patterns',
    weight: 5,
  },
  {
    id: 'knowledge-catalog',
    label: 'Knowledge Catalog',
    kind: 'internal',
    icon: 'book',
    blurb: 'Structured catalogs of architectural knowledge — each versioned against the metamodel.',
    href: 'https://github.com/technehub-labs/dea-catalog-metrics',
    weight: 6,
  },
  {
    id: 'standards',
    label: 'Standards',
    kind: 'internal',
    icon: 'shield',
    blurb: 'Industry frameworks and standards governing the architecture.',
    href: 'https://github.com/technehub-labs/dea-catalog-assessment-tools',
    weight: 7,
  },
  {
    id: 'reference-models',
    label: 'Reference Models',
    kind: 'internal',
    icon: 'layers',
    blurb: 'Reference architectures at conceptual, logical, and physical abstraction levels.',
    href: 'https://github.com/technehub-labs/dea-catalog-reference-models',
    weight: 8,
  },
  {
    id: 'design-patterns',
    label: 'Design Patterns',
    kind: 'internal',
    icon: 'pattern',
    blurb: 'Reusable architecture patterns with forces, consequences, and applicability.',
    href: 'https://github.com/technehub-labs/dea-catalog-patterns',
    weight: 9,
  },
  {
    id: 'apis',
    label: 'APIs',
    kind: 'internal',
    icon: 'code',
    blurb: 'Versioned contracts exposing system functions and data products.',
    href: 'https://github.com/technehub-labs/dea-catalog-api-contracts',
    weight: 10,
  },
  {
    id: 'toolkits',
    label: 'Toolkits',
    kind: 'internal',
    icon: 'wrench',
    blurb: 'CLI, web viewer, scripts, and code generation tools for the DEA ecosystem.',
    href: 'https://github.com/technehub-labs/dea-cli',
    weight: 11,
  },
  {
    id: 'github-projects',
    label: 'GitHub Projects',
    kind: 'internal',
    icon: 'github',
    blurb: 'Active GitHub Projects tracking the full framework roadmap.',
    href: 'https://github.com/orgs/technehub-labs/projects',
    weight: 12,
  },
];

// GitHub organisation configuration
export const GITHUB_ORG = 'technehub-labs';
export const GITHUB_PAGES = 'https://technehub-labs.github.io/';

// Fallback repository list — used if the GitHub API is unreachable.
// Mirrors the repos referenced in the original site.
export const FALLBACK_REPOS = [
  { name: 'dea-metamodel', description: 'Canonical entity definitions, relationships, and schemas. JSON Schema, OWL/RDF, SQLite, TypeScript, Pydantic.', language: 'TypeScript', updated_at: '2026-07-15T10:00:00Z', topics: ['metamodel','ontology','enterprise-architecture'], html_url: 'https://github.com/technehub-labs/dea-metamodel' },
  { name: 'dea-metaframework', description: 'The Enterprise Concept Framework — 7 domains × 7 lifecycle stages, derived from a single grounding axiom.', language: 'HTML', updated_at: '2026-07-20T12:00:00Z', topics: ['framework','ecf','matrix'], html_url: 'https://github.com/technehub-labs/dea-metaframework' },
  { name: 'dea-catalog-patterns', description: 'Reusable architecture patterns: API Gateway, CQRS, Event Sourcing, Saga, Strangler Fig, and more.', language: 'Markdown', updated_at: '2026-07-10T08:00:00Z', topics: ['patterns','architecture'], html_url: 'https://github.com/technehub-labs/dea-catalog-patterns' },
  { name: 'dea-catalog-reference-models', description: 'Reference architectures: Digital Platform, Integration Hub, Data Mesh, and domain-specific models.', language: 'Markdown', updated_at: '2026-07-05T09:00:00Z', topics: ['reference-models'], html_url: 'https://github.com/technehub-labs/dea-catalog-reference-models' },
  { name: 'dea-catalog-metrics', description: 'EA KPIs and measurements: API adoption, capability maturity, technical debt, compliance metrics.', language: 'Python', updated_at: '2026-07-18T14:00:00Z', topics: ['metrics','kpi'], html_url: 'https://github.com/technehub-labs/dea-catalog-metrics' },
  { name: 'dea-catalog-reference-architecture', description: 'Digital Enterprise Reference Architecture (DERA) — canonical delivery blueprint.', language: 'Markdown', updated_at: '2026-07-12T11:00:00Z', topics: ['dera','reference-architecture'], html_url: 'https://github.com/technehub-labs/dea-catalog-reference-architecture' },
  { name: 'dea-catalog-digital-business-service-factory', description: 'Enterprise business service definitions, capability decompositions, and solution component mappings.', language: 'YAML', updated_at: '2026-07-08T10:00:00Z', topics: ['business-service','capability'], html_url: 'https://github.com/technehub-labs/dea-catalog-digital-business-service-factory' },
  { name: 'dea-catalog-agent-foundry', description: 'Autonomous agent patterns, multi-agent orchestration frameworks, and operational governance policies.', language: 'YAML', updated_at: '2026-07-14T13:00:00Z', topics: ['ai','agents','governance'], html_url: 'https://github.com/technehub-labs/dea-catalog-agent-foundry' },
  { name: 'dea-catalog-solution-hub', description: 'Solution archetypes, sprint-by-sprint delivery templates, and implementation accelerators.', language: 'YAML', updated_at: '2026-07-06T09:30:00Z', topics: ['solution','delivery'], html_url: 'https://github.com/technehub-labs/dea-catalog-solution-hub' },
  { name: 'dea-catalog-assessment-tools', description: 'Enterprise Architecture assessment instruments: modernization, technology, operations, services delivery.', language: 'JSON', updated_at: '2026-07-03T08:00:00Z', topics: ['assessment','maturity'], html_url: 'https://github.com/technehub-labs/dea-catalog-assessment-tools' },
  { name: 'dea-catalog-maturity-models', description: 'EA capability maturity models — five-level progression from Ad Hoc to Optimising.', language: 'Markdown', updated_at: '2026-07-01T07:00:00Z', topics: ['maturity','governance'], html_url: 'https://github.com/technehub-labs/dea-catalog-maturity-models' },
  { name: 'dea-cli', description: 'TypeScript CLI for the DEA ecosystem. Query catalogs, validate entries, generate viewpoints.', language: 'TypeScript', updated_at: '2026-07-19T15:00:00Z', topics: ['cli','tooling'], html_url: 'https://github.com/technehub-labs/dea-cli' },
  { name: 'dea-web-viewer', description: 'React + Vite web UI for browsing DEA catalogs and visualizing viewpoints.', language: 'TypeScript', updated_at: '2026-07-16T12:30:00Z', topics: ['web','react'], html_url: 'https://github.com/technehub-labs/dea-web-viewer' },
  { name: 'dea-scripts', description: 'Python automation: CSV ↔ SQLite ↔ YAML conversion, RDFLib validation, viewpoint generation.', language: 'Python', updated_at: '2026-07-11T10:00:00Z', topics: ['python','automation'], html_url: 'https://github.com/technehub-labs/dea-scripts' },
];

// Fetch live repo data from GitHub API. Falls back to FALLBACK_REPOS on failure.
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
    return FALLBACK_REPOS.map((r) => ({ ...r, stars: 0, forks: 0 }));
  }
}
