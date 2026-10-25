// Interactivo: prensa hidráulica (laboratorio de pistones).
// Textos en contenido/fisica/prensa-interactivo.json. Se calcula sin redondear; solo se redondea al mostrar.

const URL_DATOS = new URL('../../../contenido/fisica/prensa-interactivo.json', import.meta.url);
const NS = 'http://www.w3.org/2000/svg';

// Geometría del dibujo (unidades del viewBox 320 × 292)
const ESC = 7;            // px por cm de diámetro
const PX_CM = 2;          // px por cm de recorrido vertical
const CX1 = 70, CX2 = 240;
const Y_TOP = 120, Y0 = 140, Y_FONDO = 280, CANAL = 22;
const ALTO_PISTON = 12, VARILLA1 = 50, VARILLA2 = 24;
const FLECHA_MIN = 18, FLECHA_MAX = 70, RAZON_MAX = 400;

const $ = (id) => document.getElementById(id);

// ---------- Formato (es-MX: miles con espacio, punto decimal) ----------
function agrupar(entero) {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function fmt(v, maxDec = 2) {
  const [ent, dec] = String(+v.toFixed(maxDec)).split('.');
  return agrupar(ent) + (dec ? '.' + dec : '');
}
// Metros: mínimo 2 decimales y al menos 3 cifras significativas
function fmtM(v) {
  let d = 2;
  while (d < 6 && v > 0 && Math.round(v * 10 ** d) < 100) d++;
  let s = v.toFixed(d);
  while (s.length - s.indexOf('.') > 3 && s.endsWith('0')) s = s.slice(0, -1);
  return s;
}
const llenar = (plantilla, vals) => plantilla.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '');
const escapar = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function el(tag, attrs, padre) {
  const e = document.createElementNS(NS, tag);
  poner(e, attrs);
  padre.appendChild(e);
  return e;
}
function poner(e, attrs) {
  for (const k in attrs) e.setAttribute(k, attrs[k]);
}

// ---------- Inicio ----------
let D;
try {
  D = await (await fetch(URL_DATOS)).json();
} catch {
  $('lab').textContent = 'No se pudo cargar el contenido. Abre esta página con un servidor local (npx serve).';
  throw new Error('Sin datos');
}

const s = { ...D.valoresIniciales };
const L = D.lecturas;

document.title = `${D.titulo} · ${D.subtitulo}`;
$('titulo').textContent = D.titulo;
$('subtitulo').textContent = D.subtitulo;
$('instruccion').textContent = D.instruccion;
$('etqD1').textContent = D.controles.d1;
$('etqD2').textContent = D.controles.d2;
$('etqX').textContent = D.controles.x;
$('etqRd').textContent = L.razonDiametros;
$('etqRa').textContent = L.razonAreas;
$('etqF2').textContent = L.fuerza;
$('etqY').textContent = L.recorrido;
$('etqW').textContent = L.trabajo;
$('mensaje').textContent = L.mensaje;

const deslizadores = {};
for (const k of ['d1', 'd2', 'x']) {
  const r = D.rangos[k], input = $(k);
  poner(input, { min: r.min, max: r.max, step: r.paso });
  input.value = s[k];
  input.addEventListener('input', () => { s[k] = +input.value; actualizar(); });
  deslizadores[k] = input;
}

// ---------- Dibujo ----------
const svg = $('prensa');
svg.setAttribute('aria-label', D.figura.aria);

const defs = el('defs', {}, svg);
for (const n of ['1', '2']) {
  const m = el('marker', {
    id: 'punta' + n, viewBox: '0 0 10 10', refX: 6, refY: 5,
    markerWidth: 3.2, markerHeight: 3.2, orient: 'auto-start-reverse',
  }, defs);
  el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'punta' + n }, m);
}

const g = {
  fluido: el('path', { class: 'fluido' }, svg),
  pared: el('path', { class: 'pared' }, svg),
  varilla1: el('rect', { class: 'varilla' }, svg),
  mango1: el('rect', { class: 'solido', rx: 3 }, svg),
  piston1: el('rect', { class: 'solido', rx: 1.5 }, svg),
  varilla2: el('rect', { class: 'varilla' }, svg),
  plataforma2: el('rect', { class: 'solido', rx: 2 }, svg),
  piston2: el('rect', { class: 'solido', rx: 1.5 }, svg),
  flecha1: el('line', { class: 'flecha1', 'marker-end': 'url(#punta1)' }, svg),
  flecha2: el('line', { class: 'flecha2', 'marker-end': 'url(#punta2)' }, svg),
  texto1: el('text', { class: 'rotulo', 'text-anchor': 'middle' }, svg),
  texto2: el('text', { class: 'rotulo f2', 'text-anchor': 'start' }, svg),
  textoX: el('text', { class: 'rotulo tenue', 'text-anchor': 'start' }, svg),
  zona: el('rect', { class: 'arrastre', x: CX1 - 40, y: 0, width: 80, height: Y_FONDO + 10 }, svg),
};

