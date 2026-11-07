// Lámina 2.5D+ de la segunda ley de Newton (F = m·a): dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/leyes-de-newton-2-2_5d.mjs                → plantilla/interactivos/leyes-de-newton-2/plus/index.html
//                                                                     y contenido/fisica/img/leyes-de-newton-2.svg (figura fija para PDF y video)
//   node plantilla/figuras/leyes-de-newton-2-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de la primera ley (plantilla/figuras/leyes-de-newton-1-2_5d.mjs): misma página, pantalla completa,
// cámara que sigue y salida .svg; otro dibujo (caja con pesas, dos dinamómetros, riel de aire) y otra lógica (F neta → a).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "leyes-de-newton-2";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(RAIZ, ".claude", "skills", "anatomy");
const k = await import("file://" + join(SKILL, "kit", "iso-kit.mjs"));
const { kitScript } = await import("file://" + join(SKILL, "scripts", "inline-kit.mjs"));
const JSON_TEMA = join(RAIZ, "contenido", "fisica", `${TEMA}-interactivo.json`);
const SALIDA = join(RAIZ, "plantilla", "interactivos", TEMA, "plus", "index.html");
const SALIDA_SVG = join(RAIZ, "contenido", "fisica", "img", `${TEMA}.svg`);
const J = JSON.parse(readFileSync(JSON_TEMA, "utf8"));

// ---------- Modelo del dibujo (unidades del mundo; z hacia arriba; la caja va por y = 0; el frente es +y) ----------
// El riel y la regla están en metros a escala; la caja, los dinamómetros y las flechas no.
// Ventana fija de J.escena.ventana m centrada donde se suelta la caja; si la caja se aleja más de SEG m del centro,
// la cámara la sigue (a la derecha o a la izquierda) y la regla se desplaza. El riel no tiene tope.
const RG = J.rangos, ES = J.escena;
const M = 10;                                    // unidades por metro
const XR = ES.ventana / 2;                       // m visibles a cada lado
const X0 = -XR * M, X1 = XR * M;
const SEG = 3;                                   // m: desde aquí la cámara sigue a la caja
const ZT = 3, GAP = 0.5;                         // alto del riel; colchón de aire bajo la caja
const B = 7, HB = 9;                             // media caja (planta) y alto
const ZC = ZT + GAP + HB / 2;                    // altura de los ganchos y cordones
const NP = RG.m.max, RP = 3, HP = 0.72, PP = 0.8;    // pesas de 1 kg apiladas sobre la caja
const FMAX = Math.max(RG.F1.max, RG.F2.max);
const SL0 = 4, SLM = 12, KS = (SLM - SL0) / FMAX;     // largo del resorte del dinamómetro: SL0 + KS·F
const RS = 1.5, VUELTAS = 7;
const KF = 0.55;                                 // escala propia de las flechas: unidades por N
const ZTOP = ZT + GAP + HB + NP * PP;            // tope de la pila de pesas
const ZN = ZTOP + 4, ZF = ZTOP + 10;             // altura de la flecha neta y de las fuerzas
const RIEL = { x: X0, y: -9, w: X1 - X0, d: 18, r: 0.8 };
const PLACA = { x: X0 - 8, y: -24, w: X1 - X0 + 16, d: 49, r: 6 }, PLACA_H = 6, PATA_H = 5;
const REGLA = { y0: 11, y1: 17, z: 0.8 };
const TAB = { x: -64, y: -22, w: 32, d: 10, r: 1, h: 1.4 };       // tablero con cronómetro y velocímetro
const DIAL = { r: 4.2, y: -16.6, xc: -56, xv: -40 };
const SOP = { x: 38, y: -22, w: 16, d: 8, r: 1, h: 6 };           // soplador del riel
const TRABA = { x: B - 1.3, y: B + 1.6, r: 1, h: 7 };
const VMAX = (FMAX / RG.m.min) * RG.t.max;       // tope del velocímetro (escala de raíz)

