// Lámina 2.5D+ de la tercera ley de Newton (acción y reacción): dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/leyes-de-newton-3-2_5d.mjs                → plantilla/interactivos/leyes-de-newton-3/plus/index.html
//                                                                     y contenido/fisica/img/leyes-de-newton-3.svg (figura fija para PDF y video)
//   node plantilla/figuras/leyes-de-newton-3-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de la segunda ley (plantilla/figuras/leyes-de-newton-2-2_5d.mjs): misma página, pantalla completa
// y salida .svg; otro dibujo (dos patinadores con una pértiga telescópica y dos dinamómetros) y otra lógica (misma F, cada uno ÷ su m).
// La cámara no se traslada: el centro de masa no se mueve, así que la cámara se aleja y la regla cambia de escala.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "leyes-de-newton-3";
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
function calc(J, F, mA, mB, t) {
  const v = { F, mA, mB, t };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}

// ---------- Modelo del dibujo (unidades del mundo; z hacia arriba; los patinadores van por y = 0; el frente es +y) ----------
// La regla está en metros a escala; los patinadores, los dinamómetros y las flechas no.
// Al empezar, la ventana muestra J.escena.ventana m. Las puntas de la pértiga arrancan en ±G y cada patinador se aleja de su
// punta según su x; si no caben, la escala (unidades por metro) baja para que el más lejano quede a la vista.
const RG = J.rangos, ES = J.escena;
const M = 10;                                    // unidades por metro al empezar
const XR = ES.ventana / 2;
const X0 = -XR * M, X1 = XR * M;
const G = 6;                                     // media separación de las puntas al empezar (pértiga recogida)
const KF = 0.15, KA = 3;                         // escalas propias de las flechas: unidades por N y por m/s²
const T = X1 - G - 32;                           // recorrido máximo en pantalla de cada punta (deja lugar a las flechas)
const ICE = 2.5;                                 // alto de la pista de hielo
const ZC = ICE + 17.5;                           // altura de la pértiga y de las manos
const ZF = ICE + 29;                             // altura de las flechas de fuerza
const YA = 8;                                    // flechas de aceleración: sobre el hielo, al frente
const KG = ES.kgDisco, ND = Math.round(Math.max(RG.mA.max, RG.mB.max) / KG);
const RD = 2.6, HD = 0.7, PD = 0.85;             // discos del portadiscos
const FMAX = RG.F.max;
const VMAX = (FMAX / Math.min(RG.mA.min, RG.mB.min)) * RG.t.max;
const PISTA = { x: X0, y: -11, w: X1 - X0, d: 22, r: 1 };
const PLACA = { x: X0 - 8, y: -16, w: X1 - X0 + 16, d: 58, r: 6 }, PLACA_H = 6, PATA_H = 5;
const REGLA = { y0: 13, y1: 19, z: 0.8 };
const TAB = { x: -30, y: 24, w: 60, d: 14, r: 1, h: 1.4 };       // tablero: velocímetro de A, cronómetro, velocímetro de B
const DIAL = { r: 4.2, y: 30.4, xa: -18, xc: 0, xb: 18 };
const DIN = { largo: 6, media: 3, alto: 2.5, r: 2.3 };            // caja del dinamómetro (en cada punta) y su carátula

