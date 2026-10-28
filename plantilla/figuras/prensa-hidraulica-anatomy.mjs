// Figura premium: prensa hidráulica con pistones que se mueven (experimento Anatomy).
// Genera plantilla/interactivos/prensa-hidraulica/premium/index.html (página autónoma).
// Uso: node plantilla/figuras/prensa-hidraulica-anatomy.mjs
// Los números salen de contenido/fisica/prensa-interactivo.json (d1, d2, F1 y el máximo de x).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../.claude/skills/anatomy/kit/tube.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const OUT = join(ROOT, "plantilla/interactivos/prensa-hidraulica/premium/index.html");
const DATA = JSON.parse(readFileSync(join(ROOT, "contenido/fisica/prensa-interactivo.json"), "utf8"));

// Modelo: misma presión en ambos lados y mismo volumen desplazado.
const { d1, d2, F1 } = DATA.valoresIniciales;
const X_MAX = DATA.rangos.x.max; // cm que baja el pistón chico
const RA = (d2 / d1) ** 2; // razón de áreas
const F2 = F1 * RA;
const Y_MAX = X_MAX / RA; // cm que sube el pistón grande

const WIDTH = 600;
const HEIGHT = 400;

// Mundo: diámetros a 4 u por cm (radio = 2·d), carrera a 1 u por cm.
// Como las áreas dibujadas guardan la razón real, el volumen dibujado también se conserva.
const R_PER_CM = 4;
const TRAVEL = 1;