const W = 640, H = 270;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [X0, 0, ZF + 19], [X1, 0, ZF + 19]],
  W, H, { pad: 8, azimuth: 78, elevation: 28 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const fx = (v) => Math.round(v * 10) / 10;

// Ventana de recorte: todo lo que se desplaza con la cámara se corta en los extremos de la ventana.
function envolvente(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo = [], arriba = [];
  for (const p of pts) { while (abajo.length > 1 && cruz(abajo[abajo.length - 2], abajo[abajo.length - 1], p) <= 0) abajo.pop(); abajo.push(p); }
  for (const p of pts.reverse()) { while (arriba.length > 1 && cruz(arriba[arriba.length - 2], arriba[arriba.length - 1], p) <= 0) arriba.pop(); arriba.push(p); }
  return abajo.slice(0, -1).concat(arriba.slice(0, -1));
}
const VENTANA = envolvente(k.boxCorners({ x: X0, y: -12, w: X1 - X0, d: 24 }, -30, 70).map(at));
const CLIP = `<defs><clipPath id="ventana-n2"><path d="${k.pathOf(VENTANA, true)}"/></clipPath></defs>`;
const recorte = (s) => `<g clip-path="url(#ventana-n2)">${s}</g>`;

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
function vista(C, K, s, J) {
  const P = C.P, M = C.M;
  const num = (v, dec = 2) => {
    const r = Math.round(v * 10 ** dec) / 10 ** dec;
    let [i, d] = Math.abs(r).toFixed(dec).split(".");
    d = (d || "").replace(/0+$/, "");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
    return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
  };
  const tpl = (t, o) => t.replace(/\{(\w+)\}/g, (m, q) => (q in o ? o[q] : m));
  const txt = (t) => t.replace(/<sub>1<\/sub>/g, "₁").replace(/<sub>2<\/sub>/g, "₂").replace(/<sub>([^<]*)<\/sub>/g, " $1");   // SVG: sin etiquetas
  const Fn = s.F1 - s.F2, a = Fn / s.m;
  const mov = s.fase === "acelera" || s.fase === "pausa", tt = mov ? s.t : 0;
  const xr = a * tt * tt / 2, v = a * tt;
  const camM = Math.sign(xr) * Math.max(0, Math.abs(xr) - C.SEG), camU = camM * M;
  const xu = (xr - camM) * M;
  const m = {};
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const iso = (p) => K.iso(p, P);
  const mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];

  // Conjunto que viaja con la caja: caja, pesas, ganchos, resortes, cabezas y cordones
  m["conj"] = { transform: K.translateAlong(P, [xu, 0, 0]) };
  for (let i = 0; i < C.NP; i++) m["pesa" + i] = { _v: i < Math.round(s.m) };
  const sl1 = C.SL0 + C.KS * s.F1, sl2 = C.SL0 + C.KS * s.F2;
  const r1 = K.coil(C.B + 1, C.B + 1 + sl1, [0, C.ZC], C.RS, C.VUELTAS, "x", P);
  const r2 = K.coil(-C.B - 1 - sl2, -C.B - 1, [0, C.ZC], C.RS, C.VUELTAS, "x", P);
  m["res1-a"] = { d: r1.back }; m["res1-b"] = { d: r1.front };
  m["res2-a"] = { d: r2.back }; m["res2-b"] = { d: r2.front };
  m["cab1"] = { transform: K.translateAlong(P, [sl1 - C.SL0, 0, 0]) };
  m["cab2"] = { transform: K.translateAlong(P, [-(sl2 - C.SL0), 0, 0]) };
  const pm = iso([-1.4, C.B, C.ZT + C.GAP + 2.4]);    // dentro del conjunto: ya viaja con la caja
  m["t-m"] = { x: pm[0].toFixed(1), y: pm[1].toFixed(1), _t: txt(tpl(J.figura.m, { m: num(s.m) })) };

  // Traba: sostiene la caja mientras se ajustan las fuerzas; al soltar se hunde en el riel
  const baja = s.fase === "listo" ? 0 : s.fase === "suelta" ? -C.TRABA.h * s.tau : -C.TRABA.h;
  m["traba"] = { transform: K.translateAlong(P, [-camU, 0, baja]), _v: s.fase === "listo" || s.fase === "suelta" };

  // Agujeros del riel de aire (cada medio metro): se desplazan con la cámara
  let ag = "";
  for (let i = Math.ceil((camM - C.XR) / 0.5); i * 0.5 <= camM + C.XR + 1e-9; i++) {
    const u = (i * 0.5 - camM) * M;
    if (u < C.X0 + 1.5 || u > C.X1 - 1.5) continue;
    for (const y of [-6.5, -2.2, 2.2, 6.5]) ag += `M${pt(iso([u + (Math.abs(y) < 3 ? 2.5 : 0), y, C.ZT]))}h.01`;
  }
  m["agujeros"] = { d: ag };

  // Regla: etiqueta cada 2 m (con signo), marcas menores cada 0.5 m
  let tkM = "", tkm = ""; const etq = [];
  for (let i = Math.ceil((camM - C.XR) / 0.5); i * 0.5 <= camM + C.XR + 1e-9; i++) {
    const u = (i * 0.5 - camM) * M;
    if (u < C.X0 + 2 || u > C.X1 - 2) continue;
    const mayor = i % 4 === 0;
    const dd = K.onTop([[u, C.REGLA.y0], [u, C.REGLA.y0 + (mayor ? 3.6 : 1.8)]], C.REGLA.z, P);
    if (mayor) { tkM += dd; etq.push([u, i * 0.5]); } else tkm += dd;
  }
  m["tk-mayor"] = { d: tkM }; m["tk-menor"] = { d: tkm };
  for (let i = 0; i < C.NETQ; i++) {
    const e = etq[i];
    if (!e) { m["tr" + i] = { _v: false }; continue; }
    const p = iso([e[0], C.REGLA.y1, 0]);
    m["tr" + i] = { _v: true, x: p[0].toFixed(1), y: (p[1] + 10).toFixed(1), _t: num(e[1]) + (e[1] === 0 ? " m" : "") };
  }

  // Fantasma de la trampa: acelera solo con la fuerza mayor (con F1 = F2, la de la derecha)
  const mayorDer = s.F1 >= s.F2, aT = (mayorDer ? s.F1 : -s.F2) / s.m, xg = aT * tt * tt / 2, ug = (xg - camM) * M;
  const dentro = Math.abs(ug) <= C.X1 - C.B - 1;
  const z0 = C.ZT + C.GAP, z1 = z0 + C.HB, cs = [[ug - C.B, -C.B], [ug + C.B, -C.B], [ug + C.B, C.B], [ug - C.B, C.B]];
  m["fantasma"] = { _v: s.trampa && dentro, d: K.onTop(cs, z0, P, true) + K.onTop(cs, z1, P, true)
    + cs.map(c => `M${pt(iso([c[0], c[1], z0]))}L${pt(iso([c[0], c[1], z1]))}`).join("") };
  const lado = Math.sign(ug) || 1, pf = dentro ? iso([ug, 0, C.ZF + 9]) : iso([lado * (C.X1 - 3), 0, C.ZF + 17]);
  m["fant-t"] = { _v: s.trampa, x: pf[0].toFixed(1), y: pf[1].toFixed(1), "text-anchor": dentro ? "middle" : lado > 0 ? "end" : "start" };
  m["fant-1"] = { x: pf[0].toFixed(1), _t: dentro ? tpl(J.figura.fantasma, { a: num(Math.abs(aT)) })
    : (lado < 0 ? "← " : "") + tpl(J.figura.fueraFantasma, { x: num(xg, 1) }) + (lado > 0 ? " →" : "") };
  m["fant-2"] = { x: pf[0].toFixed(1), _t: dentro ? tpl(J.figura.real, { a: num(Math.abs(a)) }) : tpl(J.figura.fantasma, { a: num(Math.abs(aT)) }) };

  // Flechas (pantalla): F1, F2 arriba; la neta debajo de ellas, como el resultado de una suma
  const flecha = (id, p0, p1, texto, ver) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    if (!ver || l < 2) { m[id] = { _v: false }; return; }
    const ux = dx / l, uy = dy / l, cab = Math.min(9, l * 0.6), an = cab * 0.5, bx = p1[0] - ux * cab, by = p1[1] - uy * cab;
    m[id] = { _v: true };
    m[id + "-l"] = { x1: p0[0].toFixed(1), y1: p0[1].toFixed(1), x2: (bx + ux).toFixed(1), y2: (by + uy).toFixed(1) };
    m[id + "-p"] = { points: `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${(bx - uy * an).toFixed(1)},${(by + ux * an).toFixed(1)} ${(bx + uy * an).toFixed(1)},${(by - ux * an).toFixed(1)}` };
    m[id + "-t"] = { x: (p1[0] + ux * 5).toFixed(1), y: (p1[1] + uy * 5 + 4.5).toFixed(1), "text-anchor": ux > 0 ? "start" : "end", _t: texto };
  };
  const enVista = Math.abs(xu) < C.X1;
  flecha("fl-1", iso([xu, 0, C.ZF]), iso([xu + C.KF * s.F1, 0, C.ZF]), txt(tpl(J.figura.F1, { F1: num(s.F1) })), enVista);
  flecha("fl-2", iso([xu, 0, C.ZF]), iso([xu - C.KF * s.F2, 0, C.ZF]), txt(tpl(J.figura.F2, { F2: num(s.F2) })), enVista);
  const N0 = iso([xu, 0, C.ZN]), N1 = iso([xu + C.KF * Fn, 0, C.ZN]);
  flecha("fl-n", N0, N1, txt(tpl(J.figura.Fn, { Fn: num(Math.abs(Fn)) })), enVista && Fn !== 0);
  m["t-n0"] = { _v: enVista && Fn === 0, x: N0[0].toFixed(1), y: (N0[1] + 4).toFixed(1), _t: J.figura.neta0 };

  // Cronómetro (una vuelta = t máximo del deslizador) y velocímetro (escala de raíz, cero arriba, ± a cada lado)
  const aguja = (cx, th) => K.onTop([[cx, C.DIAL.y], [cx + 0.82 * C.DIAL.r * Math.sin(th), C.DIAL.y + 0.82 * C.DIAL.r * Math.cos(th)]], C.TAB.h, P);
  m["ag-c"] = { d: aguja(C.DIAL.xc, 2 * Math.PI * tt / J.rangos.t.max) };
  m["ag-v"] = { d: aguja(C.DIAL.xv, Math.sign(v) * 0.75 * Math.PI * Math.sqrt(Math.min(1, Math.abs(v) / C.VMAX))) };
  const pc = iso([C.DIAL.xc, C.TAB.y, C.TAB.h]), pv = iso([C.DIAL.xv, C.TAB.y, C.TAB.h]);
  m["t-crono"] = { x: pc[0].toFixed(1), y: (pc[1] - 4).toFixed(1), _t: `t = ${num(tt, 2)} s` + (s.fase === "pausa" ? " ❚❚" : "") };
  m["t-velo"] = { x: pv[0].toFixed(1), y: (pv[1] - 4).toFixed(1), _t: `v = ${num(v, 1)} m/s` };

  // Rótulos
  const rot = (n, p, ver = true) => { m["rot-" + n] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  rot("01", mas(iso([xu - C.B, -C.B, C.ZT + C.GAP + C.HB]), -8, -6), enVista);
  rot("02", mas(iso([xu + C.B + 3 + sl1, 0, C.ZC + 2]), 0, -14), xu + C.B + 3 + sl1 < C.X1);
  rot("03", mas(iso([xu - C.B - 3 - sl2, 0, C.ZC + 2]), 0, -14), xu - C.B - 3 - sl2 > C.X0);
  rot("04", mas(iso([C.X0 + 8, 9, C.ZT]), 0, 10));
  rot("05", mas(iso([C.SOP.x + C.SOP.w, C.SOP.y, C.SOP.h]), 10, -4));
  rot("06", Fn !== 0 ? mas([(N0[0] + N1[0]) / 2, (N0[1] + N1[1]) / 2], 0, -12) : mas(N0, -84, -4), enVista);
  rot("07", mas(iso([C.X1 - 6, C.REGLA.y1, 0]), 0, 12));
  rot("08", mas(iso([C.TAB.x, C.TAB.y, C.TAB.h]), -6, -8));
  rot("09", mas(iso([C.TAB.x + C.TAB.w, C.TAB.y + C.TAB.d, C.TAB.h]), 9, 0));
  rot("10", mas(iso([ug + C.B, -C.B, z1]), 10, -8), s.trampa && dentro && Math.abs(ug - xu) > 2 * C.B);
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
  // Placa de datos grabada al frente
  const pl = { x: -14, y: -21.5, w: 46, d: 2.6, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 3, pl.y + 2], 0.4, P, "x"), "SEGUNDA LEY · F = m·a · RIEL SIN FRICCIÓN", { size: 1.7, tone: "lo" }));
  o.push(D([at([pl.x + 1.4, pl.y + 1.3, 0.4]), at([pl.x + pl.w - 1.4, pl.y + 1.3, 0.4])], { size: 0.4 }));
  return o.join("");
}

