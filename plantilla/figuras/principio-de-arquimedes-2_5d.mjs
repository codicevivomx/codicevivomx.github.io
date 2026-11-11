// Lámina 2.5D+ del principio de Arquímedes: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/principio-de-arquimedes-2_5d.mjs                → plantilla/interactivos/principio-de-arquimedes/plus/index.html
//                                                                          y contenido/fisica/img/principio-de-arquimedes.svg (figura fija para PDF y video)
//   node plantilla/figuras/principio-de-arquimedes-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de la tercera ley (plantilla/figuras/leyes-de-newton-3-2_5d.mjs): misma página, pantalla completa,
// evaluador de fórmulas y salida .svg; otro dibujo (soporte, dinamómetro, cubo, vaso de derrame, probeta y balanza) y otra lógica
// (el cubo baja por fases; el dinamómetro marca P − E y la balanza pesa el agua desalojada, que vale E).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "principio-de-arquimedes";
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
// Variables de entrada: lado l, densidades (líquido, cubo según el material, hierro), g y la profundidad h del fondo del cubo
// (negativa = sobre el agua). hs es la parte sumergida: entre 0 y l.
// Vp es el agua que ya salió a la probeta (m³). El nivel del vaso (zn, en m respecto al pico; 0 o negativo) sale de conservar
// el agua: vaso de área A lleno hasta el pico menos Vp, con el cubo (sección l²) metido hasta donde llegue. Si el nivel pasara
// del pico, lo que sobra se derrama y Vp crece. hs es la parte sumergida del cubo con ese nivel.
function calc(J, h, mat, Vp = 0) {
  const V0 = J.valoresIniciales, ES = J.escena;
  const l = V0.lado, A = Math.PI * ES.radioVaso * ES.radioVaso, a = l * l, H0 = ES.alturaAgua;
  const dentro = (z) => Math.min(Math.max(z + h, 0), l);
  const W = A * H0 - Vp;
  let z = W / A - H0;
  if (z + h > 0){ z = (W - A * H0 + a * h) / (A - a); if (z + h >= l) z = (W + a * l) / A - H0; }
  if (z > 0){ Vp = a * dentro(0); z = 0; }
  const v = { l, rhoL: V0.rhoLiquido, rhoC: mat === "cu" ? ES.rhoCobre : V0.rhoCubo, rhoFe: ES.rhoHierro, g: V0.g, h,
    Vp, zn: z, hs: dentro(z) };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}

// ---------- Modelo del dibujo (unidades del mundo = cm; z hacia arriba; el frente es +y) ----------
// El cubo, el vaso, el agua, la probeta y la regla están a la misma escala; el soporte y el dinamómetro no; las flechas tampoco.
const VI = J.valoresIniciales, RG = J.rangos, ES = J.escena;
const CM = 100;                                   // unidades por metro
const LADO = VI.lado * CM;
const VX = -10, VR = 11, VZ0 = 12, FONDO = 1, BORDE = 41;                             // vaso de derrame
const VRW = ES.radioVaso * CM, ZF0 = VZ0 + FONDO, NIVEL = ZF0 + ES.alturaAgua * CM;    // agua: radio y nivel del pico (del JSON)
const PED = { x: -25, y: -13, w: 28, d: 26, r: 1.5 };                                  // pedestal del vaso (alto VZ0)
const BAL = { x: 6, y: -9, w: 20, d: 18, r: 1.2 }, BAL_H = 4.5, BZ0 = BAL_H + 0.8;    // balanza y su platillo
const PX = 16, PR = 6, PRI = 5.5, PZ0 = BZ0 + 0.6, PZ1 = BZ0 + 16;                     // probeta (radio interior PRI)
const AREA_P = Math.PI * PRI * PRI;                                                    // cm² de la probeta
const PICO = { x: VX + VR - 1.5, y: -1.4, w: 13, d: 2.8, r: 0.4 }, PICO_Z = NIVEL - 1.4, XCH = 12;
const VAR = { x: -34, r: 1.1, z1: 96 };                                                // varilla del soporte
const ZA0 = 70;                                                                        // brazo dibujado a esta altura y luego trasladado
const DH = { z0: 18, z1: 30, R: 4.6, zc: 24, yf: 1.8 };                                // dinamómetro: alturas sobre el fondo del cubo
const L0 = 6, KS = 0.1;                                                                // resorte: largo sin carga y cm por N (dibujo)
const KF = 1.8, EXF = 0.6;                                                             // flechas: largo = KF · F^EXF (no van a escala)
const REGLA = { x: -24.6, y: 10.4, w: 2.6, d: 1.1, r: 0.2 };
const PLACA = { x: -48, y: -16, w: 82, d: 32, r: 5 }, PLACA_H = 5, PATA_H = 5;
const FASES = ES.fases;

