// ═══════════════════════════════════════════════════════════════
// Site facts — the single source of live counts for every surface
// that used to hard-code them. Computed once from the synced
// metamodel graph (metamodel/entity-graph.json) so numbers can never
// drift from the data again. Resolves to null when the graph is
// unreachable — consumers keep their last-known strings.
// ═══════════════════════════════════════════════════════════════

let _factsPromise = null;

export function loadSiteFacts() {
  if (!_factsPromise) {
    _factsPromise = fetch('../metamodel/entity-graph.json')
      .then((r) => {
        if (!r.ok) throw new Error(`entity-graph.json HTTP ${r.status}`);
        return r.json();
      })
      .then((g) => ({
        entities: Array.isArray(g.entities) ? g.entities.length : 0,
        relationships: Array.isArray(g.relationships) ? g.relationships.length : 0,
        layers: Array.isArray(g.layers) ? g.layers.length : 0,
        version: g.metamodel_version || 'unknown',
      }))
      .catch((e) => {
        console.warn('site facts unavailable — keeping current strings', e);
        return null;
      });
  }
  return _factsPromise;
}
