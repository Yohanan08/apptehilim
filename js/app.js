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
    var lang = btn.getAttribute('data-lang') || 'es';
    var content = app.querySelector('.section-content[data-hlkey="' + key + '"]');
    if (!content) return;
    var synth = window.speechSynthesis;
    var wasSpeaking = btn.classList.contains('speaking');
    synth.cancel();
    resetSpeakButtons();
    if (wasSpeaking) return;
    var texto = stripHtml(content.innerHTML);
    // El Nombre sagrado (יהוה) se escribe en hebreo incluso dentro del texto en
    // español/fonético; para la lectura en voz alta se dice "Adonai", como es costumbre.
    texto = texto.replace(/יהוה/g, lang === 'he' ? 'אֲדֹנָי' : 'Adonai');
    if (!texto.trim()) return;
    var utter = new SpeechSynthesisUtterance(texto);
    utter.lang = lang === 'he' ? 'he-IL' : 'es-ES';
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
    var html = '';
    if (!q) html += '<div class="daily">' + dailyCardHtml() + '</div>';
    html += '<h1 class="section-title">Índice de Salmos</h1><p class="section-sub">Cada Salmo en tarjetas de colores con porciones cortas que apuntan a Yeshúa HaMashíaj, más el estudio completo.</p>';

    if (!groups.length) {
      html += '<div class="empty-state">No se encontró ningún salmo para “' + escapeHtml(filterText) + '”.</div>';
    }

    groups.forEach(function (g) {
      html += '<section class="book-group"><h2 class="book-group__title">' + g.title + '</h2><div class="grid">';
      g.items.forEach(function (s) {
        var isQ = isNaN(parseInt(s.id, 10));
        var tc = SH.colorFor(s._index);
        html += '<button class="tile' + (isQ ? ' qumran' : '') + '" style="--t-a:' + tc.a + ';--t-b:' + tc.b + '" data-id="' + s.id + '">' + s.id + '</button>';
      });
      html += '</div></section>';
    });

    app.innerHTML = html;
    forEachEl(app.querySelectorAll('.tile'), function (btn) {
      btn.addEventListener('click', function () { navigate('salmo', btn.getAttribute('data-id')); });
    });
  }

  // ---------- Tarjetas ----------
  var CARDS = window.TEHILIM_CARDS || {};
  var SH = window.TehilimShare;
  var THEME_KEY = 'tehilim-theme';
  var currentTheme = 'arcoiris';
  try { currentTheme = localStorage.getItem(THEME_KEY) || 'arcoiris'; } catch (e) {}
  if (!SH.THEMES[currentTheme]) currentTheme = 'arcoiris';

  var SITE_URL = 'https://apptehilim.vercel.app/';
  function baseUrl() { return SITE_URL; }
  function salmoUrl(id) { return baseUrl() + '#/salmo/' + encodeURIComponent(id); }
  function cardUrl(id, i) { return baseUrl() + '#/salmo/' + encodeURIComponent(id) + '/t/' + (i + 1); }
  function salmoOffset(s) { return s._index * 3; } // cada Salmo arranca en un color distinto

  function cardStyle(theme, i) {
    var t = SH.THEMES[theme];
    var c;
    if (t.fixed) c = t.fixed;
    else if (t.aurora) { var c1 = SH.colorFor(i), c2 = SH.colorFor(i + 3); c = { a: c1.a, b: c2.b, mid: c2.a, accent: '#fbe3a2' }; }
    else c = SH.colorFor(i);
    var grad = 'linear-gradient(155deg,' + c.a + ' 0%,' + (c.mid ? c.mid + ' 55%,' : '') + c.b + ' 100%)';
    return '--c-bg:' + grad + ';--c-accent:' + c.accent + ';' + (t.light ? '--c-ink:' + (c.ink || '#14223b') + ';--c-panel:rgba(154,122,50,.12);' : '');
  }

  var toastEl = el('<div class="toast" role="status" hidden></div>');
  document.body.appendChild(toastEl);
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2400);
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(function () { fallbackCopy(t); });
    fallbackCopy(t); return Promise.resolve();
  }

  function cardHtml(s, c, i, total) {
    var data = CARDS[s.id];
    return '<article class="pcard' + (SH.THEMES[currentTheme].light ? ' pcard--light' : '') + '" style="' + cardStyle(currentTheme, i + salmoOffset(s)) + '" data-i="' + i + '">' +
      '<button type="button" class="pcard__body" data-act="zoom" aria-label="Agrandar tarjeta ' + (i + 1) + '">' +
        '<div class="pcard__head"><span class="pcard__ref">TEHILIM ' + s.id + (c.v ? ' · ' + c.v : '') + '</span><span class="pcard__num">' + (i + 1) + '/' + total + '</span></div>' +
        (data.h && i === 0 ? '<div class="pcard__heb" lang="he" dir="rtl">' + data.h + '</div>' : '') +
        '<p class="pcard__verse">“' + escapeHtml(c.t) + '”</p>' +
        '<div class="pcard__yeshua"><span>✦ En Yeshúa HaMashíaj ✦</span><p>' + escapeHtml(c.y) + '</p></div>' +
      '</button>' +
      '<div class="pcard__actions">' +
        '<button type="button" data-act="zoom" title="Agrandar"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Agrandar</button>' +
        '<button type="button" data-act="share" title="Compartir"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="19" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3" stroke="currentColor" stroke-width="2"/></svg>Compartir</button>' +
        '<button type="button" data-act="png" title="Descargar imagen"><svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Imagen</button>' +
        '<button type="button" data-act="link" title="Copiar enlace"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Enlace</button>' +
      '</div>' +
    '</article>';
  }

  function signatureHtml(s) {
    return '<section class="firma">' +
      '<img src="img/logo.png" alt="Yeshúa — La Torá Viviente · Ministerio Judío Mesiánico" class="firma__logo">' +
      '<div class="firma__star">✡</div>' +
      '<p class="firma__name">' + SH.FIRMA_1 + '</p>' +
      '<p class="firma__role">compañero de labores en<br>Adonai Yeshúa Melej HaMashíaj</p>' +
      '<p class="firma__min">' + SH.MINISTERIO + '<br><small>' + SH.MINISTERIO_2 + '</small></p>' +
    '</section>';
  }

  function themePickerHtml() {
    var h = '<div class="themes" role="radiogroup" aria-label="Colores para descargar">';
    Object.keys(SH.THEMES).forEach(function (k) {
      var t = SH.THEMES[k];
      h += '<button type="button" role="radio" aria-checked="' + (k === currentTheme) + '" class="theme-chip theme-chip--' + k + (k === currentTheme ? ' is-on' : '') + '" data-theme="' + k + '"><i></i>' + t.label + '</button>';
    });
    return h + '</div>';
  }

  function renderSalmoCards(s) {
    var data = CARDS[s.id];
    var list = data ? data.c : [];
    var h = '<div class="cards-tools">' +
      '<p class="cards-tools__lead">' + list.length + ' porciones cortas, cada una conectada con Yeshúa HaMashíaj. Toca una tarjeta para agrandarla.</p>' +
      themePickerHtml() +
      '<div class="cards-tools__row">' +
        '<button type="button" class="btn-gold" id="btn-pdf"><svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Descargar Salmo (PDF)</button>' +
        '<button type="button" class="btn-outline" id="btn-share-salmo">Compartir Salmo</button>' +
      '</div>' +
    '</div>';
    h += '<div class="cards-list">';
    list.forEach(function (c, i) { h += cardHtml(s, c, i, list.length); });
    h += '</div>';
    h += signatureHtml(s);
    return h;
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.classList.add('is-busy'); if (label) btn.textContent = label; }
    else { btn.disabled = false; btn.classList.remove('is-busy'); if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }

  function cardOpts(s, i) {
    var data = CARDS[s.id];
    return { salmoId: s.id, hebTitle: data.h, card: data.c[i], index: i, total: data.c.length, theme: currentTheme, url: cardUrl(s.id, i), offset: salmoOffset(s) };
  }
  function fileBase(s) { return 'Tehilim-' + s.id; }

  function doCardImage(s, i, btn, mode) {
    busy(btn, true, mode === 'share' ? 'Preparando…' : 'Creando…');
    return SH.cardImage(cardOpts(s, i)).then(function (blob) {
      var name = fileBase(s) + '-' + (i + 1) + '.png';
      if (mode === 'share') {
        return SH.share(blob, name, 'Tehilim ' + s.id + (CARDS[s.id].c[i].v ? ':' + CARDS[s.id].c[i].v : '') + ' — ' + SH.MINISTERIO, cardUrl(s.id, i))
          .then(function (r) { if (r === 'downloaded') toast('Imagen descargada'); });
      }
      SH.download(blob, name); toast('Imagen descargada');
    }).catch(function () { toast('No se pudo crear la imagen'); })
      .then(function () { busy(btn, false); });
  }
  function doSalmoPdf(s, btn, mode) {
    busy(btn, true, 'Creando PDF…');
    var data = CARDS[s.id];
    return SH.salmoPdf({ salmoId: s.id, hebTitle: data.h, cards: data.c, theme: currentTheme, url: salmoUrl(s.id), offset: salmoOffset(s) })
      .then(function (blob) {
        var name = fileBase(s) + '-' + currentTheme + '.pdf';
        if (mode === 'share') return SH.share(blob, name, 'Tehilim ' + s.id + ' — ' + SH.MINISTERIO, salmoUrl(s.id)).then(function (r) { if (r === 'downloaded') toast('PDF descargado'); });
        SH.download(blob, name); toast('PDF descargado');
      }).catch(function () { toast('No se pudo crear el PDF'); })
      .then(function () { busy(btn, false); });
  }

  // ---------- Vista ampliada ----------
  var zoom = el(
    '<div class="zoom" hidden role="dialog" aria-modal="true" aria-label="Tarjeta ampliada">' +
      '<div class="zoom__top">' +
        '<button type="button" class="zoom__btn" data-z="close" aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
        '<span class="zoom__count"></span>' +
        '<button type="button" class="zoom__btn" data-z="minus" aria-label="Letra más pequeña">A−</button>' +
        '<button type="button" class="zoom__btn" data-z="plus" aria-label="Letra más grande">A+</button>' +
      '</div>' +
      '<div class="zoom__stage"></div>' +
      '<div class="zoom__nav">' +
        '<button type="button" class="zoom__btn" data-z="prev" aria-label="Anterior"><svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<button type="button" class="zoom__act" data-z="share">Compartir</button>' +
        '<button type="button" class="zoom__act" data-z="png">Imagen</button>' +
        '<button type="button" class="zoom__act" data-z="study">Salmo completo</button>' +
        '<button type="button" class="zoom__btn" data-z="next" aria-label="Siguiente"><svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div>' +
    '</div>');
  document.body.appendChild(zoom);
  var zState = { s: null, i: 0, scale: 1 };
  try { zState.scale = parseFloat(localStorage.getItem('tehilim-zoom')) || 1; } catch (e) {}

  function renderZoom() {
    var s = zState.s, data = CARDS[s.id], c = data.c[zState.i];
    var stage = zoom.querySelector('.zoom__stage');
    stage.innerHTML = '<article class="pcard pcard--big' + (SH.THEMES[currentTheme].light ? ' pcard--light' : '') + '" style="' + cardStyle(currentTheme, zState.i + salmoOffset(s)) + ';font-size:' + zState.scale + 'rem">' +
      '<div class="pcard__body">' +
        '<div class="pcard__head"><span class="pcard__ref">TEHILIM ' + s.id + (c.v ? ' · ' + c.v : '') + '</span></div>' +
        (data.h ? '<div class="pcard__heb" lang="he" dir="rtl">' + data.h + '</div>' : '') +
        '<p class="pcard__verse">“' + escapeHtml(c.t) + '”</p>' +
        '<div class="pcard__yeshua"><span>✦ En Yeshúa HaMashíaj ✦</span><p>' + escapeHtml(c.y) + '</p></div>' +
        '<div class="pcard__sig">' + SH.FIRMA_1 + ' · <em>' + SH.FIRMA_2 + '</em><br><b>' + SH.MINISTERIO + '</b></div>' +
      '</div></article>';
    zoom.querySelector('.zoom__count').textContent = (zState.i + 1) + ' / ' + data.c.length;
    zoom.querySelector('[data-z="prev"]').disabled = zState.i === 0;
    zoom.querySelector('[data-z="next"]').disabled = zState.i === data.c.length - 1;
    stage.scrollTop = 0;
  }
  function openZoom(s, i) {
    zState.s = s; zState.i = Math.max(0, Math.min(i, CARDS[s.id].c.length - 1));
    renderZoom(); zoom.hidden = false; document.body.classList.add('no-scroll');
  }
  function closeZoom() {
    if (zoom.hidden) return;
    zoom.hidden = true; document.body.classList.remove('no-scroll');
    var cardEl = app.querySelector('.pcard[data-i="' + zState.i + '"]');
    if (cardEl && cardEl.scrollIntoView) cardEl.scrollIntoView({ block: 'center' });
    if (/\/t\/\d+$/.test(location.hash)) history.replaceState(null, '', '#/salmo/' + encodeURIComponent(zState.s.id));
  }
  function stepZoom(d) {
    var n = zState.i + d;
    if (n < 0 || n >= CARDS[zState.s.id].c.length) return;
    zState.i = n; renderZoom();
  }
  zoom.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-z]') : null;
    if (!b) { if (e.target === zoom || e.target.classList.contains('zoom__stage')) closeZoom(); return; }
    var z = b.getAttribute('data-z');
    if (z === 'close') closeZoom();
    else if (z === 'prev') stepZoom(-1);
    else if (z === 'next') stepZoom(1);
    else if (z === 'plus' || z === 'minus') {
      zState.scale = Math.max(0.8, Math.min(1.8, zState.scale + (z === 'plus' ? 0.12 : -0.12)));
      try { localStorage.setItem('tehilim-zoom', zState.scale); } catch (err) {}
      renderZoom();
    }
    else if (z === 'share') doCardImage(zState.s, zState.i, b, 'share');
    else if (z === 'png') doCardImage(zState.s, zState.i, b, 'png');
    else if (z === 'study') { var id = zState.s.id; closeZoom(); navigate('estudio', id); }
  });
  document.addEventListener('keydown', function (e) {
    if (zoom.hidden) return;
    if (e.key === 'Escape') closeZoom();
    else if (e.key === 'ArrowRight') stepZoom(1);
    else if (e.key === 'ArrowLeft') stepZoom(-1);
  });
  // deslizar para cambiar de tarjeta
  (function () {
    var x0 = null, y0 = null;
    zoom.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    zoom.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) stepZoom(dx < 0 ? 1 : -1);
      x0 = null;
    });
  })();

  function bindCards(s) {
    var list = app.querySelector('.cards-list');
    if (list) list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var i = +b.closest('.pcard').getAttribute('data-i');
      var act = b.getAttribute('data-act');
      if (act === 'zoom') openZoom(s, i);
      else if (act === 'share') doCardImage(s, i, b, 'share');
      else if (act === 'png') doCardImage(s, i, b, 'png');
      else if (act === 'link') copyText(cardUrl(s.id, i)).then(function () { toast('Enlace copiado'); });
    });
    forEachEl(app.querySelectorAll('.theme-chip'), function (b) {
      b.addEventListener('click', function () {
        currentTheme = b.getAttribute('data-theme');
        try { localStorage.setItem(THEME_KEY, currentTheme); } catch (e) {}
        var y = window.scrollY;
        renderSalmo(s.id, 'tarjetas');
        window.scrollTo(0, y);
      });
    });
    var pdf = document.getElementById('btn-pdf');
    if (pdf) pdf.addEventListener('click', function () { doSalmoPdf(s, pdf, 'download'); });
    var sh = document.getElementById('btn-share-salmo');
    if (sh) sh.addEventListener('click', function () { doSalmoPdf(s, sh, 'share'); });
  }

  function renderSalmo(id, mode, cardIdx) {
    var s = BY_ID[id];
    if (!s) { navigate('home'); return; }
    mode = mode || 'tarjetas';
    btnBack.hidden = false;
    titleEl.innerHTML = 'SALMO <span>' + s.id + '</span>';

    var html = '';
    var heb = CARDS[s.id] && CARDS[s.id].h;
    html += '<div class="salmo-head"><div class="salmo-head__num">MIZMOR · SALMO ' + s.id + '</div>';
    html += '<h2>Tehilim ' + s.id + (heb ? ' <span class="salmo-head__heb" lang="he">' + heb + '</span>' : '') + '</h2>';
    if (s.subtitle_html) html += '<div class="salmo-head__subtitle">' + s.subtitle_html + '</div>';
    html += '</div>';

    html += '<div class="tabs" role="tablist">' +
      '<a role="tab" aria-selected="' + (mode === 'tarjetas') + '" class="tab' + (mode === 'tarjetas' ? ' is-on' : '') + '" href="#/salmo/' + encodeURIComponent(s.id) + '">Tarjetas</a>' +
      '<a role="tab" aria-selected="' + (mode === 'estudio') + '" class="tab' + (mode === 'estudio' ? ' is-on' : '') + '" href="#/salmo/' + encodeURIComponent(s.id) + '/estudio">Estudio completo</a>' +
    '</div>';

    if (mode === 'tarjetas') {
      html += renderSalmoCards(s);
    } else {
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
              '<button type="button" class="mini-btn btn-speak" data-key="' + key + '" data-lang="' + (sec.title === 'Texto Hebreo' ? 'he' : 'es') + '">🔊 Escuchar</button>' +
              '<button type="button" class="mini-btn btn-copy" data-key="' + key + '">📋 Copiar</button>' +
            '</div>' +
            '<div class="section-content" data-hlkey="' + key + '">' + bodyHtml + '</div>' +
          '</div>' +
          '</details>';
      });
      html += signatureHtml(s);
    }

    html += '<div class="pager">' +
      '<button id="prev-salmo" ' + (s._index === 0 ? 'disabled' : '') + '>' +
        '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Anterior</button>' +
      '<button id="next-salmo" ' + (s._index === SALMOS.length - 1 ? 'disabled' : '') + '>' +
        'Siguiente <svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div>';

    app.innerHTML = html;
    window.scrollTo(0, 0);

    var prevBtn = document.getElementById('prev-salmo');
    var nextBtn = document.getElementById('next-salmo');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (s._index > 0) navigate(mode === 'estudio' ? 'estudio' : 'salmo', SALMOS[s._index - 1].id);
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (s._index < SALMOS.length - 1) navigate(mode === 'estudio' ? 'estudio' : 'salmo', SALMOS[s._index + 1].id);
    });
    if (mode === 'tarjetas') {
      bindCards(s);
      if (cardIdx != null && CARDS[s.id]) openZoom(s, cardIdx);
    }
  }

  // Porción del día (en el índice)
  function dailyCardHtml() {
    var d = new Date();
    var dayNum = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    var all = SALMOS.filter(function (s) { return CARDS[s.id] && CARDS[s.id].c.length; });
    var s = all[(dayNum * 7) % all.length];
    var i = dayNum % CARDS[s.id].c.length;
    var c = CARDS[s.id].c[i];
    return '<a class="pcard pcard--daily" style="' + cardStyle('arcoiris', dayNum) + '" href="#/salmo/' + encodeURIComponent(s.id) + '/t/' + (i + 1) + '">' +
      '<div class="pcard__body">' +
        '<div class="pcard__head"><span class="pcard__ref">PORCIÓN DEL DÍA · TEHILIM ' + s.id + (c.v ? ':' + c.v : '') + '</span></div>' +
        '<p class="pcard__verse">“' + escapeHtml(c.t) + '”</p>' +
        '<div class="pcard__yeshua"><span>✦ En Yeshúa HaMashíaj ✦</span><p>' + escapeHtml(c.y) + '</p></div>' +
        '<div class="pcard__cta">Abrir tarjeta →</div>' +
      '</div></a>';
  }

  function renderInfo(which) {
    btnBack.hidden = false;
    titleEl.innerHTML = which === 'front' ? 'Introducción' : 'Bibliografía';
    var html = '<div class="info-page">' + (which === 'front' ? DATA.frontmatter_html : DATA.backmatter_html) + '</div>';
    app.innerHTML = html;
  }

  // ---------- Routing ----------
  function navigate(view, id) {
    var hash = view === 'home' ? '#/' : view === 'salmo' ? '#/salmo/' + encodeURIComponent(id) : view === 'estudio' ? '#/salmo/' + encodeURIComponent(id) + '/estudio' : '#/' + view;
    if (location.hash === hash) { render(); }
    else { location.hash = hash; }
  }

  function render() {
    if (typeof closeZoom === 'function' && !zoom.hidden) { zoom.hidden = true; document.body.classList.remove('no-scroll'); }
    closeMenu();
    searchBar.hidden = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hideHlToolbar();
    var hash = location.hash || '#/';
    var m;
    if ((m = hash.match(/^#\/salmo\/([^/]+)\/t\/(\d+)$/))) {
      renderSalmo(decodeURIComponent(m[1]), 'tarjetas', parseInt(m[2], 10) - 1);
    } else if ((m = hash.match(/^#\/salmo\/([^/]+)\/estudio$/))) {
      renderSalmo(decodeURIComponent(m[1]), 'estudio');
    } else if ((m = hash.match(/^#\/salmo\/([^/]+)$/))) {
      renderSalmo(decodeURIComponent(m[1]), 'tarjetas');
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
