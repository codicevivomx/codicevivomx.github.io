// Lámina 2.5D+ de la prensa hidráulica: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/prensa-hidraulica-2_5d.mjs                → plantilla/interactivos/prensa-hidraulica/plus/index.html
//   node plantilla/figuras/prensa-hidraulica-2_5d.mjs --vista <ruta> → copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML a mano: se regenera con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(RAIZ, ".claude", "skills", "anatomy");
const k = await import("file://" + join(SKILL, "kit", "iso-kit.mjs"));
const { kitScript } = await import("file://" + join(SKILL, "scripts", "inline-kit.mjs"));
const JSON_TEMA = join(RAIZ, "contenido", "fisica", "prensa-interactivo.json");
const SALIDA = join(RAIZ, "plantilla", "interactivos", "prensa-hidraulica", "plus", "index.html");
const J = JSON.parse(readFileSync(JSON_TEMA, "utf8"));

// ---------- Modelo del dibujo (unidades del mundo; z hacia arriba) ----------
// Los radios siguen la razón de diámetros del JSON; la escala vertical es la misma para los dos pistones.
const RD = J.valoresIniciales.d2 / J.valoresIniciales.d1, RA = RD * RD;
const XMAX = J.rangos.x.max;                 // cm que baja el chico en una embolada
const K = 1.2;                               // unidades por cm, igual en los dos pistones
const YMAX = 10;                             // tope del pistón grande en cm (del dibujo)
const RS = 9, RB = RS * RD, RR = 15;         // radios: chico, grande, depósito
const SM = [-90, 0], BG = [70, 0], RES = [-136, 0];
const BLOQUE = { x: -122, y: -11, w: 146, d: 22, r: 2 }, BLOQUE_H = 14;
const PLACA = { x: -166, y: -60, w: 304, d: 120, r: 9 }, PLACA_H = 10, PATA_H = 5;
// Chico
const S_VID = [22, 108], S_L0 = 96, S_PIS = 8, S_VAST = K * XMAX + 18, S_MANIJA = 5;
// Grande
const B_VID = [14, 62], B_L0 = 32, B_PIS = 10, B_VAST = 24, B_PLATO = 4, B_CARGA = 20;
// Depósito
const R_VID = [4, 48], R_L0 = 36, R_BAJA = 22;
// Válvulas y manómetro (sobre el bloque)
const V_ADM = -112, V_RET = -64, V_MAN = -40, V_ALI = -14;
const M_Z = 32, M_R = 10;

const W = 620, H = 500;
const S_TOP_REPOSO = S_L0 + S_PIS + S_VAST + S_MANIJA;
const B_TOP_FANT = B_L0 + B_PIS + B_VAST + B_PLATO + B_CARGA + K * (YMAX + XMAX);
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [SM[0], 0, S_TOP_REPOSO + 26], [BG[0], 0, Math.min(B_TOP_FANT, 150) + 12], [BG[0] + RB + 8, 0, 0]],
  W, H, { pad: 26, azimuth: 36 },
);

const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const cil = (c, r, z, h, steps = 48, bevel = 0) => k.cylinder(c[0], c[1], r, z, h, P, steps, bevel);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const fx = (v) => Math.round(v * 10) / 10;