const W = 640, H = 300;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [X0, 0, ZF + 14], [X1, 0, ZF + 14]],
  W, H, { pad: 8, azimuth: 78, elevation: 28 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const caja = (a, b, y0, y1, r = 0.3) => ({ x: Math.min(a, b), w: Math.abs(b - a), y: y0, d: y1 - y0, r });

// Ventana de recorte de la regla
function envolvente(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo = [], arriba = [];
  for (const p of pts) { while (abajo.length > 1 && cruz(abajo[abajo.length - 2], abajo[abajo.length - 1], p) <= 0) abajo.pop(); abajo.push(p); }
  for (const p of pts.reverse()) { while (arriba.length > 1 && cruz(arriba[arriba.length - 2], arriba[arriba.length - 1], p) <= 0) arriba.pop(); arriba.push(p); }
  return abajo.slice(0, -1).concat(arriba.slice(0, -1));
}
const VENTANA = envolvente(k.boxCorners({ x: X0, y: -12, w: X1 - X0, d: 34 }, -30, 70).map(at));
const CLIP = `<defs><clipPath id="ventana-n3"><path d="${k.pathOf(VENTANA, true)}"/></clipPath></defs>`;
const recorte = (s) => `<g clip-path="url(#ventana-n3)">${s}</g>`;

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
// Fases: listo (pértiga recogida, agujas en 0) → contacto (las agujas suben juntas; la cámara se ajusta)
//        → empuje (dura t; los dos se separan) → fin (las agujas vuelven a 0; la toma se congela).
function vista(C, K, s, J) {
  const P = C.P;
  const num = (v, dec = 2) => {
    const r = Math.round(v * 10 ** dec) / 10 ** dec;
    let [i, d] = Math.abs(r).toFixed(dec).split(".");
    d = (d || "").replace(/0+$/, "");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
    return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
  };
  const tpl = (t, o) => t.replace(/\{(\w+)\}/g, (m, q) => (q in o ? o[q] : m));
  const txt = (t) => t.replace(/<sub>([^<]*)<\/sub>/g, " $1");   // SVG: sin etiquetas
  const suave = (u) => u * u * (3 - 2 * u);
  const mov = s.fase === "empuje" || s.fase === "fin", tt = mov ? s.t : 0;
  const d = calc(J, s.F, s.mA, s.mB, tt), dF = calc(J, s.F, s.mA, s.mB, s.tF);
  // Cámara: escala que deja ver al más lejano al terminar el empuje
  const lejos = Math.max(dF.xA, dF.xB, 1e-9), sT = Math.min(C.M, C.T / lejos);
  const sc = s.fase === "listo" ? C.M : s.fase === "contacto" ? C.M + (sT - C.M) * suave(s.tau) : sT;
  const uA = -C.G - sc * d.xA, uB = C.G + sc * d.xB;
  // Cuánto empuje hay ahora (agujas) y cuánto se dibuja (flechas)
  const kn = s.fase === "listo" ? 0 : s.fase === "contacto" ? s.tau : s.fase === "empuje" ? 1 : 1 - s.tau;
  const kf = s.fase === "listo" ? 1 : s.fase === "contacto" ? s.tau : s.fase === "empuje" ? 1 : 0;
  const m = {};
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const iso = (p) => K.iso(p, P);
  const mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  const cara = (pts) => "M" + pts.map((p) => pt(iso(p))).join("L") + "Z";

  // Patinadores (cada grupo lleva su dinamómetro, sus discos y su masa)
  m["pat-A"] = { transform: K.translateAlong(P, [uA + C.G, 0, 0]) };
  m["pat-B"] = { transform: K.translateAlong(P, [uB - C.G, 0, 0]) };
  for (let i = 0; i < C.ND; i++) { m["dA" + i] = { _v: i < Math.round(s.mA / C.KG) }; m["dB" + i] = { _v: i < Math.round(s.mB / C.KG) }; }
  const pmA = iso([-C.G - 11 - 4.5, 0, C.ICE + 22]), pmB = iso([C.G + 11 + 4.5, 0, C.ICE + 22]);
  m["t-mA"] = { x: pmA[0].toFixed(1), y: pmA[1].toFixed(1), _t: txt(tpl(J.figura.mA, { mA: num(s.mA) })) };
  m["t-mB"] = { x: pmB[0].toFixed(1), y: pmB[1].toFixed(1), _t: txt(tpl(J.figura.mB, { mB: num(s.mB) })) };
  // Agujas de los dinamómetros: mismo ángulo en los dos (cero a −135°, fondo a +135°)
  const th = -0.75 * Math.PI + 1.5 * Math.PI * Math.min(1, (s.F * kn) / C.FMAX);
  for (const [id, f] of [["A", 1], ["B", -1]]) {
    const cx = -f * C.G - f * C.DIN.largo / 2, zt = C.ZC + C.DIN.alto, r = 0.82 * C.DIN.r;
    m["ag" + id] = { d: K.onTop([[cx, 0], [cx + r * Math.sin(th), r * Math.cos(th)]], zt, P) };
    const pd = iso([cx, C.DIN.media, C.ZC - C.DIN.alto]);
    m["t-d" + id] = { x: pd[0].toFixed(1), y: (pd[1] + 12).toFixed(1), _t: `${num(s.F * kn)} N` };
  }

  // Pértiga telescópica: tubo ancho desde A, collar y tubo delgado que sale hasta B
  const tubo = (pre, x0, x1, h) => {
    const zb = C.ZC - h, zt = C.ZC + h;
    m[pre + "-t"] = { d: cara([[x0, -h, zt], [x1, -h, zt], [x1, h, zt], [x0, h, zt]]) };
    m[pre + "-f"] = { d: cara([[x0, h, zb], [x1, h, zb], [x1, h, zt], [x0, h, zt]]) };
    m[pre + "-e"] = { d: cara([[x1, -h, zb], [x1, h, zb], [x1, h, zt], [x1, -h, zt]]) };
  };
  const hueco = uB - uA, xo = uA + 0.55 * hueco;
  tubo("tu-o", uA, xo, 1.3); tubo("tu-c", xo - 1, xo, 1.7); tubo("tu-i", xo, uB, 0.85);

  // Regla: metros desde la salida, hacia cada lado; el paso de las marcas crece si la cámara se aleja
  let paso = J.escena.pasosRegla[J.escena.pasosRegla.length - 1];
  for (const q of J.escena.pasosRegla) if (q * sc >= 6) { paso = q; break; }
  m._paso = paso;
  let tkM = "", tkm = ""; const etq = [];
  for (const f of [-1, 1]) for (let i = 0; ; i++) {
    const u = f * (C.G + i * paso * sc);
    if (Math.abs(u) > C.X1 - 2) break;
    const mayor = i % 2 === 0;
    const dd = K.onTop([[u, C.REGLA.y0], [u, C.REGLA.y0 + (mayor ? 3.6 : 1.8)]], C.REGLA.z, P);
    if (mayor) { tkM += dd; etq.push([u, i * paso]); } else tkm += dd;
  }
  m["tk-mayor"] = { d: tkM }; m["tk-menor"] = { d: tkm };
  for (let i = 0; i < C.NETQ; i++) {
    const e = etq[i];
    if (!e) { m["tr" + i] = { _v: false }; continue; }
    const p = iso([e[0], C.REGLA.y1, 0]);
    m["tr" + i] = { _v: true, x: p[0].toFixed(1), y: (p[1] + 10).toFixed(1), _t: num(e[1]) + (e[1] === 0 ? " m" : "") };
  }

  // Flechas (pantalla). Fuerzas arriba, desde cada punta hacia afuera; aceleraciones sobre el hielo, al frente.
  const flecha = (id, p0, p1, texto, ver, abajo) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    if (!ver || l < 2) { m[id] = { _v: false }; return; }
    const ux = dx / l, uy = dy / l, cab = Math.min(8, l * 0.6), an = cab * 0.5, bx = p1[0] - ux * cab, by = p1[1] - uy * cab;
    m[id] = { _v: true };
    m[id + "-l"] = { x1: p0[0].toFixed(1), y1: p0[1].toFixed(1), x2: (bx + ux).toFixed(1), y2: (by + uy).toFixed(1) };
    m[id + "-p"] = { points: `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${(bx - uy * an).toFixed(1)},${(by + ux * an).toFixed(1)} ${(bx + uy * an).toFixed(1)},${(by - ux * an).toFixed(1)}` };
    m[id + "-t"] = { x: ((p0[0] + p1[0]) / 2).toFixed(1), y: ((p0[1] + p1[1]) / 2 + (abajo ? 15 : -8)).toFixed(1), _t: texto };
  };
  const hayF = s.F > 0, rv = s.revelado;
  const fA0 = iso([uA, 0, C.ZF]), fA1 = iso([uA - C.KF * s.F * kf, 0, C.ZF]);
  const fB0 = iso([uB, 0, C.ZF]), fB1 = iso([uB + C.KF * s.F * kf, 0, C.ZF]);
  flecha("fl-BA", fA0, fA1, txt(tpl(J.figura.FBA, { F: num(s.F) })), hayF && rv && kf > 0);
  flecha("fl-AB", fB0, fB1, txt(tpl(J.figura.FAB, { F: num(s.F) })), hayF && kf > 0);
  const pq = iso([uA - 11, 0, C.ZF]);
  m["t-inc"] = { _v: hayF && !rv && kf > 0, x: pq[0].toFixed(1), y: (pq[1] - 8).toFixed(1), _t: txt(J.figura.incognita) };
  const verA = hayF && rv && (s.fase === "listo" || s.fase === "contacto" || s.fase === "empuje");
  const ka = s.fase === "contacto" ? s.tau : 1;
  flecha("fl-aA", iso([uA, C.YA, C.ICE]), iso([uA - C.KA * d.aA * ka, C.YA, C.ICE]), txt(tpl(J.figura.aA, { aA: num(d.aA) })), verA, true);
  flecha("fl-aB", iso([uB, C.YA, C.ICE]), iso([uB + C.KA * d.aB * ka, C.YA, C.ICE]), txt(tpl(J.figura.aB, { aB: num(d.aB) })), verA, true);
  const p0 = iso([0, 0, C.ZF]);
  m["t-cero"] = { _v: !hayF, x: p0[0].toFixed(1), y: p0[1].toFixed(1), _t: J.lecturas.sentidoNinguno };

  // Fantasmas de la trampa: se quedan en la salida
  m["fantasmas"] = { _v: !!s.trampa };
  const pf = iso([0, 0, C.ZF + 9]);
  m["fant-t"] = { _v: !!s.trampa, x: pf[0].toFixed(1), y: pf[1].toFixed(1) };
  m["fant-1"] = { x: pf[0].toFixed(1), _t: J.trampa.fantasma };
  m["fant-2"] = { x: pf[0].toFixed(1), _t: tpl(J.trampa.suma, { Fsuma: num(d.Fsuma) }) };

  // Tablero: cronómetro (una vuelta = t máximo) y velocímetros (escala de raíz; A a la izquierda, B a la derecha)
  const aguja = (cx, a) => K.onTop([[cx, C.DIAL.y], [cx + 0.82 * C.DIAL.r * Math.sin(a), C.DIAL.y - 0.82 * C.DIAL.r * Math.cos(a)]], C.TAB.h, P);
  const vel = (v) => 0.75 * Math.PI * Math.sqrt(Math.min(1, Math.abs(v) / C.VMAX));
  m["ag-c"] = { d: aguja(C.DIAL.xc, 2 * Math.PI * tt / J.rangos.t.max) };
  m["ag-vA"] = { d: aguja(C.DIAL.xa, -vel(d.vA)) };
  m["ag-vB"] = { d: aguja(C.DIAL.xb, vel(d.vB)) };
  const lect = (id, cx, t) => { const p = iso([cx, C.TAB.y + C.TAB.d, 0]); m[id] = { x: p[0].toFixed(1), y: (p[1] + 11).toFixed(1), _t: t }; };
  lect("t-crono", C.DIAL.xc, `t = ${num(tt, 2)} s`);
  lect("t-vA", C.DIAL.xa, `vA = ${num(d.vA, 1)} m/s`);
  lect("t-vB", C.DIAL.xb, `vB = ${num(d.vB, 1)} m/s`);

  // Rótulos
  const rot = (n, p, ver = true) => { m["rot-" + n] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  rot("01", mas(iso([C.X0 + 6, -C.PISTA, C.ICE]), -6, -6));
  rot("02", mas(iso([uA - 11, -3, C.ICE + 6]), -16, 0));
  rot("03", mas(iso([uB + 11, -3, C.ICE + 6]), 16, 0));
  rot("04", mas(iso([uA - C.DIN.largo / 2, 0, C.ZC + C.DIN.alto]), 0, -13));
  rot("05", mas(iso([uB + C.DIN.largo / 2, 0, C.ZC + C.DIN.alto]), 0, -13));
  rot("06", hayF && rv && kf > 0 ? mas([(fA0[0] + fA1[0]) / 2, (fA0[1] + fA1[1]) / 2], 0, -27) : mas(pq, -60, -12), hayF && kf > 0);
  rot("07", mas([(fB0[0] + fB1[0]) / 2, (fB0[1] + fB1[1]) / 2], 0, -27), hayF && kf > 0);
  rot("08", mas(iso([uA - C.KA * d.aA * ka, C.YA, C.ICE]), -14, 0), verA);
  rot("09", mas(iso([C.X1 - 4, C.REGLA.y1, 0]), 0, 14));
  rot("10", mas(iso([C.TAB.x, C.TAB.y + C.TAB.d, C.TAB.h]), -12, 0));
  rot("11", mas(iso([(uA + xo) / 2, 0, C.ZC + 1.3]), 0, -12));
  rot("12", mas(iso([C.G + 18.6, 3.4, C.ICE + 24]), 12, -4), !!s.trampa);
  return m;
}

// ---------- Piezas fijas ----------
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
  // Placa de datos grabada atrás, a la derecha
  const pl = { x: X1 - 54, y: -14.6, w: 50, d: 2.6, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 3, pl.y + 2], 0.4, P, "x"), "TERCERA LEY · ACCIÓN Y REACCIÓN · HIELO", { size: 1.7, tone: "lo" }));
  o.push(D([at([pl.x + 1.4, pl.y + 1.3, 0.4]), at([pl.x + pl.w - 1.4, pl.y + 1.3, 0.4])], { size: 0.4 }));
  return o.join("");
}

