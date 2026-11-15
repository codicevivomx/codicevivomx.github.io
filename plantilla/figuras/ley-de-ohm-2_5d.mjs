// Lámina 2.5D+ de la ley de Ohm: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/ley-de-ohm-2_5d.mjs                → plantilla/interactivos/ley-de-ohm/plus/index.html
//                                                             y contenido/fisica/img/ley-de-ohm.svg (figura fija para PDF y video)
//   node plantilla/figuras/ley-de-ohm-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de ondas (plantilla/figuras/ondas-2_5d.mjs): misma página (CSS_PRENSA), pantalla completa, evaluador de
// fórmulas, predicción y pasos desde el JSON, recorrido automático, movimiento reducido y salida .svg. Otro dibujo (portapilas de
// celdas de 1.5 V con pinza, interruptor de cuchilla, resistor de bandas sobre bornes y amperímetro de aguja, cableados en un
// tablero) y otra lógica (al cerrar, todas las cargas del cable se mueven a la vez con rapidez proporcional a I; al abrir se
// detienen todas a la vez; la aguja se acomoda en I = V ÷ R).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "ley-de-ohm";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(RAIZ, ".claude", "skills", "anatomy");
const k = await import("file://" + join(SKILL, "kit", "iso-kit.mjs"));
const { kitScript } = await import("file://" + join(SKILL, "scripts", "inline-kit.mjs"));
const JSON_TEMA = join(RAIZ, "contenido", "fisica", `${TEMA}-interactivo.json`);
const SALIDA = join(RAIZ, "plantilla", "interactivos", TEMA, "plus", "index.html");
const SALIDA_SVG = join(RAIZ, "contenido", "fisica", "img", `${TEMA}.svg`);
const J = JSON.parse(readFileSync(JSON_TEMA, "utf8"));

// ---------- Fórmulas: se leen de J.lecturas.formulas y se evalúan sin eval (solo + − × ÷, paréntesis, números y nombres) ----------
function evalua(e, v) {
  const s = String(e).replace(/\s+/g, ""); let i = 0;
  const hoja = () => {
    const r = /^(\d+(?:\.\d+)?|[A-Za-z_]\w*)/.exec(s.slice(i));
    if (!r) throw new Error("Fórmula no válida: " + e);
    i += r[0].length;
    if (/^\d/.test(r[0])) return +r[0];
    if (!(r[0] in v)) throw new Error("Fórmula con un nombre desconocido: " + r[0]);
    return v[r[0]];
  };
  const fac = () => { if (s[i] === "(") { i++; const r = suma(); i++; return r; } if (s[i] === "-") { i++; return -fac(); } return hoja(); };
  const prod = () => { let r = fac(); while (s[i] === "*" || s[i] === "/") { const o = s[i++], b = fac(); r = o === "*" ? r * b : r / b; } return r; };
  const suma = () => { let r = prod(); while (s[i] === "+" || s[i] === "-") { const o = s[i++], b = prod(); r = o === "+" ? r + b : r - b; } return r; };
  return suma();
}
// Variables de entrada: el voltaje de la pila (V) y el resistor (R, en kΩ); lo demás (escala, la prueba) viene del JSON.
function calc(J, V, R) {
  const v = { ...J.valoresIniciales, V, R };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}
// Bandas de color de un resistor de 4 bandas: dos cifras y el multiplicador (potencia de 10), a partir de R en ohms.
function bandas(rohm) {
  const m = Math.floor(Math.log10(rohm)) - 1, dd = Math.round(rohm / 10 ** m);
  return [Math.floor(dd / 10), dd % 10, m];
}
// Un punto a la distancia u (unidades del mundo) sobre el recorrido del cable; dice si ese tramo va oculto (dentro de una pieza).
function sobre(C, u) {
  const T = C.TOTAL; u = ((u % T) + T) % T;
  let i = 0; while (i < C.LARGOS.length - 1 && C.ACUM[i + 1] <= u) i++;
  const a = C.RUTA[i], b = C.RUTA[i + 1], f = (u - C.ACUM[i]) / C.LARGOS[i];
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], oculto: C.OCULTO[i], dir: [(b[0] - a[0]) / C.LARGOS[i], (b[1] - a[1]) / C.LARGOS[i]], tramo: i };
}

// ---------- Modelo del dibujo (unidades del mundo; x a la derecha, y hacia el frente, z hacia arriba). Nada va a escala. ----------
const VI = J.valoresIniciales, RG = J.rangos, ES = J.escena;
const PLACA = { x: -12, y: -30, w: 140, d: 54, r: 6 }, PLACA_H = 4, PATA_H = 4;
const ZC = 0.7;                                                                   // altura del cable sobre el tablero
// Portapilas: canal con NMAX celdas de PASOV voltios cada una, acostadas en serie (+ de una contra − de la siguiente)
const PASOV = RG.V.paso, NMAX = Math.round(RG.V.max / PASOV);
const CY = -17.5, CR = 1.9, CZ = 1.6 + CR, PITCH = 7.4, CX0 = 0.4, CL = 6.6, NUB = 0.6;
const CANAL = { x: -1, y: -21, w: CX0 + NMAX * PITCH + 1.4, d: 7, r: 0.6 };
const POSTE_MAS = [CANAL.x + CANAL.w + 3.6, CY];                                  // borne + del portapilas
const TAG = { x: 22, y: -12.4, w: 15, d: 3.6, r: 0.4 };                           // etiqueta del voltaje
// Interruptor de cuchilla: base, bisagra, mordaza y cuchilla que gira hacia arriba
const SY = 14, SW = { x: 60, y: SY - 3.5, w: 22, d: 7, r: 0.5 };
const PIV = [SW.x + 3.5, SY, 5.2], LH = 15, ABRE = ES.anguloAbierto * Math.PI / 180;
// Resistor sobre dos bornes
const RB1 = [31, SY], RB2 = [53, SY], RZ = 4.4, RRAD = 2, RX0 = 35.6, RX1 = 48.4;
const BX = [37.3, 39.5, 41.7], BTOL = 45.8, BW = 1.1;
const RTAG = { x: 35.8, y: SY + 3.4, w: 12.4, d: 3.2, r: 0.4 };
// Amperímetro: zócalo, caja y carátula en la cara del frente (+y)
const MP = { x: 87, y: -25, w: 30, d: 15, r: 1 }, MB = { x: 89, y: -23, w: 26, d: 11, r: 1 }, MZ0 = 2, MZ1 = 28;
const YF = MB.y + MB.d + 0.02, DC = [MB.x + MB.w / 2, YF + 0.45, 10.6], DR = 11.4;
const A0 = 150 * Math.PI / 180, A1 = 30 * Math.PI / 180, ATOPE = 23 * Math.PI / 180;
const MAS_A = [96, -5], MENOS_A = [108, -5];
// Recorrido del cable, en el sentido de la corriente convencional: del + de la pila al − (los tramos dentro de piezas van ocultos)
const RUTA = [
  [POSTE_MAS[0], CY, ZC], [72, CY, ZC], [72, MAS_A[1], ZC], [MAS_A[0], MAS_A[1], ZC], [MENOS_A[0], MENOS_A[1], ZC], [122, MENOS_A[1], ZC],
  [122, SY, ZC], [SW.x + SW.w - 1, SY, ZC], [SW.x + 1, SY, ZC], [RB2[0], SY, ZC], [RB1[0], SY, ZC],
  [-4, SY, ZC], [-4, CY, ZC], [CANAL.x, CY, ZC],
];
const OCULTO = [false, false, false, true, false, false, false, true, false, true, false, false, false];
const REGRESO = 10;                                                               // desde este tramo: el cable de regreso (rótulo 08)
const LARGOS = RUTA.slice(1).map((b, i) => Math.hypot(b[0] - RUTA[i][0], b[1] - RUTA[i][1], b[2] - RUTA[i][2]));
const ACUM = LARGOS.reduce((a, l) => (a.push(a[a.length - 1] + l), a), [0]);
const TOTAL = ACUM[ACUM.length - 1], SEPQ = 3.4, NQ = Math.floor(TOTAL / SEPQ);
const NFL = 7;                                                                    // flechas fijas (movimiento reducido y figura fija)

const W = 640, H = 330;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [PLACA.x, PLACA.y + PLACA.d, -12], [MB.x, MB.y, MZ1 + 8], [MB.x + MB.w, MB.y, MZ1 + 8], [SW.x, CY, 22]],
  W, H, { pad: 10, azimuth: 66, elevation: 30 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], c[2] || 0], P);
const pt2 = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);

