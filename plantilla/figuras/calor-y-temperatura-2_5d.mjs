// Lámina 2.5D+ de calor y temperatura: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/calor-y-temperatura-2_5d.mjs                → plantilla/interactivos/calor-y-temperatura/plus/index.html
//                                                                      y contenido/fisica/img/calor-y-temperatura.svg (figura fija para PDF y video)
//   node plantilla/figuras/calor-y-temperatura-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de cantidad de movimiento (plantilla/figuras/cantidad-de-movimiento-2_5d.mjs): misma página (CSS_PRENSA),
// pantalla completa, evaluador de fórmulas, predicción y pasos desde el JSON, y salida .svg. Otro dibujo (parrilla con perilla y
// termostato, vaso de vidrio con hielo y agua, termómetro de tres escalas en su soporte y panel con la curva de calentamiento)
// y otra lógica (el calor entregado q avanza: primero derrite a 0 °C, luego calienta el agua; apagar no recongela).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "calor-y-temperatura";
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
// Variables de entrada: masa del hielo y temperatura del termostato; lo demás (c, L, potencia, escalas, la prueba) viene del JSON.
function calc(J, m, Tf) {
  const v = { ...J.valoresIniciales, m, Tf };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}
// El estado con q calorías entregadas: mientras queda hielo todo se va en derretir y T = T0; después sube T = T0 + qc ÷ (m · c).
// El termostato corta en q = Q. El agua derretida no regresa a hielo: q nunca baja (salvo «hielo nuevo»).
function fase(d, q) {
  const qq = Math.max(0, Math.min(q, d.Q)), qf = Math.min(qq, d.Qfus), qc = Math.max(0, qq - d.Qfus);
  return { q: qq, qf, qc, hielo: d.m - qf / d.Lf, agua: qf / d.Lf, T: d.T0 + qc / (d.m * d.c), meseta: qq < d.Qfus - 1e-9, fin: qq >= d.Q - 1e-9,
    Tsin: Math.min(d.Tf, d.T0 + qq / (d.m * d.c)) };   // la trampa: lo que marcaría si no hubiera fusión
}
// Temperatura en las otras escalas: con las fórmulas del JSON (TfK y TfF) evaluadas en T
function escalas(J, T) {
  const v = { ...J.valoresIniciales, Tf: T };
  return { K: evalua(J.lecturas.formulas.TfK, v), F: evalua(J.lecturas.formulas.TfF, v) };
}

// ---------- Modelo del dibujo (unidades del mundo = centímetros; z hacia arriba; el frente es +y) ----------
// El vaso, el hielo y el agua están a escala entre sí; la parrilla, el termómetro, su soporte y el panel de la curva no.
const VI = J.valoresIniciales, RG = J.rangos, ES = J.escena;
const ESCV = 1.8;                                                              // unidades del mundo por cm en el vaso, el hielo y el agua
const PLACA = { x: -8, y: -32, w: 128, d: 56, r: 6 }, PLACA_H = 4, PATA_H = 4;
const PAR = { x: 0, y: -20, w: 44, d: 40, r: 2.5 }, ZP0 = 1.6, ZPT = 9;          // parrilla: cuerpo sobre patas de goma
const DISCO = { cx: 22, cy: -4, r: 15 }, ZD = ZPT + 0.8;                        // plato caliente con su resistencia
const GX = DISCO.cx, GY = DISCO.cy, HV = ES.altoVaso * ESCV;
const RIc = Math.sqrt(ES.vasoMl / (Math.PI * ES.altoVaso));                     // radio interior (cm): vasoMl cabe en altoVaso
const RI = RIc * ESCV, RO = RI + 0.5, ZI = ZD + 0.8, ZR = ZI + HV;
const A0 = Math.cbrt(ES.gramosPorCubo / ES.densidadHielo) * ESCV;               // lado de un cubo de hielo
const NC = Math.ceil(RG.m.max / ES.gramosPorCubo), OC = A0 / 2 + 0.15;          // cubos posibles y separación del centro
const TX = GX, TY = GY - (OC + A0 / 2) - 1.8;                                   // varilla del termómetro, detrás del hielo
const TAB = { x: TX - 10, y: TY - 2.8, w: 27.5, d: 1.2, r: 0.5 }, ZT0 = 29, ZT1 = 66; // tablilla con las tres escalas
const ZS0 = 32, ZS1 = 62;                                                       // −10 °C y 100 °C sobre la tablilla
const COL = { c: -2.8, k: 2.6, f: 10.4 };                                         // columnas de etiquetas (°C, K, °F) respecto a la varilla
const VAR = { x: 22, y: -26 };                                                  // soporte: varilla detrás de la parrilla
const GP = { x: 54, y: -12, w: 60, d: 2, r: 0.6 }, ZG0 = 4, ZG1 = 64;           // panel de la curva
const YF = GP.y + GP.d + 0.05, QX0 = 63, QX1 = 109, TZ0 = 13, TZ1 = 58;          // área de la gráfica sobre el frente del panel
const PERILLA = { x: 7.5, y: 14 }, PILOTO = { x: 22, y: 15 }, TERMO = { x: 36.5, y: 14 }, RP = 3;
const PANT = { x: 9, w: 26, z0: 3, z1: 7.6 };                                   // contador de calor al frente de la parrilla

const W = 640, H = 380;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [PLACA.x, PLACA.y + PLACA.d, -30], [TAB.x - 8, TAB.y, ZT1 + 2], [TAB.x + TAB.w, TAB.y, ZT1 + 2], [GP.x, GP.y, ZG1 + 2], [GP.x + GP.w, GP.y, ZG1 + 2]],
  W, H, { pad: 10, azimuth: 76, elevation: 26 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], c[2] || 0], P);