// Pista de hielo con marcas de patinaje y línea de salida
function pista() {
  const o = [S(k.slabOf(PISTA, 0, ICE, P, 6, 0.3), { tone: "mid", className: "hielo" })];
  let rayas = "";
  for (const [x0, y0, x1, y1] of [[-70, -6, -40, -4.5], [-30, 5, -12, 6.5], [18, -7, 46, -5.5], [52, 4, 72, 5.4], [-58, 7, -48, 6.2]])
    rayas += k.lineOnTop([x0, y0], [x1, y1], ICE, P);
  o.push(L(rayas, { tone: "faint" }));
  o.push(`<path class="salida" d="${k.onTop([[0, -PISTA.d / 2 + 1], [0, PISTA.d / 2 - 1]], ICE, P)}"/>`);
  return `<g data-parte="01">${o.join("")}</g>`;
}

function reglaBase() {
  return S(k.slabOf({ x: X0 + 1, y: REGLA.y0, w: X1 - X0 - 2, d: REGLA.y1 - REGLA.y0, r: 0.8 }, 0, REGLA.z, P, 3), { tone: "hi", crease: "none" })
    + L(k.lineOnTop([X0 + 2, REGLA.y0 + 4.6], [X1 - 2, REGLA.y0 + 4.6], REGLA.z, P), { tone: "faint" })
    + `<path class="salida" d="${k.onTop([[-G, REGLA.y0], [-G, REGLA.y1], [G, REGLA.y1], [G, REGLA.y0]], REGLA.z, P, true)}"/>`;
}

// Tablero: velocímetro de A, cronómetro y velocímetro de B (las agujas las mueve la vista)
function tablero(m) {
  const o = [S(k.slabOf(TAB, 0, TAB.h, P, 4, 0.2), { tone: "mid" })];
  const dial = (cx, nombre, marcas, idA, idT) => {
    const q = [L(k.ring(cx, DIAL.y, DIAL.r, TAB.h, P, 40), { tone: "lo" }), L(k.ring(cx, DIAL.y, DIAL.r - 0.5, TAB.h, P, 40), { tone: "faint" })];
    let tk = "";
    for (const a of marcas) tk += k.onTop([[cx + (DIAL.r - 0.5) * Math.sin(a), DIAL.y - (DIAL.r - 0.5) * Math.cos(a)], [cx + (DIAL.r - 1.3) * Math.sin(a), DIAL.y - (DIAL.r - 1.3) * Math.cos(a)]], TAB.h, P);
    q.push(L(tk, { tone: "mid" }));
    q.push(k.faceTextSvg(k.topMatrix([cx - 5.4, TAB.y + TAB.d - 1.2], TAB.h, P, "x"), nombre, { size: 1.15, tone: "lo" }));
    q.push(E("path", idA, { class: "aguja" }, m));
    q.push(D([at([cx, DIAL.y, TAB.h])], { size: 0.7, tone: "lo" }));
    q.push(E("text", idT, { class: "t-dial", "text-anchor": "middle" }, m));
    return q.join("");
  };
  const nt = Math.round(RG.t.max / RG.t.paso);
  const mc = Array.from({ length: nt }, (_, i) => 2 * Math.PI * i / nt);
  const mv = [-1, -0.5, 0, 0.5, 1].map(f => f * 0.75 * Math.PI);
  o.push(dial(DIAL.xa, "VELOCÍMETRO A", mv, "ag-vA", "t-vA"));
  o.push(dial(DIAL.xc, "CRONÓMETRO", mc, "ag-c", "t-crono"));
  o.push(dial(DIAL.xb, "VELOCÍMETRO B", mv, "ag-vB", "t-vB"));
  return `<g data-parte="10">${o.join("")}</g>`;
}