// Cilindro acostado a lo largo de x (celdas, cuerpo del resistor, bandas): silueta = envolvente de sus dos aros; tapa en el extremo +x
function hull(q) {
  q = q.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of q.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
const aro = (x, y, z, r, n = 28) => Array.from({ length: n }, (_, i) => { const t = 2 * Math.PI * i / n; return at([x, y + r * Math.cos(t), z + r * Math.sin(t)]); });
const cerrado = (q) => "M" + q.map(pt2).join("L") + "Z";
function cilX(x0, x1, y, z, r) {
  return { fill: cerrado(hull([...aro(x0, y, z, r), ...aro(x1, y, z, r)])), tapa: cerrado(aro(x1, y, z, r)),
    brillo: "M" + pt2(at([x0 + 0.3, y - r * 0.35, z + r * 0.9])) + "L" + pt2(at([x1 - 0.3, y - r * 0.35, z + r * 0.9])) };
}
const cil = (c, cls) => `<g class="cil ${cls}"><path class="c-f" d="${c.fill}"/><path class="c-b" d="${c.brillo}"/><path class="c-t" d="${c.tapa}"/></g>`;

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
function vista(C, K, s, J) {
  const P = C.P;
  const num = (v, dec = 2) => {
    const r = Math.round(v * 10 ** dec) / 10 ** dec;
    let [i, d] = Math.abs(r).toFixed(dec).split(".");
    d = (d || "").replace(/0+$/, "");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
  };
  const tpl = (t, o) => t.replace(/\{(\w+)\}/g, (m, q) => (q in o ? o[q] : m));
  const iso = (p) => K.iso(p, P);
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  const d = calc(J, s.V, s.R), rv = s.revelado, ft = !!s.trampa;
  const m = {};
  const sg = (a, b) => "M" + pt(iso(a)) + "L" + pt(iso(b));

  // Portapilas: tantas celdas como voltaje ÷ voltaje de una celda; la pinza va en el + de la última
  const n = Math.max(1, Math.min(C.NMAX, Math.round(s.V / C.PASOV)));
  for (let i = 0; i < C.NMAX; i++) m["cel" + i] = { _v: i < n };
  const o0 = iso([0, 0, 0]), o1 = iso([(n - 1) * C.PITCH, 0, 0]);
  m["pinza"] = { transform: `translate(${(o1[0] - o0[0]).toFixed(2)} ${(o1[1] - o0[1]).toFixed(2)})` };
  const xe = C.CX0 + (n - 1) * C.PITCH + C.CL + C.NUB, a = [xe - 0.2, C.CY, C.CZ + 2.4], b = [C.POSTE[0], C.POSTE[1], 6], zt = Math.max(a[2], b[2]) + 5;
  let puente = "";
  for (let i = 0; i <= 16; i++) { const t = i / 16, q = [a[0] + (b[0] - a[0]) * t, a[1], (1 - t) * (1 - t) * a[2] + 2 * t * (1 - t) * zt + t * t * b[2]]; puente += (i ? "L" : "M") + pt(iso(q)); }
  m["puente"] = { d: puente };
  m["t-volt"] = { _t: tpl(J.figura.voltaje, { V: num(s.V) }) };

  // Resistor: las bandas cambian con R (cifra, cifra, multiplicador)
  const bb = bandas(d.Rohm);
  for (let i = 0; i < 3; i++) m["banda" + i] = { class: "cil banda b" + bb[i] };
  m["t-res"] = { _t: tpl(J.figura.resistencia, { R: num(s.R) }) };

  // Interruptor: la cuchilla gira alrededor de la bisagra (s.ang: 0 cerrado, ABRE abierto); el mango va en la punta
  const ca = Math.cos(s.ang), sa = Math.sin(s.ang), pv = C.PIV;
  const enC = (t, dy, h = 0) => [pv[0] + t * ca - h * sa, pv[1] + dy, pv[2] + t * sa + h * ca];
  const cara = (qs) => "M" + qs.map(q => pt(iso(q))).join("L") + "Z";
  m["cuchilla-c"] = { d: cara([enC(0, -0.4, 1.4), enC(C.LH, -0.4, 1.4), enC(C.LH, 0.4, 1.4), enC(0, 0.4, 1.4)]) };
  m["cuchilla"] = { d: cara([enC(0, 0.4, -0.6), enC(C.LH, 0.4, -0.6), enC(C.LH, 0.4, 1.4), enC(0, 0.4, 1.4)]) };
  m["mango"] = { d: sg(enC(C.LH - 1.4, 0, 1.4), enC(C.LH - 1.4, 0, 5.4)) };
  const pm = iso(enC(C.LH - 1.4, 0, 5.6));
  m["perilla-m"] = { cx: pm[0].toFixed(1), cy: pm[1].toFixed(1) };
  m["palanca"] = { class: "palanca" + (s.on ? " cerrada" : "") };

  // Amperímetro: aguja en la fracción s.aguja de la escala; texto de la pantallita; la trampa, una aguja punteada contra el tope
  const ang = (f) => C.A0 - (C.A0 - C.A1) * f;
  const enD = (a2, r) => [C.DC[0] + r * Math.cos(a2), C.DC[1], C.DC[2] + r * Math.sin(a2)];
  const aa = ang(Math.max(0, Math.min(1.06, s.aguja)));
  m["aguja"] = { d: sg(enD(aa + Math.PI, 2.2), enD(aa, C.DR - 0.8)) };
  m["t-amp"] = { _t: rv ? tpl(J.figura.corriente, { I: num(d.I) }) : J.figura.corrienteInc };
  m["fantasma"] = ft ? { _v: true, d: sg(enD(C.ATOPE + Math.PI, 2.2), enD(C.ATOPE, C.DR + 3.2)) } : { _v: false };
  const pfa = mas(iso([C.MB.x, C.MB.y, C.MZ1 + 2]), -8, -4);
  m["fant-t"] = ft ? { _v: true, x: pfa[0].toFixed(1), y: pfa[1].toFixed(1) } : { _v: false };
  m["fant-1"] = { x: pfa[0].toFixed(1), _t: tpl(J.trampa.fantasma, { qA: num(d.qA) }) };
  m["fant-2"] = { x: pfa[0].toFixed(1), _t: tpl(J.trampa.real, { I: rv ? num(d.I) : "?" }) };

  // Cargas: puntos repartidos a lo largo del cable, corridos s.q unidades; los que caen dentro de una pieza no se dibujan
  for (let i = 0; i < C.NQ; i++) {
    const o = sobre(C, i * C.SEPQ + s.q);
    if (o.oculto) { m["q" + i] = { _v: false }; continue; }
    const q = iso(o.p);
    m["q" + i] = { _v: true, cx: q[0].toFixed(1), cy: q[1].toFixed(1) };
  }
  // Flechas fijas del sentido de la corriente (solo si se piden: movimiento reducido y figura fija)
  const fl = s.flechas && s.on;
  C.FL.forEach((u, i) => {
    if (!fl) { m["fl" + i] = { _v: false }; return; }
    const o = sobre(C, u), p = o.p, dx = o.dir[0], dy = o.dir[1], px = -dy, py = dx;
    const t0 = [p[0] - dx * 1.6 + px * 1.3, p[1] - dy * 1.6 + py * 1.3, p[2]], t1 = [p[0] + dx * 0.8, p[1] + dy * 0.8, p[2]], t2 = [p[0] - dx * 1.6 - px * 1.3, p[1] - dy * 1.6 - py * 1.3, p[2]];
    m["fl" + i] = { _v: true, d: "M" + pt(iso(t0)) + "L" + pt(iso(t1)) + "L" + pt(iso(t2)) };
  });

  // Rótulos
  const rot = (nn, p, ver = true) => { m["rot-" + nn] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  rot("01", mas(iso([C.CANAL.x, C.CANAL.y, 7]), -6, -12));
  rot("02", mas(iso([C.SW.x + C.SW.w, C.SW.y + C.SW.d, 2]), 12, 4));
  rot("03", mas(iso([C.RX0 - 3, C.SY + 4, 0]), -12, 6));
  rot("04", mas(iso([C.BX[1], C.SY, C.RZ + C.RRAD]), 2, -14));
  rot("05", mas(iso([C.MB.x + C.MB.w, C.MB.y, C.MZ1]), 8, -8));
  rot("06", mas(iso(enD(C.A1 - 0.25, C.DR + 2)), 10, 2));
  rot("07", mas(iso([100, C.SY, C.ZC]), 0, 13));
  rot("08", mas(iso([-4, 0, C.ZC]), -13, 2));
  rot("09", mas(pfa, 12, -4), ft);
  return m;
}

// ---------- Piezas fijas ----------
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function E(tag, id, attrs, m, inner = "") {
  const v = (m && m[id]) || {}, a = { id, ...attrs };
  for (const [q, x] of Object.entries(v)) if (q[0] !== "_") a[q] = x;
  if (v._v === false) a.style = "display:none";
  const txt = "_t" in v ? esc(v._t) : inner;
  return `<${tag}${Object.entries(a).map(([q, x]) => ` ${q}="${esc(x)}"`).join("")}>${txt}</${tag}>`;
}
const fmt = (v) => { const r = Math.round(v * 10) / 10; return (r < 0 ? "−" : "") + String(Math.abs(r)); };
const textoArriba = (x, y, t, size = 2.4, cls = "t-borne") => `<text class="${cls}" transform="${k.topMatrix([x, y], 0, P, "x")}" font-size="${size}">${esc(t)}</text>`;

function placa() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLACA, -PLACA_H - PATA_H, PLACA_H, P)}"/>`];
  const patas = k.corners(PLACA, 12).sort((a, b) => prof(a) - prof(b));
  for (const [x, y] of patas) {
    o.push(S(k.cylinder(x, y, 5, -PLACA_H - PATA_H, 1.4, P, 28), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 3.8, -PLACA_H - PATA_H + 1.4, PATA_H - 1.4, P, 28), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLACA, -PLACA_H, PLACA_H, P, 8, 1.4), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PLACA, 3.5), 0, P), { tone: "lo" }));
  const torn = k.corners(PLACA, 7);
  o.push(L(torn.map(([x, y]) => k.ring(x, y, 1.6, 0, P, 16)).join(""), { tone: "lo" }));
  o.push(D(torn.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const pl = { x: -1, y: PLACA.y + PLACA.d - 3.6, w: 34, d: 2.4, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 2.4, pl.y + 1.8], 0.4, P, "x"), J.figura.placa, { size: 1.5, tone: "lo" }));
  o.push(D([at([pl.x + 1.2, pl.y + 1.2, 0.4]), at([pl.x + pl.w - 1.2, pl.y + 1.2, 0.4])], { size: 0.4 }));
  return o.join("");
}
// Cable: trazo grueso con brillo; se parte en dos grupos para poder señalar el cable de regreso
function cables() {
  const tramo = (a, b) => "M" + RUTA.slice(a, b + 1).map(q => pt2(at(q))).join("L");
  const ida = [], reg = [];
  for (let i = 0; i < RUTA.length - 1; i++) if (!OCULTO[i]) (i >= REGRESO ? reg : ida).push(tramo(i, i + 1));
  const g = (d) => `<path class="cable" d="${d}"/><path class="cable-b" d="${d}"/>`;
  return `<g>${g(ida.join(""))}</g><g data-parte="08">${g(reg.join(""))}</g>`;
}
// Bornes: poste cilíndrico con tapa moleteada (la del + en rúbrica)
function borne(x, y, h, signo) {
  return S(k.cylinder(x, y, 1.6, 0, 1, P, 20), { tone: "lo" }) + S(k.cylinder(x, y, 0.8, 1, h - 2.2, P, 16), { tone: "mid" })
    + S(k.cylinder(x, y, 1.3, h - 1.2, 1.2, P, 20, 0.2), { tone: "hi", className: signo === "+" ? "tapa-mas" : "tapa-menos" })
    + L(k.knurl(x, y, 1.3, h - 1.0, h - 0.2, 10, P), { tone: "lo" });
}
// Portapilas: canal, placa del − a la izquierda, resorte a la derecha, celdas en serie, pinza con su cable y borne +
function portapilas(m) {
  const o = [S(k.slabOf(CANAL, 0, 1.6, P, 3, 0.2), { tone: "mid" })];
  o.push(L(k.planOutline(k.insetPlan(CANAL, 0.8), 1.6, P, 3), { tone: "lo" }));
  o.push(S(k.slabOf({ x: CANAL.x + 0.2, y: CY - 2.6, w: 0.8, d: 5.2, r: 0.2 }, 1.6, 4.6, P, 2), { tone: "hi", className: "metal" }));
  // Resorte al final del canal
  const xr = CANAL.x + CANAL.w - 1.6;
  const co = k.coil(xr - 0.4, xr + 1, [CY, CZ], 1.3, 4, "x", P); o.push(L(co.back, { tone: "lo" }) + L(co.front, { tone: "mid" }));
  o.push(S(k.slabOf({ x: xr + 0.8, y: CY - 2.6, w: 0.6, d: 5.2, r: 0.2 }, 1.6, 4.6, P, 2), { tone: "hi", className: "metal" }));
  // Celdas (de atrás hacia adelante = de x chica a x grande)
  for (let i = 0; i < NMAX; i++) {
    const x0 = CX0 + i * PITCH;
    const c = cil(cilX(x0, x0 + CL, CY, CZ, CR), "celda") + cil(cilX(x0 + CL - 1.5, x0 + CL, CY, CZ, CR + 0.04), "envoltura")
      + cil(cilX(x0 + CL, x0 + CL + NUB, CY, CZ, 0.7), "nub");
    o.push(E("g", "cel" + i, {}, m, c));
  }
  const parte = `<g data-parte="01">${o.join("")}`;
  // Pinza (se dibuja en la celda 1 y se traslada a la última)
  const xe = CX0 + CL + NUB;
  const pz = S(k.slabOf({ x: xe - 1.4, y: CY - 1.3, w: 1.8, d: 2.6, r: 0.3 }, CZ + 0.6, 1.8, P, 2), { tone: "hi", className: "tapa-mas" })
    + L(k.segment([xe - 0.5, CY - 1.3, CZ + 0.6], [xe - 0.5, CY - 1.3, CZ - 0.4], P) + k.segment([xe - 0.5, CY + 1.3, CZ + 0.6], [xe - 0.5, CY + 1.3, CZ - 0.4], P), { tone: "hi" });
  const resto = E("g", "pinza", {}, m, pz) + E("path", "puente", { class: "cable puente" }, m) + borne(POSTE_MAS[0], POSTE_MAS[1], 6, "+")
    + textoArriba(CANAL.x - 0.5, CY + 5.6, J.figura.menos, 3.2) + textoArriba(POSTE_MAS[0] - 1, CY + 5.6, J.figura.mas, 3.2)
    + S(k.slabOf(TAG, 0, 0.5, P, 2), { tone: "lo", className: "pantalla-q", crease: "none" })
    + E("text", "t-volt", { class: "t-cont", transform: k.topMatrix([TAG.x + 1.2, TAG.y + 2.7], 0.5, P, "x"), "font-size": "2.6" }, m);
  return parte + resto + `</g>`;
}
// Interruptor de cuchilla: base con tornillos, bisagra, mordaza, cuchilla y mango aislante
function interruptor(m) {
  const o = [S(k.slabOf(SW, 0, 2, P, 3, 0.3), { tone: "mid" })];
  o.push(D([at([SW.x + 1, SY, 2]), at([SW.x + SW.w - 1, SY, 2])], { size: 0.9 }));
  o.push(S(k.slabOf({ x: PIV[0] - 1.4, y: SY - 1.8, w: 2.8, d: 3.6, r: 0.3 }, 2, 4.2, P, 2), { tone: "hi", className: "metal" }));
  const xm = PIV[0] + LH;
  o.push(S(k.slabOf({ x: xm - 1.4, y: SY - 1.8, w: 2.8, d: 0.9, r: 0.2 }, 2, 4.6, P, 2), { tone: "hi", className: "metal" }));
  const cuch = E("path", "cuchilla-c", { class: "cuchilla-c" }, m) + E("path", "cuchilla", { class: "cuchilla" }, m)
    + E("path", "mango", { class: "mango" }, m) + E("circle", "perilla-m", { class: "perilla-m", r: "2.1" }, m);
  o.push(E("g", "palanca", { class: "palanca" }, m, cuch));
  o.push(S(k.slabOf({ x: xm - 1.4, y: SY + 0.9, w: 2.8, d: 0.9, r: 0.2 }, 2, 4.6, P, 2), { tone: "hi", className: "metal" }));
  o.push(D([at([PIV[0], SY + 1.82, PIV[2]])], { size: 0.7 }));
  return `<g data-parte="02">${o.join("")}</g>`;
}
// Resistor: bornes, patitas, cuerpo con bandas de color y etiqueta con su valor
function resistor(m) {
  const o = [borne(RB1[0], RB1[1], 5.6, "-"), borne(RB2[0], RB2[1], 5.6, "-")];
  o.push(`<path class="patita" d="${k.segment([RB1[0], SY, RZ], [RX0, SY, RZ], P) + k.segment([RX1, SY, RZ], [RB2[0], SY, RZ], P)}"/>`);
  const cuerpo = cil(cilX(RX0, RX1, SY, RZ, RRAD), "cuerpo-r");
  const bs = BX.map((x, i) => E("g", "banda" + i, { class: "cil banda" }, m, `<path class="c-f" d="${cilX(x, x + BW, SY, RZ, RRAD + 0.06).fill}"/>`)).join("");
  const tol = `<g class="cil banda tol"><path class="c-f" d="${cilX(BTOL, BTOL + BW, SY, RZ, RRAD + 0.06).fill}"/></g>`;
  const etq = S(k.slabOf(RTAG, 0, 0.5, P, 2), { tone: "lo", className: "pantalla-q", crease: "none" })
    + E("text", "t-res", { class: "t-cont", transform: k.topMatrix([RTAG.x + 1.2, RTAG.y + 2.4], 0.5, P, "x"), "font-size": "2.4" }, m);
  return `<g data-parte="03">${o.join("")}${cuerpo}</g><g data-parte="04">${bs}${tol}</g><g data-parte="03">${etq}</g>`;
}
// Amperímetro: zócalo, caja, carátula con escala 0–escala mA, tope, aguja, pantallita y bornes al frente
function amperimetro(m) {
  const o = [S(k.slabOf(MP, 0, MZ0, P, 3, 0.3), { tone: "mid" }), S(k.slabOf(MB, MZ0, MZ1 - MZ0, P, 4, 0.6), { tone: "mid" })];
  o.push(L(k.planOutline(k.insetPlan(MB, 1.4), MZ1, P), { tone: "faint" }));
  o.push(S(k.slabOf({ x: MB.x + 2.4, y: YF, w: MB.w - 4.8, d: 0.4, r: 0.2 }, 8, 17.6, P, 2), { tone: "lo", lit: true, crease: "none" }));
  const enD = (a2, r) => at([DC[0] + r * Math.cos(a2), DC[1], DC[2] + r * Math.sin(a2)]);
  const esc_ = VI.escala;
  let arco = "", menor = "", mayor = "", tx = "";
  for (let i = 0; i <= 40; i++) arco += (i ? "L" : "M") + pt2(enD(A0 - (A0 - A1) * i / 40, DR));
  for (let v = 0; v <= esc_; v++) {
    const a2 = A0 - (A0 - A1) * v / esc_, big = v % 5 === 0;
    const sgm = "M" + pt2(enD(a2, DR)) + "L" + pt2(enD(a2, DR - (big ? 2 : 1.1)));
    if (big) { mayor += sgm; const q = enD(a2, DR - 4); tx += `<text class="t-esc" text-anchor="middle" x="${q[0].toFixed(1)}" y="${(q[1] + 2.5).toFixed(1)}">${esc(fmt(v))}</text>`; }
    else menor += sgm;
  }
  const qu = at([DC[0] - 6.5, DC[1], DC[2] - 1.2]);
  tx += `<text class="t-esc u" text-anchor="middle" x="${qu[0].toFixed(1)}" y="${(qu[1] + 3).toFixed(1)}">${esc(J.figura.escala)}</text>`;
  const escala = `<g data-parte="06"><path class="arco" d="${arco}"/><path class="tk menor" d="${menor}"/><path class="tk mayor" d="${mayor}"/>${tx}${D([enD(ATOPE, DR - 0.6)], { size: 0.9 })}</g>`;
  const ag = E("path", "fantasma", { class: "fantasma aguja-f" }, m) + E("path", "aguja", { class: "aguja-a" }, m) + D([at(DC)], { size: 1.3, tone: "hi" });
  const pan = S(k.slabOf({ x: MB.x + 6, y: YF, w: MB.w - 12, d: 0.4, r: 0.15 }, 3.4, 3.8, P, 2), { tone: "lo", className: "pantalla-q", crease: "none" })
    + E("text", "t-amp", { class: "t-cont", transform: k.sideMatrix([MB.x + 7.2, YF + 0.42], 4.4, P, "left"), "font-size": "2.6" }, m);
  const br = borne(MENOS_A[0], MENOS_A[1], 4.6, "-") + borne(MAS_A[0], MAS_A[1], 4.6, "+")
    + L(k.segment([MENOS_A[0], MENOS_A[1], 3.6], [MENOS_A[0], MP.y + MP.d, 1.4], P) + k.segment([MAS_A[0], MAS_A[1], 3.6], [MAS_A[0], MP.y + MP.d, 1.4], P), { tone: "mid" })
    + textoArriba(MENOS_A[0] + 2.4, MENOS_A[1] + 1, J.figura.menos, 3.2) + textoArriba(MAS_A[0] - 4.4, MAS_A[1] + 1, J.figura.mas, 3.2);
  return `<g data-parte="05">${o.join("")}</g>${escala}<g data-parte="05">${pan}${ag}${br}</g>`;
}

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = Object.keys(J.rotulos);
const FL = Array.from({ length: NFL }, (_, i) => { let u = (i + 0.5) * TOTAL / NFL; return u; });
function cuerpo(m) {
  return [
    placa(), cables(),
    `<g class="cargas" data-parte="07">` + Array.from({ length: NQ }, (_, i) => E("circle", "q" + i, { r: "1.15" }, m)).join("") + `</g>`,
    `<g data-parte="07">` + FL.map((_, i) => E("path", "fl" + i, { class: "flecha-c" }, m)).join("") + `</g>`,
    portapilas(m), interruptor(m), resistor(m), amperimetro(m),
    E("text", "fant-t", { class: "t-trampa", "text-anchor": "end", "data-parte": "09" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}
// Las flechas no caen en tramos ocultos: se recorren hasta el siguiente tramo visible
for (let i = 0; i < FL.length; i++) {
  let u = FL[i], g = 0;
  const tramo = (x) => { let j = 0; while (j < LARGOS.length - 1 && ACUM[j + 1] <= x) j++; return j; };
  while (OCULTO[tramo(u)] && g++ < 50) u += 2;
  FL[i] = u;
}

const CFG = { P, W, H, NMAX, PASOV, PITCH, CX0, CL, NUB, CY, CZ, CANAL, POSTE: POSTE_MAS, PIV, LH, ABRE, SW, RX0, RRAD, RZ, BX, MB, MZ1, DC, DR, A0, A1, ATOPE,
  MENOS: MENOS_A, SY, ZC, RUTA, OCULTO, LARGOS, ACUM, TOTAL, SEPQ, NQ, FL, ROT };
const estado0 = { V: VI.V, R: VI.R, q: 0, on: false, ang: ABRE, aguja: 0, revelado: false, trampa: false, flechas: false };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, vista, calc, bandas y sobre) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/ley-de-ohm-interactivo.json", {cache:"no-cache"});
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    const s = document.getElementById("respaldo");   // solo en la vista previa
    if (s) return JSON.parse(s.textContent);
    throw e;
  }
}
let J;
try { J = await cargar(); }
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/ley-de-ohm-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V0 = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles, ES = J.escena, DEC = L.decimales || {};
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

