(function () {
  'use strict';

  var TYPE_LABELS = {
    pdf: 'PDF',
    docx: 'Word',
    xlsx: 'Excel'
  };

  var DEFAULT_GROUPS = [
    { id: 'ungrouped', title: 'Documents' }
  ];

  var catalogueData = null;
  var search = '';
  var groupFilter = 'all';
  var tagFilter = 'all';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || String(type || 'File').toUpperCase();
  }

  function versionSortRank(version) {
    var label = (version && version.label ? version.label : '').trim();
    var revision = (version && version.revision ? version.revision : '').trim();

    if (/^initial issue/i.test(label)) {
      return [0, 0, 0];
    }

    var amendmentMatch = label.match(/amendment\s+(\d+)/i);
    if (amendmentMatch) {
      var amendment = parseInt(amendmentMatch[1], 10);
      var issueMatch = label.match(/issue\s+(\d+)/i);
      var issue = issueMatch ? parseInt(issueMatch[1], 10) : 0;
      return [2, amendment, issue];
    }

    var doMatch = label.match(/^DO-(\d+)([A-Z])?$/i);
    if (doMatch) {
      var doNum = parseInt(doMatch[1], 10);
      var doLetter = doMatch[2] ? doMatch[2].charCodeAt(0) : 64;
      return [3, doNum, doLetter];
    }

    var arpMatch = label.match(/^ARP(\d+)([A-Z])?$/i);
    if (arpMatch) {
      var arpNum = parseInt(arpMatch[1], 10);
      var arpLetter = arpMatch[2] ? arpMatch[2].charCodeAt(0) : 64;
      return [3, arpNum, arpLetter];
    }

    var revMatch = revision.match(/(?:Rev\.?|Ed\.?)\s*([A-Z])/i);
    if (revMatch) {
      return [1, revMatch[1].charCodeAt(0), 0];
    }

    return [1, 0, label.charCodeAt(0) || 0];
  }

  function compareSortRanks(a, b) {
    var i;
    for (i = 0; i < 3; i += 1) {
      if (a[i] !== b[i]) {
        return a[i] - b[i];
      }
    }
    return 0;
  }

  function compareVersionsNewestFirst(a, b) {
    return compareSortRanks(versionSortRank(b), versionSortRank(a));
  }

  function documentNewestRank(doc) {
    var versions = getVersionsUnsorted(doc);
    if (!versions.length) {
      return [0, 0, 0];
    }
    return versions
      .map(versionSortRank)
      .reduce(function (best, rank) {
        return compareSortRanks(rank, best) > 0 ? rank : best;
      }, [0, 0, 0]);
  }

  function getVersionsUnsorted(doc) {
    if (doc.versions && doc.versions.length) {
      return doc.versions.slice();
    }
    if (doc.file) {
      return [{
        id: doc.id,
        label: doc.standard || doc.title,
        revision: doc.revision || '',
        file: doc.file
      }];
    }
    return [];
  }

  function getVersions(doc) {
    return getVersionsUnsorted(doc).sort(compareVersionsNewestFirst);
  }

  function collectTags(docs) {
    var tagSet = {};
    docs.forEach(function (doc) {
      (doc.tags || []).forEach(function (tag) {
        tagSet[tag] = true;
      });
    });
    return Object.keys(tagSet).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function documentSearchText(doc) {
    return [
      doc.title,
      doc.standard,
      doc.summary,
      doc.revision,
      (doc.sections || []).join(' '),
      (doc.tags || []).join(' ')
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function matchesFilter(doc) {
    if (groupFilter !== 'all' && doc.group !== groupFilter) {
      return false;
    }
    if (tagFilter !== 'all' && (doc.tags || []).indexOf(tagFilter) === -1) {
      return false;
    }
    if (search) {
      var query = search.toLowerCase();
      if (documentSearchText(doc).indexOf(query) === -1) {
        return false;
      }
    }
    return true;
  }

  function filtersActive() {
    return search !== '' || groupFilter !== 'all' || tagFilter !== 'all';
  }

  function renderMeta(doc, versions) {
    var meta = [];
    if (doc.standard) meta.push(escapeHtml(doc.standard));
    if (versions.length > 1) {
      meta.push(versions.length + ' items');
    } else if (doc.revision) {
      meta.push(escapeHtml(doc.revision));
    }
    if (doc.issued) meta.push('Issued ' + escapeHtml(doc.issued));
    return meta.length ? '<p class="documents-card__meta">' + meta.join(' · ') + '</p>' : '';
  }

  function renderTitle(doc, versions) {
    if (versions.length > 1) {
      return '<h2 class="documents-card__title">' + escapeHtml(doc.title) + '</h2>';
    }
    return (
      '<h2 class="documents-card__title">' +
        '<a href="' + escapeHtml(versions[0].file) + '" target="_blank" rel="noopener">' +
          escapeHtml(doc.title) +
        '</a>' +
      '</h2>'
    );
  }

  function renderVersionPicker(doc, versions) {
    if (versions.length <= 1) {
      return '';
    }

    var pickerWord = doc.pickerLabel || 'version';
    var items = versions.map(function (version) {
      var label = version.label || version.revision || 'Version';
      var detail = version.revision && version.label !== version.revision
        ? '<span class="documents-version__detail">' + escapeHtml(version.revision) + '</span>'
        : '';
      return (
        '<li class="documents-version__item">' +
          '<a href="' + escapeHtml(version.file) + '" target="_blank" rel="noopener">' +
            escapeHtml(label) +
          '</a>' +
          detail +
        '</li>'
      );
    }).join('');

    return (
      '<details class="documents-versions">' +
        '<summary class="documents-versions__toggle">' +
          '<span class="documents-versions__toggle-show">Choose ' + escapeHtml(pickerWord) + ' (' + versions.length + ')</span>' +
          '<span class="documents-versions__toggle-hide">Hide list</span>' +
        '</summary>' +
        '<ul class="documents-versions__list">' + items + '</ul>' +
      '</details>'
    );
  }

  function renderDocument(doc) {
    var versions = getVersions(doc);
    var sections = (doc.sections || []).map(function (s) {
      return '<li>' + escapeHtml(s) + '</li>';
    }).join('');
    var tags = (doc.tags || []).map(function (t) {
      return '<span class="documents-tag">' + escapeHtml(t) + '</span>';
    }).join('');

    return (
      '<article class="documents-card' + (versions.length > 1 ? ' documents-card--multi' : '') + '">' +
        '<div class="documents-card__head">' +
          '<span class="documents-type documents-type--' + escapeHtml(doc.type || 'file') + '">' +
            escapeHtml(typeLabel(doc.type)) +
          '</span>' +
          renderMeta(doc, versions) +
        '</div>' +
        renderTitle(doc, versions) +
        (doc.summary ? '<p class="documents-card__summary">' + escapeHtml(doc.summary) + '</p>' : '') +
        (sections ? '<ul class="documents-card__sections">' + sections + '</ul>' : '') +
        (tags ? '<div class="documents-card__tags">' + tags + '</div>' : '') +
        renderVersionPicker(doc, versions) +
      '</article>'
    );
  }

  function groupDocuments(docs, groups) {
    var groupMap = {};
    var order = [];

    (groups || DEFAULT_GROUPS).forEach(function (group) {
      groupMap[group.id] = { title: group.title, docs: [] };
      order.push(group.id);
    });

    if (!groupMap.ungrouped) {
      groupMap.ungrouped = { title: 'Documents', docs: [] };
      order.push('ungrouped');
    }

    docs.forEach(function (doc) {
      var id = doc.group && groupMap[doc.group] ? doc.group : 'ungrouped';
      groupMap[id].docs.push(doc);
    });

    order.forEach(function (id) {
      if (groupMap[id]) {
        groupMap[id].docs.sort(function (a, b) {
          return compareSortRanks(documentNewestRank(b), documentNewestRank(a));
        });
      }
    });

    return order
      .map(function (id) { return groupMap[id]; })
      .filter(function (section) { return section.docs.length > 0; });
  }

  function renderList(data) {
    var docs = (data && data.documents) || [];
    if (!docs.length) {
      return '<p class="text-muted">No documents registered yet. Add entries to <code>manifest.json</code>.</p>';
    }

    var filtered = docs.filter(matchesFilter);
    if (!filtered.length) {
      return (
        '<p class="documents-empty">No documents match your filters. ' +
        'Try clearing the search or changing the category or tag filter.</p>'
      );
    }

    var sections = groupDocuments(filtered, data.groups);
    return sections.map(function (section) {
      return (
        '<section class="documents-section">' +
          '<h2 class="documents-section__title">' + escapeHtml(section.title) + '</h2>' +
          '<div class="documents-grid">' +
            section.docs.map(renderDocument).join('') +
          '</div>' +
        '</section>'
      );
    }).join('');
  }

  function renderToolbar(data) {
    var docs = (data && data.documents) || [];
    var groups = (data && data.groups) || [];
    var tags = collectTags(docs);
    var visibleCount = docs.filter(matchesFilter).length;
    var summary = 'Showing ' + visibleCount + ' of ' + docs.length + ' document' + (docs.length === 1 ? '' : 's');

    var html = '';
    html += '<input type="search" id="documents-search" class="documents-search" placeholder="Search title, standard, tags…" value="' + escapeHtml(search) + '" />';

    html += '<select id="documents-group-filter" class="documents-filter" aria-label="Filter by category">';
    html += '<option value="all">All categories</option>';
    groups.forEach(function (group) {
      var selected = groupFilter === group.id ? ' selected' : '';
      html += '<option value="' + escapeHtml(group.id) + '"' + selected + '>' + escapeHtml(group.title) + '</option>';
    });
    html += '</select>';

    html += '<select id="documents-tag-filter" class="documents-filter" aria-label="Filter by tag">';
    html += '<option value="all">All tags</option>';
    tags.forEach(function (tag) {
      var selected = tagFilter === tag ? ' selected' : '';
      html += '<option value="' + escapeHtml(tag) + '"' + selected + '>' + escapeHtml(tag) + '</option>';
    });
    html += '</select>';

    if (filtersActive()) {
      html += '<button type="button" id="documents-clear-filters" class="corp-btn corp-btn--secondary">Clear filters</button>';
    }

    html += '<p class="documents-filter-summary">' + summary + '</p>';
    return html;
  }

  function bindToolbarEvents(toolbar, listMount) {
    var searchEl = document.getElementById('documents-search');
    var groupEl = document.getElementById('documents-group-filter');
    var tagEl = document.getElementById('documents-tag-filter');
    var clearEl = document.getElementById('documents-clear-filters');

    if (searchEl) {
      searchEl.addEventListener('input', function () {
        search = searchEl.value;
        render(catalogueData, listMount, toolbar);
        var el = document.getElementById('documents-search');
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }

    if (groupEl) {
      groupEl.addEventListener('change', function () {
        groupFilter = groupEl.value;
        render(catalogueData, listMount, toolbar);
      });
    }

    if (tagEl) {
      tagEl.addEventListener('change', function () {
        tagFilter = tagEl.value;
        render(catalogueData, listMount, toolbar);
      });
    }

    if (clearEl) {
      clearEl.addEventListener('click', function () {
        search = '';
        groupFilter = 'all';
        tagFilter = 'all';
        render(catalogueData, listMount, toolbar);
      });
    }
  }

  function render(data, listMount, toolbarMount) {
    if (!data || !listMount) return;

    if (toolbarMount) {
      toolbarMount.hidden = false;
      toolbarMount.innerHTML = renderToolbar(data);
      bindToolbarEvents(toolbarMount, listMount);
    }

    listMount.innerHTML = renderList(data);
  }

  function showError(mount) {
    mount.innerHTML =
      '<p class="calc-error">Could not load the document catalogue. ' +
      'Run <code>python scripts/build-documents-manifest.py</code> after updating the manifest.</p>';
  }

  function loadCatalogue() {
    if (window.DocumentManifest && window.DocumentManifest.documents) {
      return Promise.resolve(window.DocumentManifest);
    }

    return fetch('manifest.json')
      .then(function (res) {
        if (!res.ok) throw new Error('manifest.json returned ' + res.status);
        return res.json();
      });
  }

  function init() {
    var mount = document.getElementById('documents-list');
    var toolbar = document.getElementById('documents-toolbar');
    if (!mount) return;

    loadCatalogue()
      .then(function (data) {
        catalogueData = data;
        render(data, mount, toolbar);
      })
      .catch(function (err) {
        if (toolbar) toolbar.hidden = true;
        showError(mount);
        if (window.console && console.warn) {
          console.warn('Document library load failed:', err);
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