const PLATE = { x: -156, y: -78, w: 256, d: 142, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const SMALL = { x: -122, y: 0, rIn: (d1 / 2) * R_PER_CM, collarH: 20, top: 150, pistonZ: 136, pistonH: 8, rodR: 2.4, rodLen: 26 };
SMALL.rOut = SMALL.rIn + 2;
SMALL.collarR = SMALL.rIn + 8;
const BIG = { x: 30, y: 0, rIn: (d2 / 2) * R_PER_CM, collarH: 16, top: 74, pistonZ: 42, pistonH: 12, rodR: 9, platenZ: 84 };
BIG.rOut = BIG.rIn + 3;
BIG.collarR = BIG.rIn + 12;

const PIPE_R = 3;
const PIPE_Z = 9;

const SMALL_ARROW = { len: 30, shaft: 2.2, head: 6, headLen: 10 };
const BIG_ARROW = { len: 58, shaft: 4.2, head: 11, headLen: 18 };
const PLATEN = { r: 30, h: 6 };
const PLATEN_TOP = BIG.platenZ + PLATEN.h;

// Reloj comparador sobre la platina: una vuelta completa = toda la subida (Y_MAX).
const DIAL = [40, -20];
const DIAL_R = 13;
const DIAL_Z = PLATEN_TOP + 24;
const DIAL_H = 8;
const DIAL_TOP = DIAL_Z + DIAL_H;
const POST = [40, -66];
const MAG = { x: 32, y: -74, w: 16, d: 14, r: 2.5 };
const MAG_H = 14;
const POST_TOP = DIAL_Z + 16;

const padZ = (x) => SMALL.pistonZ - x * TRAVEL + SMALL.pistonH + SMALL.rodLen;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [SMALL.x, SMALL.y, padZ(0) + 4 + SMALL_ARROW.len],
    [BIG.x, BIG.y, PLATEN_TOP + Y_MAX * TRAVEL + BIG_ARROW.len],
    [POST[0], POST[1], POST_TOP + 2],
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 55 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const [vx, vy] = k.towardViewer(P);
const FACING = Math.atan2(vy, vx);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const UP = (x, y, z) => G.frameAlong([x, y, z], [0, 0, 1]);
const up = (dz) => k.translateAlong(P, [0, 0, dz]);

function arc(cx, cy, r, z, from, to, steps = 48) {
  const points = [];
  for (let step = 0; step <= steps; step++) {
    const angle = from + ((to - from) * step) / steps;
    points.push(at([cx + r * Math.cos(angle), cy + r * Math.sin(angle), z]));
  }
  return k.pathOf(points);
}
const frontArc = (cx, cy, r, z) => arc(cx, cy, r, z, FACING - Math.PI / 2, FACING + Math.PI / 2);
const backArc = (cx, cy, r, z) => arc(cx, cy, r, z, FACING + Math.PI / 2, FACING + (3 * Math.PI) / 2);
const ringDots = (cx, cy, r, z, count, phase = 0) =>
  Array.from({ length: count }, (_, index) => {
    const angle = phase + (index / count) * Math.PI * 2;
    return at([cx + r * Math.cos(angle), cy + r * Math.sin(angle), z]);
  });

// Base: placa sobre cuatro patas, ranura, tornillos, placa de datos y regla.
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const strip = { x: PLATE.x + 14, y: PLATE.y + PLATE.d - 15, w: 104, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));

  // Placa de datos con tres renglones grabados.
  const label = { x: PLATE.x + 132, y: PLATE.y + PLATE.d - 17, w: 26, d: 11, r: 1 };
  out.push(S(k.slabOf(label, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  out.push(L([3, 5.5, 8].map((dy) => k.lineOnTop([label.x + 4, label.y + dy], [label.x + (dy === 8 ? 14 : 22), label.y + dy], 0.6, P)).join(""), { tone: "faint", free: true }));
  out.push(D([at([label.x + 1.6, label.y + 5.5, 0.6]), at([label.x + label.w - 1.6, label.y + 5.5, 0.6])], { size: 0.4 }));
  return out.join("");
}

// Copa metálica donde asienta cada cilindro de vidrio.
function collar(c) {
  const out = [];
  out.push(S(k.cylinder(c.x, c.y, c.collarR + 2, 0, 2.4, P, 72, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(c.x, c.y, c.collarR, 2.4, c.collarH - 2.4, P, 72, 0.8), { tone: "mid", inner: L(k.sideArc(c.x, c.y, c.collarR, c.collarH - 4, P, 48), { tone: "faint" }) }));
  out.push(L(k.ring(c.x, c.y, c.rOut + 1.2, c.collarH, P, 64), { tone: "lo" }));
  out.push(D(ringDots(c.x, c.y, (c.rOut + 1.2 + c.collarR) / 2, c.collarH, 8, Math.PI / 8), { size: 0.5 }));
  out.push(D(ringDots(c.x, c.y, c.collarR + 1, 2.4, 12, Math.PI / 12), { size: 0.4, tone: "lo" }));
  return out.join("");
}

// Cilindro de vidrio: mitad trasera (relleno tenue y borde trasero) y mitad delantera (contornos).
function glassBack(c) {
  const out = [];
  const body = k.cylinder(c.x, c.y, c.rOut, c.collarH, c.top - c.collarH, P, 72);
  out.push(`<path class="vidrio" d="${body.fill}"/>`);
  out.push(L(backArc(c.x, c.y, c.rOut, c.top), { tone: "mid" }));
  out.push(L(backArc(c.x, c.y, c.rIn, c.top), { tone: "lo" }));
  return out.join("");
}
function glassFront(c, scale = "") {
  const out = [];
  const edge = (angle, r) => [c.x + r * Math.cos(angle), c.y + r * Math.sin(angle)];
  const left = edge(FACING - Math.PI / 2, c.rOut);
  const right = edge(FACING + Math.PI / 2, c.rOut);
  out.push(L(k.rise(left, c.collarH, c.top, P) + k.rise(right, c.collarH, c.top, P), { tone: "mid" }));
  out.push(scale);
  const shine = edge(FACING - 0.55, c.rOut);
  const shine2 = edge(FACING - 0.32, c.rOut);
  out.push(`<path class="iso-line brillo" d="${k.rise(shine, c.collarH, c.top, P)}"/>`);
  out.push(`<path class="iso-line brillo fino" d="${k.rise(shine2, c.collarH, c.top, P)}"/>`);
  out.push(L(frontArc(c.x, c.y, c.rIn, c.top), { tone: "lo" }));
  out.push(L(frontArc(c.x, c.y, c.rOut, c.top), { tone: "mid" }));
  out.push(L(frontArc(c.x, c.y, c.rOut, c.collarH), { tone: "lo" }));
  return out.join("");
}

// Graduación impresa en el vidrio chico: 0 en la cara del pistón en reposo, una marca cada 5 cm.
function smallScale() {
  const c = SMALL;
  const zero = c.pistonZ + c.pistonH;
  const minor = [];
  const major = [];
  for (let cm = 0; cm <= X_MAX; cm += 5) {
    const big = cm % 10 === 0;
    const from = FACING + 0.25;
    (big ? major : minor).push(arc(c.x, c.y, c.rOut, zero - cm * TRAVEL, from, from + (big ? 0.7 : 0.4), 8));
  }
  return L(minor.join(""), { tone: "lo", free: true }) + L(major.join(""), { tone: "mid", free: true });
}

// Pistón con dos anillos de sello.
function piston(c) {
  const seals = [c.pistonZ + c.pistonH * 0.3, c.pistonZ + c.pistonH * 0.7].map((z) => k.sideArc(c.x, c.y, c.rIn, z, P, 48)).join("");
  return S(k.cylinder(c.x, c.y, c.rIn, c.pistonZ, c.pistonH, P, 72, 0.6), { tone: "hi", crease: "lo", inner: L(seals, { tone: "lo" }) });
}
const oil = (c, top) => S(k.cylinder(c.x, c.y, c.rIn, c.collarH, top - c.collarH, P, 72), { tone: "lo", crease: "none" });

// Flecha sólida: vástago y punta cónica. `from` es la cola; `dir` +1 sube, −1 baja.
function arrow(x, y, from, dir, a) {
  const neck = from + dir * (a.len - a.headLen);
  const shaft = S(k.cylinder(x, y, a.shaft, Math.min(from, neck), Math.abs(neck - from), P, 40), { tone: "hi", crease: "lo", lit: true });
  const head = S(G.solidOf([[0, a.head], [a.headLen, 0]], G.frameAlong([x, y, neck], [0, 0, dir]), P), { tone: "hi", crease: "lo", lit: true });
  return `<g class="flecha">${dir > 0 ? shaft + head : head + shaft}</g>`;
}

// Émbolo chico: pistón, vástago, cabeza moleteada y la flecha F₁ (todo se mueve junto).
function smallMoving() {
  const c = SMALL;
  const out = [piston(c)];
  const rodTop = padZ(0);
  out.push(S(k.cylinder(c.x, c.y, c.rodR, c.pistonZ + c.pistonH, rodTop - c.pistonZ - c.pistonH, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(c.x, c.y, 3.6, rodTop - 1.6, 1.6, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(c.x, c.y, 6.5, rodTop, 4, P, 40, 0.5), { tone: "mid" }));
  out.push(L(k.knurl(c.x, c.y, 6.5, rodTop, rodTop + 4, 32, P), { tone: "lo" }));
  out.push(arrow(c.x, c.y, rodTop + 4 + SMALL_ARROW.len, -1, SMALL_ARROW));
  return out.join("");
}

// Émbolo grande: pistón, vástago, platina con tornillos y la flecha F₂.
function bigMoving() {
  const c = BIG;
  const out = [piston(c)];
  out.push(S(k.cylinder(c.x, c.y, c.rodR, c.pistonZ + c.pistonH, c.platenZ - c.pistonZ - c.pistonH, P, 48), { tone: "mid", crease: "none", inner: L(k.sideArc(c.x, c.y, c.rodR, c.top + 3, P, 24), { tone: "faint" }) }));
  out.push(S(k.cylinder(c.x, c.y, c.rodR + 3, c.platenZ - 2, 2, P, 48), { tone: "mid" }));
  out.push(`<path class="iso-halo" d="${k.cylinder(c.x, c.y, PLATEN.r - 6, c.top + 2, 0.1, P, 48).fill}" style="filter:blur(5px);opacity:.18"/>`);
  out.push(S(k.cylinder(c.x, c.y, PLATEN.r, c.platenZ, PLATEN.h, P, 96, 1), { tone: "mid", inner: L(k.sideArc(c.x, c.y, PLATEN.r, c.platenZ + 2, P, 64), { tone: "faint" }) }));
  out.push(L(k.ring(c.x, c.y, PLATEN.r - 4, PLATEN_TOP, P, 96), { tone: "lo" }));
  out.push(L(k.ring(c.x, c.y, BIG_ARROW.shaft + 3, PLATEN_TOP, P, 40), { tone: "lo" }));
  out.push(D(ringDots(c.x, c.y, PLATEN.r - 8, PLATEN_TOP, 6, Math.PI / 6), { size: 0.5 }));
  return out.join("");
}

// Soporte del reloj: base magnética con perilla, poste, abrazadera y brazo.
function stand() {
  const out = [`<path class="iso-halo" d="${k.haloOf(MAG, 0, 0.1, P)}" style="filter:blur(3px);opacity:.3"/>`];
  out.push(S(k.slabOf(MAG, 0, 8, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(MAG, 0.8), 8, MAG_H - 8, P, 4, 0.6), { tone: "mid" }));
  out.push(D([at([MAG.x + 3, MAG.y + 3, MAG_H]), at([MAG.x + MAG.w - 3, MAG.y + 3, MAG_H]), at([MAG.x + 3, MAG.y + MAG.d - 3, MAG_H])], { size: 0.45 }));
  const knob = [MAG.x + MAG.w - 4, MAG.y + MAG.d - 4];
  out.push(S(k.cylinder(knob[0], knob[1], 2.6, MAG_H, 3, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 2.6, MAG_H, MAG_H + 3, 18, P, 0.3), { tone: "lo" }));
  out.push(S(k.cylinder(POST[0], POST[1], 3.2, MAG_H, DIAL_Z - 2 - MAG_H, P, 28), { tone: "mid", crease: "none", inner: L(k.sideArc(POST[0], POST[1], 3.2, (MAG_H + DIAL_Z) / 2, P, 16), { tone: "faint" }) }));
  const clamp = { x: POST[0] - 6, y: POST[1] - 6, w: 12, d: 12, r: 2 };
  out.push(S(k.slabOf(clamp, DIAL_Z - 2, 10, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(POST[0], POST[1], 3.2, DIAL_Z + 8, POST_TOP - DIAL_Z - 8, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(POST[0], POST[1], 3.8, POST_TOP, 2, P, 28), { tone: "mid" }));
  const arm = { x: DIAL[0] - 3, y: clamp.y + clamp.d, w: 6, d: DIAL[1] - DIAL_R + 2 - clamp.y - clamp.d, r: 1.5 };
  out.push(S(k.slabOf(arm, DIAL_Z + 2, 4, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([DIAL[0], arm.y + 4, DIAL_Z + 6]), at([DIAL[0], arm.y + arm.d - 4, DIAL_Z + 6])], { size: 0.45 }));
  return out.join("");
}

// Palpador del reloj: punta sobre la platina y vástago (sube con la platina).
function plunger() {
  const [x, y] = DIAL;
  return S(k.cylinder(x, y, 2.2, PLATEN_TOP, 2, P, 20), { tone: "hi" }) + S(k.cylinder(x, y, 1.2, PLATEN_TOP + 2, DIAL_Z - PLATEN_TOP - 2, P, 16), { tone: "hi", crease: "none" });
}

function dial() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 2.6, DIAL_Z - 10, 10, P, 20), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 2.6, DIAL_Z - 6, P, 12), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 72, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2, DIAL_TOP, P, 64), { tone: "lo" }));
  // 20 marcas por vuelta: cada una es 1 mm de subida si la vuelta es Y_MAX = 2 cm.
  const ticks = k.radialTicks(x, y, DIAL_R - 2.6, 20, 5, DIAL_TOP, [1.2, 2.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.4, DIAL_TOP, P, 16), { tone: "mid" }));
  return out.join("");
}