let V = V0.V, R = V0.R, q = 0, on = false, ang = C.ABRE, aguja = 0, vAg = 0;
let revelado = false, trampaOn = false, sel = null, selRec = false, enRecorrido = false;
const numeros = () => {
  const d = calc(J, V, R), o = {};
  for (const x in d) o[x] = num(d[x], DEC[x] ?? 2);
  const b = bandas(d.Rohm), col = J.figura.colores;
  o.bandas = `${col[b[0]]}-${col[b[1]]}-${col[b[2]]}`; o.d1 = b[0]; o.d2 = b[1];
  return o;
};

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#encender"), bTrampa = $("#trampa"), bExamen = $("#examen"), nota = $("#nota");
const SL = { V: $("#s-v"), R: $("#s-r") };

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#pred-t").textContent = J.prediccion.titulo;
$("#sum-imp").textContent = CT.profundizar;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
for (const x of ["V", "R"]){ $("#l-" + x.toLowerCase()).textContent = CT[x]; SL[x].min = RG[x].min; SL[x].max = RG[x].max; SL[x].step = RG[x].paso; }
$("#escala").textContent = `Sin escala · la aguja marca de 0 a ${num(V0.escala)} mA`;
stage.setAttribute("aria-valuemin", RG.V.min); stage.setAttribute("aria-valuemax", RG.V.max);
stage.setAttribute("aria-label", "Lámina: flechas izquierda y derecha cambian el voltaje de la pila; arriba y abajo, el resistor; B cierra o abre el interruptor");

