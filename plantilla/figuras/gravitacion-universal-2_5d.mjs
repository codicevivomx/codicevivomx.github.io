// Lámina 2.5D+ de la gravitación universal: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/gravitacion-universal-2_5d.mjs                → plantilla/interactivos/gravitacion-universal/plus/index.html
//                                                                        y contenido/fisica/img/gravitacion-universal.svg (figura fija para PDF y video)
//   node plantilla/figuras/gravitacion-universal-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de la caída libre (plantilla/figuras/caida-libre-2_5d.mjs): misma página (CSS_PRENSA idéntico), evaluador
// con raiz(), formato del JSON, pantalla completa, arrastre en celular y salida .svg. Dibujo propio: banco con riel y regla en
// múltiplos de r, esfera A fija, esfera B en un carrito, un dinamómetro de reloj en cada una y tablero de barras (1/r²).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "gravitacion-universal";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(RAIZ, ".claude", "skills", "anatomy");
const k = await import("file://" + join(SKILL, "kit", "iso-kit.mjs"));
const { kitScript } = await import("file://" + join(SKILL, "scripts", "inline-kit.mjs"));
const JSON_TEMA = join(RAIZ, "contenido", "fisica", `${TEMA}-interactivo.json`);
const SALIDA = join(RAIZ, "plantilla", "interactivos", TEMA, "plus", "index.html");
const SALIDA_SVG = join(RAIZ, "contenido", "fisica", "img", `${TEMA}.svg`);
const J = JSON.parse(readFileSync(JSON_TEMA, "utf8"));

// ---------- Fórmulas: se leen de J.lecturas.formulas y se evalúan sin eval ----------
// Solo + − × ÷, paréntesis, números, nombres y las funciones sen, asen y raiz (null si no existe el resultado).
function evalua(e, v) {
  const s = String(e).replace(/\s+/g, ""); let i = 0;
  const F = { sen: (x) => (x === null ? null : Math.sin(x * Math.PI / 180)), asen: (x) => (x === null || Math.abs(x) > 1 + 1e-12 ? null : Math.asin(Math.max(-1, Math.min(1, x))) * 180 / Math.PI),
    raiz: (x) => (x === null || x < -1e-12 ? null : Math.sqrt(Math.max(0, x))) };
  const op = (a, b, f) => (a === null || b === null ? null : f(a, b));
  const hoja = () => {
    const r = /^(\d+(?:\.\d+)?|[A-Za-z_]\w*)/.exec(s.slice(i));
    if (!r) throw new Error("Fórmula no válida: " + e);
    i += r[0].length;
    if (/^\d/.test(r[0])) return +r[0];
    if (r[0] in F && s[i] === "(") { i++; const a = suma(); i++; return F[r[0]](a); }
    if (!(r[0] in v)) throw new Error("Fórmula con un nombre desconocido: " + r[0]);
    return v[r[0]];
  };
  const fac = () => { if (s[i] === "(") { i++; const r = suma(); i++; return r; } if (s[i] === "-") { i++; const a = fac(); return a === null ? null : -a; } return hoja(); };
  const prod = () => { let r = fac(); while (s[i] === "*" || s[i] === "/") { const o = s[i++], b = fac(); r = op(r, b, o === "*" ? (x, y) => x * y : (x, y) => x / y); } return r; };
  const suma = () => { let r = prod(); while (s[i] === "+" || s[i] === "-") { const o = s[i++], b = prod(); r = op(r, b, o === "+" ? (x, y) => x + y : (x, y) => x - y); } return r; };
  return suma();
}
// Variables de entrada: kr (posición de B, continua mientras se mueve), km (masa de A) y n (la predicción); lo demás, del JSON.
function calc(J, ent) {
  const v = { ...J.valoresIniciales, ...ent };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}
const num = (v, dec = 2) => {
  if (v === null || v === undefined) return "—";
  const r = Math.round(v * 10 ** dec + (v >= 0 ? 1e-9 : -1e-9)) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
// Todos los números de un estado: crudos (d), con sus decimales del JSON (f) y la fuerza en cada marca del riel (js).
function datos(J, s) {
  const DEC = J.lecturas.decimales || {}, krs = J.rangos.kr.valores, kms = J.rangos.km.valores;
  const d = calc(J, { kr: s.p, km: s.km, n: s.n });
  d.Fmax = calc(J, { kr: krs[0], km: Math.max(...kms), n: s.n }).F;   // la fuerza más grande posible: da la escala de las flechas
  const f = {}; for (const x in d) f[x] = num(d[x], DEC[x] ?? 0);
  const js = krs.map((j) => { const F = calc(J, { kr: j, km: s.km, n: s.n }).F; return { j, j2: j * j, F, x: num(F, DEC.F ?? 0) }; });
  return { d, f, js };
}

// ---------- Modelo del dibujo (z hacia arriba; el frente es +y; x a lo largo del riel) ----------
// La regla del riel y las barras del tablero van a escala; las esferas, los dinamómetros y las flechas no.
const VI = J.valoresIniciales, RG = J.rangos, ES = J.escena;
const XA = 0, U = 17;                                        // centro de A y largo de r en el dibujo (B en XA + kr·U)
const ZC = 23, RB = 4.2;                                     // altura de los centros y radio de B (el de A crece con ∛masa)
const ZD = 11, RD = 3.8, YD = 1.6;                           // dinamómetros de reloj: altura, radio y salida al frente del poste
const ZFA = ZC + 8.5, ZFB = ZC + 12.5;                         // altura de la flecha sobre A y de la flecha sobre B
const CARRO = 4.5;                                           // medio largo del carrito
const XT = XA + U - CARRO - 1.4;                             // tope (cara izquierda del carrito en ×1)
const RIEL = { x: 8.5, y: -2.2, w: 66, d: 4.4, r: 0.6 }, RIEL_H = 2.4;
const PLACA = { x: -15, y: -15, w: 93, d: 28, r: 4 }, PLACA_H = 4, PATA_H = 3;
const TAB = { x: -13, y: -12.9, w: 89, d: 1.8, r: 0.5 }, TZ0 = 37, TZ1 = 59;   // tablero de atrás
const YT = TAB.y + TAB.d, ZB0 = TZ0 + 4.2, HB = 13.5;          // cara del tablero, base y alto (para ×1) de las barras
const W = 360, H = 300;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), ...k.boxCorners(TAB, TZ0, TZ1), [XA - 17, 0, ZFA], [XA + 4 * U + 13, 0, ZFB]],
  W, H, { pad: 8, azimuth: 78, elevation: 20 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const fx = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- Piezas fijas ----------
function placa() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLACA, -PLACA_H - PATA_H, PLACA_H, P)}"/>`];
  const patas = k.corners(PLACA, 6).sort((a, b) => prof(a) - prof(b));
  for (const [x, y] of patas) {
    o.push(S(k.cylinder(x, y, 2.6, -PLACA_H - PATA_H, 0.8, P, 24), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 2, -PLACA_H - PATA_H + 0.8, PATA_H - 0.8, P, 24), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLACA, -PLACA_H, PLACA_H, P, 8, 0.8), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PLACA, 2.4), 0, P), { tone: "lo" }));
  const torn = k.corners(PLACA, 4);
  o.push(L(torn.map(([x, y]) => k.ring(x, y, 1, 0, P, 16)).join(""), { tone: "lo" }));
  o.push(D(torn.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Placa de datos grabada al frente, a la izquierda (a la derecha pasa el carrito)
  const pl = { x: PLACA.x + 4, y: PLACA.y + PLACA.d - 5.2, w: 30, d: 3.4, r: 0.5 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 1.4, pl.y + 2.5], 0.4, P, "x"), J.figura.placa, { size: 1.55, tone: "lo" }));
  return o.join("");
}