// ---------- Piezas ----------
function placa() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLACA, -PLACA_H - PATA_H, PLACA_H, P)}"/>`];
  const patas = k.corners(PLACA, 20).sort((a, b) => prof(a) - prof(b));
  for (const [x, y] of patas) {
    o.push(S(k.cylinder(x, y, 7, -PLACA_H - PATA_H, 1.6, P, 28), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 5.4, -PLACA_H - PATA_H + 1.6, PATA_H - 1.6, P, 28), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLACA, -PLACA_H, PLACA_H, P, 8, 1.6), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PLACA, 5), 0, P), { tone: "lo" }));
  const torn = k.corners(PLACA, 10);
  o.push(L(torn.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  o.push(D(torn.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Placa de datos grabada al frente
  const pl = { x: -150, y: PLACA.y + PLACA.d - 17, w: 52, d: 10, r: 1 };
  o.push(S(k.slabOf(pl, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 4, pl.y + 6.4], 0.6, P, "x"), "PRENSA · A₂ = " + RA + " A₁", { size: 3, tone: "lo" }));
  o.push(D([at([pl.x + 1.8, pl.y + 5, 0.6]), at([pl.x + pl.w - 1.8, pl.y + 5, 0.6])], { size: 0.4 }));
  return o.join("");
}

function bloque() {
  const o = [];
  o.push(S(k.slabOf(BLOQUE, 0, BLOQUE_H, P, 4, 0.8), { tone: "mid" }));
  o.push(L(k.lineOnTop([BLOQUE.x + 4, -6.5], [BLOQUE.x + BLOQUE.w - 4, -6.5], BLOQUE_H, P), { tone: "faint" }));
  o.push(L(k.lineOnTop([BLOQUE.x + 4, 6.5], [BLOQUE.x + BLOQUE.w - 4, 6.5], BLOQUE_H, P), { tone: "faint" }));
  o.push(D([-80, -52, -26, 4].map((x) => at([x, 8.6, BLOQUE_H])), { size: 0.45, tone: "lo" }));
  return o.join("");
}

// Vidrio: cilindro abierto, sin tapa pintada; deja ver el aceite y el pistón.
const vidrio = (c, r, z0, z1) =>
  S(cil(c, r, z0, z1 - z0, 56), { tone: "mid", className: "vidrio", crease: "none" }) +
  L(k.ring(c[0], c[1], r, z1, P, 56), { tone: "mid" }) +
  L(k.ring(c[0], c[1], r - 1.2, z1, P, 56), { tone: "faint" });
// Anillo de tapa: banda metálica sin cara superior (el vástago pasa por el centro).
const anillo = (c, r, z, h) =>
  S(cil(c, r, z, h, 56, 0.4), { tone: "mid", className: "anillo" }) +
  L(k.ring(c[0], c[1], r - 2.4, z + h, P, 48), { tone: "lo" });

function regla(x, y, z0, z1, cada) {
  // tira vertical con marcas cada cm (K unidades); mayor cada 5
  const o = [S(k.slabOf({ x: x - 1.2, y: y - 2.5, w: 2.4, d: 5, r: 0.5 }, z0 - 2, z1 - z0 + 4, P, 2), { tone: "mid", crease: "none" })];
  let menor = "", mayor = "";
  for (let i = 0, z = z0; z <= z1 + 0.01; i++, z = z0 + i * K * cada) {
    const largo = i % 5 === 0 ? 3.4 : 1.8;
    const d = k.segment([x + 1.2, y - 2.5, z], [x + 1.2, y - 2.5 + largo, z], P);
    if (i % 5 === 0) mayor += d; else menor += d;
  }
  o.push(L(menor, { tone: "lo" }), L(mayor, { tone: "mid" }));
  return o.join("");
}

function deposito() {
  const o = [];
  o.push(S(cil(RES, RR + 3, 0, 4, 48, 0.4), { tone: "mid" }));
  o.push(`<g id="aceite-deposito"></g>`);
  o.push(vidrio(RES, RR + 1.4, R_VID[0], R_VID[1]));
  o.push(S(cil(RES, RR + 3, R_VID[1], 3, 48, 0.4), { tone: "mid" }));
  o.push(S(cil(RES, 4.2, R_VID[1] + 3, 4, 28), { tone: "mid" }));
  o.push(L(k.knurl(RES[0], RES[1], 4.2, R_VID[1] + 3, R_VID[1] + 7, 24, P), { tone: "lo" }));
  o.push(D([at([RES[0], RES[1], R_VID[1] + 7])], { size: 0.5, tone: "hi" }));
  return `<g data-parte="07">${o.join("")}</g>`;
}

function valvula(x, id, parte, r, h, perilla) {
  const o = [S(cil([x, 0], r + 1.4, BLOQUE_H, 2, 32, 0.3), { tone: "mid" }), S(cil([x, 0], r, BLOQUE_H + 2, h, 32, 0.4), { tone: "mid" })];
  if (perilla) o.push(L(k.knurl(x, 0, r, BLOQUE_H + 2, BLOQUE_H + 2 + h, 28, P), { tone: "lo" }));
  const p = at([x, 0, BLOQUE_H + 2 + h]);
  o.push(`<circle id="${id}" class="lampara" cx="${fx(p[0])}" cy="${fx(p[1])}" r="2.3"/>`);
  return `<g data-parte="${parte}">${o.join("")}</g>`;
}

function manometro() {
  const c = [V_MAN, 0], o = [];
  o.push(S(cil(c, 2.2, BLOQUE_H, M_Z - BLOQUE_H, 20), { tone: "mid", crease: "none" }));
  o.push(S(cil(c, 3.6, BLOQUE_H, 3, 24, 0.3), { tone: "mid" }));
  o.push(S(cil(c, M_R, M_Z, 4, 56, 0.6), { tone: "hi", crease: "lo" }));
  o.push(L(k.ring(c[0], c[1], M_R - 1.4, M_Z + 4, P, 56), { tone: "lo" }));
  o.push(`<g id="marcas-m"></g>`);
  o.push(`<path id="aguja" class="iso-line" data-tone="lit" data-free="start" d="" style="stroke:var(--rubrica);stroke-width:1.3"/>`);
  o.push(D([at([c[0], c[1], M_Z + 4])], { size: 0.9, tone: "hi" }));
  o.push(k.faceTextSvg(k.topMatrix([c[0], c[1] + 5.2], M_Z + 4, P, "x"), "bar", { size: 2.2, tone: "lo", anchor: "middle" }));
  return `<g data-parte="09">${o.join("")}</g>`;
}

function chico() {
  const o = [];
  o.push(`<g data-parte="02">${S(cil(SM, RS + 5, BLOQUE_H, S_VID[0] - BLOQUE_H, 48, 0.6), { tone: "mid" })}</g>`);
  o.push(`<g id="aceite-chico" data-parte="03"></g>`);
  // pistón + vástago + manija: se mueve entero (se pinta antes del vidrio)
  const m = [];
  m.push(S(cil(SM, RS - 0.2, S_L0, S_PIS, 48, 0.5), { tone: "hi", lit: true }));
  m.push(L(k.sideArc(SM[0], SM[1], RS - 0.2, S_L0 + 3, P, 24) + k.sideArc(SM[0], SM[1], RS - 0.2, S_L0 + 5, P, 24), { tone: "lo" }));
  m.push(S(cil(SM, 2.2, S_L0 + S_PIS, S_VAST, 20), { tone: "hi", lit: true, crease: "none" }));
  const zm = S_L0 + S_PIS + S_VAST;
  const barra = { x: SM[0] - 3.5, y: -22, w: 7, d: 44, r: 2 };
  const manija = [S(k.slabOf(barra, zm, S_MANIJA, P, 4, 0.6), { tone: "hi" })];
  for (const y of [-24, 24]) {
    manija.push(S(cil([SM[0], y], 4, zm - 1, S_MANIJA + 4, 28, 0.6), { tone: "mid" }));
    manija.push(L(k.knurl(SM[0], y, 4, zm, zm + S_MANIJA + 2, 22, P), { tone: "lo" }));
  }
  manija.push(D([at([SM[0], 0, zm + S_MANIJA])], { size: 0.6 }));
  m.push(`<g id="palanca" data-parte="01">${manija.join("")}</g>`);
  m.push(flecha("f1", [SM[0], 24, zm + S_MANIJA + 8], -1));
  o.push(`<g id="piston-chico" data-parte="02">${m.join("")}</g>`);
  o.push(`<g data-parte="02">${vidrio(SM, RS + 1.2, S_VID[0], S_VID[1])}${anillo(SM, RS + 3, S_VID[1], 3)}</g>`);
  o.push(regla(SM[0] + RS + 9, 0, S_L0 - K * XMAX + S_PIS, S_L0 + S_PIS, 1));
  return o.join("");
}

function grande() {
  const o = [];
  o.push(`<g data-parte="06">${S(cil(BG, RB + 5, 0, B_VID[0], 64, 0.8), { tone: "mid" })}`);
  o.push(L(k.ring(BG[0], BG[1], RB + 2.4, B_VID[0], P, 64), { tone: "faint" }));
  const pernos = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [BG[0] + Math.cos(a) * (RB + 3), BG[1] + Math.sin(a) * (RB + 3)]; });
  o.push(D(pernos.map(([x, y]) => at([x, y, B_VID[0]])), { size: 0.45, tone: "lo" }), `</g>`);
  o.push(`<g id="aceite-grande" data-parte="03"></g>`);
  const m = [];
  m.push(S(cil(BG, RB - 0.2, B_L0, B_PIS, 72, 0.8), { tone: "hi", lit: true }));
  m.push(L(k.sideArc(BG[0], BG[1], RB - 0.2, B_L0 + 3.5, P, 48) + k.sideArc(BG[0], BG[1], RB - 0.2, B_L0 + 6.5, P, 48), { tone: "lo" }));
  m.push(S(cil(BG, 11, B_L0 + B_PIS, B_VAST, 40), { tone: "hi", lit: true, crease: "none" }));
  o.push(`<g id="piston-grande-bajo" data-parte="06">${m.join("")}</g>`);
  o.push(`<g data-parte="06">${vidrio(BG, RB + 1.4, B_VID[0], B_VID[1])}${anillo(BG, RB + 3.4, B_VID[1], 3)}</g>`);
  return o.join("");
}