// ---------- Rótulos y fichas (nombre y texto en J.rotulos; lo que aún no se revela sale como «?») ----------
const fichaVacia = "Toca un número para ver qué hace cada parte.";
function setSel(n){
  sel = n;
  document.querySelectorAll(".rot-b").forEach(b => b.setAttribute("aria-pressed", b.dataset.n === sel));
  svg.querySelectorAll("[data-parte]").forEach(e => {
    const dentro = e.closest(`[data-parte="${sel}"]`) || e.querySelector(`[data-parte="${sel}"]`);
    e.classList.toggle("apagado", !!sel && !dentro);
  });
  svg.querySelectorAll(".rot").forEach(g => g.classList.toggle("activo", g.dataset.n === sel));
  pintarFicha();
}
const seleccionar = (n) => { selRec = false; setSel(sel === n ? null : n); };
const rv = () => revelado && !enRecorrido;
const OCULTOS = ["I", "IA", "Vc", "Pm"];
function valores(){
  const n = numeros();
  if (!rv()) for (const x of OCULTOS) n[x] = "?";
  return n;
}
function pintarFicha(){
  const fi = J.rotulos[sel];
  if (!fi){ $("#ficha").innerHTML = fichaVacia; return; }
  const o = valores();
  $("#ficha").innerHTML = `<b>${sel} · ${tpl(fi[0], o)}.</b> ${tpl(fi[1], o)}`;
}
C.ROT.forEach(n => {
  const b = document.createElement("button"); b.type = "button"; b.className = "rot-b"; b.dataset.n = n;
  b.setAttribute("aria-pressed", "false"); b.innerHTML = `<b>${n}</b><span></span>`;
  b.addEventListener("click", () => seleccionar(n)); $("#rotulos").append(b);
  $("#rot-" + n).addEventListener("click", (e) => { e.stopPropagation(); seleccionar(n); });
});

// ---------- Mensajes ----------
const decir = (s) => { if (!enRecorrido) nota.textContent = s; };

// ---------- Dibujo que cambia: la vista da los atributos; solo se escriben los que cambian ----------
const previo = new Map();
function aplicar(mm){
  for (const id in mm){
    if (id[0] === "_") continue;
    const e = document.getElementById(id); if (!e) continue;
    const v = mm[id];
    for (const x in v){
      const val = x === "_v" ? (v[x] ? "" : "none") : String(v[x]), clave = id + "|" + x;
      if (previo.get(clave) === val) continue; previo.set(clave, val);
      if (x === "_v") e.style.display = val; else if (x === "_t") e.textContent = val; else e.setAttribute(x, val);
    }
  }
}
const fluye = () => on && ang < 0.02;   // la corriente pasa cuando la cuchilla ya toca la mordaza
const estado = () => ({ V, R, q, on: fluye(), ang, aguja, revelado: rv(), trampa: trampaOn, flechas: quieto });
const valorSl = (x, v) => tpl(CT["valor" + x], { v: num(v) });

function render(){
  const n = numeros(), o = valores();
  aplicar(vista(C, K, estado(), J));
  // Panel
  $("#o-i").textContent = rv() ? `${n.I} mA` : "? mA";
  $("#o-formula").innerHTML = rv() ? tpl(L.corrienteValor, n) : L.sinRevelar;
  for (const [x, v] of [["V", V], ["R", R]]){
    const s = SL[x];
    $("#o-" + x.toLowerCase()).textContent = valorSl(x, v);
    s.style.setProperty("--p", (100 * (v - RG[x].min) / (RG[x].max - RG[x].min)) + "%");
    if (Math.abs(+s.value - v) > 1e-9) s.value = v;
    s.setAttribute("aria-valuetext", valorSl(x, v));
  }
  $("#o-vv").textContent = `${n.V} V`;
  $("#o-ro").textContent = `${n.Rohm} Ω`;
  $("#o-ia").textContent = `${o.IA} A`;
  const lect = `V ${n.V} V · R ${n.R} kΩ · I ${o.I} mA`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", V);
  stage.setAttribute("aria-valuetext", `Pila de ${n.V} V y resistor de ${n.R} kΩ; interruptor ${on ? CT.cerrado : CT.abierto}` + (rv() ? `; corriente ${n.I} mA` : ""));
  bPri.textContent = on ? CT.apagar : CT.encender;
  $("#palanca").setAttribute("aria-label", tpl(CT.valorPerilla, { estado: on ? CT.cerrado : CT.abierto }));
  document.querySelectorAll(".rot-b").forEach(b => { const tt = tpl(J.rotulos[b.dataset.n][0], o), sp = b.querySelector("span"); if (sp.textContent !== tt) sp.textContent = tt; });
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.voltaje, tpl(L.voltajeValor, o)],
    [L.resistencia, tpl(L.resistenciaValor, o)],
    [L.corriente, tpl(L.corrienteValor, o) + "<br>" + tpl(L.atajoValor, o)],
    [L.trampa, tpl(L.trampaValor, o) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((x, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${x[0]}</span><span class="va">${x[1]}</span></li>`).join("");
  $("#impulso").innerHTML = J.profundizar.parrafos.map(p => `<p>${tpl(p, o)}</p>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento: cuchilla (se acerca a su ángulo), aguja (resorte amortiguado) y cargas (rapidez ∝ I) ----------
let anim = 0, pendiente = false;
const meta = () => (fluye() ? calc(J, V, R).I / V0.escala : 0);
function quietoAhora(){ ang = on ? 0 : C.ABRE; aguja = meta(); vAg = 0; }
function correr(){
  if (quieto){ quietoAhora(); render(); return; }
  if (anim) return;
  pendiente = true;
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.max(0, Math.min(0.05, (ahora - antes) / 1000)); antes = ahora;
    const objetivo = on ? 0 : C.ABRE;
    ang += (objetivo - ang) * (1 - Math.exp(-dt * 11)); if (Math.abs(objetivo - ang) < 0.004) ang = objetivo;
    const a = 70 * (meta() - aguja) - 11 * vAg; vAg += a * dt; aguja += vAg * dt;
    if (fluye()) q += ES.rapidez * calc(J, V, R).I * dt;
    render();
    const quietos = Math.abs(meta() - aguja) < 0.0015 && Math.abs(vAg) < 0.003 && ang === objetivo;
    if (fluye() || !quietos) anim = requestAnimationFrame(paso);
    else { aguja = meta(); vAg = 0; anim = 0; pendiente = false; render(); }
  };
  anim = requestAnimationFrame(paso);
}
function detener(){ cancelAnimationFrame(anim); anim = 0; pendiente = false; }
function cerrar(){
  on = true; revelado = true;
  decir(tpl(L.mensajeCerrado, numeros()));
  correr();
}
function abrir(){
  on = false; decir(tpl(L.mensajeAbierto, numeros()));
  correr();
}
function principal(){ if (on) abrir(); else cerrar(); }

// ---------- Palanca: tocarla cierra o abre; arrastrarla hacia abajo cierra y hacia arriba abre ----------
const palanca = $("#palanca");
palanca.setAttribute("role", "button"); palanca.setAttribute("tabindex", "-1");
let arr = null;
palanca.addEventListener("pointerdown", (e) => { e.stopPropagation(); tomarControl(); arr = { y: e.clientY, movio: false }; palanca.setPointerCapture(e.pointerId); });
palanca.addEventListener("pointermove", (e) => {
  if (!arr) return;
  const dy = e.clientY - arr.y;
  if (Math.abs(dy) > 8){ arr.movio = true; if (dy > 0 && !on) cerrar(); else if (dy < 0 && on) abrir(); arr.y = e.clientY; }
});
const suelta = () => { if (arr && !arr.movio) principal(); arr = null; };
palanca.addEventListener("pointerup", suelta);
palanca.addEventListener("pointercancel", () => { arr = null; });
palanca.addEventListener("click", (e) => e.stopPropagation());
palanca.classList.add("toque");

// ---------- Recorrido automático: recorre los rótulos sin cerrar ni mostrar el resultado; se detiene al tocar ----------
const REC = C.ROT.filter(n => n !== "09");
let tRec = 0, iRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  selRec = true; setSel(REC[iRec % REC.length]); iRec++; render();
  tRec = setTimeout(pasoRecorrido, 2400);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim || on){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe ni tapa lo que hizo el usuario
  enRecorrido = true; nota.textContent = ""; pasoRecorrido();
}
function tomarControl(){
  if (enRecorrido){
    enRecorrido = false; clearTimeout(tRec);
    if (selRec){ selRec = false; setSel(null); }
    render();
  }
  clearTimeout(tRec); tRec = setTimeout(iniciarRecorrido, 6000);
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (!visible && enRecorrido) tomarControl(); if (!visible && anim){ cancelAnimationFrame(anim); anim = 0; }
  if (visible && !anim && pendiente) correr(); }, {rootMargin:"0px"}).observe(stage);
