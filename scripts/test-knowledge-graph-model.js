'use strict';

// Run with: node --test scripts/test-knowledge-graph-model.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const model = require('../assets/js/knowledge-graph-model.js');

function fixture() {
  return {
    categories: [
      { id: 'math', label: 'Mathematics' },
      { id: 'physics', label: 'Physics' },
      { id: 'quantum', label: 'Quantum' }
    ],
    nodes: [
      { id: 'a', title: 'Cálculus', category: 'math', section: 'Analysis', level: 'A-level', href: 'learn/math/calculus.html' },
      { id: 'b', title: 'Motion', category: 'physics', section: 'Mechanics', href: 'learn/physics/motion.html' },
      { id: 'c', title: 'Energy', category: 'physics', section: 'Mechanics', level: 'A-level', href: 'learn/physics/energy.html' },
      { id: 'd', title: 'Qubits', category: 'quantum', href: 'learn/quantum/qubits.html' },
      { id: 'isolated', title: 'Logic', category: 'math', href: 'learn/math/logic.html' }
    ],
    edges: [
      { source: 'a', target: 'b', type: 'required' },
      { source: 'a', target: 'c', type: 'recommended' },
      { source: 'b', target: 'c', type: 'reference' },
      { source: 'c', target: 'd', type: 'reference' }
    ]
  };
}

function options(patch = {}) {
  return Object.assign({
    categories: new Set(['math', 'physics', 'quantum']),
    types: new Set(['required', 'recommended', 'reference']),
    query: '',
    mode: 'all',
    selected: null
  }, patch);
}

function ids(nodes) {
  return nodes.map(node => node.id).sort();
}

function connections(edges) {
  return edges.map(edge => `${edge.source.id}>${edge.target.id}:${edge.type}`).sort();
}

test('graph preserves edge direction and records unique neighbors in both directions', () => {
  const data = fixture();
  data.edges.push({ source: 'b', target: 'a', type: 'reference' });
  const original = structuredClone(data);
  const graph = model.createGraph(data);
  assert.deepEqual([...graph.byId.get('a').neighbors].sort(), ['b', 'c']);
  assert.deepEqual([...graph.byId.get('b').neighbors].sort(), ['a', 'c']);
  assert.equal(graph.byId.get('a').degree, 2);
  assert.equal(graph.byId.get('a').edges.length, 3);
  assert.equal(graph.byId.get('isolated').degree, 0);
  assert.equal(graph.edges[0].source, graph.byId.get('a'));
  assert.equal(graph.edges[0].target, graph.byId.get('b'));
  assert.deepEqual(data, original, 'building the graph must not modify source data');
});

test('category filters remove crossing edges while preserving eligible isolated subjects', () => {
  const graph = model.createGraph(fixture());
  const result = model.filterGraph(graph, options({ categories: new Set(['math', 'physics']) }));
  assert.deepEqual(ids(result.nodes), ['a', 'b', 'c', 'isolated']);
  assert.deepEqual(connections(result.edges), ['a>b:required', 'a>c:recommended', 'b>c:reference']);
  const empty = model.filterGraph(graph, options({ categories: new Set() }));
  assert.equal(empty.nodes.length, 0);
  assert.equal(empty.edges.length, 0);
});

test('connection type filters preserve eligible subjects and retain only the selected edge types', () => {
  const graph = model.createGraph(fixture());
  const required = model.filterGraph(graph, options({ types: new Set(['required']) }));
  assert.deepEqual(ids(required.nodes), ['a', 'b', 'c', 'd', 'isolated']);
  assert.deepEqual(connections(required.edges), ['a>b:required']);
  const none = model.filterGraph(graph, options({ types: new Set() }));
  assert.equal(none.nodes.length, 5);
  assert.equal(none.edges.length, 0);
});

test('search is case/accent insensitive and keeps only direct connection context', () => {
  const graph = model.createGraph(fixture());
  const result = model.filterGraph(graph, options({ query: '  CALCULUS  ' }));
  assert.deepEqual([...result.matches], ['a']);
  assert.deepEqual(ids(result.subjects), ['a'], 'search list must exclude context-only subjects');
  assert.deepEqual(ids(result.nodes), ['a', 'b', 'c']);
  assert.deepEqual([...result.ids].sort(), ['a', 'b', 'c']);
  assert.deepEqual(connections(result.edges), ['a>b:required', 'a>c:recommended', 'b>c:reference']);
  assert.equal(result.ids.has('d'), false, 'context must not recursively expand to two-hop neighbors');
  assert.deepEqual(ids(model.filterGraph(graph, options({ query: 'unmatched term' })).nodes), []);
});

test('search includes section, level and category and sorts the matching subject list', () => {
  const graph = model.createGraph(fixture());
  assert.deepEqual(ids(model.filterGraph(graph, options({ query: 'analysis' })).subjects), ['a']);
  assert.deepEqual(ids(model.filterGraph(graph, options({ query: 'physics' })).subjects), ['b', 'c']);
  assert.deepEqual(model.filterGraph(graph, options({ query: 'mechanics' })).subjects.map(node => node.title), ['Energy', 'Motion']);
  assert.deepEqual(ids(model.filterGraph(graph, options({ query: 'a-level' })).subjects), ['a', 'c']);
});

test('search context respects category and connection type filters', () => {
  const graph = model.createGraph(fixture());
  const byType = model.filterGraph(graph, options({ query: 'calculus', types: new Set(['required']) }));
  assert.deepEqual(ids(byType.nodes), ['a', 'b']);
  assert.deepEqual(connections(byType.edges), ['a>b:required']);
  const byCategory = model.filterGraph(graph, options({ query: 'calculus', categories: new Set(['math']) }));
  assert.deepEqual(ids(byCategory.nodes), ['a']);
  assert.equal(byCategory.edges.length, 0);
});