// Tablero de atrás: dos patas y una tabla; las barras y la curva van en la vista (cambian con la masa).
function tablero() {
  const o = [];
  for (const x of [TAB.x + 2.2, TAB.x + TAB.w - 2.2]) {
    o.push(S(k.cylinder(x, TAB.y + 0.9, 1.9, 0, 0.8, P, 20), { tone: "lo" }));
    o.push(S(k.cylinder(x, TAB.y + 0.9, 1.1, 0.8, TZ0 - 0.8, P, 20), { tone: "mid" }));
  }
  o.push(S(k.slabOf(TAB, TZ0, TZ1 - TZ0, P, 3, 0.2), { tone: "mid" }));
  // Línea base de las barras y una raya en cada marca, alineadas con la regla del riel
  let raya = k.segment([XA + U - 4, YT, ZB0], [XA + 4 * U + 4, YT, ZB0], P);
  for (const j of RG.kr.valores) raya += k.segment([XA + j * U, YT, ZB0], [XA + j * U, YT, ZB0 - 1.2], P);
  o.push(`<g data-parte="08">${L(raya, { tone: "mid" })}</g>`);
  for (let i = 1; i < 6; i++) o.push(L(k.segment([XA + U - 4, YT, ZB0 + i * HB / 5], [XA + 4 * U + 4, YT, ZB0 + i * HB / 5], P), { tone: "faint" }));
  for (const [x, z] of [[TAB.x + 1.6, TZ0 + 1.6], [TAB.x + TAB.w - 1.6, TZ0 + 1.6], [TAB.x + 1.6, TZ1 - 1.6], [TAB.x + TAB.w - 1.6, TZ1 - 1.6]]) {
    const c = at([x, YT, z]); o.push(`<circle class="tornillo" cx="${fx(c[0])}" cy="${fx(c[1])}" r="0.9"/>`);
  }
  return `<g data-parte="08">${o.join("")}</g>`;
}

// Riel con su regla al frente (marca cada metro de dibujo, mayor en cada r) y el tope en ×1.
function riel() {
  const o = [];
  o.push(S(k.slabOf(RIEL, 0, RIEL_H, P, 3, 0.2), { tone: "mid" }));
  o.push(L(k.lineOnTop([RIEL.x + 1, -0.9], [RIEL.x + RIEL.w - 1, -0.9], RIEL_H, P) + k.lineOnTop([RIEL.x + 1, 0.9], [RIEL.x + RIEL.w - 1, 0.9], RIEL_H, P), { tone: "lo" }));
  for (const x of [RIEL.x + 2, RIEL.x + RIEL.w - 2]) { const c = at([x, 0, RIEL_H]); o.push(`<circle class="tornillo" cx="${fx(c[0])}" cy="${fx(c[1])}" r="0.8"/>`); }
  // Regla grabada en la placa, justo delante del riel
  const y0 = RIEL.y + RIEL.d + 0.6;
  let menor = "", mayor = "";
  for (let i = -2; i <= 32; i++) {
    const x = XA + U * (1 + i / 10), m = i % 10 === 0;
    const dd = k.lineOnTop([x, y0], [x, y0 + (m ? 2.6 : 1.2)], 0, P);
    if (m) mayor += dd; else menor += dd;
  }
  o.push(L(k.lineOnTop([XA + 0.8 * U, y0], [XA + 4.2 * U, y0], 0, P), { tone: "lo" }), L(menor, { tone: "lo" }), L(mayor, { tone: "hi" }));
  for (const j of RG.kr.valores) { const p = at([XA + j * U, y0 + 4.6, 0]);
    o.push(`<text class="t-regla" x="${fx(p[0])}" y="${fx(p[1] + 3)}" text-anchor="middle">${tpl(J.figura.marca, { j })}</text>`); }
  // Tope: bloque atornillado al riel
  const tope = { x: XT - 1.2, y: -2.6, w: 1.2, d: 5.2, r: 0.2 };
  o.push(`<g data-parte="09">${S(k.slabOf(tope, RIEL_H, 3.4, P, 2, 0.1), { tone: "hi" })}</g>`);
  return `<g data-parte="07">${o.join("")}</g>`;
}

// Esfera A: pedestal y poste (la esfera, que cambia de tamaño, va en la vista)
function pedestalA() {
  const o = [];
  const ped = { x: XA - 5, y: -4.2, w: 10, d: 8.4, r: 1 };
  o.push(S(k.slabOf(ped, 0, 2.4, P, 4, 0.2), { tone: "mid" }));
  o.push(D(k.corners(ped, 1.4).map(([x, y]) => at([x, y, 2.4])), { size: 0.6, tone: "hi" }));
  o.push(S(k.cylinder(XA, 0, 1.8, 2.4, 1, P, 24, 0.1), { tone: "mid" }));
  o.push(S(k.cylinder(XA, 0, 0.9, 3.4, ZC - 3 - 3.4, P, 20), { tone: "mid" }));
  o.push(reloj(XA, "02"));
  return `<g data-parte="01">${o.join("")}</g>`;
}
// Caja del dinamómetro de reloj (la aguja va en la vista): un disco de frente al que mira, con marcas cada 10 N.
function reloj(x, parte) {
  const o = [], c = [x, YD, ZD], ring = (r, y) => Array.from({ length: 36 }, (_, i) => { const a = i / 36 * 2 * Math.PI; return at([x + r * Math.cos(a), y, ZD + r * Math.sin(a)]); });
  o.push(S(k.slabOf({ x: x - 0.7, y: 0, w: 1.4, d: YD, r: 0.2 }, ZD - 0.7, 1.4, P, 2), { tone: "mid" }));
  o.push(`<path class="reloj-caja" d="${k.pathOf(ring(RD + 0.5, YD - 0.6), true)}"/>`);
  o.push(`<path class="reloj-cara" d="${k.pathOf(ring(RD + 0.3, YD), true)}"/>`);
  let t = "", tm = "";
  for (let v = 0; v <= ES.dialMax + 1e-9; v += 10) {
    const a = (-135 + 270 * v / ES.dialMax) * Math.PI / 180, may = v % 60 === 0, r0 = RD - (may ? 1.1 : 0.6);
    const dd = k.pathOf([at([x + r0 * Math.sin(a), YD, ZD + r0 * Math.cos(a)]), at([x + RD * Math.sin(a), YD, ZD + RD * Math.cos(a)])]);
    if (may) tm += dd; else t += dd;
  }
  o.push(L(t, { tone: "mid" }), L(tm, { tone: "hi" }));
  return `<g data-parte="${parte}">${o.join("")}</g>`;
}
// Carrito de B dibujado en ×1; la página lo traslada a lo largo del riel (la proyección es lineal).
function carro() {
  const o = [], xc = XA + U;
  const base = { x: xc - CARRO, y: -3.4, w: 2 * CARRO, d: 6.8, r: 0.8 };
  for (const [x, y] of [[xc - 3, -3.6], [xc + 3, -3.6]]) o.push(S(k.cylinder(x, y, 1.2, RIEL_H, 0.6, P, 16), { tone: "lo" }));
  o.push(S(k.slabOf(base, RIEL_H + 0.3, 2.6, P, 4, 0.2), { tone: "hi", lit: true }));
  for (const [x, y] of [[xc - 3, 3.6], [xc + 3, 3.6]]) { const c = at([x, y, RIEL_H + 1.4]); o.push(`<circle class="rueda" cx="${fx(c[0])}" cy="${fx(c[1])}" r="${fx(1.25 * (at([1, 0, 0])[0] - at([0, 0, 0])[0]))}"/>`); }
  o.push(D(k.corners(base, 1.3).map(([x, y]) => at([x, y, RIEL_H + 2.9])), { size: 0.6, tone: "hi" }));
  o.push(S(k.cylinder(xc, 0, 1.6, RIEL_H + 2.9, 0.8, P, 20, 0.1), { tone: "mid" }));
  o.push(S(k.cylinder(xc, 0, 0.9, RIEL_H + 3.7, ZC - 3 - RIEL_H - 3.7, P, 20), { tone: "mid" }));
  o.push(reloj(xc, "05"));
  return `<g data-parte="06">${o.join("")}</g>`;
}