const W = 600, H = 620;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [VAR.x, 0, VAR.z1 + 2], [VX, 0, VAR.z1 + 2], [PX + 10, 0, 30]],
  W, H, { pad: 14, azimuth: 66, elevation: 22 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const RISE = k.screenRise(1, P);
const [TVX, TVY] = k.towardViewer(P);
const T0 = Math.atan2(TVY, TVX);                     // ángulo (en planta) que mira a la cámara

// Mitad cercana de un cilindro: arcos arriba y abajo y las dos siluetas (para el vidrio por delante)
function frente(cx, cy, r, z0, z1) {
  const arco = (z) => { const q = []; for (let i = 0; i <= 24; i++) { const t = T0 - Math.PI / 2 + Math.PI * i / 24; q.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } return k.onTop(q, z, P); };
  const lado = (t) => k.segment([cx + r * Math.cos(t), cy + r * Math.sin(t), z0], [cx + r * Math.cos(t), cy + r * Math.sin(t), z1], P);
  return arco(z1) + arco(z0) + lado(T0 - Math.PI / 2) + lado(T0 + Math.PI / 2);
}
// Punto en el borde de un cilindro, a un ángulo t (en planta) del lado que mira a la cámara
const borde = (cx, cy, r, t, z) => [cx + r * Math.cos(T0 + t), cy + r * Math.sin(T0 + t), z];

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
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
  const iso = (p) => K.iso(p, P);
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  const seg = (a, b) => "M" + pt(iso(a)) + "L" + pt(iso(b));
  const borde = (cx, cy, r, t, z) => [cx + r * Math.cos(C.T0 + t), cy + r * Math.sin(C.T0 + t), z];
  const d = calc(J, s.h, s.mat, s.Vp), rv = s.revelado;
  const n = { E: num(d.E, 1), P: num(d.P, 1), Pap: num(d.Pap, 1), cm3: num(d.cm3, 0), Eprob: num(d.Eprob, 1), cm3prob: num(d.cm3prob, 0) };
  const m = {};

  // Posiciones: el fondo del cubo (cb) sale de h; el brazo, de cb más el resorte estirado según lo que marca
  const cb = C.NIVEL - s.h * C.CM;
  const ext = C.KS * d.Pap;
  const zArm = cb + C.DH.z1 + 1.6 + C.L0 + ext + 1.6;
  const dz = cb - C.NIVEL;
  m["brazo"] = { transform: K.translateAlong(P, [0, 0, zArm - C.ZA0]) };
  m["colg-cubo"] = { transform: K.translateAlong(P, [0, 0, dz]) };
  m["colg-din"] = { transform: K.translateAlong(P, [0, 0, dz]) };
  m["cubo-al"] = { _v: s.mat !== "cu" }; m["cubo-cu"] = { _v: s.mat === "cu" };

  // Resorte: hélice entre el gancho del brazo y el ojillo del dinamómetro (atrás tenue, adelante firme)
  const zt = zArm - 1.6, zb = cb + C.DH.z1 + 1.6, vueltas = 9, pasos = vueltas * 16;
  let atras = "", adelante = "", run = [], cerca = null;
  for (let i = 0; i <= pasos; i++) {
    const a = 2 * Math.PI * i / 16, z = zt + (zb - zt) * i / pasos;
    const q = iso([C.VX + 1.3 * Math.cos(a), 1.3 * Math.sin(a), z]);
    const c = Math.cos(a) * C.TV[0] + Math.sin(a) * C.TV[1] > 0;
    if (cerca === null) cerca = c;
    run.push(q);
    if (c !== cerca || i === pasos) {
      const dd = "M" + run.map(pt).join("L");
      if (cerca) adelante += dd; else atras += dd;
      run = [q]; cerca = c;
    }
  }
  m["res-atras"] = { d: atras }; m["res-frente"] = { d: adelante + seg([C.VX, 0, zt + 0.8], [C.VX, 0, zt]) + seg([C.VX, 0, zb], [C.VX, 0, zb - 0.8]) };

  // Aguja del dinamómetro (en coordenadas del grupo colgante, que se traslada con el cubo)
  const a = -0.75 * Math.PI + 1.5 * Math.PI * Math.min(1, Math.max(0, d.Pap) / C.DINMAX), R = 0.8 * C.DH.R, zc = C.NIVEL + C.DH.zc;
  m["aguja"] = { d: seg([C.VX, C.DH.yf + 0.1, zc], [C.VX + R * Math.sin(a), C.DH.yf + 0.1, zc + R * Math.cos(a)]) };
  const pdn = iso([C.VX - 6, C.DH.yf, cb + C.DH.zc]);
  m["t-din"] = { x: (pdn[0] - 5).toFixed(1), y: (pdn[1] + 4).toFixed(1), _t: tpl(J.figura.din, n) };

  // Agua del vaso: su nivel baja si ya salió agua y el cubo no está tan hondo
  const zl = C.NIVEL + d.zn * C.CM, cyl = K.cylinder(C.VX, 0, C.VRW, C.ZF0, zl - C.ZF0, P, 56);
  m["va-fill"] = { d: cyl.fill }; m["va-top"] = { d: cyl.top }; m["va-edge"] = { d: cyl.outline };
  for (let i = 0; i < 4; i++) m["va-s" + i] = { d: cyl.shades[i] || "" };
  const arco = []; for (let i = 0; i <= 24; i++) { const t = C.T0 - Math.PI / 2 + Math.PI * i / 24; arco.push([C.VX + C.VRW * Math.cos(t), C.VRW * Math.sin(t)]); }
  m["sup-agua"] = { d: K.onTop(arco, zl, P) };
  // Raya «máx»: lo más hondo que llegó el fondo del cubo desde el último reinicio (se ve si ya salió agua)
  const zmx = C.NIVEL - s.hMax * C.CM, vmx = d.Vp > 1e-9 && zmx > C.VZ0 + 0.2 && zmx < C.BORDE;
  m["max-h"] = vmx ? { _v: true, d: seg([C.REGLA.x - 0.6, C.REGLA.y + C.REGLA.d + 0.05, zmx], [C.REGLA.x + C.REGLA.w + 1.4, C.REGLA.y + C.REGLA.d + 0.05, zmx]) } : { _v: false };
  const pmx = iso([C.REGLA.x + C.REGLA.w + 1.8, C.REGLA.y + C.REGLA.d, zmx]);
  m["t-max"] = { _v: vmx, x: pmx[0].toFixed(1), y: (pmx[1] + 3).toFixed(1) };
  // Velo de agua sobre la parte sumergida del cubo y raya en la regla
  const hs = d.hs * C.CM;
  m["velo"] = hs > 0.01 ? { _v: true, d: K.slabOf({ x: C.VX - 5, y: -5, w: 10, d: 10, r: 0.3 }, cb, hs, P, 2).fill } : { _v: false };
  const vr = cb > C.VZ0 + 0.2 && cb < C.BORDE;
  m["marca-h"] = vr ? { _v: true, d: seg([C.REGLA.x - 0.6, C.REGLA.y + C.REGLA.d + 0.05, cb], [C.REGLA.x + C.REGLA.w, C.REGLA.y + C.REGLA.d + 0.05, cb]) } : { _v: false };

  // Probeta: el agua desalojada (cm³ ÷ área = altura) y su lectura; chorro mientras sale agua
  const hw = d.cm3prob / C.AREA_P, zw = C.PZ0 + hw;
  if (hw > 0.02) {
    const cy = K.cylinder(C.PX, 0, C.PRI, C.PZ0, hw, P, 40);
    m["pw-f"] = { _v: true, d: cy.fill }; m["pw-t"] = { _v: true, d: cy.top };
  } else { m["pw-f"] = { _v: false }; m["pw-t"] = { _v: false }; }
  const pp = iso([C.PX + C.PR + 1.2, 0, Math.max(zw, C.PZ0 + 1)]);
  m["t-prob"] = { x: pp[0].toFixed(1), y: (pp[1] + 4).toFixed(1), _t: tpl(J.figura.probeta, n) };
  m["chorro"] = s.flujo ? { _v: true, d: seg([C.XCH, 0, C.PICO_Z], [C.XCH, 0, zw]) } : { _v: false };
  m["pico-agua"] = { _v: !!s.flujo };
  const pb = iso([C.PX, C.BAL.y + C.BAL.d, 2.0]);
  m["t-bal"] = { x: pb[0].toFixed(1), y: (pb[1] + 3.5).toFixed(1), _t: tpl(J.figura.balanza, n) };

  // Flechas: peso hacia abajo y empuje hacia arriba, desde el centro del cubo, sobre su cara de enfrente
  const flecha = (id, p0, p1, texto, ver, lado) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    if (!ver || l < 2) { m[id] = { _v: false }; return; }
    const ux = dx / l, uy = dy / l, cab = Math.min(8, l * 0.6), an = cab * 0.5, bx = p1[0] - ux * cab, by = p1[1] - uy * cab;
    m[id] = { _v: true };
    m[id + "-l"] = { x1: p0[0].toFixed(1), y1: p0[1].toFixed(1), x2: (bx + ux).toFixed(1), y2: (by + uy).toFixed(1) };
    m[id + "-p"] = { points: `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${(bx - uy * an).toFixed(1)},${(by + ux * an).toFixed(1)} ${(bx + uy * an).toFixed(1)},${(by - ux * an).toFixed(1)}` };
    m[id + "-t"] = { x: (p1[0] + lado * 7).toFixed(1), y: (lado > 0 ? (p0[1] + p1[1]) / 2 + 4 : p1[1] + (uy > 0 ? 2 : 6)).toFixed(1), "text-anchor": lado > 0 ? "start" : "end", _t: texto };
  };
  const largo = (F) => C.KF * Math.pow(Math.max(0, F), C.EXF);
  // El peso sale del centro del cubo (cara de enfrente); el empuje, junto a su cara derecha, para no tapar el dinamómetro
  const zc0 = cb + C.LADO / 2, yF = 5.4, xE = C.VX + C.LADO / 2 + 1.8;
  flecha("fl-P", iso([C.VX, yF, zc0]), iso([C.VX, yF, zc0 - largo(d.P)]), tpl(J.figura.P, n), true, -1);
  flecha("fl-E", iso([xE, 0, zc0]), iso([xE, 0, zc0 + largo(d.E)]), rv ? tpl(J.figura.E, n) : J.figura.Einc, d.E > 0, 1);
  m["pie-E"] = { _v: d.E > 0 || !!s.trampa, d: seg([C.VX + C.LADO / 2, 0, zc0], [xE, 0, zc0]) };
  // Trampa: flecha punteada del empuje si valiera el peso
  flecha("fl-T", iso([xE, 0, zc0]), iso([xE, 0, zc0 + largo(d.P)]), "", !!s.trampa, 1);
  const pf = iso([xE, 0, zc0 + largo(d.P)]);
  m["fant-t"] = { _v: !!s.trampa, x: (pf[0] + 8).toFixed(1), y: (pf[1] - 8).toFixed(1) };
  m["fant-1"] = { x: (pf[0] + 8).toFixed(1), _t: tpl(J.trampa.fantasma, n) };
  m["fant-2"] = { x: (pf[0] + 8).toFixed(1), _t: tpl(J.trampa.real, { E: rv ? n.E : "?" }) };

  // Rótulos
  const rot = (nn, p, ver = true) => { m["rot-" + nn] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  rot("01", mas(iso([C.VAR.x, 0, 30]), -14, 0));
  rot("02", mas(iso([C.VX, 0, (zt + zb) / 2]), -16, 0));
  rot("03", mas(iso([C.VX - 6, C.DH.yf, cb + C.DH.z1]), -10, -6));
  rot("04", mas(iso([C.VX - 5, 5, cb + C.LADO * 0.7]), -12, 0));
  rot("05", mas(iso(borde(C.VX, 0, C.VR, -1.3, C.VZ0 + 8)), 12, 0));
  rot("06", mas(iso([C.PICO.x + C.PICO.w - 1, 0, C.NIVEL]), 2, -12));
  rot("07", mas(iso(borde(C.PX, 0, C.PR, 1.1, C.PZ1 - 2)), 12, 0));
  rot("08", mas(iso([C.BAL.x + C.BAL.w, C.BAL.y + C.BAL.d, 0]), 12, 0));
  rot("09", mas(iso([C.VX, yF, zc0 - largo(d.P)]), 12, 4));
  rot("10", mas(iso([xE, 0, zc0 + largo(d.E)]), 0, -14), d.E > 0 && !s.trampa);
  rot("11", mas(iso([C.REGLA.x, C.REGLA.y + C.REGLA.d, C.VZ0 + 4]), -12, 0));
  rot("12", mas(pf, -12, -4), !!s.trampa);
  return m;
}