test('focused view includes immediate neighbors in either direction and honors filters', () => {
  const graph = model.createGraph(fixture());
  const result = model.filterGraph(graph, options({ mode: 'focus', selected: 'b' }));
  assert.deepEqual(ids(result.nodes), ['a', 'b', 'c']);
  assert.deepEqual(connections(result.edges), ['a>b:required', 'a>c:recommended', 'b>c:reference']);
  const byType = model.filterGraph(graph, options({ mode: 'focus', selected: 'b', types: new Set(['required']) }));
  assert.deepEqual(ids(byType.nodes), ['a', 'b']);
  const byCategory = model.filterGraph(graph, options({ mode: 'focus', selected: 'b', categories: new Set(['physics']) }));
  assert.deepEqual(ids(byCategory.nodes), ['b', 'c']);
  const searched = model.filterGraph(graph, options({ mode: 'focus', selected: 'b', query: 'energy' }));
  assert.deepEqual(ids(searched.subjects), ['c']);
  assert.deepEqual(ids(searched.nodes), ['a', 'b', 'c']);
  assert.equal(searched.ids.has('d'), false, 'search context must stay within the focused neighborhood');
});

test('focused view handles isolated, unknown and filtered-out selections', () => {
  const graph = model.createGraph(fixture());
  assert.deepEqual(ids(model.filterGraph(graph, options({ mode: 'focus', selected: 'isolated' })).nodes), ['isolated']);
  assert.deepEqual(ids(model.filterGraph(graph, options({ mode: 'focus', selected: 'missing' })).nodes), []);
  assert.deepEqual(ids(model.filterGraph(graph, options({ mode: 'focus', selected: 'b', categories: new Set(['math']) })).nodes), []);
});

test('invalid graph structures, nodes, connections and unsafe destinations are rejected', () => {
  for (const data of [null, {}, { nodes: [], edges: [] }, { nodes: {}, edges: [], categories: [] }]) {
    assert.throws(() => model.createGraph(data));
  }
  const invalidChanges = [
    data => { data.nodes.push({ ...data.nodes[0] }); },
    data => { data.nodes[0].id = ''; },
    data => { data.nodes[0].title = ''; },
    data => { data.nodes[0].category = 'missing'; },
    data => { data.edges[0].source = 'missing'; },
    data => { data.edges[0].target = 'missing'; },
    data => { data.edges[0].target = data.edges[0].source; },
    data => { data.edges[0].type = 'inferred'; }
  ];
  for (const mutate of invalidChanges) {
    const data = fixture();
    mutate(data);
    assert.throws(() => model.createGraph(data));
  }
  for (const href of ['https://example.com/topic.html', 'javascript:alert(1)', '/learn/math/topic.html', 'learn/../../outside.html', 'learn/math/topic.html?redirect=1']) {
    const data = fixture();
    data.nodes[0].href = href;
    assert.throws(() => model.createGraph(data), undefined, `must reject ${href}`);
  }
});

test('layout handles coincident nodes and holds dragged nodes at their pinned coordinates', () => {
  const graph = model.createGraph(fixture());
  const layout = model.createLayout(graph);
  const a = graph.byId.get('a');
  const b = graph.byId.get('b');
  a.x = b.x = 0;
  a.y = b.y = 0;
  a.pinned = true;
  for (let i = 0; i < 30; i += 1) layout.step(0.5);
  assert.equal(a.x, 0);
  assert.equal(a.y, 0);
  assert.equal(a.vx, 0);
  assert.equal(a.vy, 0);
  for (const node of graph.nodes) {
    assert.ok([node.x, node.y, node.vx, node.vy].every(Number.isFinite));
  }
  assert.ok(Math.hypot(b.x, b.y) > 0, 'overlapping unpinned nodes should separate');
  a.pinned = false;
  layout.step(0.5);
  assert.ok(Math.hypot(a.x, a.y) > 0, 'released nodes should rejoin the simulation');
});

test('empty graph can be filtered and laid out without errors', () => {
  const graph = model.createGraph({ nodes: [], edges: [], categories: [] });
  model.createLayout(graph).step(1);
  assert.deepEqual(model.filterGraph(graph, options()).nodes, []);
});

test('generated dataset is accepted and remains finite after initial settling and animation', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../maps/knowledge-graph.json'), 'utf8'));
  const graph = model.createGraph(data);
  assert.ok(graph.nodes.length > 0);
  assert.ok(graph.edges.length > 0);
  assert.equal(graph.nodes.length, data.meta.nodeCount);
  assert.equal(graph.edges.length, data.meta.edgeCount);
  const result = model.filterGraph(graph, options({ categories: new Set(graph.categories.keys()) }));
  assert.equal(result.nodes.length, graph.nodes.length);
  assert.equal(result.edges.length, graph.edges.length);
  const layout = model.createLayout(graph);
  for (let i = 0; i < 90; i += 1) layout.step(1 - i / 120);
  for (let remaining = 180; remaining > 0; remaining -= 1) layout.step(Math.max(0.04, remaining / 180));
  for (const node of graph.nodes) {
    assert.ok([node.x, node.y, node.vx, node.vy, node.radius].every(Number.isFinite), `${node.id} must have finite layout coordinates`);
    assert.ok(Math.abs(node.x) < 10000 && Math.abs(node.y) < 10000, `${node.id} must remain within a usable viewport extent`);
  }
  assert.equal(new Set(graph.nodes.map(node => `${node.x},${node.y}`)).size, graph.nodes.length, 'subjects must not share identical final positions');
});