// ---------- Lo que cambia: la vista arma el SVG de agujas, esferas, flechas, barras y trampa para un estado ----------
// C: datos del dibujo; K: funciones del kit (iso); s: { p, km, n, trampa }; Dt: datos(J, s).
function vista(C, K, s, J, Dt) {
  const P = C.P, iso = (p) => K.iso(p, P), F = J.figura, f = Dt.f, d = Dt.d, ES = J.escena, o = [];
  const r1 = (x) => Math.round(x * 10) / 10, ux = iso([1, 0, 0])[0] - iso([0, 0, 0])[0];
  const M = (p) => `M${r1(p[0])} ${r1(p[1])}`, Lp = (p) => `L${r1(p[0])} ${r1(p[1])}`;
  const txt = (p, cls, s2, a = "start", dy = 0, parte) => `<text class="${cls}" x="${r1(p[0])}" y="${r1(p[1] + dy)}" text-anchor="${a}"${parte ? ` data-parte="${parte}"` : ""}>${s2}</text>`;
  const xB = C.XA + s.p * C.U, RA = C.RB * Math.cbrt(s.km);
  const flecha = (p0, p1, cls) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    if (l < 2) return "";
    const u = [dx / l, dy / l], cab = Math.min(8, l * 0.7), an = cab * 0.5, b = [p1[0] - u[0] * cab, p1[1] - u[1] * cab];
    return `<g class="fz ${cls}"><line x1="${r1(p0[0])}" y1="${r1(p0[1])}" x2="${r1(b[0] + u[0])}" y2="${r1(b[1] + u[1])}"/>`
      + `<polygon points="${r1(p1[0])},${r1(p1[1])} ${r1(b[0] - u[1] * an)},${r1(b[1] + u[0] * an)} ${r1(b[0] + u[1] * an)},${r1(b[1] - u[0] * an)}"/></g>`;
  };
  const largo = (Fv) => Math.max(1.6, ES.flechaMax * Fv / d.Fmax);   // escala propia de las flechas (con un mínimo para ver la punta)
  // Tablero: barras a escala entre sí (alto ∝ 1/j²), la de B resaltada; curva 1/r² y punto donde está B
  const zb = (r, pot) => C.ZB0 + C.HB / Math.pow(r, pot), yt = C.YT;
  const jAct = Math.round(s.p), quieto = Math.abs(s.p - jAct) < 1e-6;
  let g = "";
  for (const q of Dt.js) {
    const x = C.XA + q.j * C.U, a = iso([x - 2.2, yt, C.ZB0]), b = iso([x + 2.2, yt, C.ZB0]), c = iso([x + 2.2, yt, zb(q.j, 2)]), e = iso([x - 2.2, yt, zb(q.j, 2)]);
    const act = quieto && q.j === jAct;
    if (act && s.brillo > 0) g += `<path class="barra-brillo" opacity="${r1(s.brillo * 10) / 10}" d="${M(a)}${Lp(b)}${Lp(c)}${Lp(e)}Z"/>`;
    g += `<path class="barra${act ? " barra-act" : ""}" d="${M(a)}${Lp(b)}${Lp(c)}${Lp(e)}Z"/>`;
    g += txt(iso([x, yt, zb(q.j, 2) + 1.6]), `t-barra${act ? " t-barra-act" : ""}`, tpl(F.barra, q), "middle");
    g += txt(iso([x, yt, C.ZB0 - 1.6]), "t-frac", tpl(F.fraccion, q), "middle", 7);
    if (s.trampa) { const h = iso([x - 2.2, yt, zb(q.j, 1)]), h2 = iso([x + 2.2, yt, zb(q.j, 1)]); g += `<path class="fantasma" d="${M(a)}${Lp(h)}${Lp(h2)}${Lp(b)}"/>`; }
  }
  const curva = (pot) => { let dd = ""; for (let i = 0; i <= 60; i++) { const r = 1 + 3 * i / 60, p = iso([C.XA + r * C.U, yt, zb(r, pot)]); dd += (i ? Lp(p) : M(p)); } return dd; };
  g += `<path class="curva" d="${curva(2)}"/>`;
  if (s.trampa) g += `<path class="fantasma" d="${curva(1)}"/>`;
  const pc = iso([xB, yt, zb(s.p, 2)]); g += `<circle class="punto" cx="${r1(pc[0])}" cy="${r1(pc[1])}" r="2.2"/>`;
  const t1 = iso([C.TAB.x + 2.4, yt, C.TZ1 - 6]), t2 = iso([C.TAB.x + 2.4, yt, C.TZ1 - 10.5]);
  g += txt(t1, "t-tablero", F.tablero1) + txt(t2, "t-tablero2", tpl(F.tablero2, f));
  o.push(`<g data-parte="08">${g}</g>`);
  // Agujas de los dos dinamómetros: el mismo ángulo (misma fuerza)
  const aguja = (x, parte) => {
    const a = (-135 + 270 * Math.min(1, d.F / ES.dialMax)) * Math.PI / 180, p0 = iso([x, C.YD, C.ZD]), p1 = iso([x + (C.RD - 0.5) * Math.sin(a), C.YD, C.ZD + (C.RD - 0.5) * Math.cos(a)]);
    const p2 = iso([x - 0.9 * Math.sin(a), C.YD, C.ZD - 0.9 * Math.cos(a)]);
    const pt = iso([x, C.YD + 0.4, C.ZD - C.RD - 1.3]);
    return `<g data-parte="${parte}">${txt(pt, "t-reloj", tpl(F.fuerza, f), "middle", 2.6)}<path class="aguja" d="${M(p2)}${Lp(p1)}"/><circle class="eje" cx="${r1(p0[0])}" cy="${r1(p0[1])}" r="0.9"/></g>`;
  };
  o.push(aguja(C.XA, "02"));
  // Esfera A (su tamaño crece con ∛masa) con su etiqueta de masa
  const bola = (x, R, cls, et, parte) => {
    const c = iso([x, 0, C.ZC]), Rp = R * ux;
    return `<g class="${cls}" data-parte="${parte}"><circle class="bola-c" cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(Rp)}"/>`
      + `<circle class="bola-brillo" cx="${r1(c[0] - Rp * 0.38)}" cy="${r1(c[1] - Rp * 0.4)}" r="${r1(Rp * 0.2)}"/>`
      + `<text class="t-masa" x="${r1(c[0])}" y="${r1(c[1] + Rp * 0.24)}" text-anchor="middle" font-size="${r1(Rp * 0.68)}">${et}</text></g>`;
  };
  o.push(bola(C.XA, RA, "bola bola-a", tpl(F.masaA, f), "01"));
  // Flechas: iguales en las dos esferas, cada una hacia la otra; el valor va por fuera del par
  const L1 = largo(d.F), gA = iso([C.XA, 0, C.ZFA]), gB = iso([xB, 0, C.ZFB]);
  const guia = (x, z0, z1) => { const a = iso([x, 0, z0]), b = iso([x, 0, z1]); return `<path class="guia" d="${M(a)}${Lp(b)}"/>`; };
  o.push(`<g data-parte="03">${guia(C.XA, C.ZC + RA + 0.6, C.ZFA - 0.8)}${flecha(gA, iso([C.XA + L1, 0, C.ZFA]), "fl-a")}${txt(iso([C.XA - 1.4, 0, C.ZFA]), "t-fuerza-v", tpl(F.fuerza, f), "end", 4.5)}</g>`);
  o.push(`<g data-parte="04">${guia(xB, C.ZC + C.RB + 0.6, C.ZFB - 0.8)}${flecha(gB, iso([xB - L1, 0, C.ZFB]), "fl-b")}${txt(iso([xB + 1.4, 0, C.ZFB]), "t-fuerza-v", tpl(F.fuerza, f), "start", 4.5)}</g>`);
  // Trampa: flecha fantasma sobre B con lo que daría 1/r, y el texto encima
  if (s.trampa) {
    const L2 = largo(d.Fsr), q = iso([xB - L2, 0, C.ZFB]);
    const pt = iso([C.XA + 4 * C.U + 3, C.YT, C.TZ1 - 4.5]);   // en el tablero, arriba a la derecha (ahí las barras son bajas)
    o.push(`<g data-parte="04"><path class="fantasma" d="${M(gB)}${Lp(q)}M${r1(q[0] + 5)} ${r1(q[1] - 3)}${Lp(q)}L${r1(q[0] + 5)} ${r1(q[1] + 3)}"/>`
      + `<text class="t-trampa" x="${r1(pt[0])}" y="${r1(pt[1])}" text-anchor="end"><tspan x="${r1(pt[0])}">${tpl(F.fantasma, f)}</tspan><tspan x="${r1(pt[0])}" dy="14" class="t-real">${tpl(F.real, f)}</tspan></text></g>`);
  }
  return o.join("");
}
// Lo que se mueve con el carrito (aguja de B); va dentro del grupo trasladado, dibujado en ×1.
function vistaCarro(C, K, s, J, Dt) {
  const P = C.P, iso = (p) => K.iso(p, P), r1 = (x) => Math.round(x * 10) / 10, d = Dt.d, ES = J.escena, x = C.XA + C.U;
  const a = (-135 + 270 * Math.min(1, d.F / ES.dialMax)) * Math.PI / 180, p0 = iso([x, C.YD, C.ZD]), p1 = iso([x + (C.RD - 0.5) * Math.sin(a), C.YD, C.ZD + (C.RD - 0.5) * Math.cos(a)]);
  const p2 = iso([x - 0.9 * Math.sin(a), C.YD, C.ZD - 0.9 * Math.cos(a)]);
  const c = iso([x, 0, C.ZC]), Rp = C.RB * (iso([1, 0, 0])[0] - iso([0, 0, 0])[0]);
  const pt = iso([x, C.YD + 0.4, C.ZD - C.RD - 1.3]);
  return `<g data-parte="05"><text class="t-reloj" x="${r1(pt[0])}" y="${r1(pt[1] + 2.6)}" text-anchor="middle">${tpl(J.figura.fuerza, Dt.f)}</text><path class="aguja" d="M${r1(p2[0])} ${r1(p2[1])}L${r1(p1[0])} ${r1(p1[1])}"/><circle class="eje" cx="${r1(p0[0])}" cy="${r1(p0[1])}" r="0.9"/></g>`
    + `<g class="bola bola-b" data-parte="06"><circle class="bola-c" cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(Rp)}"/>`
    + `<circle class="bola-brillo" cx="${r1(c[0] - Rp * 0.38)}" cy="${r1(c[1] - Rp * 0.4)}" r="${r1(Rp * 0.2)}"/>`
    + `<text class="t-masa" x="${r1(c[0])}" y="${r1(c[1] + Rp * 0.24)}" text-anchor="middle" font-size="${r1(Rp * 0.68)}">${J.figura.masaB}</text></g>`;
}