const needleAt = (turn) => {
  const angle = turn * Math.PI * 2;
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(angle) * 3, y + Math.cos(angle) * 3], [x + Math.sin(angle) * (DIAL_R - 4), y - Math.cos(angle) * (DIAL_R - 4)], DIAL_TOP + 0.2, P);
};

// Tubo de conexión con aceite, dos tuercas de unión y una válvula de alivio.
function pipe() {
  const startX = SMALL.x + Math.sqrt(SMALL.collarR ** 2 - PIPE_R ** 2);
  const endX = BIG.x - Math.sqrt(BIG.collarR ** 2 - PIPE_R ** 2);
  const route = [[startX, 0, PIPE_Z], [endX, 0, PIPE_Z]];
  const total = endX - startX;
  const mid = total / 2;
  const nuts = [[3, 8], [total - 8, total - 3]];
  const valve = [mid - 8, mid + 8];
  const pieces = tubePieces(route, PIPE_R, P, { maxLength: 400, gaps: [...nuts, valve] });
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: startX, y: -4, w: total, d: 8, r: 3 }, 0, 0.1, P)}" style="filter:blur(4px);opacity:.2"/>`);
  const Fx = (s) => G.frameAlong([startX + s, 0, PIPE_Z], [1, 0, 0]);
  const nutSvg = ([a, b]) => {
    const F = Fx((a + b) / 2);
    const h = (b - a) / 2;
    return S(G.lathe([[-h, 0], [-h, 4.2], [-h + 0.8, 4.8], [h - 0.8, 4.8], [h, 4.2], [h, 0]], F, P), { tone: "mid", inner: L(G.ribsOf(F, -h + 0.8, h - 0.8, 4.8, 12, P), { tone: "faint" }) });
  };
  const valveSvg = () => {
    const F = Fx(mid);
    const parts = [];
    parts.push(S(G.lathe([[-8, 0], [-8, 4.4], [-6.6, 4.4], [-5.6, 5.6, 1], [0, 7.2, 1], [5.6, 5.6, 1], [6.6, 4.4], [8, 4.4], [8, 0]], F, P), { tone: "mid", crease: "lo" }));
    const neckF = UP(startX + mid, 0, PIPE_Z + 6);
    parts.push(S(G.disc(0, 6, 2.2, neckF, P), { tone: "mid" }));
    parts.push(S(G.disc(6, 7.4, 3.2, neckF, P), { tone: "mid" }));
    const wheelZ = PIPE_Z + 6 + 7.4;
    parts.push(S(k.cylinder(startX + mid, 0, 7, wheelZ, 2.6, P, 48, 0.4), { tone: "mid" }));
    parts.push(L(k.knurl(startX + mid, 0, 7, wheelZ, wheelZ + 2.6, 40, P, 0.3), { tone: "lo" }));
    parts.push(L(k.ring(startX + mid, 0, 1.8, wheelZ + 2.6, P, 16), { tone: "lo" }));
    parts.push(D([at([startX + mid, 0, wheelZ + 2.6])], { size: 0.55, tone: "hi" }));
    return parts.join("");
  };
  // De izquierda a derecha también es de atrás hacia adelante.
  const pipeSvg = pieces.map((piece) => ({ at: piece.mid[0], svg: `<g class="aceite-tubo">${tubeSvg(piece, { tone: "mid" })}</g>` }));
  const parts = [...pipeSvg, ...nuts.map((nut) => ({ at: startX + (nut[0] + nut[1]) / 2, svg: nutSvg(nut) })), { at: startX + mid, svg: valveSvg() }];
  parts.sort((a, b) => a.at - b.at);
  return out.join("") + parts.map((part) => part.svg).join("");
}