function reglaBase() {
  return S(k.slabOf({ x: X0 + 1, y: REGLA.y0, w: X1 - X0 - 2, d: REGLA.y1 - REGLA.y0, r: 0.8 }, 0, REGLA.z, P, 3), { tone: "hi", crease: "none" })
    + L(k.lineOnTop([X0 + 2, REGLA.y0 + 4.6], [X1 - 2, REGLA.y0 + 4.6], REGLA.z, P), { tone: "faint" });
}

// Riel de aire: perfil largo con dos bordes guía; los agujeros los pone la vista
function riel() {
  return S(k.slabOf(RIEL, 0, ZT, P, 4, 0.3), { tone: "mid" })
    + L(k.lineOnTop([X0 + 1, -8.2], [X1 - 1, -8.2], ZT, P) + k.lineOnTop([X0 + 1, 8.2], [X1 - 1, 8.2], ZT, P), { tone: "faint" });
}

// Soplador: caja con motor moleteado y manguera que entra al frente del riel
function soplador() {
  const o = [];
  o.push(S(k.slabOf({ x: SOP.x + SOP.w / 2 - 1.2, y: SOP.y + SOP.d, w: 2.4, d: RIEL.y - SOP.y - SOP.d, r: 0.3 }, 0.6, 2, P, 3), { tone: "lo", crease: "none" }));
  o.push(S(k.slabOf(SOP, 0, SOP.h, P, 4, 0.3), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(SOP, 1.2), SOP.h, P), { tone: "lo" }));
  const cx = SOP.x + SOP.w / 2, cy = SOP.y + SOP.d / 2;
  o.push(S(k.cylinder(cx, cy, 2.6, SOP.h, 1.6, P, 32, 0.2), { tone: "hi" }));
  o.push(L(k.knurl(cx, cy, 2.6, SOP.h + 0.2, SOP.h + 1.4, 18, P), { tone: "lo" }));
  o.push(L(k.ring(cx, cy, 1.2, SOP.h + 1.6, P, 20), { tone: "lo" }));
  o.push(k.faceTextSvg(k.topMatrix([SOP.x + 1.4, SOP.y + SOP.d - 2.2], SOP.h, P, "x"), "AIRE", { size: 1.4, tone: "lo" }));
  return `<g data-parte="05">${o.join("")}</g>`;
}

// Tablero: cronómetro y velocímetro con agujas (las agujas las mueve la vista)
function tablero(m) {
  const o = [S(k.slabOf(TAB, 0, TAB.h, P, 4, 0.2), { tone: "mid" })];
  const dial = (cx, parte, nombre, marcas, idA, idT) => {
    const q = [L(k.ring(cx, DIAL.y, DIAL.r, TAB.h, P, 40), { tone: "lo" }), L(k.ring(cx, DIAL.y, DIAL.r - 0.5, TAB.h, P, 40), { tone: "faint" })];
    let tk = "";
    for (const th of marcas) tk += k.onTop([[cx + (DIAL.r - 0.5) * Math.sin(th), DIAL.y + (DIAL.r - 0.5) * Math.cos(th)], [cx + (DIAL.r - 1.3) * Math.sin(th), DIAL.y + (DIAL.r - 1.3) * Math.cos(th)]], TAB.h, P);
    q.push(L(tk, { tone: "mid" }));
    q.push(k.faceTextSvg(k.topMatrix([cx - 5.4, TAB.y + TAB.d - 1.4], TAB.h, P, "x"), nombre, { size: 1.15, tone: "lo" }));
    q.push(E("path", idA, { class: "aguja" }, m));
    q.push(D([at([cx, DIAL.y, TAB.h])], { size: 0.7, tone: "lo" }));
    q.push(E("text", idT, { class: "t-dial", "text-anchor": "middle" }, m));
    return `<g data-parte="${parte}">${q.join("")}</g>`;
  };
  const nt = Math.round(RG.t.max / RG.t.paso);
  const mc = Array.from({ length: nt }, (_, i) => 2 * Math.PI * i / nt);
  const mv = [-1, -0.5, 0, 0.5, 1].map(f => f * 0.75 * Math.PI);
  o.push(dial(DIAL.xc, "08", "CRONÓMETRO", mc, "ag-c", "t-crono"));
  o.push(dial(DIAL.xv, "09", "VELOCÍMETRO", mv, "ag-v", "t-velo"));
  return o.join("");
}

// Traba: poste con pasador que entra en el frente de la caja; se hunde al soltar
const traba = (m) => E("g", "traba", { "data-parte": "04" }, m,
  S(k.cylinder(TRABA.x, TRABA.y, TRABA.r, ZT, TRABA.h, P, 16, 0.2), { tone: "lo" })
  + S(k.slabOf({ x: TRABA.x - 0.6, y: B - 0.6, w: 1.2, d: TRABA.y - B + 0.6, r: 0.2 }, ZT + TRABA.h - 2.5, 1.2, P, 3), { tone: "mid", crease: "none" }));