// ---------- Esqueleto de la figura ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];
const CFG = { P, XA, U, ZC, RB, ZD, RD, YD, ZFA, ZFB, CARRO, XT, RIEL, RIEL_H, PLACA, PLACA_H, TAB, TZ0, TZ1, YT, ZB0, HB, W, H, ROT };
const S0 = { p: ES.inicio.kr, km: ES.inicio.km, n: VI.n, trampa: false };
const UX = at([1, 0, 0]);  // traslado en pantalla por unidad de x
const mover = (p) => `translate(${fx((p - 1) * U * (UX[0] - at([0, 0, 0])[0]))} ${fx((p - 1) * U * (UX[1] - at([0, 0, 0])[1]))})`;
// Degradados de las esferas (los colores salen de las variables del tema, así cambian en claro y oscuro)
const DEFS = `<defs><radialGradient id="gb1" cx=".36" cy=".32" r=".78"><stop offset="0" class="gb1-0"/><stop offset=".55" class="gb1-1"/><stop offset="1" class="gb1-2"/></radialGradient>`
  + `<radialGradient id="gb2" cx=".36" cy=".32" r=".78"><stop offset="0" class="gb2-0"/><stop offset=".55" class="gb2-1"/><stop offset="1" class="gb2-2"/></radialGradient></defs>`;
const cuerpo = (s, Dt) => [
  DEFS, tablero(), placa(), riel(), pedestalA(),
  `<g id="carro" transform="${mover(s.p)}">${carro()}<g id="dyn-b">${vistaCarro(CFG, k, s, J, Dt)}</g></g>`,
  `<g id="dyn">${vista(CFG, k, s, J, Dt)}</g>`,
];
const figura = k.figureSvg({
  width: W, height: H, label: J.figura.aria,
  body: [
    ...cuerpo(S0, datos(J, S0)),
    `<g id="toque-barras" data-parte="08">${RG.kr.valores.map((j) => { const x = XA + j * U, q = [[x - 3.6, ZB0 - 3.5], [x + 3.6, ZB0 - 3.5], [x + 3.6, ZB0 + HB + 3], [x - 3.6, ZB0 + HB + 3]].map(([a, b]) => at([a, YT, b]));
      return `<path class="toque-barra" data-j="${j}" d="${k.pathOf(q, true)}"/>`; }).join("")}</g>`,
    `<g id="rot"></g>`,
    `<g id="mango" data-parte="06"><circle class="pista" id="pista"/><circle class="mango-toque" id="toque-1" r="16"/><circle class="mango-toque" id="toque-2" r="14"/></g>`,
  ],
});

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, evalua, calc, num, tpl, datos, vista y vistaCarro) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const NS = "http://www.w3.org/2000/svg";
const el = (t, c) => { const e = document.createElementNS(NS, t); if (c) e.setAttribute("class", c); return e; };
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const P = C.P, K = { iso };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/gravitacion-universal-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/gravitacion-universal-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V0 = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles, ES = J.escena, DEC = L.decimales || {};
const KRS = RG.kr.valores, KMS = RG.km.valores, NS_ = RG.n.valores, KR0 = KRS[0], KR1 = KRS[KRS.length - 1];
const conUnidad = (v, u) => v + (/^[°′″]/.test(u) ? "" : " ") + u;

// Estado: p = posición de B en múltiplos de r (entera en reposo, continua al moverse); km = masa de A; n = la predicción
let p = ES.inicio.kr, km = ES.inicio.km, n = V0.n, trampaOn = false, sel = null, fase = "quieto", enRecorrido = false, tocado = false, yaArrastro = false, predicho = false;
let kmV = km, masaAnim = false, brillo0 = 0;   // kmV: la masa que se dibuja (se anima al cambiar)
let Dt = datos(J, { p, km, n });
const F = () => Dt.f;
const kr = () => Math.round(p);