// Paleta del estilo fusión (variables :root de principio-de-arquimedes/v2) mapeada al kit.
const FUSION = `
.iso{
  --bg:#F6F1E6; --sup:#FFFCF6; --texto:#2E2117; --suave:#77634F; --borde:#E5DACA; --borde-fuerte:#CDBEA5;
  --acento:#2F6F73; --rubrica:#A5352A; --dorado:#B08A3E;
  --agua-1:#93C7C4; --agua-2:#2F6F73; --agua-sup:#D9EEEC; --vidrio-borde:#9C9282;
  --mesa:#ECE3D2; --sombra:#3A2716; --metal-osc:#5E6B78;
}
@media (prefers-color-scheme: dark){ .iso{
  --bg:#17120D; --sup:#211912; --texto:#EFE4CF; --suave:#B6A385; --borde:#382C20; --borde-fuerte:#4D3D2C;
  --acento:#7FB3B0; --rubrica:#E07A5F; --dorado:#D9B26A;
  --agua-1:#6FB0AE; --agua-2:#245D60; --agua-sup:#A9D6D3; --vidrio-borde:#7D7364;
  --mesa:#1D160F; --sombra:#000000; --metal-osc:#8A97A4;
} }
.iso.iso[data-theme]{
  --anatomy-page:var(--bg); --anatomy-card:var(--sup); --anatomy-text:var(--suave); --anatomy-strong:var(--texto); --anatomy-muted:var(--suave);
  --anatomy-paper:var(--sup); --anatomy-face:var(--sup); --anatomy-top:color-mix(in srgb,var(--sup) 70%,#fff);
  --anatomy-shade-0:color-mix(in srgb,var(--mesa) 55%,var(--borde-fuerte)); --anatomy-shade-1:var(--mesa);
  --anatomy-shade-2:color-mix(in srgb,var(--mesa) 55%,var(--sup)); --anatomy-shade-3:color-mix(in srgb,var(--mesa) 25%,var(--sup));
  --anatomy-lit-top:color-mix(in srgb,var(--rubrica) 55%,var(--sup)); --anatomy-lit-shade:var(--rubrica);
  --anatomy-hi:var(--texto); --anatomy-mid:color-mix(in srgb,var(--suave) 80%,var(--borde-fuerte)); --anatomy-lo:var(--borde-fuerte); --anatomy-faint:var(--borde);
  --anatomy-lit:var(--rubrica); --anatomy-halo:var(--sombra); --anatomy-halo-opacity:.28; --anatomy-dot:var(--texto);
  color-scheme:light;
}
@media (prefers-color-scheme: dark){ .iso.iso[data-theme]{
  --anatomy-face:#2A2018; --anatomy-top:#2E241B;
  --anatomy-shade-0:#191209; --anatomy-shade-1:#1E1711; --anatomy-shade-2:#231A13; --anatomy-shade-3:#271E16;
  --anatomy-lit-top:color-mix(in srgb,var(--rubrica) 70%,#fff); --anatomy-lit-shade:color-mix(in srgb,var(--rubrica) 75%,#000);
  --anatomy-mid:#8C7A62; --anatomy-halo-opacity:.9;
  color-scheme:dark;
} }
.aceite .iso-fill{fill:var(--agua-sup)}
.aceite .iso-shade[data-shade="0"]{fill:color-mix(in srgb,var(--agua-1) 85%,var(--agua-2))}
.aceite .iso-shade[data-shade="1"]{fill:var(--agua-1)}
.aceite .iso-shade[data-shade="2"]{fill:color-mix(in srgb,var(--agua-1) 60%,var(--agua-sup))}
.aceite .iso-shade[data-shade="3"]{fill:color-mix(in srgb,var(--agua-1) 35%,var(--agua-sup))}
.aceite .iso-top{fill:var(--agua-sup)}
.aceite .iso-edge,.aceite .iso-crease{stroke:var(--agua-2)}
.aceite-tubo .tb-body{fill:var(--agua-1)}
.aceite-tubo .tb-shine{fill:var(--agua-sup)}
.aceite-tubo .tb-shade{fill:color-mix(in srgb,var(--agua-1) 70%,var(--agua-2))}
.vidrio{fill:var(--agua-sup);opacity:.35}
.brillo{stroke:#ffffff;stroke-width:1.6;opacity:.85}
.brillo.fino{stroke-width:.7;opacity:.7}
@media (prefers-color-scheme: dark){ .vidrio{opacity:.12} .brillo{opacity:.35} .brillo.fino{opacity:.25} }
.flecha .iso-edge,.flecha .iso-crease{stroke:color-mix(in srgb,var(--rubrica) 70%,var(--texto))}
.iso-stage{cursor:pointer;-webkit-tap-highlight-color:transparent}
`;