const zPlato = B_L0 + B_PIS + B_VAST;
const CARGA = { x: BG[0] - 20, y: -20, w: 40, d: 40, r: 2 };
function grandeArriba() {
  const o = [];
  o.push(S(cil(BG, 30, zPlato, B_PLATO, 64, 0.6), { tone: "mid" }));
  o.push(D(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return at([BG[0] + Math.cos(a) * 26, BG[1] + Math.sin(a) * 26, zPlato + B_PLATO]); }), { size: 0.45, tone: "lo" }));
  const zc = zPlato + B_PLATO;
  o.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARGA, 2), zc, 0.1, P)}" style="filter:blur(3px)"/>`);
  o.push(S(k.slabOf(CARGA, zc, B_CARGA, P, 4, 1), { tone: "hi" }));
  o.push(L(k.planOutline(k.insetPlan(CARGA, 4), zc + B_CARGA, P, 4), { tone: "faint" }));
  o.push(k.faceTextSvg(k.topMatrix([BG[0], 0], zc + B_CARGA, P, "x"), "CARGA", { size: 3.2, tone: "lo", anchor: "middle" }));
  o.push(flecha("f2", [BG[0], 0, zc + B_CARGA + 8], 1));
  return `<g id="piston-grande" data-parte="06">${o.join("")}</g>`;
}
function fantasma() {
  const zc = zPlato + B_PLATO;
  const d = k.slabOf(CARGA, zc, B_CARGA, P, 4, 1).outline + cil(BG, 30, zPlato, B_PLATO, 64).outline;
  const p = at([BG[0], 0, zc + B_CARGA]);
  const y0 = fx(p[1] - 34);
  return `<g id="fantasma" class="solo-trampa"><path class="fantasma" d="${d}"/><text class="t-trampa" text-anchor="middle" x="${fx(p[0])}" y="${y0}"><tspan id="t-fantasma"></tspan><tspan id="t-real" x="${fx(p[0])}" dy="15"></tspan></text></g>`;
}

// Flecha de fuerza (rúbrica). dir = -1 empuja hacia abajo, 1 hacia arriba. El largo lo ajusta la página.
function flecha(id, punta, dir) {
  const p = at(punta);
  return `<g id="flecha-${id}" class="flecha" data-x="${fx(p[0])}" data-y="${fx(p[1])}" data-dir="${dir}"><line/><polygon/><text class="t-fuerza" id="t-${id}"></text></g>`;
}

// Orden de pintado: de atrás hacia adelante (depósito, chico, válvulas, manómetro, grande).
const conjuntos = [
  { c: RES, svg: deposito() },
  { c: SM, svg: chico() },
  { c: [V_ADM, 0], svg: valvula(V_ADM, "l-admision", "04", 3, 4, false) },
  { c: [V_RET, 0], svg: valvula(V_RET, "l-retencion", "05", 4.4, 5, false) },
  { c: [V_ALI, 0], svg: valvula(V_ALI, "l-alivio", "08", 4.6, 6, true) },
  { c: [V_MAN, 0], svg: manometro() },
  { c: BG, svg: grande() },
].sort((a, b) => prof(a.c) - prof(b.c));