const svg = $(".iso-svg"), stage = $(".iso-stage"), dyn = $("#dyn"), dynB = $("#dyn-b"), carroG = $("#carro"), bAlejar = $("#alejar"), bTrampa = $("#trampa"),
  bExamen = $("#examen"), nota = $("#nota"), mango = $("#mango"), toque1 = $("#toque-1"), toque2 = $("#toque-2"), pista = $("#pista");

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#pred-t").textContent = J.prediccion.titulo;
$("#etq-f").textContent = L.fuerza;
$("#l-kr").textContent = CT.kr; $("#l-km").textContent = CT.km;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
$("#escala").textContent = `Riel y barras a escala · distancia ×${KR0} a ×${KR1}`;
stage.setAttribute("aria-valuemin", KR0); stage.setAttribute("aria-valuemax", KR1);
stage.setAttribute("aria-label", "Lámina: flechas izquierda y derecha mueven la esfera B; B aleja la esfera");

// ---------- Rótulos y fichas (texto del JSON) ----------
const fichaVacia = "Toca un número para ver qué hace cada parte.";
function aplicarSel(){
  svg.querySelectorAll("[data-parte]").forEach(e => {
    const dentro = e.closest(`[data-parte="${sel}"]`) || e.querySelector(`[data-parte="${sel}"]`);
    e.classList.toggle("apagado", !!sel && !dentro);
  });
}
function seleccionar(q){
  sel = sel === q ? null : q;
  document.querySelectorAll(".rot-b").forEach(b => b.setAttribute("aria-pressed", b.dataset.n === sel));
  svg.querySelectorAll(".rot").forEach(g => g.classList.toggle("activo", g.dataset.n === sel));
  aplicarSel(); pintarFicha();
}
function pintarFicha(){
  const r = J.rotulos[sel];
  $("#ficha").innerHTML = r ? `<b>${sel} · ${tpl(r[0], F())}.</b> ${tpl(r[1], F())}` : fichaVacia;
}
const rots = {};
C.ROT.forEach(q => {
  const b = document.createElement("button"); b.type = "button"; b.className = "rot-b"; b.dataset.n = q;
  b.setAttribute("aria-pressed", "false"); b.innerHTML = `<b>${q}</b>${tpl(J.rotulos[q][0], F())}`;
  b.addEventListener("click", () => seleccionar(q)); $("#rotulos").append(b);
  const g = el("g", "rot"); g.dataset.n = q; g.setAttribute("aria-hidden", "true");
  const c = el("circle"); c.setAttribute("r", 8.5);
  const tx = el("text"); tx.textContent = q;
  g.append(c, tx); g.addEventListener("click", (e) => { e.stopPropagation(); seleccionar(q); });
  $("#rot").append(g); rots[q] = { g, c, tx, x: null, y: null };
});
function ponRot(q, pt, visible = true){
  const r = rots[q]; r.g.style.display = visible ? "" : "none"; if (!visible) return;
  const x = Math.round(pt[0] * 10) / 10, y = Math.round(pt[1] * 10) / 10;
  if (r.x === x && r.y === y) return; r.x = x; r.y = y;
  r.c.setAttribute("cx", x); r.c.setAttribute("cy", y); r.tx.setAttribute("x", x); r.tx.setAttribute("y", y + 0.4);
}

// ---------- Mensajes ----------
const decir = (s) => { if (!enRecorrido) nota.textContent = s; };
const mensajeAhora = () => tpl(L.mensajeMover, F());