// ---------- Piezas fijas ----------
function placa() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLACA, -PLACA_H - PATA_H, PLACA_H, P)}"/>`];
  const patas = k.corners(PLACA, 10).sort((a, b) => prof(a) - prof(b));
  for (const [x, y] of patas) {
    o.push(S(k.cylinder(x, y, 4.5, -PLACA_H - PATA_H, 1.4, P, 28), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 3.4, -PLACA_H - PATA_H + 1.4, PATA_H - 1.4, P, 28), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLACA, -PLACA_H, PLACA_H, P, 8, 1.4), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PLACA, 3.5), 0, P), { tone: "lo" }));
  const torn = k.corners(PLACA, 6);
  o.push(L(torn.map(([x, y]) => k.ring(x, y, 1.5, 0, P, 16)).join(""), { tone: "lo" }));
  o.push(D(torn.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Placa de datos grabada al frente, a la derecha (delante de la balanza)
  const pl = { x: BAL.x - 1, y: PLACA.y + PLACA.d - 4.4, w: 25, d: 2.4, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 2, pl.y + 1.7], 0.4, P, "x"), J.figura.placa, { size: 1.05, tone: "lo" }));
  o.push(D([at([pl.x + 1.1, pl.y + 1.3, 0.4]), at([pl.x + pl.w - 1.1, pl.y + 1.3, 0.4])], { size: 0.4 }));
  return `<g data-parte="01">${o.join("")}</g>`;
}

// Soporte: varilla con su base y el brazo con nuez y perilla (el brazo se traslada en z)
function varilla() {
  return `<g data-parte="01">` + S(k.cylinder(VAR.x, 0, 3.2, 0, 1.8, P, 32, 0.3), { tone: "mid" })
    + S(k.cylinder(VAR.x, 0, VAR.r, 1.8, VAR.z1 - 1.8, P, 20), { tone: "hi" })
    + S(k.cylinder(VAR.x, 0, VAR.r + 0.2, VAR.z1, 0.6, P, 20, 0.2), { tone: "mid" }) + `</g>`;
}
function brazo(m) {
  const nuez = { x: VAR.x - 2.6, y: -2.6, w: 5.2, d: 5.2, r: 0.6 };
  const br = { x: VAR.x + 2.6, y: -1, w: VX + 1 - (VAR.x + 2.6), d: 2, r: 0.4 };
  const per = { x: VAR.x - 1.2, y: 2.6, w: 2.4, d: 1.6, r: 0.5 };
  let estrias = "";
  for (let i = 0; i < 5; i++) { const x = per.x + 0.4 + i * 0.4; estrias += k.segment([x, per.y + per.d, ZA0 + 0.9], [x, per.y + per.d, ZA0 + 2.3], P); }
  const o = [
    S(k.slabOf(br, ZA0, 1.8, P, 3, 0.2), { tone: "hi" }),
    S(k.slabOf(nuez, ZA0 - 1.6, 5.2, P, 4, 0.3), { tone: "mid" }),
    S(k.slabOf(per, ZA0 + 0.6, 2, P, 3, 0.2), { tone: "lo" }) + L(estrias, { tone: "lo" }),
    L(k.sideRing([VX, 0, ZA0 - 0.8], 0.8, "x", P, 16), { tone: "hi" }),
  ];
  return E("g", "brazo", { "data-parte": "01" }, m, o.join(""));
}

