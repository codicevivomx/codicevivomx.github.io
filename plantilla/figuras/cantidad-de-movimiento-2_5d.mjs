// Lámina 2.5D+ de cantidad de movimiento: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/cantidad-de-movimiento-2_5d.mjs                → plantilla/interactivos/cantidad-de-movimiento/plus/index.html
//                                                                         y contenido/fisica/img/cantidad-de-movimiento.svg (figura fija para PDF y video)
//   node plantilla/figuras/cantidad-de-movimiento-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de Arquímedes (plantilla/figuras/principio-de-arquimedes-2_5d.mjs): misma página (CSS_PRENSA), pantalla completa,
// evaluador de fórmulas y salida .svg; el riel de aire y el soplador vienen de leyes-de-newton-2. Otro dibujo (riel con lanzador,
// dos carritos con pesas, unión de velcro o de resortes, regla y tablero de p y K) y otra lógica (el choque en el tiempo).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "cantidad-de-movimiento";
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
// Variables de entrada: masas, velocidad del carrito 1 (el 2 parte con v2 del JSON), duración del contacto y la pelota de la prueba.
// La raíz (vK = √vK2, velocidad si se conservara la energía) va aquí; el evaluador solo hace + − × ÷.
function calc(J, m1, m2, v1) {
  const V0 = J.valoresIniciales;
  const v = { m1, m2, v1, v2: V0.v2, dt: V0.dt, mb: V0.mb, vb: V0.vb };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  v.vK = Math.sqrt(Math.max(0, v.vK2));
  return v;
}
// El choque en el tiempo t (s de física desde el lanzamiento): posiciones de los centros (m), velocidades (m/s) y compresión del resorte.
// Antes: el 1 avanza a v1 y el 2 sigue con v2. Velcro: al tocarse quedan pegados a vf (choque instantáneo).
// Resortes: el contacto dura dt; el centro de masa sigue a vf, el resorte se comprime y las velocidades pasan de las de antes
// a v1e y v2e con el perfil de un impulso senoidal; después cada uno sigue con la suya.
// Termina cuando un carrito llega al tope derecho o el 1 regresa a su salida (ahí está el lanzador): la figura se congela.
function mover(J, d, union, t) {
  const ES = J.escena, Lc = ES.largoCarrito, sal = ES.saliente[union], Dc = Lc + sal[0] + sal[1];
  const M = d.m1 + d.m2, A = Math.min(ES.compresion, sal[0] * 0.8);
  const tc = (ES.x2 - ES.x1 - Dc) / (d.v1 - d.v2);
  const x1c = ES.x1 + d.v1 * tc, x2c = ES.x2 + d.v2 * tc, xcm = (d.m1 * x1c + d.m2 * x2c) / M;
  const res = union === "resortes", T = res ? d.dt : 0;
  const ini = res ? { t: tc + T, x1: xcm + d.vf * T - d.m2 / M * Dc, x2: xcm + d.vf * T + d.m1 / M * Dc, u1: d.v1e, u2: d.v2e }
    : { t: tc, x1: x1c, x2: x2c, u1: d.vf, u2: d.vf };
  const xmax = ES.largoRiel - Lc / 2 - 0.02, xmin = ES.x1;
  const fin = [];
  if (ini.u2 > 1e-9) fin.push((xmax - ini.x2) / ini.u2);
  if (ini.u1 < -1e-9) fin.push((xmin - ini.x1) / ini.u1);
  const tFin = ini.t + Math.max(0, fin.length ? Math.min(...fin) : 1);
  const tt = Math.min(Math.max(t, 0), tFin);
  let r;
  if (tt <= tc) r = { x1: ES.x1 + d.v1 * tt, x2: ES.x2 + d.v2 * tt, u1: d.v1, u2: d.v2, comp: 0, fase: "antes" };
  else if (tt < ini.t) {
    const f = (tt - tc) / T, s = Math.sin(Math.PI * f), c = (1 - Math.cos(Math.PI * f)) / 2, g = Dc - A * s, x0 = xcm + d.vf * (tt - tc);
    r = { x1: x0 - d.m2 / M * g, x2: x0 + d.m1 / M * g, u1: d.v1 + (d.v1e - d.v1) * c, u2: d.v2 + (d.v2e - d.v2) * c, comp: A * s, fase: "contacto" };
  } else r = { x1: ini.x1 + ini.u1 * (tt - ini.t), x2: ini.x2 + ini.u2 * (tt - ini.t), u1: ini.u1, u2: ini.u2, comp: 0, fase: "despues" };
  r.tc = tc; r.tFin = tFin; r.fin = t >= tFin; r.Dc = Dc; r.xc = (x1c + x2c) / 2;
  return r;
}

// ---------- Modelo del dibujo (unidades del mundo; 50 por metro; z hacia arriba; el riel va por y = 0; el frente es +y) ----------
// El riel, los carritos (largo) y la regla están a escala; las pesas, el lanzador, el soplador, el tablero y las flechas no.
const VI = J.valoresIniciales, RG = J.rangos, ES = J.escena;
const M = 50;                                     // unidades por metro
const LR = ES.largoRiel * M, LC = ES.largoCarrito * M;
const ZT = 6, GAP = 0.4, HC = 3;                  // alto del riel, colchón de aire y alto del cuerpo del carrito
const ZC = ZT + GAP + HC / 2;                     // altura de las uniones
const RIEL = { x: 0, y: -4, w: LR, d: 8, r: 0.6 };
const NP = Math.round(Math.max(RG.m1.max, RG.m2.max) / ES.masaPesa), RP = 2.3, HP = 0.62, PP = 0.7;   // pesas de masaPesa kg apiladas
const ZTOP = ZT + GAP + HC + NP * PP;             // tope de la pila más alta
const ZA = ZTOP + 3.2, DZA = 5.2;                 // alturas de las flechas de p (carrito 1 y 2)
const KP = 2.4;                                   // flechas: unidades por kg·m/s (las dos a la misma escala)
const LAN = { x: 0.6, w: 3.2 };                   // lanzador: bloque sobre el riel
const XH0 = (ES.x1 - ES.largoCarrito / 2) * M - 0.15;   // cabeza del lanzador en reposo (toca la cola del carrito 1)
const JMAX = 0.06;                                // m que se puede jalar el carrito 1 contra el lanzador
const REGLA = { y0: 6.5, y1: 10.5, z: 0.8 };
const PLACA = { x: -8, y: -19, w: LR + 50, d: 37, r: 5 }, PLACA_H = 4, PATA_H = 4;
const SOP = { x: 6, y: -16, w: 12, d: 7, r: 1, h: 5 };
const TB = { x: LR + 7, y: -9, w: 31, d: 9, r: 1, h: 2, HB: 20, bw: 3.4 };   // tablero de barras (HB = alto de la barra llena)
const XB = [TB.x + 4, TB.x + 9, TB.x + 19.5, TB.x + 24.5];                    // barras: p antes, p ahora, K antes, K ahora
const YB = TB.y + TB.d / 2 - TB.bw / 2;