// Cubos: 4 por capa (2 × 2), capas hacia arriba; el orden del DOM va de atrás hacia adelante y de abajo hacia arriba
const HUECOS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const CUBOS = Array.from({ length: NC }, (_, i) => ({ i, capa: Math.floor(i / 4), dx: HUECOS[i % 4][0] * OC, dy: HUECOS[i % 4][1] * OC }));
const ORDEN_CUBOS = [...CUBOS].sort((a, b) => a.capa - b.capa || prof([a.dx, a.dy]) - prof([b.dx, b.dy])).map(c => c.i);

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
function vista(C, K, s, J) {
  const P = C.P, ES = J.escena;
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
  const d = calc(J, s.m, s.Tf), f = fase(d, s.q), rv = s.revelado;
  const m = {};
  const solido = (id, paths, ver) => {
    if (!ver) { m[id] = { _v: false }; return; }
    m[id] = { _v: true }; m[id + "-f"] = { d: paths.fill }; m[id + "-t"] = { d: paths.top }; m[id + "-e"] = { d: paths.outline };
    for (let i = 0; i < 4; i++) m[id + "-s" + i] = { d: paths.shades[i] || "" };
  };
  const texto = (id, p, t, anc, ver = true) => { m[id] = ver ? { _v: true, x: p[0].toFixed(1), y: p[1].toFixed(1), "text-anchor": anc, _t: t } : { _v: false }; };

  // Parrilla: resistencia y piloto encendidos; perilla apuntando a «I» u «0»; termostato apuntando a Tf
  m["bobina"] = { class: "bobina" + (s.on ? " on" : "") };
  m["piloto"] = { class: "iso-solid piloto" + (s.on ? " on" : "") };
  const aguja = (c, ang, r) => "M" + pt(iso([c.x, c.y, C.ZPT + 2.4])) + "L" + pt(iso([c.x + r * Math.cos(ang), c.y + r * Math.sin(ang), C.ZPT + 2.4]));
  m["aguja-p"] = { d: aguja(C.PERILLA, s.on ? -Math.PI * 0.25 : -Math.PI * 0.75, C.RP * 0.8) };
  const rT = J.rangos.Tf, fr = (s.Tf - rT.min) / (rT.max - rT.min);
  m["aguja-t"] = { d: aguja(C.TERMO, -Math.PI * (1.25 - 1.5 * fr), C.RP * 0.8) };

  // Contador de calor (al frente): lo que ya entregó la parrilla
  m["t-cont"] = { _t: tpl(J.figura.calor, { q: num(f.q, 0) }) };

  // Agua (cilindro que sube con lo derretido) y cubos que se encogen parejo; flotan cuando el agua los alcanza
  const hw = f.agua / (Math.PI * C.RIc * C.RIc) * C.ESCV;
  solido("agua", K.cylinder(C.GX, C.GY, C.RI - 0.05, C.ZI, Math.max(hw, 0.001), P, 44), hw > 0.02);
  const n0 = Math.round(s.m / ES.gramosPorCubo), lado = f.hielo > 1e-6 ? C.A0 * Math.cbrt(f.hielo / s.m) : 0;
  const capas = Math.ceil(n0 / 4), alto = capas * lado, base = C.ZI + Math.max(0, hw - ES.densidadHielo * alto);
  for (const c of C.CUBOS) {
    const ver = c.i < n0 && lado > 0.05;
    solido("ic" + c.i, ver ? K.slabOf({ x: C.GX + c.dx - lado / 2, y: C.GY + c.dy - lado / 2, w: lado, d: lado, r: lado * 0.2 }, base + c.capa * lado, lado, P, 3) : null, ver);
  }
  const pv = iso([C.GX + C.RO + 4.5, C.GY + C.RO * 0.4, C.ZI + 4]);
  texto("t-hielo", pv, tpl(J.figura.hielo, { g: num(f.hielo, 0) }), "start", f.hielo > 0.5);
  texto("t-agua", mas(pv, 0, f.hielo > 0.5 ? 13 : 0), tpl(J.figura.agua, { g: num(f.agua, 0) }), "start", f.agua > 0.5);

  // Termómetro: columna hasta T; la trampa deja una columna punteada hasta lo que marcaría sin fusión
  const tm = ES.termometro, zT = (T) => C.ZS0 + (T - tm.min) * (C.ZS1 - C.ZS0) / (tm.max - tm.min);
  const zc = zT(f.T);
  solido("col", K.cylinder(C.TX, C.TY, 0.32, C.ZI + 1, zc - C.ZI - 1, P, 12), true);
  const ft = !!s.trampa;
  m["t-fant"] = ft && f.Tsin > f.T + 0.05 ? { _v: true, d: K.cylinder(C.TX, C.TY, 1.05, zc, zT(f.Tsin) - zc, P, 14).outline } : { _v: false };
  const sc = escalas(J, f.T), pl = iso([C.TAB.x - 1, C.TAB.y, zc]);
  m["t-temp"] = { x: pl[0].toFixed(1), y: (pl[1] - 9).toFixed(1) };
  m["t-tc"] = { x: pl[0].toFixed(1), _t: tpl(J.figura.tempC, { T: num(f.T, 1) }) };
  m["t-tk"] = { x: pl[0].toFixed(1), _t: tpl(J.figura.tempK, { T: num(sc.K, 1) }) };
  m["t-tf"] = { x: pl[0].toFixed(1), _t: tpl(J.figura.tempF, { T: num(sc.F, 1) }) };

  // Curva de calentamiento: T contra Q (kcal), a escala; el eje de Q se elige para que quepa Q total
  const eje = ES.ejeQ.find(e => e[0] >= d.kQ - 1e-9) || ES.ejeQ[ES.ejeQ.length - 1];
  const et = ES.ejeT, ejT = et.maximos.find(e => e[0] >= s.Tf + et.margen - 1e-9) || et.maximos[et.maximos.length - 1];
  const gx = (kq) => C.QX0 + Math.min(1.04, kq / eje[0]) * (C.QX1 - C.QX0);
  const gz = (T) => C.TZ0 + (T - et.min) * (C.TZ1 - C.TZ0) / (ejT[0] - et.min);
  const g = (kq, T) => iso([gx(kq), C.YF, gz(T)]);
  for (let i = 0; i <= 5; i++) m["eq" + i] = { _t: num(eje[1] * i) };
  // Cuadrícula de T (cada medio paso) y sus etiquetas: cambian con el eje elegido
  let cu = "", ce = "";
  for (let T = et.min; T <= ejT[0] + 1e-9; T += ejT[1] / 2) {
    const sg = "M" + pt(iso([C.QX0, C.YF, gz(T)])) + "L" + pt(iso([C.QX1, C.YF, gz(T)]));
    if (Math.abs(T) < 1e-9) ce += sg; else cu += sg;
  }
  m["cuad-t"] = { d: cu }; m["eje-0"] = { d: ce };
  for (let i = 0; i < 6; i++) { const T = i * ejT[1], pe = iso([C.QX0 - 1.2, C.YF, gz(T)]);
    m["et" + i] = T <= ejT[0] + 1e-9 ? { _v: true, x: pe[0].toFixed(1), y: (pe[1] + 3).toFixed(1), _t: num(T) } : { _v: false }; }
  const pt1 = iso([C.QX0, C.YF, C.TZ1 + 2.2]);
  m["t-ejeT"] = { x: pt1[0].toFixed(1), y: pt1[1].toFixed(1) };
  const pts = [g(0, d.T0)];
  if (f.q > 0) {
    pts.push(g(f.qf / 1000, d.T0));
    if (f.qc > 0) pts.push(g(f.q / 1000, f.T));
  }
  m["curva"] = { _v: f.q > 0, d: "M" + pts.map(pt).join("L") };
  const pa = pts[pts.length - 1];
  m["punto"] = { _v: f.q > 0 || s.on, cx: pa[0].toFixed(1), cy: pa[1].toFixed(1) };
  const oc = (x) => (rv ? x : "?");
  const pm = g(d.kQfus / 2, d.T0), pr = g((d.kQfus + d.kQ) / 2, (d.T0 + d.Tf) / 2);
  texto("t-meseta", mas(pm, 0, 13), J.figura.meseta, "middle", f.q > 0);
  texto("t-rampa", mas(pr, 6, 6), J.figura.rampa, "start", f.qc > 0);
  // Marcas de lo que ya pasó: fin de la meseta y fin de la rampa (con su valor)
  const pf = g(d.kQfus, d.T0), pe = g(d.kQ, d.Tf), p0 = g(d.kQfus, et.min);
  m["v-fus"] = { _v: f.qf >= d.Qfus - 1e-9, d: "M" + pt(pf) + "L" + pt(p0) };
  texto("t-vfus", mas(pf, -3, -7), `${oc(num(d.kQfus))} kcal`, "end", f.qf >= d.Qfus - 1e-9 && !ft);
  texto("t-vfin", mas(pe, -5, -6), `${oc(num(d.kQ))} kcal · ${num(d.Tf)} °C`, "end", f.fin && !ft);
  // Trampa: recta punteada directa de T0 a Tf con solo m·c·ΔT, frente a la curva real con meseta
  const ps = g(d.kQcal, d.Tf);
  m["fant"] = ft ? { _v: true, d: "M" + pt(g(0, d.T0)) + "L" + pt(ps) } : { _v: false };
  const pfa = mas(ps, 8, -10);
  m["fant-t"] = ft ? { _v: true, x: pfa[0].toFixed(1), y: pfa[1].toFixed(1) } : { _v: false };
  m["fant-1"] = { x: pfa[0].toFixed(1), _t: tpl(J.trampa.fantasma, { kQcal: num(d.kQcal) }) };
  m["fant-2"] = { x: pfa[0].toFixed(1), _t: tpl(J.trampa.real, { kQ: oc(num(d.kQ)) }) };

  // Rótulos
  const rot = (nn, p, ver = true) => { m["rot-" + nn] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  rot("01", mas(iso([C.PAR.x, C.PAR.y + C.PAR.d, C.ZP0 + 2]), -12, 4));
  rot("02", mas(iso([C.TERMO.x + C.RP, C.TERMO.y, C.ZPT + 2.4]), 14, -4));
  rot("03", mas(iso([C.GX + C.RO, C.GY, C.ZR]), 12, -2));
  rot("04", mas(iso([C.GX - C.OC - lado / 2, C.GY + C.OC, base + lado]), -14, -4), lado > 0.05 && n0 > 0);
  rot("05", mas(iso([C.GX - C.RO, C.GY + 2, C.ZI + Math.max(hw, 0.5) / 2]), -14, 6), hw > 0.02);
  rot("06", mas(iso([C.TX, C.TY, C.ZR + 1.2]), -14, 0));
  rot("07", mas(iso([C.TAB.x + C.TAB.w, C.TAB.y, C.ZT1 - 3]), 12, 0));
  rot("08", mas(iso([C.GP.x + C.GP.w, C.GP.y + C.GP.d, C.ZG1 - 4]), 12, 0));
  rot("09", mas(iso([C.PANT.x + C.PANT.w, C.PAR.y + C.PAR.d, C.PANT.z1]), 12, -6));
  rot("10", mas(g(d.kQcal / 2, (d.T0 + d.Tf) / 2), 12, 8), ft);
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
// Sólido que cambia: cada cara toma su «d» de la vista
const solidoE = (id, cls, m, parte) => E("g", id, { "data-parte": parte }, m, `<g class="iso-solid ${cls}">` + E("path", id + "-f", { class: "iso-fill" }, m)
  + [0, 1, 2, 3].map((i) => E("path", id + "-s" + i, { class: "iso-shade", "data-shade": i }, m)).join("")
  + E("path", id + "-t", { class: "iso-top" }, m) + E("path", id + "-e", { class: "iso-line iso-edge", "data-tone": "lo" }, m) + `</g>`);

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
  const pl = { x: 76, y: PLACA.y + PLACA.d - 3.8, w: 38, d: 2.4, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 2.4, pl.y + 1.8], 0.4, P, "x"), J.figura.placa, { size: 1.5, tone: "lo" }));
  o.push(D([at([pl.x + 1.2, pl.y + 1.2, 0.4]), at([pl.x + pl.w - 1.2, pl.y + 1.2, 0.4])], { size: 0.4 }));
  return o.join("");
}
// Soporte: pie, varilla y pinza que sostiene la tablilla del termómetro por detrás
function soporte() {
  const o = [S(k.slabOf({ x: VAR.x - 5, y: VAR.y - 4.5, w: 10, d: 8, r: 1 }, 0, 1.2, P, 4, 0.2), { tone: "mid" })];
  o.push(S(k.cylinder(VAR.x, VAR.y, 0.8, 1.2, ZT1 - 5, P, 16), { tone: "mid" }));
  o.push(S(k.slabOf({ x: VAR.x - 1, y: VAR.y, w: 2, d: TAB.y - VAR.y, r: 0.3 }, ZT1 - 10, 2, P, 3), { tone: "lo" }));
  o.push(S(k.cylinder(VAR.x, VAR.y, 1.5, ZT1 - 10.5, 3, P, 16), { tone: "hi" }));
  o.push(L(k.knurl(VAR.x, VAR.y, 1.5, ZT1 - 10.2, ZT1 - 7.8, 12, P), { tone: "lo" }));
  return `<g data-parte="06">${o.join("")}</g>`;
}
// Parrilla: cuerpo con patas de goma, plato con resistencia en espiral, perilla, piloto, termostato y contador al frente
function parrilla(m) {
  const o = [];
  for (const [x, y] of k.corners(PAR, 3.5).sort((a, b) => prof(a) - prof(b))) o.push(S(k.cylinder(x, y, 1.6, 0, ZP0, P, 16), { tone: "lo" }));
  o.push(S(k.slabOf(PAR, ZP0, ZPT - ZP0, P, 6, 0.6), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PAR, 1.8), ZPT, P), { tone: "faint" }));
  // Rejilla de ventilación al frente
  let rej = "";
  for (let x = PAR.x + 2.5; x < PANT.x - 0.8; x += 1.1) rej += k.segment([x, PAR.y + PAR.d + 0.02, ZP0 + 1.6], [x, PAR.y + PAR.d + 0.02, ZPT - 1.6], P);
  for (let x = PANT.x + PANT.w + 1.4; x < PAR.x + PAR.w - 2; x += 1.1) rej += k.segment([x, PAR.y + PAR.d + 0.02, ZP0 + 1.6], [x, PAR.y + PAR.d + 0.02, ZPT - 1.6], P);
  o.push(L(rej, { tone: "lo" }));
  const parte01 = `<g data-parte="01">${o.join("")}</g>`;
  // Plato y resistencia (la resistencia se ve alrededor del vaso)
  const pla = [S(k.cylinder(DISCO.cx, DISCO.cy, DISCO.r + 0.9, ZPT, 0.3, P, 56), { tone: "lo" }), S(k.cylinder(DISCO.cx, DISCO.cy, DISCO.r, ZPT + 0.3, ZD - ZPT - 0.3, P, 56, 0.2), { tone: "mid" })];
  let bob = "";
  for (let r = 2; r <= DISCO.r - 0.9; r += 1.25) bob += k.ring(DISCO.cx, DISCO.cy, r, ZD, P, 56);
  pla.push(E("path", "bobina", { class: "bobina", d: bob }, m));
  // Mandos
  const man = [];
  const perilla = (c) => { man.push(S(k.cylinder(c.x, c.y, RP, ZPT, 2.4, P, 32, 0.25), { tone: "hi" })); man.push(L(k.knurl(c.x, c.y, RP, ZPT + 0.3, ZPT + 2.1, 18, P), { tone: "lo" })); };
  perilla(PERILLA);
  man.push(k.faceTextSvg(k.topMatrix([PERILLA.x - 5, PERILLA.y + 4.2], ZPT, P, "x"), "0", { size: 2, tone: "lo" }));
  man.push(k.faceTextSvg(k.topMatrix([PERILLA.x + 3.8, PERILLA.y + 4.2], ZPT, P, "x"), "I", { size: 2, tone: "lo" }));
  man.push(E("path", "aguja-p", { class: "aguja" }, m));
  const pil = k.cylinder(PILOTO.x, PILOTO.y, 1.1, ZPT, 0.7, P, 20);
  man.push(E("g", "piloto", { class: "iso-solid piloto" }, m, `<path class="iso-fill" d="${pil.fill}"/><path class="iso-top" d="${pil.top}"/><path class="iso-line iso-edge" data-tone="lo" d="${pil.outline}"/>`));
  perilla(TERMO);
  const rT = RG.Tf, nT = Math.round((rT.max - rT.min) / rT.paso);
  let tk = "";
  for (let i = 0; i <= nT; i++) { const a = -Math.PI * (1.25 - 1.5 * i / nT); tk += k.segment([TERMO.x + (RP + 0.5) * Math.cos(a), TERMO.y + (RP + 0.5) * Math.sin(a), ZPT], [TERMO.x + (RP + (i % 2 ? 1.1 : 1.7)) * Math.cos(a), TERMO.y + (RP + (i % 2 ? 1.1 : 1.7)) * Math.sin(a), ZPT], P); }
  man.push(L(tk, { tone: "mid" }));
  man.push(k.faceTextSvg(k.topMatrix([TERMO.x + 3.8, TERMO.y + 4.6], ZPT, P, "x"), "°C", { size: 1.8, tone: "lo" }));
  man.push(E("path", "aguja-t", { class: "aguja" }, m));
  // Potencia grabada sobre el cuerpo
  man.push(k.faceTextSvg(k.topMatrix([PAR.x + 2.4, PAR.y + 3.4], ZPT, P, "x"), J.figura.potencia.replace("{P}", String(VI.P)), { size: 1.9, tone: "lo" }));
  // Contador de calor
  const yF = PAR.y + PAR.d;
  const cont = [S(k.slabOf({ x: PANT.x, y: yF, w: PANT.w, d: 0.4, r: 0.15 }, PANT.z0, PANT.z1 - PANT.z0, P, 2), { tone: "lo", className: "pantalla-q", crease: "none" })];
  cont.push(E("text", "t-cont", { class: "t-cont", transform: k.sideMatrix([PANT.x + 1.4, yF + 0.42], PANT.z0 + 1.35, P, "left"), "font-size": "2.6" }, m));
  return parte01 + `<g data-parte="01">${pla.join("")}</g><g data-parte="02">${man.join("")}</g><g data-parte="09">${cont.join("")}</g>`;
}
// Tablilla del termómetro: tres escalas grabadas (°C a la izquierda; K y °F a la derecha), valores de las fórmulas del JSON
function tablilla() {
  const tm = ES.termometro, zT = (T) => ZS0 + (T - tm.min) * (ZS1 - ZS0) / (tm.max - tm.min), yf = TAB.y + TAB.d + 0.02;
  const o = [S(k.slabOf(TAB, ZT0, ZT1 - ZT0, P, 4, 0.2), { tone: "mid", lit: true })];
  let tM = "", tm2 = "", et = "";
  for (let T = tm.min; T <= tm.max + 1e-9; T += tm.paso) {
    const z = zT(T), mayor = Math.abs(T % tm.etiquetas) < 1e-9;
    const dd = k.segment([TX - (mayor ? 2.2 : 1.6), yf, z], [TX - 0.8, yf, z], P) + k.segment([TX + 0.8, yf, z], [TX + (mayor ? 2.2 : 1.6), yf, z], P);
    if (mayor) {
      tM += dd;
      const sc = escalas(J, T), a = at([TX + COL.c, yf, z]), b = at([TX + COL.k, yf, z]), c = at([TX + COL.f, yf, z]);
      et += `<text class="t-esc" text-anchor="end" x="${a[0].toFixed(1)}" y="${(a[1] + 2.6).toFixed(1)}">${esc(fmt(T))}</text>`
        + `<text class="t-esc" x="${b[0].toFixed(1)}" y="${(b[1] + 2.6).toFixed(1)}">${esc(fmt(sc.K))}</text>`
        + `<text class="t-esc" x="${c[0].toFixed(1)}" y="${(c[1] + 2.6).toFixed(1)}">${esc(fmt(sc.F))}</text>`;
    } else tm2 += dd;
  }
  const cab = (x, t, anc) => { const q = at([x, yf, ZT1 - 1.8]); return `<text class="t-cab" text-anchor="${anc}" x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}">${t}</text>`; };
  o.push(`<path class="tk menor" d="${tm2}"/><path class="tk mayor" d="${tM}"/>` + et + cab(TX + COL.c, "°C", "end") + cab(TX + COL.k, "K", "start") + cab(TX + COL.f, "°F", "start"));
  return `<g data-parte="07">${o.join("")}</g>`;
}
const fmt = (v) => { const r = Math.round(v * 10) / 10; return (r < 0 ? "−" : "") + String(Math.abs(r)); };
// Varilla y bulbo del termómetro (vidrio) con la columna que sube
function termometro(m) {
  const o = [S(k.cylinder(TX, TY, 1.1, ZI + 0.4, 2.6, P, 18), { tone: "hi", className: "vidrio-t" })];
  o.push(S(k.cylinder(TX, TY, 0.6, ZI + 3, ZT1 - 2.5 - ZI - 3, P, 16), { tone: "hi", className: "vidrio-t" }));
  o.push(solidoE("col", "columna", m, "06"));
  o.push(E("path", "t-fant", { class: "fantasma", "data-parte": "10" }, m));
  return `<g data-parte="06">${o.join("")}</g>`;
}
// Vaso de precipitados: pared de vidrio, borde, pico y graduaciones a escala (cada 200 mL)
function vaso() {
  const o = [S(k.cylinder(GX, GY, RO, ZD, ZR - ZD, P, 56), { tone: "hi", className: "vidrio", crease: "none" })];
  o.push(L(k.ring(GX, GY, RI, ZR, P, 56), { tone: "mid" }));
  o.push(L(k.ring(GX, GY, RI, ZI, P, 56), { tone: "faint" }));
  const [vx, vy] = k.towardViewer(P), lv = Math.hypot(vx, vy), ux = vx / lv, uy = vy / lv;
  const ang = Math.atan2(uy, ux) - 0.55;
  let gr = "", et = "";
  for (let V = 200; V < ES.vasoMl; V += 200) {
    const z = ZI + V / (Math.PI * RIc * RIc) * ESCV, w = V % 400 ? 0.16 : 0.3;
    const pts = []; for (let a = ang - w; a <= ang + w + 1e-9; a += w / 4) pts.push([GX + RO * Math.cos(a), GY + RO * Math.sin(a), z]);
    gr += k.pathOf(pts.map(at));
    if (V % 400 === 0) { const q = at([GX + RO * Math.cos(ang + w), GY + RO * Math.sin(ang + w), z]); et += `<text class="t-ml" x="${(q[0] + 2).toFixed(1)}" y="${(q[1] + 2.4).toFixed(1)}">${V} mL</text>`; }
  }
  o.push(`<path class="graduacion" d="${gr}"/>` + et);
  return `<g data-parte="03">${o.join("")}</g>`;
}
// Panel de la curva: tablero sobre dos pies, cuadrícula fija (5 columnas de Q y T cada paso) y ejes
function panel(m) {
  const o = [];
  for (const x of [GP.x + 4, GP.x + GP.w - 11]) o.push(S(k.slabOf({ x, y: GP.y - 3, w: 7, d: GP.d + 6, r: 0.8 }, 0, ZG0, P, 3, 0.2), { tone: "lo" }));
  o.push(S(k.slabOf(GP, ZG0, ZG1 - ZG0, P, 4, 0.2), { tone: "mid" }));
  let cu = "", ej = "", tx = "";
  for (let i = 0; i <= 5; i++) { const x = QX0 + i * (QX1 - QX0) / 5; cu += k.segment([x, YF, TZ0], [x, YF, TZ1], P);
    const q = at([x, YF, TZ0]); tx += E("text", "eq" + i, { class: "t-eje", "text-anchor": "middle", x: q[0].toFixed(1), y: (q[1] + 11).toFixed(1) }, m); }
  ej += k.segment([QX0, YF, TZ0], [QX0, YF, TZ1], P) + k.segment([QX0, YF, TZ0], [QX1, YF, TZ0], P);
  for (let i = 0; i < 6; i++) tx += E("text", "et" + i, { class: "t-eje", "text-anchor": "end" }, m);
  o.push(`<path class="cuadricula" d="${cu}"/>` + E("path", "cuad-t", { class: "cuadricula" }, m) + `<path class="eje" d="${ej}"/>` + E("path", "eje-0", { class: "eje" }, m) + tx);
  const qa = at([QX1, YF, TZ0]);
  o.push(`<text class="t-tablero" text-anchor="end" x="${qa[0].toFixed(1)}" y="${(qa[1] + 24).toFixed(1)}">${esc(J.figura.ejeQ)}</text>`);
  o.push(E("text", "t-ejeT", { class: "t-tablero", "text-anchor": "middle" }, m, esc(J.figura.ejeT)));
  return `<g data-parte="08">${o.join("")}</g>`;
}

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
function cuerpo(m) {
  return [
    placa(), soporte(), panel(m), tablilla(), parrilla(m), termometro(m),
    solidoE("agua", "agua", m, "05"),
    ...ORDEN_CUBOS.map(i => solidoE("ic" + i, "hielo", m, "04")),
    vaso(),
    `<g data-parte="08">` + E("path", "v-fus", { class: "plomo" }, m) + E("path", "curva", { class: "curva" }, m) + E("circle", "punto", { class: "punto", r: "3" }, m)
      + E("text", "t-meseta", { class: "t-curva" }, m) + E("text", "t-rampa", { class: "t-curva" }, m)
      + E("text", "t-vfus", { class: "t-valor" }, m) + E("text", "t-vfin", { class: "t-valor" }, m) + `</g>`,
    E("path", "fant", { class: "fantasma gruesa", "data-parte": "10" }, m),
    E("text", "fant-t", { class: "t-trampa", "text-anchor": "start", "data-parte": "10" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    E("text", "t-hielo", { class: "t-car", "data-parte": "04" }, m), E("text", "t-agua", { class: "t-car", "data-parte": "05" }, m),
    E("text", "t-temp", { class: "t-temp", "text-anchor": "end", "data-parte": "06" }, m, E("tspan", "t-tc", {}, m) + E("tspan", "t-tk", { dy: 13, class: "sec" }, m) + E("tspan", "t-tf", { dy: 12, class: "sec" }, m)),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { P, W, H, ESCV, RIc, RP, PAR, ZP0, ZPT, GX, GY, RI, RO, ZI, ZR, A0, OC, CUBOS, TX, TY, TAB, ZT1, ZS0, ZS1, GP, ZG1, YF, QX0, QX1, TZ0, TZ1, PERILLA, TERMO, PANT, ROT };
const estado0 = { m: VI.m, Tf: VI.Tf, q: 0, on: false, revelado: false, trampa: false };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, vista, calc, fase y escalas) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso, cylinder, slabOf };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/calor-y-temperatura-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/calor-y-temperatura-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles, ES = J.escena;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const RAPIDO = ES.aceleracion;   // la animación va RAPIDO veces más rápido que la parrilla real

let m = V.m, Tf = V.Tf, q = 0, on = false;
let revelado = false, trampaOn = false, sel = null, selRec = false, enRecorrido = false;
const numeros = () => {
  const d = calc(J, m, Tf), o = {};
  for (const x in d) o[x] = num(d[x]);
  o.pctFus = num(d.pctFus, 1); o.aceleracion = num(RAPIDO);
  const f = fase(d, q);
  o.qf = num(f.qf, 0); o.qc = num(f.qc, 0); o.q = num(f.q, 0); o.hielo = num(f.hielo, 0); o.T = num(f.T, 1);
  return o;
};

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#encender"), bTrampa = $("#trampa"), bExamen = $("#examen"), nota = $("#nota");
const SL = { m: $("#s-m"), Tf: $("#s-Tf") };

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#pred-t").textContent = J.prediccion.titulo;
$("#sum-imp").textContent = CT.profundizar;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
for (const x of ["m", "Tf"]) { $("#l-" + x).textContent = CT[x]; SL[x].min = RG[x].min; SL[x].max = RG[x].max; SL[x].step = RG[x].paso; }
stage.setAttribute("aria-valuemin", RG.m.min); stage.setAttribute("aria-valuemax", RG.m.max);
stage.setAttribute("aria-label", "Lámina: flechas izquierda y derecha cambian la masa del hielo; arriba y abajo, el termostato; B enciende o apaga la parrilla");

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
const OCULTOS = ["Qfus", "Qcal", "Q", "kQ", "kQfus", "kQcal", "pctFus", "QK", "QD", "kQK", "kQD", "QJ", "kQJ", "tFus", "tCal", "t"];
function valores(){
  const n = numeros();
  if (!rv()) for (const x of OCULTOS) n[x] = "?";
  return n;
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
    for (const x in v){
      const val = x === "_v" ? (v[x] ? "" : "none") : String(v[x]), clave = id + "|" + x;
      if (previo.get(clave) === val) continue; previo.set(clave, val);
      if (x === "_v") e.style.display = val; else if (x === "_t") e.textContent = val; else e.setAttribute(x, val);
    }
  }
}
const estado = () => ({ m, Tf, q, on, revelado: rv(), trampa: trampaOn });
const valorSl = (x, v) => tpl(x === "m" ? CT.valorM : CT.valorT, { v: num(v) });

function render(){
  const n = numeros(), o = valores(), d = calc(J, m, Tf), f = fase(d, q);
  aplicar(vista(C, K, estado(), J));
  // Panel
  $("#o-v").textContent = rv() ? `${n.kQ} kcal` : "? kcal";
  $("#o-formula").innerHTML = rv() ? tpl(L.formulaQ, n) : L.sinRevelar;
  for (const x of ["m", "Tf"]){
    const val = { m, Tf }[x], s = SL[x];
    $("#o-" + x).textContent = valorSl(x, val);
    s.style.setProperty("--p", (100 * (val - RG[x].min) / (RG[x].max - RG[x].min)) + "%");
    if (Math.abs(+s.value - val) > 1e-9) s.value = val;
    s.setAttribute("aria-valuetext", valorSl(x, val));
  }
  const sc = escalas(J, f.T);
  $("#o-qf").textContent = `${n.qf} cal`;
  $("#o-qc").textContent = `${n.qc} cal`;
  $("#o-t").textContent = `${n.T} °C · ${num(sc.K, 1)} K`;
  const lect = `Q ${n.q} cal · T ${n.T} °C · hielo ${n.hielo} g`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", m);
  stage.setAttribute("aria-valuetext", `${n.m} g de hielo, termostato en ${n.Tf} °C; van ${n.q} cal, el agua está a ${n.T} °C y quedan ${n.hielo} g de hielo` + (rv() ? `; en total hacen falta ${n.Q} cal` : ""));
  bPri.textContent = f.fin ? CT.listo : on ? CT.apagar : q > 0 ? CT.seguir : CT.encender;
  document.querySelectorAll(".rot-b").forEach(b => { const tt = tpl(J.rotulos[b.dataset.n][0], o), s = b.querySelector("span"); if (s.textContent !== tt) s.textContent = tt; });
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.fusion, tpl(L.fusionValor, o)],
    [L.calentar, tpl(L.calentarValor, o)],
    [L.total, tpl(L.totalValor, o) + "<br>" + tpl(L.escalasValor, o)],
    [L.trampa, tpl(L.trampaValor, o) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((x, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${x[0]}</span><span class="va">${x[1]}</span></li>`).join("");
  $("#impulso").innerHTML = J.profundizar.parrafos.map(p => `<p>${tpl(p, o)}</p>`).join("");
  if (sel) pintarFicha();
}

// ---------- Calor: q avanza P · RAPIDO calorías por segundo de reloj mientras la parrilla está encendida ----------
let anim = 0, pendiente = false, tMsg = 0;
function terminar(){
  on = false; pendiente = false;
  const n = numeros();
  decir(tpl(L.mensajeFin, n));
  if (trampaOn) nota.textContent += " " + tpl(L.mensajeTrampa, n);
  render();
}
function correr(){
  cancelAnimationFrame(anim); pendiente = true;
  const d = calc(J, m, Tf);
  if (quieto){   // sin animación: cada toque llega al final del tramo (fin de la meseta, luego fin de la rampa)
    const antes = fase(d, q).meseta;
    q = antes ? d.Qfus : d.Q; anim = 0;
    if (fase(d, q).fin) terminar(); else { on = false; pendiente = false; decir(tpl(L.mensajeApagado, numeros())); render(); }
    return;
  }
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.max(0, Math.min(0.05, (ahora - antes) / 1000)); antes = ahora;
    const eraMeseta = fase(d, q).meseta;
    q = Math.min(d.Q, q + d.P * RAPIDO * dt); tMsg += dt;
    const f = fase(d, q);
    if (eraMeseta && !f.meseta) decir(tpl(L.mensajeRampa, numeros()));
    else if (f.meseta && tMsg > 2) { tMsg = 0; decir(tpl(L.mensajeFusion, numeros())); }
    render();
    if (!f.fin) anim = requestAnimationFrame(paso); else { anim = 0; terminar(); }
  };
  render(); anim = requestAnimationFrame(paso);
}
function detener(){ cancelAnimationFrame(anim); anim = 0; pendiente = false; }
function encender(){
  on = true; revelado = true; tMsg = 0;
  decir(fase(calc(J, m, Tf), q).meseta ? tpl(L.mensajeFusion, numeros()) : tpl(L.mensajeRampa, numeros()));
  correr();
}
function apagar(){ detener(); on = false; decir(tpl(L.mensajeApagado, numeros())); render(); }
function hieloNuevo(){ detener(); on = false; q = 0; }
function principal(){
  const f = fase(calc(J, m, Tf), q);
  if (f.fin){ hieloNuevo(); decir(tpl(L.mensajeCambio, numeros())); render(); }
  else if (on) apagar(); else encender();
}

// ---------- Perilla: tocarla enciende o apaga (es el mismo control principal) ----------
const perilla = $("#aguja-p").closest("g");
$("#piloto").parentNode.addEventListener("click", (e) => { if (!e.target.closest("#rot")) { tomarControl(); principal(); } });
perilla.classList.add("toque");

// ---------- Recorrido automático: recorre los rótulos sin encender ni mostrar el resultado; se detiene al tocar ----------
const REC = C.ROT.filter(n => n !== "10");
let tRec = 0, iRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  selRec = true; setSel(REC[iRec % REC.length]); iRec++; render();
  tRec = setTimeout(pasoRecorrido, 2400);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim || on || q > 0){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe ni tapa lo que hizo el usuario
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
  hieloNuevo(); m = V.m; Tf = V.Tf; revelado = false;
  if (trampaOn) apagarTrampa();
  decir(tpl(L.mensajeReinicio, numeros())); render();
});
function apagarTrampa(){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){
    revelado = true; decir(tpl(L.mensajeTrampa, numeros()));
    if (!on && q === 0) encender(); else render();
  } else render();
});
for (const x of ["m", "Tf"]){
  SL[x].addEventListener("input", () => {
    hieloNuevo(); revelado = false;
    if (x === "m") m = +SL.m.value; else Tf = +SL.Tf.value;
    render();
  });
  SL[x].addEventListener("change", () => { decir(tpl(L.mensajeCambio, numeros())); render(); });
}
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
const pasoR = (x, v) => Math.max(RG[x].min, Math.min(RG[x].max, Math.round(v / RG[x].paso) * RG[x].paso));
stage.addEventListener("keydown", (e) => {
  const dm = {ArrowRight:1, ArrowLeft:-1}[e.key], dT = {ArrowUp:1, ArrowDown:-1}[e.key];
  if (dm === undefined && dT === undefined) return;
  e.preventDefault(); hieloNuevo(); revelado = false;
  if (dm) m = pasoR("m", m + dm * RG.m.paso); else Tf = pasoR("Tf", Tf + dT * RG.Tf.paso);
  decir(tpl(L.mensajeCambio, numeros())); render(); pintarPrediccion();
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
// «Predice»: las opciones salen de las fórmulas del JSON con la masa y el termostato de los deslizadores (en el orden del examen)
const LETRAS = ["A", "B", "C", "D"];
function pintarPrediccion(){
  const d = calc(J, m, Tf), n = numeros();
  $("#pred-q").innerHTML = tpl(J.prediccion.pregunta, n);
  const ops = J.prediccion.opciones.map((x, i) => ({ ok: !!x.correcta, e: tpl(x.retro, n), t: `${LETRAS[i]}) ${num(evalua(x.formula, d))} ${J.prediccion.unidad}` }));
  opciones($("#pred-ops"), ops, () => {
    tomarControl(); if (trampaOn) apagarTrampa();
    hieloNuevo(); encender();
  });
}
pintarPrediccion();
for (const x of ["m", "Tf"]) SL[x].addEventListener("change", pintarPrediccion);
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

$("#pie").innerHTML = `<i>${J.figura.pie}</i> Modelo: el vaso (${num(ES.vasoMl)} mL, ${num(ES.altoVaso)} cm de alto), los cubos de hielo (${num(ES.gramosPorCubo)} g cada uno, densidad ${num(ES.densidadHielo, 3)} g/cm³) y el agua están a escala entre sí; la parrilla, el termómetro, su soporte y el panel no.
 El hielo se encoge parejo mientras se derrite y flota cuando el agua lo alcanza; el agua y el hielo están a 0 °C mientras quede hielo. La curva sí va a escala: su eje de calor se ajusta a la masa y al termostato.
 La parrilla entrega ${num(V.P)} cal/s y la animación va ${num(RAPIDO)} veces más rápido; el termostato la apaga al llegar a la temperatura final. Al apagarla, el agua derretida no se vuelve a congelar: para eso habría que quitarle calor.
 Si nadie toca, la lámina recorre sus partes sin encender ni mostrar el resultado. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B enciende o apaga; con la lámina enfocada, ← → cambian la masa y ↑ ↓ el termostato. También puedes tocar la perilla.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#encender", "#trampa", "#bloque-m"].map(s => $(s));
const arr = null;
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
window.__calor = { set:(o) => { if ("m" in o) m = o.m; if ("Tf" in o) Tf = o.Tf; if ("q" in o) q = o.q; if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa; render(); },
  sel:seleccionar, completa:entrar, salir, Q:() => calc(J, m, Tf).Q, estado:() => ({ m, Tf, q, on, revelado, trampaOn }),
  alto:() => { enRecorrido = false; clearTimeout(tRec); detener(); on = false; if (selRec){ selRec = false; setSel(null); } render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de calor y temperatura) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados tal cual del generador de cantidad de movimiento (Arquímedes v2).
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
/* Propio de calor y temperatura (también va en el SVG fijo) */
.agua>.iso-fill{fill:var(--agua-1);fill-opacity:.82} .agua>.iso-top{fill:var(--agua-sup)}
.agua>.iso-shade[data-shade="0"]{fill:var(--agua-2);opacity:.8} .agua>.iso-shade[data-shade="1"]{fill:color-mix(in srgb,var(--agua-2) 70%,var(--agua-1));opacity:.8}
.agua>.iso-shade[data-shade="2"]{fill:color-mix(in srgb,var(--agua-2) 40%,var(--agua-1));opacity:.8} .agua>.iso-shade[data-shade="3"]{fill:var(--agua-1);opacity:.8}
.agua>.iso-edge{stroke:var(--agua-2)}
.hielo>.iso-fill,.hielo>.iso-top{fill:color-mix(in srgb,var(--agua-sup) 60%,var(--anatomy-top))}
.hielo>.iso-shade[data-shade="0"]{fill:color-mix(in srgb,var(--agua-1) 75%,var(--anatomy-shade-0))} .hielo>.iso-shade[data-shade="1"]{fill:color-mix(in srgb,var(--agua-1) 60%,var(--anatomy-shade-1))}
.hielo>.iso-shade[data-shade="2"]{fill:color-mix(in srgb,var(--agua-sup) 65%,var(--anatomy-shade-2))} .hielo>.iso-shade[data-shade="3"]{fill:color-mix(in srgb,var(--agua-sup) 55%,var(--anatomy-shade-3))}
.hielo>.iso-edge{stroke:var(--agua-2)}
.vidrio>.iso-fill{fill:var(--agua-sup);fill-opacity:.16} .vidrio>.iso-shade{opacity:.18} .vidrio>.iso-top{fill:none}
.vidrio-t>.iso-fill{fill:var(--anatomy-top);fill-opacity:.55} .vidrio-t>.iso-shade{opacity:.3} .vidrio-t>.iso-top{fill:none}
.columna>.iso-fill,.columna>.iso-top,.columna>.iso-shade{fill:var(--rubrica)} .columna>.iso-edge{stroke:var(--rubrica)}
.bobina{fill:none;stroke:var(--anatomy-lo);stroke-width:.7} .bobina.on{stroke:var(--rubrica);stroke-width:1.1}
.piloto>.iso-fill,.piloto>.iso-top{fill:var(--anatomy-faint)} .piloto.on>.iso-fill,.piloto.on>.iso-top{fill:var(--rubrica)}
.aguja{fill:none;stroke:var(--anatomy-strong);stroke-width:1.2;stroke-linecap:round}
.pantalla-q>.iso-fill,.pantalla-q>.iso-top,.pantalla-q>.iso-shade{fill:color-mix(in srgb,var(--acento) 16%,var(--anatomy-shade-0))}
.t-cont{font-family:var(--anatomy-mono);font-weight:600;fill:var(--acento);font-variant-numeric:tabular-nums}
.graduacion{fill:none;stroke:var(--anatomy-mid);stroke-width:.7}
.t-ml{font:500 7px var(--anatomy-mono);fill:var(--anatomy-muted)}
.tk{fill:none;stroke-width:.6} .tk.menor{stroke:var(--anatomy-lo)} .tk.mayor{stroke:var(--anatomy-mid)}
.t-esc{font:500 7.5px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.t-cab{font:italic 500 10px var(--serif);fill:var(--anatomy-strong)}
.cuadricula{fill:none;stroke:var(--anatomy-faint);stroke-width:.6} .eje{fill:none;stroke:var(--anatomy-mid);stroke-width:.9}
.t-eje{font:500 8px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.t-tablero{font:italic 500 12px var(--serif);fill:var(--anatomy-text)}
.curva{fill:none;stroke:var(--rubrica);stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round}
.punto{fill:var(--rubrica);stroke:var(--sup);stroke-width:1.2}
.plomo{fill:none;stroke:var(--rubrica);stroke-width:.8;stroke-dasharray:1.5 2}
.t-curva{font:italic 500 11px var(--serif);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-valor{font:500 10px var(--anatomy-mono);fill:var(--anatomy-strong);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-car{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-strong);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-temp{font:500 14px var(--serif);fill:var(--rubrica);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-temp .sec{font-size:11px;fill:var(--anatomy-text)}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3} .fantasma.gruesa{stroke-width:1.8}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de calor y temperatura */
.escena .iso-plate-corner[data-corner="hint"]{max-width:52%}
.toque{cursor:pointer}
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px}
.escala{flex:1;min-width:0;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums}
.grande{font-size:clamp(2rem,8vw,3rem)}
.profundizar+.profundizar{border-top:none;padding-top:0}
#impulso p{margin:6px 0;max-width:62ch}
@media (max-width:560px){.escena .t-car,.escena .t-valor{font-size:13px}.escena .t-temp{font-size:20px}.escena .t-temp .sec{font-size:15px}.escena .t-trampa{font-size:15px}.escena .t-tablero{font-size:15px}
  .escena .t-esc{font-size:10.5px}.escena .t-cab{font-size:13px}.escena .t-eje{font-size:12px}.escena .t-curva{font-size:15px}.escena .t-ml{display:none}.escena .rot circle{r:11px}.escena .rot text{font-size:12px}}
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
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .modo-lamina .compacto #bloque-m{grid-column:1/-1}
  .modo-lamina .compacto .boton{white-space:normal;padding:8px 12px;line-height:1.2}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el del examen, terminado, con la trampa) ----------
function svgFijo() {
  const d = calc(J, VI.m, VI.Tf);
  const s = { m: VI.m, Tf: VI.Tf, q: d.Q, on: false, revelado: true, trampa: true };
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
  readout: "Q 0 cal",
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
        <h3 id="pred-t">Predice antes de encender</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
        <p class="gira" aria-hidden="true">Gira el teléfono para verla más grande</p>
        <div class="iso escena">${plate}</div>
        <div class="barra-lamina">
          <span class="escala" id="escala">Escala: vaso, hielo y agua en centímetros; curva en kcal y °C</span>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="c-v">${esc(J.lecturas.total)}</span>
          <output id="o-v" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-m"><div class="fila"><label for="s-m" id="l-m"></label><output id="o-m"></output></div><input type="range" id="s-m"></div>
          <div id="bloque-tf"><div class="fila"><label for="s-Tf" id="l-Tf"></label><output id="o-Tf"></output></div><input type="range" id="s-Tf"></div>
        </div>
        <div class="chips">
          <div class="chip"><span>Fusión · m·L</span><output id="o-qf"></output></div>
          <div class="chip"><span>Calentar · m·c·ΔT</span><output id="o-qc"></output></div>
          <div class="chip"><span>Termómetro</span><output id="o-t"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="encender" aria-keyshortcuts="b">Encender</button>
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
<script type="module">${(kitScript() + `\nconst evalua = ${evalua.toString()};\nconst calc = ${calc.toString()};\nconst fase = ${fase.toString()};\nconst escalas = ${escalas.toString()};\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