// Pedestal, vaso de derrame (vidrio), agua, regla y pico
function pedestal() {
  return `<g data-parte="05">` + S(k.slabOf(PED, 0, VZ0, P, 6, 0.6), { tone: "mid" })
    + L(k.planOutline(k.insetPlan(PED, 1.6), VZ0, P), { tone: "faint" }) + `</g>`;
}
function vasoAtras(m) {
  return `<g data-parte="05">` + S(k.cylinder(VX, 0, VR, VZ0, BORDE - VZ0, P, 56), { tone: "lo", className: "vidrio" })
    + S(k.cylinder(VX, 0, VR - 0.2, VZ0, FONDO, P, 56), { tone: "faint", className: "vidrio-fondo" })
    + `<g class="iso-solid agua">` + E("path", "va-fill", { class: "iso-fill" }, m)
    + [0, 1, 2, 3].map((i) => E("path", "va-s" + i, { class: "iso-shade", "data-shade": i }, m)).join("")
    + E("path", "va-top", { class: "iso-top" }, m) + E("path", "va-edge", { class: "iso-line iso-edge", "data-tone": "lo" }, m) + `</g></g>`;
}
function vasoFrente(m) {
  // Superficie del agua por delante del cubo (la mueve la vista) y vidrio por delante
  return `<g data-parte="05">` + E("path", "sup-agua", { class: "sup-agua" }, m)
    + L(frente(VX, 0, VR, VZ0, BORDE), { tone: "lo", className: "vidrio-frente" })
    + L(k.ring(VX, 0, VR - 0.6, BORDE, P, 56), { tone: "faint" }) + `</g>`;
}
function pico(m) {
  return `<g data-parte="06">` + S(k.slabOf(PICO, PICO_Z, 1.2, P, 3, 0.15), { tone: "mid", className: "vidrio-pico" })
    + E("path", "pico-agua", { class: "chorro", d: k.segment([PICO.x + 1, 0, PICO_Z + 1.25], [PICO.x + PICO.w - 0.5, 0, PICO_Z + 1.25], P) }, m)
    + `</g>`;
}
function regla(m) {
  let tk = "";
  const yf = REGLA.y + REGLA.d + 0.02, et = [];
  for (let i = 0; NIVEL - i > VZ0 + 0.5; i++) {
    const largo = i % 5 === 0 ? 1.6 : 0.8;
    tk += k.segment([REGLA.x + REGLA.w - largo, yf, NIVEL - i], [REGLA.x + REGLA.w, yf, NIVEL - i], P);
    if (i % 5 === 0) et.push([i, at([REGLA.x - 0.6, yf, NIVEL - i])]);
  }
  const txt = et.map(([i, p]) => `<text class="t-regla" text-anchor="end" x="${p[0].toFixed(1)}" y="${(p[1] + 3).toFixed(1)}">${i}${i === 10 ? " cm" : ""}</text>`).join("");
  return `<g data-parte="11">` + S(k.slabOf(REGLA, VZ0, BORDE - VZ0, P, 2), { tone: "lo" })
    + `<path class="tk mayor" d="${tk}"/>` + txt + E("path", "max-h", { class: "max-h" }, m)
    + E("text", "t-max", { class: "t-max" }, m, esc(J.figura.maximo)) + E("path", "marca-h", { class: "marca-h" }, m) + `</g>`;
}

// Balanza con platillo y pantalla; probeta graduada con el agua desalojada
function balanza(m) {
  const yf = BAL.y + BAL.d + 0.03;
  const ventana = [[PX - 5.5, yf, 1], [PX + 5.5, yf, 1], [PX + 5.5, yf, 3.6], [PX - 5.5, yf, 3.6]].map(at);
  return `<g data-parte="08">` + S(k.slabOf(BAL, 0, BAL_H, P, 6, 0.5), { tone: "mid" })
    + S(k.cylinder(PX, 0, 7.5, BAL_H, 0.8, P, 48, 0.2), { tone: "hi" })
    + `<path class="pantalla-b" d="${k.pathOf(ventana, true)}"/>`
    + E("text", "t-bal", { class: "t-bal", "text-anchor": "middle" }, m)
    + D([at([BAL.x + 2, yf, 2.3]), at([BAL.x + BAL.w - 2, yf, 2.3])], { size: 0.5, tone: "lo" }) + `</g>`;
}
function probeta(m) {
  let tk = "", et = "";
  for (let c = ES.probetaPaso; c / AREA_P < PZ1 - PZ0 - 0.6; c += ES.probetaPaso) {
    const z = PZ0 + c / AREA_P, mayor = ES.probetaEtiquetas.includes(c);
    const q = []; for (const t of [0.05, mayor ? 0.65 : 0.35]) q.push(borde(PX, 0, PR, t, z));
    tk += k.segment(q[0], q[1], P);
    if (mayor) { const p = at(borde(PX, 0, PR, Math.PI / 2, z)); et += `<text class="t-regla" text-anchor="end" x="${(p[0] - 3).toFixed(1)}" y="${(p[1] + 3).toFixed(1)}">${c}</text>`; }
  }
  return `<g data-parte="07">` + S(k.cylinder(PX, 0, PR, BZ0, PZ1 - BZ0, P, 40), { tone: "lo", className: "vidrio" })
    + S(k.cylinder(PX, 0, PR - 0.2, BZ0, 0.6, P, 40), { tone: "faint", className: "vidrio-fondo" })
    + E("path", "pw-f", { class: "agua-f" }, m) + E("path", "pw-t", { class: "agua-t" }, m)
    + L(frente(PX, 0, PR, BZ0, PZ1), { tone: "lo", className: "vidrio-frente" })
    + `<path class="tk mayor" d="${tk}"/>` + et
    + E("text", "t-prob", { class: "t-prob" }, m) + `</g>`;
}

// Cubo (aluminio o cobre; se ve uno) con ojillo arriba; dinamómetro con carátula al frente
function cubo(id, cls, sim, m) {
  const plan = { x: VX - LADO / 2, y: -LADO / 2, w: LADO, d: LADO, r: 0.3 };
  return E("g", id, {}, m, S(k.slabOf(plan, NIVEL, LADO, P, 3, 0.3), { tone: "hi", lit: true, className: cls })
    + k.faceTextSvg(k.sideMatrix([VX - 2, LADO / 2 + 0.02], NIVEL + 6.6, P, "left"), sim, { size: 3, tone: "mid" }));
}
function colgante(m) {
  const cub = E("g", "colg-cubo", { class: "arrastre", "data-parte": "04" }, m,
    cubo("cubo-al", "cubo-al", J.figura.simbolos.al, m) + cubo("cubo-cu", "cubo-cu", J.figura.simbolos.cu, m)
    + L(k.sideRing([VX, 0, NIVEL + LADO + 0.8], 0.8, "x", P, 16), { tone: "hi" })
    + `<path class="hilo" d="${k.segment([VX, 0, NIVEL + LADO + 1.6], [VX, 0, NIVEL + DH.z0 - 0.4], P)}"/>`);
  const zc = NIVEL + DH.zc, caja = { x: VX - 6, y: -DH.yf, w: 12, d: 2 * DH.yf, r: 1.2 };
  let tk = "";
  const nm = Math.round(ES.dinMax / ES.dinPaso);
  for (let i = 0; i <= nm; i++) {
    const a = -0.75 * Math.PI + 1.5 * Math.PI * i / nm, r0 = DH.R - 0.4, r1 = DH.R - (i % 2 ? 0.9 : 1.5);
    tk += k.segment([VX + r0 * Math.sin(a), DH.yf + 0.03, zc + r0 * Math.cos(a)], [VX + r1 * Math.sin(a), DH.yf + 0.03, zc + r1 * Math.cos(a)], P);
  }
  const din = E("g", "colg-din", { class: "arrastre", "data-parte": "03" }, m,
    L(k.sideRing([VX, 0, NIVEL + DH.z0 - 0.4], 0.7, "x", P, 16), { tone: "hi" })
    + S(k.slabOf(caja, NIVEL + DH.z0, DH.z1 - DH.z0, P, 4, 0.3), { tone: "mid" })
    + `<path class="caratula" d="${k.sideRing([VX, DH.yf + 0.02, zc], DH.R, "y", P, 40)}"/>`
    + L(k.sideRing([VX, DH.yf + 0.02, zc], DH.R, "y", P, 40), { tone: "lo" }) + `<path class="tk mayor" d="${tk}"/>`
    + k.faceTextSvg(k.sideMatrix([VX - 0.6, DH.yf + 0.04], zc - 1.6, P, "left"), "N", { size: 1.2, tone: "lo" })
    + E("path", "aguja", { class: "aguja" }, m) + D([at([VX, DH.yf + 0.1, zc])], { size: 0.6, tone: "lo" })
    + L(k.sideRing([VX, 0, NIVEL + DH.z1 + 0.8], 0.8, "x", P, 16), { tone: "hi" }));
  return { cub, din };
}