const W = 640, H = 330;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [0, 0, ZA + DZA + 9], [LR, 0, ZA + DZA + 9], [TB.x, TB.y, TB.h + TB.HB + 8], [TB.x + TB.w, TB.y, TB.h + TB.HB + 8]],
  W, H, { pad: 10, azimuth: 76, elevation: 26 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const AX = (() => { const a = at([0, 0, 0]), b = at([1, 0, 0]); return [b[0] - a[0], b[1] - a[1]]; })();   // un metro… de unidad x en pantalla

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
function vista(C, K, s, J) {
  const P = C.P, ES = J.escena;
  const num = (v, dec = 2) => {
    const r = Math.round(v * 10 ** dec) / 10 ** dec;
    let [i, d] = Math.abs(r).toFixed(dec).split(".");
    d = (d || "").replace(/0+$/, "");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
  };
  const tpl = (t, o) => t.replace(/\{(\w+)\}/g, (m, q) => (q in o ? o[q] : m));
  const txt = (h) => h.replace(/<sub>(.*?)<\/sub>/g, (m, a) => a.split("").map(c => "₀₁₂₃₄₅₆₇₈₉"["0123456789".indexOf(c)] || c).join("")).replace(/<[^>]+>/g, "");
  const iso = (p) => K.iso(p, P);
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  const d = calc(J, s.m1, s.m2, s.v1), rv = s.revelado;
  const listo = s.t < 0;
  const mv = listo ? { x1: ES.x1 - s.jalon, x2: ES.x2, u1: 0, u2: d.v2, comp: 0, fase: "listo", tc: 0 } : mover(J, d, s.union, s.t);
  const tras = mv.fase === "contacto" || mv.fase === "despues";
  const oc = (x) => (rv || !tras ? x : "?");
  const m = {};

  // Carritos: se trasladan a lo largo del riel; se ven tantas pesas como masa
  const u1 = mv.x1 * C.M, u2 = mv.x2 * C.M;
  m["car1"] = { transform: K.translateAlong(P, [u1, 0, 0]) };
  m["car2"] = { transform: K.translateAlong(P, [u2, 0, 0]) };
  for (let i = 0; i < C.NP; i++) { m["pa" + i] = { _v: i < Math.round(s.m1 / ES.masaPesa) }; m["pb" + i] = { _v: i < Math.round(s.m2 / ES.masaPesa) }; }
  const vel = s.union === "velcro";
  m["u-vel1"] = { _v: vel }; m["u-vel2"] = { _v: vel }; m["u-res"] = { _v: !vel }; m["u-pla"] = { _v: !vel };
  // Resorte del carrito 1 (coordenadas del carrito): de su cara delantera a la placa, acortado por la compresión
  const xr0 = C.LC / 2, xr1 = xr0 + (ES.saliente.resortes[0] - mv.comp) * C.M;
  const co = K.coil(xr0, xr1 - 0.25, [0, C.ZC], 0.9, 5, "x", P);
  m["res-a"] = { d: co.back }; m["res-b"] = { d: co.front };
  m["res-pl"] = { transform: K.translateAlong(P, [xr1 - (xr0 + ES.saliente.resortes[0] * C.M), 0, 0]) };
  // Etiquetas de masa y velocidad bajo cada carrito
  const c1 = iso([u1 + C.LC / 2 - 1, C.REGLA.y1, 0]), c2 = iso([u2 - C.LC / 2 + 1, C.REGLA.y1, 0]);
  c1[1] += 22; c2[1] += 22;
  const vtx = (u, conocido) => conocido ? tpl(J.figura.carrito, { m: num(u.m), v: num(u.v) }) : tpl(J.figura.carritoInc, { m: num(u.m) });
  m["t-c1"] = { "text-anchor": "end", x: c1[0].toFixed(1), y: c1[1].toFixed(1), _t: vtx({ m: s.m1, v: mv.u1 }, rv || !tras) };
  m["t-c2"] = { "text-anchor": "start", x: c2[0].toFixed(1), y: c2[1].toFixed(1), _t: vtx({ m: s.m2, v: mv.u2 }, rv || !tras) };

  // Lanzador: la cabeza sigue al carrito mientras se jala; suelto, regresa a su lugar
  const xh = listo ? C.XH0 - s.jalon * C.M : C.XH0;
  const cl = K.coil(C.LAN.x + C.LAN.w, xh - 0.5, [0, C.ZC], 1.1, 6, "x", P);
  m["lan-a"] = { d: cl.back }; m["lan-b"] = { d: cl.front };
  m["lan-h"] = { transform: K.translateAlong(P, [xh - C.XH0, 0, 0]) };

  // Flechas de p (misma escala para las dos): desde el centro de cada carrito
  const flecha = (id, p0, p1, texto, ver, lado = "c") => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    if (!ver || l < 2) { m[id] = { _v: false }; return; }
    const ux = dx / l, uy = dy / l, cab = Math.min(7, l * 0.6), an = cab * 0.5, bx = p1[0] - ux * cab, by = p1[1] - uy * cab;
    m[id] = { _v: true };
    m[id + "-l"] = { x1: p0[0].toFixed(1), y1: p0[1].toFixed(1), x2: (bx + ux).toFixed(1), y2: (by + uy).toFixed(1) };
    m[id + "-p"] = { points: `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${(bx - uy * an).toFixed(1)},${(by + ux * an).toFixed(1)} ${(bx + uy * an).toFixed(1)},${(by - ux * an).toFixed(1)}` };
    const der = dx > 0;
    m[id + "-t"] = lado === "c" ? { x: ((p0[0] + p1[0]) / 2).toFixed(1), y: (Math.min(p0[1], p1[1]) - 6).toFixed(1), "text-anchor": "middle", _t: texto }
      : lado === "der" ? { x: (p1[0] + (der ? 6 : -6)).toFixed(1), y: (p1[1] + 4).toFixed(1), "text-anchor": der ? "start" : "end", _t: texto }
      : { x: (p0[0] + (der ? -6 : 6)).toFixed(1), y: (p0[1] + 4).toFixed(1), "text-anchor": der ? "end" : "start", _t: texto };
  };
  const p1 = s.m1 * mv.u1, p2 = s.m2 * mv.u2;
  const z1 = C.ZA, z2 = C.ZA + C.DZA;
  flecha("fl-1", iso([u1, 0, z1]), iso([u1 + C.KP * p1, 0, z1]), txt(tpl(J.figura.p1, { p1: oc(num(p1)) })), !listo && Math.abs(p1) > 0.02, "izq");
  flecha("fl-2", iso([u2, 0, z2]), iso([u2 + C.KP * p2, 0, z2]), txt(tpl(J.figura.p2, { p2: oc(num(p2)) })), !listo && Math.abs(p2) > 0.02, "der");
  m["ple-1"] = { _v: !listo && Math.abs(p1) > 0.02, d: "M" + pt(iso([u1, 0, C.ZT + C.GAP + C.HC])) + "L" + pt(iso([u1, 0, z1])) };
  m["ple-2"] = { _v: !listo && Math.abs(p2) > 0.02, d: "M" + pt(iso([u2, 0, C.ZT + C.GAP + C.HC])) + "L" + pt(iso([u2, 0, z2])) };

  // Impulso: durante el contacto (o justo al pegarse) cada carrito empuja al otro, misma fuerza y sentido contrario
  const xj = (mv.x1 + mv.x2) / 2 * C.M, jv = mv.fase === "contacto" || (vel && tras && s.t - mv.tc < 0.06);
  const jl = 7;
  flecha("fl-j2", iso([xj, -6, C.ZC]), iso([xj + jl, -6, C.ZC]), "J", jv);
  flecha("fl-j1", iso([xj, -6, C.ZC]), iso([xj - jl, -6, C.ZC]), "−J", jv);

  // Trampa: silueta punteada de los dos pegados si se conservara la energía (sale del punto del choque a vK)
  const ft = !!s.trampa && vel && tras;
  if (ft) {
    const xg = Math.min(mv.xc + d.vK * (s.t - mv.tc), ES.largoRiel - ES.largoCarrito - 0.02) * C.M, half = mv.Dc * C.M / 2 + C.LC / 2;
    const sl = K.slabOf({ x: xg - half, y: -4.8, w: 2 * half, d: 9.6, r: 0.5 }, C.ZT + C.GAP, C.HC + 3, P, 3);
    m["fant"] = { _v: true, d: sl.outline };
    const pf = iso([2, -4, C.ZA + C.DZA + 7]);
    m["fant-t"] = { _v: true, x: pf[0].toFixed(1), y: pf[1].toFixed(1) };
    m["fant-1"] = { x: pf[0].toFixed(1), _t: txt(tpl(J.trampa.fantasma, { vK2: num(d.vK2), vK: num(d.vK) })) };
    m["fant-2"] = { x: pf[0].toFixed(1), _t: txt(tpl(J.trampa.real, { vf: oc(num(d.vf)) })) };
  } else { m["fant"] = { _v: false }; m["fant-t"] = { _v: false }; }

  // Tablero: barras a escala de p y K, «antes» (lo que lleva el carrito 1 al salir) y «ahora»
  const pAh = listo ? 0 : p1 + p2, kAh = listo ? 0 : s.m1 * mv.u1 * mv.u1 / 2 + s.m2 * mv.u2 * mv.u2 / 2;
  const barra = (id, x, val, max, oculto) => {
    const h = C.TB.HB * Math.max(0, Math.min(1, val / max));
    if (h < 0.05) { m[id] = { _v: false }; } else {
      const b = K.slabOf({ x, y: C.YB, w: C.TB.bw, d: C.TB.bw, r: 0.3 }, C.TB.h, h, P, 3);
      m[id] = { _v: true }; m[id + "-f"] = { d: b.fill }; m[id + "-t"] = { d: b.top }; m[id + "-e"] = { d: b.outline };
      for (let i = 0; i < 4; i++) m[id + "-s" + i] = { d: b.shades[i] || "" };
    }
    const q = iso([x + C.TB.bw / 2, C.YB, C.TB.h + h + 1.2]);
    m["t-" + id] = { x: q[0].toFixed(1), y: (q[1] - 2).toFixed(1), _t: oculto ? "?" : tpl(J.figura.barra, { x: num(val) }) };
  };
  barra("b-pa", C.XB[0], d.p0, ES.pMax, false);
  barra("b-pb", C.XB[1], pAh, ES.pMax, tras && !rv);
  barra("b-ka", C.XB[2], d.K0, ES.kMax, false);
  barra("b-kb", C.XB[3], kAh, ES.kMax, tras && !rv);
  const hk = C.TB.HB * Math.min(1, d.K0 / ES.kMax);
  m["b-kf"] = ft ? { _v: true, d: K.slabOf({ x: C.XB[3], y: C.YB, w: C.TB.bw, d: C.TB.bw, r: 0.3 }, C.TB.h, hk, P, 3).outline } : { _v: false };

  // Rótulos
  const rot = (nn, p, ver = true) => { m["rot-" + nn] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  rot("01", mas(iso([C.LR * 0.12, 4, C.ZT - 1.5]), -6, 14));
  rot("02", mas(iso([C.SOP.x + C.SOP.w / 2, C.SOP.y, C.SOP.h + 3]), 0, -12));
  rot("03", mas(iso([C.LR, C.REGLA.y1, 0]), 14, 6));
  rot("04", mas(iso([u1 - C.LC / 2, 4.8, C.ZT + C.GAP + C.HC]), -14, -2));
  rot("05", mas(iso([u2 + C.LC / 2, 4.8, C.ZT + C.GAP + C.HC]), 14, -2));
  rot("06", mas(iso([(u1 + u2) / 2, 4.8, C.ZT - 2]), 0, 11));
  rot("07", mas(iso([u1 + C.KP * p1 / 2, 0, z1]), 0, 11), !listo && Math.abs(p1) > 0.02);
  rot("08", mas(iso([C.TB.x + C.TB.w, C.TB.y + C.TB.d, C.TB.h]), 12, 4));
  rot("09", mas(iso([2, -4, C.ZA + C.DZA + 7]), -14, -4), ft);
  rot("10", mas(iso([xj, -6, C.ZC]), 0, -14), jv);
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
  const pl = { x: LR + 4, y: PLACA.y + PLACA.d - 3.6, w: 36, d: 2.4, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 2.4, pl.y + 1.8], 0.4, P, "x"), J.figura.placa, { size: 1.5, tone: "lo" }));
  o.push(D([at([pl.x + 1.2, pl.y + 1.2, 0.4]), at([pl.x + pl.w - 1.2, pl.y + 1.2, 0.4])], { size: 0.4 }));
  return o.join("");
}

