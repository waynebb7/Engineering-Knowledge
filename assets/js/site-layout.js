(function () {
  'use strict';

  function getBasePath() {
    var el = document.querySelector('script[src*="site-layout.js"]');
    if (!el) return '';
    var src = el.getAttribute('src') || '';
    return src.replace(/(?:assets\/)?js\/site-layout\.js(\?.*)?$/, '');
  }

  var path = window.location.pathname.replace(/\\/g, '/');
  var parts = path.split('/').filter(Boolean);
  var file = parts[parts.length - 1] || 'index.html';
  if (!file.endsWith('.html')) file = 'index.html';
  var base = getBasePath();
  var siteName = 'Aerospace Engineering Toolkit';
  var logoFull = base + 'assets/images/aerospace-engineering-toolkit-logo.png';
  var logoMark = base + 'assets/images/aet-logo-mark.png';
  var favicon = base + 'assets/images/favicon.png';

  if (!document.querySelector('link[rel="icon"]')) {
    var iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.type = 'image/png';
    iconLink.href = favicon;
    document.head.appendChild(iconLink);
  }

  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    var touchLink = document.createElement('link');
    touchLink.rel = 'apple-touch-icon';
    touchLink.href = favicon;
    document.head.appendChild(touchLink);
  }

  var navItems = [
    { href: 'index.html', label: 'Home' },
    { href: 'calculators/index.html', label: 'Calculators' },
    { href: 'learn/index.html', label: 'Learn' },
    { href: 'reference/documents/index.html', label: 'Documents' },
    { href: 'progress.html', label: 'Progress' },
    { href: 'feedback.html', label: 'Feedback' }
  ];

  function isActive(href) {
    if (href === 'index.html') {
      return file === 'index.html' && path.indexOf('/learn/') === -1 && path.indexOf('/calculators/') === -1;
    }
    if (href === 'calculators/index.html') {
      return path.indexOf('/calculators/') !== -1;
    }
    if (href === 'learn/index.html') {
      return path.indexOf('/learn/') !== -1;
    }
    if (href === 'progress.html') {
      return file === 'progress.html';
    }
    if (href === 'feedback.html') {
      return file === 'feedback.html';
    }
    if (href === 'reference/documents/index.html') {
      return path.indexOf('/reference/') !== -1;
    }
    return file === href.split('/').pop();
  }

  var navHtml = navItems.map(function (item) {
    var cls = isActive(item.href) ? ' class="active"' : '';
    return '<a href="' + base + item.href + '"' + cls + '>' + item.label + '</a>';
  }).join('');

  var header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML =
    '<div class="site-header__inner">' +
      '<a href="' + base + 'index.html" class="site-brand" aria-label="' + siteName + '">' +
        '<img class="site-brand__logo site-brand__logo--full" src="' + logoFull + '" width="232" height="58" alt="' + siteName + '" decoding="async" />' +
        '<img class="site-brand__logo site-brand__logo--compact" src="' + logoMark + '" width="62" height="44" alt="" decoding="async" />' +
      '</a>' +
      '<nav class="site-nav" aria-label="Main navigation">' + navHtml + '</nav>' +
    '</div>';

  function currentPageReference() {
    var loc = window.location;
    if (loc.protocol === 'file:') {
      return loc.href;
    }
    return loc.pathname + loc.search + loc.hash;
  }

  function feedbackReportHref() {
    var page = currentPageReference();
    var title = document.title
      .replace(/\s*\|\s*Engineering Knowledge\s*$/i, '')
      .replace(/\s*[—–-]\s*Engineering Knowledge\s*$/i, '')
      .replace(/\s*\|\s*Aerospace Engineering Toolkit\s*$/i, '')
      .replace(/\s*[—–-]\s*Aerospace Engineering Toolkit\s*$/i, '')
      .trim();
    return base + 'feedback.html?report=1&page=' + encodeURIComponent(page) +
      '&title=' + encodeURIComponent(title);
  }

  var footerLinks =
    '<a href="' + base + 'feedback.html">Feedback</a> &middot; ';
  if (file !== 'feedback.html') {
    footerLinks += '<a href="' + feedbackReportHref() + '">Report this page</a> &middot; ';
  }
  footerLinks += 'MIT License';

  var footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML =
    '<div class="site-footer__inner">' +
      '<p>&copy; ' + new Date().getFullYear() + ' ' + siteName + ' &middot; ' +
      footerLinks + '</p>' +
    '</div>';

  var body = document.body;
  var children = Array.prototype.slice.call(body.childNodes);
  var wrapper = document.createElement('main');
  wrapper.className = 'site-main';

  children.forEach(function (node) {
    if (node.nodeType === 1 && node.tagName === 'SCRIPT' && !node.src) {
      return;
    }
    wrapper.appendChild(node);
  });

  body.classList.add('has-site-chrome');
  body.insertBefore(header, body.firstChild);
  body.appendChild(wrapper);

  children.forEach(function (node) {
    if (node.nodeType === 1 && node.tagName === 'SCRIPT' && !node.src) {
      body.appendChild(node);
    }
  });

  body.appendChild(footer);

  function scriptSibling(name) {
    var el = document.querySelector('script[src*="site-layout.js"]');
    if (!el) return base + name;
    var src = el.getAttribute('src') || '';
    return src.replace(/site-layout\.js(\?.*)?$/, name);
  }

  if (body.classList.contains('content-page')) {
    var topicProgressScript = document.createElement('script');
    topicProgressScript.src = scriptSibling('topic-progress.js');
    document.head.appendChild(topicProgressScript);

    var reviewKey = document.getElementById('topic-review-key');
    if (reviewKey) {
      function typesetReviewKey() {
        if (window.MathJax && MathJax.Hub) {
          MathJax.Hub.Queue(['Typeset', MathJax.Hub, reviewKey]);
        }
      }
      reviewKey.addEventListener('toggle', function () {
        if (reviewKey.open) {
          typesetReviewKey();
        }
      });
      if (reviewKey.open) {
        if (window.MathJax && MathJax.Hub) {
          MathJax.Hub.Register.StartupHook('End', function () {
            typesetReviewKey();
          });
        }
      }
    }
  }

  if (body.classList.contains('calculator-page') && body.hasAttribute('data-calc')) {
    var registryScript = document.createElement('script');
    registryScript.src = scriptSibling('calculator-registry.js');
    document.head.appendChild(registryScript);

    var coreScript = document.createElement('script');
    coreScript.src = scriptSibling('calculator-core.js');
    coreScript.defer = true;
    document.head.appendChild(coreScript);
  }
})();