const flecha = (id, cls, parte, m) => E("g", id, { class: `flecha ${cls}`, "data-parte": parte }, m,
  E("line", id + "-l", {}, m) + E("polygon", id + "-p", {}, m) + E("text", id + "-t", { class: "t-vel", "text-anchor": "middle" }, m));

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function E(tag, id, attrs, m, inner = "") {
  const v = (m && m[id]) || {}, a = { id, ...attrs };
  for (const [q, x] of Object.entries(v)) if (q[0] !== "_") a[q] = x;
  if (v._v === false) a.style = "display:none";
  const txt = "_t" in v ? esc(v._t) : inner;
  return `<${tag}${Object.entries(a).map(([q, x]) => ` ${q}="${esc(x)}"`).join("")}>${txt}</${tag}>`;
}
function cuerpo(m) {
  const { cub, din } = colgante(m);
  const ladoVaso = pedestal() + vasoAtras(m) + cub + E("path", "velo", { class: "velo" }, m) + vasoFrente(m) + regla(m);
  const ladoBal = balanza(m) + probeta(m);
  const grupos = [[prof([VX, 0]), ladoVaso], [prof([PX, 0]), ladoBal]].sort((a, b) => a[0] - b[0]).map((g) => g[1]);
  return [
    placa(), varilla(), brazo(m), ...grupos, pico(m),
    E("path", "chorro", { class: "chorro", "data-parte": "06" }, m),
    `<g data-parte="02">${E("path", "res-atras", { class: "resorte atras" }, m)}${E("path", "res-frente", { class: "resorte" }, m)}</g>`,
    din,
    E("text", "t-din", { class: "t-din", "text-anchor": "end", "data-parte": "03" }, m),
    E("path", "pie-E", { class: "pie-E", "data-parte": "10" }, m),
    flecha("fl-T", "fl-fant", "12", m), flecha("fl-P", "fl-F", "09", m), flecha("fl-E", "fl-F", "10", m),
    E("text", "fant-t", { class: "t-trampa", "text-anchor": "start", "data-parte": "12" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { P, W, H, CM, LADO, VX, VR, VRW, ZF0, VZ0, BORDE, NIVEL, PX, PR, PRI, PZ0, PZ1, AREA_P, XCH, PICO_Z, PICO, BAL, VAR, ZA0, DH, L0, KS, KF, EXF,
  REGLA, DINMAX: ES.dinMax, TV: [TVX, TVY], T0, RISE, ROT };
const estado0 = { h: VI.h, mat: "al", Vp: 0, hMax: -1, revelado: false, trampa: false, flujo: false };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, vista y calc) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso, onTop, translateAlong, slabOf, cylinder };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/principio-de-arquimedes-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/principio-de-arquimedes-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles, ES = J.escena, FASES = ES.fases;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
};
const numN = (v) => num(v, Math.abs(v) < 1 && v !== 0 ? 2 : 1);           // newtons: 1 decimal (2 si es menor que 1)
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const VEL = 0.06;   // m/s de pantalla a los que baja o sube el cubo (dibujo, no física)

let h = V.h, mat = "al", flujo = false, revelado = false, trampaOn = false, sel = null, selRec = false, enRecorrido = false;
let Vp = 0, hMax = -1;   // agua que ya salió a la probeta (m³) y lo más hondo que llegó el cubo desde el último reinicio
const numeros = (h, mat, vp = 0) => {
  const d = calc(J, h, mat, vp);
  return { l: num(d.l, 3), lcm: num(d.l * 100), g: num(d.g), rhoL: num(d.rhoL), rhoC: num(d.rhoC), rhoFe: num(d.rhoFe),
    V: num(d.V, 6), Vs: num(d.Vs, 6), hs: num(d.hs, 3), hcm: num(d.hs * 100, 1), E: numN(d.E), Eex: numN(d.Eex), P: numN(d.P),
    Pap: numN(d.Pap), mAgua: num(d.mAgua, 2), cm3: num(d.cm3, 0), cm3ex: num(d.cm3ex, 0), Earea: numN(d.Earea), Vmal: num(d.Vmal, 6),
    Emal: numN(d.Emal), Pfe: numN(d.Pfe), PapFe: numN(d.PapFe), SumaFe: numN(d.SumaFe), material: J.figura.materiales[mat],
    dinMax: num(ES.dinMax), probetaPaso: num(ES.probetaPaso), Eprob: numN(d.Eprob), mProb: num(d.mProb, 2), cm3prob: num(d.cm3prob, 0),
    baja: num(-d.zn * 100, 1) };
};
// Mueve el cubo: el agua que pase del pico sale a la probeta y ahí se queda
function poner(hn){ const d = calc(J, hn, mat, Vp); flujo = d.Vp > Vp + 1e-12; Vp = d.Vp; h = hn; if (h > hMax) hMax = h; }
function reiniciarAgua(){ Vp = 0; hMax = -1; h = V.h; }

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#bajar"), bMat = $("#material"), bTrampa = $("#trampa"), bExamen = $("#examen"), nota = $("#nota");
const SH = $("#s-h");

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#l-h").textContent = CT.h;
$("#pred-t").textContent = J.prediccion.titulo;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
SH.min = RG.h.min * 100; SH.max = RG.h.max * 100; SH.step = RG.h.paso * 100;
stage.setAttribute("aria-valuemin", RG.h.min * 100); stage.setAttribute("aria-valuemax", RG.h.max * 100);
stage.setAttribute("aria-label", "Lámina: flechas arriba y abajo suben o bajan el cubo; B lo baja a la siguiente fase");

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
function valores(){
  const rv = revelado && !enRecorrido, n = numeros(h, mat, Vp), oc = (v) => (rv ? v : "?"), fuera = h <= 0;
  return { ...n, E: oc(n.E), Pap: fuera ? n.Pap : oc(n.Pap), cm3: oc(n.cm3), mAgua: oc(n.mAgua), Eprob: oc(n.Eprob), mProb: oc(n.mProb), cm3prob: oc(n.cm3prob) };
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
const estado = () => ({ h, mat, Vp, hMax, revelado: revelado && !enRecorrido, trampa: trampaOn, flujo });
const faseDe = (h) => { let i = -1; FASES.forEach((f, j) => { if (h >= f - 1e-6) i = j; }); return i; };
const siguiente = () => { const i = faseDe(h); return i < 0 ? 1 : i >= FASES.length - 1 ? 0 : i + 1; };
const valorH = (n) => { const c = h * 100; return Math.abs(c) < 1e-6 ? CT.valorH0 : tpl(c > 0 ? CT.valorH : CT.valorHfuera, { v: num(Math.abs(c), 1) }); };

function render(){
  const rv = revelado && !enRecorrido, n = numeros(h, mat, Vp), o = valores();
  aplicar(vista(C, K, estado(), J));
  // Panel
  $("#o-E").textContent = rv ? `${n.E} N` : "?";
  $("#o-formula").innerHTML = rv ? tpl(L.formulaE, n) : L.sinRevelar;
  $("#o-sh").textContent = valorH();
  SH.style.setProperty("--p", (100 * (h - RG.h.min) / (RG.h.max - RG.h.min)) + "%");
  if (Math.abs(+SH.value - h * 100) > 1e-6) SH.value = h * 100;
  SH.setAttribute("aria-valuetext", valorH() + (rv ? `, el dinamómetro marca ${n.Pap} N` : ""));
  $("#c-P").textContent = tpl(J.lecturas.peso, n);
  $("#o-P").textContent = `${n.P} N`;
  $("#o-Pap").textContent = rv || h <= 0 ? `${n.Pap} N` : "?";
  $("#o-agua").textContent = rv ? `${n.cm3prob} cm³ · ${n.mProb} kg` : "?";
  const lect = `h ${num(h * 100, 1)} cm · marca ${rv || h <= 0 ? n.Pap : "?"} N · E ${rv ? n.E : "?"} N`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", num(h * 100, 1));
  stage.setAttribute("aria-valuetext", valorH() + `, cubo de ${n.material}` + (rv ? `, empuje ${n.E} N, el dinamómetro marca ${n.Pap} N` : ""));
  bPri.textContent = CT.fases[siguiente()];
  bMat.textContent = mat === "cu" ? CT.materialVolver : CT.material;
  document.querySelectorAll(".rot-b").forEach(b => { const t = tpl(J.rotulos[b.dataset.n][0], o), s = b.querySelector("span"); if (s.textContent !== t) s.textContent = t; });
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.volumen, tpl(L.volumenValor, o)], [L.empuje, tpl(L.empujeValor, o)], [tpl(L.peso, n), tpl(L.pesoValor, n)],
    [L.marca, tpl(L.marcaValor, o)], [L.trampa, tpl(L.trampaValor, n) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((q, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${q[0]}</span><span class="va">${q[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento: el cubo va hacia hObj a velocidad constante; sale agua por el pico mientras entra ----------
let anim = 0, hObj = h;
function avanzar(dt){
  const dd = hObj - h, paso = VEL * dt;
  if (Math.abs(dd) <= paso){ poner(hObj); flujo = false; return false; }
  poner(h + Math.sign(dd) * paso);
  return true;
}
function terminar(){
  if (enRecorrido) return;
  const n = numeros(h, mat, Vp), hayAgua = Vp > 1e-9;
  decir(calc(J, h, mat, Vp).hs <= 1e-9 ? tpl(hayAgua ? L.mensajeFueraConAgua : L.mensajeFuera, n)
    : h < hMax - 1e-6 ? tpl(L.mensajeSube, n) : tpl(L.mensajeFin, n));
  if (trampaOn) nota.textContent += " " + tpl(L.mensajeTrampa, n);
}
let pendiente = null;   // corrida interrumpida por salir de pantalla: se retoma al volver
function correr(objetivo, fin = null){
  cancelAnimationFrame(anim); hObj = objetivo; pendiente = { objetivo, fin };
  if (quieto){ poner(hObj); flujo = false; pendiente = null; terminar(); render(); if (fin) fin(); return; }
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
    const sigue = avanzar(dt); render();
    if (sigue) anim = requestAnimationFrame(paso); else { anim = 0; pendiente = null; terminar(); render(); if (fin) fin(); }
  };
  render(); anim = requestAnimationFrame(paso);
}
function nuevo(){ cancelAnimationFrame(anim); anim = 0; pendiente = null; flujo = false; }
function principal(){
  nuevo(); revelado = true;
  const i = siguiente();
  decir(i === 0 ? "Sacando el cubo." : FASES[i] <= 0 ? "Bajando el cubo hasta que toque el agua." : `Bajando el cubo: el agua que desaloja sale por el pico.`);
  correr(FASES[i]);
}

// ---------- Arrastre del cubo o del dinamómetro (solo esas piezas capturan el dedo) ----------
let arr = null;
const lim = (v) => Math.max(RG.h.min, Math.min(RG.h.max, v));
document.querySelectorAll(".arrastre").forEach(g => {
  g.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    e.stopPropagation(); tomarControl(); nuevo(); revelado = true;
    arr = { y: e.clientY, h0: h, id: e.pointerId }; g.setPointerCapture(e.pointerId); g.classList.add("tomado");
  });
  g.addEventListener("pointermove", (e) => {
    if (!arr || e.pointerId !== arr.id) return;
    const esc = svg.getBoundingClientRect().height / C.H;
    poner(lim(arr.h0 + (e.clientY - arr.y) / (esc * C.RISE) / C.CM)); render();
  });
  const suelta = (e) => { if (!arr || e.pointerId !== arr.id) return; arr = null; flujo = false; g.classList.remove("tomado"); terminar(); render(); };
  g.addEventListener("pointerup", suelta); g.addEventListener("pointercancel", suelta);
});

// ---------- Recorrido automático: sube y baja el cubo hasta tocar el agua y cambia de material, sin meterlo; se detiene al tocar ----------
const REC = C.ROT.filter(n => n !== "12").map((n, i) => ({ h: FASES[i % 2], mat: Math.floor(i / 4) % 2 ? "cu" : "al", sel: n }));
let tRec = 0, iRec = 0, animRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  const r = REC[iRec % REC.length]; iRec++;
  mat = r.mat; selRec = true; setSel(r.sel);
  const h0 = h, t0 = performance.now(), DUR = 900;
  nuevo();
  const paso = (ahora) => {
    if (!enRecorrido) return;
    const u = Math.min(1, (ahora - t0) / DUR), e = u * u * (3 - 2 * u);
    poner(h0 + (r.h - h0) * e); render();
    if (u < 1) animRec = requestAnimationFrame(paso);
    else { poner(r.h); flujo = false; render(); tRec = setTimeout(pasoRecorrido, 2200); }
  };
  animRec = requestAnimationFrame(paso);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim || arr){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe una corrida del usuario
  enRecorrido = true; nota.textContent = ""; pasoRecorrido();
}
const redondea = (x, p) => Math.round(x / p) * p;
function tomarControl(){
  if (enRecorrido){
    enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(animRec); animRec = 0;
    if (selRec){ selRec = false; setSel(null); }
    poner(redondea(h, RG.h.paso)); flujo = false; render();
  }
  clearTimeout(tRec); tRec = setTimeout(iniciarRecorrido, 6000);
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (!visible && enRecorrido) tomarControl(); if (!visible && anim){ cancelAnimationFrame(anim); anim = 0; }
  if (visible && !anim && pendiente) correr(pendiente.objetivo, pendiente.fin); }, {rootMargin:"0px"}).observe(stage);
setTimeout(() => { if (visible) iniciarRecorrido(); else tRec = setTimeout(iniciarRecorrido, 6000); }, 1400);

// ---------- Controles ----------
bPri.addEventListener("click", principal);
bExamen.addEventListener("click", () => {
  nuevo(); reiniciarAgua(); mat = "al";
  if (trampaOn) bTrampa.click();
  decir(L.mensajeReinicio); render();
});
bMat.addEventListener("click", () => {
  nuevo(); mat = mat === "cu" ? "al" : "cu"; const n = numeros(h, mat, Vp);
  decir(tpl(h > 0 && revelado ? L.mensajeMaterial : L.mensajeMaterialFuera, n)); render();
});
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){ nuevo(); reiniciarAgua(); revelado = true; decir("Bajando el cubo por completo para comparar."); correr(FASES[FASES.length - 1]); }
  else render();
});
SH.addEventListener("input", () => {
  nuevo(); poner(lim(+SH.value / 100)); revelado = true; render(); flujo = false;
});
SH.addEventListener("change", () => { terminar(); render(); });
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
stage.addEventListener("keydown", (e) => {
  const dv = {ArrowDown:1, ArrowUp:-1}[e.key];
  if (dv === undefined) return;
  e.preventDefault(); nuevo(); revelado = true;
  poner(lim(redondea(h + dv * RG.h.paso, RG.h.paso))); flujo = false; terminar(); render();
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
// Opciones del empuje (las del paso 1): cada una con su fórmula del JSON, en el orden del JSON (el del .md)
const LETRAS = ["A", "B", "C", "D"];
const hTodo = FASES[FASES.length - 1];
const d0 = calc(J, hTodo, "al"), n0 = numeros(hTodo, "al"), nCu = numeros(hTodo, "cu");
const OP0 = J.prediccion.opciones.map((q, i) => { const v = evalua(q.formula, d0);
  return { tipo: q.tipo, v, ok: !!q.correcta, e: tpl(q.retro, n0), letra: LETRAS[i], t: `${LETRAS[i]}) ${numN(v)} N` }; });
const letra = (tp) => OP0.find(q => q.tipo === tp).letra;
$("#pred-q").innerHTML = tpl(J.prediccion.pregunta, n0);
opciones($("#pred-ops"), OP0, () => {
  tomarControl(); nuevo(); reiniciarAgua(); mat = "al"; revelado = true;
  if (trampaOn){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
  correr(hTodo);
});

// ---------- Los 6 pasos (capa 1) ----------
const n = n0;
const PASOS = [
  {n:1, titulo:"Pregunta de examen", enunciado:tpl(J.prediccion.pregunta, n), ops:OP0},
  {n:2, titulo:"Idea en una frase", p:['Todo cuerpo sumergido recibe un empuje hacia arriba igual al peso del líquido que desaloja: <span class="formula">E = ρ<sub>líquido</sub> · g · V<sub>sumergido</sub></span>',
    `En la lámina, fuera del agua el dinamómetro marca el peso, ${n.P} N; dentro marca menos. El agua que el cubo desaloja sale por el pico a la probeta y la balanza la pesa. Baja el cubo y compara la balanza con lo que perdió el dinamómetro.`]},
  {n:3, titulo:"Ejemplo resuelto", p:[`<span class="numeral">I.</span> Volumen: ${n.l} m × ${n.l} m × ${n.l} m = <b>${n.V} m³</b>.`,
    `<span class="numeral">II.</span> Empuje: ${n.rhoL} × ${n.g} × ${n.V} = <b>${n.Eex} N</b> → respuesta ${letra("bien")}.`,
    `La densidad del ${n.material} no se usa: el empuje solo depende del líquido y del volumen sumergido. En la probeta caen ${n.cm3ex} cm³ de agua (${n.mAgua} kg), que pesan ${n.Eex} N: lo que marca la balanza.`]},
  {n:4, titulo:"La trampa", p:[`Calcular el peso del cubo (${n.rhoC} × ${n.g} × ${n.V} = ${n.P} N) da la opción ${letra("peso")}, puesta para quien cree que el empuje depende del peso del objeto.`,
    `Usar ${n.l}<sup>2</sup> en vez de ${n.l}<sup>3</sup> da ${n.Earea} N (opción ${letra("area")}): esa cuenta es un área, no un volumen.`,
    `Convertir mal ${n.cm3ex} cm³ a ${n.Vmal} m³ da ${n.Emal} N (opción ${letra("conversion")}).`,
    `Pulsa «${CT.trampa}» en la lámina: la flecha punteada mide ${n.P} N, pero el empuje de verdad se queda en ${n.Eex} N. Con «${CT.material}» el peso sube a ${nCu.P} N y el empuje no cambia.`]},
  {n:5, titulo:"Truco de examen", p:['Mismo volumen sumergido, <span class="formula">mismo empuje</span>, sin importar de qué esté hecho el objeto.',
    "Pasa el volumen a m³ (lado en metros, al cubo) antes de multiplicar."]},
  {n:6, titulo:J.prueba.titulo, enunciado:tpl(J.prueba.pregunta, n), ops:J.prueba.opciones.map(o => ({t:`${o.letra}) ${numN(evalua(o.formula, d0))} N`, ok:!!o.correcta, e:tpl(o.retro, n)}))}
];
PASOS.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.p || []).map(t => `<p>${t}</p>`).join("");
  if (p.enunciado){ s.insertAdjacentHTML("beforeend", `<p>${p.enunciado}</p>`); const l = document.createElement("div"); l.className = "opciones"; opciones(l, p.ops); s.append(l); }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});