// Dinamómetro de un lado (s = +1 derecha, −1 izquierda): gancho y regleta fijos a la caja, resorte, cabeza móvil con cordón
function dinamometro(s, m) {
  const id = s > 0 ? "1" : "2", parte = s > 0 ? "02" : "03", o = [];
  const xs = (a, b) => (s > 0 ? { x: a, w: b - a } : { x: -b, w: b - a });
  // Regleta graduada en N bajo el resorte (cada paso del deslizador, mayor cada 2)
  const rg = { ...xs(B + 0.6, B + 1 + SLM + 0.8), y: -2, d: 4, r: 0.3 };
  o.push(S(k.slabOf(rg, ZC - 2.9, 0.5, P, 3), { tone: "hi", crease: "none" }));
  const paso = RG[s > 0 ? "F1" : "F2"].paso;
  let tM = "", tm = "";
  for (let F = 0, i = 0; F <= FMAX + 1e-9; F += paso, i++) {
    const x = s * (B + 1 + SL0 + KS * F), dd = k.onTop([[x, 1.8], [x, i % 2 ? 0.9 : 0]], ZC - 2.4, P);
    if (i % 2) tm += dd; else tM += dd;
  }
  o.push(L(tm, { tone: "lo" }) + L(tM, { tone: "mid" }));
  // Gancho fijo en la cara de la caja
  o.push(S(k.slabOf({ ...xs(B, B + 1), y: -0.5, d: 1, r: 0.2 }, ZC - 0.5, 1, P, 3), { tone: "lo", crease: "none" }));
  o.push(E("path", `res${id}-a`, { class: "resorte atras" }, m));
  o.push(E("path", `res${id}-b`, { class: "resorte" }, m));
  // Cabeza (con su marca de lectura) y cordón hacia un torno fuera de la vista que mantiene la fuerza
  const x0 = B + 1 + SL0, cab = { ...xs(x0, x0 + 4.5), y: -2, d: 4, r: 0.4 };
  const cuerda = s > 0 ? k.lineOnTop([x0 + 4.5, 0], [x0 + 4.5 + 320, 0], ZC, P) : k.lineOnTop([-x0 - 4.5 - 320, 0], [-x0 - 4.5, 0], ZC, P);
  o.push(E("g", "cab" + id, {}, m, `<path class="cordon" d="${cuerda}"/>`
    + S(k.slabOf(cab, ZC - 2, 4, P, 3, 0.2), { tone: "mid" })
    + `<path class="marca-n" d="${k.onTop([[s * x0, -2], [s * x0, 2]], ZC - 2.4, P)}"/>`));
  return `<g data-parte="${parte}">${o.join("")}</g>`;
}

// Caja con pesas de 1 kg apiladas (se ven tantas como kg)
function caja(m) {
  const o = [S(k.slabOf({ x: -B, y: -B, w: 2 * B, d: 2 * B, r: 0.6 }, ZT + GAP, HB, P, 4, 0.3), { tone: "hi", lit: true })];
  o.push(L(k.planOutline({ x: -B + 1.2, y: -B + 1.2, w: 2 * B - 2.4, d: 2 * B - 2.4, r: 0.4 }, ZT + GAP + HB, P), { tone: "faint" }));
  o.push(E("text", "t-m", { class: "t-m", "text-anchor": "middle" }, m));
  const z0 = ZT + GAP + HB;
  for (let i = 0; i < NP; i++) o.push(E("g", "pesa" + i, {}, m, S(k.cylinder(0, 0, RP, z0 + i * PP, HP, P, 28, 0.15), { tone: i % 2 ? "mid" : "hi" })));
  o.push(S(k.cylinder(0, 0, 0.5, z0, NP * PP + 0.6, P, 10), { tone: "lo", crease: "none" }));
  return `<g data-parte="01">${o.join("")}</g>`;
}

const flecha = (id, cls, parte, m) => E("g", id, { class: `flecha ${cls}`, "data-parte": parte }, m,
  E("line", id + "-l", {}, m) + E("polygon", id + "-p", {}, m) + E("text", id + "-t", { class: "t-vel" }, m));

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
const NETQ = 12;
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
    CLIP, placa(), tablero(m), soplador(),
    `<g data-parte="04">${riel()}${recorte(E("path", "agujeros", { class: "agujeros" }, m))}</g>`,
    `<g data-parte="07">${reglaBase()}${recorte(E("path", "tk-menor", { class: "tk menor" }, m) + E("path", "tk-mayor", { class: "tk mayor" }, m)
      + Array.from({ length: NETQ }, (_, i) => E("text", "tr" + i, { class: "t-regla", "text-anchor": "middle" }, m)).join(""))}</g>`,
    recorte(E("g", "conj", {}, m, dinamometro(-1, m) + caja(m) + dinamometro(1, m))
      + traba(m) + `<g data-parte="10">${E("path", "fantasma", { class: "fantasma" }, m)}</g>`),
    flecha("fl-2", "fl-F", "03", m) + flecha("fl-1", "fl-F", "02", m) + flecha("fl-n", "fl-n", "06", m)
      + E("text", "t-n0", { class: "t-vel t-n0", "text-anchor": "middle", "data-parte": "06" }, m),
    E("text", "fant-t", { class: "t-trampa", "data-parte": "10" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { P, M, X0, X1, XR, SEG, ZT, GAP, B, HB, ZC, NP, SL0, KS, RS, VUELTAS, KF, ZN, ZF, REGLA, TAB, DIAL, SOP, TRABA, VMAX, NETQ, ROT };
const V = J.valoresIniciales;
const estado0 = { F1: V.F1, F2: V.F2, m: V.m, tF: V.t, fase: "listo", tau: 0, t: 0, revelado: false, trampa: false, recorrido: false };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit y vista) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso, ring, onTop, translateAlong, coil };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/leyes-de-newton-2-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/leyes-de-newton-2-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

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
const dinamica = (F1, F2, m) => { const Fn = F1 - F2; return { F1, F2, m, Fn, a: Fn / m, Fmayor: Math.max(F1, F2), Fmenor: Math.min(F1, F2), Fsuma: F1 + F2 }; };
const sentido = (q) => q > 0 ? L.sentidoDerecha : q < 0 ? L.sentidoIzquierda : L.sentidoNinguno;
const SUELTA = 0.35;   // s de pantalla que tarda la traba en hundirse (dibujo, no física)

let F1 = V.F1, F2 = V.F2, m = V.m, tF = V.t, fase = "listo", tau = 0, t = 0;
let revelado = false, trampaOn = false, sel = null, enRecorrido = false;
const Dn = () => dinamica(F1, F2, m);
const pos = (tt) => Dn().a * tt * tt / 2, velo = (tt) => Dn().a * tt;
const mov = () => fase === "acelera" || fase === "pausa";

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#soltar"), bTrampa = $("#trampa"), bExamen = $("#examen"), nota = $("#nota");
const SL = { F1: $("#s-F1"), F2: $("#s-F2"), m: $("#s-m"), t: $("#s-t") };

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo + " · Física · Examen de admisión UNAM";
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#etq-a").textContent = L.aceleracion;
$("#l-F1").innerHTML = CT.F1 + ", F<sub>1</sub>"; $("#l-F2").innerHTML = CT.F2 + ", F<sub>2</sub>";
$("#l-m").textContent = CT.m; $("#l-t").textContent = CT.t;
$("#pred-t").textContent = J.prediccion.titulo;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
for (const q in SL){ SL[q].min = RG[q].min; SL[q].max = RG[q].max; SL[q].step = RG[q].paso; }
stage.setAttribute("aria-valuemin", RG.F1.min); stage.setAttribute("aria-valuemax", RG.F1.max);
stage.setAttribute("aria-label", "Riel: flechas izquierda y derecha cambian F1; con Mayús, F2; arriba y abajo, la masa");

