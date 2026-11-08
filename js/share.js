/* Tehilim — tarjetas para compartir: dibujo en canvas (PNG), PDF por Salmo y compartir.
   Sin librerías externas: todo funciona sin conexión. */
(function () {
  'use strict';

  var FIRMA_1 = 'Yohanan ben Israel';
  var FIRMA_2 = 'compañero de labores en Adonai Yeshúa Melej HaMashíaj';
  var MINISTERIO = 'Yeshúa — La Torá Viviente';
  var MINISTERIO_2 = 'Ministerio Judío Mesiánico';

  // Paleta de las tarjetas: cada porción con un color distinto, siempre con acento oro.
  var PALETTE = [
    { name: 'Zafiro',     a: '#1f4aa8', b: '#0b1a30', accent: '#f0d28a' },
    { name: 'Púrpura',    a: '#6d28d9', b: '#2a0f5c', accent: '#f3d98f' },
    { name: 'Esmeralda',  a: '#0f8a66', b: '#063b30', accent: '#f1d68c' },
    { name: 'Carmesí',    a: '#b4232f', b: '#4a0a1a', accent: '#f6d78f' },
    { name: 'Turquesa',   a: '#0b7f9c', b: '#082f45', accent: '#f2d58a' },
    { name: 'Granada',    a: '#be1e68', b: '#4d0628', accent: '#f6d995' },
    { name: 'Índigo',     a: '#4f46e5', b: '#1b1850', accent: '#f0d28a' },
    { name: 'Ámbar',      a: '#b8620b', b: '#4a1d04', accent: '#fde3a0' },
    { name: 'Olivo',      a: '#4f7a12', b: '#1b2c06', accent: '#f3dc96' },
    { name: 'Cobre',      a: '#c2471a', b: '#47140a', accent: '#fbe0a0' }
  ];

  // Temas de descarga ("formato de colores especiales")
  var THEMES = {
    arcoiris:  { label: 'Arcoíris', desc: 'Cada tarjeta de un color' },
    real:      { label: 'Real', desc: 'Azul real y oro', fixed: { a: '#132747', b: '#070f1d', accent: '#e2c17a' } },
    pergamino: { label: 'Pergamino', desc: 'Marfil, azul y oro', light: true, fixed: { a: '#fbf6ea', b: '#efe3c6', accent: '#9a7a32', ink: '#14223b' } },
    aurora:    { label: 'Aurora', desc: 'Degradado multicolor', aurora: true }
  };

  function colorFor(i) { return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length]; }

  function themeColors(theme, i) {
    var t = THEMES[theme] || THEMES.arcoiris;
    if (t.fixed) return t.fixed;
    if (t.aurora) {
      var c1 = colorFor(i), c2 = colorFor(i + 3);
      return { a: c1.a, b: c2.b, mid: c2.a, accent: '#fbe3a2' };
    }
    return colorFor(i);
  }

  // ---------- Fuentes ----------
  var SERIF = '"Cormorant Garamond", "Frank Ruhl Libre", Georgia, serif';
  var SANS = 'Montserrat, "Segoe UI", Roboto, Arial, sans-serif';
  var HEB = '"Frank Ruhl Libre", "Times New Roman", serif';
  var fontsReady = null;
  function loadFonts() {
    if (fontsReady) return fontsReady;
    if (!document.fonts || !document.fonts.load) { fontsReady = Promise.resolve(); return fontsReady; }
    fontsReady = Promise.all([
      document.fonts.load('600 40px "Cormorant Garamond"'),
      document.fonts.load('italic 500 40px "Cormorant Garamond"'),
      document.fonts.load('700 40px "Cormorant Garamond"'),
      document.fonts.load('600 20px Montserrat'),
      document.fonts.load('700 20px Montserrat'),
      document.fonts.load('700 40px "Frank Ruhl Libre"', 'תהלים')
    ]).catch(function () {});
    return fontsReady;
  }

  var logoImg = null;
  function loadLogo() {
    if (logoImg) return logoImg;
    logoImg = new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = 'img/logo.png';
    });
    return logoImg;
  }

  // ---------- Utilidades de dibujo ----------
  function wrap(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function star(ctx, cx, cy, r, color) { // Maguen David
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, r / 7);
    for (var t = 0; t < 2; t++) {
      ctx.beginPath();
      for (var k = 0; k < 3; k++) {
        var ang = -Math.PI / 2 + t * Math.PI + k * 2 * Math.PI / 3;
        var x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }

  function paintBackground(ctx, W, H, col, light) {
    var g = ctx.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, col.a);
    if (col.mid) g.addColorStop(0.55, col.mid);
    g.addColorStop(1, col.b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // brillo suave
    var r = ctx.createRadialGradient(W * 0.82, H * 0.12, 10, W * 0.82, H * 0.12, W * 0.9);
    r.addColorStop(0, light ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.16)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    // estrella de fondo, muy tenue
    star(ctx, W * 0.86, H * 0.9, W * 0.32, light ? 'rgba(154,122,50,.08)' : 'rgba(255,255,255,.05)');
    // marco oro
    ctx.save();
    ctx.strokeStyle = hexA(col.accent, light ? 0.75 : 0.7); ctx.lineWidth = 3;
    roundRect(ctx, 36, 36, W - 72, H - 72, 28); ctx.stroke();
    ctx.strokeStyle = hexA(col.accent, 0.3); ctx.lineWidth = 1.5;
    roundRect(ctx, 50, 50, W - 100, H - 100, 20); ctx.stroke();
    ctx.restore();
  }

  function shortUrl(url) { return url.replace(/^https?:\/\//, '').replace(/\/index\.html/, '/'); }

  /* Dibuja una tarjeta. opts: { salmoId, hebTitle, card:{v,t,y}, index, total, theme, url } */
  function drawCard(opts) {
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var light = !!(THEMES[opts.theme] || {}).light;
    var col = themeColors(opts.theme, opts.index + (opts.offset || 0));
    var ink = light ? (col.ink || '#14223b') : '#fffaf0';
    var soft = light ? 'rgba(20,34,59,.72)' : 'rgba(255,250,240,.78)';
    paintBackground(ctx, W, H, col, light);

    var padX = 110, maxW = W - padX * 2;
    ctx.textBaseline = 'alphabetic';
    // Encabezado
    ctx.textAlign = 'center';
    if (opts.hebTitle) {
      ctx.fillStyle = col.accent; ctx.font = '700 58px ' + HEB;
      ctx.direction = 'rtl'; ctx.fillText(opts.hebTitle, W / 2, 158); ctx.direction = 'ltr';
    }
    ctx.fillStyle = ink; ctx.font = '700 26px ' + SANS;
    var label = (/^\d+$/.test(opts.salmoId) ? 'TEHILIM ' + opts.salmoId : 'QUMRÁN · ' + opts.salmoId.replace(/^Q/, '')) + (opts.card.v ? '  ·  ' + opts.card.v : '');
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.fillText(label, W / 2, 212);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    // línea ornamental
    ctx.strokeStyle = hexA(col.accent, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2 - 150, 246); ctx.lineTo(W / 2 - 22, 246); ctx.moveTo(W / 2 + 22, 246); ctx.lineTo(W / 2 + 150, 246); ctx.stroke();
    star(ctx, W / 2, 246, 13, col.accent);

    // Zonas
    var footerTop = H - 250;
    var top = 300;
    var yLabelH = 70;

    // Ajuste automático de tamaño de letra para que todo quepa
    var vSize = 66, ySize = 36, vLines, yLines, vLH, yLH, total;
    for (; vSize >= 28; vSize -= 2) {
      ySize = Math.max(26, Math.min(40, Math.round(vSize * 0.72)));
      ctx.font = '600 ' + vSize + 'px ' + SERIF; vLines = wrap(ctx, '“' + opts.card.t + '”', maxW);
      ctx.font = 'italic 500 ' + ySize + 'px ' + SERIF; yLines = wrap(ctx, opts.card.y, maxW - 70);
      vLH = vSize * 1.28; yLH = ySize * 1.3;
      total = vLines.length * vLH + 50 + yLabelH + yLines.length * yLH + 60;
      if (top + total <= footerTop - 20) break;
    }
    // centrar verticalmente el bloque
    var y = top + Math.max(0, ((footerTop - 20) - top - total) / 2);

    ctx.textAlign = 'center';
    ctx.fillStyle = ink; ctx.font = '600 ' + vSize + 'px ' + SERIF;
    vLines.forEach(function (ln) { y += vLH; ctx.fillText(ln, W / 2, y - vLH * 0.22); });

    // Panel Yeshúa
    y += 40;
    var panelH = yLabelH + yLines.length * yLH + 40;
    ctx.save();
    ctx.fillStyle = light ? 'rgba(154,122,50,.12)' : 'rgba(0,0,0,.24)';
    roundRect(ctx, padX - 20, y, maxW + 40, panelH, 26); ctx.fill();
    ctx.strokeStyle = hexA(col.accent, 0.55); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    ctx.fillStyle = col.accent; ctx.font = '700 23px ' + SANS;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillText('✦  EN YESHÚA HAMASHÍAJ  ✦', W / 2, y + 52);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = ink; ctx.font = 'italic 500 ' + ySize + 'px ' + SERIF;
    var yy = y + yLabelH + 8;
    yLines.forEach(function (ln) { yy += yLH; ctx.fillText(ln, W / 2, yy - yLH * 0.25); });

    // Pie: firma, ministerio y enlace
    var fy = H - 205;
    ctx.strokeStyle = hexA(col.accent, 0.45); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(padX, fy); ctx.lineTo(W - padX, fy); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '700 30px ' + SERIF;
    ctx.fillText(FIRMA_1, W / 2, fy + 44);
    ctx.fillStyle = soft; ctx.font = 'italic 500 26px ' + SERIF;
    ctx.fillText(FIRMA_2, W / 2, fy + 78);
    ctx.fillStyle = col.accent; ctx.font = '700 20px ' + SANS;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillText((MINISTERIO + ' · ' + MINISTERIO_2).toUpperCase(), W / 2, fy + 114);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    if (opts.url) {
      ctx.fillStyle = soft; ctx.font = '600 21px ' + SANS;
      var u = shortUrl(opts.url);
      ctx.font = '600 21px ' + SANS;
      while (ctx.measureText(u).width > maxW && u.length > 20) u = u.slice(0, -2);
      ctx.fillText(u, W / 2, fy + 148);
    }
    if (opts.total) {
      ctx.textAlign = 'right'; ctx.fillStyle = hexA(col.accent, .85); ctx.font = '600 19px ' + SANS;
      ctx.fillText((opts.index + 1) + ' / ' + opts.total, W - 78, 100);
    }
    return cv;
  }

  /* Página/tarjeta final de firma (se agrega al final de cada Salmo) */
  function drawSignature(opts, logo) {
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var light = !!(THEMES[opts.theme] || {}).light;
    var col = light ? THEMES.pergamino.fixed : { a: '#132747', b: '#070f1d', accent: '#e2c17a' };
    var ink = light ? '#14223b' : '#fffaf0';
    paintBackground(ctx, W, H, col, light);
    ctx.textAlign = 'center';
    var y = 250;
    if (logo) {
      var lw = 900, lh = lw * logo.height / logo.width;
      ctx.save(); roundRect(ctx, (W - lw) / 2, y, lw, lh, 14); ctx.clip();
      ctx.drawImage(logo, (W - lw) / 2, y, lw, lh); ctx.restore();
      y += lh + 110;
    } else {
      ctx.fillStyle = col.accent; ctx.font = '700 64px ' + SERIF; ctx.fillText(MINISTERIO, W / 2, y + 60); y += 160;
    }
    if (opts.hebTitle) { ctx.fillStyle = col.accent; ctx.font = '700 64px ' + HEB; ctx.direction = 'rtl'; ctx.fillText(opts.hebTitle, W / 2, y); ctx.direction = 'ltr'; y += 70; }
    ctx.fillStyle = ink; ctx.font = '700 34px ' + SANS;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.fillText('TEHILIM ' + opts.salmoId, W / 2, y); y += 90;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    star(ctx, W / 2, y, 30, col.accent); y += 110;
    ctx.fillStyle = ink; ctx.font = '700 58px ' + SERIF; ctx.fillText(FIRMA_1, W / 2, y); y += 62;
    ctx.font = 'italic 500 40px ' + SERIF;
    ctx.fillText('compañero de labores en', W / 2, y); y += 50;
    ctx.fillText('Adonai Yeshúa Melej HaMashíaj', W / 2, y); y += 110;
    ctx.fillStyle = col.accent; ctx.font = '700 26px ' + SANS;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillText(MINISTERIO.toUpperCase(), W / 2, y); y += 40;
    ctx.font = '600 22px ' + SANS; ctx.fillText(MINISTERIO_2.toUpperCase(), W / 2, y); y += 70;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    if (opts.url) { ctx.fillStyle = light ? 'rgba(20,34,59,.75)' : 'rgba(255,250,240,.8)'; ctx.font = '600 24px ' + SANS; ctx.fillText(shortUrl(opts.url), W / 2, y); }
    return cv;
  }

  // ---------- PDF mínimo (una imagen JPEG por página) ----------
  function dataUrlToBytes(d) {
    var b = atob(d.split(',')[1]); var a = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }
  function buildPdf(canvases, title) {
    var enc = new TextEncoder();
    var chunks = [], offsets = [], pos = 0;
    function push(x) { var u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); pos += u.length; }
    var PW = 540, PH = 675;
    var n = canvases.length;
    // objetos: 1 catalog, 2 pages, 3 info, luego por página: page, content, image
    var objCount = 3 + n * 3;
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    function obj(id, body) { offsets[id] = pos; push(id + ' 0 obj\n'); body(); push('\nendobj\n'); }
    var kids = [];
    for (var i = 0; i < n; i++) kids.push((4 + i * 3) + ' 0 R');
    obj(1, function () { push('<< /Type /Catalog /Pages 2 0 R >>'); });
    obj(2, function () { push('<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>'); });
    function pdfStr(s) { // texto UTF-16BE en hex
      var h = 'FEFF';
      for (var i = 0; i < s.length; i++) h += ('000' + s.charCodeAt(i).toString(16)).slice(-4);
      return '<' + h.toUpperCase() + '>';
    }
    obj(3, function () { push('<< /Title ' + pdfStr(title) + ' /Author ' + pdfStr(FIRMA_1 + ' — ' + MINISTERIO) + ' /Creator (Tehilim App) >>'); });
    canvases.forEach(function (cv, i) {
      var pid = 4 + i * 3, cid = pid + 1, iid = pid + 2;
      var jpg = dataUrlToBytes(cv.toDataURL('image/jpeg', 0.9));
      var content = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im' + i + ' Do Q';
      obj(pid, function () { push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im' + i + ' ' + iid + ' 0 R >> >> /Contents ' + cid + ' 0 R >>'); });
      obj(cid, function () { push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'); });
      obj(iid, function () {
        push('<< /Type /XObject /Subtype /Image /Width ' + cv.width + ' /Height ' + cv.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n');
        push(jpg); push('\nendstream');
      });
    });
    var xref = pos;
    var x = 'xref\n0 ' + (objCount + 1) + '\n0000000000 65535 f \n';
    for (var k = 1; k <= objCount; k++) x += ('0000000000' + offsets[k]).slice(-10) + ' 00000 n \n';
    push(x);
    push('trailer\n<< /Size ' + (objCount + 1) + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  // ---------- Guardar / compartir ----------
  function canvasToBlob(cv) {
    return new Promise(function (res) {
      if (cv.toBlob) cv.toBlob(function (b) { res(b); }, 'image/png');
      else res(new Blob([dataUrlToBytes(cv.toDataURL('image/png'))], { type: 'image/png' }));
    });
  }
  function download(blob, name) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function share(blob, name, text, url) {
    var file;
    try { file = new File([blob], name, { type: blob.type }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: name, text: text + (url ? '\n' + url : '') }).then(function () { return 'shared'; })
        .catch(function (e) { if (e && e.name === 'AbortError') return 'cancel'; download(blob, name); return 'downloaded'; });
    }
    if (navigator.share && url) {
      return navigator.share({ title: name, text: text, url: url }).then(function () { return 'shared-link'; })
        .catch(function (e) { if (e && e.name === 'AbortError') return 'cancel'; download(blob, name); return 'downloaded'; });
    }
    download(blob, name);
    return Promise.resolve('downloaded');
  }

  function cardImage(opts) {
    return loadFonts().then(function () { return canvasToBlob(drawCard(opts)); });
  }
  function salmoPdf(opts) { // opts: salmoId, hebTitle, cards, theme, url
    return Promise.all([loadFonts(), loadLogo()]).then(function (r) {
      var logo = r[1];
      var cvs = opts.cards.map(function (c, i) {
        return drawCard({ salmoId: opts.salmoId, hebTitle: opts.hebTitle, card: c, index: i, total: opts.cards.length, theme: opts.theme, url: opts.url, offset: opts.offset });
      });
      cvs.push(drawSignature(opts, logo));
      return buildPdf(cvs, 'Tehilim ' + opts.salmoId + ' — ' + MINISTERIO);
    });
  }
  function signatureImage(opts) {
    return Promise.all([loadFonts(), loadLogo()]).then(function (r) { return canvasToBlob(drawSignature(opts, r[1])); });
  }

  window.TehilimShare = {
    PALETTE: PALETTE, THEMES: THEMES, colorFor: colorFor,
    FIRMA_1: FIRMA_1, FIRMA_2: FIRMA_2, MINISTERIO: MINISTERIO, MINISTERIO_2: MINISTERIO_2,
    loadFonts: loadFonts, drawCard: drawCard, drawSignature: drawSignature,
    cardImage: cardImage, salmoPdf: salmoPdf, signatureImage: signatureImage,
    download: download, share: share
  };
})();