// Patinador (f = +1: A, a la izquierda, mira a la derecha; f = −1: B, a la derecha, mira a la izquierda).
// Cuerpo de bloques sobre cuchillas, portadiscos en la espalda (un disco = J.escena.kgDisco kg),
// manos en el travesaño de su dinamómetro, que va en la punta de la pértiga.
function patinador(f, m) {
  const id = f > 0 ? "A" : "B", xt = -f * G, xc = xt - f * 11, xd = xc - f * 5;
  const piernas = [];
  for (const sy of [-1, 1]) {
    const y0 = sy > 0 ? 0.6 : -2.6, y1 = y0 + 2;
    piernas.push([[xc + f * 0.4, y0 + 1, ICE + 0.3], S(k.slabOf(caja(xc - f * 2.4, xc + f * 3.2, y0 + 0.8, y0 + 1.2, 0.15), ICE, 0.6, P, 2), { tone: "lo", crease: "none" })]);
    piernas.push([[xc + f * 0.4, y0 + 1, ICE + 1.8], S(k.slabOf(caja(xc - f * 1.4, xc + f * 2.2, y0, y1), ICE + 0.6, 2.4, P, 3, 0.2), { tone: "mid" })]);
    piernas.push([[xc, y0 + 1, ICE + 7], S(k.slabOf(caja(xc - 1, xc + 1, y0 + 0.2, y1 - 0.2), ICE + 3, 8, P, 3), { tone: "hi" })]);
  }
  piernas.sort((a, b) => k.depthOf(a[0], P) - k.depthOf(b[0], P));
  const abajo = piernas.map((q) => q[1]).join("");
  const torso = S(k.slabOf(caja(xc - 2.2, xc + 2.2, -3.2, 3.2, 0.5), ICE + 11, 8.5, P, 4, 0.4), { tone: "hi" })
    + L(k.planOutline(caja(xc - 1.6, xc + 1.6, -2.6, 2.6, 0.4), ICE + 19.5, P), { tone: "faint" });
  const cabeza = S(k.cylinder(xc, 0, 0.9, ICE + 19.5, 1, P, 16), { tone: "mid" })
    + S(k.cylinder(xc, 0, 2.2, ICE + 20.5, 3.4, P, 28, 0.5), { tone: "hi" })
    + S(k.cylinder(xc, 0, 2.4, ICE + 23.6, 0.6, P, 28, 0.2), { tone: "mid" });      // gorra
  const brazo = (sy) => S(k.slabOf(caja(xc + f * 1.8, xt - f * (DIN.largo + 0.6), sy > 0 ? 1.6 : -2.8, sy > 0 ? 2.8 : -1.6), ZC - 0.8, 1.6, P, 3), { tone: "hi" });
  const travesano = S(k.slabOf(caja(xt - f * (DIN.largo + 1.2), xt - f * DIN.largo, -3.4, 3.4, 0.25), ZC - 0.6, 1.2, P, 3), { tone: "lo", crease: "none" });
  // Dinamómetro: caja con carátula arriba; la aguja la mueve la vista
  const xdc = xt - f * DIN.largo / 2, zt = ZC + DIN.alto;
  let tk = "";
  const nm = Math.round(FMAX / RG.F.paso);
  for (let i = 0; i <= nm; i++) {
    const a = -0.75 * Math.PI + 1.5 * Math.PI * i / nm, r0 = DIN.r - 0.3, r1 = DIN.r - (i % 2 ? 0.75 : 1.1);
    tk += k.onTop([[xdc + r0 * Math.sin(a), r0 * Math.cos(a)], [xdc + r1 * Math.sin(a), r1 * Math.cos(a)]], zt, P);
  }
  const din = `<g data-parte="${f > 0 ? "04" : "05"}">`
    + S(k.slabOf(caja(xt - f * DIN.largo, xt, -DIN.media, DIN.media, 0.4), ZC - DIN.alto, 2 * DIN.alto, P, 4, 0.3), { tone: "mid" })
    + L(k.ring(xdc, 0, DIN.r, zt, P, 36), { tone: "lo" }) + L(tk, { tone: "mid" })
    + k.faceTextSvg(k.topMatrix([xdc - 1.2, -DIN.media + 0.25], zt, P, "x"), "N", { size: 0.9, tone: "lo" })
    + E("path", "ag" + id, { class: "aguja" }, m) + D([at([xdc, 0, zt])], { size: 0.5, tone: "lo" })
    + E("text", "t-d" + id, { class: "t-dial t-din", "text-anchor": "middle" }, m) + `</g>`;
  // Portadiscos: base, varilla, soporte al torso y discos apilados (se ven tantos como masa ÷ kg por disco)
  let disc = S(k.slabOf(caja(xd - 2.9, xd + 2.9, -2.9, 2.9, 0.4), ICE + 8.4, 0.6, P, 3), { tone: "lo", crease: "none" })
    + S(k.slabOf(caja(xd, xc - f * 2.2, -0.6, 0.6, 0.15), ICE + 9, 0.8, P, 2), { tone: "lo", crease: "none" })
    + S(k.slabOf(caja(xd, xc - f * 2.2, -0.6, 0.6, 0.15), ICE + 17.6, 0.8, P, 2), { tone: "lo", crease: "none" });
  for (let i = 0; i < ND; i++) disc += E("g", `d${id}${i}`, {}, m, S(k.cylinder(xd, 0, RD, ICE + 9 + i * PD, HD, P, 28, 0.15), { tone: i % 2 ? "mid" : "hi" }));
  disc += S(k.cylinder(xd, 0, 0.45, ICE + 9, ND * PD + 1, P, 10), { tone: "lo", crease: "none" });
  const portadiscos = `<g data-parte="${f > 0 ? "02" : "03"}">${disc}</g>`;
  const cuerpo = (q) => `<g data-parte="${f > 0 ? "02" : "03"}">${q}</g>`;
  const masa = E("text", "t-m" + id, { class: "t-m", "text-anchor": f > 0 ? "end" : "start" }, m);
  // Orden del pintor: el lado que da a la cámara (+x, +y) va al final
  const capas = f > 0
    ? [portadiscos, cuerpo(abajo + torso + brazo(-1) + brazo(1) + cabeza + travesano), din]
    : [cuerpo(abajo), din, cuerpo(travesano + brazo(-1) + brazo(1) + torso + cabeza), portadiscos];
  return E("g", "pat-" + id, {}, m, capas.join("") + masa);
}

// Contorno punteado de un patinador en la salida (para la trampa)
function fantasma(f) {
  const xt = -f * G, xe = xt - f * 18.6, z0 = ICE, z1 = ICE + 24;
  const cs = [[Math.min(xt, xe), -3.4], [Math.max(xt, xe), -3.4], [Math.max(xt, xe), 3.4], [Math.min(xt, xe), 3.4]];
  return k.onTop(cs, z0, P, true) + k.onTop(cs, z1, P, true) + cs.map((c) => `M${at([c[0], c[1], z0]).map((v) => v.toFixed(1)).join(" ")}L${at([c[0], c[1], z1]).map((v) => v.toFixed(1)).join(" ")}`).join("");
}

const flecha = (id, cls, parte, m) => E("g", id, { class: `flecha ${cls}`, "data-parte": parte }, m,
  E("line", id + "-l", {}, m) + E("polygon", id + "-p", {}, m) + E("text", id + "-t", { class: "t-vel", "text-anchor": "middle" }, m));