// ---------- Rótulos y fichas ----------
const FICHAS = {
  "01": ["Caja y pesas", () => `Cada disco es 1 kg de la masa total: hay ${num(m)}. Más masa, más inercia: con la misma fuerza neta, el doble de masa acelera la mitad.`],
  "02": ["Dinamómetro F₁", () => `Mide la fuerza hacia la derecha: el resorte se estira hasta la marca de ${num(F1)} N. Un torno fuera de la vista recoge el cordón para que la fuerza no cambie mientras la caja avanza.`],
  "03": ["Dinamómetro F₂", () => `Mide la fuerza hacia la izquierda: ${num(F2)} N. Jala en sentido contrario, así que en la suma entra con signo menos.`],
  "04": ["Riel de aire y traba", () => "El aire sale por los agujeros y levanta la caja: no hay fricción. La traba la sostiene mientras ajustas las fuerzas; al soltar se hunde y solo queda la fuerza neta."],
  "05": ["Soplador", () => "Empuja aire dentro del riel. Por eso en este modelo no hay que restar fricción: las únicas fuerzas horizontales son F₁ y F₂."],
  "06": ["Fuerza neta", () => { const d = Dn(); return d.Fn === 0 ? J.figura.neta0 + ": las fuerzas se cancelan y la caja sigue quieta." : `La suma con signo: ${num(F1)} − ${num(F2)} = ${num(d.Fn)} N, ${sentido(d.Fn)}. Ella, y no la fuerza mayor, decide la aceleración.`; }],
  "07": ["Regla", () => "Metros desde donde se suelta la caja: positivo a la derecha, negativo a la izquierda. Si la caja sale de la vista, la cámara la sigue y la regla se desplaza; la barra de abajo muestra el recorrido completo."],
  "08": ["Cronómetro", () => `Corre desde que se quita la traba y se detiene en t = ${num(tF)} s: ahí se congela la toma, pero la caja no frena. Una vuelta = ${num(RG.t.max)} s.`],
  "09": ["Velocímetro", () => "Cero arriba; la aguja va a la derecha o a la izquierda según el sentido. Su escala crece como raíz para que quepan rapideces chicas y grandes."],
  "10": ["Fantasma (la trampa)", () => { const d = Dn(); return `Acelera con una sola fuerza, la mayor: ${num(d.Fmayor)} ÷ ${num(m)} = ${num(d.Fmayor / m)} m/s². Se adelanta a la caja real porque olvida restar la otra. ` + L.mensaje; }]
};
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
  const f = FICHAS[sel];
  $("#ficha").innerHTML = f ? `<b>${sel} · ${f[0]}.</b> ${f[1]()}` : fichaVacia;
}
C.ROT.forEach(n => {
  const b = document.createElement("button"); b.type = "button"; b.className = "rot-b"; b.dataset.n = n;
  b.setAttribute("aria-pressed", "false"); b.innerHTML = `<b>${n}</b>${FICHAS[n][0]}`;
  b.addEventListener("click", () => seleccionar(n)); $("#rotulos").append(b);
  $("#rot-" + n).addEventListener("click", (e) => { e.stopPropagation(); seleccionar(n); });
});

// ---------- Mensajes ----------
const decir = (s) => { if (!enRecorrido) nota.textContent = s; };

// ---------- Dibujo que cambia: la vista da los atributos; solo se escriben los que cambian ----------
const previo = new Map();
function aplicar(mm){
  for (const id in mm){
    const e = document.getElementById(id); if (!e) continue;
    const v = mm[id];
    for (const q in v){
      const val = q === "_v" ? (v[q] ? "" : "none") : String(v[q]), clave = id + "|" + q;
      if (previo.get(clave) === val) continue; previo.set(clave, val);
      if (q === "_v") e.style.display = val; else if (q === "_t") e.textContent = val; else e.setAttribute(q, val);
    }
  }
}
const estado = () => ({ F1, F2, m, tF, fase, tau, t, revelado, trampa: trampaOn, recorrido: enRecorrido });

