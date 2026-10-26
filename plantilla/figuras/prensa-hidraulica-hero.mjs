// Lámina Hero (experimento 2): gato hidráulico de botella en corte, con modo 3D que gira.
// Genera plantilla/interactivos/prensa-hidraulica/premium-hero/index.html y 3d.js (el 3D se carga al tocar).
// Uso: node plantilla/figuras/prensa-hidraulica-hero.mjs [--audit] [--quick] [--perf3d]
// Los números salen de contenido/fisica/prensa-interactivo.json (d1, d2, F1 y el máximo de x).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import * as A from "../../.claude/skills/anatomy/kit/audit.mjs";
import { turning } from "../../.claude/skills/anatomy/kit/turn-build.mjs";
import * as TA from "../../.claude/skills/anatomy/kit/turn-audit.mjs";
import { glCamera } from "../../.claude/skills/anatomy/kit/gl.mjs";
import { kitScript, turnScript, glScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const OUT_DIR = join(ROOT, "plantilla/interactivos/prensa-hidraulica/premium-hero");
const DATA = JSON.parse(readFileSync(join(ROOT, "contenido/fisica/prensa-interactivo.json"), "utf8"));
const argv = process.argv.slice(2);

// ── Modelo ────────────────────────────────────────────────────────────────
// Misma presión en todo el aceite y mismo volumen: A1·x = A2·y.
const { d1, d2, F1 } = DATA.valoresIniciales;
const X_MAX = DATA.rangos.x.max; // cm de empuje acumulado del émbolo
const RA = (d2 / d1) ** 2;
const F2 = F1 * RA;
const Y_MAX = X_MAX / RA; // cm que sube el pistón grande
const STROKE_CM = 2; // carrera del émbolo por bombeo
const STROKES = X_MAX / STROKE_CM;
const PRESSURE_BAR = F1 / (Math.PI * (d1 / 2) ** 2) / 10; // N/cm² → bar
// Fuerza en el émbolo que se arrastra en la palanca. El JSON no trae rango de F1: 10–100 N deja la
// presión (hasta 3.2 bar) bajo el ajuste del alivio.
const F1_RANGO = { min: 10, max: 100, paso: 5 };
const RELIEF_BAR = 3.4; // la válvula de alivio abre antes del tope del manómetro (4 bar)

// ── Mundo: 1 cm = 6 u ─────────────────────────────────────────────────────
const CM = 6;
const BASE = { x0: -102, x1: 102, y: 50, h: 34 };
const X_R = -20; // eje del pistón grande
const RB = (d2 / 2) * CM; // 30
const BOTTLE = { r: 48, rIn: 44, z0: BASE.h, z1: 158 };
const RCYL = { r: 34, rIn: RB, z1: 158 };
const CAP = { r: 51, z0: 158, z1: 176, bore: 30.9 };
const RAM = { z0: 162, top: 188 }; // en el corte el pistón llega hasta el fondo
const RAM_BOTTOM = 42; // fondo del pistón en reposo (cámara de 34 a 42)
const SCREW = { r: 10, top: 198 };
const SADDLE = { r: 20, z0: 198, z1: 206 };
const LOAD = { r: 40, h: 9 };
const OIL_Z0 = 132; // nivel del depósito en reposo
const RES_AREA = BOTTLE.rIn ** 2 - RCYL.r ** 2;
const RISE = Y_MAX * CM; // 12 u
const X_P = 62; // eje del émbolo
const RP = (d1 / 2) * CM; // 6
const PUMP = { r: 12, z0: BASE.h, z1: 104 };
const GLAND = { r: 14, z0: 104, z1: 118, bore: 6.6 };
const PL_DOWN = 40; // fondo del émbolo abajo
const PL_UP = PL_DOWN + STROKE_CM * CM; // 52
const FLOOR = 24; // fondo de la cámara del émbolo
// Palanca: pivote en dos orejas soldadas a la botella; biela al émbolo.
const PIVOT = [42, 148];
const ARM = 20;
const LINK = 12;
const HANDLE = 112;
const pinOf = (theta) => [PIVOT[0] + ARM * Math.cos(theta), PIVOT[1] + ARM * Math.sin(theta)];
const plungerPinOf = (theta) => {
  const [lx, lz] = pinOf(theta);
  return lz - Math.sqrt(LINK ** 2 - (X_P - lx) ** 2);
};
// Ángulos de la palanca para que el émbolo recorra exactamente 2 cm.
const solveTheta = (target) => {
  let lo = -0.7;
  let hi = 0.7;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (plungerPinOf(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};
const PIN_UP = plungerPinOf(0.32);
const THETA_UP = 0.32;
const THETA_DOWN = solveTheta(PIN_UP - STROKE_CM * CM);
const PL_LEN = PIN_UP - PL_UP; // del fondo del émbolo a su perno
const GAUGE = { x: 88, z: 60, r: 13 };

const WIDTH = 600;
const HEIGHT = 470;
const AZIMUTH = 60;

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: -126, y: -74, w: 238, d: 138 }, -17, 0),
    [X_R, 0, SADDLE.z1 + LOAD.h * 2 + RISE],
    [X_R - LOAD.r, 0, SADDLE.z1 + LOAD.h * 2 + RISE],
    [PIVOT[0] + HANDLE * Math.cos(THETA_UP), 0, PIVOT[1] + HANDLE * Math.sin(THETA_UP) + 6],
  ],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: AZIMUTH },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const V = G.viewOf(P);
const LIGHT = G.lightOf(P);
// Plano de corte y = 0; lo que queda es la mitad trasera (y ≤ 0).
const sec = (x, z) => at([x, 0, z]);
const secPath = (points) => k.pathOf(points.map(([x, z]) => sec(x, z)), true);
const secRect = (x0, z0, x1, z1) => secPath([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
const semi = (cx, r, steps = 40) => Array.from({ length: steps + 1 }, (_, i) => {
  const a = Math.PI + (Math.PI * i) / steps;
  return [cx + r * Math.cos(a), r * Math.sin(a)];
});
const halfCyl = (cx, r, z0, z1, style = {}) => S(k.extrude(semi(cx, r, r > 20 ? 56 : 28), z0, z1 - z0, P, { convex: true, bevel: style.bevel ?? 0 }), { tone: "mid", ...style });
const arcSec = (cx, cz, r, from = 0, to = Math.PI * 2, steps = 24) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });
const metal = (d, hatch = "a") => `<path class="corte" data-hatch="${hatch}" d="${d}"/>`;
const edge = (d, tone = "mid") => L(d, { tone });
const oilFill = (d, extra = "") => `<path class="aceite-corte"${extra} d="${d}"/>`;
const seal = (d) => `<path class="sello" d="${d}"/>`;

// Hélice vertical (resorte) en el plano del corte: atrás tenue, adelante fuerte.
function helix(cx, z0, z1, r, turns, steps = 14) {
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  const count = Math.round(turns * steps);
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * turns * Math.PI * 2;
    const point = [cx + r * Math.cos(a), r * Math.sin(a), z0 + ((z1 - z0) * i) / count];
    const facing = Math.cos(a) * V[0] + Math.sin(a) * V[1] > 0;
    const flat = at(point);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(k.pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(k.pathOf(run));
  return { back: back.join(""), front: front.join("") };
}

// ── Banco de pruebas ───────────────────────────────────────────────────────
const BENCH = { x: -126, y: -74, w: 238, d: 138, r: 8 };
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -17, 12, P)}"/>`];
  for (const [x, y] of k.corners(BENCH, 20).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BENCH, -12, 12, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -8, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BENCH, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Regla al frente y placa de datos con tres renglones.
  const strip = { x: BENCH.x + 16, y: BENCH.y + BENCH.d - 15, w: 120, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 6, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  const label = { x: BENCH.x + BENCH.w - 62, y: BENCH.y + BENCH.d - 19, w: 40, d: 13, r: 1 };
  out.push(S(k.slabOf(label, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  out.push(L([3.5, 6.5, 9.5].map((dy, i) => k.lineOnTop([label.x + 4, label.y + dy], [label.x + (i === 2 ? 20 : 34), label.y + dy], 0.6, P)).join(""), { tone: "faint", free: true }));
  out.push(D([at([label.x + 1.8, label.y + 6.5, 0.6]), at([label.x + label.w - 1.8, label.y + 6.5, 0.6])], { size: 0.4 }));
  return out.join("");
}

// ── Base fundida (mitad trasera y corte con sus conductos) ────────────────
const CH = 2.2; // radio de los conductos
const hRun = (x0, x1, z, r = CH) => secRect(Math.min(x0, x1), z - r, Math.max(x0, x1), z + r);
const vRun = (x, z0, z1, r = CH) => secRect(x - r, Math.min(z0, z1), x + r, Math.max(z0, z1));
const NEEDLE = { z: 16, seat: -44, end: BASE.x0 };
const SUCTION = { x: 21, z: 14, inlet: 57 };
const OUTLET = { x: 67, seat: 21 };
const RELIEF = { x: 15.5, seat: 16 };
const PRESS_Z = 7;
const BALL = 2.6;

function baseBack() {
  const ring = [[BASE.x0, 0], ...arcSec(BASE.x0 + 6, -BASE.y + 6, 6, Math.PI, Math.PI * 1.5, 6).map(([x, y]) => [x, y]), ...arcSec(BASE.x1 - 6, -BASE.y + 6, 6, Math.PI * 1.5, Math.PI * 2, 6), [BASE.x1, 0]];
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: BASE.x0, y: -BASE.y, w: BASE.x1 - BASE.x0, d: BASE.y * 1.6, r: 6 }, 0, 0.1, P)}" style="filter:blur(4px);opacity:.35"/>`];
  out.push(`<g data-mat="gunmetal">${S(k.extrude(ring, 0, BASE.h, P, { convex: true, bevel: 1.2 }), { tone: "mid", inner: L(k.ringSeam(ring, 6, P), { tone: "faint" }) })}</g>`);
  // Tornillos de anclaje en la cara superior trasera.
  const bolts = [[BASE.x0 + 10, -BASE.y + 10], [BASE.x1 - 10, -BASE.y + 10], [BASE.x1 - 10, -16], [BASE.x0 + 10, -16]];
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 3, BASE.h, P, 18)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, BASE.h])), { size: 0.55 }));
  return out.join("");
}

function baseSection() {
  const out = [];
  out.push(metal(secPath([[BASE.x0, 0], [BASE.x1, 0], [BASE.x1, BASE.h - 1.2], [BASE.x1 - 1.2, BASE.h], [BASE.x0 + 1.2, BASE.h], [BASE.x0, BASE.h - 1.2]]), "a"));
  const oil = [];
  // Succión: depósito derecho → baja → va al émbolo → sube por la válvula de entrada.
  oil.push(vRun(SUCTION.x, SUCTION.z - CH, BASE.h), hRun(SUCTION.x - CH, SUCTION.inlet + CH, SUCTION.z), vRun(SUCTION.inlet, SUCTION.z, FLOOR, 1.8));
  // Presión: válvula de salida → abajo → al pistón grande y al manómetro.
  oil.push(secRect(OUTLET.x - 3.2, PRESS_Z - CH, OUTLET.x + 3.2, OUTLET.seat), vRun(OUTLET.x, OUTLET.seat, FLOOR, 1.8));
  oil.push(hRun(-6 - CH, GAUGE.x + CH, PRESS_Z), vRun(-6, PRESS_Z, BASE.h), vRun(GAUGE.x, PRESS_Z, BASE.h, 1.8));
  // Alivio de seguridad: del conducto de presión al depósito, cerrado por bola y resorte.
  oil.push(vRun(RELIEF.x, PRESS_Z, RELIEF.seat, 1.5), vRun(RELIEF.x, RELIEF.seat, BASE.h, 2.8));
  // Descarga: cámara del pistón → asiento de la aguja → depósito izquierdo.
  oil.push(vRun(NEEDLE.seat + 2, NEEDLE.z, BASE.h, 1.8), hRun(NEEDLE.seat - 2, NEEDLE.seat + 3.8, NEEDLE.z, 1.4), vRun(-59, NEEDLE.z, BASE.h, 1.8));
  // Cámara del émbolo dentro de la base.
  oil.push(secRect(X_P - RP, FLOOR, X_P + RP, BASE.h));
  out.push(oilFill(oil.join("")));
  // Alojamiento de la aguja (seco: la aguja sella con su empaque).
  out.push(`<path class="hueco" d="${hRun(NEEDLE.end, NEEDLE.seat - 2, NEEDLE.z, 2.6)}"/>`);
  out.push(edge(hRun(NEEDLE.end, NEEDLE.seat - 2, NEEDLE.z, 2.6), "lo"));
  out.push(edge(oil.join(""), "lo"));
  // Tapones de los barrenos de fabricación (extremos de los conductos).
  for (const [x, z] of [[GAUGE.x + CH, PRESS_Z], [-6 - CH, PRESS_Z]]) out.push(seal(secRect(x - 0.9, z - CH - 0.4, x + 0.9, z + CH + 0.4)));
  out.push(edge(secPath([[BASE.x0, 0], [BASE.x1, 0], [BASE.x1, BASE.h - 1.2], [BASE.x1 - 1.2, BASE.h], [BASE.x0 + 1.2, BASE.h], [BASE.x0, BASE.h - 1.2]]), "mid"));
  return out.join("");
}

