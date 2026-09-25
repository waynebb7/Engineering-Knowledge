(function () {
  'use strict';

  var model = window.EKKnowledgeGraph;
  var canvas = document.getElementById('graph-canvas');
  if (!canvas || !model) return;
  var context = canvas.getContext('2d');
  var stage = document.getElementById('graph-stage');
  var search = document.getElementById('graph-search');
  var mode = document.getElementById('graph-mode');
  var status = document.getElementById('graph-status');
  var tooltip = document.getElementById('graph-tooltip');
  var categoryFilters = document.getElementById('graph-category-filters');
  var typeFilters = document.getElementById('graph-link-filters');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var graph = null;
  var layout = null;
  var view = null;
  var selected = null;
  var hovered = null;
  var highlighted = new Set();
  var width = 1;
  var height = 1;
  var ratio = 1;
  var camera = { x: 0, y: 0, scale: 1 };
  var colors = new Map();
  var palette = ['#73c9ff', '#ffc971', '#ba9bff', '#66e0b5'];
  var knownColors = { math: palette[0], physics: palette[1], quantum: palette[2], 'digital-logic': palette[3] };
  var paused = reducedMotion.matches;
  var framesRemaining = 0;
  var frameRequested = false;
  var autoFit = true;
  var drag = null;
  var pointers = new Map();
  var pinch = null;
  var searchTimer = null;

  function el(id) { return document.getElementById(id); }
  function text(id, value) { el(id).textContent = value; }
  function checked(container) {
    return new Set(Array.from(container.querySelectorAll('input:checked')).map(function (input) { return input.value; }));
  }
  function options() {
    return { categories: checked(categoryFilters), types: checked(typeFilters), query: search.value, mode: mode.value, selected: selected };
  }
  function categoryLabel(node) { return graph.categories.get(node.category).label; }
  function color(node) { return colors.get(node.category); }
  function dot(node) {
    var span = document.createElement('span');
    span.className = 'kg-category-dot';
    span.style.backgroundColor = color(node);
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
  function synchronizeUrl() {
    var url = new URL(window.location.href);
    if (selected) url.searchParams.set('node', selected);
    else url.searchParams.delete('node');
    if (mode.value === 'focus') url.searchParams.set('view', 'focus');
    else url.searchParams.delete('view');
    window.history.replaceState(null, '', url.href);
  }
  function updatePauseButton() {
    text('graph-pause', paused ? 'Resume layout' : 'Pause layout');
    el('graph-pause').setAttribute('aria-pressed', String(paused));
  }
  function announce() {
    var description = view.nodes.length + ' subjects and ' + view.edges.length + ' connections shown.';
    if (search.value.trim()) description += ' ' + view.matches.size + ' search matches, with their immediate connections.';
    if (mode.value === 'focus' && selected) description += ' Focused on ' + graph.byId.get(selected).title + '.';
    if (!context) description += ' Visual graph unavailable; use the subject list to explore connections.';
    status.textContent = description;
  }
  function updateView(fit) {
    if (!graph) return;
    view = model.filterGraph(graph, options());
    hovered = null;
    tooltip.hidden = true;
    text('graph-node-count', view.nodes.length);
    text('graph-edge-count', view.edges.length);
    text('graph-list-count', view.subjects.length);
    el('graph-empty').hidden = view.nodes.length > 0;
    renderSubjects();
    renderSelection();
    if (fit) fitGraph();
    announce();
    requestFrame();
  }
  function subjectButton(node, label) {
    var button = document.createElement('button');
    button.type = 'button';
    button.appendChild(dot(node));
    var title = document.createElement('span');
    title.textContent = node.title;
    button.appendChild(title);
    button.dataset.nodeId = node.id;
    button.setAttribute('aria-pressed', String(node.id === selected));
    button.setAttribute('aria-label', label || node.title + ', ' + categoryLabel(node));
    button.addEventListener('click', function () { selectNode(node.id, true); });
    return button;
  }
  function renderSubjects() {
    var list = el('graph-subject-list');
    var focused = document.activeElement && document.activeElement.dataset.nodeId;
    var hadFocus = list.contains(document.activeElement);
    var fragment = document.createDocumentFragment();
    view.subjects.forEach(function (node) {
      var li = document.createElement('li');
      li.appendChild(subjectButton(node));
      fragment.appendChild(li);
    });
    if (!view.subjects.length) {
      var empty = document.createElement('li');
      empty.textContent = 'No matching subjects. Try another search or reset the filters.';
      fragment.appendChild(empty);
    }
    list.replaceChildren(fragment);
    if (hadFocus && focused) {
      var button = Array.from(list.querySelectorAll('button')).find(function (item) { return item.dataset.nodeId === focused; });
      if (button) button.focus({ preventScroll: true });
    }
  }
  function relationLabel(edge, node) {
    var outgoing = edge.source.id === node.id;
    if (edge.type === 'reference') return outgoing ? 'Links to' : 'Linked from';
    if (edge.type === 'recommended') return outgoing ? 'Recommended before' : 'Recommended prerequisite';
    return outgoing ? 'Required before' : 'Required prerequisite';
  }
  function renderSelection() {
    var node = graph.byId.get(selected);
    highlighted = new Set(node ? [node.id] : []);
    el('graph-selection').hidden = !node;
    el('graph-selection-placeholder').hidden = !!node;
    el('graph-focus-selected').disabled = !node;
    el('graph-clear-selection').disabled = !node;
    var focusOption = mode.querySelector('option[value="focus"]');
    if (focusOption) focusOption.disabled = !node;
    if (!node) return;
    text('graph-selection-title', node.title);
    text('graph-selection-meta', categoryLabel(node) + (node.section ? ' · ' + node.section : ''));
    var activeTypes = checked(typeFilters);
    var activeCategories = checked(categoryFilters);
    var connections = node.edges.filter(function (edge) {
      return activeTypes.has(edge.type) && activeCategories.has(edge.source.category) && activeCategories.has(edge.target.category);
    });
    connections.forEach(function (edge) { highlighted.add(edge.source.id); highlighted.add(edge.target.id); });
    var neighborCount = highlighted.size - 1;
    text('graph-selection-description', neighborCount + ' connected subjects with the current category and connection filters.' +
      (!view.ids.has(node.id) ? ' This subject is hidden by your current filters.' : ''));
    var open = el('graph-selection-open');
    open.href = '../' + node.href;
    open.textContent = node.href.indexOf('calculators/') === 0 ? 'Open calculator' : 'Open subject';
    var list = el('graph-selection-connections');
    var fragment = document.createDocumentFragment();
    connections.sort(function (a, b) {
      var first = a.source === node ? a.target : a.source;
      var second = b.source === node ? b.target : b.source;
      return first.title.localeCompare(second.title) || a.type.localeCompare(b.type);
    }).forEach(function (edge) {
      var neighbor = edge.source === node ? edge.target : edge.source;
      var label = relationLabel(edge, node);
      var li = document.createElement('li');
      var button = subjectButton(neighbor, label + ': ' + neighbor.title);
      var small = document.createElement('small');
      small.textContent = label;
      button.appendChild(small);
      li.appendChild(button);
      fragment.appendChild(li);
    });
    if (!connections.length) {
      var empty = document.createElement('li');
      empty.textContent = 'No connections with these filters. You can still open this subject.';
      fragment.appendChild(empty);
    }
    list.replaceChildren(fragment);
  }
  function selectNode(id, center) {
    if (!graph || !graph.byId.has(id)) return;
    var fromConnections = el('graph-selection-connections').contains(document.activeElement);
    selected = id;
    autoFit = false;
    updateView(mode.value === 'focus');
    if (center && mode.value !== 'focus') {
      var node = graph.byId.get(id);
      camera.x = node.x;
      camera.y = node.y;
    }
    synchronizeUrl();
    if (fromConnections) el('graph-selection-open').focus({ preventScroll: true });
    status.textContent += ' Selected ' + graph.byId.get(id).title + '. Use Open subject in the details panel, or Enter on the graph, to open it.';
    requestFrame();
  }
  function clearSelection() {
    var fromDetails = el('graph-selection').contains(document.activeElement);
    selected = null;
    mode.value = 'all';
    updateView(false);
    synchronizeUrl();
    if (fromDetails) canvas.focus({ preventScroll: true });
  }
  function reset() {
    search.value = '';
    selected = null;
    mode.value = 'all';
    categoryFilters.querySelectorAll('input').forEach(function (input) { input.checked = true; });
    typeFilters.querySelectorAll('input').forEach(function (input) { input.checked = true; });
    autoFit = true;
    updateView(true);
    synchronizeUrl();
  }
  function fitGraph() {
    if (!view || !view.nodes.length) return;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    view.nodes.forEach(function (node) {
      minX = Math.min(minX, node.x - node.radius);
      maxX = Math.max(maxX, node.x + node.radius);
      minY = Math.min(minY, node.y - node.radius);
      maxY = Math.max(maxY, node.y + node.radius);
    });
    camera.x = (minX + maxX) / 2;
    camera.y = (minY + maxY) / 2;
    camera.scale = Math.max(0.12, Math.min(1.7, (width - 80) / Math.max(80, maxX - minX), (height - 90) / Math.max(80, maxY - minY)));
    requestFrame();
  }
  function point(node) {
    return { x: (node.x - camera.x) * camera.scale + width / 2, y: (node.y - camera.y) * camera.scale + height / 2 };
  }
  function world(x, y) {
    return { x: (x - width / 2) / camera.scale + camera.x, y: (y - height / 2) / camera.scale + camera.y };
  }
  function zoom(factor, x, y) {
    autoFit = false;
    var before = world(x, y);
    camera.scale = Math.max(0.12, Math.min(4, camera.scale * factor));
    var after = world(x, y);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
    requestFrame();
  }
  function resize() {
    var bounds = stage.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    if (autoFit) fitGraph();
    requestFrame();
  }
  function requestFrame() {
    if (frameRequested || !graph || document.hidden) return;
    frameRequested = true;
    window.requestAnimationFrame(frame);
  }
  function frame() {
    frameRequested = false;
    if (document.hidden) return;
    if (!paused && framesRemaining > 0 && !pinch) {
      layout.step(Math.max(0.04, framesRemaining / 180));
      framesRemaining -= 1;
      if (autoFit && (framesRemaining % 12 === 0 || framesRemaining === 0)) fitGraph();
    }
    draw();
    if (!paused && framesRemaining > 0) requestFrame();
  }
  function draw() {
    text('graph-zoom-value', Math.round(camera.scale * 100) + '%');
    if (!context || !view) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    var active = hovered || selected;
    var neighbors = highlighted;
    if (hovered) {
      neighbors = new Set([hovered]);
      view.edges.forEach(function (edge) {
        if (edge.source.id === hovered) neighbors.add(edge.target.id);
        if (edge.target.id === hovered) neighbors.add(edge.source.id);
      });
    }
    view.edges.forEach(function (edge) {
      var isActive = edge.source.id === active || edge.target.id === active;
      var a = point(edge.source);
      var b = point(edge.target);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.strokeStyle = isActive ? '#9cbed8' : '#617e98';
      context.globalAlpha = active ? (isActive ? 0.8 : 0.10) : 0.34;
      context.lineWidth = isActive ? 1.4 : 0.8;
      context.setLineDash(edge.type === 'recommended' ? [6, 5] : edge.type === 'reference' ? [1.5, 4] : []);
      context.stroke();
    });
    context.setLineDash([]);
    var labelCandidates = [];
    view.nodes.forEach(function (node) {
      var p = point(node);
      var radius = Math.max(3, node.radius * Math.sqrt(camera.scale));
      if (p.x < -radius || p.x > width + radius || p.y < -radius || p.y > height + radius) return;
      var isActive = node.id === active || node.id === selected;
      var matching = search.value.trim() && view.matches.has(node.id);
      context.globalAlpha = active && !neighbors.has(node.id) && !matching ? 0.25 : 1;
      if (isActive || matching) {
        context.beginPath();
        context.arc(p.x, p.y, radius + (isActive ? 5 : 3), 0, Math.PI * 2);
        context.strokeStyle = isActive ? '#ffffff' : color(node);
        context.lineWidth = isActive ? 1.5 : 1;
        context.stroke();
      }
      context.beginPath();
      context.arc(p.x, p.y, radius, 0, Math.PI * 2);
      context.fillStyle = color(node);
      context.fill();
      if (isActive || (el('graph-labels').checked && (
        matching || view.nodes.length <= 35 || (active && neighbors.has(node.id)) || camera.scale > 1.15 || node.degree >= 12
      ))) {
        labelCandidates.push({ node: node, p: p, radius: radius, priority: isActive ? 3 : matching ? 2 : 1 });
      }
    });
    context.globalAlpha = 1;
    labelCandidates.sort(function (a, b) { return b.priority - a.priority || b.node.degree - a.node.degree; });
    context.font = '12px Inter, system-ui, sans-serif';
    var boxes = [];
    labelCandidates.slice(0, view.nodes.length <= 35 ? 35 : 55).forEach(function (item) {
      var title = item.node.title;
      if (title.length > 37) title = title.slice(0, 35) + '…';
      var length = context.measureText(title).width;
      var x = Math.min(width - length - 7, Math.max(6, item.p.x + item.radius + 6));
      var y = Math.max(18, Math.min(height - 8, item.p.y + 4));
      var box = { x: x - 3, y: y - 13, w: length + 6, h: 18 };
      if (item.priority < 3 && boxes.some(function (b) {
        return box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y;
      })) return;
      boxes.push(box);
      context.fillStyle = 'rgba(12, 23, 39, 0.88)';
      context.fillRect(box.x, box.y, box.w, box.h);
      context.fillStyle = item.priority >= 2 ? '#ffffff' : '#c4d2e2';
      context.fillText(title, x, y);
    });
  }
  function eventPoint(event) {
    var bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }
  function hitTest(position) {
    if (!view) return null;
    var best = null;
    var bestDistance = Infinity;
    view.nodes.forEach(function (node) {
      var p = point(node);
      var distance = Math.hypot(p.x - position.x, p.y - position.y);
      if (distance < Math.max(10, node.radius * Math.sqrt(camera.scale) + 5) && distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    });
    return best;
  }
  function pointerDown(event) {
    if (!graph || (event.pointerType === 'mouse' && event.button !== 0)) return;
    canvas.focus({ preventScroll: true });
    var position = eventPoint(event);
    pointers.set(event.pointerId, position);
    canvas.setPointerCapture(event.pointerId);
    autoFit = false;
    tooltip.hidden = true;
    if (pointers.size >= 2) {
      if (drag && drag.node) drag.node.pinned = false;
      drag = null;
      var points = Array.from(pointers.values());
      pinch = { distance: Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)), x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      return;
    }
    drag = { id: event.pointerId, start: position, previous: position, node: hitTest(position), moved: false };
    if (drag.node) drag.node.pinned = true;
    canvas.style.cursor = 'grabbing';
  }
  function pointerMove(event) {
    var position = eventPoint(event);
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, position);
    if (pinch && pointers.size >= 2) {
      var points = Array.from(pointers.values());
      var distance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
      var x = (points[0].x + points[1].x) / 2;
      var y = (points[0].y + points[1].y) / 2;
      zoom(distance / pinch.distance, pinch.x, pinch.y);
      camera.x -= (x - pinch.x) / camera.scale;
      camera.y -= (y - pinch.y) / camera.scale;
      pinch = { distance: distance, x: x, y: y };
      return;
    }
    if (drag && drag.id === event.pointerId) {
      if (Math.hypot(position.x - drag.start.x, position.y - drag.start.y) > 4) drag.moved = true;
      if (drag.moved) {
        if (drag.node) {
          var target = world(position.x, position.y);
          drag.node.x = target.x;
          drag.node.y = target.y;
          framesRemaining = Math.max(framesRemaining, 65);
        } else {
          camera.x -= (position.x - drag.previous.x) / camera.scale;
          camera.y -= (position.y - drag.previous.y) / camera.scale;
        }
        drag.previous = position;
        requestFrame();
      }
      return;
    }
    var node = hitTest(position);
    hovered = node ? node.id : null;
    canvas.style.cursor = node ? 'pointer' : 'grab';
    tooltip.hidden = !node;
    if (node) {
      tooltip.textContent = node.title + ' · ' + categoryLabel(node) + ' · ' + node.degree + ' connected subjects';
      tooltip.style.left = Math.max(8, Math.min(width - tooltip.offsetWidth - 8, position.x + 14)) + 'px';
      tooltip.style.top = Math.max(8, Math.min(height - tooltip.offsetHeight - 8, position.y + 16)) + 'px';
    }
    requestFrame();
  }
  function pointerEnd(event) {
    pointers.delete(event.pointerId);
    if (pinch) {
      drag = null;
      if (pointers.size < 2) {
        pinch = null;
        if (pointers.size === 1) {
          var remaining = Array.from(pointers.entries())[0];
          drag = { id: remaining[0], start: remaining[1], previous: remaining[1], node: null, moved: true };
        }
      }
    } else if (drag && drag.id === event.pointerId) {
      if (drag.node) drag.node.pinned = false;
      if (!drag.moved && event.type === 'pointerup') {
        if (drag.node) selectNode(drag.node.id, false);
        else clearSelection();
      }
      drag = null;
    }
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = 'grab';
    requestFrame();
  }
  function bindEvents() {
    search.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { autoFit = true; updateView(true); }, 120);
    });
    search.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && view) {
        clearTimeout(searchTimer);
        updateView(false);
        if (view.subjects.length) selectNode(view.subjects[0].id, true);
      }
    });
    [categoryFilters, typeFilters].forEach(function (container) {
      container.addEventListener('change', function () { autoFit = true; updateView(true); });
    });
    mode.addEventListener('change', function () { autoFit = true; updateView(true); synchronizeUrl(); });
    el('graph-focus-selected').addEventListener('click', function () {
      if (!selected) return;
      mode.value = 'focus';
      search.value = '';
      autoFit = true;
      updateView(true);
      synchronizeUrl();
    });
    el('graph-clear-selection').addEventListener('click', clearSelection);
    el('graph-reset').addEventListener('click', reset);
    el('graph-fit').addEventListener('click', function () { autoFit = true; fitGraph(); });
    el('graph-zoom-in').addEventListener('click', function () { zoom(1.3, width / 2, height / 2); });
    el('graph-zoom-out').addEventListener('click', function () { zoom(1 / 1.3, width / 2, height / 2); });
    el('graph-pause').addEventListener('click', function () {
      paused = !paused;
      if (!paused) framesRemaining = Math.max(framesRemaining, 90);
      updatePauseButton();
      requestFrame();
    });
    el('graph-labels').addEventListener('change', requestFrame);
    el('graph-retry').addEventListener('click', load);
    canvas.addEventListener('wheel', function (event) {
      if (!graph) return;
      event.preventDefault();
      var position = eventPoint(event);
      zoom(Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.003), position.x, position.y);
    }, { passive: false });
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerEnd);
    canvas.addEventListener('pointercancel', pointerEnd);
    canvas.addEventListener('pointerleave', function () { hovered = null; tooltip.hidden = true; requestFrame(); });
    canvas.addEventListener('dblclick', function (event) {
      var node = hitTest(eventPoint(event));
      if (node) window.location.assign('../' + node.href);
    });
    canvas.addEventListener('keydown', function (event) {
      if (!graph) return;
      var handled = true;
      autoFit = false;
      if (event.key === 'ArrowLeft') camera.x -= 45 / camera.scale;
      else if (event.key === 'ArrowRight') camera.x += 45 / camera.scale;
      else if (event.key === 'ArrowUp') camera.y -= 45 / camera.scale;
      else if (event.key === 'ArrowDown') camera.y += 45 / camera.scale;
      else if (event.key === '+' || event.key === '=') zoom(1.3, width / 2, height / 2);
      else if (event.key === '-') zoom(1 / 1.3, width / 2, height / 2);
      else if (event.key === '0') fitGraph();
      else if (event.key === 'Escape') clearSelection();
      else if (event.key === 'Enter' && selected) window.location.assign('../' + graph.byId.get(selected).href);
      else handled = false;
      if (handled) { event.preventDefault(); requestFrame(); }
    });
    document.addEventListener('visibilitychange', requestFrame);
    reducedMotion.addEventListener('change', function (event) {
      if (event.matches) { paused = true; updatePauseButton(); }
    });
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);
  }
  function renderCategories() {
    var fragment = document.createDocumentFragment();
    graph.categories.forEach(function (category, id) {
      var label = document.createElement('label');
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'graph-category';
      input.value = id;
      input.checked = true;
      label.appendChild(input);
      label.appendChild(dot({ category: id }));
      var span = document.createElement('span');
      span.textContent = category.label;
      label.appendChild(span);
      fragment.appendChild(label);
    });
    categoryFilters.replaceChildren(fragment);
  }
  async function load() {
    el('graph-loading').hidden = false;
    el('graph-error').hidden = true;
    el('graph-empty').hidden = true;
    el('graph-retry').disabled = true;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch('knowledge-graph.json', { signal: controller.signal });
      if (!response.ok) throw new Error('Graph request failed');
      var data = await response.json();
      graph = model.createGraph(data);
      graph.categories.forEach(function (category, id) { colors.set(id, knownColors[id] || palette[colors.size % palette.length]); });
      layout = model.createLayout(graph);
      // Settle before the first paint, so reduced-motion users see a usable graph.
      for (var i = 0; i < 90; i += 1) layout.step(1 - i / 120);
      renderCategories();
      var params = new URLSearchParams(window.location.search);
      var requested = params.get('node');
      selected = graph.byId.has(requested) ? requested : null;
      mode.value = selected && params.get('view') === 'focus' ? 'focus' : 'all';
      updatePauseButton();
      resize();
      updateView(true);
      if (requested && !selected) status.textContent += ' The requested subject is not in this graph; showing all subjects instead.';
      framesRemaining = paused ? 0 : 120;
      requestFrame();
    } catch (error) {
      graph = null;
      el('graph-error').hidden = false;
      status.textContent = 'The graph could not be loaded. Try again, or use the existing subject catalogs.';
      if (window.location.protocol === 'file:') status.textContent += ' Open the app through a local web server or its website.';
    } finally {
      clearTimeout(timer);
      el('graph-loading').hidden = true;
      el('graph-retry').disabled = false;
    }
  }

  bindEvents();
  load();
})();