function render(){
  const d = Dn(), rv = revelado && !enRecorrido, tt = mov() ? t : 0, x = pos(tt), v = velo(tt);
  aplicar(vista(C, K, estado(), J));
  const n = { F1: num(F1), F2: num(F2), m: num(m), t: num(tF), Fn: num(d.Fn), a: num(d.a), v: num(d.a * tF), x: num(d.a * tF * tF / 2), atrampa: num(d.Fmayor / m) };
  // Panel
  $("#o-a").textContent = rv ? `${num(Math.abs(d.a))} m/s²` : "?";
  $("#o-formula").innerHTML = rv ? (d.Fn === 0 ? J.figura.neta0 : tpl(L.aceleracionValor, n) + " · " + sentido(d.a)) : "Elige tu predicción o suelta la caja para verla.";
  $("#o-F1").textContent = tpl(CT.valorF, {v:n.F1}); $("#o-F2").textContent = tpl(CT.valorF, {v:n.F2});
  $("#o-m").textContent = tpl(CT.valorM, {v:n.m}); $("#o-t").textContent = tpl(CT.valorT, {v:n.t});
  const vals = { F1, F2, m, t: tF };
  for (const q in SL){
    SL[q].style.setProperty("--p", (100 * (vals[q] - RG[q].min) / (RG[q].max - RG[q].min)) + "%");
    if (+SL[q].value !== vals[q]) SL[q].value = vals[q];
  }
  SL.F1.setAttribute("aria-valuetext", tpl(CT.valorF, {v:n.F1}) + `, fuerza neta ${n.Fn} N`);
  SL.F2.setAttribute("aria-valuetext", tpl(CT.valorF, {v:n.F2}) + `, fuerza neta ${n.Fn} N`);
  SL.m.setAttribute("aria-valuetext", tpl(CT.valorM, {v:n.m}));
  SL.t.setAttribute("aria-valuetext", tpl(CT.valorT, {v:n.t}) + (rv ? `, v = ${n.v} m/s, x = ${n.x} m` : ""));
  $("#o-Fn").textContent = `${n.Fn} N`;
  $("#c-v").textContent = `v a los ${n.t} s`; $("#c-x").textContent = `x a los ${n.t} s`;
  $("#o-v").textContent = rv ? `${n.v} m/s` : "?";
  $("#o-x").textContent = rv ? `${n.x} m` : "?";
  const lect = `t ${num(tt, 1)} s · x ${num(x, 1)} m · v ${num(v, 1)} m/s`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", F1);
  stage.setAttribute("aria-valuetext", `F1 = ${n.F1} N, F2 = ${n.F2} N, m = ${n.m} kg` + (mov() ? `, x = ${num(x, 1)} m, v = ${num(v, 1)} m/s` : ""));
  bPri.textContent = fase === "listo" ? CT.soltar : CT.reiniciar;
  // Barra de recorrido: 0 → x (con signo), con la ventana visible y la caja
  const xFin = d.a * tF * tF / 2, sg = Math.sign(rv ? xFin : x) || 1;
  const camM = Math.sign(x) * Math.max(0, Math.abs(x) - C.SEG);
  const fin = rv ? Math.abs(xFin) : Math.max(Math.abs(x), C.XR), escala = Math.max(C.XR, fin);
  const pc = (q) => Math.max(0, Math.min(100, 100 * q / escala)).toFixed(2) + "%";
  const lo = Math.max(0, sg * camM - C.XR), hi = sg * camM + C.XR;
  const ven = $("#mb-ven"); ven.style.left = pc(lo); ven.style.width = pc(Math.min(hi, escala) - lo);
  $("#mb-dot").style.left = pc(Math.max(0, sg * x));
  $("#mb-fin").textContent = rv ? `${num(xFin)} m` : "?";
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.neta, tpl(L.netaValor, n) + ` · ${sentido(d.Fn)}`],
    [L.aceleracion, d.Fn === 0 ? J.figura.neta0 : tpl(L.aceleracionValor, n)],
    [tpl(L.movimiento, n), tpl(L.velocidadValor, n) + "<br>" + tpl(L.posicionValor, n)],
    ["La trampa", tpl(L.trampa, { F1: num(d.Fmayor), m: n.m, atrampa: n.atrampa }) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((q, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${q[0]}</span><span class="va">${q[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento por fases: listo (traba) → suelta → acelera → pausa en t ----------
let anim = 0;
function avanzar(dt){
  if (fase === "suelta"){
    tau = Math.min(1, tau + dt / SUELTA);
    if (tau >= 1){ fase = "acelera"; t = 0; const d = Dn();
      decir(d.Fn === 0 ? J.figura.neta0 + ": las fuerzas se cancelan." : `Sin traba: la fuerza neta, ${num(d.Fn)} N, la acelera ${sentido(d.Fn)}.`); }
    return true;
  }
  if (fase !== "acelera") return false;
  t = Math.min(t + dt, tF);
  if (t >= tF - 1e-9){ t = tF; fase = "pausa"; return false; }
  return true;
}
function terminar(){
  if (enRecorrido || fase !== "pausa") return;
  revelado = true; const d = Dn();
  if (d.Fn === 0) decir(`${J.figura.neta0}. A los ${num(t)} s sigue en x = 0: sin fuerza neta no cambia su velocidad.`);
  else decir(`Pausa en ${num(t)} s: va a ${num(Math.abs(velo(t)))} m/s ${sentido(d.a)} y avanzó ${num(Math.abs(pos(t)))} m. No frena: mientras haya fuerza neta, sigue acelerando.`);
  if (trampaOn){ const aT = (F1 >= F2 ? F1 : -F2) / m;
    nota.textContent += ` El fantasma, con una sola fuerza, iría en x = ${num(aT * t * t / 2)} m. ${L.mensaje}`; }
}
let pendiente = null;   // corrida interrumpida por salir de pantalla: se retoma al volver
function correr(fin = null){
  cancelAnimationFrame(anim); pendiente = { fin };
  if (quieto){ fase = "pausa"; tau = 1; t = tF; pendiente = null; terminar(); render(); if (fin) fin(); return; }
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
    const sigue = avanzar(dt); render();
    if (sigue) anim = requestAnimationFrame(paso); else { anim = 0; pendiente = null; terminar(); render(); if (fin) fin(); }
  };
  render(); anim = requestAnimationFrame(paso);
}
function nuevo(){ cancelAnimationFrame(anim); anim = 0; pendiente = null; fase = "listo"; tau = 0; t = 0; }
function soltar(fin){
  nuevo(); fase = "suelta";
  decir("Se hunde la traba: ya nada sostiene la caja.");
  correr(fin);
}
function principal(){
  if (fase === "listo") soltar();
  else { nuevo(); decir(""); render(); }
}

// ---------- Recorrido automático: mueve los dinamómetros y la masa sin soltar; se detiene al tocar y retoma a los 6 s ----------
const dentroR = (q, v) => v >= RG[q].min && v <= RG[q].max;
const REC = [[V.F1, V.F2, V.m], [V.F2, V.F1, V.m], [V.F1, V.F1, V.m], [V.F1, V.F2, 2 * V.m], [RG.F1.max, V.F2, V.m]]
  .filter(([a, b, c]) => dentroR("F1", a) && dentroR("F2", b) && dentroR("m", c));
let tRec = 0, iRec = 0, animRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  const [a1, a2, am] = REC[iRec % REC.length]; iRec++;
  const b1 = F1, b2 = F2, bm = m, t0 = performance.now(), DUR = 900;
  if (fase !== "listo"){ nuevo(); }
  const paso = (ahora) => {
    if (!enRecorrido) return;
    const u = Math.min(1, (ahora - t0) / DUR), e = u * u * (3 - 2 * u);
    F1 = b1 + (a1 - b1) * e; F2 = b2 + (a2 - b2) * e; m = Math.round(bm + (am - bm) * e);
    render();
    if (u < 1) animRec = requestAnimationFrame(paso);
    else { F1 = a1; F2 = a2; m = am; render(); tRec = setTimeout(pasoRecorrido, 1800); }
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
    F1 = redondea(F1, RG.F1.paso); F2 = redondea(F2, RG.F2.paso); m = redondea(m, RG.m.paso); render();
  }
  clearTimeout(tRec); tRec = setTimeout(iniciarRecorrido, 6000);
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (!visible && enRecorrido) tomarControl(); if (!visible && anim){ cancelAnimationFrame(anim); anim = 0; }
  if (visible && !anim && pendiente && (fase === "suelta" || fase === "acelera")) correr(pendiente.fin); }, {rootMargin:"0px"}).observe(stage);
setTimeout(() => { if (visible) iniciarRecorrido(); else tRec = setTimeout(iniciarRecorrido, 6000); }, 1400);

// ---------- Controles ----------
bPri.addEventListener("click", principal);
bExamen.addEventListener("click", () => {
  nuevo(); F1 = V.F1; F2 = V.F2; m = V.m; tF = V.t;
  if (trampaOn) bTrampa.click();
  decir("De vuelta al ejemplo del examen."); render();
});
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){ revelado = true; const d = Dn(); soltar(); decir(tpl(L.trampa, { F1: num(d.Fmayor), m: num(m), atrampa: num(d.Fmayor / m) }) + "; de verdad, " + num(Math.abs(d.a)) + " m/s². " + L.mensaje); }
  else render();
});
for (const q of ["F1", "F2", "m"]) SL[q].addEventListener("input", () => {
  const v = +SL[q].value; if (q === "F1") F1 = v; else if (q === "F2") F2 = v; else m = v;
  nuevo(); render();
});
SL.t.addEventListener("input", () => {
  tF = +SL.t.value;
  if (fase === "pausa"){ t = tF; terminar(); render(); }       // con la toma congelada, el deslizador recorre el tiempo
  else if (fase === "acelera" && t >= tF){ t = tF; fase = "pausa"; cancelAnimationFrame(anim); anim = 0; terminar(); render(); }
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
  if (dh && e.shiftKey) F2 = lim("F2", F2 + dh * RG.F2.paso);
  else if (dh) F1 = lim("F1", F1 + dh * RG.F1.paso);
  if (dv) m = lim("m", m + dv * RG.m.paso);
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
// Opciones de aceleración (las del paso 1): neta, fuerza mayor, suma sin signo y fuerza menor, ordenadas de menor a mayor
const LETRAS = ["A", "B", "C", "D"];
function opsAcel(d){
  const val = { neta: Math.abs(d.a), mayor: d.Fmayor / d.m, suma: d.Fsuma / d.m, menor: d.Fmenor / d.m };
  const o = { F1: num(d.F1), F2: num(d.F2), m: num(d.m), Fn: num(d.Fn), a: num(d.a), Fmayor: num(d.Fmayor), Fmenor: num(d.Fmenor), Fsuma: num(d.Fsuma) };
  return J.prediccion.opciones.map(q => ({ tipo: q.tipo, v: val[q.tipo], ok: q.tipo === "neta", e: tpl(q.retro, o) }))
    .sort((p, q) => p.v - q.v).map((q, i) => ({ ...q, letra: LETRAS[i], t: `${LETRAS[i]}) ${num(q.v)} m/s²` }));
}
const e0 = dinamica(V.F1, V.F2, V.m), OP0 = opsAcel(e0), letra = (tp) => OP0.find(q => q.tipo === tp).letra;
$("#pred-q").textContent = tpl(J.prediccion.pregunta, { F1: num(V.F1), F2: num(V.F2), m: num(V.m) });
opciones($("#pred-ops"), OP0, () => {
  tomarControl(); revelado = true; F1 = V.F1; F2 = V.F2; m = V.m; tF = V.t;
  if (trampaOn){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
  soltar();
});

// ---------- Los 6 pasos (capa 1) ----------
const n = { F1: num(V.F1), F2: num(V.F2), m: num(V.m), Fn: num(e0.Fn), a: num(e0.a), t: num(V.t), v: num(e0.a * V.t), x: num(e0.a * V.t * V.t / 2),
  amayor: num(e0.Fmayor / V.m), asuma: num(e0.Fsuma / V.m), amenor: num(e0.Fmenor / V.m), Fsuma: num(e0.Fsuma), Fmayor: num(e0.Fmayor), Fmenor: num(e0.Fmenor),
  m2: num(2 * V.m), a2: num(e0.Fn / (2 * V.m)) };
const PASOS = [
  {n:1, titulo:"Pregunta de examen", enunciado:`Sobre un piso sin fricción, una caja de ${n.m} kg se jala hacia la derecha con ${n.F1} N y, al mismo tiempo, hacia la izquierda con ${n.F2} N. ¿Qué aceleración tiene la caja?`, ops:OP0},
  {n:2, titulo:"Idea en una frase", p:["La aceleración la decide la <b>fuerza neta</b> (la suma con signo de todas las fuerzas), no una sola: a = F<sub>neta</sub> ÷ m, y apunta hacia donde apunta la fuerza neta.",
    `En la lámina, la flecha de abajo es la suma de las dos de arriba: ${n.F1} − ${n.F2} = ${n.Fn} N hacia la derecha. Suelta la caja y mira cómo la empuja.`]},
  {n:3, titulo:"Ejemplo resuelto", p:[`Fuerza neta: ${n.F1} − ${n.F2} = <b>${n.Fn} N</b> hacia la derecha.`,
    `Aceleración: a = ${n.Fn} ÷ ${n.m} = <b>${n.a} m/s²</b> hacia la derecha → respuesta ${letra("neta")}.`,
    `Si parte del reposo, a los ${n.t} s lleva v = ${n.a} × ${n.t} = ${n.v} m/s y avanzó x = ½ × ${n.a} × ${n.t}² = ${n.x} m.`]},
  {n:4, titulo:"La trampa", p:[`Usar solo la fuerza más grande da ${n.Fmayor} ÷ ${n.m} = ${n.amayor} m/s², la opción ${letra("mayor")}.`,
    `Las otras también tienen dueño: ${letra("suma")} (${n.asuma} m/s²) suma las fuerzas sin signo (${n.Fsuma} ÷ ${n.m}), y ${letra("menor")} (${n.amenor} m/s²) usa solo la fuerza pequeña (${n.Fmenor} ÷ ${n.m}).`,
    `Pulsa «${CT.trampa}» en la lámina: el fantasma acelera con una sola fuerza y se adelanta; la caja de verdad va más despacio.`]},
  {n:5, titulo:"Truco de examen", p:['Dos pasos, siempre en este orden: primero suma las fuerzas con signo (derecha +, izquierda −), luego divide entre la masa: <span class="formula">a = ΣF ÷ m</span>.',
    `Misma fuerza neta y el doble de masa → la mitad de aceleración: ${n.Fn} ÷ ${n.m2} = ${n.a2} m/s².`]},
  {n:6, titulo:J.prueba.titulo, enunciado:J.prueba.pregunta, ops:J.prueba.opciones.map(o => ({t:`${o.letra}) ${o.texto}`, ok:o.correcta, e:o.retro}))}
];
PASOS.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.p || []).map(t => `<p>${t}</p>`).join("");
  if (p.enunciado){ s.insertAdjacentHTML("beforeend", `<p>${p.enunciado}</p>`); const l = document.createElement("div"); l.className = "opciones"; opciones(l, p.ops); s.append(l); }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});