const figura = k.figureSvg({
  width: W, height: H, label: J.figura.aria,
  body: [placa(), bloque(), ...conjuntos.map((c) => c.svg), grandeArriba(), regla(BG[0] + RB + 10, 0, B_L0 + B_PIS, B_L0 + B_PIS + K * YMAX, 1), fantasma(), `<g id="rot"></g>`],
});

// ---------- Datos para la página ----------
const CFG = {
  P, K, XMAX, YMAX, RA, RS, RB, RR, SM, BG, RES,
  S_VID, S_L0, B_VID, B_L0, R_VID, R_L0, R_BAJA, BLOQUE_H,
  MAN: [V_MAN, 0, M_Z + 4], M_R,
  FANT_MAX: 150 - (zPlato + B_PLATO + B_CARGA),
  // Rótulos: punto en el mundo y conjunto al que se pega (para moverse con él)
  ROT: [
    { n: "01", p: [SM[0], 30, S_L0 + S_PIS + S_VAST + 3], g: "palanca" },
    { n: "02", p: [SM[0] - RS - 7, 0, S_L0 + 4], g: "piston-chico" },
    { n: "03", p: [BG[0] - 16, RB + 6, 24], g: "rot" },
    { n: "04", p: [V_ADM, 0, BLOQUE_H + 14], g: "rot" },
    { n: "05", p: [V_RET, 0, BLOQUE_H + 16], g: "rot" },
    { n: "06", p: [BG[0] + 22, RB + 4, B_L0 + 5], g: "piston-grande-bajo" },
    { n: "07", p: [RES[0], 0, R_VID[1] + 16], g: "rot" },
    { n: "08", p: [V_ALI, 0, BLOQUE_H + 18], g: "rot" },
    { n: "09", p: [V_MAN, -4, M_Z + 16], g: "rot" },
  ],
};

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const NS = "http://www.w3.org/2000/svg";
const el = (t, c) => { const e = document.createElementNS(NS, t); if (c) e.setAttribute("class", c); return e; };
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const P = C.P;

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/prensa-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/prensa-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos;
const d1 = V.d1, d2 = V.d2, rd = d2 / d1, ra = rd * rd, XMAX = RG.x.max, YMAX = C.YMAX;
const A1 = Math.PI * (d1 / 200) ** 2;
const presion = (f) => f / A1 / 1e5;
const PMAX = Math.ceil(presion(RG.F1.max));
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

let F1 = V.F1, xNow = 0, yTot = 0, carrera = 0, revelado = false, trampaOn = false, sel = null, fase = "quieto";

const svg = $(".iso-svg"), stage = $(".iso-stage"), slider = $("#f1"), bBomb = $("#bombear"), bTrampa = $("#trampa"),
  bAlivio = $("#alivio"), palanca = $("#palanca"), nota = $("#nota");
const gChico = $("#piston-chico"), gGrande = $("#piston-grande"), gGrandeB = $("#piston-grande-bajo"), fant = $("#fantasma");

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo + " · Física · Examen de admisión UNAM";
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#etq-f2").textContent = J.lecturas.fuerza;
slider.min = RG.F1.min; slider.max = RG.F1.max; slider.step = RG.F1.paso; slider.value = F1;
stage.setAttribute("aria-valuemax", XMAX);
stage.setAttribute("aria-label", "Manija de la prensa: flechas para bajarla o subirla");

// Marcas del manómetro (de 0 a PMAX bar)
const [mx, my, mz] = C.MAN;
const angM = (p) => (-120 + 240 * p / PMAX) * Math.PI / 180;
let marcas = "";
for (let i = 0; i <= PMAX; i++){
  const a = angM(i), s = Math.sin(a), c = Math.cos(a), r0 = C.M_R - 3.4, r1 = C.M_R - 1.8;
  marcas += lineOnTop([mx + s * r0, my - c * r0], [mx + s * r1, my - c * r1], mz, P);
}
$("#marcas-m").innerHTML = lineSvg(marcas, { tone: "mid" });
const aguja = $("#aguja");
const ponAguja = (p) => { const a = angM(p), s = Math.sin(a), c = Math.cos(a), r = C.M_R - 2.2;
  aguja.setAttribute("d", lineOnTop([mx - s * 2, my + c * 2], [mx + s * r, my - c * r], mz + 0.2, P)); };

// Aceite: se reconstruye cuando cambia su nivel
const aceite = (c, r, z0, z1) => solidSvg(cylinder(c[0], c[1], r, z0, Math.max(0.6, z1 - z0), P, 56), { tone: "mid", className: "aceite", crease: "none" });
const gAc = { chico: $("#aceite-chico"), grande: $("#aceite-grande"), dep: $("#aceite-deposito") };
const ultimo = {};
function ponAceite(key, c, r, z0, z1){
  const v = Math.round(z1 * 20) / 20;
  if (ultimo[key] === v) return; ultimo[key] = v;
  gAc[key].innerHTML = aceite(c, r, z0, v);
}

