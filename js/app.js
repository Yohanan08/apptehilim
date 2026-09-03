(function () {
  'use strict';

  var DATA = window.TEHILIM_DATA;
  var SALMOS = DATA.salmos;
  var BY_ID = {};
  SALMOS.forEach(function (s, idx) { s._index = idx; BY_ID[s.id] = s; });

  var app = document.getElementById('app');
  var titleEl = document.getElementById('app-title');
  var btnBack = document.getElementById('btn-back');
  var btnMenu = document.getElementById('btn-menu');
  var btnSearch = document.getElementById('btn-search');
  var searchBar = document.getElementById('search-bar');
  var searchInput = document.getElementById('search-input');
  var sideMenu = document.getElementById('side-menu');
  var menuBackdrop = document.getElementById('menu-backdrop');
  var offlinePill = document.getElementById('offline-pill');

  // ---------- Book grouping ----------
  function numOf(id) {
    var n = parseInt(id, 10);
    return isNaN(n) ? null : n;
  }
  var BOOKS = [
    { title: 'Libro Primero — Sefer Álef (Salmos 1–41)', min: 1, max: 41 },
    { title: 'Libro Segundo — Sefer Bet (Salmos 42–72)', min: 42, max: 72 },
    { title: 'Libro Tercero — Sefer Guímel (Salmos 73–89)', min: 73, max: 89 },
    { title: 'Libro Cuarto — Sefer Dálet (Salmos 90–106)', min: 90, max: 106 },
    { title: 'Libro Quinto — Sefer Hei (Salmos 107–150)', min: 107, max: 150 }
  ];

  function groupSalmos(list) {
    var groups = BOOKS.map(function (b) { return { title: b.title, items: [] }; });
    var qumran = { title: 'Salmos de Qumrán', items: [] };
    list.forEach(function (s) {
      var n = numOf(s.id);
      if (n !== null) {
        var placed = false;
        for (var i = 0; i < BOOKS.length; i++) {
          if (n >= BOOKS[i].min && n <= BOOKS[i].max) { groups[i].items.push(s); placed = true; break; }
        }
        if (!placed) qumran.items.push(s);
      } else {
        qumran.items.push(s);
      }
    });
    groups = groups.filter(function (g) { return g.items.length; });
    if (qumran.items.length) groups.push(qumran);
    return groups;
  }

  // ---------- Helpers ----------
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function stripHtml(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || '';
  }
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function forEachEl(nodeList, fn) {
    for (var i = 0; i < nodeList.length; i++) fn(nodeList[i], i);
  }

  var SECTION_CLASS = {
    'Texto Hebreo': 'texto-hebreo',
    'Fonética Hebrea': 'fonetica',
    'Oración — Mizmor': 'oracion',
    'Oración - Mizmor': 'oracion'
  };
  var SECTION_OPEN_DEFAULT = { 'Texto Hebreo': true, 'Fonética Hebrea': true, 'Traducción Literal': true };

  // ---------- Resaltado (guardado en el dispositivo) ----------
  var HL_KEY = 'tehilim-highlights';
  var HL = {};
  try { HL = JSON.parse(localStorage.getItem(HL_KEY) || '{}'); } catch (e) { HL = {}; }
  function saveHL() { try { localStorage.setItem(HL_KEY, JSON.stringify(HL)); } catch (e) {} }
  function persistSection(key) {
    if (!key) return;
    var contentEl = app.querySelector('.section-content[data-hlkey="' + key + '"]');
    if (!contentEl) return;
    HL[key] = contentEl.innerHTML;
    saveHL();
  }
  function closestClass(elm, className) {
    while (elm && elm !== app && elm !== document.body) {
      if (elm.classList && elm.classList.contains(className)) return elm;
      elm = elm.parentElement;
    }
    return null;
  }
  function closestMarkHl(elm) {
    while (elm && elm !== app && elm !== document.body) {
      if (elm.tagName === 'MARK' && elm.classList.contains('hl')) return elm;
      elm = elm.parentElement;
    }
    return null;
  }
  function findHlKey(elm) {
    while (elm && elm !== document.body) {
      if (elm.getAttribute && elm.getAttribute('data-hlkey')) return elm.getAttribute('data-hlkey');
      elm = elm.parentElement;
    }
    return null;
  }

  // ---------- Voz (síntesis de texto a voz del dispositivo) ----------
  function resetSpeakButtons() {
    forEachEl(app.querySelectorAll('.btn-speak.speaking'), function (b) {
      b.classList.remove('speaking'); b.textContent = '🔊 Escuchar';
    });
  }
  function handleSpeak(btn) {
    if (!('speechSynthesis' in window)) return;
    var key = btn.getAttribute('data-key');
    var content = app.querySelector('.section-content[data-hlkey="' + key + '"]');
    if (!content) return;
    var synth = window.speechSynthesis;
    var wasSpeaking = btn.classList.contains('speaking');
    synth.cancel();
    resetSpeakButtons();
    if (wasSpeaking) return;
    var texto = stripHtml(content.innerHTML);
    if (!texto.trim()) return;
    var utter = new SpeechSynthesisUtterance(texto);
    utter.lang = 'es-ES';
    utter.rate = 0.95;
    utter.onend = function () { btn.classList.remove('speaking'); btn.textContent = '🔊 Escuchar'; };
    utter.onerror = function () { btn.classList.remove('speaking'); btn.textContent = '🔊 Escuchar'; };
    btn.classList.add('speaking');
    btn.textContent = '⏸ Detener';
    synth.speak(utter);
  }

  // ---------- Copiar al portapapeles ----------
  function fallbackCopy(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  function handleCopy(btn) {
    var key = btn.getAttribute('data-key');
    var content = app.querySelector('.section-content[data-hlkey="' + key + '"]');
    if (!content) return;
    var texto = stripHtml(content.innerHTML);
    function showCopied() {
      btn.textContent = '✓ Copiado';
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = '📋 Copiar'; btn.classList.remove('copied'); }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(showCopied).catch(function () { fallbackCopy(texto); showCopied(); });
    } else {
      fallbackCopy(texto); showCopied();
    }
  }

  // ---------- Paleta flotante para resaltar texto seleccionado ----------
  var hlToolbar = el(
    '<div class="hl-toolbar" hidden>' +
      '<button type="button" class="hl-swatch hl-amarillo" data-color="hl-amarillo" aria-label="Resaltar amarillo"></button>' +
      '<button type="button" class="hl-swatch hl-verde" data-color="hl-verde" aria-label="Resaltar verde"></button>' +
      '<button type="button" class="hl-swatch hl-azul" data-color="hl-azul" aria-label="Resaltar azul"></button>' +
      '<button type="button" class="hl-swatch hl-rosa" data-color="hl-rosa" aria-label="Resaltar rosa"></button>' +
    '</div>'
  );
  document.body.appendChild(hlToolbar);
  var hlTargetKey = null;

  function hideHlToolbar() { hlToolbar.hidden = true; hlTargetKey = null; }
  function showHlToolbarNear(range) {
    var rect;
    try { rect = range.getBoundingClientRect(); } catch (e) { hideHlToolbar(); return; }
    if (!rect || (rect.width === 0 && rect.height === 0)) { hideHlToolbar(); return; }
    hlToolbar.hidden = false;
    var top = rect.top - 50;
    if (top < 8) top = rect.bottom + 10;
    var left = rect.left + rect.width / 2 - 82;
    if (left < 8) left = 8;
    var maxLeft = window.innerWidth - 172;
    if (left > maxLeft) left = maxLeft;
    hlToolbar.style.top = top + 'px';
    hlToolbar.style.left = left + 'px';
  }
  var selTimer = null;
  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { hideHlToolbar(); return; }
      var range = sel.getRangeAt(0);
      var node = range.commonAncestorContainer;
      var elm = node.nodeType === 3 ? node.parentElement : node;
      var contentEl = closestClass(elm, 'section-content');
      if (!contentEl) { hideHlToolbar(); return; }
      hlTargetKey = contentEl.getAttribute('data-hlkey');
      showHlToolbarNear(range);
    }, 180);
  });
  hlToolbar.addEventListener('mousedown', function (e) { e.preventDefault(); });
  hlToolbar.addEventListener('click', function (e) {
    var btn = e.target;
    while (btn && btn !== hlToolbar && btn.tagName !== 'BUTTON') btn = btn.parentElement;
    if (!btn || btn === hlToolbar) return;
    var color = btn.getAttribute('data-color');
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      var range = sel.getRangeAt(0);
      try {
        var mark = document.createElement('mark');
        mark.className = 'hl ' + color;
        range.surroundContents(mark);
      } catch (err) {
        try {
          var frag = range.extractContents();
          var mark2 = document.createElement('mark');
          mark2.className = 'hl ' + color;
          mark2.appendChild(frag);
          range.insertNode(mark2);
        } catch (err2) { /* selección no soportada; se ignora */ }
      }
      sel.removeAllRanges();
    }
    if (hlTargetKey) persistSection(hlTargetKey);
    hideHlToolbar();
  });

  // ---------- Views ----------
  function renderHome(filterText) {
    titleEl.innerHTML = 'תְּהִלִּים <span>Tehilim</span>';
    btnBack.hidden = true;

    var list = SALMOS;
    var q = (filterText || '').trim().toLowerCase();
    var matchedByText = null;
    if (q) {
      matchedByText = SALMOS.filter(function (s) {
        if (s.id.toLowerCase().indexOf(q) !== -1) return true;
        if (s._searchText === undefined) {
          s._searchText = (stripHtml(s.subtitle_html) + ' ' + s.sections.map(function (sec) { return sec.title + ' ' + stripHtml(sec.html); }).join(' ')).toLowerCase();
        }
        return s._searchText.indexOf(q) !== -1;
      });
      list = matchedByText;
    }

    var groups = groupSalmos(list);
    var html = '<h1 class="section-title">Índice de Salmos</h1><p class="section-sub">150 Tehilim canónicos y los Salmos de Qumrán — texto hebreo, fonética, traducción y estudio profético.</p>';

    if (!groups.length) {
      html += '<div class="empty-state">No se encontró ningún salmo para “' + escapeHtml(filterText) + '”.</div>';
    }

    groups.forEach(function (g) {
      html += '<section class="book-group"><h2 class="book-group__title">' + g.title + '</h2><div class="grid">';
      g.items.forEach(function (s) {
        var isQ = isNaN(parseInt(s.id, 10));
        html += '<button class="tile' + (isQ ? ' qumran' : '') + '" data-id="' + s.id + '">' + s.id + '</button>';
      });
      html += '</div></section>';
    });

    app.innerHTML = html;
    forEachEl(app.querySelectorAll('.tile'), function (btn) {
      btn.addEventListener('click', function () { navigate('salmo', btn.getAttribute('data-id')); });
    });
  }

  function renderSalmo(id) {
    var s = BY_ID[id];
    if (!s) { navigate('home'); return; }
    btnBack.hidden = false;
    titleEl.innerHTML = 'SALMO <span>' + s.id + '</span>';

    var html = '';
    html += '<div class="salmo-head"><div class="salmo-head__num">MIZMOR · SALMO ' + s.id + '</div>';
    html += '<h2>Tehilim ' + s.id + '</h2>';
    if (s.subtitle_html) html += '<div class="salmo-head__subtitle">' + s.subtitle_html + '</div>';
    html += '</div>';

    html += '<div class="pager">' +
      '<button id="prev-salmo" ' + (s._index === 0 ? 'disabled' : '') + '>' +
        '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Anterior</button>' +
      '<button id="next-salmo" ' + (s._index === SALMOS.length - 1 ? 'disabled' : '') + '>' +
        'Siguiente <svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div>';

    s.sections.forEach(function (sec, i) {
      var cls = SECTION_CLASS[sec.title] || '';
      var open = SECTION_OPEN_DEFAULT[sec.title] ? ' open' : '';
      var key = s.id + '::' + i;
      var bodyHtml = HL[key] !== undefined ? HL[key] : sec.html;
      html += '<details class="accordion"' + open + '>' +
        '<summary><span class="diamond">◆</span> ' + sec.title +
        '<svg class="chev" viewBox="0 0 24 24"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>' +
        '<div class="accordion__body ' + cls + '">' +
          '<div class="section-toolbar">' +
            '<button type="button" class="mini-btn btn-speak" data-key="' + key + '">🔊 Escuchar</button>' +
            '<button type="button" class="mini-btn btn-copy" data-key="' + key + '">📋 Copiar</button>' +
          '</div>' +
          '<div class="section-content" data-hlkey="' + key + '">' + bodyHtml + '</div>' +
        '</div>' +
        '</details>';
    });

    app.innerHTML = html;
    window.scrollTo(0, 0);

    var prevBtn = document.getElementById('prev-salmo');
    var nextBtn = document.getElementById('next-salmo');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (s._index > 0) navigate('salmo', SALMOS[s._index - 1].id);
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (s._index < SALMOS.length - 1) navigate('salmo', SALMOS[s._index + 1].id);
    });
  }

  function renderInfo(which) {
    btnBack.hidden = false;
    titleEl.innerHTML = which === 'front' ? 'Introducción' : 'Bibliografía';
    var html = '<div class="info-page">' + (which === 'front' ? DATA.frontmatter_html : DATA.backmatter_html) + '</div>';
    app.innerHTML = html;
  }

  // ---------- Routing ----------
  function navigate(view, id) {
    var hash = view === 'home' ? '#/' : view === 'salmo' ? '#/salmo/' + encodeURIComponent(id) : '#/' + view;
    if (location.hash === hash) { render(); }
    else { location.hash = hash; }
  }

  function render() {
    closeMenu();
    searchBar.hidden = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hideHlToolbar();
    var hash = location.hash || '#/';
    var m;
    if ((m = hash.match(/^#\/salmo\/(.+)$/))) {
      renderSalmo(decodeURIComponent(m[1]));
    } else if (hash === '#/front') {
      renderInfo('front');
    } else if (hash === '#/back') {
      renderInfo('back');
    } else {
      renderHome(searchInput.value);
    }
    app.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', render);

  // ---------- Menu ----------
  function openMenu() { sideMenu.hidden = false; }
  function closeMenu() { sideMenu.hidden = true; }
  btnMenu.addEventListener('click', openMenu);
  menuBackdrop.addEventListener('click', closeMenu);
  forEachEl(sideMenu.querySelectorAll('button[data-view]'), function (b) {
    b.addEventListener('click', function () { navigate(b.getAttribute('data-view')); });
  });

  // ---------- Back button ----------
  btnBack.addEventListener('click', function () {
    if (history.length > 1) history.back(); else navigate('home');
  });

  // ---------- Clics dentro del contenido: escuchar, copiar, quitar resaltado ----------
  app.addEventListener('click', function (e) {
    var target = e.target;
    var speakBtn = closestClass(target, 'btn-speak');
    if (speakBtn) { handleSpeak(speakBtn); return; }
    var copyBtn = closestClass(target, 'btn-copy');
    if (copyBtn) { handleCopy(copyBtn); return; }
    var markEl = closestMarkHl(target);
    if (markEl) {
      var key = findHlKey(markEl);
      var parent = markEl.parentNode;
      while (markEl.firstChild) parent.insertBefore(markEl.firstChild, markEl);
      parent.removeChild(markEl);
      persistSection(key);
      return;
    }
  });

  // ---------- Search ----------
  btnSearch.addEventListener('click', function () {
    if (location.hash !== '#/' && location.hash !== '') { location.hash = '#/'; }
    searchBar.hidden = !searchBar.hidden;
    if (!searchBar.hidden) { searchInput.focus(); }
  });
  var searchTimer = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    var v = searchInput.value;
    searchTimer = setTimeout(function () { renderHome(v); }, 120);
  });

  // ---------- Offline pill ----------
  setTimeout(function () { offlinePill.classList.add('hide'); }, 2600);

  // ---------- Initial render ----------
  render();

  // ---------- Splash screen ----------
  var splash = document.getElementById('splash');
  if (splash) {
    var hideSplash = function () {
      splash.classList.add('splash--hide');
      setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 550);
    };
    setTimeout(hideSplash, 1400);
  }

  // ---------- Service worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