const fmt = (n) => n.toLocaleString("es-MX").replace(/,/g, " ");
const restReadout = `x = 0 cm · sube 0.0 cm · F₂ = ${fmt(F2)} N`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: `Prensa hidráulica sobre una base: un cilindro de vidrio de ${d1} cm y otro de ${d2} cm de diámetro, llenos de aceite y unidos por un tubo con válvula. Cuando el pistón chico baja, el aceite empuja al grande hacia arriba ${RA} veces menos, y un reloj comparador sobre la platina marca la subida.`,
  body: [
    base(),
    collar(SMALL),
    glassBack(SMALL),
    `<g class="aceite" data-part="oil-small">${oil(SMALL, SMALL.pistonZ)}</g>`,
    `<g data-part="small">${smallMoving()}</g>`,
    glassFront(SMALL, smallScale()),
    pipe(),
    stand(),
    collar(BIG),
    glassBack(BIG),
    `<g class="aceite" data-part="oil-big">${oil(BIG, BIG.pistonZ)}</g>`,
    `<g data-part="big">${bigMoving()}</g>`,
    `<g data-part="plunger">${plunger()}</g>`,
    dial(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0)}" style="stroke-width:1.1"/>`,
    glassFront(BIG),
    `<g data-part="big-arrow">${arrow(BIG.x, BIG.y, PLATEN_TOP, 1, BIG_ARROW)}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const SMALL = ${JSON.stringify(SMALL)}, BIG = ${JSON.stringify(BIG)};
const X_MAX = ${X_MAX}, RA = ${RA}, Y_MAX = ${Y_MAX}, TRAVEL = ${TRAVEL}, F2 = ${JSON.stringify(fmt(F2))};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const small = part("small"), big = part("big"), plunger = part("plunger"), bigArrow = part("big-arrow"), needle = part("needle");
const oilSmall = part("oil-small"), oilBig = part("oil-big");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const oil = (c, top) => solidSvg(cylinder(c.x, c.y, c.rIn, c.collarH, top - c.collarH, P, 72), { tone: "lo", crease: "none" });
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
let x = 0, target = 0, frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0, drawn = -1;
// Recorrido: espera, baja el pistón chico hasta X_MAX, espera, regresa.
const tourAt = (t) => (t % 7 < 3.5 ? X_MAX : 0);
function draw() {
  const xr = Math.round(x * 100) / 100;
  if (xr === drawn) return;
  drawn = xr;
  const y = x / RA; // mismo volumen: A1·x = A2·y
  small.setAttribute("transform", translateAlong(P, [0, 0, -x * TRAVEL]));
  const lift = translateAlong(P, [0, 0, y * TRAVEL]);
  big.setAttribute("transform", lift);
  plunger.setAttribute("transform", lift);
  bigArrow.setAttribute("transform", lift);
  needle.setAttribute("d", needleAt(y / Y_MAX));
  oilSmall.innerHTML = oil(SMALL, SMALL.pistonZ - x * TRAVEL);
  oilBig.innerHTML = oil(BIG, BIG.pistonZ + y * TRAVEL);
  const text = "x = " + x.toFixed(0) + " cm · sube " + y.toFixed(1) + " cm · F₂ = " + F2 + " N";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", x.toFixed(0));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  x = still.matches ? target : x + (target - x) * (1 - Math.exp(-dt / 0.5));
  if (Math.abs(target - x) < 0.02) x = target;
  draw();
  const settled = !touring && x === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clamp(next, 0, X_MAX);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = target > 0 ? 0 : 3.5; run(); }, 5000);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { touring = false; target = x = X_MAX; }
// Ratón: la altura del puntero manda la carrera. Toque: empuja o suelta.
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;
  const box = svg.getBoundingClientRect();
  steer(clamp(((event.clientY - box.top) / box.height - 0.2) / 0.5, 0, 1) * X_MAX);
});
stage.addEventListener("pointerdown", (event) => { if (event.pointerType !== "mouse") steer(target > X_MAX / 2 ? 0 : X_MAX); });
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowDown" || event.key === "ArrowRight") to = target + 5;
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") to = target - 5;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = X_MAX;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
draw();
`;