// ── Botella, depósito y cilindro ──────────────────────────────────────────
function bottleBack() {
  return `<g data-mat="copper">${halfCyl(X_R, BOTTLE.r + 2, BASE.h, BASE.h + 3, { tone: "mid" })}${halfCyl(X_R, BOTTLE.r, BASE.h + 3, BOTTLE.z1, { tone: "mid" })}</g>`;
}
const resLevel = (y) => OIL_Z0 - (y * CM * RB ** 2) / RES_AREA;
function bottleSection() {
  const out = [];
  const xl = X_R - BOTTLE.r;
  const xr = X_R + BOTTLE.r;
  // Paredes de la botella con cordón de soldadura en la base.
  out.push(metal(secRect(xl, BASE.h, xl + 4, BOTTLE.z1) + secRect(xr - 4, BASE.h, xr, BOTTLE.z1), "b"));
  out.push(metal(secPath([[xl - 2, BASE.h], [xl, BASE.h], [xl, BASE.h + 3]]) + secPath([[xr + 2, BASE.h], [xr, BASE.h], [xr, BASE.h + 3]]), "a"));
  // Depósito: aire arriba (se ve la pared trasera) y aceite con nivel vivo.
  for (const [x0, x1, side] of [[xl + 4, X_R - RCYL.r, "l"], [X_R + RCYL.r, xr - 4, "r"]]) {
    out.push(`<path class="aire" d="${secRect(x0, BASE.h, x1, RCYL.z1)}"/>`);
    out.push(oilFill(secRect(x0, BASE.h, x1, OIL_Z0), ` data-part="res-${side}"`));
    out.push(L(k.pathOf([sec(x0, OIL_Z0), sec(x1, OIL_Z0)]), { tone: "lo", className: `nivel-${side}` }));
  }
  // Cilindro interior.
  out.push(metal(secRect(X_R - RCYL.r, BASE.h, X_R - RB, RCYL.z1) + secRect(X_R + RB, BASE.h, X_R + RCYL.r, RCYL.z1), "a"));
  // Cámara del pistón grande: aceite hasta el tope de su carrera (el pistón tapa lo demás).
  out.push(oilFill(secRect(X_R - RB, BASE.h, X_R + RB, RAM_BOTTOM + RISE + 2)));
  // Topes del pistón en el fondo.
  out.push(metal(secRect(X_R - RB, BASE.h, X_R - RB + 5, RAM_BOTTOM) + secRect(X_R + RB - 5, BASE.h, X_R + RB, RAM_BOTTOM), "b"));
  out.push(edge(secRect(xl, BASE.h, xl + 4, BOTTLE.z1) + secRect(xr - 4, BASE.h, xr, BOTTLE.z1) + secRect(X_R - RCYL.r, BASE.h, X_R - RB, RCYL.z1) + secRect(X_R + RB, BASE.h, X_R + RCYL.r, RCYL.z1), "mid"));
  out.push(edge(secRect(X_R - RB, BASE.h, X_R - RB + 5, RAM_BOTTOM) + secRect(X_R + RB - 5, BASE.h, X_R + RB, RAM_BOTTOM), "lo"));
  return out.join("");
}

// Tapa roscada: mitad trasera, corte con roscas y sellos.
function capBack() {
  const ribs = G.ribsOf(G.frameAlong([X_R, 0, 0], [0, 0, 1]), CAP.z0 + 3, CAP.z1 - 3, CAP.r, 72, P, { fade: [0.05, 0.5] });
  void ribs;
  return `<g data-mat="gunmetal">${halfCyl(X_R, CAP.r, CAP.z0, CAP.z1, { tone: "mid", bevel: 0.8 })}</g>`;
}
function capSection() {
  const out = [];
  const teeth = (x, z0, z1, dir) => {
    const pts = [];
    for (let z = z0; z < z1 - 0.1; z += 2) pts.push([x, z], [x + dir * 1, z + 1]);
    pts.push([x, z1]);
    return pts;
  };
  for (const side of [-1, 1]) {
    const outer = X_R + side * CAP.r;
    const inner = X_R + side * CAP.bore;
    const wall = X_R + side * BOTTLE.r;
    // Tapa: corona arriba y faldón que rosca por fuera de la botella.
    const ring = [[inner, CAP.z1], [outer, CAP.z1], [outer, CAP.z0 - 8], [wall + side * 0.01, CAP.z0 - 8], ...teeth(wall, CAP.z0 - 8, CAP.z0, side).map(([x, z]) => [x, z]), [X_R + side * (RCYL.r), CAP.z0], [inner, CAP.z0]];
    out.push(metal(secPath(ring), "b"));
    out.push(edge(secPath(ring), "mid"));
    // Sello del vástago y limpiador.
    out.push(seal(secRect(inner + side * 0, CAP.z0 + 4, inner + side * 2.4, CAP.z0 + 8)));
    out.push(seal(secRect(inner, CAP.z1 - 3.5, inner + side * 1.8, CAP.z1 - 1)));
  }
  return out.join("");
}

