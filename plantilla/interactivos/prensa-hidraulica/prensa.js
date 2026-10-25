// Interactivo: prensa hidráulica (laboratorio de pistones).
// Textos en contenido/fisica/prensa-interactivo.json. Se calcula sin redondear; solo se redondea al mostrar.

const URL_DATOS = new URL('../../../contenido/fisica/prensa-interactivo.json', import.meta.url);
const NS = 'http://www.w3.org/2000/svg';

// Geometría del dibujo (unidades del viewBox 320 × 296)
const ESC = 7;            // px por cm de diámetro
const PX_CM = 1.6;        // px por cm de recorrido vertical
const X_MAX = 50;         // recorrido máximo del pistón chico (cm)
const CX1 = 70, CX2 = 240;
const Y_TOP = 156, Y0 = 166, Y_FONDO = 284, CANAL = 22;
const ALTO_PISTON = 12, ALTO_PLACA = 9, VARILLA2 = 24;
const HOLGURA = 6;        // espacio mínimo entre la placa del pistón chico y el borde de las paredes
// Varilla justa para que, con x máximo, la placa siga arriba del borde
const VARILLA1 = Y0 + X_MAX * PX_CM - ALTO_PISTON - (Y_TOP - HOLGURA);
const FLECHA1 = 34, Y_PUNTA_MIN = 22;   // largo de F₁ (px) y punta más alta posible de F₂

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
// Recorrido en cm: si es menor que 1, mismas cifras que en metros (evita "0 cm")
const fmtCm = (v) => (v > 0 && v < 1 ? fmtM(v) : fmt(v));
const llenar = (plantilla, vals) => plantilla.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '');

// Texto con <sub>…</sub> y ², armado con nodos (sin innerHTML)
const PARTES = /<sub>(.*?)<\/sub>|²/g;
function ponerTexto(e, t) {
  e.textContent = '';
  let i = 0;
  for (const m of t.matchAll(PARTES)) {
    e.append(t.slice(i, m.index));
    const n = document.createElement(m[1] === undefined ? 'sup' : 'sub');
    if (m[1] === undefined) n.className = 'cuadrado';
    n.textContent = m[1] ?? '2';
    e.append(n);
    i = m.index + m[0].length;
  }
  e.append(t.slice(i));
}
// En SVG no hay <sub>/<sup>: se desplaza con dy y el resto del texto regresa a la línea base
function ponerTextoSvg(e, t) {
  e.textContent = '';
  let i = 0, destino = e;
  for (const m of t.matchAll(PARTES)) {
    destino.append(t.slice(i, m.index));
    const dy = m[1] === undefined ? -4 : 3;
    el('tspan', { dy, 'font-size': '0.75em' }, e).textContent = m[1] ?? '2';
    destino = el('tspan', { dy: -dy }, e);
    i = m.index + m[0].length;
  }
  destino.append(t.slice(i));
}

// Marcas dibujadas ✓ / ✗ (colores de la paleta vía CSS)
function marca(correcta) {
  const m = document.createElementNS(NS, 'svg');
  poner(m, { viewBox: '0 0 16 16', class: 'marca-svg ' + (correcta ? 'm-bien' : 'm-mal'), 'aria-hidden': 'true' });
  el('path', { d: correcta ? 'M2.5 8.8 C4 10 5.2 11.4 6.3 13 C8 9 10.4 5.6 13.6 2.8' : 'M3.4 3.2 C6.5 6.4 9.6 9.6 12.8 13 M12.6 3 C9.6 6.4 6.6 9.6 3.2 12.9' }, m);
  return m;
}

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
$('pie').textContent = D.figura.pie;
L.numerales.forEach((t, i) => { $('num' + (i + 1)).textContent = t; });
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

// ---------- Dibujo (lámina de grabado; colores desde las variables CSS) ----------
const svg = $('prensa');
svg.setAttribute('aria-label', D.figura.aria);