// ---------- Rótulos y fichas ----------
const FICHAS = {
  "01": ["Manija", () => `Aquí aplicas F<sub>1</sub> = ${num(F1)} N. Baja el pistón chico; es la fuerza que la prensa va a multiplicar.`],
  "02": ["Pistón chico", () => `Área chica: con ${num(F1)} N crea ${num(presion(F1),1)} bar en el aceite. Es delgado para que poca fuerza dé mucha presión.`],
  "03": ["Aceite", () => "Casi no se comprime: la presión que recibe llega igual a todo el líquido (principio de Pascal). Por eso es un líquido y no aire."],
  "04": ["Válvula de admisión", () => "Cuando sueltas, deja pasar aceite del depósito al pistón chico. Al empujar se cierra para que el aceite no regrese."],
  "05": ["Válvula de retención", () => "Deja pasar aceite hacia el pistón grande y no lo deja volver. Por eso el grande no baja cuando sueltas."],
  "06": ["Pistón grande", () => `Su área es ${num(ra)} veces la del chico: la misma presión empuja ${num(ra)} veces más (${num(F1*ra)} N), pero sube ${num(ra)} veces menos.`],
  "07": ["Depósito", () => "Guarda el aceite de repuesto. Su nivel baja con cada embolada: ese aceite se queda bajo el pistón grande."],
  "08": ["Válvula de alivio", () => "Al abrirla, el aceite regresa al depósito y el pistón grande baja. Sin ella, la carga se quedaría arriba."],
  "09": ["Manómetro", () => `Mide la presión del aceite: ${num(presion(F1),1)} bar con F<sub>1</sub> = ${num(F1)} N. Es la misma bajo los dos pistones; lo que cambia es el área.`]
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
C.ROT.forEach(r => {
  const b = document.createElement("button"); b.type = "button"; b.className = "rot-b"; b.dataset.n = r.n;
  b.setAttribute("aria-pressed", "false"); b.innerHTML = `<b>${r.n}</b>${FICHAS[r.n][0]}`;
  b.addEventListener("click", () => seleccionar(r.n)); $("#rotulos").append(b);
  const [x, y] = iso(r.p, P);
  const g = el("g", "rot"); g.dataset.n = r.n; g.setAttribute("aria-hidden", "true");
  const c = el("circle"); c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); c.setAttribute("r", 8.5);
  const t = el("text"); t.setAttribute("x", x.toFixed(1)); t.setAttribute("y", (y + 0.4).toFixed(1)); t.textContent = r.n;
  g.append(c, t); g.addEventListener("click", (e) => { e.stopPropagation(); seleccionar(r.n); });
  $("#" + r.g).append(g);
});

// ---------- Mensajes ----------
const MSJ = {
  empuje: "Empujas: la retención se abre y el aceite pasa al pistón grande. La presión es la misma en todo el aceite.",
  admision: "Sueltas: la retención se cierra (el grande no baja) y entra aceite del depósito al pistón chico.",
  alivio: "Alivio abierto: el aceite regresa al depósito y el pistón grande baja."
};
let enRecorrido = false;
const decir = (t) => { if (!enRecorrido) nota.textContent = t; };
function ponFase(f){ if (f !== fase){ fase = f; if (MSJ[f]) decir(MSJ[f]); } }
let avisoTope = 0;
function avisarTope(){
  const t = performance.now(); if (t - avisoTope < 1500) return; avisoTope = t;
  decir(`Tope: el pistón grande ya subió ${num(YMAX)} cm. Abre el alivio para bajarlo.`);
}
function revelar(){ if (!revelado && !enRecorrido){ revelado = true; render(); } }

// ---------- Estado ----------
function setX(nx){
  nx = Math.max(0, Math.min(XMAX, nx));
  let dx = nx - xNow;
  if (dx > 1e-9){
    if (xNow < 1e-9) carrera = 0;
    const cabe = Math.max(0, (YMAX - yTot) * ra);
    if (dx > cabe){ dx = cabe; avisarTope(); }
    if (dx > 0){ yTot = Math.min(YMAX, yTot + dx / ra); carrera += dx; xNow += dx; ponFase("empuje"); revelar(); }
  } else if (dx < -1e-9){ xNow = nx; ponFase("admision"); }
  render();
}

// Flechas: largo en pantalla según F (no a escala: el texto lleva el número)
function ponFlecha(id, largo, texto){
  const g = $("#flecha-" + id), x = +g.dataset.x, y = +g.dataset.y, dir = +g.dataset.dir;
  const ln = g.querySelector("line"), pl = g.querySelector("polygon"), tx = g.querySelector("text");
  if (dir < 0){ // empuja hacia abajo: punta en (x, y)
    ln.setAttribute("x1", x); ln.setAttribute("y1", y - largo); ln.setAttribute("x2", x); ln.setAttribute("y2", y - 9);
    pl.setAttribute("points", `${x},${y} ${x - 5},${y - 10} ${x + 5},${y - 10}`);
    tx.setAttribute("x", x + 9); tx.setAttribute("y", y - largo / 2 - 4);
  } else {      // empuja hacia arriba: cola en (x, y)
    ln.setAttribute("x1", x); ln.setAttribute("y1", y); ln.setAttribute("x2", x); ln.setAttribute("y2", y - largo + 9);
    pl.setAttribute("points", `${x},${y - largo} ${x - 6},${y - largo + 11} ${x + 6},${y - largo + 11}`);
    tx.setAttribute("x", x + 10); tx.setAttribute("y", y - largo / 2 + 2);
  }
  tx.textContent = texto;
}