// Otro intento (capa 2): las fuerzas al revés y el doble de masa
const o2 = dinamica(V.F2, V.F1, 2 * V.m);
$("#otro").innerHTML = `<h3>Otro intento</h3><p>Ahora la caja tiene ${num(o2.m)} kg y se jala con ${num(o2.F1)} N hacia la derecha y ${num(o2.F2)} N hacia la izquierda. ¿Qué aceleración tiene?</p><div class="opciones"></div>`;
opciones($("#otro .opciones"), [
  {t:`A) ${num(Math.abs(o2.a))} m/s² ${sentido(o2.a)}`, ok:true, e:`${num(o2.F1)} − ${num(o2.F2)} = ${num(o2.Fn)} N; a = ${num(o2.Fn)} ÷ ${num(o2.m)} = ${num(o2.a)} m/s²: el signo menos dice «${sentido(o2.a)}».`},
  {t:`B) ${num(Math.abs(o2.a))} m/s² ${sentido(-o2.a)}`, e:"La cuenta está bien, pero el sentido no: la fuerza mayor ahora jala a la izquierda, y hacia allá apunta la neta."},
  {t:`C) ${num(o2.Fmayor / o2.m)} m/s² ${sentido(o2.a)}`, e:`La trampa otra vez: ${num(o2.Fmayor)} ÷ ${num(o2.m)} usa solo la fuerza mayor.`},
  {t:`D) ${num(o2.Fsuma / o2.m)} m/s²`, e:`Sumaste sin signo: ${num(o2.Fsuma)} ÷ ${num(o2.m)}. Las fuerzas son opuestas: se restan.`}
]);