setTimeout(() => { if (visible) iniciarRecorrido(); else tRec = setTimeout(iniciarRecorrido, 6000); }, 1400);

// ---------- Controles ----------
bPri.addEventListener("click", principal);
bExamen.addEventListener("click", () => {
  detener(); on = false; V = V0.V; R = V0.R; q = 0; revelado = false; ang = C.ABRE; aguja = 0; vAg = 0;
  if (trampaOn) apagarTrampa();
  decir(tpl(L.mensajeReinicio, numeros())); render(); pintarPrediccion();
});
function apagarTrampa(){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){
    revelado = true;
    if (!on) cerrar(); else render();
    decir(tpl(L.mensajeTrampa, numeros()));
  } else render();
});
// Cambiar V o R: con el circuito cerrado la aguja se va al nuevo valor; abierto, el resultado vuelve a «?»
function cambia(x, v){
  const antes = x === "V" ? V : R;
  if (v === antes) return 0;
  if (x === "V") V = v; else R = v;
  if (!on) revelado = false;
  correr();
  return v > antes ? 1 : -1;
}
const mensajeDe = (x, sg) => tpl(x === "V" ? (sg > 0 ? L.mensajeCambioV : L.mensajeBajaV) : (sg > 0 ? L.mensajeCambioR : L.mensajeBajaR), valores());
const ultimo = { V: V0.V, R: V0.R };
for (const x of ["V", "R"]){
  SL[x].addEventListener("input", () => { cambia(x, +SL[x].value); render(); });
  SL[x].addEventListener("change", () => { const v = x === "V" ? V : R, sg = Math.sign(v - ultimo[x]); ultimo[x] = v; if (sg) decir(mensajeDe(x, sg)); render(); pintarPrediccion(); });
}
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
const pasoR = (x, v) => Math.max(RG[x].min, Math.min(RG[x].max, Math.round(v / RG[x].paso) * RG[x].paso));
stage.addEventListener("keydown", (e) => {
  const t = {ArrowRight:["V", 1], ArrowLeft:["V", -1], ArrowUp:["R", 1], ArrowDown:["R", -1]}[e.key];
  if (!t) return;
  e.preventDefault();
  const [x, s] = t, v = x === "V" ? V : R, sg = cambia(x, pasoR(x, v + s * RG[x].paso));
  ultimo[x] = x === "V" ? V : R;
  if (sg) decir(mensajeDe(x, sg)); render(); pintarPrediccion();
});

// ---------- Preguntas ----------
const BIEN = '<svg class="ico b" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>';
const MAL = '<svg class="ico m" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
function opciones(cont, ops, alElegir){
  cont.innerHTML = "";
  ops.forEach(o => {
    const b = document.createElement("button"); b.type = "button"; b.className = "op";
    b.innerHTML = `<span>${o.t}</span><span class="res" aria-live="polite"></span>`;
    b.addEventListener("click", () => {
      b.classList.add(o.ok ? "bien" : "mal");
      b.querySelector(".res").innerHTML = `${o.ok ? BIEN : MAL} <b>${o.ok ? J.prueba.marcaCorrecta : J.prueba.marcaIncorrecta}.</b> ${o.e}`;
      if (alElegir) alElegir(o);
    });
    cont.append(b);
  });
}
// «Predice»: las opciones salen de las fórmulas del JSON con V y R de los deslizadores (en el orden del examen); cada una con su unidad
const LETRAS = ["A", "B", "C", "D"];
function pintarPrediccion(){
  const d = calc(J, V, R), n = numeros();
  $("#pred-q").innerHTML = tpl(J.prediccion.pregunta, n);
  const ops = J.prediccion.opciones.map((x, i) => ({ ok: !!x.correcta, e: tpl(x.retro, n), t: `${LETRAS[i]}) ${num(evalua(x.formula, d), DEC[x.formula] ?? 2)} ${x.unidad || J.prediccion.unidad}` }));
  opciones($("#pred-ops"), ops, () => {
    tomarControl(); if (trampaOn) apagarTrampa();
    revelado = true;
    if (!on) cerrar(); else render();
  });
}
pintarPrediccion();

// ---------- Los 6 pasos (capa 1): tal cual el JSON (el mismo texto del .md) ----------
J.pasos.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.parrafos || []).map(x => `<p>${x}</p>`).join("");
  if (p.pregunta){
    s.insertAdjacentHTML("beforeend", `<p>${p.pregunta.enunciado}</p>`);
    const l = document.createElement("div"); l.className = "opciones";
    opciones(l, p.pregunta.opciones.map(o => ({ t: o.texto, ok: !!o.correcta, e: o.explicacion }))); s.append(l);
  }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});