// Otro intento (capa 2): el mismo cubo, sumergido solo hasta la mitad
const hM = FASES[2], dM = calc(J, hM, "al"), nM = numeros(hM, "al");
const OTRO = [
  {v:dM.E, ok:true, e:`Solo cuenta lo sumergido: V = ${nM.l} × ${nM.l} × ${nM.hs} = ${nM.Vs} m³, y E = ${nM.rhoL} × ${nM.g} × ${nM.Vs} = ${nM.E} N.`},
  {v:dM.Eex, e:`Ese es el empuje con el cubo cubierto. A la mitad desaloja la mitad del agua.`},
  {v:dM.P / 2, e:`Esa es la mitad del peso. El empuje no depende del peso del cubo, sino del agua que desaloja.`},
  {v:dM.Pap, e:`Eso marca el dinamómetro (P − E = ${nM.P} − ${nM.E}), no el empuje.`}
].sort((p, q) => p.v - q.v).map((q, i) => ({ ...q, t:`${LETRAS[i]}) ${numN(q.v)} N` }));
$("#otro").innerHTML = `<h3>Otro intento</h3><p>Bajas el mismo cubo de ${nM.material} solo hasta la mitad (${nM.hcm} cm bajo el agua). ¿Qué empuje recibe?</p><div class="opciones"></div>`;
opciones($("#otro .opciones"), OTRO);