// ---------- Dibujo que cambia ----------
const W3 = (q) => iso(q, P);
const O = W3([0, 0, 0]), UXY = [W3([C.U, 0, 0])[0] - O[0], W3([C.U, 0, 0])[1] - O[1]];   // traslado en pantalla por cada r
function render(){
  if (!masaAnim) kmV = km;
  Dt = datos(J, { p, km: kmV, n });
  const brillo = brillo0 ? Math.max(0, 1 - (performance.now() - brillo0) / 1200) : 0;
  // Mientras A cambia de tamaño, el panel ya muestra la masa elegida (sus cuentas quedan exactas)
  const f = masaAnim ? datos(J, { p, km, n }).f : F(), xB = C.XA + p * C.U, RA = C.RB * Math.cbrt(kmV), j = kr(), enReposo = Math.abs(p - j) < 1e-6;
  carroG.setAttribute("transform", `translate(${((p - 1) * UXY[0]).toFixed(1)} ${((p - 1) * UXY[1]).toFixed(1)})`);
  dynB.innerHTML = vistaCarro(C, K, { p, km: kmV, n }, J, Dt);
  dyn.innerHTML = vista(C, K, { p, km: kmV, n, trampa: trampaOn, brillo }, J, Dt);
  // Asas de arrastre: la esfera B y su carrito
  const ux = W3([1, 0, 0])[0] - O[0], pB = W3([xB, 0, C.ZC]), pC = W3([xB, 0, C.RIEL_H + 2]);
  toque1.setAttribute("cx", pB[0].toFixed(1)); toque1.setAttribute("cy", pB[1].toFixed(1));
  toque2.setAttribute("cx", pC[0].toFixed(1)); toque2.setAttribute("cy", pC[1].toFixed(1));
  pista.setAttribute("cx", pB[0].toFixed(1)); pista.setAttribute("cy", pB[1].toFixed(1)); pista.setAttribute("r", (C.RB * ux + 4).toFixed(1));
  svg.classList.toggle("arrastrado", yaArrastro);
  svg.classList.toggle("trampa-on", trampaOn);
  // Rótulos en orden (izquierda a derecha, arriba abajo); 06, 07 y 09 bajo el riel o junto al tope, nunca sobre el anillo de arrastre
  const yF = C.PLACA.y + C.PLACA.d - 3;
  ponRot("01", W3([C.XA - RA - 4.2, 0, C.ZC + 2]));
  ponRot("02", W3([C.XA - C.RD - 3.6, C.YD, C.ZD]));
  ponRot("03", W3([C.XA - 2.6, 0, C.ZFA + 4.6]));
  ponRot("04", W3([xB, 0, C.ZFB + 4.2]), !trampaOn);
  ponRot("05", W3([xB + C.RD + 3.6, C.YD, C.ZD]));
  ponRot("06", W3([xB + 5, yF, -1.6]));
  ponRot("07", W3([C.RIEL.x + 2.5, yF, -1.6]));
  ponRot("08", W3([C.XA + C.U - 6.5, C.YT, C.ZB0 + 3]));
  ponRot("09", W3([C.XT - 3.4, 0, C.RIEL_H + 5.6]));
  aplicarSel();
  // Panel
  $("#o-f").textContent = `${f.F} N`;
  $("#o-formula").innerHTML = tpl(L.fuerzaValor, f);
  $("#o-kr").textContent = tpl(CT.valorKr, f);
  $("#o-km").textContent = tpl(CT.valorKm, f);
  $("#c-a").textContent = `${f.F} N`;
  $("#c-b").textContent = `${f.F} N`;
  $("#c-n").textContent = tpl(CT.chipN, f);
  $("#o-n").textContent = predicho || (km === 1 && enReposo && j === n) ? `${f.Pn} N` : "?";
  const vt = tpl(CT.valorLamina, f);
  stage.setAttribute("aria-valuenow", f.kr); stage.setAttribute("aria-valuetext", vt);
  const lect = `r ×${f.kr} · A ×${f.km} · F ${f.F} N`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  bAlejar.textContent = j >= KR1 ? CT.regresar : tpl(CT.alejar, { k: j + 1 });
  document.querySelectorAll("#seg-kr button").forEach(b => b.setAttribute("aria-pressed", enReposo && +b.dataset.v === j));
  document.querySelectorAll("#seg-km button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.v === km));
  document.querySelectorAll("#pred-n button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.n === n));
  const nl = L.numerales, filas = [
    [tpl(L.masa, f), tpl(L.masaValor, f)],
    [tpl(L.distancia, f), tpl(L.distanciaValor, f)],
    [L.tercera, tpl(L.terceraValor, f)],
    [L.unoSobreR, tpl(L.unoSobreRValor, f)],
    [L.planeta, tpl(L.planetaValor, f)]
  ];
  $("#lecturas").innerHTML = filas.map((x, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${x[0]}</span><span class="va">${x[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento del carrito (solo mientras algo se mueve) ----------
let anim = 0;
function llevar(hasta, fin){
  cancelAnimationFrame(anim);
  hasta = Math.max(KR0, Math.min(KR1, hasta));
  if (quieto || Math.abs(hasta - p) < 1e-9){ p = hasta; fase = "quieto"; render(); if (fin) fin(); return; }
  // Arranca y frena con suavidad; dura según lo que recorre (escena.velocidad, en r por segundo)
  fase = "mueve"; const desde = p, t0 = performance.now(), dur = Math.max(380, Math.abs(hasta - desde) / ES.velocidad * 1000);
  const paso = (ahora) => {
    const u = Math.min(1, (ahora - t0) / dur);
    p = desde + (hasta - desde) * suave(u);
    if (u >= 1){ p = hasta; fase = "quieto"; render(); if (fin) fin(); return; }
    render(); anim = requestAnimationFrame(paso);
  };
  anim = requestAnimationFrame(paso);
}
const suave = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
// Brillo de la barra de B al llegar a una marca (se apaga en 1.2 s); con movimiento reducido no hay brillo
let animB = 0;
function pulsar(){
  if (quieto) return;
  brillo0 = performance.now(); cancelAnimationFrame(animB);
  const f = () => { if (fase !== "mueve") render(); if (performance.now() - brillo0 < 1200) animB = requestAnimationFrame(f); else { brillo0 = 0; render(); } };
  animB = requestAnimationFrame(f);
}
const alLlegar = () => { decir(mensajeAhora()); pulsar(); };
function ir(j){ if (j < KR0){ decir(L.mensajeTope); return; } j = Math.min(KR1, j); if (j === kr() && fase === "quieto") return; llevar(j, alLlegar); }
function alejar(){ const j = kr(); ir(j >= KR1 ? KR0 : j + 1); }
// La esfera A crece o se encoge en 0.35 s, y las dos flechas y las agujas la siguen juntas
let animM = 0;
function ponKm(v){
  if (v === km) return;
  const de = kmV; km = v; cancelAnimationFrame(animM);
  if (quieto){ masaAnim = false; render(); decir(tpl(L.mensajeMasa, F())); return; }
  masaAnim = true; const t0 = performance.now();
  const f = (ahora) => {
    const u = Math.min(1, (ahora - t0) / 350); kmV = de + (v - de) * suave(u);
    if (u >= 1){ masaAnim = false; render(); decir(tpl(L.mensajeMasa, F())); return; }
    render(); animM = requestAnimationFrame(f);
  };
  animM = requestAnimationFrame(f);
}
function apagarTrampa(){ if (!trampaOn) return; trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }

// ---------- Recorrido automático: aleja B de ×1 a escena.recorrido y regresa (no llega a las distancias que se preguntan) ----------
let tRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  tRec = setTimeout(() => { if (enRecorrido) llevar(ES.recorrido, () => { tRec = setTimeout(() => { if (enRecorrido) llevar(ES.inicio.kr, () => { tRec = setTimeout(pasoRecorrido, 900); }); }, 1100); }); }, 700);
}
function iniciarRecorrido(){ if (quieto || enRecorrido || tocado) return; enRecorrido = true; p = ES.inicio.kr; km = ES.inicio.km; render(); pasoRecorrido(); }
function tomarControl(){
  tocado = true;
  if (enRecorrido){ enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(anim); fase = "quieto"; p = ES.inicio.kr; render(); decir(tpl(L.mensajeInicio, F())); }
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
// Si nadie toca, retoma a los 6 s (sin revelar la predicción)
let tRet = 0;
const programarRetomar = () => { clearTimeout(tRet); if (quieto) return; tRet = setTimeout(() => { if (visible && fase === "quieto" && !arr && km === ES.inicio.km && kr() === ES.inicio.kr && !trampaOn){ tocado = false; iniciarRecorrido(); } }, 6000); };
lab.addEventListener("pointerup", programarRetomar); lab.addEventListener("keyup", programarRetomar);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible && !tocado && !enRecorrido) iniciarRecorrido(); if (!visible && enRecorrido){ enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(anim); fase = "quieto"; p = ES.inicio.kr; render(); } }, {rootMargin:"0px"}).observe(stage);

// ---------- Controles ----------
bAlejar.addEventListener("click", alejar);
document.querySelectorAll(".toque-barra").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); ir(+b.dataset.j); }));
KRS.forEach(v => {
  const b = document.createElement("button"); b.type = "button"; b.className = "seg"; b.dataset.v = v;
  b.textContent = tpl(CT.valorKr, { kr: v }); b.addEventListener("click", () => ir(v)); $("#seg-kr").append(b);
});
KMS.forEach(v => {
  const b = document.createElement("button"); b.type = "button"; b.className = "seg"; b.dataset.v = v;
  b.textContent = tpl(CT.valorKm, { km: v }); b.addEventListener("click", () => ponKm(v)); $("#seg-km").append(b);
});
$("#seg-kr").setAttribute("aria-label", CT.kr); $("#seg-km").setAttribute("aria-label", CT.km);
bExamen.addEventListener("click", () => {
  cancelAnimationFrame(anim); fase = "quieto"; apagarTrampa(); km = V0.km; n = V0.n; predicho = false; pintarPrediccion();
  p = V0.kr; render(); decir(tpl(L.mensajeReinicio, F()));
});
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn;
  bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  const seguir = () => { render(); decir(trampaOn ? tpl(L.mensajeTrampa, F()) : mensajeAhora()); };
  if (trampaOn && kr() === KR0 && fase === "quieto"){ llevar(KR0 + 1, seguir); render(); }   // a ×1 las dos leyes dan lo mismo
  else seguir();
});
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); alejar();
});
stage.addEventListener("keydown", (e) => {
  const m = {ArrowLeft:-1, ArrowDown:-1, ArrowRight:1, ArrowUp:1}[e.key];
  if (e.key === "Home"){ e.preventDefault(); ir(KR0); return; }
  if (e.key === "End"){ e.preventDefault(); ir(KR1); return; }
  if (m === undefined) return;
  e.preventDefault(); ir(kr() + m);
});
// Arrastre de la esfera B (dedo o mouse): el carrito sigue al dedo y al soltarlo rueda a la marca más cercana
const svgPt = (e) => { const q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; return q.matrixTransform(svg.getScreenCTM().inverse()); };
let arr = null;
mango.addEventListener("pointerdown", (e) => {
  cancelAnimationFrame(anim); fase = "quieto"; arr = { x: svgPt(e).x, p, id: e.pointerId, topeDicho: false };
  mango.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
});
mango.addEventListener("pointermove", (e) => {
  if (!arr || e.pointerId !== arr.id) return;
  const crudo = arr.p + (svgPt(e).x - arr.x) / UXY[0], q = Math.max(KR0, Math.min(KR1, crudo));
  if (crudo < KR0 - 0.15 && !arr.topeDicho){ arr.topeDicho = true; decir(L.mensajeTope); }
  if (Math.abs(q - p) > 1e-4){ p = q; yaArrastro = true; render(); }
});
mango.addEventListener("touchstart", (e) => e.preventDefault(), {passive:false});
const soltarAsa = () => { if (!arr) return; arr = null; llevar(Math.round(p), alLlegar); };
mango.addEventListener("pointerup", soltarAsa); mango.addEventListener("pointercancel", soltarAsa);

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
// «Predice»: parte siempre de F0 (masa ×1 y distancia ×1), no del estado de la lámina; n solo toma rangos.n.valores
const LETRAS = ["A", "B", "C", "D"];
NS_.forEach(q => {
  const b = document.createElement("button"); b.type = "button"; b.className = "seg"; b.dataset.n = q;
  b.textContent = tpl(CT.valorN, { n: q }); b.setAttribute("aria-pressed", q === n);
  b.addEventListener("click", () => { if (n === q) return; n = q; predicho = false; pintarPrediccion(); render(); });
  $("#pred-n").append(b);
});
$("#pred-n").setAttribute("aria-label", CT.n);
function pintarPrediccion(){
  const d = calc(J, { kr: KR0, km: 1, n }), f = datos(J, { p: KR0, km: 1, n }).f;
  $("#pred-q").innerHTML = tpl(J.prediccion.pregunta, f);
  const ops = J.prediccion.opciones.map((x, i) => ({ ok: !!x.correcta, e: tpl(x.retro, f),
    t: `${LETRAS[i]}) ` + conUnidad(num(evalua(x.formula, d), DEC[x.formula] ?? 0), x.unidad || J.prediccion.unidad) }));
  opciones($("#pred-ops"), ops, () => {
    tomarControl(); apagarTrampa(); cancelAnimationFrame(anim); km = 1; p = KR0; predicho = true; render();
    llevar(n, () => decir(tpl(L.mensajePrediccion, F())));
  });
}
pintarPrediccion();

