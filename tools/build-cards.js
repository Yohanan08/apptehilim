// Genera data/cards.js: porciones cortas de cada Salmo + una línea de conexión con Yeshúa HaMashíaj
// sacada del propio estudio (Profecías Cumplidas, Cumplimiento Profético, Brit Hadashá).
// Uso: node build-cards.js <ruta/data.js> <ruta/salida/cards.js>
const fs = require('fs');
global.window = global;
require(require('path').resolve(process.argv[2]));
const D = global.TEHILIM_DATA;

const ent = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const strip = h => ent(h.normalize('NFC').replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|li|h\d|blockquote)>/g, '\n').replace(/<[^>]+>/g, ''));
const clean = s => s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?»”)])/g, '$1').replace(/([¿¡«“(])\s+/g, '$1').trim();
const sec = (s, t) => (s.sections.find(x => x.title.indexOf(t) === 0) || { html: '' }).html;

// ---------- Versículos ----------
function versesOf(s) {
  const txt = strip(sec(s, 'Traducción Literal')).replace(/^\s*Biblia Torah Viviente\s*/i, '');
  const parts = txt.split(/\[(\d+)\]/);
  const verses = [];
  for (let i = 1; i < parts.length; i += 2) {
    let t = clean(parts[i + 1].replace(/\n/g, ' '));
    // quita encabezados de estrofa sueltos (p. ej. "Bet" en el Salmo 119) al final del versículo
    t = t.replace(/\s+(Alef|Bet|Guimel|Guímel|Dalet|Dálet|He|Hei|Vav|Zayin|Jet|Tet|Yod|Kaf|Lamed|Mem|Nun|Samej|Ayin|Pe|Tzade|Tsade|Qof|Kof|Resh|Shin|Tav)\s*$/i, '');
    t = t.replace(/^(Alef|Bet|Guimel|Dalet|He|Vav|Zayin|Jet|Tet|Yod|Kaf|Lamed|Mem|Nun|Samej|Ayin|Pe|Tzade|Qof|Resh|Shin|Tav)\s+(?=[¡¿A-ZÁÉÍÓÚÑ])/, '');
    t = t.replace(/\s*(TEHILIM|SEFER|LIBRO|DIA \d).*$/, ''); // encabezados de libro pegados al último versículo
    t = t.replace(/(^|\s)\d{1,3}-\s+/g, '$1'); // numeración interna tipo "1- "
    t = t.replace(/\s*-?\s*(?<![\u0590-\u05FF])[\u05D0-\u05EA]\s*-?(?![\u0590-\u05FF])(?=\s|$|[.,;:])/g, ''); // letras acrósticas sueltas
    if (s.id === '119') t = t.replace(/(^|\s)(?:(?:Alef|Bet|Guimel|Guímel|Dalet|Dálet|Hei|Vav|Zayin|Jet|Tet|Yod|Kaf|Lamed|Mem|Nun|Samej|Ayin|Pe|Tzade|Tsade|Qof|Kof|Resh|Shin|Tav|Zain|Lámed|Pei|Tzadi|Kuf|Reish)(?:\s*-)?|He\s*-)(?=\s|$)/g, '$1').replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
    t = t.split('◆')[0].split(/Salmos de Qumr[aá]n/)[0];
    t = t.replace(/(^|\s)[A-ZÁÉÍÓÚ][a-záéíóú]{1,6}\s*\(\s*\)\s*/g, '$1').replace(/\(\s*\)/g, ''); // letra acróstica vacía "Vav ()"
    t = t.replace(/\s*"?\.\[\s*/g, '. ');
    t = t.replace(/\s*(?<![\u0590-\u05FF])[\u05D0-\u05EA](?![\u0590-\u05FF])/g, '').replace(/(^|\s)[A-ZÁÉÍÓÚ][a-záéíóú]{1,6}\s*\(\(?\s*\)?\)?\s*(?=[A-ZÁÉÍÓÚ¡¿])/g, '$1').replace(/¡!/g, '!').replace(/(^|\s)[A-ZÁÉÍÓÚ][a-záéíóú]{1,6}\s*\(\(?\s*$/, '');
    if ((t.match(/\[/g) || []).length !== (t.match(/\]/g) || []).length) t = t.replace(/[\[\]]/g, '');
    t = clean(t);
    if (t) verses.push({ n: +parts[i], t });
  }
  if (verses.length) return verses;
  // Salmos de Qumrán sin numeración: se dividen por oraciones
  const lines = txt.split('\n').map(clean).filter(Boolean).filter(l => !/^SALMO\s/i.test(l) && l.length > 25);
  const sentences = lines.join(' ').match(/[^.!?]+[.!?]+["»”]?|[^.!?]+$/g) || [];
  return sentences.map(x => clean(x).replace(/(^|[;:,.]\s)\d{1,2}\s(?=[a-záéíóúñA-ZÁÉÍÓÚÑ¿¡])/g, '$1').replace(/^\d{1,2}\s/, ''))
    .filter(x => x.length > 3 && !/cinco Salmos|Rollo de|Puede notarse/i.test(x)).map((t, i) => ({ n: null, t, i }));
}

function splitLong(verses) {
  const LIM = 330, out = [];
  verses.forEach(v => {
    if (v.t.length <= LIM) { out.push(v); return; }
    let pieces = splitSentences(v.t).filter(p => !/Masoret|biblias|Septuaginta|manuscrito|traducci[oó]n|texto fuente|Justino|Tertuliano|padres de la iglesia/i.test(p));
    // si una oración sigue siendo larga, se corta por ; o :
    pieces = pieces.flatMap(p => p.length <= LIM ? [p] : p.split(/(?<=[;:])\s+/));
    let buf = '';
    pieces.forEach(p => {
      if (buf && (buf + ' ' + p).length > 280) { out.push({ n: v.n, t: buf }); buf = p; }
      else buf = buf ? buf + ' ' + p : p;
    });
    if (buf) out.push({ n: v.n, t: buf });
  });
  return out;
}

function portionsOf(verses) {
  verses = splitLong(verses);
  const MAX = 270, MAXV = 3;
  const out = []; let cur = [];
  const len = a => a.reduce((n, v) => n + v.t.length + 1, 0);
  verses.forEach(v => {
    if (cur.length && (cur.length >= MAXV || len(cur) + v.t.length > MAX)) { out.push(cur); cur = []; }
    cur.push(v);
  });
  if (cur.length) {
    // evita una última tarjeta diminuta
    if (out.length && len(cur) < 70 && len(out[out.length - 1]) + len(cur) < MAX + 90 && out[out.length - 1].length < 4) out[out.length - 1] = out[out.length - 1].concat(cur);
    else out.push(cur);
  }
  return out;
}

// ---------- Líneas de conexión con Yeshúa ----------
const MESSIAH = /Yesh[úu]a|Mash[íi]aj|Mes[íi]as|Ungido|Hijo de David|Brit Hadash/;
const BAD_START = /^(Esto|Esta|Este|Estos|Estas|Ese|Eso|Ello|Allí|Aquí|Así|Pero|Sin embargo|Por eso|Por tanto|De esta|De este|De igual|En este sentido|En ese|Dicho|Tal|Lo mismo|Dicha|No se trata|Ambos|Ambas|Él|Ella|Ellos|En él|En ella|Su |Sus |Le |Les |Lo |La misma|El mismo|Aun así|Del mismo)\b/;
const CONNECTOR = /^(También|Además|Asimismo|Igualmente|Finalmente|Primero|Segundo|Tercero|Cuarto|Quinto|En primer lugar|En segundo lugar|Por otra parte|Por otro lado)[,:]?\s+/i;

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function verseRefs(text, id) {
  const refs = [];
  const re1 = /\b(?:vers[oí]culos?|versos?|vv?\.)\s*(\d+)(?:\s*[-–y]\s*(\d+))?/gi;
  let m;
  while ((m = re1.exec(text))) refs.push(+m[1]);
  const re2 = new RegExp('(?:Tehilim|Salmo)\\s+' + id + ':(\\d+)', 'g');
  while ((m = re2.exec(text))) refs.push(+m[1]);
  return refs;
}

function candidatesOf(s) {
  const pool = [];
  const seen = new Set();
  function add(raw, base, src) {
    let t = clean(raw.replace(/^\d+[.)]\s*/, '').replace(/^[•\-–—]\s*/, ''));
    t = t.replace(CONNECTOR, '');
    t = cap(t);
    if (!t || /completar/i.test(t)) return;
    if (t.length < 55 || t.length > 235) return;
    if (BAD_START.test(t)) return;
    if (!MESSIAH.test(t)) return;
    if (/[:;]$/.test(t)) return;
    if (!/[.!?)»”]$/.test(t)) t += '.';
    const key = t.toLowerCase().slice(0, 60);
    if (seen.has(key)) return;
    seen.add(key);
    let score = base;
    if (/Yesh[úu]a/.test(t)) score += 3;
    if (/\([^)]*\d+:\d+[^)]*\)/.test(t)) score += 2; // trae cita del Brit Hadashá
    if (/→|—/.test(t)) score += 2;
    score -= Math.abs(t.length - 150) / 60;
    pool.push({ t, score, verses: verseRefs(raw, s.id), src });
  }
  // 1) Profecías Cumplidas: líneas cortas tipo "X → cumplido en Yeshúa (Ref)" y oraciones
  const prof = strip(sec(s, 'Profecías Cumplidas')).split('\n').map(clean).filter(Boolean);
  prof.forEach(line => {
    if (/→| — | – /.test(line) && line.length < 240) add(line.replace(/\s*→\s*/g, ' → '), 9, 'prof');
    else splitSentences(line).forEach(x => add(x, 6, 'prof'));
  });
  // 2) Cumplimiento profético y 3) Brit Hadashá
  strip(sec(s, 'Cumplimiento Profético')).split('\n').forEach(p => splitSentences(p).forEach(x => add(x, 5, 'cump')));
  strip(sec(s, 'Conexión con el Brit Hadashá')).split('\n').forEach(p => splitSentences(p).forEach(x => add(x, 4, 'brit')));
  strip(sec(s, 'Impacto Profético')).split('\n').forEach(p => splitSentences(p).forEach(x => add(x, 2, 'imp')));
  return pool;
}

function splitSentences(p) {
  p = clean(p);
  // no partir dentro de referencias tipo "Juan 3:16." o abreviaturas "v. 4"
  const out = [];
  let buf = '';
  const tokens = p.split(/(?<=[.!?])\s+(?=[«“"¡¿]?[A-ZÁÉÍÓÚÑ])/);
  tokens.forEach(tk => {
    buf = buf ? buf + ' ' + tk : tk;
    if (/\b(v|vv|cf|p\. ej|etc)\.$/i.test(buf)) return;
    out.push(buf); buf = '';
  });
  if (buf) out.push(buf);
  return out;
}

function assign(portions, pool) {
  const used = new Set();
  const ordered = pool.slice().sort((a, b) => b.score - a.score);
  const res = portions.map(() => null);
  // primero: candidatos que citan un versículo de la porción
  portions.forEach((p, i) => {
    const nums = p.map(v => v.n).filter(n => n != null);
    const c = ordered.find(c => !used.has(c) && c.verses.some(n => nums.indexOf(n) !== -1));
    if (c) { res[i] = c; used.add(c); }
  });
  // después: los mejores restantes, en orden
  let rest = ordered.filter(c => !used.has(c));
  // mantener el orden del estudio para que fluya como el salmo
  const top = rest.slice(0, res.filter(x => !x).length);
  top.sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
  let k = 0;
  res.forEach((r, i) => { if (!r && top[k]) { res[i] = top[k++]; used.add(res[i]); } });
  // salmos largos: se reutilizan en ciclo
  const all = ordered;
  let j = 0;
  res.forEach((r, i) => { if (!r && all.length) { res[i] = all[j % all.length]; j++; } });
  return res.map(r => r ? r.t : 'Toda la Escritura da testimonio de Yeshúa HaMashíaj, la Torá Viviente (Juan 5:39).');
}

function hebTitle(s) {
  const m = strip(s.subtitle_html || '').match(/[֐-׿][֐-׿\s״׳"'·]*[֐-׿״׳]/);
  return m ? m[0].replace(/\s*·\s*$/, '').trim() : '';
}

const OUT = {};
const report = [];
D.salmos.forEach(s => {
  const verses = versesOf(s);
  const portions = portionsOf(verses);
  const pool = candidatesOf(s);
  const lines = assign(portions, pool);
  const cards = portions.map((p, i) => {
    const nums = p.map(v => v.n).filter(n => n != null);
    const label = nums.length ? (nums.length > 1 ? nums[0] + '–' + nums[nums.length - 1] : '' + nums[0]) : '';
    let tt = p.map(v => v.t).join(' ').replace(/(^|\s)[A-ZÁÉÍÓÚ][a-záéíóú]{1,6}\s*\(\(?[^A-Za-zÁÉÍÓÚáéíóú¡¿]*(?=[A-ZÁÉÍÓÚ¡¿])/g, '$1').trim();
    return { v: label, t: tt, y: lines[i] };
  });
  OUT[s.id] = { h: hebTitle(s), c: cards };
  report.push(s.id + '\t' + verses.length + 'v\t' + cards.length + ' tarjetas\t' + pool.length + ' líneas');
});

const NFC = JSON.stringify(OUT).normalize('NFC');
fs.writeFileSync(process.argv[3], '// Generado automáticamente desde data.js (porciones cortas + conexión con Yeshúa HaMashíaj)\nwindow.TEHILIM_CARDS = ' + NFC + ';\n');
fs.writeFileSync(require('path').join(__dirname, 'report.txt'), report.join('\n'));
console.log('ok', Object.keys(OUT).length, 'salmos,', Object.values(OUT).reduce((n, x) => n + x.c.length, 0), 'tarjetas');