$("#pie").innerHTML = `<i>${J.figura.pie}</i> Modelo: el cubo, el vaso, el agua, la probeta y la regla están a la misma escala (en cm); el soporte y el dinamómetro no. Las flechas tampoco van a escala.
 El vaso empieza lleno hasta el pico: lo que el cubo mete bajo el nivel sale a la probeta y la balanza pesa esa agua. Si subes el cubo, el agua no regresa: el nivel del vaso baja y la raya «máx» de la regla recuerda lo más hondo que llegó; al volverlo a bajar no sale agua hasta que el nivel llegue otra vez al pico. «${CT.examen}» rellena el vaso y vacía la probeta. No cuentan el hilo ni el gancho. ρ del agua = ${n.rhoL} kg/m³, g = ${n.g} m/s².
 El resorte se estira según lo que marca y la animación va más lenta que en la realidad. Si nadie toca, la lámina sube y baja el cubo solo hasta que toca el agua y cambia el material, sin mostrar el empuje. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B baja a la siguiente fase; con la lámina enfocada, ↑ ↓ suben y bajan el cubo. También puedes arrastrar el cubo.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#bajar", "#bloque-h"].map(s => $(s));
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
window.__arquimedes = { set:(o) => { if ("mat" in o) mat = o.mat; if ("h" in o) poner(o.h); if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa; if ("flujo" in o) flujo = o.flujo; render(); },
  sel:seleccionar, completa:entrar, salir, alto:() => { enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(animRec); cancelAnimationFrame(anim); anim = 0; if (selRec){ selRec = false; setSel(null); } render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de Arquímedes) ----------
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
/* Propio de Arquímedes (también va en el SVG fijo) */
.agua>.iso-fill{fill:var(--agua-1)} .agua>.iso-top{fill:var(--agua-sup)}
.agua>.iso-shade[data-shade="0"]{fill:color-mix(in srgb,var(--agua-2) 55%,var(--agua-1))} .agua>.iso-shade[data-shade="1"]{fill:color-mix(in srgb,var(--agua-2) 38%,var(--agua-1))}
.agua>.iso-shade[data-shade="2"]{fill:color-mix(in srgb,var(--agua-2) 20%,var(--agua-1))} .agua>.iso-shade[data-shade="3"]{fill:var(--agua-1)}
.agua>.iso-edge{stroke:var(--agua-2)}
.agua-f{fill:var(--agua-1);stroke:var(--agua-2);stroke-width:.6} .agua-t{fill:var(--agua-sup);stroke:var(--agua-2);stroke-width:.6}
.vidrio>.iso-fill{fill:var(--agua-sup);fill-opacity:.16} .vidrio>.iso-shade{opacity:.18} .vidrio>.iso-top{fill:none}
.vidrio-fondo>.iso-fill,.vidrio-fondo>.iso-top{fill:var(--agua-sup);fill-opacity:.35}
.vidrio-frente{stroke:var(--anatomy-mid)}
.velo{fill:var(--agua-1);fill-opacity:.42;stroke:none;pointer-events:none}
.sup-agua{fill:none;stroke:var(--agua-2);stroke-width:1}
.pie-E{fill:none;stroke:var(--rubrica);stroke-width:1;stroke-dasharray:1.5 2}
.chorro{fill:none;stroke:var(--agua-2);stroke-width:1.8;stroke-linecap:round}
.cubo-cu>.iso-fill,.cubo-cu>.iso-top{fill:color-mix(in srgb,var(--rubrica) 26%,var(--anatomy-top))}
.cubo-cu>.iso-shade{fill:color-mix(in srgb,var(--rubrica) 38%,var(--anatomy-shade-1))}
.hilo{fill:none;stroke:var(--anatomy-hi);stroke-width:.7}
.resorte{fill:none;stroke:var(--anatomy-hi);stroke-width:.8;stroke-linejoin:round} .resorte.atras{stroke:var(--anatomy-lo)}
.caratula{fill:var(--anatomy-paper)}
.aguja{fill:none;stroke:var(--rubrica);stroke-width:1.3;stroke-linecap:round}
.marca-h{fill:none;stroke:var(--dorado);stroke-width:1.8;stroke-linecap:round}
.max-h{fill:none;stroke:var(--dorado);stroke-width:1.2;stroke-dasharray:2 1.6}
.t-max{font:500 8.5px var(--anatomy-mono);fill:var(--dorado)}
.pantalla-b{fill:var(--anatomy-shade-0);stroke:var(--anatomy-mid);stroke-width:.6}
.t-din,.t-bal,.t-prob{font:500 11px var(--anatomy-mono);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-din{fill:var(--rubrica)} .t-bal{fill:var(--acento);font-size:9.5px;stroke:none} .t-prob{fill:var(--acento)}
.tk{fill:none;stroke-width:.6} .tk.menor{stroke:var(--anatomy-lo)} .tk.mayor{stroke:var(--anatomy-mid)}
.t-regla{font:500 8.5px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.flecha line{stroke:var(--rubrica);stroke-width:2.4;stroke-linecap:round} .flecha polygon{fill:var(--rubrica)}
.fl-fant line{stroke-width:1.4;stroke-dasharray:4 3} .fl-fant polygon{fill:none;stroke:var(--rubrica);stroke-width:1.2}
.t-vel{font:500 14px var(--serif);fill:var(--rubrica);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de Arquímedes */
.arrastre{cursor:grab;touch-action:none} .arrastre.tomado{cursor:grabbing}
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px}
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
.modo-lamina .compacto{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 16px;align-items:center}
.modo-lamina .compacto .fila{font-size:.82rem;font-weight:600}
.modo-lamina .compacto input[type=range]{height:30px}
.modo-lamina .compacto .boton{white-space:nowrap}
@media (orientation:portrait){.modo-lamina .gira{display:block;margin:0 52px 0 0;font-size:.85rem;color:var(--suave)}
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .modo-lamina .compacto #bajar{grid-column:1/-1}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el del examen, cubo sumergido por completo) ----------
function svgFijo() {
  const s = { h: FASES[FASES.length - 1], mat: "al", Vp: 0, hMax: -1, revelado: true, trampa: false, flujo: false };
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
  title: "Principio de Arquímedes",
  hint: J.instruccion,
  readout: "h 0 cm",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuenow="0">${figura}</div>`,
});
const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Principio de Arquímedes · Códice Vivo</title>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
</head>
<body>
<main class="pagina">
  <header>
    <div class="marca-casa">Códice Vivo · Laboratorio</div>
    <h1 id="titulo">Principio de Arquímedes</h1>
    <p class="sub" id="subtitulo"></p>
  </header>
  <div class="rejilla">
    <div id="pasos-a" class="pasos"></div>
    <section class="tarjeta lab" aria-label="Laboratorio">
      <div class="predice">
        <h3 id="pred-t">Predice antes de bajar</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
        <p class="gira" aria-hidden="true">Gira el teléfono para verla más grande</p>
        <div class="iso escena">${plate}</div>
        <div class="barra-lamina">
          <span class="escala" id="escala">Escala: cubo, vaso y probeta en cm</span>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq">Empuje sobre el cubo, E</span>
          <output id="o-E" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-h">
            <div class="fila"><label for="s-h" id="l-h"></label><output id="o-sh"></output></div>
            <input type="range" id="s-h">
          </div>
        </div>
        <div class="chips">
          <div class="chip"><span id="c-P">Peso</span><output id="o-P"></output></div>
          <div class="chip"><span>El dinamómetro marca</span><output id="o-Pap"></output></div>
          <div class="chip"><span>Agua en la probeta</span><output id="o-agua"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="bajar" aria-keyshortcuts="b">Bajar</button>
          <button type="button" class="boton sec" id="material"></button>
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