$("#pie").innerHTML = `<i>${J.figura.pie}</i> Modelo: el riel y la regla están en metros a escala; la caja, los dinamómetros y las flechas no (las flechas tienen su propia escala).
 Un torno fuera de la vista recoge cada cordón para que la fuerza no cambie; la traba sostiene la caja mientras ajustas y se hunde al soltar. La caja no frena: la toma se congela (pausa) en el tiempo t del deslizador y, con la toma congelada, el deslizador t recorre el movimiento.
 Si la caja sale de la vista, la cámara la sigue y la regla se desplaza; la barra de abajo muestra el recorrido completo. La animación va en tiempo real (t ≤ ${num(RG.t.max)} s), sin cámara rápida.
 Si nadie toca, la lámina mueve los dinamómetros sola, sin soltar la caja ni mostrar la aceleración. En el celular, «Pantalla completa» la muestra grande (mejor con el teléfono girado) y se acerca con pellizco. Teclas: B suelta o vuelve al inicio; con la lámina enfocada, ← → cambian F<sub>1</sub>, Mayús + ← → cambian F<sub>2</sub> y ↑ ↓ cambian la masa.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#soltar", "#bloque-F1", "#bloque-F2", "#bloque-m", "#bloque-t"].map(s => $(s));
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
window.__newton2 = { set:(o) => { for (const q of ["F1", "F2", "m", "tF"]) if (q in o) ({F1:() => F1 = o.F1, F2:() => F2 = o.F2, m:() => m = o.m, tF:() => tF = o.tF})[q]();
    if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa;
    if ("fase" in o){ fase = o.fase; tau = o.tau ?? 1; t = o.t ?? (fase === "pausa" ? tF : 0); }
    render(); },
  sel:seleccionar, completa:entrar, salir, alto:() => { enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(animRec); cancelAnimationFrame(anim); anim = 0; render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de la primera ley) ----------
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
/* Propio de la segunda ley (también va en el SVG fijo) */
.agujeros{fill:none;stroke:var(--anatomy-lo);stroke-width:1.2;stroke-linecap:round}
.resorte{fill:none;stroke:var(--anatomy-hi);stroke-width:1;stroke-linecap:round} .resorte.atras{stroke:var(--anatomy-mid)}
.cordon{fill:none;stroke:var(--anatomy-mid);stroke-width:.8}
.marca-n{fill:none;stroke:var(--rubrica);stroke-width:1.1}
.aguja{fill:none;stroke:var(--rubrica);stroke-width:1.2;stroke-linecap:round}
.t-dial{font:500 9px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.t-m{font:500 11px var(--serif);fill:var(--anatomy-text);font-variant-numeric:lining-nums tabular-nums}
.tk{fill:none;stroke-width:.6} .tk.menor{stroke:var(--anatomy-lo)} .tk.mayor{stroke:var(--anatomy-mid)}
.t-regla{font:500 9px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.flecha line{stroke:var(--rubrica);stroke-width:2;stroke-linecap:round} .flecha polygon{fill:var(--rubrica)}
.fl-F{opacity:.78} .fl-n line{stroke-width:3.4}
.t-vel{font:500 14px var(--serif);fill:var(--rubrica);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.fl-n .t-vel{font-weight:600;font-size:15px}
.t-n0{font-size:13px}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de la segunda ley */
.chips output{font-size:1.25rem}
.controles .deslizadores{display:grid;gap:12px 18px;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))}
.minibarra{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums;margin-top:-4px}
.mb-pista{position:relative;height:10px;border-radius:5px;background:var(--borde)}
.mb-ven{position:absolute;top:-3px;bottom:-3px;border:1.5px solid var(--suave);border-radius:4px}
.mb-dot{position:absolute;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--acento);box-shadow:0 0 0 2px var(--sup)}
/* Pantalla completa («modo lámina»): figura grande, controles compactos, zoom con pellizco */
.pantalla{display:grid;gap:12px}
.barra-lamina{display:flex;align-items:center;gap:10px;margin-top:-4px}
.barra-lamina .minibarra{flex:1;min-width:0;margin:0}
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
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .modo-lamina .compacto #soltar{grid-column:1/-1}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el del examen, en pausa en t) ----------
function svgFijo() {
  const s = { F1: V.F1, F2: V.F2, m: V.m, tF: V.t, fase: "pausa", tau: 1, t: V.t, revelado: true, trampa: false, recorrido: false };
  const claro = CSS_PRENSA.slice(CSS_PRENSA.indexOf(":root{"), CSS_PRENSA.indexOf("@media (prefers-color-scheme:dark)"))
    .replace(":root{", "svg{").replace(/\s*color-scheme:light;box-sizing:border-box;[\s\S]*?\n\}/, "}");
  const tibio = CSS_PRENSA.slice(CSS_PRENSA.indexOf(".iso{"), CSS_PRENSA.indexOf("@media", CSS_PRENSA.indexOf(".iso{"))).replace(".iso{", "svg.iso{");
  const estilo = `<style>${k.ISO_CSS}${claro}${tibio}svg{background:var(--bg)}${CSS_FIG}</style>`;
  return k.figureSvg({ width: W, height: H, label: J.figura.aria, className: "iso", body: [estilo, ...cuerpo(vista(CFG, k, s, J))] })
    .replace('<svg ', `<svg width="1280" height="${2 * H}" `);
}

const plate = k.plateHtml({
  fig: "Lámina I",
  title: "Segunda ley de Newton",
  hint: J.instruccion,
  readout: "t 0 s · x 0 m · v 0 m/s",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuenow="0">${figura}</div>`,
});
const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Segunda ley de Newton · Códice Vivo</title>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
</head>
<body>
<main class="pagina">
  <header>
    <div class="marca-casa">Códice Vivo · Laboratorio</div>
    <h1 id="titulo">Segunda ley de Newton</h1>
    <p class="sub" id="subtitulo"></p>
  </header>
  <div class="rejilla">
    <div id="pasos-a" class="pasos"></div>
    <section class="tarjeta lab" aria-label="Laboratorio">
      <div class="predice">
        <h3 id="pred-t">Predice antes de soltar</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
        <p class="gira" aria-hidden="true">Gira el teléfono para verla más grande</p>
        <div class="iso escena">${plate}</div>
        <div class="barra-lamina">
          <div class="minibarra" aria-hidden="true"><span>0</span><div class="mb-pista"><div class="mb-ven" id="mb-ven"></div><div class="mb-dot" id="mb-dot"></div></div><span id="mb-fin">?</span></div>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="etq-a"></span>
          <output id="o-a" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-F1">
            <div class="fila"><label for="s-F1" id="l-F1"></label><output id="o-F1"></output></div>
            <input type="range" id="s-F1">
          </div>
          <div id="bloque-F2">
            <div class="fila"><label for="s-F2" id="l-F2"></label><output id="o-F2"></output></div>
            <input type="range" id="s-F2">
          </div>
          <div id="bloque-m">
            <div class="fila"><label for="s-m" id="l-m"></label><output id="o-m"></output></div>
            <input type="range" id="s-m">
          </div>
          <div id="bloque-t">
            <div class="fila"><label for="s-t" id="l-t"></label><output id="o-t"></output></div>
            <input type="range" id="s-t">
          </div>
        </div>
        <div class="chips">
          <div class="chip"><span>Fuerza neta, F₁ − F₂</span><output id="o-Fn"></output></div>
          <div class="chip"><span id="c-v">v</span><output id="o-v"></output></div>
          <div class="chip"><span id="c-x">x</span><output id="o-x"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="soltar" aria-keyshortcuts="b">Soltar</button>
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
<script type="module">${(kitScript() + `\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