// ── Pistón grande, tornillo extensible, silla y carga (se mueven juntos) ──
function ramSection() {
  const out = [];
  const x0 = X_R - RB;
  const x1 = X_R + RB;
  const body = secPath([[x0, RAM_BOTTOM + 1], [x0 + 1, RAM_BOTTOM], [x1 - 1, RAM_BOTTOM], [x1, RAM_BOTTOM + 1], [x1, RAM.top], [X_R + 11, RAM.top], [X_R + 11, 150], [X_R - 11, 150], [X_R - 11, RAM.top], [x0, RAM.top]]);
  out.push(`<g data-mat="chrome">${metal(body, "a")}</g>`);
  out.push(edge(body, "mid"));
  // Copa de sello y anillo guía.
  for (const side of [-1, 1]) {
    const x = X_R + side * RB;
    out.push(seal(secRect(x, RAM_BOTTOM + 4, x - side * 2.6, RAM_BOTTOM + 9)));
    out.push(`<path class="guia" d="${secRect(x, RAM_BOTTOM + 13, x - side * 1.8, RAM_BOTTOM + 19)}"/>`);
  }
  // Tornillo extensible con rosca.
  const pts = [[X_R - SCREW.r, 152]];
  for (let z = 152; z < SCREW.top - 1; z += 2.4) pts.push([X_R - SCREW.r - 0.9, z + 1.2], [X_R - SCREW.r, z + 2.4]);
  const right = pts.map(([x, z]) => [2 * X_R - x, z]).reverse();
  const screw = secPath([...pts, [X_R - SCREW.r, SCREW.top], [X_R + SCREW.r, SCREW.top], ...right]);
  out.push(`<path class="corte" data-hatch="b" d="${screw}"/>`, edge(screw, "mid"));
  // Silla con estrías.
  const crown = [[X_R - SADDLE.r, SADDLE.z0], [X_R + SADDLE.r, SADDLE.z0], [X_R + SADDLE.r, SADDLE.z1]];
  for (let x = X_R + SADDLE.r; x > X_R - SADDLE.r + 0.1; x -= 4) crown.push([x - 2, SADDLE.z1 + 1.4], [x - 4, SADDLE.z1]);
  out.push(metal(secPath(crown), "a"), edge(secPath(crown), "mid"));
  return out.join("");
}
// Partes del pistón que asoman sobre la tapa: se reconstruyen al subir (mismo código en la página).
const ramBack = (y) => halfCyl(X_R, RB, CAP.z1, RAM.top + y, { tone: "hi", crease: "lo" });
function ramTopBack() {
  const out = [];
  out.push(halfCyl(X_R, SCREW.r, RAM.top, SCREW.top, { tone: "mid", inner: L(Array.from({ length: 4 }, (_, i) => k.sideArc(X_R, 0, SCREW.r, RAM.top + 1.6 + i * 2.4, P, 16)).join(""), { tone: "lo" }) }));
  out.push(halfCyl(X_R, SADDLE.r, SADDLE.z0, SADDLE.z1, { tone: "mid", bevel: 0.6 }));
  return out.join("");
}
// Carga de prueba: dos discos de hierro (no se cortan).
function load() {
  const out = [];
  const z0 = SADDLE.z1 + 1.4;
  out.push(`<path class="iso-halo" d="${k.cylinder(X_R, 0, LOAD.r - 8, z0, 0.1, P, 48).fill}" style="filter:blur(4px);opacity:.25"/>`);
  for (let i = 0; i < 2; i++) {
    const z = z0 + i * LOAD.h;
    out.push(S(k.cylinder(X_R, 0, LOAD.r, z, LOAD.h - 0.4, P, 96, 0.8), { tone: "mid", inner: L(k.sideArc(X_R, 0, LOAD.r, z + LOAD.h / 2, P, 64), { tone: "faint" }) }));
  }
  const top = z0 + LOAD.h * 2 - 0.4;
  out.push(L(k.ring(X_R, 0, LOAD.r - 5, top, P, 96) + k.ring(X_R, 0, 9, top, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(X_R, 0, 7, top, 3, P, 32, 0.4), { tone: "mid" }));
  out.push(D(Array.from({ length: 6 }, (_, i) => at([X_R + 26 * Math.cos(i * Math.PI / 3 + 0.3), 26 * Math.sin(i * Math.PI / 3 + 0.3), top])), { size: 0.5 }));
  return out.join("");
}

// Indicador de subida: poste graduado sobre la tapa y aguja en la silla (la parte iluminada).
const POST = { x: X_R + 44, y: -6, z0: CAP.z1, z1: SADDLE.z0 + 14 };
const ZERO = SADDLE.z0 + 4;
function risePost() {
  const out = [];
  out.push(S(k.cylinder(POST.x, POST.y, 3.4, POST.z0, 2, P, 24), { tone: "mid" }));
  const strip = { x: POST.x - 2, y: POST.y - 2, w: 4, d: 4, r: 0.6 };
  out.push(S(k.slabOf(strip, POST.z0 + 2, POST.z1 - POST.z0 - 2, P, 2, 0.3), { tone: "mid" }));
  // Marcas cada 2.5 mm, mayor cada centímetro, en la cara que mira al frente.
  const face = [POST.x + 2, POST.y + 2];
  const minor = [];
  const major = [];
  for (let mm = 0; mm <= Y_MAX * 10 + 0.01; mm += 2.5) {
    const z = ZERO + (mm / 10) * CM;
    const big = mm % 10 === 0;
    (big ? major : minor).push(k.segment([face[0], face[1] - 0.2, z], [face[0], face[1] - 0.2 - (big ? 2.4 : 1.4), z], P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(S(k.cylinder(POST.x, POST.y, 2.6, POST.z1, 1.6, P, 20), { tone: "mid" }));
  return out.join("");
}
function pointer() {
  const z = ZERO;
  const arm = [[X_R + SADDLE.r, -6.8], [POST.x - 2.4, -6.8], [POST.x - 2.4, -5.2], [X_R + SADDLE.r, -5.2]];
  return S(k.extrude(arm, z - 0.6, 1.2, P, { convex: true }), { tone: "hi", lit: true });
}

// ── Bomba: cilindro, prensaestopa y émbolo ────────────────────────────────
function pumpBack() {
  return `<g data-mat="copper">${halfCyl(X_P, PUMP.r + 2, PUMP.z0, PUMP.z0 + 6, { tone: "mid" })}${halfCyl(X_P, PUMP.r, PUMP.z0 + 6, PUMP.z1, { tone: "mid" })}</g><g data-mat="gunmetal">${halfCyl(X_P, GLAND.r, GLAND.z0, GLAND.z1, { tone: "mid", bevel: 0.6 })}</g>`;
}
function pumpSection() {
  const out = [];
  const walls = secRect(X_P - PUMP.r, PUMP.z0, X_P - RP, PUMP.z1) + secRect(X_P + RP, PUMP.z0, X_P + PUMP.r, PUMP.z1);
  out.push(metal(walls, "b"), edge(walls, "mid"));
  out.push(metal(secPath([[X_P - PUMP.r - 2, PUMP.z0], [X_P - PUMP.r, PUMP.z0], [X_P - PUMP.r, PUMP.z0 + 3]]) + secPath([[X_P + PUMP.r + 2, PUMP.z0], [X_P + PUMP.r, PUMP.z0], [X_P + PUMP.r, PUMP.z0 + 3]]), "a"));
  out.push(oilFill(secRect(X_P - RP, PUMP.z0, X_P + RP, PL_UP + 1)));
  const gland = secRect(X_P - GLAND.r, GLAND.z0, X_P - GLAND.bore, GLAND.z1) + secRect(X_P + GLAND.bore, GLAND.z0, X_P + GLAND.r, GLAND.z1);
  out.push(metal(gland, "a"), edge(gland, "mid"));
  for (const side of [-1, 1]) out.push(seal(secRect(X_P + side * RP, GLAND.z0 + 4, X_P + side * (RP + 1.6), GLAND.z0 + 9)));
  return out.join("");
}
const plungerBack = (top) => halfCyl(X_P, RP, GLAND.z1, top, { tone: "hi", crease: "lo" });
function plungerSection() {
  const body = secRect(X_P - RP, PL_UP, X_P + RP, PIN_UP - 3);
  const out = [`<g data-mat="chrome">${metal(body, "a")}</g>`, edge(body, "mid")];
  for (const side of [-1, 1]) out.push(seal(secRect(X_P + side * RP, PL_UP + 3, X_P + side * (RP - 1.6), PL_UP + 6)));
  return out.join("");
}
// Ojo del émbolo y perno (no se cortan: van fuera del cuerpo).
function plungerEye() {
  const F = G.frameAlong([X_P, -3.4, PIN_UP], [0, 1, 0]);
  return S(k.extrude([[X_P - 3.6, -3.4], [X_P + 3.6, -3.4], [X_P + 3.6, 3.4], [X_P - 3.6, 3.4]], PIN_UP - 7, 7.6, P, { convex: true, bevel: 0.4 }), { tone: "hi", crease: "lo" }) + S(G.disc(-1.4, 8.2, 1.6, F, P), { tone: "mid" });
}

// ── Válvulas ──────────────────────────────────────────────────────────────
const ballSvg = (x, z, r = BALL) => S(G.sphereOf([x, 0, z], r, P), { tone: "hi", crease: "lo" });
const INLET_BALL = FLOOR + Math.sqrt(BALL ** 2 - 1.8 ** 2);
const OUTLET_BALL = OUTLET.seat - Math.sqrt(BALL ** 2 - 1.8 ** 2);
const RELIEF_BALL = RELIEF.seat + Math.sqrt(2.2 ** 2 - 1.5 ** 2);
function valves() {
  const out = [];
  // Entrada: bola sobre su asiento, jaula de alambre encima.
  out.push(`<g data-part="ball-in">${ballSvg(SUCTION.inlet, INLET_BALL)}</g>`);
  out.push(`<g data-mat="brass">${S(k.extrude([[SUCTION.inlet - 4, -0.6], [SUCTION.inlet + 4, -0.6], [SUCTION.inlet + 4, 0.6], [SUCTION.inlet - 4, 0.6]], INLET_BALL + BALL + 2.6, 0.8, P, { convex: true }), { tone: "mid" })}</g>`);
  // Salida: bola empujada hacia arriba por su resorte, que asienta en una rondana.
  out.push(`<g data-mat="brass">${S(k.cylinder(OUTLET.x, 0, 2.8, PRESS_Z, 1, P, 20), { tone: "mid" })}</g>`);
  out.push(`<g data-part="spring-out">${springSvg(OUTLET.x, PRESS_Z + 1, OUTLET_BALL - BALL + 0.2)}</g>`);
  out.push(`<g data-part="ball-out">${ballSvg(OUTLET.x, OUTLET_BALL)}</g>`);
  // Alivio: bola, resorte y tuerca de ajuste con ranura.
  out.push(springSvg(RELIEF.x, RELIEF_BALL + 2, BASE.h - 3, 1.8, 4));
  out.push(`<g data-part="ball-relief">${ballSvg(RELIEF.x, RELIEF_BALL, 2.2)}</g>`);
  out.push(`<g data-mat="brass">${S(k.extrude(semi(RELIEF.x, 2.8, 16).map(([x, y]) => [x, y]).concat(semi(RELIEF.x, 2.8, 16).map(([x, y]) => [x, -y]).reverse()), BASE.h - 3, 3, P, { convex: true }), { tone: "mid" })}</g>`);
  return out.join("");
}
function springSvg(x, z0, z1, r = 2.2, turns = 5) {
  const h = helix(x, z0, z1, r, turns);
  return L(h.back, { tone: "lo" }) + L(h.front, { tone: "hi" });
}
// Aguja de descarga con perilla moleteada (fuera de la base, a la izquierda).
const NEEDLE_F = G.frameAlong([0, 0, NEEDLE.z], [1, 0, 0]);
function needle() {
  const F = { ...NEEDLE_F, o: [NEEDLE.seat - 2, 0, NEEDLE.z] };
  const out = [];
  const knob = { ...NEEDLE_F, o: [BASE.x0, 0, NEEDLE.z] };
  out.push(`<g data-mat="brass">${S(G.lathe([[-14, 0], [-14, 5.4], [-13.4, 6], [-5.6, 6], [-5, 5.4], [-5, 0]], knob, P), { tone: "mid", inner: L(G.ribsOf(knob, -13, -6, 6, 36, P), { tone: "lo" }) })}</g>`);
  out.push(S(G.lathe([[-5, 0], [-5, 3.2], [0.6, 3.2], [0.6, 0]], knob, P), { tone: "mid" }));
  out.push(S(G.lathe([[BASE.x0 - NEEDLE.seat + 2 + 0.6, 0], [BASE.x0 - NEEDLE.seat + 2 + 0.6, 1.8], [-3, 1.8], [0, 0]], F, P), { tone: "hi", crease: "lo" }));
  return out.join("");
}

// ── Palanca, biela, orejas y pernos (se reconstruyen en la página) ────────
const BRACKET = { x0: BOTTLE.r + X_R, x1: 50, z0: 132, z1: 142, y: 6.2 };
function bracket(front) {
  const out = [];
  if (!front) {
    const block = [[BRACKET.x0, -BRACKET.y], [BRACKET.x1, -BRACKET.y], [BRACKET.x1, BRACKET.y], [BRACKET.x0, BRACKET.y]];
    out.push(`<g data-mat="copper">${S(k.extrude(block, BRACKET.z0, BRACKET.z1 - BRACKET.z0, P, { convex: true, bevel: 0.5 }), { tone: "mid" })}</g>`);
  }
  const y0 = front ? 4.6 : -6.2;
  const ear = [[34, BRACKET.z1], [50, BRACKET.z1], [50, PIVOT[1] + 2], [46, PIVOT[1] + 7], [38, PIVOT[1] + 7], [34, PIVOT[1] + 2]];
  const F = { o: [0, y0, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] };
  out.push(`<g data-mat="copper">${S(G.prismOf(F, ear, 0, 1.6, P), { tone: "mid" })}</g>`);
  if (front) out.push(D([at([PIVOT[0], 6.2, PIVOT[1]])], { size: 0.7, tone: "hi" }));
  return out.join("");
}

// ── Manómetro ─────────────────────────────────────────────────────────────
const GF = { o: [GAUGE.x, 0, GAUGE.z], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] };
const DIAL_SWEEP = [Math.PI * 1.25, -Math.PI * 0.25]; // 0 bar abajo a la izquierda, 4 bar abajo a la derecha
const dialAngle = (bar) => DIAL_SWEEP[0] + ((DIAL_SWEEP[1] - DIAL_SWEEP[0]) * bar) / 4;
function gauge() {
  const out = [];
  out.push(`<g data-mat="brass">${S(k.cylinder(GAUGE.x, 0, 2.6, BASE.h, 6, P, 20), { tone: "mid" })}${S(k.extrude([[GAUGE.x - 3.4, -3.4], [GAUGE.x + 3.4, -3.4], [GAUGE.x + 3.4, 3.4], [GAUGE.x - 3.4, 3.4]], BASE.h + 6, 4, P, { convex: true, bevel: 0.4 }), { tone: "mid" })}${S(k.cylinder(GAUGE.x, 0, 2, BASE.h + 10, GAUGE.z - GAUGE.r - BASE.h - 10 + 1, P, 16), { tone: "mid" })}</g>`);
  out.push(`<g data-mat="steel">${S(G.lathe([[-3, 0], [-3, GAUGE.r], [2.4, GAUGE.r], [3, GAUGE.r - 0.6], [3, 0]], GF, P), { tone: "mid", crease: "lo" })}</g>`);
  // Carátula: anillo, marcas de 0 a 4 bar (cada 0.2), números y la zona roja del alivio.
  const face = 3.05;
  const minor = [];
  const major = [];
  for (let i = 0; i <= 20; i++) {
    const a = dialAngle(i / 5);
    const r0 = GAUGE.r - 2.2;
    const r1 = r0 - (i % 5 ? 1.1 : 2);
    (i % 5 ? minor : major).push(k.pathOf([at(G.pointOf(GF, face, r0, a)), at(G.pointOf(GF, face, r1, a))]));
  }
  out.push(L(k.pathOf(Array.from({ length: 65 }, (_, i) => at(G.pointOf(GF, face, GAUGE.r - 1.2, (i / 64) * Math.PI * 2))), true), { tone: "lo" }));
  const red = Array.from({ length: 13 }, (_, i) => at(G.pointOf(GF, face, GAUGE.r - 1.8, dialAngle(RELIEF_BAR + ((4 - RELIEF_BAR) * i) / 12))));
  out.push(`<path class="iso-line zona-roja" d="${k.pathOf(red)}"/>`);
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  const [ux, uy] = [at([1, 0, 0])[0] - at([0, 0, 0])[0], at([1, 0, 0])[1] - at([0, 0, 0])[1]];
  const [vx, vy] = [at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]];
  for (let bar = 0; bar <= 4; bar++) {
    const [px, py] = at(G.pointOf(GF, face, GAUGE.r - 6.2, dialAngle(bar)));
    out.push(`<text class="iso-face-text" data-tone="mid" font-size="2.6" text-anchor="middle" transform="matrix(${ux.toFixed(4)} ${uy.toFixed(4)} ${(-vx).toFixed(4)} ${(-vy).toFixed(4)} ${px.toFixed(2)} ${py.toFixed(2)}) translate(0 0.9)">${bar}</text>`);
  }
  out.push(D([at(G.pointOf(GF, face, 0, 0))], { size: 1, tone: "hi" }));
  return out.join("");
}
const gaugeNeedle = (bar) => {
  const a = dialAngle(bar);
  return k.pathOf([at(G.pointOf(GF, 3.1, 2, a + Math.PI)), at(G.pointOf(GF, 3.1, GAUGE.r - 2.6, a))]);
};

// ── Flujo de aceite: trayectos por el centro de los conductos ─────────────
const FLOWS = {
  succion: [[SUCTION.x, 120], [SUCTION.x, SUCTION.z], [SUCTION.inlet, SUCTION.z], [SUCTION.inlet, FLOOR + 6]],
  presion: [[X_P, FLOOR + 8], [OUTLET.x, FLOOR], [OUTLET.x, PRESS_Z], [-6, PRESS_Z], [-6, RAM_BOTTOM - 2]],
  descarga: [[NEEDLE.seat + 2, RAM_BOTTOM - 2], [NEEDLE.seat + 2, NEEDLE.z], [-59, NEEDLE.z], [-59, 110]],
  alivio: [[RELIEF.x, PRESS_Z], [RELIEF.x, BASE.h + 20]],
};
const flowLines = () =>
  Object.entries(FLOWS)
    .map(([name, points]) => `<path class="flujo" data-flow-part="${name}" pathLength="100" d="${k.pathOf(points.map(([x, z]) => sec(x, z)))}"/>`)
    .join("");

// ── Capa WebGL: aceite en el plano de corte (y = 0) con las mismas medidas que el SVG ──
// Conductos de baja (succión, depósito, alivio y descarga tras la aguja) y de alta presión
// (salida, conducto al pistón y al manómetro); las tapas vivas (pistón, nivel, émbolo) llegan por cuadro.
const R4 = (x0, z0, x1, z1) => [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)];
const hR = (x0, x1, z, r = CH) => R4(x0, z - r, x1, z + r);
const vR = (x, z0, z1, r = CH) => R4(x - r, z0, x + r, z1);
const GL_FLOWS = Object.entries(FLOWS).flatMap(([name, points]) => {
  const lengths = points.slice(1).map(([x, z], i) => Math.hypot(x - points[i][0], z - points[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let s = 0;
  return lengths.map((len, i) => {
    const seg = { name, a: points[i], b: points[i + 1], s0: (s / total) * 100, s1: ((s + len) / total) * 100 };
    s += len;
    return seg;
  });
});
const GL = {
  camera: glCamera(P),
  low: [vR(SUCTION.x, SUCTION.z - CH, BASE.h), hR(SUCTION.x - CH, SUCTION.inlet + CH, SUCTION.z), vR(SUCTION.inlet, SUCTION.z, FLOOR, 1.8), vR(RELIEF.x, RELIEF.seat, BASE.h, 2.8), hR(NEEDLE.seat - 2, NEEDLE.seat + 3.8, NEEDLE.z, 1.4), vR(-59, NEEDLE.z, BASE.h, 1.8)],
  high: [R4(OUTLET.x - 3.2, PRESS_Z - CH, OUTLET.x + 3.2, OUTLET.seat), vR(OUTLET.x, OUTLET.seat, FLOOR, 1.8), hR(-6 - CH, GAUGE.x + CH, PRESS_Z), vR(-6, PRESS_Z, BASE.h), vR(GAUGE.x, PRESS_Z, BASE.h, 1.8), vR(RELIEF.x, PRESS_Z, RELIEF.seat, 1.5), vR(NEEDLE.seat + 2, NEEDLE.z, BASE.h, 1.8)],
  // Lo que tapa el aceite en el mismo plano: topes del pistón y tapones de los barrenos.
  occ: [R4(X_R - RB, BASE.h, X_R - RB + 5, RAM_BOTTOM), R4(X_R + RB - 5, BASE.h, X_R + RB, RAM_BOTTOM), ...[GAUGE.x + CH, -6 - CH].map((x) => R4(x - 0.9, PRESS_Z - CH - 0.4, x + 0.9, PRESS_Z + CH + 0.4))],
  res: [X_R - BOTTLE.rIn, X_R - RCYL.r, X_R + RCYL.r, X_R + BOTTLE.rIn],
  ram: [X_R - RB, X_R + RB, BASE.h],
  pump: [X_P - RP, X_P + RP, FLOOR, BASE.h],
  balls: { x: [SUCTION.inlet, OUTLET.x, RELIEF.x], z: [INLET_BALL, OUTLET_BALL, RELIEF_BALL], r: [BALL, BALL, 2.2] },
  segs: GL_FLOWS.map(({ a, b }) => [a[0], a[1], b[0], b[1]]),
  segS: GL_FLOWS.map(({ s0, s1 }) => [s0, s1]),
  segName: GL_FLOWS.map(({ name }) => name),
};
const GL_FRAGMENT = `
uniform vec4 uLow[${GL.low.length}];
uniform vec4 uHigh[${GL.high.length}];
uniform vec4 uOcc[${GL.occ.length}];
uniform vec4 uSeg[${GL_FLOWS.length}];
uniform vec4 uSegS[${GL_FLOWS.length}];
uniform vec4 uRes;
uniform vec3 uRam;
uniform vec4 uPump;
uniform vec3 uBallX;
uniform vec3 uBallR;
uniform vec3 uBallZ;
uniform vec4 uLive;
uniform float uLight;
float sdBox(vec2 p,vec4 r){vec2 c=(r.xy+r.zw)*.5,h=(r.zw-r.xy)*.5;vec2 q=abs(p-c)-h;return length(max(q,0.))+min(max(q.x,q.y),0.);}
float inBox(vec2 p,vec4 r,float px){return 1.-smoothstep(-.7*px,.7*px,sdBox(p,r));}
float inBall(vec2 p,float x,float z,float r,float px){return 1.-smoothstep(r-.7*px,r+.7*px,length(p-vec2(x,z)));}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec2 p=onWallY(vb,0.).xz;
  float px=pixelOf()*1.2;
  float low=0.,high=0.,occ=0.;
  for(int i=0;i<${GL.low.length};i++)low=max(low,inBox(p,uLow[i],px));
  for(int i=0;i<${GL.high.length};i++)high=max(high,inBox(p,uHigh[i],px));
  for(int i=0;i<${GL.occ.length};i++)occ=max(occ,inBox(p,uOcc[i],px));
  // Tapas vivas: x = fondo del pistón grande, y = nivel del depósito, z = fondo del émbolo.
  low=max(low,max(inBox(p,vec4(uRes.x,uRam.z,uRes.y,uLive.y),px),inBox(p,vec4(uRes.z,uRam.z,uRes.w,uLive.y),px)));
  high=max(high,inBox(p,vec4(uRam.x,uRam.z,uRam.y,uLive.x),px));
  float pump=max(inBox(p,uPump,px),inBox(p,vec4(uPump.x,uPump.w,uPump.y,uLive.z),px));
  occ=max(occ,inBall(p,uBallX.x,uBallZ.x,uBallR.x,px));
  occ=max(occ,inBall(p,uBallX.y,uBallZ.y,uBallR.y,px));
  occ=max(occ,inBall(p,uBallX.z,uBallZ.z,uBallR.z,px));
  float keep=1.-occ;
  float oil=max(max(low,high),pump)*keep;
  if(oil<.002){gl_FragColor=vec4(0.);return;}
  // Brillo: manchas de luz que suben despacio por el aceite.
  float n=fbm3(vec3(p.x*.16,p.y*.16-uTime*.35,uTime*.12));
  float shine=smoothstep(.52,.78,n)*oil;
  // Flujo: pulsos que avanzan por el centro de cada conducto, al ritmo de las líneas del SVG.
  float flow=0.;
  for(int i=0;i<${GL_FLOWS.length};i++){
    vec4 sg=uSeg[i];vec4 ss=uSegS[i];
    vec2 ab=sg.zw-sg.xy;float t=clamp(dot(p-sg.xy,ab)/dot(ab,ab),0.,1.);
    float d=length(p-sg.xy-ab*t);
    float s=mix(ss.x,ss.y,t)+ss.z;
    float pulse=pow(.5+.5*cos(6.2832*s/8.),3.);
    flow+=ss.w*exp(-d*d/6.)*pulse;
  }
  flow=min(flow,1.)*oil;
  // Presión: el aceite de alta se enciende con los bar (uLive.w de 0 a 1), del ámbar al rojo.
  float pr=uLive.w;
  float press=high*keep*pr*(.8+.35*n);
  vec3 hot=mix(vec3(1.,.62,.22),vec3(1.,.32,.16),smoothstep(.4,.85,pr));
  float dith=(hash12(gl_FragCoord.xy)-.5)/255.;
  if(uLight<.5){
    vec3 c=tonemap(hot*press*.9+vec3(1.,.86,.55)*shine*.32+vec3(1.,.93,.7)*flow*.85,1.25);
    float a=max(c.r,max(c.g,c.b));
    gl_FragColor=vec4(c+dith,a);
  }else{
    // En papel: la presión entinta el aceite hacia el rojo; brillo y flujo lo aclaran.
    vec3 ink=mix(vec3(.80,.40,.12),vec3(.70,.18,.10),smoothstep(.4,.85,pr));
    float ap=clamp(press*.55,0.,.6);
    vec4 c=vec4(ink*ap,ap);
    float al=clamp(shine*.38+flow*.6,0.,.75);
    c=vec4(vec3(1.,.95,.80)*al,al)+c*(1.-al);
    gl_FragColor=vec4(c.rgb+dith,c.a);
  }
}`;

// ── Página: modo corte ────────────────────────────────────────────────────
const fmt = (n, digits = 0) => n.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/,/g, " ");
// Panel lateral: F₂ grande en vivo; F₁ también se mueve con un deslizador (teclado y lectores de pantalla).
const panelHtml = () => `<aside class="ph-panel" aria-label="Fuerzas">
<p class="ph-panel-k">Fuerza que sale</p>
<p class="ph-panel-f2"><span data-f2>${fmt(F2)}</span> N</p>
<p class="ph-panel-sub">F<sub>2</sub> = F<sub>1</sub> × ${RA}</p>
<label class="ph-panel-f1"><span>F<sub>1</sub> en el émbolo: <b data-f1>${fmt(F1)} N</b></span><input type="range" min="${F1_RANGO.min}" max="${F1_RANGO.max}" step="${F1_RANGO.paso}" value="${F1}" data-fuerza aria-valuetext="${fmt(F1)} N; F2 = ${fmt(F2)} N"></label>
<p class="ph-panel-sub">Presión: <b data-p>${fmt(PRESSURE_BAR, 1)}</b> bar</p>
</aside>`;
const bodyCut = [
  bench(),
  baseBack(),
  baseSection(),
  bottleBack(),
  bottleSection(),
  capBack(),
  capSection(),
  pumpBack(),
  pumpSection(),
  risePost(),
  `<g data-part="ram-back">${ramBack(0)}</g>`,
  `<g data-part="ram">${ramSection()}${ramTopBack()}${pointer()}${load()}</g>`,
  `<g data-part="plunger-back">${plungerBack(PIN_UP - 3)}</g>`,
  `<g data-part="plunger">${plungerSection()}</g>`,
  valves(),
  `<g data-part="needle">${needle()}</g>`,
  `<g class="flujos">${flowLines()}</g>`,
  bracket(false),
  `<g data-part="lever"></g>`,
  `<g data-part="eye">${plungerEye()}</g>`,
  bracket(true),
  gauge(),
  `<path data-part="gauge-needle" class="iso-line" data-tone="lit" data-free="start" style="stroke-width:.9" d="${gaugeNeedle(0)}"/>`,
  // F₁ sobre el puño: flecha que se arrastra (la dibuja el script con la palanca).
  `<g data-part="fuerza" class="ph-fuerza"></g>`,
];

const LABEL = `Gato hidráulico de botella cortado a la mitad sobre un banco. A la derecha, una palanca mueve un émbolo de ${d1} cm que bombea aceite del depósito, por dos válvulas de bola, a un pistón de ${d2} cm que levanta una carga de ${fmt(F2)} N. Una aguja de descarga regresa el aceite al depósito y una válvula de alivio protege el circuito. Un manómetro marca la presión.`;
const svgCut = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: bodyCut });
const HATCH = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="ph-rayado-a" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V3.2" class="rayado"/></pattern><pattern id="ph-rayado-b" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 0V2.4" class="rayado"/></pattern></defs></svg>`;

// ── Modo 3D: el gato por fuera sobre una base fija, gira completo ─────────
function build3d() {
  const P3 = k.fitProjection(
    [...k.boxCorners({ x: -170, y: -170, w: 340, d: 340 }, -14, 0), [0, 0, SADDLE.z1 + LOAD.h * 2 + RISE + 4]],
    WIDTH,
    HEIGHT,
    { pad: 14, azimuth: AZIMUTH },
  );
  const R = A.recorder(P3);
  const put = (item) => R.put({ ...item, shapes: item.shapes.map((shape, index) => R.solid(Object.assign(shape, { name: shape.name ?? (index ? `${item.name}#${index + 1}` : item.name) }))) });
  const S3 = (paths, style) => k.solidSvg(paths, style);
  const L3 = (d, style) => k.lineSvg(d, style);
  // Banco redondo fijo, por debajo de todo lo que gira.
  const TABLE_R = 168;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const [x, y] = [148 * Math.cos(a), 148 * Math.sin(a)];
    put({ name: `mesa.pata.${i}`, layer: "back", at: [x, y, -14], svg: S3(k.cylinder(x, y, 6, -14, 3, P3, 24), { tone: "lo" }), shapes: [A.cylinder(x, y, 6, -14, 3, { ground: true })] });
  }
  const tableSvg = `<path class="iso-halo" d="${k.cylinder(0, 0, TABLE_R, -14, 11, P3, 120).fill}"/>` + S3(k.cylinder(0, 0, TABLE_R, -11, 11, P3, 160, 1.2), { tone: "mid", inner: L3(k.sideArc(0, 0, TABLE_R, -6, P3, 96), { tone: "faint" }) }) + L3(k.ring(0, 0, TABLE_R - 6, 0, P3, 160), { tone: "lo" }) + k.dotsSvg(Array.from({ length: 12 }, (_, i) => k.iso([(TABLE_R - 10) * Math.cos((i / 12) * Math.PI * 2), (TABLE_R - 10) * Math.sin((i / 12) * Math.PI * 2), 0], P3)), { size: 0.5 });
  put({ name: "mesa", layer: "back", at: [0, 0, -11], bias: 4, svg: tableSvg, shapes: [A.cylinder(0, 0, TABLE_R, -11, 11, { ground: true })] });

  const T = turning(P3, { recorder: R });
  const gato = T.group("gato", { turn: { pivot: [0, 0] } });
  const ram = T.group("piston", { parent: gato, slide: { direction: [0, 0, 1], travel: RISE } });
  const plunger = T.group("embolo", { parent: gato, slide: { direction: [0, 0, 1], travel: STROKE_CM * CM } });
  const lever = T.group("palanca", { parent: gato, hinge: { point: [PIVOT[0], 0, PIVOT[1]], axis: [0, 1, 0], range: [-((THETA_UP * 180) / Math.PI) - 0.5, -((THETA_DOWN * 180) / Math.PI) + 0.5] } });
  const linkPin = pinOf(0);
  const link = T.group("biela", { parent: lever, hinge: { point: [linkPin[0], 0, linkPin[1]], axis: [0, 1, 0], range: [-12, 12] } });
  const layer = T.layer("gato");
  T.stack(["back", "gato"]);
  const VERT = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const H = { group: gato, layer };
  const round = (name, F, s0, s1, r, extra = {}) => T.round({ name, ...H, F, s0, s1, r, tone: "mid", ...extra });

  // Base con tornillos.
  const bolts = [[BASE.x0 + 10, -BASE.y + 10], [BASE.x1 - 10, -BASE.y + 10], [BASE.x1 - 10, BASE.y - 10], [BASE.x0 + 10, BASE.y - 10]].map(([x, y]) => ({ at: [BASE.h, x, y], normal: [0, 0, 1], size: 0.55 }));
  T.prism({ name: "base", ...H, plan: { x: BASE.x0, y: -BASE.y, w: BASE.x1 - BASE.x0, d: BASE.y * 2, r: 6 }, z: 0, h: BASE.h, steps: 6, tone: "mid", material: "gunmetal", details: { dots: bolts, rings: bolts.map((b) => ({ ...b, r: 3, tone: "lo" })) } });
  // Botella y cilindro de la bomba (cobre pintado).
  round("botella.cordon", VERT(X_R, 0), BASE.h, BASE.h + 3, BOTTLE.r + 2, { material: "copper" });
  round("botella", VERT(X_R, 0), BASE.h + 3, BOTTLE.z1, BOTTLE.r, { tone: "hi", crease: "lo", material: "copper", details: { seams: [70, 74] } });
  round("tapa.base", VERT(X_R, 0), CAP.z0, RAM.z0, CAP.r, { material: "gunmetal" });
  // Corona de la tapa en sectores: deja pasar el pistón.
  const sector = (name, cx, rIn, rOut, count, z0, z1, i, material) => {
    const a0 = (i / count) * Math.PI * 2;
    const a1 = ((i + 1) / count) * Math.PI * 2;
    const poly = [[cx + rIn * Math.cos(a0), rIn * Math.sin(a0)]];
    for (let j = 0; j <= 4; j++) {
      const a = a0 + ((a1 - a0) * j) / 4;
      poly.push([cx + rOut * Math.cos(a), rOut * Math.sin(a)]);
    }
    poly.push([cx + rIn * Math.cos(a1), rIn * Math.sin(a1)]);
    T.prism({ name: `${name}.${i}`, ...H, F: { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, polygon: poly, s0: z0, s1: z1, tone: "mid", bevel: 0, material });
  };
  for (let i = 0; i < 16; i++) sector("tapa.corona", X_R, CAP.bore, CAP.r, 16, RAM.z0, CAP.z1, i, "gunmetal");
  round("bomba.cordon", VERT(X_P, 0), PUMP.z0, PUMP.z0 + 3, PUMP.r + 2, { material: "copper" });
  round("bomba", VERT(X_P, 0), PUMP.z0 + 3, PUMP.z1, PUMP.r, { tone: "hi", crease: "lo", material: "copper" });
  round("bomba.prensa", VERT(X_P, 0), GLAND.z0, GLAND.z0 + 2, GLAND.r, { material: "gunmetal" });
  for (let i = 0; i < 8; i++) sector("bomba.corona", X_P, GLAND.bore, GLAND.r, 8, GLAND.z0 + 2, GLAND.z1, i, "gunmetal");
  // Pistón (sube), tornillo, silla y carga.
  const R2 = { group: ram, layer };
  T.round({ name: "piston", ...R2, F: VERT(X_R, 0), s0: RAM.z0, s1: RAM.top, r: RB, tone: "hi", crease: "lo", material: "chrome" });
  T.round({ name: "piston.tornillo", ...R2, F: VERT(X_R, 0), s0: RAM.top, s1: SCREW.top, r: SCREW.r, tone: "mid", material: "steel", details: { seams: [RAM.top + 2.4, RAM.top + 4.8, RAM.top + 7.2] } });
  T.round({ name: "piston.silla", ...R2, F: VERT(X_R, 0), s0: SADDLE.z0, s1: SADDLE.z1, r: SADDLE.r, tone: "mid", material: "steel" });
  T.round({ name: "carga.1", ...R2, F: VERT(X_R, 0), s0: SADDLE.z1, s1: SADDLE.z1 + LOAD.h - 0.4, r: LOAD.r, tone: "mid" });
  T.round({ name: "carga.2", ...R2, F: VERT(X_R, 0), s0: SADDLE.z1 + LOAD.h - 0.4, s1: SADDLE.z1 + 2 * LOAD.h - 0.8, r: LOAD.r, tone: "mid", details: { bolts: [{ s: SADDLE.z1 + 2 * LOAD.h - 0.8, r: 26, count: 6, phase: 0.3, size: 0.5 }] } });
  // Émbolo (baja y sube) con su ojo.
  const P2 = { group: plunger, layer };
  T.round({ name: "embolo", ...P2, F: VERT(X_P, 0), s0: GLAND.z0 + 2, s1: GLAND.z0 + 2 + (PIN_UP - 7 - (GLAND.z0 + 2)) - STROKE_CM * CM, r: RP, tone: "hi", crease: "lo", material: "chrome" });
  const eyeZ = PIN_UP - STROKE_CM * CM;
  T.prism({ name: "embolo.ojo", ...P2, plan: { x: X_P - 3.6, y: -3.4, w: 7.2, d: 6.8, r: 0.8 }, z: eyeZ - 7, h: 7.6, steps: 2, bevel: 0.4, tone: "hi", crease: "lo", material: "chrome" });
  // Ménsula y orejas de la palanca.
  T.prism({ name: "mensula", ...H, plan: { x: BRACKET.x0, y: -BRACKET.y, w: BRACKET.x1 - BRACKET.x0, d: BRACKET.y * 2, r: 0.6 }, z: BRACKET.z0, h: BRACKET.z1 - BRACKET.z0, steps: 2, bevel: 0.5, tone: "mid", material: "copper" });
  const ear = [[34, BRACKET.z1], [50, BRACKET.z1], [50, PIVOT[1] + 2], [46, PIVOT[1] + 7], [38, PIVOT[1] + 7], [34, PIVOT[1] + 2]];
  for (const [name, y0] of [["oreja.-", -6.2], ["oreja.+", 4.6]]) T.prism({ name, ...H, F: { o: [0, y0, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }, polygon: ear, s0: 0, s1: 1.6, tone: "mid", material: "copper", details: { dots: [{ at: [y0 > 0 ? 1.6 : 0, PIVOT[0], PIVOT[1]], normal: [0, y0 > 0 ? 1 : -1, 0], size: 0.6 }] } });
  // Palanca (gira en su perno) con mango moleteado.
  const LV = { group: lever, layer };
  const along = G.frameOf([PIVOT[0], 0, PIVOT[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  for (const side of [-1, 1]) T.round({ name: `palanca.nudillo${side > 0 ? "+" : "-"}`, ...LV, F: G.frameOf([PIVOT[0], side * 4, PIVOT[1]], [0, side, 0], [1, 0, 0], [0, 0, side]), s0: -0.6, s1: 0.6, r: 5, tone: "mid", material: "steel" });
  T.prism({ name: "palanca.cuenca", ...LV, F: along, polygon: [[-3.4, -3.4], [3.4, -3.4], [3.4, 3.4], [-3.4, 3.4]], s0: -5, s1: 46, tone: "hi", crease: "lo", bevel: 0.5, material: "copper" });
  T.round({ name: "palanca.mango", ...LV, F: along, s0: 46, s1: HANDLE - 26, r: 2.8, tone: "hi", material: "chrome" });
  T.round({ name: "palanca.puno", ...LV, F: along, s0: HANDLE - 26, s1: HANDLE, r: 4.2, tone: "mid", material: "rubber", ends: ["flat", "flat"], details: { ribs: { s0: HANDLE - 24, s1: HANDLE - 2, count: 40, seams: true, fade: [0.08, 0.5], tone: "lo" } } });
  // Biela: dos placas que cuelgan del perno de la palanca al ojo del émbolo.
  const BL = { group: link, layer };
  for (const [side, y0] of [[-1, -4.6], [1, 3.4]]) T.prism({ name: `biela.${side > 0 ? "+" : "-"}`, ...BL, F: { o: [0, y0, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }, polygon: [[linkPin[0] - 2.4, linkPin[1] + 1], [linkPin[0] + 2.4, linkPin[1] + 1], [linkPin[0] + 2.4, linkPin[1] - LINK - 1], [linkPin[0] - 2.4, linkPin[1] - LINK - 1]], s0: 0, s1: 1.2, tone: "mid", material: "steel", details: { dots: [linkPin[1], linkPin[1] - LINK].map((z) => ({ at: [y0 > 0 ? 1.2 : 0, linkPin[0], z], normal: [0, side, 0], size: 0.55 })) } });
  // Perilla de descarga, manómetro y tapón de llenado.
  T.round({ name: "descarga.perilla", ...H, F: G.frameOf([BASE.x0, 0, NEEDLE.z], [-1, 0, 0], [0, 1, 0], [0, 0, 1]), s0: 0, s1: 9, r: 6, tone: "mid", material: "brass", details: { ribs: { s0: 1, s1: 8, count: 36, seams: true, fade: [0.08, 0.5], tone: "lo" } } });
  round("manometro.tubo", VERT(GAUGE.x, 0), BASE.h, GAUGE.z - GAUGE.r, 2.4, { material: "brass" });
  T.round({ name: "manometro", ...H, F: G.frameOf([GAUGE.x, 0, GAUGE.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), s0: -3, s1: 3, r: GAUGE.r, tone: "mid", material: "steel", details: { rings: [{ at: [3, 0, 0], normal: [0, 1, 0], r: GAUGE.r - 1.2, tone: "lo" }], dots: [{ at: [3, 0, 0], normal: [0, 1, 0], size: 1 }] } });
  const plugA = (AZIMUTH * Math.PI) / 180;
  const plugDir = [Math.cos(plugA), Math.sin(plugA), 0];
  T.round({ name: "botella.tapon", ...H, F: G.frameOf([X_R + BOTTLE.r * plugDir[0], BOTTLE.r * plugDir[1], 110], plugDir, [0, 0, 1], G.cross3(plugDir, [0, 0, 1])), s0: 0, s1: 3, r: 4.5, tone: "mid", material: "rubber" });

  const follow = (v) => {
    const q = v.q ?? 1;
    const theta = THETA_DOWN + (THETA_UP - THETA_DOWN) * q;
    const [lx, lz] = [PIVOT[0] + ARM * Math.cos(theta), PIVOT[1] + ARM * Math.sin(theta)];
    const pin = lz - Math.sqrt(LINK ** 2 - (X_P - lx) ** 2);
    const tilt = Math.asin((X_P - lx) / LINK);
    return { gato: v.gato ?? 0, piston: Math.min(RISE, Math.max(0, (v.y ?? 0) * CM)), embolo: pin - (PIN_UP - STROKE_CM * CM), palanca: (-theta * 180) / Math.PI, biela: (theta * 180) / Math.PI - (tilt * 180) / Math.PI };
  };
  void follow;
  return { P3, R, T, layerSvg: null, follow };
}

const three = build3d();
// La biela está construida vertical en θ = 0; su ángulo relativo sale de la cinemática.
const follow3 = new Function(
  "v",
  `const THETA_DOWN=${THETA_DOWN},THETA_UP=${THETA_UP},PIVOT=${JSON.stringify(PIVOT)},ARM=${ARM},LINK=${LINK},X_P=${X_P},RISE=${RISE},CM=${CM},BASE_PIN=${PIN_UP - STROKE_CM * CM};
  const q = v.q ?? 1;
  const theta = THETA_DOWN + (THETA_UP - THETA_DOWN) * q;
  const lx = PIVOT[0] + ARM * Math.cos(theta), lz = PIVOT[1] + ARM * Math.sin(theta);
  const pin = lz - Math.sqrt(LINK * LINK - (X_P - lx) * (X_P - lx));
  const tilt = Math.asin((X_P - lx) / LINK);
  return { gato: v.gato ?? 0, piston: Math.min(RISE, Math.max(0, (v.y ?? 0) * CM)), embolo: pin - BASE_PIN, palanca: -theta * 180 / Math.PI, biela: (theta - tilt) * 180 / Math.PI };`,
);
const poses3 = () => {
  const out = [];
  for (let i = 0; i < 720; i++) out.push(follow3({ gato: i * 0.5, q: ((i * 7) % 40) / 39, y: (((i * 3) % 50) / 49) * Y_MAX }));
  for (let i = 0; i < 360; i++) for (const q of [0, 1]) out.push(follow3({ gato: i, q, y: 0 }));
  for (let i = 0; i <= 180; i++) out.push(follow3({ gato: 30 + i / 6, q: 0.5 + 0.5 * Math.cos((i / 60) * Math.PI * 2), y: Math.min(Y_MAX, (i / 60) * 0.4) }));
  return out;
};
const out3 = three.T.build({ statics: three.R.items, poses: poses3 });
A.settle(three.R, three.P3);
if (argv.includes("--audit")) {
  A.auditOrExit(three.R, three.P3);
  TA.orbitOrExit(three.T, three.R, three.P3, {
    sweep: { at: (x) => follow3({ gato: x, q: 1, y: 0 }), from: 0, to: 360, frame: 0.3 },
    clips: [{ name: "bombeo", at: (t) => follow3({ gato: 30 + 10 * t, q: 0.5 + 0.5 * Math.cos(t * Math.PI * 2), y: Math.min(Y_MAX, t * 0.4) }), from: 0, to: 3, frame: 1 / 60 }],
    quick: argv.includes("--quick"),
    only: argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null,
  });
}
const back3 = three.R.items.filter((item) => item.layer === "back").sort((a, b) => a.key - b.key).map((item) => item.svg);
const stage3 = `${k.figureSvg({ width: WIDTH, height: HEIGHT, label: "Gato hidráulico completo que gira sobre una mesa redonda.", body: back3 })}${out3.layerSvg("gato", { width: WIDTH, height: HEIGHT })}`;

// ── Estilos (paleta fusión de principio-de-arquimedes/v2) ─────────────────
const FUSION = `
.iso[data-theme="light"]{
  --bg:#F6F1E6; --sup:#FFFCF6; --texto:#2E2117; --suave:#77634F; --borde:#E5DACA; --borde-fuerte:#CDBEA5;
  --acento:#2F6F73; --rubrica:#A5352A; --dorado:#B08A3E; --mesa:#ECE3D2; --sombra:#3A2716;
  --aceite:#C9973E; --aceite-claro:#E9C77F; --aceite-osc:#8E6420; --corte:#F3EBDD; --rayado:#B9A88E; --aire:#E6DCCB; --sello:#2E2117;
}
.iso[data-theme="dark"]{
  --bg:#17120D; --sup:#211912; --texto:#EFE4CF; --suave:#B6A385; --borde:#382C20; --borde-fuerte:#4D3D2C;
  --acento:#7FB3B0; --rubrica:#E07A5F; --dorado:#D9B26A; --mesa:#1D160F; --sombra:#000000;
  --aceite:#B98A3A; --aceite-claro:#E4C27A; --aceite-osc:#6E4D18; --corte:#3A3026; --rayado:#5E5040; --aire:#1A140E; --sello:#0B0806;
}
.iso.iso[data-theme]{
  --anatomy-page:var(--bg); --anatomy-card:var(--sup); --anatomy-text:var(--suave); --anatomy-strong:var(--texto); --anatomy-muted:var(--suave);
  --anatomy-paper:var(--sup); --anatomy-face:var(--sup); --anatomy-top:color-mix(in srgb,var(--sup) 70%,#fff);
  --anatomy-shade-0:color-mix(in srgb,var(--mesa) 55%,var(--borde-fuerte)); --anatomy-shade-1:var(--mesa);
  --anatomy-shade-2:color-mix(in srgb,var(--mesa) 55%,var(--sup)); --anatomy-shade-3:color-mix(in srgb,var(--mesa) 25%,var(--sup));
  --anatomy-lit-top:color-mix(in srgb,var(--rubrica) 55%,var(--sup)); --anatomy-lit-shade:var(--rubrica);
  --anatomy-hi:var(--texto); --anatomy-mid:color-mix(in srgb,var(--suave) 80%,var(--borde-fuerte)); --anatomy-lo:var(--borde-fuerte); --anatomy-faint:var(--borde);
  --anatomy-lit:var(--rubrica); --anatomy-halo:var(--sombra); --anatomy-halo-opacity:.28; --anatomy-dot:var(--texto);
}
.iso[data-theme="dark"]{
  --anatomy-face:#2A2018; --anatomy-top:#2E241B;
  --anatomy-shade-0:#191209; --anatomy-shade-1:#1E1711; --anatomy-shade-2:#231A13; --anatomy-shade-3:#271E16;
  --anatomy-lit-top:color-mix(in srgb,var(--rubrica) 70%,#fff); --anatomy-lit-shade:color-mix(in srgb,var(--rubrica) 75%,#000);
  --anatomy-mid:#8C7A62; --anatomy-halo-opacity:.9;
}
.corte{fill:var(--corte)}
.corte[data-hatch="a"]{fill:url(#ph-rayado-a)}
.corte[data-hatch="b"]{fill:url(#ph-rayado-b)}
.rayado{stroke:var(--rayado);stroke-width:.55}
#ph-rayado-a,#ph-rayado-b{background:var(--corte)}
.aceite-corte{fill:var(--aceite)}
.aire{fill:var(--aire)}
.hueco{fill:var(--aire)}
.sello{fill:var(--sello)}
.guia{fill:var(--dorado)}
.zona-roja{stroke:var(--rubrica);stroke-width:1.1}
.flujo{fill:none;stroke:var(--aceite-claro);stroke-width:1.5;stroke-linecap:round;stroke-dasharray:2.2 5.8;opacity:0}
.ph-barra{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 12px;margin:0 0 10px}
.ph-modos{display:flex;gap:6px}
.ph-modos button,.ph-acciones button{font:600 13px/1 system-ui,sans-serif;border-radius:999px;padding:9px 14px;min-height:40px;cursor:pointer;border:1.5px solid var(--borde-fuerte);background:var(--sup);color:var(--texto)}
.ph-modos button[aria-pressed="true"]{background:var(--texto);color:var(--sup);border-color:var(--texto)}
.ph-acciones{display:flex;gap:6px;margin:10px 0 0;flex-wrap:wrap}
.ph-acciones button[data-accion="bombear"]{border-color:var(--rubrica);color:var(--rubrica)}
.ph-escena{position:relative}
.ph-escena .iso-stage{touch-action:manipulation;-webkit-tap-highlight-color:transparent;outline:none;cursor:pointer}
.ph-escena .iso-stage:focus-visible{outline:1px solid var(--suave);outline-offset:6px}
.ph-escena .iso-stage[hidden]{display:none}
.ph-escena .iso-turn{cursor:grab;touch-action:pan-y}
.ph-cargando{position:absolute;inset:auto 0 8px;text-align:center;font-size:12px;color:var(--suave)}
.ph-escena .iso-stage{position:relative}
.ph-gl{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.iso[data-theme="dark"] .ph-gl{mix-blend-mode:screen}
.ph-fuerza{cursor:ns-resize;touch-action:none}
.ph-fuerza .ph-agarre{fill:transparent}
.ph-cuerpo{display:grid;grid-template-columns:minmax(0,1fr) 136px;gap:14px;align-items:center}
.ph-panel{border-left:1px solid var(--borde);padding:4px 0 4px 14px;font:13px/1.35 system-ui,sans-serif;color:var(--suave)}
.ph-panel p{margin:0}
.ph-panel-k{font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.ph-panel-f2{font:700 34px/1.05 system-ui,sans-serif;color:var(--rubrica);font-variant-numeric:tabular-nums;white-space:nowrap;margin:2px 0 4px!important}
.ph-panel-f2 span{color:var(--texto)}
.ph-panel b{color:var(--texto);font-variant-numeric:tabular-nums;white-space:nowrap}
.ph-panel-f1{display:block;margin:12px 0 6px}
.ph-panel-f1 input{width:100%;margin:6px 0 0;accent-color:var(--rubrica)}
@media (max-width:560px){
  .ph-cuerpo{grid-template-columns:1fr;gap:8px}
  .ph-panel{border-left:0;border-top:1px solid var(--borde);padding:10px 0 0;display:grid;grid-template-columns:auto 1fr;gap:2px 14px;align-items:end}
  .ph-panel-k{grid-column:1/-1}
  .ph-panel-f2{grid-row:2/4}
  .ph-panel-f1{grid-column:1/-1;order:5;margin:6px 0 0}
}
`;
// Sólidos de corte con su relleno de fondo bajo el rayado: el patrón sólo trae líneas.
const HATCH_BG = `<style>.corte[data-hatch]{paint-order:normal}</style>`;
void HATCH_BG;

// ── Comportamiento (modo corte) ───────────────────────────────────────────
const LIVE = `
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify({ RA, X_MAX, Y_MAX, STROKE_CM, STROKES, CM, F2: fmt(F2), PRESSURE_BAR, RELIEF_BAR, X_R, RB, CAP_TOP: CAP.z1, RAM_TOP: RAM.top, X_P, RP, GLAND_TOP: GLAND.z1, PIN_UP, THETA_UP, THETA_DOWN, PIVOT, ARM, LINK, HANDLE, OIL_Z0, RES_AREA, BOTTLE_RIN: BOTTLE.rIn, RCYL_R: RCYL.r, BASE_H: BASE.h, NEEDLE_OPEN: 3, V, LIGHT, GAUGE, BANDS: [0, 0.2, 0.42, 0.62] })};
const dialAngle = (bar) => ${DIAL_SWEEP[0]} + (${DIAL_SWEEP[1] - DIAL_SWEEP[0]}) * bar / 4;
const FZ = ${JSON.stringify({ ...F1_RANGO, F1, A1: Math.PI * (d1 / 2) ** 2, W: WIDTH, H: HEIGHT, RAM_BOTTOM, PL_LEN })};
const GLD = ${JSON.stringify(GL)};
const GL_FRAGMENT = ${JSON.stringify(GL_FRAGMENT)};
// Pascal: F₁ en el émbolo → presión (bar) → F₂ en el pistón grande.
const force = { f: FZ.F1 };
const pressure = () => force.f / FZ.A1 / 10;
const fmtN = (n, digits = 0) => n.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/,/g, " ");
const root = document.querySelector(".ph-escena");
const stage = root.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const parts = Object.fromEntries(["ram", "ram-back", "plunger", "plunger-back", "lever", "eye", "ball-in", "ball-out", "spring-out", "ball-relief", "needle", "gauge-needle", "res-l", "res-r", "fuerza"].map((n) => [n, part(n)]));
const flows = Object.fromEntries([...svg.querySelectorAll("[data-flow-part]")].map((el) => [el.dataset.flowPart, el]));
const levels = { l: svg.querySelector(".nivel-l"), r: svg.querySelector(".nivel-r") };
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => t * t * (3 - 2 * t);
const at = (p) => iso(p, P);
const sec = (x, z) => at([x, 0, z]);
const secRect = (x0, z0, x1, z1) => pathOf([sec(x0, z0), sec(x1, z0), sec(x1, z1), sec(x0, z1)], true);
const semi = (cx, r, steps) => Array.from({ length: steps + 1 }, (_, i) => { const a = Math.PI + Math.PI * i / steps; return [cx + r * Math.cos(a), r * Math.sin(a)]; });
const halfCyl = (cx, r, z0, z1, style) => solidSvg(extrude(semi(cx, r, r > 20 ? 56 : 28), z0, Math.max(0.01, z1 - z0), P, { convex: true }), style);
// Prisma en cualquier eje (mismas reglas de tono que el kit) para la palanca y la biela.
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const band = (s) => { let t = 0; while (t < M.BANDS.length && s >= M.BANDS[t]) t++; return t; };
function prism(F, poly, s0, s1, tone, extra = "") {
  const pt = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  const lo = poly.map((p) => at(pt(s0, p))), hi = poly.map((p) => at(pt(s1, p)));
  const shades = [[], [], [], [], []];
  const n = poly.length;
  for (let j = 0; j < n; j++) {
    const [x0, y0] = poly[j], [x1, y1] = poly[(j + 1) % n];
    const nrm = [F.u[0] * (y1 - y0) - F.v[0] * (x1 - x0), F.u[1] * (y1 - y0) - F.v[1] * (x1 - x0), F.u[2] * (y1 - y0) - F.v[2] * (x1 - x0)];
    const len = Math.hypot(...nrm) || 1;
    const u = nrm.map((c) => c / len);
    if (dot(u, M.V) > 1e-6) shades[band(dot(u, M.LIGHT))].push(pathOf([lo[j], lo[(j + 1) % n], hi[(j + 1) % n], hi[j]], true));
  }
  for (const [pts, a] of [[lo, F.a.map((c) => -c)], [hi, F.a]]) if (dot(a, M.V) > 1e-6) shades[band(dot(a, M.LIGHT))].push(pathOf(pts, true));
  const all = [...lo, ...hi];
  const hull = hullOf(all);
  const fill = pathOf(hull, true);
  return '<g class="iso-solid"' + extra + '><path class="iso-fill" d="' + fill + '"/>' + shades.slice(0, 4).map((d, i) => d.length ? '<path class="iso-shade" data-shade="' + i + '" d="' + d.join("") + '"/>' : "").join("") + (shades[4].length ? '<path class="iso-top" d="' + shades[4].join("") + '"/>' : "") + '<path class="iso-line iso-edge" data-tone="' + tone + '" d="' + fill + '"/></g>';
}
function hullOf(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function helix(cx, z0, z1, r, turns) {
  const back = [], front = [];
  let run = [], near = null;
  const count = Math.round(turns * 14);
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * turns * Math.PI * 2;
    const facing = Math.cos(a) * M.V[0] + Math.sin(a) * M.V[1] > 0;
    const flat = at([cx + r * Math.cos(a), r * Math.sin(a), z0 + (z1 - z0) * i / count]);
    if (near === null) near = facing;
    if (facing !== near) { run.push(flat); (near ? front : back).push(pathOf(run)); run = [flat]; near = facing; continue; }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return '<path class="iso-line" data-tone="lo" d="' + back.join("") + '"/><path class="iso-line" data-tone="hi" d="' + front.join("") + '"/>';
}
const SPRING = ${JSON.stringify({ x: OUTLET.x, z0: PRESS_Z + 1, z1: OUTLET_BALL - BALL + 0.2 })};
const pinOf = (t) => [M.PIVOT[0] + M.ARM * Math.cos(t), M.PIVOT[1] + M.ARM * Math.sin(t)];
function leverSvg(theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const F = { o: [M.PIVOT[0], 0, M.PIVOT[1]], a: [c, 0, s], u: [0, 1, 0], v: [-s, 0, c] };
  const sq = (h) => [[-h, -h], [h, -h], [h, h], [-h, h]];
  const oct = (r) => Array.from({ length: 12 }, (_, i) => [r * Math.cos(i * Math.PI / 6), r * Math.sin(i * Math.PI / 6)]);
  const [lx, lz] = pinOf(theta);
  const zp = lz - Math.sqrt(M.LINK * M.LINK - (M.X_P - lx) ** 2);
  const out = [];
  // Biela trasera, palanca, perno, biela delantera.
  const lk = (y0) => prism({ o: [0, y0, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }, linkPoly(lx, lz, zp), 0, 1.2, "mid", ' data-mat="steel"');
  out.push(lk(-4.6));
  out.push(prism({ ...F, o: [M.PIVOT[0], -4.6, M.PIVOT[1]], a: [0, 1, 0], u: [c, 0, s], v: [-s, 0, c] }, oct(5), 0, 9.2, "mid", ' data-mat="steel"'));
  out.push(prism(F, sq(3.4), -5, 46, "hi", ' data-mat="copper"'));
  out.push(prism(F, oct(2.8), 46, M.HANDLE - 26, "hi", ' data-mat="chrome"'));
  out.push(prism(F, oct(4.2), M.HANDLE - 26, M.HANDLE, "mid", ' data-mat="rubber"'));
  // Moleteado del puño: anillos sobre las caras visibles, de silueta a silueta.
  const grip = oct(4.2);
  const seen = grip.map((p, j) => {
    const [x0, y0] = p, [x1, y1] = grip[(j + 1) % 12];
    const nrm = [F.u[0] * (y1 - y0) - F.v[0] * (x1 - x0), F.u[1] * (y1 - y0) - F.v[1] * (x1 - x0), F.u[2] * (y1 - y0) - F.v[2] * (x1 - x0)];
    return dot(nrm, M.V) > 1e-6;
  });
  let first = seen.findIndex((v, j) => v && !seen[(j + 11) % 12]);
  if (first < 0) first = 0;
  const run = [];
  for (let j = first; seen[j % 12] && run.length < 12; j++) run.push(j % 12);
  run.push((run[run.length - 1] + 1) % 12);
  const rings = [];
  for (let sAlong = M.HANDLE - 24; sAlong <= M.HANDLE - 2; sAlong += 2) {
    rings.push(pathOf(run.map((j) => { const [x, y] = grip[j]; return at([F.o[0] + F.a[0] * sAlong + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * sAlong + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * sAlong + F.u[2] * x + F.v[2] * y]); })));
  }
  out.push('<path class="iso-line" data-tone="lo" d="' + rings.join("") + '"/>');
  out.push(lk(3.4));
  out.push('<g class="iso-dots" data-tone="hi"><circle cx="' + at([lx, 4.6, lz])[0].toFixed(1) + '" cy="' + at([lx, 4.6, lz])[1].toFixed(1) + '" r="0.6"/><circle cx="' + at([M.X_P, 4.6, zp])[0].toFixed(1) + '" cy="' + at([M.X_P, 4.6, zp])[1].toFixed(1) + '" r="0.6"/></g>');
  return { svg: out.join(""), zp };
}
function linkPoly(lx, lz, zp) {
  const dx = M.X_P - lx, dz = zp - lz, len = Math.hypot(dx, dz);
  const ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
  const w = 2.4;
  return [[lx - ux * 1 + nx * w, lz - uz * 1 + nz * w], [lx - ux * 1 - nx * w, lz - uz * 1 - nz * w], [M.X_P + ux * 1 - nx * w, zp + uz * 1 - nz * w], [M.X_P + ux * 1 + nx * w, zp + uz * 1 + nz * w]];
}

// Estado del modelo: q = posición del émbolo (1 arriba, 0 abajo), x = empuje acumulado (cm).
const S = { q: 1, x: 0, rel: 0, inLift: 0, outLift: 0, reliefLift: 0, flow: { succion: 0, presion: 0, descarga: 0, alivio: 0 }, glow: { succion: 0, presion: 0, descarga: 0, alivio: 0 }, bar: 0, turn: 0 };
const queue = [];
let action = null, clock = 0, touring = !still.matches, idle = 0, frame = 0, last = 0, visible = false, mode = "corte";
const DOWN = 0.32, UP = 0.36, RELEASE_SPEED = 0.9; // s por medio bombeo; cm/s al soltar
// Recorrido de muestra: bombea hasta el tope (y un bombeo de más que abre el alivio), espera y suelta.
const tour = () => { for (let i = 0; i < M.STROKES + 1; i++) queue.push("bombear"); queue.push("pausa", "soltar", "pausa"); };
function nextAction() {
  if (!queue.length) { if (touring) tour(); else return null; }
  const kind = queue.shift();
  return { kind, t: 0 };
}
function step(dt) {
  if (!action) action = nextAction();
  const y = S.x / M.RA;
  let dq = 0;
  if (action) {
    action.t += dt;
    if (action.kind === "bombear") {
      const t = action.t;
      const q = t < DOWN ? 1 - ease(t / DOWN) : t < DOWN + UP ? ease((t - DOWN) / UP) : 1;
      dq = q - S.q;
      S.q = q;
      if (t >= DOWN + UP) action = null;
    } else if (action.kind === "soltar") {
      S.rel = clamp(S.rel + dt / 0.5, 0, 1);
      if (S.x <= 0) { S.rel = clamp(S.rel - dt / 0.3, 0, 1); if (S.rel === 0) action = null; }
    } else if (action.kind === "pausa") {
      if (action.t > 1.6) action = null;
    }
  }
  if (!action || action.kind !== "soltar") S.rel = clamp(S.rel - dt / 0.3, 0, 1);
  // Bajar el émbolo empuja aceite: al pistón (si aún no llega al tope) o por el alivio.
  const push = Math.max(0, -dq) * M.STROKE_CM;
  const full = S.x >= M.X_MAX - 1e-6;
  const inc = full ? 0 : Math.min(push, M.X_MAX - S.x);
  S.x += inc;
  const vented = push - inc;
  const suck = Math.max(0, dq) * M.STROKE_CM;
  const drain = S.rel > 0 && S.x > 0 ? Math.min(S.x, S.rel * RELEASE_SPEED * M.RA * dt) : 0;
  S.x -= drain;
  S.flow.presion += inc * 4; S.flow.succion += suck * 4; S.flow.descarga += drain * 1.2; S.flow.alivio += vented * 4;
  const k = 1 - Math.exp(-dt / 0.08);
  const kSlow = 1 - Math.exp(-dt / 0.25);
  const rate = (v) => clamp(v / dt / 6, 0, 1);
  S.inLift += ((suck > 0 ? 1 : 0) - S.inLift) * k;
  S.outLift += ((inc > 0 ? 1 : 0) - S.outLift) * k;
  S.reliefLift += ((vented > 0 ? 1 : 0) - S.reliefLift) * k;
  S.glow.succion += (rate(suck) - S.glow.succion) * kSlow;
  S.glow.presion += (rate(inc) - S.glow.presion) * kSlow;
  S.glow.descarga += ((drain > 0 ? 1 : 0) - S.glow.descarga) * kSlow;
  S.glow.alivio += (rate(vented) - S.glow.alivio) * kSlow;
  // Presión: la carga la sostiene mientras el pistón no toque fondo; al alivio sube a su ajuste.
  const target = vented > 0 ? M.RELIEF_BAR : S.x > 0.05 ? pressure() : 0;
  S.bar += (target - S.bar) * (1 - Math.exp(-dt / 0.18));
}
let drawnKey = "";
function draw() {
  const y = S.x / M.RA;
  const dy = y * M.CM;
  if (window.__ph3d) window.__ph3d.frame(S, y);
  const key = mode + force.f + [S.q, S.x, S.rel, S.inLift, S.outLift, S.reliefLift, S.bar].map((v) => v.toFixed(3)).join() + Object.values(S.glow).map((v) => v.toFixed(2)).join() + Object.values(S.flow).map((v) => v.toFixed(1)).join();
  if (key === drawnKey) return;
  drawnKey = key;
  const text = "x = " + S.x.toFixed(0) + " cm · sube " + y.toFixed(2) + " cm · " + S.bar.toFixed(1) + " bar";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", S.x.toFixed(0));
  stage.setAttribute("aria-valuetext", text + ", F2 " + fmtN(force.f * M.RA) + " N");
  // En modo 3D el corte está oculto: no se redibuja.
  if (mode === "3d") return;
  parts.ram.setAttribute("transform", translateAlong(P, [0, 0, dy]));
  parts["ram-back"].innerHTML = halfCyl(M.X_R, M.RB, M.CAP_TOP, M.RAM_TOP + dy, { tone: "hi", crease: "lo" });
  const theta = M.THETA_DOWN + (M.THETA_UP - M.THETA_DOWN) * S.q;
  const lev = leverSvg(theta);
  parts.lever.innerHTML = lev.svg;
  parts.fuerza.innerHTML = forceSvg(theta);
  const dz = lev.zp - M.PIN_UP;
  parts.plunger.setAttribute("transform", translateAlong(P, [0, 0, dz]));
  parts.eye.setAttribute("transform", translateAlong(P, [0, 0, dz]));
  parts["plunger-back"].innerHTML = halfCyl(M.X_P, M.RP, M.GLAND_TOP, M.PIN_UP - 3 + dz, { tone: "hi", crease: "lo" });
  parts["ball-in"].setAttribute("transform", translateAlong(P, [0, 0, 2.4 * S.inLift]));
  parts["ball-out"].setAttribute("transform", translateAlong(P, [0, 0, -2.4 * S.outLift]));
  parts["ball-relief"].setAttribute("transform", translateAlong(P, [0, 0, 2.2 * S.reliefLift]));
  parts["spring-out"].innerHTML = helix(SPRING.x, SPRING.z0, SPRING.z1 - 2.4 * S.outLift, 2.2, 5);
  parts.needle.setAttribute("transform", translateAlong(P, [-M.NEEDLE_OPEN * ease(S.rel), 0, 0]));
  const level = M.OIL_Z0 - (dy * M.RB * M.RB) / M.RES_AREA;
  parts["res-l"].setAttribute("d", secRect(M.X_R - M.BOTTLE_RIN, M.BASE_H, M.X_R - M.RCYL_R, level));
  parts["res-r"].setAttribute("d", secRect(M.X_R + M.RCYL_R, M.BASE_H, M.X_R + M.BOTTLE_RIN, level));
  levels.l.setAttribute("d", pathOf([sec(M.X_R - M.BOTTLE_RIN, level), sec(M.X_R - M.RCYL_R, level)]));
  levels.r.setAttribute("d", pathOf([sec(M.X_R + M.RCYL_R, level), sec(M.X_R + M.BOTTLE_RIN, level)]));
  for (const [name, el] of Object.entries(flows)) {
    el.style.opacity = (0.95 * S.glow[name]).toFixed(2);
    el.style.strokeDashoffset = (-S.flow[name]).toFixed(2);
  }
  const a = dialAngle(S.bar);
  const g = M.GAUGE;
  const gp = (r, ang) => at([g.x + r * Math.cos(ang), 3.1, g.z + r * Math.sin(ang)]);
  parts["gauge-needle"].setAttribute("d", pathOf([gp(2, a + Math.PI), gp(g.r - 2.6, a)]));
}
// Flecha de F₁ sobre el puño: su largo crece con la fuerza; se arrastra hacia arriba o abajo.
function forceSvg(theta) {
  const s = M.HANDLE - 13;
  const gx = M.PIVOT[0] + s * Math.cos(theta), gz = M.PIVOT[1] + s * Math.sin(theta);
  const len = 10 + 30 * (force.f - FZ.min) / (FZ.max - FZ.min);
  const tip = at([gx, 0, gz + 6]), tail = at([gx, 0, gz + 6 + len]);
  const head = [[tip[0] - 2.4, tip[1] - 3.4], tip, [tip[0] + 2.4, tip[1] - 3.4]];
  const mid = at([gx, 0, gz + 6 + len / 2]);
  return '<circle class="ph-agarre" cx="' + mid[0].toFixed(1) + '" cy="' + mid[1].toFixed(1) + '" r="' + (len * 0.6 + 16).toFixed(1) + '"/>' +
    '<path class="iso-line" data-tone="lit" style="stroke-width:1.2" d="' + pathOf([tail, tip]) + pathOf(head) + '"/>' +
    '<g class="iso-dots" data-tone="lit"><circle cx="' + tail[0].toFixed(1) + '" cy="' + tail[1].toFixed(1) + '" r="2.4"/></g>';
}
// Capa WebGL del aceite: se crea la primera vez que la lámina está a la vista; sin WebGL queda el SVG.
const glCanvas = stage.querySelector(".ph-gl");
let layer = null, glTried = false, glOff = false, glClock = 0;
function glInit() {
  if (glTried) return;
  glTried = true;
  layer = glLayer({
    canvas: glCanvas, fragment: GL_FRAGMENT, view: [FZ.W, FZ.H], camera: GLD.camera,
    uniforms: ["uSegS", "uBallZ", "uLive", "uLight"],
    fixed: { uLow: GLD.low.flat(), uHigh: GLD.high.flat(), uOcc: GLD.occ.flat(), uSeg: GLD.segs.flat(), uRes: GLD.res, uRam: GLD.ram, uPump: GLD.pump, uBallX: GLD.balls.x, uBallR: GLD.balls.r },
  });
  if (layer) stage.setAttribute("data-gl", "");
}
function glFrame(dt) {
  if (!layer) return;
  if (glOff || mode !== "corte") { layer.clear(); return; }
  glClock += still.matches ? 0 : dt;
  const dy = S.x / M.RA * M.CM;
  const theta = M.THETA_DOWN + (M.THETA_UP - M.THETA_DOWN) * S.q;
  const [lx, lz] = pinOf(theta);
  const zp = lz - Math.sqrt(M.LINK * M.LINK - (M.X_P - lx) ** 2);
  const segS = GLD.segS.flatMap(([s0, s1], i) => [s0, s1, -S.flow[GLD.segName[i]], S.glow[GLD.segName[i]]]);
  layer.draw({
    uSegS: segS,
    uBallZ: [GLD.balls.z[0] + 2.4 * S.inLift, GLD.balls.z[1] - 2.4 * S.outLift, GLD.balls.z[2] + 2.2 * S.reliefLift],
    uLive: [FZ.RAM_BOTTOM + dy, M.OIL_Z0 - (dy * M.RB * M.RB) / M.RES_AREA, zp - FZ.PL_LEN, clamp(S.bar / 4, 0, 1)],
    uLight: document.body.dataset.theme === "light" ? 1 : 0,
  }, 4 + glClock);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  step(dt);
  draw();
  glInit();
  glFrame(dt);
  const glLive = layer && !glOff && mode === "corte" && !still.matches;
  const busy = glLive || action || queue.length || touring || S.rel > 0 || Object.values(S.glow).some((v) => v > 0.01) || Math.abs(S.bar - (S.x > 0.05 ? pressure() : 0)) > 0.01 || (window.__ph3d && window.__ph3d.busy());
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => {
  if (touring) { touring = false; queue.length = 0; }
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; run(); }, 8000);
};
const pump = () => { hold(); if (queue.filter((q) => q === "bombear").length < 3) queue.push("bombear"); run(); };
const release = () => { hold(); queue.length = 0; if (action && action.kind === "bombear") queue.push("soltar"); else action = { kind: "soltar", t: 0 }; run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(root);
if (still.matches) { S.x = 24; S.bar = pressure(); }
stage.addEventListener("click", (event) => { if (!event.target.closest(".ph-fuerza")) pump(); });
// F₁: flecha arrastrable en la palanca y deslizador del panel; el panel muestra F₂ = F₁ × razón de áreas.
const slider = document.querySelector("[data-fuerza]");
const panelOut = { f2: document.querySelector("[data-f2]"), f1: document.querySelector("[data-f1]"), p: document.querySelector("[data-p]") };
function setForce(value) {
  const f = clamp(Math.round(value / FZ.paso) * FZ.paso, FZ.min, FZ.max);
  if (f === force.f) return;
  force.f = f;
  slider.value = f;
  const f2 = fmtN(f * M.RA) + " N";
  panelOut.f2.textContent = fmtN(f * M.RA);
  panelOut.f1.textContent = fmtN(f) + " N";
  panelOut.p.textContent = fmtN(pressure(), 1);
  slider.setAttribute("aria-valuetext", fmtN(f) + " N; F2 = " + f2);
  if (still.matches && S.x > 0.05) S.bar = pressure();
  drawnKey = "";
  if (!frame) draw();
  run();
}
slider.addEventListener("input", () => { hold(); setForce(+slider.value); });
// Todo el rango (10–100 N) en 120 px de arrastre, sea cual sea el tamaño de la lámina: cómodo con el dedo.
const DRAG_PX = 120;
let fDrag = null;
parts.fuerza.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  event.preventDefault();
  hold();
  fDrag = { y: event.clientY, f: force.f };
  parts.fuerza.setPointerCapture(event.pointerId);
});
parts.fuerza.addEventListener("pointermove", (event) => {
  if (!fDrag) return;
  setForce(fDrag.f - (event.clientY - fDrag.y) * (FZ.max - FZ.min) / DRAG_PX);
});
const endDrag = () => { fDrag = null; };
parts.fuerza.addEventListener("pointerup", endDrag);
parts.fuerza.addEventListener("pointercancel", endDrag);
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === " " || event.key === "Enter") { event.preventDefault(); pump(); }
  if (event.key === "ArrowUp" || event.key === "r" || event.key === "R") { event.preventDefault(); release(); }
});
document.querySelector('[data-accion="bombear"]').addEventListener("click", pump);
document.querySelector('[data-accion="soltar"]').addEventListener("click", release);
// Selector de modo: el 3D se descarga sólo la primera vez que se pide.
const buttons = [...document.querySelectorAll("[data-modo]")];
let loading = null;
async function setMode(next) {
  mode = next;
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modo === next)));
  const turnStage = root.querySelector(".iso-turn");
  if (next === "3d") {
    if (!loading) {
      root.querySelector(".ph-cargando").hidden = false;
      loading = import("./3d.js").then((m) => m.start(root, { still: still.matches, hold })).finally(() => { root.querySelector(".ph-cargando").hidden = true; });
    }
    await loading;
    stage.hidden = true;
    root.querySelector(".iso-turn").hidden = false;
    window.__ph3d.show(true);
  } else {
    stage.hidden = false;
    if (turnStage) turnStage.hidden = true;
    if (window.__ph3d) window.__ph3d.show(false);
  }
  drawnKey = "";
  draw();
  run();
}
buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.modo)));
// Selector de paleta: sólo cambia los materiales del dibujo (corte y 3D); el resto sigue en fusión.
const paletas = [...document.querySelectorAll("button[data-paleta]")];
paletas.forEach((b) => b.addEventListener("click", () => {
  document.body.dataset.paleta = b.dataset.paleta;
  paletas.forEach((p) => p.setAttribute("aria-pressed", String(p === b)));
}));
if (location.hash === "#3d") setMode("3d");
draw();
`;

const LIVE3D = `
const DATA = ${JSON.stringify(out3.data)};
const STAGE = ${JSON.stringify(`<div class="iso-stage iso-turn" tabindex="0" role="img" aria-label="Gato hidráulico en 3D: arrastra para girarlo" hidden>${stage3}</div>`)};
const CSS = ${JSON.stringify(out3.css)};
const follow = ${follow3.toString().replace("function anonymous(v\n)", "function (v)")};
export function start(root, { still, hold }) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  root.querySelector(".ph-cargando").insertAdjacentHTML("beforebegin", STAGE);
  const stage = root.querySelector(".iso-turn");
  let angle = 0, spin = still ? 0 : 14, shown = false, drag = null, lastQ = -1, lastY = -1, lastA = -1;
  // Una herramienta que toma el control (__isoTurn) detiene el giro y el bombeo propios.
  const controller = TURN.mount(stage, DATA, { follow, onHold: () => { spin = 0; hold(); } });
  stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, a: angle }; stage.setPointerCapture(e.pointerId); spin = 0; hold(); });
  stage.addEventListener("pointermove", (e) => { if (drag) angle = drag.a + (e.clientX - drag.x) * 0.6; });
  const up = () => { if (drag) { drag = null; setTimeout(() => { if (!drag && !still) spin = 14; }, 4000); } };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") angle -= 10; if (e.key === "ArrowRight") angle += 10; });
  let t0 = 0, cost = 0, half = false, skip = false;
  window.__ph3d = {
    show(on) { shown = on; t0 = 0; },
    busy: () => shown && (spin !== 0 || drag !== null),
    frame(S, y) {
      if (!shown) return;
      const now = performance.now();
      const dt = t0 ? Math.min((now - t0) / 1000, 0.05) : 0;
      t0 = now;
      angle += spin * dt;
      if (Math.abs(S.q - lastQ) < 1e-4 && Math.abs(y - lastY) < 1e-4 && Math.abs(angle - lastA) < 1e-3) return;
      // Media tasa adaptable: si un cuadro cuesta más de 14 ms, el 3D se pinta uno sí y uno no.
      skip = half && !skip;
      if (skip) return;
      lastQ = S.q; lastY = y; lastA = angle;
      const t = performance.now();
      controller.set({ gato: angle, q: S.q, y });
      cost += (performance.now() - t - cost) * 0.1;
      half = cost > 14 ? true : cost < 9 ? false : half;
    },
  };
  return controller;
}
`;

const plate = k.plateHtml({
  fig: "Lám. II",
  title: "Gato hidráulico",
  hint: "Toca para bombear · ↑ suelta",
  readout: `x = 0 cm · sube 0.00 cm · 0.0 bar`,
  keys: [
    { mark: "lit", label: `Aguja de subida: ${fmt(Y_MAX, 0)} cm con ${X_MAX} cm de empuje` },
    { mark: "raised", label: `Émbolo de Ø ${d1} cm · pistón de Ø ${d2} cm` },
  ],
  caption: `Cada bombeo baja el émbolo ${STROKE_CM} cm y empuja aceite por la válvula de salida hacia el pistón grande; al subir, la válvula de entrada deja pasar aceite del depósito. El área grande es ${RA} veces la chica (${d2 / d1}² = ${RA}): con ${F1} N en el émbolo, el aceite a ${fmt(PRESSURE_BAR, 1)} bar sostiene ${fmt(F2)} N, pero el pistón sube ${RA} veces menos, ${fmt(Y_MAX, 0)} cm tras ${X_MAX} cm de empuje (${STROKES} bombeos). Si se sigue bombeando en el tope, abre la válvula de alivio; la aguja de descarga regresa el aceite al depósito.`,
  body: `${HATCH}<div class="ph-barra"><div class="ph-modos" role="group" aria-label="Vista"><button type="button" data-modo="corte" aria-pressed="true">Corte</button><button type="button" data-modo="3d" aria-pressed="false">3D</button></div><div class="ph-modos" role="group" aria-label="Paleta"><button type="button" data-paleta="papel" aria-pressed="true">Papel</button><button type="button" data-paleta="metal" aria-pressed="false">Metal</button></div></div><div class="ph-cuerpo"><div class="ph-escena"><div class="iso-stage" tabindex="0" role="slider" aria-label="Gato hidráulico en corte: toca o usa flecha abajo para bombear, flecha arriba para soltar" aria-valuemin="0" aria-valuemax="${X_MAX}" aria-valuenow="0">${svgCut}<canvas class="ph-gl" aria-hidden="true"></canvas></div><p class="ph-cargando" hidden>Cargando 3D…</p></div>${panelHtml()}</div><div class="ph-acciones"><button type="button" data-accion="bombear">Bombear</button><button type="button" data-accion="soltar">Soltar</button></div>`,
});
const THEME = `document.body.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";\n`;
// Paleta Metal: las reglas de materiales del 3D (gris oscuro + cobre) pasan a la página y sólo valen
// con data-paleta="metal"; así abrir el 3D ya no cambia la paleta del corte (Papel = fusión).
function splitMetal(source) {
  const lines = source.split("\n");
  const i = lines.findIndex((l) => l.startsWith("const CSS = "));
  const rules = JSON.parse(lines[i].slice("const CSS = ".length).replace(/;\s*$/, "")).split("\n");
  const isMat = (r) => /^(\.iso\[data-theme="(light|dark)"\] )?\[data-mat="[a-z]+"\]\{/.test(r);
  const mat = rules.filter(isMat);
  if (mat.length !== 21) throw new Error(`esperaba 21 reglas de materiales en el 3D, hay ${mat.length}`);
  lines[i] = "const CSS = " + JSON.stringify(rules.filter((r) => !isMat(r)).join("\n")) + ";";
  const scoped = mat.map((r) => (r.startsWith(".iso[") ? r.replace(/^\.iso\[/, '.iso[data-paleta="metal"][') : '.iso[data-paleta="metal"] ' + r));
  return { turn3: lines.join("\n"), metal: "/* Paleta Metal: materiales de la skill (gris oscuro + cobre). Papel hereda la fusión. */\n" + scoped.join("\n") + "\n" };
}
const { turn3, metal: METAL_CSS } = splitMetal(`${turnScript()}\n${LIVE3D}`);
const STYLE = FUSION.replace(".corte{fill:var(--corte)}\n", METAL_CSS +".corte{fill:var(--corte)}\n");
const html = k
  .pageHtml({ title: "Gato hidráulico · Códice Vivo", theme: "light", body: `<style>${STYLE}</style>${plate}`, script: THEME + kitScript() + glScript() + LIVE, width: 640 })
  .replace('<html lang="en">', '<html lang="es-MX">')
  .replace('<body class="iso" data-theme="light">', '<body class="iso" data-theme="light" data-paleta="papel">');
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "index.html"), html);
writeFileSync(join(OUT_DIR, "3d.js"), turn3);
console.log(`index.html ${(html.length / 1024).toFixed(0)} KB · 3d.js ${(turn3.length / 1024).toFixed(0)} KB · 3D: ${out3.report.parts} piezas · ${out3.report.layers.map((l) => `${l.name}: ${l.planar} planos, ${l.dynamic} dinámicos`).join(" · ")} · ${out3.report.seconds.toFixed(1)} s`);