// Riel de aire: perfil largo sobre dos pies, con hilera de agujeros, topes en los extremos y el lanzador a la izquierda
function riel() {
  const o = [];
  for (const x of [LR * 0.12, LR * 0.88]) o.push(S(k.slabOf({ x: x - 3, y: -5.5, w: 6, d: 11, r: 0.6 }, 0, 2.4, P, 3, 0.2), { tone: "lo" }));
  o.push(S(k.slabOf(RIEL, 2.4, ZT - 2.4, P, 4, 0.3), { tone: "mid" }));
  o.push(L(k.lineOnTop([1, -3.2], [LR - 1, -3.2], ZT, P) + k.lineOnTop([1, 3.2], [LR - 1, 3.2], ZT, P), { tone: "faint" }));
  let ag = "";
  for (let x = 2.5; x < LR - 1.5; x += 2.5) for (const y of [-1.6, 1.6]) ag += `M${at([x + (y > 0 ? 1.25 : 0), y, ZT]).map(v => v.toFixed(1)).join(" ")}h.01`;
  o.push(`<path class="agujeros" d="${ag}"/>`);
  // Tope derecho con goma
  o.push(S(k.slabOf({ x: LR - 2.4, y: -3.4, w: 2.4, d: 6.8, r: 0.4 }, ZT, 4.2, P, 3, 0.2), { tone: "mid" }));
  o.push(S(k.slabOf({ x: LR - 3.2, y: -2, w: 0.8, d: 4, r: 0.3 }, ZC - 1.4, 2.8, P, 3), { tone: "lo", crease: "none" }));
  return `<g data-parte="01">${o.join("")}</g>`;
}
function lanzador(m) {
  const o = [S(k.slabOf({ x: LAN.x, y: -3.4, w: LAN.w, d: 6.8, r: 0.4 }, ZT, 4.6, P, 3, 0.2), { tone: "mid" })];
  o.push(S(k.cylinder(LAN.x + LAN.w / 2, 0, 0.9, ZT + 4.6, 0.8, P, 16, 0.15), { tone: "hi" }));
  o.push(L(k.knurl(LAN.x + LAN.w / 2, 0, 0.9, ZT + 4.7, ZT + 5.3, 10, P), { tone: "lo" }));
  o.push(E("path", "lan-a", { class: "resorte atras" }, m) + E("path", "lan-b", { class: "resorte" }, m));
  o.push(E("g", "lan-h", {}, m, S(k.slabOf({ x: XH0 - 0.6, y: -1.8, w: 0.6, d: 3.6, r: 0.3 }, ZC - 1.8, 3.6, P, 3), { tone: "hi" })));
  return `<g data-parte="02">${o.join("")}</g>`;
}
// Soplador: caja con motor moleteado y manguera que entra por detrás del riel (de leyes-de-newton-2)
function soplador() {
  const o = [];
  o.push(S(k.slabOf({ x: SOP.x + SOP.w / 2 - 1.2, y: SOP.y + SOP.d, w: 2.4, d: RIEL.y - SOP.y - SOP.d, r: 0.3 }, 3, 2, P, 3), { tone: "lo", crease: "none" }));
  o.push(S(k.slabOf(SOP, 0, SOP.h, P, 4, 0.3), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(SOP, 1.2), SOP.h, P), { tone: "lo" }));
  const cx = SOP.x + SOP.w / 2, cy = SOP.y + SOP.d / 2;
  o.push(S(k.cylinder(cx, cy, 2.6, SOP.h, 1.6, P, 32, 0.2), { tone: "hi" }));
  o.push(L(k.knurl(cx, cy, 2.6, SOP.h + 0.2, SOP.h + 1.4, 18, P), { tone: "lo" }));
  o.push(L(k.ring(cx, cy, 1.2, SOP.h + 1.6, P, 20), { tone: "lo" }));
  o.push(k.faceTextSvg(k.topMatrix([SOP.x + 1.4, SOP.y + SOP.d - 2.2], SOP.h, P, "x"), "AIRE", { size: 1.4, tone: "lo" }));
  return `<g data-parte="02">${o.join("")}</g>`;
}
// Regla al frente: marcas cada marcasRiel m, etiquetas en etiquetasRiel (a escala)
function regla() {
  const o = [S(k.slabOf({ x: 0, y: REGLA.y0, w: LR, d: REGLA.y1 - REGLA.y0, r: 0.6 }, 0, REGLA.z, P, 3), { tone: "hi", crease: "none" })];
  let tM = "", tm = "", et = "";
  const n = Math.round(ES.largoRiel / ES.marcasRiel);
  for (let i = 0; i <= n; i++) {
    const xm = i * ES.marcasRiel, u = xm * M, mayor = ES.etiquetasRiel.some(e => Math.abs(e - xm) < 1e-9);
    const dd = k.onTop([[u, REGLA.y0], [u, REGLA.y0 + (mayor ? 2.4 : 1.2)]], REGLA.z, P);
    if (mayor) { tM += dd; const q = at([u, REGLA.y1, REGLA.z]); et += `<text class="t-regla" text-anchor="middle" x="${q[0].toFixed(1)}" y="${(q[1] + 9).toFixed(1)}">${String(xm).replace(".", ".")}${xm === ES.etiquetasRiel[ES.etiquetasRiel.length - 1] ? " m" : ""}</text>`; }
    else tm += dd;
  }
  o.push(`<path class="tk menor" d="${tm}"/><path class="tk mayor" d="${tM}"/>` + et);
  return `<g data-parte="03">${o.join("")}</g>`;
}
// Tablero: base con cuatro barras (las mueve la vista), escala grabada y nombres
function tablero(m) {
  const o = [S(k.slabOf(TB, 0, TB.h, P, 4, 0.2), { tone: "mid" })];
  const fondo = { x: TB.x + 1, y: TB.y, w: TB.w - 2, d: 1, r: 0.3 };
  o.push(S(k.slabOf(fondo, TB.h, TB.HB + 2, P, 3), { tone: "lo", crease: "none" }));
  // Rayas de escala sobre el frente del fondo (cada pPaso y kPaso)
  let tk = "";
  const yf = TB.y + 1.02;
  const rayas = (x0, x1, max, paso) => { for (let v = 0; v <= max + 1e-9; v += paso) { const z = TB.h + TB.HB * v / max; tk += k.segment([x0, yf, z], [x1, yf, z], P); } };
  rayas(XB[0] - 1.2, XB[1] + TB.bw + 1.2, ES.pMax, ES.pPaso);
  rayas(XB[2] - 1.2, XB[3] + TB.bw + 1.2, ES.kMax, ES.kPaso);
  o.push(`<path class="tk menor" d="${tk}"/>`);
  const barra = (id, cls) => `<g class="iso-solid ${cls}">` + E("path", id + "-f", { class: "iso-fill" }, m)
    + [0, 1, 2, 3].map((i) => E("path", id + "-s" + i, { class: "iso-shade", "data-shade": i }, m)).join("")
    + E("path", id + "-t", { class: "iso-top" }, m) + E("path", id + "-e", { class: "iso-line iso-edge", "data-tone": "lo" }, m) + `</g>`;
  o.push(E("g", "b-pa", {}, m, barra("b-pa", "barra-p antes")), E("g", "b-pb", {}, m, barra("b-pb", "barra-p")));
  o.push(E("g", "b-ka", {}, m, barra("b-ka", "barra-k antes")), E("g", "b-kb", {}, m, barra("b-kb", "barra-k")));
  o.push(E("path", "b-kf", { class: "fantasma", "data-parte": "09" }, m));
  for (const id of ["b-pa", "b-pb", "b-ka", "b-kb"]) o.push(E("text", "t-" + id, { class: "t-barra", "text-anchor": "middle" }, m));
  // Nombres grabados al frente de la base
  const nom = (x, t, sz = 1.25) => k.faceTextSvg(k.sideMatrix([x, TB.y + TB.d + 0.02], TB.h - 0.4, P, "left"), t, { size: sz, tone: "lo" });
  o.push(nom(XB[0] - 0.6, J.figura.antes, 1.05), nom(XB[1] + 0.4, J.figura.ahora, 1.05), nom(XB[2] - 0.6, J.figura.antes, 1.05), nom(XB[3] + 0.4, J.figura.ahora, 1.05));
  const q1 = at([(XB[0] + XB[1] + TB.bw) / 2, TB.y, TB.h + TB.HB + 6.5]), q2 = at([(XB[2] + XB[3] + TB.bw) / 2, TB.y, TB.h + TB.HB + 6.5]);
  o.push(`<text class="t-tablero" text-anchor="middle" x="${q1[0].toFixed(1)}" y="${q1[1].toFixed(1)}">${esc(J.figura.tableroP)}</text>`);
  o.push(`<text class="t-tablero" text-anchor="middle" x="${q2[0].toFixed(1)}" y="${q2[1].toFixed(1)}">${esc(J.figura.tableroK)}</text>`);
  return `<g data-parte="08">${o.join("")}</g>`;
}