// ---------- Los 6 pasos (capa 1): tal cual el JSON (el mismo texto del .md) ----------
J.pasos.forEach(q => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${q.n}</span>${q.titulo}</h2>` + (q.parrafos || []).map(x => `<p>${x}</p>`).join("");
  if (q.pregunta){
    s.insertAdjacentHTML("beforeend", `<p>${q.pregunta.enunciado}</p>`);
    const l = document.createElement("div"); l.className = "opciones";
    opciones(l, q.pregunta.opciones.map(o => ({ t: o.texto, ok: !!o.correcta, e: o.explicacion }))); s.append(l);
  }
  $(q.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});

const f0 = datos(J, { p: KR0, km: 1, n }).f;
$("#pie").innerHTML = `<i>${tpl(J.figura.pie, F())}</i> Modelo: dos esferas en reposo; la esfera B tiene masa m y la A de ×${KMS.join(", ×")} m (misma densidad: el radio crece con la raíz cúbica). Con masas iguales y a la distancia ×1 se atraen con ${f0.F0} N; la fuerza es F = ${f0.F0} × masa de A ÷ distancia², es decir, F = G·m₁·m₂/r² con G·m²/r² = ${f0.F0} N. La regla del riel y las barras del tablero están a escala; las esferas, los dinamómetros y las flechas no (las flechas tienen su propia escala y un largo mínimo para que se vea la punta). Mientras el carrito rueda, la fuerza cambia de forma continua; se detiene en ×${KRS.join(", ×")}.
 La predicción parte siempre de ${f0.F0} N y solo pregunta por ×${NS_.join(" y ×")}: con ×2, multiplicar por 2 y elevar al cuadrado darían lo mismo. La primera vez, la lámina aleja B solo hasta ×${num(ES.recorrido, 0)} y regresa; tocarla la detiene y, si la dejas como al principio, retoma a los 6 s. Con movimiento reducido, todo aparece en su lugar sin animación. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B aleja la esfera; con la lámina enfocada, ← → la mueven. También puedes arrastrar la esfera B o tocar una barra del tablero.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#alejar", "#trampa", "#bloque-km"].map(s => $(s));
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
  }
  bCerrar.focus({preventScroll:true}); decir("Pantalla completa: pellizca o usa Ctrl + rueda para acercar; doble toque o Esc para volver.");
}
function salir(){
  if (!modo) return; modo = false; sinZoom();
  huecos.forEach(([e, c]) => c.replaceWith(e)); huecos = [];
  pant.classList.remove("modo-lamina"); document.documentElement.classList.remove("sin-scroll");
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

pintarFicha(); render(); decir(tpl(L.mensajeInicio, F()));
window.__grav = { set:(o) => { if ("p" in o) p = o.p; if ("km" in o) km = o.km; if ("n" in o){ n = o.n; pintarPrediccion(); } if ("trampa" in o){ trampaOn = o.trampa; } render(); },
  sel:seleccionar, completa:entrar, salir, alejar, estado:() => ({ p, km, n, trampaOn, fase, enRecorrido, F: Dt.d.F }),
  alto:() => { enRecorrido = false; tocado = true; clearTimeout(tRec); clearTimeout(tRet); cancelAnimationFrame(anim); fase = "quieto"; render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de la gravitación) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados tal cual del generador de la caída libre.
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
// Lo que dibuja la vista (también va dentro de la figura fija .svg)
const CSS_FIG = `
.oculto{display:none}
.tornillo{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:.5}
.rueda{fill:var(--anatomy-shade-1);stroke:var(--anatomy-hi);stroke-width:.6}
.reloj-caja{fill:var(--anatomy-shade-0);stroke:var(--anatomy-hi);stroke-width:.6}
.reloj-cara{fill:var(--anatomy-paper);stroke:var(--anatomy-hi);stroke-width:.7}
.t-reloj{font:600 7.5px var(--anatomy-mono);fill:var(--rubrica);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.barra-brillo{fill:none;stroke:var(--rubrica);stroke-width:6;stroke-linejoin:round;stroke-opacity:.35}
.toque-barra{fill:transparent;cursor:pointer}
.aguja{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-linecap:round}
.eje{fill:var(--anatomy-hi)}
.bola-a .bola-c{fill:url(#gb2);stroke:var(--anatomy-hi);stroke-width:.8}
.bola-b .bola-c{fill:url(#gb1);stroke:var(--anatomy-hi);stroke-width:.8}
.gb1-0{stop-color:var(--anatomy-paper)} .gb1-1{stop-color:var(--anatomy-face)} .gb1-2{stop-color:var(--anatomy-lo)}
.gb2-0{stop-color:var(--anatomy-lo)} .gb2-1{stop-color:var(--anatomy-mid)} .gb2-2{stop-color:var(--anatomy-hi)}
.bola-brillo{fill:var(--anatomy-paper);opacity:.85} .bola-a .bola-brillo{opacity:.4}
.t-masa{font-family:var(--serif);font-style:italic;font-weight:500;fill:var(--anatomy-hi)} .bola-a .t-masa{fill:var(--anatomy-paper)}
.guia{fill:none;stroke:var(--rubrica);stroke-width:.7;stroke-dasharray:1.5 1.5;stroke-opacity:.6}
.fz line{stroke:var(--rubrica);stroke-width:2.2;stroke-linecap:round} .fz polygon{fill:var(--rubrica)}
.t-fuerza-v{font:500 13px var(--serif);fill:var(--rubrica);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.barra{fill:var(--acento);fill-opacity:.22;stroke:var(--acento);stroke-width:.7}
.barra-act{fill:var(--rubrica);fill-opacity:.85;stroke:var(--rubrica)}
.t-barra{font:500 8.5px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--anatomy-face);stroke-width:3px;stroke-linejoin:round}
.t-barra-act{fill:var(--rubrica);font-weight:700}
.t-frac{font:500 8px var(--anatomy-mono);fill:var(--anatomy-text)}
.curva{fill:none;stroke:var(--dorado);stroke-width:1.1;stroke-dasharray:1.6 2;stroke-linecap:round}
.punto{fill:var(--rubrica);stroke:var(--anatomy-face);stroke-width:.8}
.t-tablero{font:600 8.5px var(--anatomy-mono);fill:var(--anatomy-text);letter-spacing:.04em}
.t-tablero2{font:500 7.5px var(--anatomy-mono);fill:var(--anatomy-muted)}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--anatomy-face);stroke-width:4px;stroke-linejoin:round}
.t-trampa .t-real{font-weight:700}
.t-regla{font:600 9px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de la gravitación universal */
.escena .iso-svg{display:block;max-height:min(80vh,700px);margin:0 auto}
.escena .iso-plate-corner[data-corner="hint"]{max-width:52%}
#dyn,#dyn-b{pointer-events:none}
#mango{cursor:grab;touch-action:none} .mango-toque{fill:transparent}
.pista{fill:none;stroke:var(--acento);stroke-width:1.4;stroke-dasharray:3 3;pointer-events:none;animation:pista 1.6s ease-in-out infinite}
svg.arrastrado .pista{display:none}
@keyframes pista{0%,100%{stroke-opacity:.25}50%{stroke-opacity:.95}}
@media (prefers-reduced-motion:reduce){.pista{animation:none;stroke-opacity:.6}}
#mango:active{cursor:grabbing}
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px}
.escala{flex:1;min-width:0;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums}
.grande{font-size:clamp(2rem,8vw,3rem)}
.segmentos{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.seg{font:inherit;font-size:.9rem;font-weight:600;color:var(--acento);background:transparent;border:1.5px solid var(--acento);border-radius:999px;padding:6px 14px;min-height:44px;min-width:52px;cursor:pointer}
.seg[aria-pressed="true"]{background:var(--acento);color:var(--sobre-acento)}
.seg:focus-visible{outline:3px solid var(--acento);outline-offset:2px}
@media (max-width:560px){.escena .t-fuerza-v{font-size:15px}.escena .t-trampa{font-size:12.5px}.escena .t-regla{font-size:10.5px}.escena .t-barra{font-size:10px}.escena .t-frac{font-size:9.5px}.escena .t-tablero{font-size:10px}.escena .t-tablero2{font-size:9px}.escena .t-reloj{font-size:9px}.escena .rot circle{r:10px}.escena .rot text{font-size:11px}}
/* Pantalla completa («modo lámina»): figura grande, controles compactos, zoom con pellizco */
.pantalla{display:grid;gap:12px}
.barra-lamina{display:flex;align-items:center;gap:10px;margin-top:-4px}
.boton.completa{padding:6px 14px;font-size:.88rem;white-space:nowrap}
.cerrar,.compacto:empty{display:none}
html.sin-scroll,html.sin-scroll body{overflow:hidden}
.modo-lamina{position:fixed;inset:0;z-index:50;background:var(--bg);display:flex;flex-direction:column;gap:6px;
  padding:max(8px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
.modo-lamina .escena{flex:1;min-height:0;display:flex}
.modo-lamina .iso-figure{flex:1;min-height:0;display:flex}
.modo-lamina.pantalla .escena .iso-plate{flex:1;min-height:0;display:flex;padding:30px 6px 26px;overflow:hidden}
.modo-lamina .iso-stage{flex:1;min-height:0;display:flex;overflow:hidden;touch-action:none}
.modo-lamina .iso-svg{width:100%;height:100%;max-height:none;transform-origin:0 0}
.modo-lamina .iso-plate-corner[data-corner="hint"]{display:none}
.modo-lamina .iso-plate-corner[data-corner="title"]{right:64px}
.modo-lamina .compacto output{white-space:nowrap}
.modo-lamina .completa{display:none}
.modo-lamina .cerrar{display:grid;place-items:center;position:absolute;z-index:3;top:max(10px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));
  width:44px;height:44px;border-radius:50%;border:1.5px solid var(--borde-fuerte);background:var(--sup);color:var(--texto);font:600 1.1rem/1 system-ui,sans-serif;cursor:pointer}
.cerrar:focus-visible,.completa:focus-visible{outline:3px solid var(--acento);outline-offset:2px}
.modo-lamina .compacto{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px 12px;align-items:center}
.modo-lamina .compacto .fila{font-size:.82rem;font-weight:600}
.modo-lamina .compacto .segmentos{margin-top:2px}
.modo-lamina .compacto .boton{white-space:nowrap;padding:8px 12px}
@media (max-width:560px){.modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.modo-lamina .compacto #bloque-km{grid-column:1 / -1}.modo-lamina .compacto .boton{white-space:normal;line-height:1.2}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado del examen: masa ×km y distancia ×kr de valoresIniciales) ----------
function svgFijo() {
  const s = { p: VI.kr, km: VI.km, n: VI.n, trampa: false };
  const claro = CSS_PRENSA.slice(CSS_PRENSA.indexOf(":root{"), CSS_PRENSA.indexOf("@media (prefers-color-scheme:dark)"))
    .replace(":root{", "svg{").replace(/\s*color-scheme:light;box-sizing:border-box;[\s\S]*?\n\}/, "}");
  const tibio = CSS_PRENSA.slice(CSS_PRENSA.indexOf(".iso{"), CSS_PRENSA.indexOf("@media", CSS_PRENSA.indexOf(".iso{"))).replace(".iso{", "svg.iso{");
  const estilo = `<style>${k.ISO_CSS}${claro}${tibio}svg{background:var(--bg)}${CSS_FIG}</style>`;
  return k.figureSvg({ width: W, height: H, label: J.figura.aria, className: "iso", body: [estilo, ...cuerpo(s, datos(J, s))] })
    .replace('<svg ', `<svg width="${2 * W}" height="${2 * H}" `);
}

const plate = k.plateHtml({
  fig: "Lámina I",
  title: J.titulo,
  hint: J.instruccion,
  readout: (() => { const f = datos(J, S0).f; return `r ×${f.kr} · A ×${f.km} · F ${f.F} N`; })(),
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="${RG.kr.valores[0]}" aria-valuenow="${S0.p}">${figura}</div>`,
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
        <h3 id="pred-t">Predice antes de alejarlas</h3>
        <div class="segmentos" id="pred-n" role="group"></div>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
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
          <span class="lectura-etq" id="etq-f"></span>
          <output id="o-f" class="grande">${datos(J, S0).f.F} N</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-kr"><div class="fila"><span id="l-kr"></span><output id="o-kr"></output></div><div class="segmentos" id="seg-kr" role="group"></div></div>
          <div id="bloque-km"><div class="fila"><span id="l-km"></span><output id="o-km"></output></div><div class="segmentos" id="seg-km" role="group"></div></div>
        </div>
        <div class="chips">
          <div class="chip"><span>Sobre A</span><output id="c-a"></output></div>
          <div class="chip"><span>Sobre B</span><output id="c-b"></output></div>
          <div class="chip"><span id="c-n"></span><output id="o-n"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="alejar" aria-keyshortcuts="b">Alejar</button>
          <button type="button" class="boton sec" id="trampa" aria-pressed="false"></button>
          <button type="button" class="boton sec" id="examen"></button>
        </div>
        <p class="nota" id="nota" data-say aria-live="polite"></p>
        <details class="profundizar">
          <summary>Profundizar: de dónde sale cada número</summary>
          <ol class="lecturas" id="lecturas"></ol>
        </details>
      </div>
      <p class="pie" id="pie"></p>
    </section>
    <div id="pasos-b" class="pasos"></div>
  </div>
</main>
<!--respaldo-->
<script type="module">${(kitScript() + `\nconst evalua = ${evalua.toString()};\nconst calc = ${calc.toString()};\nconst num = ${num.toString()};\nconst tpl = ${tpl.toString()};\nconst datos = ${datos.toString()};\nconst vista = ${vista.toString()};\nconst vistaCarro = ${vistaCarro.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