function render(){
  const F2 = F1 * ra, P1 = presion(F1), hayP = xNow > 1e-9 || yTot > 1e-9;
  gChico.setAttribute("transform", translateAlong(P, [0, 0, -C.K * xNow]));
  const tg = translateAlong(P, [0, 0, C.K * yTot]);
  gGrande.setAttribute("transform", tg); gGrandeB.setAttribute("transform", tg);
  ponAceite("chico", C.SM, C.RS, C.S_VID[0], C.S_L0 - C.K * xNow);
  ponAceite("grande", C.BG, C.RB, C.B_VID[0], C.B_L0 + C.K * yTot);
  ponAceite("dep", C.RES, C.RR, C.R_VID[0], C.R_L0 - C.R_BAJA * (yTot - xNow / ra) / YMAX);
  $("#l-admision").classList.toggle("abierta", fase === "admision");
  $("#l-retencion").classList.toggle("abierta", fase === "empuje");
  $("#l-alivio").classList.toggle("abierta", fase === "alivio");
  ponAguja(hayP ? P1 : 0);

  const kF = (F1 - RG.F1.min) / (RG.F1.max - RG.F1.min);
  ponFlecha("f1", 26 + 22 * kF, `F₁ = ${num(F1)} N`);
  ponFlecha("f2", 34 + 40 * kF, revelado ? `F₂ = ${num(F2)} N` : "F₂ = ?");

  // Trampa: dónde estaría la carga si el grande subiera lo mismo que bajó el chico
  const xg = carrera > 1e-9 ? carrera : XMAX, yg = xg / ra;
  const sube = Math.min(C.FANT_MAX, C.K * (yTot + xg - yg));
  fant.setAttribute("transform", translateAlong(P, [0, 0, sube]));
  $("#t-fantasma").textContent = `si subiera igual: +${num(xg)} cm`;
  $("#t-real").textContent = `de verdad: +${num(yg)} cm`;

  $("#o-f2").textContent = revelado ? `${num(F2)} N` : "?";
  $("#o-formula").innerHTML = revelado
    ? `F<sub>2</sub> = F<sub>1</sub> × (d<sub>2</sub> ÷ d<sub>1</sub>)² = ${num(F1)} × ${num(ra)} = ${num(F2)} N`
    : "Elige tu predicción o bombea para verla.";
  $("#o-f1").textContent = `${num(F1)} N`;
  slider.style.setProperty("--p", (100 * kF) + "%");
  slider.setAttribute("aria-valuetext", revelado ? `F₁ = ${num(F1)} N, sale F₂ = ${num(F2)} N` : `F₁ = ${num(F1)} N`);
  $("#o-p").textContent = `${num(hayP ? P1 : 0, 1)} bar`;
  $("#o-x").textContent = `${num(carrera, 1)} cm`;
  $("#o-y").textContent = `${num(yTot, 1)} cm`;
  const lect = `x = ${num(carrera,1)} cm · sube ${num(carrera/ra,1)} cm · ${num(hayP ? P1 : 0,1)} bar`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", num(xNow, 1));
  stage.setAttribute("aria-valuetext", `baja ${num(xNow,1)} cm; el grande subió ${num(yTot,1)} cm en total`);
  bBomb.textContent = xNow > 1e-9 ? "Soltar" : "Bombear";
  bAlivio.disabled = fase === "alivio" || (yTot < 1e-9 && xNow < 1e-9);

  const L = J.lecturas, nl = L.numerales, W1 = F1 * xg / 100, W2 = F2 * yg / 100;
  const filas = [
    [L.razonDiametros, tpl(L.razonDiametrosValor, {d2:num(d2), d1:num(d1), rd:num(rd)})],
    [L.razonAreas, tpl(L.razonAreasValor, {rd:num(rd), ra:num(ra)})],
    [L.fuerza, tpl(L.fuerzaValor, {F2:num(F2)}) + `<br><span class="et">${tpl(L.trampa, {rd:num(rd), Ftrampa:num(F1*rd)})}</span>`],
    [L.recorrido, tpl(L.recorridoValor, {x:num(xg), ra:num(ra), y:num(yg)})],
    [L.trabajo, tpl(L.w1, {F1:num(F1), xm:num(xg/100,3), W1:num(W1)}) + "<br>" + tpl(L.w2, {F2:num(F2), ym:num(yg/100,4), W2:num(W2)}) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((f, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${f[0]}</span><span class="va">${f[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento (solo mientras algo se mueve) ----------
let anim = 0;
const suave = (k) => k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2;
function animar(dur, paso, fin){
  cancelAnimationFrame(anim);
  if (quieto){ paso(1); fin(); return; }
  const t0 = performance.now();
  const f = (t) => { const k = Math.min(1, (t - t0) / dur); paso(suave(k)); if (k < 1) anim = requestAnimationFrame(f); else fin(); };
  anim = requestAnimationFrame(f);
}
let alTerminar = null;
const terminar = () => { fase = "quieto"; render(); const f = alTerminar; alTerminar = null; if (f) f(); };
function bombear(){
  if (fase === "alivio") return;
  if (xNow > 1e-9){ const x0 = xNow; animar(900 * x0 / XMAX + 250, (s) => setX(x0 * (1 - s)), terminar); return; }
  if (yTot >= YMAX - 1e-9){ avisarTope(); terminar(); return; }
  animar(1500, (s) => setX(XMAX * s), terminar);
}
function aliviar(){
  const y0 = yTot, x0 = xNow; ponFase("alivio");
  animar(1700, (s) => { yTot = y0 * (1 - s); xNow = x0 * (1 - s); render(); }, () => { yTot = 0; xNow = 0; carrera = 0; terminar(); });
}

// ---------- Recorrido automático: se muestra sola; se detiene al tocar y retoma a los 6 s ----------
let tRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  alTerminar = () => { tRec = setTimeout(pasoRecorrido, xNow > 1e-9 ? 350 : 700); };
  if (yTot >= YMAX - 1e-9 && xNow < 1e-9) aliviar(); else bombear();
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return; enRecorrido = true; nota.textContent = ""; pasoRecorrido(); }
function tomarControl(){
  if (enRecorrido){ enRecorrido = false; alTerminar = null; clearTimeout(tRec); cancelAnimationFrame(anim); if (fase !== "quieto"){ fase = "quieto"; render(); } }
  clearTimeout(tRec); tRec = setTimeout(iniciarRecorrido, 6000);
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (!visible && enRecorrido) tomarControl(); }, {rootMargin:"0px"}).observe(stage);
setTimeout(() => { if (visible) iniciarRecorrido(); else tRec = setTimeout(iniciarRecorrido, 6000); }, 1400);

// ---------- Controles ----------
bBomb.addEventListener("click", bombear);
bAlivio.addEventListener("click", aliviar);
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; svg.classList.toggle("trampa-on", trampaOn);
  bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? "Ocultar la trampa" : "¿Sube igual?";
  const xg = carrera > 1e-9 ? carrera : XMAX;
  if (trampaOn) decir(`No sube igual. El aceite que sale del pistón chico (${num(xg)} cm de recorrido) se reparte en un área ${num(ra)} veces mayor: el grande sube ${num(xg)} ÷ ${num(ra)} = ${num(xg/ra)} cm. ${J.lecturas.mensaje}`);
  render();
});
slider.addEventListener("input", () => { F1 = +slider.value; render(); preguntaPredice(); });
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); bombear();
});
let tFase = 0;
stage.addEventListener("keydown", (e) => {
  const paso = 5 * RG.x.paso;
  const m = {ArrowDown:paso, ArrowRight:paso, ArrowUp:-paso, ArrowLeft:-paso, PageDown:4*paso, PageUp:-4*paso, End:XMAX, Home:-XMAX}[e.key];
  if (m === undefined || fase === "alivio") return;
  e.preventDefault(); cancelAnimationFrame(anim); setX(xNow + m);
  clearTimeout(tFase); tFase = setTimeout(terminar, 350);
});
// Arrastre de la manija (dedo o mouse): touch-action:none solo en la manija
let arr = null;
const yPant = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()).y; };
const porCm = screenRise(C.K, P);
palanca.addEventListener("pointerdown", (e) => {
  if (fase === "alivio") return;
  cancelAnimationFrame(anim); arr = {y0:yPant(e), x0:xNow}; palanca.setPointerCapture(e.pointerId); e.preventDefault();
});
palanca.addEventListener("pointermove", (e) => { if (arr) setX(arr.x0 + (yPant(e) - arr.y0) / porCm); });
const soltar = () => { if (arr){ arr = null; terminar(); } };
palanca.addEventListener("pointerup", soltar); palanca.addEventListener("pointercancel", soltar);

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
function preguntaPredice(){
  const F2 = F1 * ra;
  $("#pred-q").innerHTML = `Empujas la manija con ${num(F1)} N. ¿Qué fuerza sale en el pistón grande? Elige y la prensa bombea para comprobarlo.`;
  opciones($("#pred-ops"), [
    {t:`${num(F1)} N, la misma`, e:"Lo que se transmite igual es la presión, no la fuerza."},
    {t:`${num(F1*rd)} N, ×${num(rd)} como los diámetros`, e:`Tienta porque el pistón grande es ${num(rd)} veces más ancho, pero empuja con su área: (${num(rd)})² = ${num(ra)}.`},
    {t:`${num(F2)} N, ×${num(ra)} como las áreas`, ok:true, e:`Misma presión en un área ${num(ra)} veces mayor: ${num(F1)} × ${num(ra)} = ${num(F2)} N.`}
  ], () => { revelado = true; render(); if (xNow < 1e-9 && fase === "quieto") bombear(); });
}

