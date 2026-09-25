/* Shared graph calculations; also loaded by the Node validation tests. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EKKnowledgeGraph = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function createGraph(data) {
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges) || !Array.isArray(data.categories)) {
      throw new Error('Invalid graph data');
    }
    var categories = new Map(data.categories.map(function (category) { return [category.id, category]; }));
    var byId = new Map();
    var nodes = data.nodes.map(function (raw) {
      if (!raw.id || !raw.title || byId.has(raw.id) || !categories.has(raw.category) ||
          !/^(learn|calculators)\/[a-zA-Z0-9_./-]+\.html$/.test(raw.href) || raw.href.split('/').includes('..')) {
        throw new Error('Invalid subject in graph data');
      }
      var node = Object.assign({}, raw, { neighbors: new Set(), edges: [] });
      node.searchText = normalize([raw.title, raw.section, raw.level, categories.get(raw.category).label].join(' '));
      byId.set(node.id, node);
      return node;
    });
    var edges = data.edges.map(function (raw) {
      var source = byId.get(raw.source);
      var target = byId.get(raw.target);
      if (!source || !target || source === target || !['required', 'recommended', 'reference'].includes(raw.type)) {
        throw new Error('Invalid connection in graph data');
      }
      var edge = { source: source, target: target, type: raw.type };
      source.neighbors.add(target.id);
      target.neighbors.add(source.id);
      source.edges.push(edge);
      target.edges.push(edge);
      return edge;
    });
    nodes.forEach(function (node) {
      node.degree = node.neighbors.size;
      node.radius = 4 + Math.min(8, Math.sqrt(node.degree) * 1.05);
    });
    return { nodes: nodes, edges: edges, byId: byId, categories: categories };
  }

  // Search retains immediate neighbors to give each match context. All filters
  // apply to both endpoints, including in the focused view.
  function filterGraph(graph, options) {
    var eligible = new Set(graph.nodes.filter(function (node) {
      return options.categories.has(node.category);
    }).map(function (node) { return node.id; }));
    var edges = graph.edges.filter(function (edge) {
      return options.types.has(edge.type) && eligible.has(edge.source.id) && eligible.has(edge.target.id);
    });
    if (options.mode === 'focus') {
      var focus = new Set();
      if (eligible.has(options.selected)) {
        focus.add(options.selected);
        edges.forEach(function (edge) {
          if (edge.source.id === options.selected) focus.add(edge.target.id);
          if (edge.target.id === options.selected) focus.add(edge.source.id);
        });
      }
      eligible = focus;
      edges = edges.filter(function (edge) { return eligible.has(edge.source.id) && eligible.has(edge.target.id); });
    }
    var query = normalize(options.query).trim();
    var matches = new Set(graph.nodes.filter(function (node) {
      return eligible.has(node.id) && (!query || node.searchText.includes(query));
    }).map(function (node) { return node.id; }));
    var visible = new Set(matches);
    if (query) {
      edges.forEach(function (edge) {
        if (matches.has(edge.source.id)) visible.add(edge.target.id);
        if (matches.has(edge.target.id)) visible.add(edge.source.id);
      });
    }
    return {
      nodes: graph.nodes.filter(function (node) { return visible.has(node.id); }),
      edges: edges.filter(function (edge) { return visible.has(edge.source.id) && visible.has(edge.target.id); }),
      ids: visible,
      matches: matches,
      subjects: graph.nodes.filter(function (node) { return matches.has(node.id); }).sort(function (a, b) {
        return a.title.localeCompare(b.title);
      })
    };
  }

  function createLayout(graph) {
    var categoryIds = Array.from(graph.categories.keys());
    var categoryCounts = new Map();
    graph.nodes.forEach(function (node) {
      var category = categoryIds.indexOf(node.category);
      var angle = category / categoryIds.length * Math.PI * 2 - Math.PI / 2;
      var index = categoryCounts.get(node.category) || 0;
      categoryCounts.set(node.category, index + 1);
      node.anchorX = Math.cos(angle) * 210;
      node.anchorY = Math.sin(angle) * 210;
      node.x = node.anchorX + Math.cos(index * 2.399963) * Math.sqrt(index + 1) * 25;
      node.y = node.anchorY + Math.sin(index * 2.399963) * Math.sqrt(index + 1) * 25;
      node.vx = 0;
      node.vy = 0;
      node.pinned = false;
    });
    function step(alpha) {
      var nodes = graph.nodes;
      for (var i = 0; i < nodes.length; i += 1) {
        var a = nodes[i];
        for (var j = i + 1; j < nodes.length; j += 1) {
          var b = nodes[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 0.01) { dx = 0.1; dy = 0.1; distance = Math.sqrt(0.02); }
          var force = Math.min(9, 1050 / (distance * distance)) * alpha;
          var collision = Math.max(0, a.radius + b.radius + 9 - distance) * 0.09;
          var fx = dx / distance * (force + collision);
          var fy = dy / distance * (force + collision);
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      graph.edges.forEach(function (edge) {
        var a = edge.source;
        var b = edge.target;
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
        var force = (distance - 88) * 0.018 * alpha / Math.sqrt(Math.max(a.degree, b.degree, 1));
        var fx = dx / distance * force;
        var fy = dy / distance * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });
      nodes.forEach(function (node) {
        if (node.pinned) { node.vx = 0; node.vy = 0; return; }
        node.vx = (node.vx + (node.anchorX * 0.65 - node.x) * 0.0015 * alpha) * 0.78;
        node.vy = (node.vy + (node.anchorY * 0.65 - node.y) * 0.0015 * alpha) * 0.78;
        node.x += Math.max(-12, Math.min(12, node.vx));
        node.y += Math.max(-12, Math.min(12, node.vy));
      });
    }
    return { step: step };
  }

  return { createGraph: createGraph, filterGraph: filterGraph, createLayout: createLayout };
});
