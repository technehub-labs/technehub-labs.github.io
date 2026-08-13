/**
 * DEA Metamodel Explorer — viewer.js
 * Fetches entity-graph.json from dea-metamodel repo,
 * renders the interactive class grid, and wires click → repo navigation.
 */
(async () => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  // Same-origin fetch: entity-graph.json is bundled into the Pages site.
  // Source of truth remains technehub-labs/dea-metamodel (synced via CI).
  const ENTITY_GRAPH_URL = './entity-graph.json';
  const DIAGRAM_SVG_URL   = './metamodel.svg';

// Relationships, layer names and layer colours are DERIVED from
  // entity-graph.json at load time (OpenDEAM v0.2.0 — the graph is generated
  // from the root model by dea-metamodel/.github/scripts/generate_entity_graph.py).
  // The constants below are fallbacks used only if the graph predates v0.2.0
  // (no layers[] / relationships[] arrays).
  let RELATIONSHIPS = [];

  let LAYER_NAMES = {
    L1: 'Ecosystem & Value Network',
    L2: 'Strategic & Governance',
    L3: 'Business Operating Model',
    L4: 'Digital & Intelligence',
    L5: 'Technology & Execution',
    DIM: 'Measurement Dimension',
  };

  let LAYER_COLORS = {
    L1: '#2dd4bf',  // Ecosystem & Value Network — teal
    L2: '#fbbf24',  // Strategic & Governance    — amber
    L3: '#38bdf8',  // Business Operating Model  — sky
    L4: '#a78bfa',  // Digital & Intelligence    — violet
    L5: '#fb7185',  // Technology & Execution    — rose
    DIM: '#9ca3af', // Measurement Dimension     — neutral gray
  };

  // ── State ───────────────────────────────────────────────
  let graph = null;
  let activeLayer = 'all';
  let activeEntity = null;
  let legendOpen = false;

  // ── Bootstrap ───────────────────────────────────────────
  const grid    = document.getElementById('entityGrid');
  const overlay = document.getElementById('relOverlay');
  const detail  = document.getElementById('detailPanel');
  const legend  = document.getElementById('legendPanel');
  const params  = Object.fromEntries(new URLSearchParams(window.location.search));

  // ── Fetch data ──────────────────────────────────────────
  try {
    const res  = await fetch(ENTITY_GRAPH_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    graph = await res.json();

    // Derive relationships + layer metadata from the graph (v0.2.0 shape).
    if (Array.isArray(graph.relationships)) {
      RELATIONSHIPS = graph.relationships.map(r => ({
        from: r.from, to: r.to,
        label: r.cardinality ? `${r.label} [${r.cardinality}]` : r.label,
        type: r.style || 'solid',
        relType: r.rel_type,
      }));
    }
    if (Array.isArray(graph.layers) && graph.layers.length) {
      LAYER_NAMES = { DIM: 'Measurement Dimension' };
      LAYER_COLORS = { DIM: '#9ca3af' };
      graph.layers.forEach(l => {
        LAYER_NAMES[l.id] = l.name;
        LAYER_COLORS[l.id] = l.color;
      });
    }
  } catch (err) {
    grid.innerHTML = `<p style="color:#ef4444;padding:24px;font-family:monospace;font-size:0.8rem;line-height:1.6">
      <strong>Failed to load entity graph.</strong><br><br>
      Error: ${err.message}<br>
      URL: <code>${ENTITY_GRAPH_URL}</code><br><br>
      Expected location: <code>technehub-labs.github.io/metamodel/entity-graph.json</code><br>
      Source of truth: <a href="https://github.com/technehub-labs/dea-metamodel/blob/main/viewer/entity-graph.json" style="color:#58a6ff;text-decoration:underline" target="_blank">dea-metamodel/viewer/entity-graph.json</a><br><br>
      If you just pushed to dea-metamodel, the hourly sync may not have run yet — try again in ~1 hour or trigger the workflow manually.
    </p>`;
    return;
  }

  // ── Render layer buttons ─────────────────────────────────
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeLayer = btn.dataset.layer;
      document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterCards();
      if (activeEntity) {
        closeDetail();
      }
      drawRelationships();
    });
  });

  // ── Diagram precursor (collapsible SVG) ──────────────────────
  const diagramSection = document.getElementById('diagramSection');
  const diagramToggle  = document.getElementById('diagramToggle');
  const diagramCanvas  = document.getElementById('diagramCanvas');

  fetch(DIAGRAM_SVG_URL)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(svgText => {
      diagramCanvas.innerHTML = svgText;
      // Wire clicks on diagram entities (PlantUML groups have data-alias).
      diagramCanvas.querySelectorAll('g.entity[data-alias]').forEach(group => {
        const alias = group.dataset.alias;
        const entity = graph.entities.find(e => e.class_alias === alias);
        if (!entity) return;
        // Make the entity group cursor:pointer.
        group.style.cursor = 'pointer';
        group.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          openDetail(entity);
          document.querySelectorAll('.entity-card').forEach(c => c.classList.remove('active'));
          const gridCard = document.querySelector(`.entity-card[data-alias="${alias}"]`);
          if (gridCard) gridCard.classList.add('active');
        });
        // Hover: brighten the layer-colored rect.
        group.addEventListener('mouseenter', () => {
          const rect = group.querySelector('rect');
          if (rect) rect.setAttribute('style',
            (rect.getAttribute('style') || '') + ';filter:brightness(1.4);');
        });
        group.addEventListener('mouseleave', () => {
          const rect = group.querySelector('rect');
          if (rect) {
            const s = (rect.getAttribute('style') || '').replace(/;?filter:[^;]+/, '');
            rect.setAttribute('style', s);
          }
        });
      });
    })
    .catch(err => {
      diagramCanvas.innerHTML = `<p style="color:#8b949e;padding:16px;font-family:monospace;font-size:0.75rem">
        Diagram unavailable: ${err.message}</p>`;
    });

  diagramToggle.addEventListener('click', () => {
    const isOpen = diagramSection.classList.toggle('open');
    diagramToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // ── Render entity cards ──────────────────────────────────
  function buildCard(entity) {
    const card = document.createElement('div');
    card.className = 'entity-card';
    // v0.2.0: dimension entities (e.g. MTR) have no home layer — bucket as DIM.
    const loc = entity.layer || 'DIM';
    card.dataset.alias   = entity.class_alias;
    card.dataset.layer    = loc;
    card.dataset.repo     = entity.catalog_repo || '';
    card.dataset.status   = entity.status;

    // Per-entity color override: if entity-graph.json provides an explicit
    // `color` field (e.g. a future non-layer colour), set --card-accent so the
    // CSS top-bar picks it up. The CSS already handles the default per-layer
    // case via .entity-card[data-layer="LN"]::before { background: var(--lN); }.
    if (entity.color) {
      card.style.setProperty('--card-accent', entity.color);
    }

    const statusLabel = entity.status === 'existing' || entity.status === 'existing-extended'
      ? 'live' : 'planned';

    card.innerHTML = `
      <div class="card-layer-tag">${loc} · ${LAYER_NAMES[loc]}</div>
      <div class="card-alias">${entity.class_alias}</div>
      <div class="card-name">${entity.display_name}</div>
      <div class="card-repo">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        <span class="card-repo-link">${entity.catalog_repo || 'catalog TBD'}</span>
      </div>
      <span class="card-status ${entity.status}">${statusLabel}</span>
    `;

    card.addEventListener('click', () => openDetail(entity));
    return card;
  }

  graph.entities.forEach(e => grid.appendChild(buildCard(e)));

  // ── Filter cards by layer ────────────────────────────────
  function filterCards() {
    document.querySelectorAll('.entity-card').forEach(card => {
      const match = activeLayer === 'all' || card.dataset.layer === activeLayer;
      card.classList.toggle('hidden-card', !match);
    });
  }

  // ── Draw SVG relationship lines ──────────────────────────
  function drawRelationships() {
    // Clear existing lines
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);

    if (activeLayer !== 'all') return;  // Only show when all layers visible

    // Collect visible card centres
    const positions = {};
    document.querySelectorAll('.entity-card:not(.hidden-card)').forEach(card => {
      positions[card.dataset.alias] = {
        x: card.offsetLeft + card.offsetWidth  / 2,
        y: card.offsetTop  + card.offsetHeight / 2,
        el: card,
      };
    });

    RELATIONSHIPS.forEach(rel => {
      const from = positions[rel.from];
      const to   = positions[rel.to];
      if (!from || !to) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.setAttribute('stroke', 'rgba(45,212,191,0.18)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', rel.type === 'dashed' ? '4 3' : 'none');

      // Find layer colour for label colour
      const entity = graph.entities.find(e => e.class_alias === rel.from);
      const color  = entity ? LAYER_COLORS[entity.layer || 'DIM'] : '#2dd4bf';

      // Optional: add arrow marker
      const markerId = `arrow-${rel.type}`;
      if (!overlay.querySelector(`#${markerId}`)) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
          <marker id="arrow-solid" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(45,212,191,0.35)" />
          </marker>
          <marker id="arrow-dashed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(45,212,191,0.2)" />
          </marker>
        `;
        overlay.insertBefore(defs, overlay.firstChild);
      }
      line.setAttribute('marker-end', `url(#arrow-${rel.type})`);

      overlay.appendChild(line);
    });
  }

  // ── Legend ──────────────────────────────────────────────
  document.getElementById('legendToggle').addEventListener('click', () => {
    legendOpen = !legendOpen;
    legend.classList.toggle('hidden', !legendOpen);
  });
  document.getElementById('legendClose').addEventListener('click', () => {
    legendOpen = false;
    legend.classList.add('hidden');
  });

  const legendBody = document.getElementById('legendBody');
  RELATIONSHIPS.forEach(rel => {
    const fromEntity = graph.entities.find(e => e.class_alias === rel.from);
    const toEntity   = graph.entities.find(e => e.class_alias === rel.to);
    if (!fromEntity || !toEntity) return;

    const item = document.createElement('div');
    item.className = 'rel-item';
    item.innerHTML = `
      <span class="rel-label">${rel.from} → ${rel.to}</span>
      <span class="rel-text">
        <strong style="color:${LAYER_COLORS[fromEntity.layer || 'DIM']}">${fromEntity.display_name}</strong>
        ${rel.label}
        <strong style="color:${LAYER_COLORS[toEntity.layer || 'DIM']}">${toEntity.display_name}</strong>
      </span>
    `;
    legendBody.appendChild(item);
  });

  // ── Detail panel ────────────────────────────────────────
  function openDetail(entity) {
    // Highlight active card
    document.querySelectorAll('.entity-card').forEach(c => c.classList.remove('active'));
    const card = document.querySelector(`.entity-card[data-alias="${entity.class_alias}"]`);
    if (card) card.classList.add('active');
    activeEntity = entity;

    // Populate detail
    const loc = entity.layer || 'DIM';
    document.getElementById('detailLayer').textContent =
      `${loc} · ${LAYER_NAMES[loc]}`;
    document.getElementById('detailLayer').style.color = LAYER_COLORS[loc];
    document.getElementById('detailName').textContent  = entity.display_name;
    document.getElementById('detailDesc').textContent = entity.description;

    const repoLink = document.getElementById('detailRepoLink');
    if (entity.repo_url) {
      repoLink.href = entity.repo_url;
      repoLink.classList.remove('disabled');
    } else {
      repoLink.removeAttribute('href');
      repoLink.classList.add('disabled');
    }
    const viewerLink = document.getElementById('detailViewerLink');
    viewerLink.href = entity.viewer_url;

    // Relationships for this entity
    const relDiv = document.getElementById('detailRelationships');
    relDiv.innerHTML = '';
    const myRels = RELATIONSHIPS.filter(r => r.from === entity.class_alias || r.to === entity.class_alias);
    if (myRels.length > 0) {
      const heading = document.createElement('div');
      heading.className = 'detail-rel-heading';
      heading.textContent = 'Relationships';
      relDiv.appendChild(heading);

      myRels.forEach(rel => {
        const other = rel.from === entity.class_alias ? rel.to : rel.from;
        const otherEntity = graph.entities.find(e => e.class_alias === other);
        const isFrom = rel.from === entity.class_alias;

        const chip = document.createElement('span');
        chip.className = 'detail-rel-chip';
        chip.innerHTML = `<strong>${rel.label}</strong> ${otherEntity ? otherEntity.display_name : other}`;
        relDiv.appendChild(chip);
      });
    }

    const statusBadge = document.getElementById('detailStatus');
    const statusText = entity.status === 'existing-extended' ? 'live (extended)' : entity.status;
    statusBadge.textContent = statusText;
    statusBadge.className = `detail-status-badge ${entity.status}`;

    detail.classList.remove('hidden');
    updateURL(entity.class_alias);
  }

  function closeDetail() {
    detail.classList.add('hidden');
    document.querySelectorAll('.entity-card').forEach(c => c.classList.remove('active'));
    activeEntity = null;
    history.replaceState(null, '', window.location.pathname);
  }

  document.getElementById('detailClose').addEventListener('click', closeDetail);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!detail.classList.contains('hidden')) closeDetail();
      if (legendOpen) { legendOpen = false; legend.classList.add('hidden'); }
    }
  });

  // ── URL param handling ──────────────────────────────────
  function updateURL(alias) {
    history.replaceState(null, '', `?entity=${alias}`);
  }

  if (params.entity) {
    const entity = graph.entities.find(e => e.class_alias === params.entity);
    if (entity) {
      // Scroll to card after layout
      requestAnimationFrame(() => {
        openDetail(entity);
        const card = document.querySelector(`.entity-card[data-alias="${params.entity}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  // ── Redraw lines on resize ──────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawRelationships, 150);
  });

  // ── Initial draw after cards are laid out ───────────────
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      drawRelationships();
    });
  });

  // ── Auto-select on URL param ─────────────────────────────
  if (!params.entity) {
    // No pre-selection — just show all, draw lines
    drawRelationships();
  }

})();