const tuboSvg = (pre, cls, m) => E("path", pre + "-f", { class: `tubo ${cls} frente` }, m) + E("path", pre + "-e", { class: `tubo ${cls} fin` }, m) + E("path", pre + "-t", { class: `tubo ${cls} arriba` }, m);

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const NETQ = 24;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function E(tag, id, attrs, m, inner = "") {
  const v = (m && m[id]) || {}, a = { id, ...attrs };
  for (const [q, x] of Object.entries(v)) if (q[0] !== "_") a[q] = x;
  if (v._v === false) a.style = "display:none";
  const txt = "_t" in v ? esc(v._t) : inner;
  return `<${tag}${Object.entries(a).map(([q, x]) => ` ${q}="${esc(x)}"`).join("")}>${txt}</${tag}>`;
}
function cuerpo(m) {
  return [
    CLIP, placa(), pista(),
    `<g data-parte="09">${reglaBase()}${recorte(E("path", "tk-menor", { class: "tk menor" }, m) + E("path", "tk-mayor", { class: "tk mayor" }, m)
      + Array.from({ length: NETQ }, (_, i) => E("text", "tr" + i, { class: "t-regla", "text-anchor": "middle" }, m)).join(""))}</g>`,
    tablero(m),
    patinador(1, m),
    `<g data-parte="11">${tuboSvg("tu-o", "ancho", m)}${tuboSvg("tu-c", "collar", m)}${tuboSvg("tu-i", "delgado", m)}</g>`,
    patinador(-1, m),
    E("g", "fantasmas", { "data-parte": "12" }, m, `<path class="fantasma" d="${fantasma(1) + fantasma(-1)}"/>`),
    flecha("fl-aA", "fl-a", "08", m) + flecha("fl-aB", "fl-a", "08", m),
    flecha("fl-BA", "fl-F", "06", m) + flecha("fl-AB", "fl-F", "07", m),
    E("text", "t-inc", { class: "t-vel t-inc", "text-anchor": "middle", "data-parte": "06" }, m),
    E("text", "t-cero", { class: "t-vel t-cero", "text-anchor": "middle" }, m),
    E("text", "fant-t", { class: "t-trampa", "text-anchor": "middle", "data-parte": "12" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { P, M, X0, X1, XR, G, KF, KA, T, ICE, ZC, ZF, YA, KG, ND, FMAX, VMAX, REGLA, TAB, DIAL, DIN, NETQ, ROT, PISTA: PISTA.d / 2 };
const V = J.valoresIniciales;
const estado0 = { F: V.F, mA: V.mA, mB: V.mB, tF: V.t, fase: "listo", tau: 0, t: 0, revelado: false, trampa: false, recorrido: false };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, vista y calc) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso, onTop, translateAlong };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/leyes-de-newton-3-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/leyes-de-newton-3-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const CONTACTO = 0.4, FIN = 0.35;   // s de pantalla que tardan las agujas en subir y en bajar (dibujo, no física)

let F = V.F, mA = V.mA, mB = V.mB, tF = V.t, fase = "listo", tau = 0, t = 0;
let revelado = false, trampaOn = false, sel = null, enRecorrido = false;
const mov = () => fase === "empuje" || fase === "fin";
const numeros = (F, mA, mB, tt) => {
  const d = calc(J, F, mA, mB, tt);
  return { F: num(F), mA: num(mA), mB: num(mB), t: num(tt), aA: num(d.aA), aB: num(d.aB), vA: num(d.vA), vB: num(d.vB), xA: num(d.xA), xB: num(d.xB), Fsuma: num(d.Fsuma) };
};

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#empujar"), bTrampa = $("#trampa"), bExamen = $("#examen"), nota = $("#nota");
const SL = { F: $("#s-F"), mA: $("#s-mA"), mB: $("#s-mB"), t: $("#s-t") };

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo + " · Física · Examen de admisión UNAM";
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#l-F").textContent = CT.F; $("#l-mA").textContent = CT.mA; $("#l-mB").textContent = CT.mB; $("#l-t").textContent = CT.t;
$("#pred-t").textContent = J.prediccion.titulo;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
for (const q in SL){ SL[q].min = RG[q].min; SL[q].max = RG[q].max; SL[q].step = RG[q].paso; }
stage.setAttribute("aria-valuemin", RG.F.min); stage.setAttribute("aria-valuemax", RG.F.max);
stage.setAttribute("aria-label", "Pista: flechas izquierda y derecha cambian el empuje; arriba y abajo, la masa de A; con Mayús, la de B");

// ---------- Rótulos y fichas (nombre y texto en J.rotulos; lo que aún no se revela sale como «?») ----------
let pasoRegla = J.escena.pasosRegla[0];
const fichaVacia = "Toca un número para ver qué hace cada parte.";
function seleccionar(n){
  sel = sel === n ? null : n;
  document.querySelectorAll(".rot-b").forEach(b => b.setAttribute("aria-pressed", b.dataset.n === sel));
  svg.querySelectorAll("[data-parte]").forEach(e => {
    const dentro = e.closest(`[data-parte="${sel}"]`) || e.querySelector(`[data-parte="${sel}"]`);
    e.classList.toggle("apagado", !!sel && !dentro);
  });
  svg.querySelectorAll(".rot").forEach(g => g.classList.toggle("activo", g.dataset.n === sel));
  pintarFicha();
}
function pintarFicha(){
  const f = J.rotulos[sel];
  if (!f){ $("#ficha").innerHTML = fichaVacia; return; }
  const rv = revelado && !enRecorrido, n = numeros(F, mA, mB, tF), oc = (v) => (rv ? v : "?");
  const o = { F: n.F, mA: n.mA, mB: n.mB, FBA: oc(n.F), aA: oc(n.aA), aB: oc(n.aB), vA: oc(n.vA), vB: oc(n.vB),
    kg: num(J.escena.kgDisco), paso: num(pasoRegla), tmax: num(RG.t.max), t: n.t };
  $("#ficha").innerHTML = `<b>${sel} · ${f[0]}.</b> ${tpl(f[1], o)}`;
}
C.ROT.forEach(n => {
  const b = document.createElement("button"); b.type = "button"; b.className = "rot-b"; b.dataset.n = n;
  b.setAttribute("aria-pressed", "false"); b.innerHTML = `<b>${n}</b>${J.rotulos[n][0]}`;
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
    for (const q in v){
      const val = q === "_v" ? (v[q] ? "" : "none") : String(v[q]), clave = id + "|" + q;
      if (previo.get(clave) === val) continue; previo.set(clave, val);
      if (q === "_v") e.style.display = val; else if (q === "_t") e.textContent = val; else e.setAttribute(q, val);
    }
  }
}
const estado = () => ({ F, mA, mB, tF, fase, tau, t, revelado: revelado && !enRecorrido, trampa: trampaOn, recorrido: enRecorrido });

function render(){
  const rv = revelado && !enRecorrido, tt = mov() ? t : 0, d = calc(J, F, mA, mB, tt), n = numeros(F, mA, mB, tF);
  const mm = vista(C, K, estado(), J); aplicar(mm); pasoRegla = mm._paso;
  // Panel
  $("#o-F").textContent = rv ? `${n.F} N` : "?";
  $("#o-formula").innerHTML = rv ? (F === 0 ? L.sentidoNinguno : tpl(L.parValor, n) + " · " + L.sentidoA) : "Elige tu predicción o empuja para verla.";
  $("#o-sF").textContent = tpl(CT.valorF, {v:n.F}); $("#o-smA").textContent = tpl(CT.valorM, {v:n.mA});
  $("#o-smB").textContent = tpl(CT.valorM, {v:n.mB}); $("#o-st").textContent = tpl(CT.valorT, {v:n.t});
  const vals = { F, mA, mB, t: tF };
  for (const q in SL){
    SL[q].style.setProperty("--p", (100 * (vals[q] - RG[q].min) / (RG[q].max - RG[q].min)) + "%");
    if (+SL[q].value !== vals[q]) SL[q].value = vals[q];
  }
  SL.F.setAttribute("aria-valuetext", tpl(CT.valorF, {v:n.F}) + " sobre cada patinador");
  SL.mA.setAttribute("aria-valuetext", tpl(CT.valorM, {v:n.mA})); SL.mB.setAttribute("aria-valuetext", tpl(CT.valorM, {v:n.mB}));
  SL.t.setAttribute("aria-valuetext", tpl(CT.valorT, {v:n.t}) + (rv ? `, A a ${n.vA} m/s y B a ${n.vB} m/s` : ""));
  $("#o-a").textContent = rv ? `${n.aA} · ${n.aB} m/s²` : "?";
  $("#c-v").textContent = `v a los ${n.t} s (A · B)`; $("#c-x").textContent = `x a los ${n.t} s (A · B)`;
  $("#o-v").textContent = rv ? `${n.vA} · ${n.vB} m/s` : "?";
  $("#o-x").textContent = rv ? `${n.xA} · ${n.xB} m` : "?";
  const lect = `t ${num(tt, 1)} s · xA ${num(d.xA, 1)} m · xB ${num(d.xB, 1)} m`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", F);
  stage.setAttribute("aria-valuetext", `F = ${n.F} N, mA = ${n.mA} kg, mB = ${n.mB} kg` + (mov() ? `, xA = ${num(d.xA, 1)} m, xB = ${num(d.xB, 1)} m` : ""));
  bPri.textContent = fase === "listo" ? CT.empujar : CT.reiniciar;
  $("#escala").textContent = `Regla: una marca cada ${num(pasoRegla)} m`;
  $("#pie-t").textContent = tpl(J.figura.pieEmpuje, { t: n.t });
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.par, F === 0 ? L.sentidoNinguno : tpl(L.parValor, n) + `<br>${L.sentidoA} · ${L.sentidoB}`],
    [L.aceleracion, tpl(L.aceleracionA, n) + "<br>" + tpl(L.aceleracionB, n)],
    [tpl(L.movimiento, n), tpl(L.velocidadA, n) + "<br>" + tpl(L.posicionA, n) + "<br>" + tpl(L.velocidadB, n) + "<br>" + tpl(L.posicionB, n)],
    ["La trampa", tpl(L.trampaCancelar, n) + "<br>" + tpl(L.trampaSumar, n) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((q, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${q[0]}</span><span class="va">${q[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento por fases: listo → contacto → empuje (dura t) → fin ----------
let anim = 0;
function avanzar(dt){
  if (fase === "contacto"){
    tau = Math.min(1, tau + dt / CONTACTO);
    if (tau >= 1){ fase = "empuje"; t = 0;
      decir(F === 0 ? L.sentidoNinguno + "." : `La pértiga se alarga: ${num(F)} N sobre cada uno, en sentidos contrarios, durante ${num(tF)} s.`); }
    return true;
  }
  if (fase === "empuje"){
    t = Math.min(t + dt, tF);
    if (t >= tF - 1e-9){ t = tF; fase = "fin"; tau = 0; }
    return true;
  }
  if (fase === "fin" && tau < 1){ tau = Math.min(1, tau + dt / FIN); return tau < 1; }
  return false;
}
function terminar(){
  if (enRecorrido || fase !== "fin") return;
  revelado = true; const n = numeros(F, mA, mB, t);
  if (F === 0) decir(`${L.sentidoNinguno}. A los ${n.t} s los dos siguen en la salida.`);
  else decir(`Fin del empuje a los ${n.t} s: A va a ${n.vA} m/s hacia la izquierda y avanzó ${n.xA} m; B va a ${n.vB} m/s hacia la derecha y avanzó ${n.xB} m. Sin fuerza, cada uno seguiría a esa velocidad. ` + L.mensaje);
  if (trampaOn) nota.textContent += " " + tpl(L.trampaCancelar, n) + ". " + tpl(L.trampaSumar, n) + ".";
}
let pendiente = null;   // corrida interrumpida por salir de pantalla: se retoma al volver
function correr(fin = null){
  cancelAnimationFrame(anim); pendiente = { fin };
  if (quieto){ fase = "fin"; tau = 1; t = tF; pendiente = null; terminar(); render(); if (fin) fin(); return; }
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
    const sigue = avanzar(dt); render();
    if (sigue) anim = requestAnimationFrame(paso); else { anim = 0; pendiente = null; terminar(); render(); if (fin) fin(); }
  };
  render(); anim = requestAnimationFrame(paso);
}
function nuevo(){ cancelAnimationFrame(anim); anim = 0; pendiente = null; fase = "listo"; tau = 0; t = 0; }
function empujar(fin){
  nuevo(); fase = "contacto"; revelado = true;
  decir("Contacto: la pértiga toca a los dos y las agujas suben juntas.");
  correr(fin);
}
function principal(){
  if (fase === "listo") empujar();
  else { nuevo(); decir(""); render(); }
}

// ---------- Recorrido automático: cambia empuje y masas sin empujar; se detiene al tocar y retoma a los 6 s ----------
const dentroR = (q, v) => v >= RG[q].min && v <= RG[q].max;
const REC = [[V.F, V.mA, V.mB], [V.F, V.mB, V.mA], [V.F, V.mA, V.mA], [RG.F.max, V.mA, V.mB], [V.F, RG.mA.max, RG.mB.min]]
  .filter(([a, b, c]) => dentroR("F", a) && dentroR("mA", b) && dentroR("mB", c));
let tRec = 0, iRec = 0, animRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  const [aF, aA, aB] = REC[iRec % REC.length]; iRec++;
  const bF = F, bA = mA, bB = mB, t0 = performance.now(), DUR = 900;
  if (fase !== "listo"){ nuevo(); }
  const paso = (ahora) => {
    if (!enRecorrido) return;
    const u = Math.min(1, (ahora - t0) / DUR), e = u * u * (3 - 2 * u);
    F = bF + (aF - bF) * e; mA = Math.round(bA + (aA - bA) * e); mB = Math.round(bB + (aB - bB) * e);
    render();
    if (u < 1) animRec = requestAnimationFrame(paso);
    else { F = aF; mA = aA; mB = aB; render(); tRec = setTimeout(pasoRecorrido, 1800); }
  };
  animRec = requestAnimationFrame(paso);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe una corrida del usuario
  enRecorrido = true; nota.textContent = ""; pasoRecorrido();
}
const redondea = (x, p) => Math.round(x / p) * p;
function tomarControl(){
  if (enRecorrido){
    enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(animRec); animRec = 0;
    F = redondea(F, RG.F.paso); mA = redondea(mA, RG.mA.paso); mB = redondea(mB, RG.mB.paso); render();
  }
  clearTimeout(tRec); tRec = setTimeout(iniciarRecorrido, 6000);
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (!visible && enRecorrido) tomarControl(); if (!visible && anim){ cancelAnimationFrame(anim); anim = 0; }
  if (visible && !anim && pendiente && fase !== "listo") correr(pendiente.fin); }, {rootMargin:"0px"}).observe(stage);
setTimeout(() => { if (visible) iniciarRecorrido(); else tRec = setTimeout(iniciarRecorrido, 6000); }, 1400);

// ---------- Controles ----------
bPri.addEventListener("click", principal);
bExamen.addEventListener("click", () => {
  nuevo(); F = V.F; mA = V.mA; mB = V.mB; tF = V.t;
  if (trampaOn) bTrampa.click();
  decir("De vuelta al ejemplo del examen."); render();
});
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){ empujar(); const n = numeros(F, mA, mB, tF); decir(tpl(L.trampaCancelar, n) + ". " + L.mensaje); }
  else render();
});
for (const q of ["F", "mA", "mB"]) SL[q].addEventListener("input", () => {
  const v = +SL[q].value; if (q === "F") F = v; else if (q === "mA") mA = v; else mB = v;
  nuevo(); render();
});
SL.t.addEventListener("input", () => {
  tF = +SL.t.value;
  if (fase === "fin"){ t = tF; tau = 1; terminar(); render(); }       // con la toma congelada, el deslizador recorre el tiempo
  else if (fase === "empuje" && t >= tF){ t = tF; fase = "fin"; tau = 1; cancelAnimationFrame(anim); anim = 0; terminar(); render(); }
  else render();
});
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
stage.addEventListener("keydown", (e) => {
  const dh = {ArrowRight:1, ArrowLeft:-1}[e.key], dv = {ArrowUp:1, ArrowDown:-1}[e.key];
  if (dh === undefined && dv === undefined) return;
  e.preventDefault();
  const lim = (q, v) => Math.max(RG[q].min, Math.min(RG[q].max, v));
  if (dh) F = lim("F", F + dh * RG.F.paso);
  if (dv && e.shiftKey) mB = lim("mB", mB + dv * RG.mB.paso);
  else if (dv) mA = lim("mA", mA + dv * RG.mA.paso);
  nuevo(); render();
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
// Opciones de la fuerza de B sobre A (las del paso 1): cada una con su fórmula del JSON, ordenadas de menor a mayor
const LETRAS = ["A", "B", "C", "D"];
const n0 = numeros(V.F, V.mA, V.mB, V.t);
const OP0 = J.prediccion.opciones.map(q => ({ tipo: q.tipo, v: evalua(q.formula, { F: V.F, mA: V.mA, mB: V.mB }), ok: !!q.correcta, e: tpl(q.retro, n0) }))
  .sort((p, q) => p.v - q.v).map((q, i) => ({ ...q, letra: LETRAS[i], t: `${LETRAS[i]}) ${num(q.v)} N` }));
const letra = (tp) => OP0.find(q => q.tipo === tp).letra, valor = (tp) => num(OP0.find(q => q.tipo === tp).v);
$("#pred-q").textContent = tpl(J.prediccion.pregunta, n0);
opciones($("#pred-ops"), OP0, () => {
  tomarControl(); F = V.F; mA = V.mA; mB = V.mB; tF = V.t;
  if (trampaOn){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
  empujar();
});

// ---------- Los 6 pasos (capa 1) ----------
const n = n0;
const PASOS = [
  {n:1, titulo:"Pregunta de examen", enunciado:`Dos patinadores están quietos sobre hielo sin fricción. A tiene ${n.mA} kg y B tiene ${n.mB} kg. A empuja a B con ${n.F} N hacia la derecha. ¿Qué fuerza ejerce B sobre A?`, ops:OP0},
  {n:2, titulo:"Idea en una frase", p:["Si A empuja a B, B empuja a A con la <b>misma fuerza</b> y en sentido contrario. Las dos fuerzas actúan sobre cuerpos distintos, así que no se cancelan: cada cuerpo acelera según su propia masa, a = F ÷ m.",
    `En la lámina, las dos agujas marcan ${n.F} N y las flechas de fuerza miden lo mismo; las de aceleración no: ${n.aA} m/s² en A y ${n.aB} m/s² en B. Empuja y mira cómo se separan.`]},
  {n:3, titulo:"Ejemplo resuelto", p:[`Fuerza de B sobre A: <b>${n.F} N</b> hacia la izquierda (mismo valor, sentido contrario) → respuesta ${letra("igual")}.`,
    `Aceleración de A: a = ${n.F} ÷ ${n.mA} = <b>${n.aA} m/s²</b> hacia la izquierda. Aceleración de B: a = ${n.F} ÷ ${n.mB} = <b>${n.aB} m/s²</b> hacia la derecha.`,
    `Si los dos parten del reposo y el empuje dura ${n.t} s, A lleva v = ${n.aA} × ${n.t} = ${n.vA} m/s y avanzó x = ½ × ${n.aA} × ${n.t}² = ${n.xA} m; B lleva v = ${n.aB} × ${n.t} = ${n.vB} m/s y avanzó x = ½ × ${n.aB} × ${n.t}² = ${n.xB} m, en sentidos opuestos.`]},
  {n:4, titulo:"La trampa", p:[`Creer que acción y reacción se cancelan «porque son iguales y opuestas» da ${valor("cancelan")} N, la opción ${letra("cancelan")}. Se cancelarían si actuaran sobre el mismo cuerpo; aquí una actúa sobre A y la otra sobre B. Si se cancelaran, nadie se movería, y los dos sí se mueven.`,
    `Las otras también tienen dueño: ${letra("proporcional")} (${valor("proporcional")} N) sale de creer que el más chico empuja menos (${n.F} × ${n.mB} ÷ ${n.mA}), y ${letra("suma")} (${valor("suma")} N) suma acción y reacción como si fueran dos fuerzas sobre el mismo cuerpo (${n.F} + ${n.F}).`,
    `Pulsa «${CT.trampa}» en la lámina: los fantasmas se quedan en la salida; los patinadores de verdad sí se separan.`]},
  {n:5, titulo:"Truco de examen", p:['Antes de cancelar o sumar fuerzas, pregunta <span class="formula">¿sobre quién actúa?</span> Las dos fuerzas del par actúan sobre cuerpos distintos, así que nunca se suman ni se cancelan entre sí.',
    `Misma fuerza, distinta masa: el de menos masa acelera más (aquí ${n.aB} m/s² contra ${n.aA} m/s², la razón inversa de las masas, ${n.mB} : ${n.mA}).`]},
  {n:6, titulo:J.prueba.titulo, enunciado:J.prueba.pregunta, ops:J.prueba.opciones.map(o => ({t:`${o.letra}) ${o.texto}`, ok:o.correcta, e:o.retro}))}
];
PASOS.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.p || []).map(t => `<p>${t}</p>`).join("");
  if (p.enunciado){ s.insertAdjacentHTML("beforeend", `<p>${p.enunciado}</p>`); const l = document.createElement("div"); l.className = "opciones"; opciones(l, p.ops); s.append(l); }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});
// Otro intento (capa 2): las masas al revés; se pregunta la aceleración de A
const o2 = calc(J, V.F, V.mB, V.mA, V.t), aMal = V.F / (V.mA + V.mB);
const OTRO = [
  {v:o2.aA, ok:true, e:`B empuja a A con los mismos ${num(V.F)} N, y A ahora tiene ${num(V.mB)} kg: ${num(V.F)} ÷ ${num(V.mB)} = ${num(o2.aA)} m/s².`},
  {v:o2.aB, e:`Esa es la aceleración de B (${num(V.F)} ÷ ${num(V.mA)}): cada cuerpo se divide entre su propia masa.`},
  {v:0, e:"Acción y reacción no se cancelan: una actúa sobre A y la otra sobre B."},
  {v:aMal, e:`Sumaste las masas (${num(V.F)} ÷ ${num(V.mA + V.mB)}). Cada cuerpo acelera con su propia masa.`}
].sort((p, q) => p.v - q.v).map((q, i) => ({ ...q, t:`${LETRAS[i]}) ${num(q.v)} m/s²` }));
$("#otro").innerHTML = `<h3>Otro intento</h3><p>Ahora A tiene ${num(V.mB)} kg y B tiene ${num(V.mA)} kg. A empuja a B con ${num(V.F)} N. ¿Qué aceleración tiene A?</p><div class="opciones"></div>`;
opciones($("#otro .opciones"), OTRO);

$("#pie").innerHTML = `<i>${J.figura.pie} <span id="pie-t"></span></i> Modelo: la regla está en metros a escala; los patinadores, los dinamómetros y las flechas no (las flechas tienen su propia escala).
 La pértiga telescópica es ligera y se alarga mientras se separan: el empuje dura todo el tiempo t y vale lo mismo en las dos puntas, por eso las agujas marcan lo mismo. Al terminar el empuje, las agujas vuelven a 0 y la toma se congela; sin fuerza, cada uno seguiría a velocidad constante. Con la toma congelada, el deslizador t recorre el movimiento.
 Si se alejan mucho, la cámara se aleja y la regla cambia de escala (debajo de la lámina dice cuánto vale cada marca). La animación va en tiempo real (t ≤ ${num(RG.t.max)} s). Cada disco del portadiscos cuenta ${num(J.escena.kgDisco)} kg.
 Si nadie toca, la lámina cambia el empuje y las masas sola, sin empujar ni mostrar el resultado. En el celular, «Pantalla completa» la muestra grande (mejor con el teléfono girado) y se acerca con pellizco. Teclas: B empuja o vuelve al inicio; con la lámina enfocada, ← → cambian el empuje, ↑ ↓ la masa de A y Mayús + ↑ ↓ la de B.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#empujar", "#bloque-F", "#bloque-mA", "#bloque-mB", "#bloque-t"].map(s => $(s));
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
  else if (ptrs.size === 1 && zz > 1) arrastre = [e.clientX, e.clientY, tx, ty];
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


pintarFicha(); render();
window.__newton3 = { set:(o) => { for (const q of ["F", "mA", "mB", "tF"]) if (q in o) ({F:() => F = o.F, mA:() => mA = o.mA, mB:() => mB = o.mB, tF:() => tF = o.tF})[q]();
    if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa;
    if ("fase" in o){ fase = o.fase; tau = o.tau ?? 1; t = o.t ?? (fase === "fin" || fase === "empuje" ? tF : 0); }
    render(); },
  sel:seleccionar, completa:entrar, salir, alto:() => { enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(animRec); cancelAnimationFrame(anim); anim = 0; render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de la tercera ley) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados de la prensa (pasarán a piezas compartidas).
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
/* Propio de la tercera ley (también va en el SVG fijo) */
.hielo>.iso-top{fill:color-mix(in srgb,var(--agua-sup) 45%,var(--anatomy-top))}
.hielo>.iso-shade{fill:color-mix(in srgb,var(--agua-1) 30%,var(--anatomy-shade-1))}
.salida{fill:none;stroke:var(--dorado);stroke-width:.9;stroke-dasharray:3 2}
.tubo{stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);stroke-linejoin:round}
.tubo.arriba{fill:var(--anatomy-top)} .tubo.frente{fill:var(--anatomy-shade-2)} .tubo.fin{fill:var(--anatomy-shade-0)}
.tubo.collar.frente{fill:var(--anatomy-shade-1)}
.aguja{fill:none;stroke:var(--rubrica);stroke-width:1.2;stroke-linecap:round}
.t-dial{font:500 9px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.t-din{font-size:10px;fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-m{font:500 11px var(--serif);fill:var(--anatomy-text);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px}
.tk{fill:none;stroke-width:.6} .tk.menor{stroke:var(--anatomy-lo)} .tk.mayor{stroke:var(--anatomy-mid)}
.t-regla{font:500 9px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.flecha line{stroke:var(--rubrica);stroke-width:2.4;stroke-linecap:round} .flecha polygon{fill:var(--rubrica)}
.fl-a line{stroke:var(--acento);stroke-width:2.4} .fl-a polygon{fill:var(--acento)} .fl-a .t-vel{fill:var(--acento);font-size:13px}
.t-vel{font:500 14px var(--serif);fill:var(--rubrica);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-inc{font-style:italic}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de la tercera ley */
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px 18px;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))}
.escala{flex:1;min-width:0;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums}
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
.modo-lamina .compacto{display:grid;grid-template-columns:auto repeat(4,minmax(0,1fr));gap:6px 16px;align-items:center}
.modo-lamina .compacto .fila{font-size:.82rem;font-weight:600}
.modo-lamina .compacto input[type=range]{height:30px}
.modo-lamina .compacto .boton{white-space:nowrap}
@media (orientation:portrait){.modo-lamina .gira{display:block;margin:0 52px 0 0;font-size:.85rem;color:var(--suave)}
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .modo-lamina .compacto #empujar{grid-column:1/-1}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el del examen, empujando al final de t) ----------
function svgFijo() {
  const s = { F: V.F, mA: V.mA, mB: V.mB, tF: V.t, fase: "empuje", tau: 1, t: V.t, revelado: true, trampa: false, recorrido: false };
  const claro = CSS_PRENSA.slice(CSS_PRENSA.indexOf(":root{"), CSS_PRENSA.indexOf("@media (prefers-color-scheme:dark)"))
    .replace(":root{", "svg{").replace(/\s*color-scheme:light;box-sizing:border-box;[\s\S]*?\n\}/, "}");
  const tibio = CSS_PRENSA.slice(CSS_PRENSA.indexOf(".iso{"), CSS_PRENSA.indexOf("@media", CSS_PRENSA.indexOf(".iso{"))).replace(".iso{", "svg.iso{");
  const estilo = `<style>${k.ISO_CSS}${claro}${tibio}svg{background:var(--bg)}${CSS_FIG}</style>`;
  const sinRot = (m) => { for (const n of ROT) m["rot-" + n] = { _v: false }; return m; };
  return k.figureSvg({ width: W, height: H, label: J.figura.aria, className: "iso", body: [estilo, ...cuerpo(sinRot(vista(CFG, k, s, J)))] })
    .replace('<svg ', `<svg width="1280" height="${2 * H}" `);
}

const plate = k.plateHtml({
  fig: "Lámina I",
  title: "Tercera ley de Newton",
  hint: J.instruccion,
  readout: "t 0 s · xA 0 m · xB 0 m",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuenow="0">${figura}</div>`,
});
const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tercera ley de Newton · Códice Vivo</title>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
</head>
<body>
<main class="pagina">
  <header>
    <div class="marca-casa">Códice Vivo · Laboratorio</div>
    <h1 id="titulo">Tercera ley de Newton</h1>
    <p class="sub" id="subtitulo"></p>
  </header>
  <div class="rejilla">
    <div id="pasos-a" class="pasos"></div>
    <section class="tarjeta lab" aria-label="Laboratorio">
      <div class="predice">
        <h3 id="pred-t">Predice antes de empujar</h3>
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
          <span class="lectura-etq">Fuerza de B sobre A, F<sub>B→A</sub></span>
          <output id="o-F" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-F">
            <div class="fila"><label for="s-F" id="l-F"></label><output id="o-sF"></output></div>
            <input type="range" id="s-F">
          </div>
          <div id="bloque-mA">
            <div class="fila"><label for="s-mA" id="l-mA"></label><output id="o-smA"></output></div>
            <input type="range" id="s-mA">
          </div>
          <div id="bloque-mB">
            <div class="fila"><label for="s-mB" id="l-mB"></label><output id="o-smB"></output></div>
            <input type="range" id="s-mB">
          </div>
          <div id="bloque-t">
            <div class="fila"><label for="s-t" id="l-t"></label><output id="o-st"></output></div>
            <input type="range" id="s-t">
          </div>
        </div>
        <div class="chips">
          <div class="chip"><span>a<sub>A</sub> · a<sub>B</sub></span><output id="o-a"></output></div>
          <div class="chip"><span id="c-v">v</span><output id="o-v"></output></div>
          <div class="chip"><span id="c-x">x</span><output id="o-x"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="empujar" aria-keyshortcuts="b">Empujar</button>
          <button type="button" class="boton sec" id="trampa" aria-pressed="false"></button>
          <button type="button" class="boton sec" id="examen"></button>
        </div>
        <p class="nota" id="nota" data-say aria-live="polite"></p>
        <details class="profundizar">
          <summary>Profundizar: de dónde sale cada número</summary>
          <ol class="lecturas" id="lecturas"></ol>
          <div class="otro" id="otro"></div>
        </details>
      </div>
      <p class="pie" id="pie"></p>
    </section>
    <div id="pasos-b" class="pasos"></div>
  </div>
</main>
<!--respaldo-->
<script type="module">${(kitScript() + `\nconst evalua = ${evalua.toString()};\nconst calc = ${calc.toString()};\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