const defs = el('defs', {}, svg);
for (const [n, clase] of [['1', 'g-relleno-tinta'], ['2', 'g-relleno-enfasis']]) {
  const m = el('marker', {
    id: 'punta' + n, viewBox: '0 0 10 10', refX: 6, refY: 5,
    markerWidth: 3.6, markerHeight: 3.6, orient: 'auto-start-reverse',
  }, defs);
  el('path', { d: 'M0,0 L10,5 L0,10 z', class: clase }, m);
}
const rayadoAgua = el('pattern', { id: 'rayado-agua', patternUnits: 'userSpaceOnUse', width: 6, height: 4 }, defs);
el('path', { d: 'M0,2 H6', class: 'g-rayado-agua' }, rayadoAgua);
const rayadoTinta = el('pattern', { id: 'rayado-tinta', patternUnits: 'userSpaceOnUse', width: 4, height: 4 }, defs);
el('path', { d: 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2', class: 'g-rayado-tinta' }, rayadoTinta);

// Suelo fijo con rayitas de grabado
let suelo = `M16,${Y_FONDO + 2} H304`;
for (let x = 22; x <= 300; x += 8) suelo += ` M${x},${Y_FONDO + 3} l-6,6`;
el('path', { d: suelo, class: 'g-tinta', 'stroke-width': 1 }, svg);

const g = {
  fluido: el('path', { class: 'g-fluido' }, svg),
  ondas: el('path', { fill: 'url(#rayado-agua)' }, svg),
  pared: el('path', { class: 'g-tinta', 'stroke-width': 2.2 }, svg),
  varilla1: el('rect', { class: 'g-solido', 'stroke-width': 1 }, svg),
  mango1: el('rect', { class: 'g-solido', 'stroke-width': 1.2, rx: 2 }, svg),
  piston1: el('rect', { class: 'g-solido', 'stroke-width': 1.2, rx: 1 }, svg),
  rayado1: el('rect', { fill: 'url(#rayado-tinta)', rx: 1 }, svg),
  varilla2: el('rect', { class: 'g-solido', 'stroke-width': 1 }, svg),
  plataforma2: el('rect', { class: 'g-solido', 'stroke-width': 1.2, rx: 1 }, svg),
  piston2: el('rect', { class: 'g-solido', 'stroke-width': 1.2, rx: 1 }, svg),
  rayado2: el('rect', { fill: 'url(#rayado-tinta)', rx: 1 }, svg),
  flecha1: el('line', { class: 'g-tinta', 'stroke-width': 2, 'marker-end': 'url(#punta1)' }, svg),
  flecha2: el('line', { class: 'g-enfasis', 'stroke-width': 2.4, 'marker-end': 'url(#punta2)' }, svg),
  rotura: el('g', {}, svg),
  texto1: el('text', { class: 'g-rotulo', 'text-anchor': 'middle' }, svg),
  texto2: el('text', { class: 'g-rotulo enfasis', 'text-anchor': 'middle' }, svg),
  textoX: el('text', { class: 'g-rotulo suave', 'text-anchor': 'start' }, svg),
};
// Rotura de la flecha F₂ cuando llega al tope (indica que ya no está a escala)
el('path', { d: 'M-7,-1 L7,-5 M-7,4 L7,0', class: 'g-hueco', 'stroke-width': 4 }, g.rotura);
el('path', { d: 'M-7,-1 L7,-5 M-7,4 L7,0', class: 'g-enfasis', 'stroke-width': 1.2 }, g.rotura);

function dibujar(c) {
  const w1 = s.d1 * ESC, w2 = s.d2 * ESC;
  const a1 = CX1 - w1 / 2, b1 = CX1 + w1 / 2;
  const a2 = CX2 - w2 / 2, b2 = CX2 + w2 / 2;
  const yL = Y0 + s.x * PX_CM;                  // cara del pistón chico (baja x)
  const yR = Y0 + X_MAX * PX_CM - c.y * PX_CM;     // cara del pistón grande (sube x ÷ razón²)
  const yCanal = Y_FONDO - CANAL;

  const dFluido = `M${a1},${yL} H${b1} V${yCanal} H${a2} V${yR} H${b2} V${Y_FONDO} H${a1} Z`;
  poner(g.fluido, { d: dFluido });
  poner(g.ondas, { d: dFluido });
  poner(g.pared, {
    d: `M${a1},${Y_TOP} V${Y_FONDO} H${b2} V${Y_TOP} M${b1},${Y_TOP} V${yCanal} H${a2} V${Y_TOP}`,
  });

  // Pistón chico con varilla y placa (la placa nunca baja del borde de las paredes)
  const top1 = yL - ALTO_PISTON;
  const mango = Math.max(w1 + 14, 36);
  const yMango = top1 - VARILLA1 - ALTO_PLACA;
  const p1 = { x: a1 + 1.5, y: top1, width: Math.max(w1 - 3, 1), height: ALTO_PISTON };
  poner(g.piston1, p1);
  poner(g.rayado1, p1);
  poner(g.varilla1, { x: CX1 - 2, y: top1 - VARILLA1, width: 4, height: VARILLA1 });
  poner(g.mango1, { x: CX1 - mango / 2, y: yMango, width: mango, height: ALTO_PLACA });
  poner(g.flecha1, { x1: CX1, y1: yMango - 6 - FLECHA1, x2: CX1, y2: yMango - 6 });
  poner(g.texto1, { x: CX1, y: yMango - 12 - FLECHA1 });
  ponerTextoSvg(g.texto1, llenar(D.figura.f1, { F1: fmt(s.F1) }));
  poner(g.textoX, { x: b1 + 8, y: yL - 2 });
  g.textoX.textContent = llenar(D.figura.x, { x: fmt(s.x, 1) });

  // Pistón grande con varilla, plataforma y flecha F₂ (misma escala lineal que F₁, con tope)
  const top2 = yR - ALTO_PISTON;
  const plat = Math.max(w2 * 0.7, 30);
  const yPlat = top2 - VARILLA2 - 6;
  const p2 = { x: a2 + 1.5, y: top2, width: w2 - 3, height: ALTO_PISTON };
  poner(g.piston2, p2);
  poner(g.rayado2, p2);
  poner(g.varilla2, { x: CX2 - 3, y: top2 - VARILLA2, width: 6, height: VARILLA2 });
  poner(g.plataforma2, { x: CX2 - plat / 2, y: yPlat, width: plat, height: 6 });
  const base = yPlat - 4;
  const tope = base - Y_PUNTA_MIN;
  const largo = Math.min(c.F2 * FLECHA1 / s.F1, tope);
  poner(g.flecha2, { x1: CX2, y1: base, x2: CX2, y2: base - largo });
  g.rotura.style.display = largo >= tope ? '' : 'none';
  poner(g.rotura, { transform: `translate(${CX2},${base - largo * 0.4})` });
  // Etiqueta arriba de la punta y nunca abajo del borde (no cruza paredes ni se sale de la lámina)
  poner(g.texto2, { x: CX2, y: Math.min(base - largo - 6, Y_TOP - 6) });
  ponerTextoSvg(g.texto2, llenar(D.figura.f2, { F2: fmt(c.F2, 1) }));
}

// ---------- Arrastre del pistón chico (dedo o mouse) ----------
const zona = $('zona');
zona.title = D.instruccion;
let arrastre = null;
function aSvgY(e) {
  const p = svg.createSVGPoint();
  p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse()).y;
}
zona.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  zona.setPointerCapture(e.pointerId);
  zona.classList.add('activo');
  arrastre = { y: aSvgY(e), x: s.x };
});
zona.addEventListener('pointermove', (e) => {
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
const soltar = () => { arrastre = null; zona.classList.remove('activo'); };
zona.addEventListener('pointerup', soltar);
zona.addEventListener('pointercancel', soltar);
zona.addEventListener('lostpointercapture', soltar);

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
    y: fmtCm(c.y), xm: fmtM(s.x / 100), ym: fmtM(c.y / 100), W1: fmt(c.W1), W2: fmt(c.W2),
  };

  $('outD1').textContent = llenar(D.controles.valor, { v: v.d1 });
  $('outD2').textContent = llenar(D.controles.valor, { v: v.d2 });
  $('outX').textContent = llenar(D.controles.valor, { v: v.x });

  $('valRd').textContent = llenar(L.razonDiametrosValor, v);
  ponerTexto($('valRa'), llenar(L.razonAreasValor, v));
  ponerTexto($('valF2'), llenar(L.fuerzaValor, v));
  // Con diámetros iguales la "trampa" daría lo mismo que la respuesta correcta: no se muestra
  const trampa = $('trampa');
  trampa.hidden = c.rd === 1;
  ponerTexto(trampa, llenar(L.trampa, v) + ' ');
  trampa.append(marca(false));
  $('valY').textContent = llenar(L.recorridoValor, v);
  ponerTexto($('valW1'), llenar(L.w1, v));
  ponerTexto($('valW2'), llenar(L.w2, v));

  dibujar(c);
}

// ---------- Ponte a prueba ----------
const P = D.prueba;
$('pruebaTitulo').textContent = P.titulo;
$('pregunta').textContent = P.pregunta;
const botones = P.opciones.map((op) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'boton';
  b.textContent = `${op.letra}) ${op.texto}`;
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => {
    botones.forEach((o) => {
      o.classList.remove('correcta', 'incorrecta');
      o.setAttribute('aria-pressed', 'false');
      o.querySelector('.marca')?.remove();
    });
    b.classList.add(op.correcta ? 'correcta' : 'incorrecta');
    b.setAttribute('aria-pressed', 'true');
    const etiqueta = document.createElement('span');
    etiqueta.className = 'marca';
    etiqueta.append(marca(op.correcta), ' ' + (op.correcta ? P.marcaCorrecta : P.marcaIncorrecta));
    b.appendChild(etiqueta);
    const retro = $('retro');
    ponerTexto(retro, ' ' + op.retro);
    retro.prepend(marca(op.correcta));
  });
  $('opciones').appendChild(b);
  return b;
});

actualizar();