// Carrito (dibujado con su centro en x = 0; la vista lo traslada): cuerpo en U invertida que abraza el riel, pesas y su unión
function carrito(n, m) {
  const o = [];
  const cuerpo = { x: -LC / 2, y: -4.8, w: LC, d: 9.6, r: 0.5 };
  for (const y of [-4.8, 4.0]) o.push(S(k.slabOf({ x: -LC / 2 + 0.3, y, w: LC - 0.6, d: 0.8, r: 0.2 }, ZT - 2.2, 2.2 + GAP, P, 3), { tone: "lo", crease: "none" }));
  o.push(S(k.slabOf(cuerpo, ZT + GAP, HC, P, 4, 0.3), { tone: "hi", lit: n === 1 }));
  o.push(L(k.planOutline(k.insetPlan(cuerpo, 1), ZT + GAP + HC, P), { tone: "faint" }));
  o.push(k.faceTextSvg(k.sideMatrix([-1.2, 4.82], ZT + GAP + 2.3, P, "left"), String(n), { size: 1.7, tone: "mid" }));
  const z0 = ZT + GAP + HC;
  for (let i = 0; i < NP; i++) o.push(E("g", (n === 1 ? "pa" : "pb") + i, {}, m, S(k.cylinder(0, 0, RP, z0 + i * PP, HP, P, 28, 0.15), { tone: i % 2 ? "mid" : "hi" })));
  o.push(S(k.cylinder(0, 0, 0.45, z0, NP * PP + 0.5, P, 10), { tone: "lo", crease: "none" }));
  const pad = (x0) => S(k.slabOf({ x: x0, y: -2.2, w: ES.saliente.velcro[0] * M, d: 4.4, r: 0.1 }, ZC - 1.3, 2.6, P, 2), { tone: "lo", className: "velcro", crease: "none" });
  const u = [];
  if (n === 1) {
    u.push(E("g", "u-vel1", {}, m, pad(LC / 2)));
    const xp = LC / 2 + ES.saliente.resortes[0] * M;
    u.push(E("g", "u-res", {}, m, E("path", "res-a", { class: "resorte atras" }, m) + E("path", "res-b", { class: "resorte" }, m)
      + E("g", "res-pl", {}, m, S(k.slabOf({ x: xp - 0.3, y: -1.6, w: 0.3, d: 3.2, r: 0.15 }, ZC - 1.6, 3.2, P, 2), { tone: "mid", crease: "none" }))));
  } else {
    u.push(E("g", "u-vel2", {}, m, pad(-LC / 2 - ES.saliente.velcro[1] * M)));
    u.push(E("g", "u-pla", {}, m, S(k.slabOf({ x: -LC / 2 - ES.saliente.resortes[1] * M, y: -2.2, w: ES.saliente.resortes[1] * M, d: 4.4, r: 0.1 }, ZC - 1.6, 3.2, P, 2), { tone: "mid", crease: "none" })));
  }
  return E("g", "car" + n, { class: n === 1 ? "arrastre" : "", "data-parte": n === 1 ? "04" : "05" }, m, o.join("") + `<g data-parte="06">${u.join("")}</g>`);
}