// ---------- Los 6 pasos (capa 1) ----------
const n = {d1:num(d1), d2:num(d2), F1:num(V.F1), rd:num(rd), ra:num(ra), F2:num(V.F1*ra), Fd:num(V.F1*rd), Fi:num(V.F1/rd),
  x:num(V.x), xd:num(V.x/rd), y:num(V.x/ra), xm:num(V.x*ra)};
const volumen = "El volumen que sale del pistón pequeño entra al grande.";
const PASOS = [
  {n:1, titulo:"Pregunta de examen", enunciado:`Una prensa hidráulica tiene un pistón pequeño de ${n.d1} cm de diámetro y uno grande de ${n.d2} cm. Si aplicas ${n.F1} N en el pequeño, ¿qué fuerza obtienes en el grande?`,
    ops:[{t:`A) ${n.F1} N`, e:"Lo que se transmite igual es la presión, no la fuerza."},
         {t:`B) ${n.Fd} N`, e:`Usaste la razón de diámetros (×${n.rd}). El área crece con el cuadrado del diámetro.`},
         {t:`C) ${n.F2} N`, ok:true, e:`Razón de áreas (${n.d2} ÷ ${n.d1})² = ${n.ra}, y F<sub>2</sub> = ${n.F1} × ${n.ra} = ${n.F2} N.`},
         {t:`D) ${n.Fi} N`, e:"La invertiste: el pistón grande da más fuerza, no menos."}]},
  {n:2, titulo:"Idea en una frase", p:["El líquido transmite la misma presión a todos lados:",
    '<span class="formula">F<sub>1</sub> / A<sub>1</sub> = F<sub>2</sub> / A<sub>2</sub></span>',
    "Bombea en la lámina: el manómetro marca una sola presión para los dos pistones. El grande empuja más porque tiene más área."]},
  {n:3, titulo:"Ejemplo resuelto", p:[`Razón de diámetros: ${n.d2} ÷ ${n.d1} = <b>${n.rd}</b>.`, `Razón de áreas: ${n.rd}² = <b>${n.ra}</b>.`,
    `F<sub>2</sub> = ${n.F1} × ${n.ra} = <b>${n.F2} N</b> → respuesta C.`]},
  {n:4, titulo:"La trampa", p:[`Usar la razón de diámetros (×${n.rd}) da ${n.Fd} N, la opción B, puesta para quien cae.`,
    "El área crece con el cuadrado del diámetro.",
    `La otra cara de la trampa: creer que el pistón grande sube lo mismo. Pulsa «¿Sube igual?» en la lámina: sube ${n.ra} veces menos.`]},
  {n:5, titulo:"Truco de examen", p:["Si te dan diámetros o radios, eleva la razón al cuadrado antes de multiplicar.",
    "La fuerza se multiplica por la razón de áreas; el recorrido se divide entre ella."]},
  {n:6, titulo:"Ponte a prueba", enunciado:`Con la misma prensa, si el pistón pequeño baja ${n.x} cm, ¿cuánto sube el grande?`,
    ops:[{t:`A) ${n.x} cm`, e:`${volumen} Si subiera igual, la prensa daría más energía de la que recibe.`},
         {t:`B) ${n.xd} cm`, e:`${volumen} Dividiste entre la razón de diámetros; el volumen depende del área (×${n.ra}).`},
         {t:`C) ${n.y} cm`, ok:true, e:`${volumen} La prensa multiplica la fuerza, no la energía: ganas fuerza, pierdes recorrido (${n.x} ÷ ${n.ra} = ${n.y}).`},
         {t:`D) ${n.xm} cm`, e:`${volumen} Multiplicaste: la fuerza se multiplica, el recorrido se divide.`}]}
];
PASOS.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.p || []).map(t => `<p>${t}</p>`).join("");
  if (p.enunciado){ s.insertAdjacentHTML("beforeend", `<p>${p.enunciado}</p>`); const l = document.createElement("div"); l.className = "opciones"; opciones(l, p.ops); s.append(l); }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});