$("#pie").innerHTML = `<i>${J.figura.pie}</i> Modelo: el dibujo no va a escala. La pila es un portapilas de hasta ${C.NMAX} celdas de ${num(RG.V.paso)} V en serie: cada celda suma ${num(RG.V.paso)} V y la pinza toma el + de la última, así que ${num(V0.V)} V son ${num(V0.V / RG.V.paso)} celdas.
 El resistor va de ${num(RG.R.min)} a ${num(RG.R.max)} kΩ; sus bandas siguen el código de colores (cifra, cifra y multiplicador; la cuarta, dorada, es la tolerancia). Los cables y el amperímetro se toman sin resistencia, y el amperímetro marca de 0 a ${num(V0.escala)} mA.
 Los puntos son cargas que siempre están en el cable: al cerrar el interruptor se mueven todas a la vez y al abrirlo se detienen todas a la vez. Avanzan del + al − (corriente convencional) con una rapidez proporcional a la corriente, solo para comparar; los electrones reales van del − al + y mucho más despacio.
 Si nadie toca, la lámina recorre sus partes sin cerrar el circuito ni mostrar el resultado; con movimiento reducido, flechas fijas marcan el sentido de la corriente y la aguja salta a su valor. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B cierra o abre; con la lámina enfocada, ← → cambian el voltaje y ↑ ↓ el resistor. También puedes tocar o arrastrar la palanca del interruptor.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#encender", "#trampa", "#bloque-v", "#bloque-r"].map(s => $(s));
let modo = false, huecos = [];
let zz = 1, tx = 0, ty = 0;
const ptrs = new Map(); let pinch = null, arrastre = null, movido = false;
function aplicaZoom(){
  const w = svg.clientWidth, h = svg.clientHeight;
  zz = Math.max(1, Math.min(4, zz));
  tx = Math.min(0, Math.max(w * (1 - zz), tx)); ty = Math.min(0, Math.max(h * (1 - zz), ty));
  svg.style.transform = zz === 1 ? "" : `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${zz.toFixed(3)})`;
}
function zoomA(z2, px, py){ z2 = Math.max(1, Math.min(4, z2)); tx = px - (px - tx) * z2 / zz; ty = py - (py - ty) * z2 / zz; zz = z2; aplicaZoom(); }
const sinZoom = () => { zz = 1; tx = 0; ty = 0; aplicaZoom(); };
const local = (x, y) => { const r = stage.getBoundingClientRect(); return [x - r.left, y - r.top]; };
async function entrar(){
  if (modo) return; modo = true;
  huecos = MOVIBLES.map(e => { const c = document.createComment("hueco"); e.before(c); compacto.append(e); return [e, c]; });
  pant.classList.add("modo-lamina"); document.documentElement.classList.add("sin-scroll");
  if (document.fullscreenEnabled && pant.requestFullscreen){
    try { await pant.requestFullscreen({navigationUI:"hide"}); } catch (e) {}
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch (e) {}
  }
  bCerrar.focus({preventScroll:true}); decir("Pantalla completa: pellizca o usa Ctrl + rueda para acercar; doble toque o Esc para volver.");
}
function salir(){
  if (!modo) return; modo = false; sinZoom();
  huecos.forEach(([e, c]) => c.replaceWith(e)); huecos = [];
  pant.classList.remove("modo-lamina"); document.documentElement.classList.remove("sin-scroll");
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  bCompleta.focus({preventScroll:true});
}
bCompleta.addEventListener("click", entrar);
bCerrar.addEventListener("click", salir);
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && modo) salir(); });
document.addEventListener("keydown", (e) => { if (modo && e.key === "Escape"){ e.preventDefault(); if (zz > 1) sinZoom(); else salir(); } });
addEventListener("resize", () => { if (modo) aplicaZoom(); });
stage.addEventListener("pointerdown", (e) => {
  if (!modo) return;
  ptrs.set(e.pointerId, [e.clientX, e.clientY]); movido = false;
  if (ptrs.size === 2){ const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: zz }; arrastre = null; }
  else if (ptrs.size === 1 && zz > 1 && !arr) arrastre = [e.clientX, e.clientY, tx, ty];
});
stage.addEventListener("pointermove", (e) => {
  if (!modo || !ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2 && pinch){
    const [a, b] = [...ptrs.values()], [px, py] = local((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    zoomA(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, px, py); movido = true;
  } else if (arrastre){
    const dx = e.clientX - arrastre[0], dy = e.clientY - arrastre[1];
    if (Math.hypot(dx, dy) > 4) movido = true;
    tx = arrastre[2] + dx; ty = arrastre[3] + dy; aplicaZoom();
  }
});
const sueltaPtr = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) arrastre = null; };
stage.addEventListener("pointerup", sueltaPtr); stage.addEventListener("pointercancel", sueltaPtr);
stage.addEventListener("click", (e) => { if (movido){ e.stopPropagation(); e.preventDefault(); movido = false; } }, true);
stage.addEventListener("wheel", (e) => {
  if (!modo || !(e.ctrlKey || e.metaKey)) return;
  e.preventDefault(); const [px, py] = local(e.clientX, e.clientY); zoomA(zz * Math.exp(-e.deltaY * 0.002), px, py);
}, {passive:false});
stage.addEventListener("dblclick", () => { if (modo) sinZoom(); });

if (quieto) quietoAhora();
pintarFicha(); render();
window.__ohm = { set:(o) => { if ("V" in o) V = o.V; if ("R" in o) R = o.R; if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa; render(); },
  sel:seleccionar, completa:entrar, salir, cerrar, abrir, estado:() => ({ V, R, q, on, ang, aguja, revelado, trampaOn }),
  alto:() => { enRecorrido = false; clearTimeout(tRec); if (selRec){ selRec = false; setSel(null); } render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de la ley de Ohm) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados tal cual del generador de ondas (Arquímedes v2).
const CSS_PRENSA = `
@font-face{font-family:"EB Garamond";font-style:normal;font-weight:400 600;font-display:swap;src:url(../../../codice/fuentes/eb-garamond.woff2) format("woff2")}
@font-face{font-family:"EB Garamond";font-style:italic;font-weight:400;font-display:swap;src:url(../../../codice/fuentes/eb-garamond-italica.woff2) format("woff2")}
/* Tokens de la fusión (Arquímedes v2) */
:root{
  --bg:#F6F1E6;--sup:#FFFCF6;--texto:#2E2117;--suave:#77634F;--borde:#E5DACA;--borde-fuerte:#CDBEA5;
  --acento:#2F6F73;--rubrica:#A5352A;--dorado:#B08A3E;--empuje:#A5352A;--bien:#2F7D5B;--mal:#A5352A;
  --agua-1:#93C7C4;--agua-2:#2F6F73;--agua-sup:#D9EEEC;--sobre-acento:#FFFFFF;
  --serif:"EB Garamond","Iowan Old Style",Georgia,serif;
  color-scheme:light;box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#17120D;--sup:#211912;--texto:#EFE4CF;--suave:#B6A385;--borde:#382C20;--borde-fuerte:#4D3D2C;
  --acento:#7FB3B0;--rubrica:#E07A5F;--dorado:#D9B26A;--empuje:#E07A5F;--bien:#7FC9A0;--mal:#E07A5F;
  --agua-1:#5E9F9C;--agua-2:#245D60;--agua-sup:#8CC4C0;--sobre-acento:#17120D;color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#17120D;--sup:#211912;--texto:#EFE4CF;--suave:#B6A385;--borde:#382C20;--borde-fuerte:#4D3D2C;
  --acento:#7FB3B0;--rubrica:#E07A5F;--dorado:#D9B26A;--empuje:#E07A5F;--bien:#7FC9A0;--mal:#E07A5F;
  --agua-1:#5E9F9C;--agua-2:#245D60;--agua-sup:#8CC4C0;--sobre-acento:#17120D;color-scheme:dark}
/* Dibujo Anatomy con grises calentados hacia el papel de la fusión */
.iso{
  --anatomy-page:var(--bg);--anatomy-card:var(--sup);--anatomy-text:#5E5145;--anatomy-strong:var(--texto);--anatomy-muted:#9A8C7B;
  --anatomy-paper:#FFFCF6;--anatomy-face:#FFFFFF;--anatomy-top:#FFFEFA;
  --anatomy-shade-0:#E2DACB;--anatomy-shade-1:#EAE3D6;--anatomy-shade-2:#F1EBE0;--anatomy-shade-3:#F7F2E9;
  --anatomy-lit-top:#FFFFFF;--anatomy-lit-shade:#F1ECE3;
  --anatomy-hi:#2E2621;--anatomy-mid:#8E8477;--anatomy-lo:#BCB2A4;--anatomy-faint:#DCD3C5;--anatomy-lit:#1E1712;
  --anatomy-halo:#8A7C66;--anatomy-halo-opacity:.32;--anatomy-dot:#3E342B;
  --anatomy-red:var(--rubrica);--anatomy-green:var(--acento);--anatomy-blue:var(--acento);
  --anatomy-weight:.6px;--anatomy-mono:ui-monospace,Consolas,"SF Mono",Menlo,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .iso{
  --anatomy-text:#BCAE98;--anatomy-muted:#7E715F;
  --anatomy-paper:#211912;--anatomy-face:#2A2018;--anatomy-top:#2B2119;
  --anatomy-shade-0:#1A140E;--anatomy-shade-1:#1D1610;--anatomy-shade-2:#201812;--anatomy-shade-3:#241B14;
  --anatomy-lit-top:#3A2E23;--anatomy-lit-shade:#2C2219;
  --anatomy-hi:#E3D7C3;--anatomy-mid:#7C6F5F;--anatomy-lo:#4B4035;--anatomy-faint:#33291F;--anatomy-lit:#FFF7E8;
  --anatomy-halo:#050302;--anatomy-halo-opacity:.85;--anatomy-dot:#E3D7C3}}
:root[data-theme="dark"] .iso{
  --anatomy-text:#BCAE98;--anatomy-muted:#7E715F;
  --anatomy-paper:#211912;--anatomy-face:#2A2018;--anatomy-top:#2B2119;
  --anatomy-shade-0:#1A140E;--anatomy-shade-1:#1D1610;--anatomy-shade-2:#201812;--anatomy-shade-3:#241B14;
  --anatomy-lit-top:#3A2E23;--anatomy-lit-shade:#2C2219;
  --anatomy-hi:#E3D7C3;--anatomy-mid:#7C6F5F;--anatomy-lo:#4B4035;--anatomy-faint:#33291F;--anatomy-lit:#FFF7E8;
  --anatomy-halo:#050302;--anatomy-halo-opacity:.85;--anatomy-dot:#E3D7C3}
html{scroll-padding-top:env(safe-area-inset-top,0px);background:var(--bg)}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--texto);font:400 17px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;-webkit-text-size-adjust:100%}
.num,output{font-variant-numeric:tabular-nums}
sub,sup{font-size:.72em;line-height:0;position:relative;vertical-align:baseline}
sub{bottom:-.25em} sup{top:-.45em}
.pagina{max-width:1160px;margin:0 auto;padding:20px 16px 40px}
header{margin-bottom:18px}
.marca-casa{font:italic 400 1.05rem/1.2 var(--serif);color:var(--rubrica)}
h1{margin:2px 0 4px;font:500 clamp(2.1rem,8vw,3.1rem)/1.02 var(--serif);letter-spacing:-.015em}
.sub{margin:0;padding-bottom:12px;border-bottom:3px double var(--borde-fuerte);color:var(--suave)}
.rejilla{display:grid;gap:16px;grid-template-columns:minmax(0,1fr);grid-template-areas:"a" "lab" "b"}
#pasos-a{grid-area:a} #pasos-b{grid-area:b} .lab{grid-area:lab}
.pasos{display:grid;gap:16px;align-content:start}
.tarjeta{background:var(--sup);border:1px solid var(--borde);border-radius:12px;padding:18px 18px 16px}
.tarjeta h2{display:flex;align-items:center;gap:10px;margin:0 0 8px;font:500 1.4rem/1.15 var(--serif)}
.n{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;border:1.5px solid var(--rubrica);color:var(--rubrica);font:500 1.05rem/1 var(--serif);font-variant-numeric:lining-nums}
.tarjeta p{margin:6px 0;max-width:62ch}
.formula{display:inline-block;padding:4px 10px;border-radius:8px;background:var(--bg);font:500 1.2rem var(--serif);font-variant-numeric:lining-nums}
.opciones{display:grid;gap:8px;margin-top:10px}
.op{font:inherit;color:var(--texto);text-align:left;background:var(--sup);border:1.5px solid var(--borde);border-radius:12px;padding:12px 14px;min-height:48px;cursor:pointer}
@media (hover:hover){.op:hover{border-color:var(--suave)}}
.op:focus-visible,.boton:focus-visible,.rot-b:focus-visible,input:focus-visible,summary:focus-visible,.iso-stage:focus-visible{outline:3px solid var(--acento);outline-offset:2px}
.op .res{display:block;margin-top:4px;font-size:.92rem;color:var(--suave)}
.op.bien{border:2px solid var(--bien)} .op.mal{border:2px dashed var(--mal)}
.ico{width:1em;height:1em;vertical-align:-.15em;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.ico.b{stroke:var(--bien)} .ico.m{stroke:var(--mal)}
.lab{padding:12px 12px 16px;border:3px double var(--borde-fuerte);display:grid;gap:12px}
.predice{background:var(--bg);border-radius:12px;padding:12px 14px}
.predice h3{margin:0;font:500 1.2rem/1.2 var(--serif);color:var(--rubrica)}
.predice p{margin:4px 0 0}
/* La lámina (kit Anatomy) dentro de la tarjeta */
.escena{background:transparent;color:var(--anatomy-text)}
.escena .iso-figure{margin:0}
.escena .iso-plate{border-radius:10px;box-shadow:0 0 0 1px var(--borde);padding:40px 14px 44px}
.escena .iso-plate-corner[data-corner="title"]{font-family:var(--serif);font-size:15px;letter-spacing:.02em;text-transform:none;color:var(--texto)}
.escena .iso-plate-corner[data-corner="fig"]{font-family:var(--serif);font-size:15px;font-style:italic;color:var(--rubrica)}
.escena .iso-plate-corner[data-corner="readout"]{font-size:11.5px}
.escena .iso-plate-corner[data-corner="hint"]{white-space:normal;max-width:46%;line-height:1.35}
.iso-stage{touch-action:pan-y;user-select:none;-webkit-user-select:none;border-radius:6px}
@media (max-width:560px){.escena .iso-plate{padding:34px 4px 52px}.escena .iso-plate-corner[data-corner="hint"]{display:none}.escena .iso-plate-corner[data-corner="readout"]{bottom:6px;left:0;right:auto}}
.aceite>.iso-fill{fill:var(--agua-1)} .aceite>.iso-top{fill:var(--agua-sup)}
.aceite>.iso-shade[data-shade="0"]{fill:var(--agua-2)} .aceite>.iso-shade[data-shade="1"]{fill:color-mix(in srgb,var(--agua-2) 70%,var(--agua-1))}
.aceite>.iso-shade[data-shade="2"]{fill:color-mix(in srgb,var(--agua-2) 40%,var(--agua-1))} .aceite>.iso-shade[data-shade="3"]{fill:var(--agua-1)}
.aceite>.iso-edge{stroke:var(--agua-2)}
.vidrio>.iso-fill{fill:var(--agua-sup);fill-opacity:.16} .vidrio>.iso-shade{opacity:.18} .vidrio>.iso-top{fill:none}
.anillo>.iso-fill,.anillo>.iso-top{fill:none}
.lampara{fill:var(--anatomy-faint);stroke:var(--anatomy-mid);stroke-width:.6}
.lampara.abierta{fill:var(--acento);stroke:var(--agua-2)}
.flecha line{stroke:var(--rubrica);stroke-width:2.2;stroke-linecap:round} .flecha polygon{fill:var(--rubrica)}
.t-fuerza{font:500 15px var(--serif);fill:var(--rubrica);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.t-trampa{font:500 12px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.solo-trampa{display:none} .trampa-on .solo-trampa{display:inline} .trampa-on .flecha{display:none}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
.apagado{opacity:.3;transition:opacity .25s}
#palanca{cursor:grab;touch-action:none}
.rotulos{display:flex;flex-wrap:wrap;gap:6px}
.rot-b{font:inherit;font-size:.88rem;color:var(--texto);background:transparent;border:1.5px solid var(--borde-fuerte);border-radius:999px;padding:6px 12px 6px 6px;min-height:44px;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.rot-b b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;border:1.2px solid var(--dorado);color:var(--texto);font:500 .78rem/1 ui-monospace,Consolas,monospace}
.rot-b[aria-pressed="true"]{border-color:var(--dorado);background:var(--bg)} .rot-b[aria-pressed="true"] b{background:var(--dorado);color:var(--sup)}
.ficha{margin:0;min-height:3.1em;font-size:.95rem;max-width:65ch}
.ficha b{font-family:var(--serif);font-weight:500;font-size:1.08rem;color:var(--rubrica)}
.controles{display:grid;gap:12px}
.lectura{display:grid;gap:2px}
.lectura-etq{font-size:.85rem;color:var(--suave)}
.grande{font:500 clamp(2.4rem,9vw,3.2rem)/1 var(--serif);font-variant-numeric:lining-nums tabular-nums;color:var(--empuje)}
.fila{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-weight:600}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:36px;margin:0;background:transparent;cursor:pointer;--p:0%}
input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:linear-gradient(to right,var(--acento) var(--p),var(--borde) var(--p))}
input[type=range]::-moz-range-track{height:8px;border-radius:4px;background:var(--borde)}
input[type=range]::-moz-range-progress{height:8px;border-radius:4px;background:var(--acento)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-9px;border-radius:50%;background:var(--sup);border:3px solid var(--acento);box-shadow:inset 0 0 0 4px var(--sup),inset 0 0 0 10px var(--dorado)}
input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--sup);border:3px solid var(--acento)}
.chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.chip{background:var(--bg);border-radius:12px;padding:8px 10px}
.chip span{display:block;font-size:.78rem;color:var(--suave)}
.chip output{font:600 1.35rem/1.1 var(--serif);font-variant-numeric:lining-nums tabular-nums}
.cuenta{margin:0;font-weight:600} .nota{margin:0;color:var(--suave);min-height:3.1em}
.botones{display:flex;gap:8px;flex-wrap:wrap}
.boton{font:inherit;font-weight:600;border-radius:999px;padding:10px 18px;min-height:44px;cursor:pointer;border:1.5px solid var(--acento)}
.boton.pri{background:var(--acento);color:var(--sobre-acento)} .boton.sec{background:transparent;color:var(--acento)}
.boton.sec[aria-pressed="true"]{border-color:var(--rubrica);color:var(--rubrica)}
.boton:disabled{opacity:.55;cursor:default}
.profundizar{border-top:1px solid var(--borde);padding-top:8px}
.profundizar summary{cursor:pointer;font-weight:600;min-height:44px;display:flex;align-items:center}
.lecturas{margin:4px 0 8px;padding:0;list-style:none;display:grid;gap:8px}
.lecturas li{display:grid;grid-template-columns:2.2em 1fr;gap:2px 6px}
.lecturas .nl{font-family:var(--serif);color:var(--rubrica);grid-row:span 3}
.lecturas .et{font-size:.85rem;color:var(--suave)}
.lecturas .va{font-family:var(--serif);font-size:1.12rem;font-variant-numeric:lining-nums tabular-nums}
.otro h3{margin:8px 0 0;font:500 1.15rem var(--serif)}
.pie{margin:0;font-size:.9rem;color:var(--suave);max-width:70ch}
.pie i{font-family:var(--serif);font-size:1.05rem;color:var(--texto)}
@media (prefers-reduced-motion:reduce){.apagado{transition:none}}
@media (min-width:880px){
  .pagina{padding:36px 28px 56px}
  .rejilla{grid-template-columns:minmax(0,1fr) minmax(0,1.45fr);grid-template-rows:auto 1fr;grid-template-areas:"a lab" "b lab";column-gap:24px;align-items:start}
}
`;

const CSS_FIG = `
/* Propio de la ley de Ohm (también va en el SVG fijo) */
.iso{--banda-0:#2B2520;--banda-1:#7A4A2A;--banda-2:#B23A2E;--banda-3:#D9792B;--banda-4:#E2B93B;--banda-5:#3E7D4E;--banda-6:#2F5F9E;--banda-7:#6E4A8E;--banda-8:#8C857C;--banda-9:#F4EFE6;
  --cuerpo-r:#DCCBA6;--cuerpo-r-l:#C9B48A}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .iso{--banda-0:#141009;--banda-1:#9A6440;--banda-2:#D2503F;--banda-3:#E58C3E;--banda-4:#E8C557;--banda-5:#58A06A;--banda-6:#4F80C2;--banda-7:#9070B4;--banda-8:#A39C92;--banda-9:#F4EFE6;
  --cuerpo-r:#8E7A57;--cuerpo-r-l:#6F5E42}}
:root[data-theme="dark"] .iso{--banda-0:#141009;--banda-1:#9A6440;--banda-2:#D2503F;--banda-3:#E58C3E;--banda-4:#E8C557;--banda-5:#58A06A;--banda-6:#4F80C2;--banda-7:#9070B4;--banda-8:#A39C92;--banda-9:#F4EFE6;
  --cuerpo-r:#8E7A57;--cuerpo-r-l:#6F5E42}
.cable{fill:none;stroke:var(--anatomy-mid);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.cable-b{fill:none;stroke:var(--anatomy-shade-3);stroke-width:.8;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
.puente{stroke-width:2}
.cargas circle{fill:var(--acento);stroke:var(--sup);stroke-width:.5}
.flecha-c{fill:none;stroke:var(--acento);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.cil .c-f{fill:var(--anatomy-shade-2);stroke:var(--anatomy-mid);stroke-width:.6;stroke-linejoin:round}
.cil .c-t{fill:var(--anatomy-top);stroke:var(--anatomy-mid);stroke-width:.6}
.cil .c-b{fill:none;stroke:var(--anatomy-top);stroke-width:.9;stroke-linecap:round;opacity:.9}
.celda .c-f{fill:var(--anatomy-shade-3)}
.envoltura .c-f{fill:var(--anatomy-shade-0)} .envoltura .c-t{fill:var(--anatomy-shade-1)} .envoltura .c-b{display:none}
.nub .c-f,.nub .c-t{fill:var(--anatomy-shade-1)} .nub .c-b{display:none}
.cuerpo-r .c-f{fill:var(--cuerpo-r)} .cuerpo-r .c-t{fill:var(--cuerpo-r-l)} .cuerpo-r .c-b{stroke:var(--anatomy-top);opacity:.55}
.banda .c-f{stroke:none} .banda.tol .c-f{fill:var(--dorado)}
.b0 .c-f{fill:var(--banda-0)} .b1 .c-f{fill:var(--banda-1)} .b2 .c-f{fill:var(--banda-2)} .b3 .c-f{fill:var(--banda-3)} .b4 .c-f{fill:var(--banda-4)}
.b5 .c-f{fill:var(--banda-5)} .b6 .c-f{fill:var(--banda-6)} .b7 .c-f{fill:var(--banda-7)} .b8 .c-f{fill:var(--banda-8)} .b9 .c-f{fill:var(--banda-9)}
.patita{fill:none;stroke:var(--anatomy-mid);stroke-width:1;stroke-linecap:round}
.metal>.iso-fill,.metal>.iso-top{fill:var(--anatomy-shade-3)}
.tapa-mas>.iso-fill,.tapa-mas>.iso-top,.tapa-mas>.iso-shade{fill:var(--rubrica)} .tapa-mas>.iso-edge{stroke:var(--rubrica)}
.tapa-menos>.iso-fill,.tapa-menos>.iso-top,.tapa-menos>.iso-shade{fill:var(--anatomy-hi)}
.cuchilla{fill:var(--anatomy-shade-3);stroke:var(--anatomy-hi);stroke-width:.6;stroke-linejoin:round}
.cuchilla-c{fill:var(--anatomy-shade-0);stroke:var(--anatomy-hi);stroke-width:.6;stroke-linejoin:round}
.mango{fill:none;stroke:var(--anatomy-hi);stroke-width:2.4;stroke-linecap:round}
.perilla-m{fill:var(--anatomy-hi);stroke:var(--anatomy-hi);stroke-width:.6}
.palanca.cerrada .perilla-m{fill:var(--acento);stroke:var(--acento)}
.pantalla-q>.iso-fill,.pantalla-q>.iso-top,.pantalla-q>.iso-shade{fill:color-mix(in srgb,var(--acento) 16%,var(--anatomy-shade-0))}
.t-cont{font-family:var(--anatomy-mono);font-weight:600;fill:var(--acento);font-variant-numeric:tabular-nums}
.t-borne{font-family:var(--anatomy-mono);font-weight:700;fill:var(--anatomy-strong)}
.arco{fill:none;stroke:var(--anatomy-hi);stroke-width:.8}
.tk{fill:none;stroke-width:.7} .tk.menor{stroke:var(--anatomy-mid)} .tk.mayor{stroke:var(--anatomy-hi);stroke-width:.9}
.t-esc{font:500 7.5px var(--anatomy-mono);fill:var(--anatomy-strong);font-variant-numeric:tabular-nums} .t-esc.u{font:italic 500 10px var(--serif)}
.aguja-a{fill:none;stroke:var(--rubrica);stroke-width:1.5;stroke-linecap:round}
.aguja-f{fill:none;stroke:var(--rubrica);stroke-width:1.2;stroke-dasharray:3 2.4;stroke-linecap:round}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de la ley de Ohm */
.escena .iso-plate-corner[data-corner="hint"]{max-width:52%}
.toque{cursor:pointer}
#palanca{cursor:grab;touch-action:none}
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px}
.escala{flex:1;min-width:0;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums}
.grande{font-size:clamp(2rem,8vw,3rem)}
.profundizar+.profundizar{border-top:none;padding-top:0}
#impulso p{margin:6px 0;max-width:62ch}
@media (max-width:560px){.escena .t-trampa{font-size:13px}.escena .t-esc{font-size:9px}.escena .rot circle{r:11px}.escena .rot text{font-size:12px}}
/* Pantalla completa («modo lámina»): figura grande, controles compactos, zoom con pellizco */
.pantalla{display:grid;gap:12px}
.barra-lamina{display:flex;align-items:center;gap:10px;margin-top:-4px}
.boton.completa{padding:6px 14px;font-size:.88rem;white-space:nowrap}
.cerrar,.gira,.compacto:empty{display:none}
html.sin-scroll,html.sin-scroll body{overflow:hidden}
.modo-lamina{position:fixed;inset:0;z-index:50;background:var(--bg);display:flex;flex-direction:column;gap:6px;
  padding:max(8px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
.modo-lamina .escena{flex:1;min-height:0;display:flex}
.modo-lamina .iso-figure{flex:1;min-height:0;display:flex}
.modo-lamina.pantalla .escena .iso-plate{flex:1;min-height:0;display:flex;padding:30px 6px 26px;overflow:hidden}
.modo-lamina .iso-stage{flex:1;min-height:0;display:flex;overflow:hidden;touch-action:none}
.modo-lamina .iso-svg{width:100%;height:100%;transform-origin:0 0}
.modo-lamina .iso-plate-corner[data-corner="hint"]{display:none}
.modo-lamina .iso-plate-corner[data-corner="title"]{right:64px}
.modo-lamina .compacto output{white-space:nowrap}
.modo-lamina .completa{display:none}
.modo-lamina .cerrar{display:grid;place-items:center;position:absolute;z-index:3;top:max(10px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));
  width:44px;height:44px;border-radius:50%;border:1.5px solid var(--borde-fuerte);background:var(--sup);color:var(--texto);font:600 1.1rem/1 system-ui,sans-serif;cursor:pointer}
.cerrar:focus-visible,.completa:focus-visible{outline:3px solid var(--acento);outline-offset:2px}
.modo-lamina .compacto{display:grid;grid-template-columns:auto auto minmax(0,1fr) minmax(0,1fr);gap:6px 16px;align-items:center}
.modo-lamina .compacto .fila{font-size:.82rem;font-weight:600}
.modo-lamina .compacto input[type=range]{height:30px}
.modo-lamina .compacto .boton{white-space:nowrap}
@media (orientation:portrait){.modo-lamina .gira{display:block;margin:0 52px 0 0;font-size:.85rem;color:var(--suave)}
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .modo-lamina .compacto .boton{white-space:normal;padding:8px 12px;line-height:1.2}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el del examen, cerrado, con la trampa y flechas) ----------
function svgFijo() {
  const d = calc(J, VI.V, VI.R);
  const s = { V: VI.V, R: VI.R, q: 0, on: true, ang: 0, aguja: d.I / VI.escala, revelado: true, trampa: true, flechas: true };
  const claro = CSS_PRENSA.slice(CSS_PRENSA.indexOf(":root{"), CSS_PRENSA.indexOf("@media (prefers-color-scheme:dark)"))
    .replace(":root{", "svg{").replace(/\s*color-scheme:light;box-sizing:border-box;[\s\S]*?\n\}/, "}");
  const tibio = CSS_PRENSA.slice(CSS_PRENSA.indexOf(".iso{"), CSS_PRENSA.indexOf("@media", CSS_PRENSA.indexOf(".iso{"))).replace(".iso{", "svg.iso{");
  const figClaro = CSS_FIG.replace(/@media \(prefers-color-scheme:dark\)[^\n]*\n[^\n]*\n/, "").replace(/:root\[data-theme="dark"\][^\n]*\n[^\n]*\n/, "");
  const estilo = `<style>${k.ISO_CSS}${claro}${tibio}svg{background:var(--bg)}${figClaro}</style>`;
  const sinRot = (m) => { for (const n of ROT) m["rot-" + n] = { _v: false }; return m; };
  return k.figureSvg({ width: W, height: H, label: J.figura.aria, className: "iso", body: [estilo, ...cuerpo(sinRot(vista(CFG, k, s, J)))] })
    .replace('<svg ', `<svg width="${2 * W}" height="${2 * H}" `);
}

const plate = k.plateHtml({
  fig: "Lámina I",
  title: J.titulo,
  hint: J.instruccion,
  readout: `V ${VI.V} V · R ${VI.R} kΩ`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuenow="0">${figura}</div>`,
});
const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(J.titulo)} · Códice Vivo</title>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
</head>
<body>
<main class="pagina">
  <header>
    <div class="marca-casa">Códice Vivo · Laboratorio</div>
    <h1 id="titulo">${esc(J.titulo)}</h1>
    <p class="sub" id="subtitulo"></p>
  </header>
  <div class="rejilla">
    <div id="pasos-a" class="pasos"></div>
    <section class="tarjeta lab" aria-label="Laboratorio">
      <div class="predice">
        <h3 id="pred-t">Predice antes de cerrar</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
        <p class="gira" aria-hidden="true">Gira el teléfono para verla más grande</p>
        <div class="iso escena">${plate}</div>
        <div class="barra-lamina">
          <span class="escala" id="escala"></span>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="c-v">${esc(J.lecturas.corriente)} · I</span>
          <output id="o-i" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-v"><div class="fila"><label for="s-v" id="l-v"></label><output id="o-v"></output></div><input type="range" id="s-v"></div>
          <div id="bloque-r"><div class="fila"><label for="s-r" id="l-r"></label><output id="o-r"></output></div><input type="range" id="s-r"></div>
        </div>
        <div class="chips">
          <div class="chip"><span>Pila</span><output id="o-vv"></output></div>
          <div class="chip"><span>R en ohms</span><output id="o-ro"></output></div>
          <div class="chip"><span>I en amperes</span><output id="o-ia"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="encender" aria-keyshortcuts="b">Cerrar</button>
          <button type="button" class="boton sec" id="trampa" aria-pressed="false"></button>
          <button type="button" class="boton sec" id="examen"></button>
        </div>
        <p class="nota" id="nota" data-say aria-live="polite"></p>
        <details class="profundizar">
          <summary>Profundizar: de dónde sale cada número</summary>
          <ol class="lecturas" id="lecturas"></ol>
        </details>
        <details class="profundizar">
          <summary id="sum-imp">Profundizar</summary>
          <div id="impulso"></div>
        </details>
      </div>
      <p class="pie" id="pie"></p>
    </section>
    <div id="pasos-b" class="pasos"></div>
  </div>
</main>
<!--respaldo-->
<script type="module">${(kitScript() + `\nconst evalua = ${evalua.toString()};\nconst calc = ${calc.toString()};\nconst bandas = ${bandas.toString()};\nconst sobre = ${sobre.toString()};\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
</body>
</html>
`;

const i = process.argv.indexOf("--vista");
if (i > 0) {
  const respaldo = `<script type="application/json" id="respaldo">${JSON.stringify(J)}</script>`;
  writeFileSync(process.argv[i + 1], HTML.replace("<!--respaldo-->", respaldo));
  console.log("vista previa:", process.argv[i + 1]);
}
mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, HTML.replace("<!--respaldo-->\n", ""));
console.log("escrito:", SALIDA, (Buffer.byteLength(HTML) / 1024).toFixed(1) + " KB");
mkdirSync(dirname(SALIDA_SVG), { recursive: true });
const SVG = `<?xml version="1.0" encoding="UTF-8"?>\n` + svgFijo() + "\n";
writeFileSync(SALIDA_SVG, SVG);
console.log("escrito:", SALIDA_SVG, (Buffer.byteLength(SVG) / 1024).toFixed(1) + " KB");