const body = `<style>${FUSION}</style>` + k.plateHtml({
  fig: "Fig 1",
  title: "Prensa hidráulica",
  hint: "Toca o usa ↑↓ para empujar",
  readout: restReadout,
  keys: [
    { mark: "lit", label: `F₁ = ${F1} N entra; F₂ = ${fmt(F2)} N sale` },
    { mark: "raised", label: `Pistones de Ø ${d1} cm y Ø ${d2} cm` },
  ],
  caption: `El aceite transmite la misma presión a los dos pistones. El área grande es ${RA} veces la chica (${d2 / d1}² = ${RA}), así que la fuerza sale ${RA} veces mayor, pero el pistón grande sube ${RA} veces menos: si el chico baja ${X_MAX} cm, el grande sube ${Y_MAX} cm. Una vuelta del reloj es toda esa subida.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Prensa hidráulica: flechas arriba y abajo mueven el pistón chico" aria-valuemin="0" aria-valuemax="${X_MAX}" aria-valuenow="0">${svg}</div>`,
});

const html = k.pageHtml({ title: "Prensa hidráulica · Códice Vivo", theme: "light", body, script: kitScript() + live }).replace('<html lang="en">', '<html lang="es-MX">');
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log("escrito", OUT, `${(html.length / 1024).toFixed(1)} KB`);