$("#otro").innerHTML = `<h3>Otro intento</h3><p>${J.prueba.pregunta}</p><div class="opciones"></div>`;
opciones($("#otro .opciones"), J.prueba.opciones.map(o => ({t:`${o.letra}) ${o.texto}`, ok:o.correcta, e:o.retro})));

$("#pie").innerHTML = `<i>${J.figura.pie}</i> Modelo: d<sub>1</sub> = ${n.d1} cm y d<sub>2</sub> = ${n.d2} cm, así que el área grande es ${n.ra} veces la chica.
 Los dos pistones están dibujados a la misma escala vertical: cada embolada baja el chico hasta ${num(XMAX)} cm y el grande sube como máximo ${num(YMAX)} cm en total (tope del dibujo).
 Se supone aceite que no se comprime, sin fricción ni fugas; las flechas de fuerza y el nivel del depósito no están a escala.
 Si nadie toca, la lámina se muestra sola. Teclas: B bombea o suelta; con la lámina enfocada, las flechas bajan o suben la manija.`;

pintarFicha(); preguntaPredice(); render();
window.__prensa = { set:(o) => { if ("x" in o) xNow = o.x; if ("y" in o) yTot = o.y; if ("c" in o) carrera = o.c; if ("F1" in o) F1 = o.F1; if ("rev" in o) revelado = o.rev; render(); },
  trampa:() => bTrampa.click(), sel:seleccionar, alto:() => tomarControl() };
})();
}

// ---------- Página ----------
const CSS_PAGINA = `
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
const plate = k.plateHtml({
  fig: "Lámina I",
  title: "Prensa hidráulica",
  hint: J.instruccion,
  readout: "x = 0 cm · sube 0 cm · 0 bar",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuenow="0">${figura}</div>`,
});
const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Prensa hidráulica · Códice Vivo</title>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
</head>
<body>
<main class="pagina">
  <header>
    <div class="marca-casa">Códice Vivo · Laboratorio</div>
    <h1 id="titulo">Prensa hidráulica</h1>
    <p class="sub" id="subtitulo"></p>
  </header>
  <div class="rejilla">
    <div id="pasos-a" class="pasos"></div>
    <section class="tarjeta lab" aria-label="Laboratorio">
      <div class="predice">
        <h3>Predice antes de bombear</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="iso escena">${plate}</div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la prensa"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="etq-f2"></span>
          <output id="o-f2" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div>
          <div class="fila"><label for="f1">Fuerza en la manija, F<sub>1</sub></label><output id="o-f1"></output></div>
          <input type="range" id="f1">
        </div>
        <div class="chips">
          <div class="chip"><span>Presión del aceite</span><output id="o-p"></output></div>
          <div class="chip"><span>Baja el chico</span><output id="o-x"></output></div>
          <div class="chip"><span>Subió el grande</span><output id="o-y"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="bombear" aria-keyshortcuts="b">Bombear</button>
          <button type="button" class="boton sec" id="trampa" aria-pressed="false">¿Sube igual?</button>
          <button type="button" class="boton sec" id="alivio">Abrir alivio</button>
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
<script type="module">${(kitScript() + `\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
</body>
</html>
`;

const i = process.argv.indexOf("--vista");
if (i > 0) {
  const respaldo = `<script type="application/json" id="respaldo">${JSON.stringify(J)}</script>`;
  writeFileSync(process.argv[i + 1], HTML.replace("<!--respaldo-->", respaldo));
  console.log("vista previa:", process.argv[i + 1]);
}
writeFileSync(SALIDA, HTML.replace("<!--respaldo-->\n", ""));
console.log("escrito:", SALIDA, (Buffer.byteLength(HTML) / 1024).toFixed(1) + " KB");