const flecha = (id, cls, parte, m) => E("g", id, { class: `flecha ${cls}`, "data-parte": parte }, m,
  E("line", id + "-l", {}, m) + E("polygon", id + "-p", {}, m) + E("text", id + "-t", { class: "t-vel" }, m));

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function E(tag, id, attrs, m, inner = "") {
  const v = (m && m[id]) || {}, a = { id, ...attrs };
  for (const [q, x] of Object.entries(v)) if (q[0] !== "_") a[q] = x;
  if (v._v === false) a.style = "display:none";
  const txt = "_t" in v ? esc(v._t) : inner;
  return `<${tag}${Object.entries(a).map(([q, x]) => ` ${q}="${esc(x)}"`).join("")}>${txt}</${tag}>`;
}
// El carrito más cercano a la cámara se dibuja después
const CERCA_DER = prof([1, 0]) > prof([0, 0]);
function cuerpo(m) {
  const cars = CERCA_DER ? [carrito(1, m), carrito(2, m)] : [carrito(2, m), carrito(1, m)];
  return [
    placa(), tablero(m), soplador(), riel(), lanzador(m),
    E("path", "ple-1", { class: "plomo", "data-parte": "07" }, m), E("path", "ple-2", { class: "plomo", "data-parte": "07" }, m),
    ...cars, regla(),
    E("path", "fant", { class: "fantasma", "data-parte": "09" }, m),
    E("text", "t-c1", { class: "t-car", "data-parte": "04" }, m), E("text", "t-c2", { class: "t-car", "data-parte": "05" }, m),
    flecha("fl-j1", "fl-j", "10", m), flecha("fl-j2", "fl-j", "10", m),
    flecha("fl-1", "fl-F", "07", m), flecha("fl-2", "fl-F", "07", m),
    E("text", "fant-t", { class: "t-trampa", "text-anchor": "start", "data-parte": "09" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { P, W, H, M, LR, LC, ZT, GAP, HC, ZC, NP, ZA, DZA, KP, LAN, XH0, JMAX, REGLA, SOP, TB, XB, YB, AX, ROT };
const estado0 = { m1: VI.m1, m2: VI.m2, v1: VI.v1, union: "velcro", t: -1, jalon: 0, revelado: false, trampa: false };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, vista, calc y mover) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso, coil, translateAlong, slabOf };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/cantidad-de-movimiento-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/cantidad-de-movimiento-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles, ES = J.escena;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const LENTO = ES.lentitud;   // la animación va LENTO veces más lenta que la física

let m1 = V.m1, m2 = V.m2, v1 = V.v1, union = "velcro", t = -1, jalon = 0;
let revelado = false, trampaOn = false, sel = null, selRec = false, enRecorrido = false;
const nombreUnion = () => J.figura.uniones[union];
const numeros = () => {
  const d = calc(J, m1, m2, v1), o = {};
  for (const q in d) o[q] = num(d[q]);
  o.pctPerd = num(d.pctPerd, 1); o.union = nombreUnion(); o.marcasRiel = num(ES.marcasRiel);
  o.vKtxt = Math.abs(d.vK2 - Math.round(d.vK2)) < 1e-9 && Math.abs(d.vK - Math.round(d.vK)) > 1e-9 ? "√" + num(d.vK2) : "≈ " + num(d.vK);
  return o;
};

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#lanzar"), bUnion = $("#union"), bTrampa = $("#trampa"), bExamen = $("#examen"), nota = $("#nota");
const SL = { m1: $("#s-m1"), m2: $("#s-m2"), v1: $("#s-v1") };

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#pred-t").textContent = J.prediccion.titulo;
$("#sum-imp").textContent = CT.profundizar;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
for (const q of ["m1", "m2", "v1"]) { $("#l-" + q).textContent = CT[q]; SL[q].min = RG[q].min; SL[q].max = RG[q].max; SL[q].step = RG[q].paso; }
stage.setAttribute("aria-valuemin", RG.v1.min); stage.setAttribute("aria-valuemax", RG.v1.max);
stage.setAttribute("aria-label", "Lámina: flechas izquierda y derecha cambian la velocidad del carrito 1; B lo lanza");

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
function valores(){
  const n = numeros(), oc = (v) => (rv() ? v : "?");
  return { ...n, vf: oc(n.vf), v1e: oc(n.v1e), v2e: oc(n.v2e), Kf: oc(n.Kf), Kperd: oc(n.Kperd), Ke: oc(n.Ke), J2: oc(n.J2), vK: n.vK };
}
function pintarFicha(){
  const f = J.rotulos[sel];
  if (!f){ $("#ficha").innerHTML = fichaVacia; return; }
  const o = valores();
  $("#ficha").innerHTML = `<b>${sel} · ${tpl(f[0], o)}.</b> ${tpl(f[1], o)}`;
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
    for (const q in v){
      const val = q === "_v" ? (v[q] ? "" : "none") : String(v[q]), clave = id + "|" + q;
      if (previo.get(clave) === val) continue; previo.set(clave, val);
      if (q === "_v") e.style.display = val; else if (q === "_t") e.textContent = val; else e.setAttribute(q, val);
    }
  }
}
const estado = () => ({ m1, m2, v1, union, t, jalon, revelado: rv(), trampa: trampaOn });
const valorSl = (q, v) => tpl(q === "v1" ? CT.valorV : CT.valorM, { v: num(v) });

function render(){
  const n = numeros(), o = valores(), d = calc(J, m1, m2, v1);
  const mv = t < 0 ? null : mover(J, d, union, t), tras = mv && mv.fase !== "antes";
  aplicar(vista(C, K, estado(), J));
  // Panel
  const vel = union === "velcro";
  $("#c-v").textContent = vel ? "Velocidad de los dos juntos después del choque" : "Velocidades después del choque (1 y 2)";
  $("#o-v").textContent = rv() ? (vel ? `${n.vf} m/s` : `${n.v1e} y ${n.v2e} m/s`) : "? m/s";
  $("#o-formula").innerHTML = rv() ? tpl(vel ? L.formulaV : L.formulaVe, n) : L.sinRevelar;
  for (const q of ["m1", "m2", "v1"]){
    const val = { m1, m2, v1 }[q], s = SL[q];
    $("#o-" + q).textContent = valorSl(q, val);
    s.style.setProperty("--p", (100 * (val - RG[q].min) / (RG[q].max - RG[q].min)) + "%");
    if (Math.abs(+s.value - val) > 1e-9) s.value = val;
    s.setAttribute("aria-valuetext", valorSl(q, val));
  }
  $("#o-p0").textContent = `${n.p0} kg·m/s`;
  $("#o-pf").textContent = rv() ? `${vel ? n.p0 : n.pe} kg·m/s` : "?";
  $("#o-kp").textContent = rv() ? (vel ? `${n.Kperd} J` : "0 J") : "?";
  const v1a = mv ? mv.u1 : 0, v2a = mv ? mv.u2 : d.v2, oc = (x) => (!tras || rv() ? num(x) : "?");
  const lect = `t ${num(Math.max(0, t), 2)} s · v₁ ${oc(v1a)} · v₂ ${oc(v2a)} m/s`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", v1);
  stage.setAttribute("aria-valuetext", `carrito 1 a ${n.v1} m/s, unión de ${nombreUnion()}` + (rv() ? (vel ? `; después del choque van juntos a ${n.vf} m/s` : `; después del choque, ${n.v1e} y ${n.v2e} m/s`) : ""));
  bPri.textContent = t < 0 ? CT.lanzar : CT.relanzar;
  bUnion.textContent = vel ? CT.union : CT.unionVolver;
  document.querySelectorAll(".rot-b").forEach(b => { const tt = tpl(J.rotulos[b.dataset.n][0], o), s = b.querySelector("span"); if (s.textContent !== tt) s.textContent = tt; });
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.antes, tpl(L.antesValor, n)],
    [tpl(L.despues, o), tpl(vel ? L.despuesVelcro : L.despuesResortes, o)],
    [L.energia, tpl(vel ? L.energiaVelcro : L.energiaResortes, o)],
    [L.trampa, tpl(L.trampaValor, { ...o, vK: num(d.vK) }) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((q, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${q[0]}</span><span class="va">${q[1]}</span></li>`).join("");
  $("#impulso").innerHTML = J.profundizar.parrafos.map(p => `<p>${tpl(p, o)}</p>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento: el tiempo de física avanza LENTO veces más despacio que el reloj ----------
let anim = 0, pendiente = false;
function terminar(){
  if (enRecorrido) return;
  const n = numeros();
  decir(tpl(union === "velcro" ? L.mensajeFinVelcro : L.mensajeFinResortes, n));
  if (trampaOn && union === "velcro") nota.textContent += " " + tpl(L.mensajeTrampa, { ...n, vK: num(calc(J, m1, m2, v1).vK) });
}
function correr(){
  cancelAnimationFrame(anim); pendiente = true;
  const d = calc(J, m1, m2, v1), tf = mover(J, d, union, 0).tFin;
  if (quieto){ t = tf; pendiente = false; terminar(); render(); return; }
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
    t = Math.min(tf, Math.max(0, t) + dt / LENTO); render();
    if (t < tf) anim = requestAnimationFrame(paso); else { anim = 0; pendiente = false; terminar(); render(); }
  };
  render(); anim = requestAnimationFrame(paso);
}
function nuevo(){ cancelAnimationFrame(anim); anim = 0; pendiente = false; }
function aLaSalida(){ nuevo(); t = -1; jalon = 0; }
function lanzar(){
  nuevo(); revelado = true; t = 0; jalon = 0;
  decir(tpl(L.mensajeAntes, numeros()).split(".")[0] + ".");
  correr();
}
function principal(){ lanzar(); }

// ---------- Arrastre del carrito 1: jalarlo contra el lanzador elige la velocidad; al soltar sale ----------
let arr = null;
const pasoV = (x) => Math.max(RG.v1.min, Math.min(RG.v1.max, Math.round(x / RG.v1.paso) * RG.v1.paso));
const car1 = $("#car1");
car1.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  e.stopPropagation(); tomarControl(); aLaSalida();
  arr = { x: e.clientX, y: e.clientY, id: e.pointerId }; car1.setPointerCapture(e.pointerId); car1.classList.add("tomado"); render();
});
car1.addEventListener("pointermove", (e) => {
  if (!arr || e.pointerId !== arr.id) return;
  const esc = svg.getBoundingClientRect().width / C.W, dx = (e.clientX - arr.x) / esc, dy = (e.clientY - arr.y) / esc;
  const u = (dx * C.AX[0] + dy * C.AX[1]) / (C.AX[0] * C.AX[0] + C.AX[1] * C.AX[1]);   // unidades del mundo a lo largo del riel
  jalon = Math.max(0, Math.min(C.JMAX, -u / C.M));
  if (jalon > 0.002){ v1 = pasoV(RG.v1.max * jalon / C.JMAX); decir(tpl(CT.valorJalon, { v: num(v1) })); }
  render();
});
const suelta = (e) => {
  if (!arr || e.pointerId !== arr.id) return; arr = null; car1.classList.remove("tomado");
  if (jalon > 0.004) lanzar(); else { jalon = 0; decir(CT.arrastre); render(); }
};
car1.addEventListener("pointerup", suelta); car1.addEventListener("pointercancel", suelta);

// ---------- Recorrido automático: recorre los rótulos y cambia la unión, sin lanzar; se detiene al tocar ----------
const REC = C.ROT.filter(n => n !== "07" && n !== "09" && n !== "10").map((n, i) => ({ union: Math.floor(i / 4) % 2 ? "resortes" : "velcro", sel: n }));
let tRec = 0, iRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  const r = REC[iRec % REC.length]; iRec++;
  union = r.union; selRec = true; setSel(r.sel); render();
  tRec = setTimeout(pasoRecorrido, 2400);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim || arr || t >= 0){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe ni tapa un choque del usuario
  enRecorrido = true; nota.textContent = ""; pasoRecorrido();
}
let unionUsuario = "velcro";
function tomarControl(){
  if (enRecorrido){
    enRecorrido = false; clearTimeout(tRec);
    if (selRec){ selRec = false; setSel(null); }
    union = unionUsuario; render();
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
  aLaSalida(); m1 = V.m1; m2 = V.m2; v1 = V.v1; union = unionUsuario = "velcro"; revelado = false;
  if (trampaOn) apagarTrampa();
  decir(tpl(L.mensajeReinicio, numeros())); render();
});
bUnion.addEventListener("click", () => {
  aLaSalida(); union = unionUsuario = union === "velcro" ? "resortes" : "velcro";
  if (union === "resortes" && trampaOn) apagarTrampa();
  decir(tpl(L.mensajeUnion, numeros())); render();
});
function apagarTrampa(){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){ union = unionUsuario = "velcro"; lanzar(); } else render();
});
for (const q of ["m1", "m2", "v1"]){
  SL[q].addEventListener("input", () => {
    aLaSalida(); revelado = false;
    if (q === "m1") m1 = +SL.m1.value; else if (q === "m2") m2 = +SL.m2.value; else v1 = +SL.v1.value;
    render();
  });
  SL[q].addEventListener("change", () => { decir(tpl(L.mensajeAntes, numeros())); render(); });
}
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
stage.addEventListener("keydown", (e) => {
  const dv = {ArrowRight:1, ArrowLeft:-1}[e.key];
  if (dv === undefined) return;
  e.preventDefault(); aLaSalida(); revelado = false;
  v1 = pasoV(v1 + dv * RG.v1.paso); decir(tpl(L.mensajeAntes, numeros())); render();
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
// «Predice»: las opciones salen de las fórmulas del JSON con las masas y la velocidad de los deslizadores (en el orden del examen)
const LETRAS = ["A", "B", "C", "D"];
function pintarPrediccion(){
  const d = calc(J, m1, m2, v1), n = numeros();
  $("#pred-q").innerHTML = tpl(J.prediccion.pregunta, n);
  const ops = J.prediccion.opciones.map((q, i) => { const x = evalua(q.formula, d);
    const val = q.raiz ? (Math.abs(x - Math.round(x)) < 1e-9 && Math.abs(Math.sqrt(x) - Math.round(Math.sqrt(x))) > 1e-9 ? "√" + num(x) : num(Math.sqrt(x))) : num(x);
    return { ok: !!q.correcta, e: tpl(q.retro, n), t: `${LETRAS[i]}) ${val} m/s` }; });
  opciones($("#pred-ops"), ops, () => {
    tomarControl(); union = unionUsuario = "velcro";
    if (trampaOn) apagarTrampa();
    lanzar();
  });
}
pintarPrediccion();
for (const q of ["m1", "m2", "v1"]) SL[q].addEventListener("change", pintarPrediccion);
stage.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") pintarPrediccion(); });
car1.addEventListener("pointerup", pintarPrediccion);
bExamen.addEventListener("click", pintarPrediccion);

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

const n0 = numeros();
$("#pie").innerHTML = `<i>${J.figura.pie}</i> Modelo: el riel (${num(ES.largoRiel)} m), el largo de los carritos (${num(ES.largoCarrito)} m) y la regla están a escala; las pesas (${num(ES.masaPesa)} kg cada una), el lanzador, el soplador y el tablero no.
 Con velcro el choque es instantáneo y los carritos quedan pegados; con resortes el contacto dura ${num(V.dt)} s y el resorte se dibuja más comprimido de lo real. Las flechas de p están a la misma escala entre sí: antes y después suman lo mismo.
 Las barras del tablero sí van a escala (hasta ${num(ES.pMax)} kg·m/s y ${num(ES.kMax)} J). La animación va ${num(LENTO)} veces más lenta que la realidad y se congela cuando un carrito llega al tope o el carrito 1 regresa al lanzador.
 Si nadie toca, la lámina recorre sus partes y cambia la unión, sin lanzar ni mostrar el resultado. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B lanza; con la lámina enfocada, ← → cambian la velocidad. También puedes jalar el carrito 1 hacia el lanzador y soltarlo.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#lanzar", "#union", "#bloque-v1"].map(s => $(s));
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

pintarFicha(); render();
window.__cantidad = { set:(o) => { if ("m1" in o) m1 = o.m1; if ("m2" in o) m2 = o.m2; if ("v1" in o) v1 = o.v1; if ("union" in o) union = unionUsuario = o.union;
    if ("t" in o) t = o.t; if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa; render(); },
  sel:seleccionar, completa:entrar, salir, tFin:() => mover(J, calc(J, m1, m2, v1), union, 0).tFin,
  alto:() => { enRecorrido = false; clearTimeout(tRec); nuevo(); if (selRec){ selRec = false; setSel(null); } render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de cantidad de movimiento) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados tal cual del generador de Arquímedes.
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
/* Propio de cantidad de movimiento (también va en el SVG fijo) */
.agujeros{fill:none;stroke:var(--anatomy-lo);stroke-width:1.1;stroke-linecap:round}
.resorte{fill:none;stroke:var(--anatomy-hi);stroke-width:.8;stroke-linejoin:round} .resorte.atras{stroke:var(--anatomy-lo)}
.velcro>.iso-fill,.velcro>.iso-top{fill:color-mix(in srgb,var(--dorado) 30%,var(--anatomy-shade-1))}
.velcro>.iso-shade{fill:color-mix(in srgb,var(--dorado) 40%,var(--anatomy-shade-0))}
.barra-p>.iso-fill,.barra-p>.iso-top{fill:color-mix(in srgb,var(--rubrica) 55%,var(--anatomy-top))}
.barra-p>.iso-shade{fill:color-mix(in srgb,var(--rubrica) 75%,var(--anatomy-shade-0))} .barra-p>.iso-edge{stroke:var(--rubrica)}
.barra-k>.iso-fill,.barra-k>.iso-top{fill:color-mix(in srgb,var(--acento) 50%,var(--anatomy-top))}
.barra-k>.iso-shade{fill:color-mix(in srgb,var(--acento) 72%,var(--anatomy-shade-0))} .barra-k>.iso-edge{stroke:var(--acento)}
.antes>.iso-fill,.antes>.iso-top{fill-opacity:.38} .antes>.iso-shade{opacity:.45}
.plomo{fill:none;stroke:var(--rubrica);stroke-width:.8;stroke-dasharray:1.5 2}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.tk{fill:none;stroke-width:.6} .tk.menor{stroke:var(--anatomy-lo)} .tk.mayor{stroke:var(--anatomy-mid)}
.t-regla{font:500 8.5px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.t-car{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-strong);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-barra{font:500 9px var(--anatomy-mono);fill:var(--anatomy-strong);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-tablero{font:italic 500 12px var(--serif);fill:var(--anatomy-text)}
.flecha line{stroke:var(--rubrica);stroke-width:2.4;stroke-linecap:round} .flecha polygon{fill:var(--rubrica)}
.fl-j line{stroke-width:1.6} .fl-j .t-vel{font-size:12px}
.t-vel{font:500 13px var(--serif);fill:var(--rubrica);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de cantidad de movimiento */
.arrastre{cursor:grab;touch-action:none} .arrastre.tomado{cursor:grabbing}
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px}
.escala{flex:1;min-width:0;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums}
.grande{font-size:clamp(2rem,8vw,3rem)}
.profundizar+.profundizar{border-top:none;padding-top:0}
#impulso p{margin:6px 0;max-width:62ch}
@media (max-width:560px){.escena .t-car,.escena .t-barra{font-size:14px}.escena .t-vel{font-size:18px}.escena .t-trampa{font-size:15px}.escena .t-tablero{font-size:16px}.escena .rot circle{r:11px}.escena .rot text{font-size:12px}}
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
.modo-lamina .compacto{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:6px 16px;align-items:center}
.modo-lamina .compacto .fila{font-size:.82rem;font-weight:600}
.modo-lamina .compacto input[type=range]{height:30px}
.modo-lamina .compacto .boton{white-space:nowrap}
@media (orientation:portrait){.modo-lamina .gira{display:block;margin:0 52px 0 0;font-size:.85rem;color:var(--suave)}
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .modo-lamina .compacto #bloque-v1{grid-column:1/-1}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el del examen, ya pegados y avanzando) ----------
function svgFijo() {
  const d = calc(J, VI.m1, VI.m2, VI.v1), mv = mover(J, d, "velcro", 0);
  const s = { m1: VI.m1, m2: VI.m2, v1: VI.v1, union: "velcro", t: mv.tc + 0.55 * (mv.tFin - mv.tc), jalon: 0, revelado: true, trampa: false };
  const claro = CSS_PRENSA.slice(CSS_PRENSA.indexOf(":root{"), CSS_PRENSA.indexOf("@media (prefers-color-scheme:dark)"))
    .replace(":root{", "svg{").replace(/\s*color-scheme:light;box-sizing:border-box;[\s\S]*?\n\}/, "}");
  const tibio = CSS_PRENSA.slice(CSS_PRENSA.indexOf(".iso{"), CSS_PRENSA.indexOf("@media", CSS_PRENSA.indexOf(".iso{"))).replace(".iso{", "svg.iso{");
  const estilo = `<style>${k.ISO_CSS}${claro}${tibio}svg{background:var(--bg)}${CSS_FIG}</style>`;
  const sinRot = (m) => { for (const n of ROT) m["rot-" + n] = { _v: false }; return m; };
  return k.figureSvg({ width: W, height: H, label: J.figura.aria, className: "iso", body: [estilo, ...cuerpo(sinRot(vista(CFG, k, s, J)))] })
    .replace('<svg ', `<svg width="${2 * W}" height="${2 * H}" `);
}

const plate = k.plateHtml({
  fig: "Lámina I",
  title: J.titulo,
  hint: J.instruccion,
  readout: "t 0 s",
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
        <h3 id="pred-t">Predice antes de lanzar</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
        <p class="gira" aria-hidden="true">Gira el teléfono para verla más grande</p>
        <div class="iso escena">${plate}</div>
        <div class="barra-lamina">
          <span class="escala" id="escala">Escala: riel, carritos y regla en metros</span>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="c-v">Velocidad después del choque</span>
          <output id="o-v" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div><div class="fila"><label for="s-m1" id="l-m1"></label><output id="o-m1"></output></div><input type="range" id="s-m1"></div>
          <div><div class="fila"><label for="s-m2" id="l-m2"></label><output id="o-m2"></output></div><input type="range" id="s-m2"></div>
          <div id="bloque-v1"><div class="fila"><label for="s-v1" id="l-v1"></label><output id="o-v1"></output></div><input type="range" id="s-v1"></div>
        </div>
        <div class="chips">
          <div class="chip"><span>p antes</span><output id="o-p0"></output></div>
          <div class="chip"><span>p después</span><output id="o-pf"></output></div>
          <div class="chip"><span>Energía perdida</span><output id="o-kp"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="lanzar" aria-keyshortcuts="b">Lanzar</button>
          <button type="button" class="boton sec" id="union"></button>
          <button type="button" class="boton sec" id="trampa" aria-pressed="false"></button>
          <button type="button" class="boton sec" id="examen"></button>
        </div>
        <p class="nota" id="nota" data-say aria-live="polite"></p>
        <details class="profundizar">
          <summary>Profundizar: de dónde sale cada número</summary>
          <ol class="lecturas" id="lecturas"></ol>
        </details>
        <details class="profundizar">
          <summary id="sum-imp">Profundizar: el impulso</summary>
          <div id="impulso"></div>
        </details>
      </div>
      <p class="pie" id="pie"></p>
    </section>
    <div id="pasos-b" class="pasos"></div>
  </div>
</main>
<!--respaldo-->
<script type="module">${(kitScript() + `\nconst evalua = ${evalua.toString()};\nconst calc = ${calc.toString()};\nconst mover = ${mover.toString()};\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