function dibujar(c) {
  const w1 = s.d1 * ESC, w2 = s.d2 * ESC;
  const a1 = CX1 - w1 / 2, b1 = CX1 + w1 / 2;
  const a2 = CX2 - w2 / 2, b2 = CX2 + w2 / 2;
  const yL = Y0 + s.x * PX_CM;                  // cara del pistón chico (baja x)
  const yR = Y0 + 50 * PX_CM - c.y * PX_CM;     // cara del pistón grande (sube x ÷ razón²)
  const yCanal = Y_FONDO - CANAL;

  poner(g.fluido, {
    d: `M${a1},${yL} H${b1} V${yCanal} H${a2} V${yR} H${b2} V${Y_FONDO} H${a1} Z`,
  });
  poner(g.pared, {
    d: `M${a1},${Y_TOP} V${Y_FONDO} H${b2} V${Y_TOP} M${b1},${Y_TOP} V${yCanal} H${a2} V${Y_TOP}`,
  });

  // Pistón chico con varilla y mango
  const top1 = yL - ALTO_PISTON;
  const mango = Math.max(w1 + 14, 36);
  const yMango = top1 - VARILLA1 - 9;
  poner(g.piston1, { x: a1 + 1.5, y: top1, width: Math.max(w1 - 3, 1), height: ALTO_PISTON });
  poner(g.varilla1, { x: CX1 - 2, y: top1 - VARILLA1, width: 4, height: VARILLA1 });
  poner(g.mango1, { x: CX1 - mango / 2, y: yMango, width: mango, height: 9 });
  poner(g.flecha1, { x1: CX1, y1: yMango - 40, x2: CX1, y2: yMango - 6 });
  poner(g.texto1, { x: CX1, y: yMango - 46 });
  g.texto1.textContent = llenar(D.figura.f1, { F1: fmt(s.F1) });
  poner(g.textoX, { x: b1 + 8, y: yL - 2 });
  g.textoX.textContent = llenar(D.figura.x, { x: fmt(s.x, 1) });

  // Pistón grande con varilla, plataforma y flecha F₂ (escala logarítmica)
  const top2 = yR - ALTO_PISTON;
  const plat = Math.max(w2 * 0.7, 30);
  const yPlat = top2 - VARILLA2 - 6;
  poner(g.piston2, { x: a2 + 1.5, y: top2, width: w2 - 3, height: ALTO_PISTON });
  poner(g.varilla2, { x: CX2 - 3, y: top2 - VARILLA2, width: 6, height: VARILLA2 });
  poner(g.plataforma2, { x: CX2 - plat / 2, y: yPlat, width: plat, height: 6 });
  const largo = FLECHA_MIN + (FLECHA_MAX - FLECHA_MIN) * Math.log(c.ra) / Math.log(RAZON_MAX);
  const base = yPlat - 4;
  poner(g.flecha2, { x1: CX2, y1: base, x2: CX2, y2: base - largo });
  poner(g.texto2, { x: CX2 + 10, y: base - largo / 2 + 4 });
  g.texto2.textContent = llenar(D.figura.f2, { F2: fmt(c.F2, 1) });
}

// ---------- Arrastre del pistón chico (dedo o mouse) ----------
let arrastre = null;
function aSvgY(e) {
  const p = svg.createSVGPoint();
  p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse()).y;
}
g.zona.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  g.zona.setPointerCapture(e.pointerId);
  g.zona.classList.add('activo');
  arrastre = { y: aSvgY(e), x: s.x };
});
g.zona.addEventListener('pointermove', (e) => {
  if (!arrastre) return;
  const r = D.rangos.x;
  const x = Math.round(arrastre.x + (aSvgY(e) - arrastre.y) / PX_CM);
  const nuevo = Math.min(r.max, Math.max(r.min, x));
  if (nuevo !== s.x) {
    s.x = nuevo;
    deslizadores.x.value = nuevo;
    actualizar();
  }
});
const soltar = () => { arrastre = null; g.zona.classList.remove('activo'); };
g.zona.addEventListener('pointerup', soltar);
g.zona.addEventListener('pointercancel', soltar);

// ---------- Cálculo y lecturas ----------
function calcular() {
  const rd = s.d2 / s.d1, ra = rd * rd;
  const F2 = s.F1 * ra, y = s.x / ra;          // y en cm
  return { rd, ra, F2, y, Ftrampa: s.F1 * rd, W1: s.F1 * (s.x / 100), W2: F2 * (y / 100) };
}

function actualizar() {
  const c = calcular();
  const v = {
    d1: fmt(s.d1), d2: fmt(s.d2), F1: fmt(s.F1), x: fmt(s.x, 1),
    rd: fmt(c.rd), ra: fmt(c.ra), F2: fmt(c.F2, 1), Ftrampa: fmt(c.Ftrampa, 1),
    y: fmt(c.y), xm: fmtM(s.x / 100), ym: fmtM(c.y / 100), W1: fmt(c.W1), W2: fmt(c.W2),
  };

  $('outD1').textContent = llenar(D.controles.valor, { v: v.d1 });
  $('outD2').textContent = llenar(D.controles.valor, { v: v.d2 });
  $('outX').textContent = llenar(D.controles.valor, { v: v.x });

  $('valRd').textContent = llenar(L.razonDiametrosValor, v);
  $('valRa').innerHTML = escapar(llenar(L.razonAreasValor, v)).replace('²', '<span class="cuadrado">²</span>');
  $('valF2').textContent = llenar(L.fuerzaValor, v);
  $('trampa').textContent = llenar(L.trampa, v);
  $('valY').textContent = llenar(L.recorridoValor, v);
  $('valW1').textContent = llenar(L.w1, v);
  $('valW2').textContent = llenar(L.w2, v);

  dibujar(c);
}

// ---------- Ponte a prueba ----------
const P = D.prueba;
$('pruebaTitulo').textContent = P.titulo;
$('pregunta').textContent = P.pregunta;
const botones = P.opciones.map((op) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = `${op.letra}) ${op.texto}`;
  b.addEventListener('click', () => {
    botones.forEach((o) => o.classList.remove('bien', 'mal'));
    b.classList.add(op.correcta ? 'bien' : 'mal');
    $('retro').textContent = op.retro;
  });
  $('opciones').appendChild(b);
  return b;
});

actualizar();
