// Figura: prensa hidráulica (contenido/fisica/prensa-hidraulica.md, sección 2).
// Genera contenido/fisica/img/prensa-hidraulica.svg (tema claro, estático).
// Uso: node plantilla/figuras/prensa-hidraulica.mjs [--preview ruta.html]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../.claude/skills/anatomy/kit/tube.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../contenido/fisica/img/prensa-hidraulica.svg");

const WIDTH = 600;
const HEIGHT = 460;

// Mundo: 1 unidad ≈ 1 px. Diámetros a escala real: 2 cm y 10 cm (razón 5).
const PLATE = { x: -156, y: -64, w: 256, d: 128, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const SMALL = { x: -122, y: 0, rIn: 8, rOut: 10, collarR: 16, collarH: 20, top: 116, pistonZ: 84, pistonH: 8, rodR: 2.4, padZ: 126 };
const BIG = { x: 30, y: 0, rIn: 40, rOut: 43, collarR: 52, collarH: 16, top: 74, pistonZ: 42, pistonH: 12, rodR: 9, platenZ: 84 };

const PIPE_R = 3;
const PIPE_Z = 9;

const SMALL_ARROW = { len: 34, shaft: 1.7, head: 4.6, headLen: 10 };
const BIG_ARROW = { len: 66, shaft: 4.2, head: 11, headLen: 20 };
const PLATEN = { r: 30, h: 6 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [SMALL.x, SMALL.y, SMALL.padZ + 4 + SMALL_ARROW.len],
    [BIG.x, BIG.y, BIG.platenZ + PLATEN.h + BIG_ARROW.len],
  ],
  WIDTH,
  HEIGHT,
  { pad: 44, azimuth: 55 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const V = G.viewOf(P);
const [vx, vy] = k.towardViewer(P);
const FACING = Math.atan2(vy, vx);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const UP = (x, y, z) => G.frameAlong([x, y, z], [0, 0, 1]);

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

// Base: placa sobre cuatro patas, ranura, tornillos y regla.
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
function glassFront(c) {
  const out = [];
  const edge = (angle, r) => [c.x + r * Math.cos(angle), c.y + r * Math.sin(angle)];
  const left = edge(FACING - Math.PI / 2, c.rOut);
  const right = edge(FACING + Math.PI / 2, c.rOut);
  out.push(L(k.rise(left, c.collarH, c.top, P) + k.rise(right, c.collarH, c.top, P), { tone: "mid" }));
  const shine = edge(FACING - 0.55, c.rOut);
  const shine2 = edge(FACING - 0.32, c.rOut);
  out.push(`<path class="iso-line brillo" d="${k.rise(shine, c.collarH, c.top, P)}"/>`);
  out.push(`<path class="iso-line brillo fino" d="${k.rise(shine2, c.collarH, c.top, P)}"/>`);
  out.push(L(frontArc(c.x, c.y, c.rIn, c.top), { tone: "lo" }));
  out.push(L(frontArc(c.x, c.y, c.rOut, c.top), { tone: "mid" }));
  out.push(L(frontArc(c.x, c.y, c.rOut, c.collarH), { tone: "lo" }));
  return out.join("");
}

// Columna de aceite y pistón con dos anillos de sello.
function oilAndPiston(c) {
  const out = [];
  out.push(`<g class="aceite">${S(k.cylinder(c.x, c.y, c.rIn, c.collarH, c.pistonZ - c.collarH, P, 72), { tone: "lo", crease: "none" })}</g>`);
  const seals = [c.pistonZ + c.pistonH * 0.3, c.pistonZ + c.pistonH * 0.7].map((z) => k.sideArc(c.x, c.y, c.rIn, z, P, 48)).join("");
  out.push(S(k.cylinder(c.x, c.y, c.rIn, c.pistonZ, c.pistonH, P, 72, 0.6), { tone: "hi", crease: "lo", inner: L(seals, { tone: "lo" }) }));
  return out.join("");
}

// Flecha sólida: vástago y punta cónica. `from` es la cola; `dir` +1 sube, −1 baja.
function arrow(x, y, from, dir, a) {
  const neck = from + dir * (a.len - a.headLen);
  const shaft = S(k.cylinder(x, y, a.shaft, Math.min(from, neck), Math.abs(neck - from), P, 40), { tone: "hi", crease: "lo", lit: true });
  const head = S(G.solidOf([[0, a.head], [a.headLen, 0]], G.frameAlong([x, y, neck], [0, 0, dir]), P), { tone: "hi", crease: "lo", lit: true });
  return dir > 0 ? shaft + head : head + shaft;
}

function smallTop(c) {
  const out = [];
  const rodTop = c.padZ;
  out.push(S(k.cylinder(c.x, c.y, c.rodR, c.pistonZ + c.pistonH, rodTop - c.pistonZ - c.pistonH, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(c.x, c.y, 3.6, rodTop - 1.6, 1.6, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(c.x, c.y, 6.5, rodTop, 4, P, 40, 0.5), { tone: "mid" }));
  out.push(L(k.knurl(c.x, c.y, 6.5, rodTop, rodTop + 4, 32, P), { tone: "lo" }));
  return out.join("");
}

function bigTop(c) {
  const out = [];
  out.push(S(k.cylinder(c.x, c.y, c.rodR, c.pistonZ + c.pistonH, c.platenZ - c.pistonZ - c.pistonH, P, 48), { tone: "mid", crease: "none", inner: L(k.sideArc(c.x, c.y, c.rodR, c.top + 3, P, 24), { tone: "faint" }) }));
  out.push(S(k.cylinder(c.x, c.y, c.rodR + 3, c.platenZ - 2, 2, P, 48), { tone: "mid" }));
  out.push(`<path class="iso-halo" d="${k.cylinder(c.x, c.y, PLATEN.r - 6, c.top + 2, 0.1, P, 48).fill}" style="filter:blur(5px);opacity:.18"/>`);
  out.push(S(k.cylinder(c.x, c.y, PLATEN.r, c.platenZ, PLATEN.h, P, 96, 1), { tone: "mid", inner: L(k.sideArc(c.x, c.y, PLATEN.r, c.platenZ + 2, P, 64), { tone: "faint" }) }));
  const topZ = c.platenZ + PLATEN.h;
  out.push(L(k.ring(c.x, c.y, PLATEN.r - 4, topZ, P, 96), { tone: "lo" }));
  out.push(L(k.ring(c.x, c.y, BIG_ARROW.shaft + 3, topZ, P, 40), { tone: "lo" }));
  out.push(D(ringDots(c.x, c.y, PLATEN.r - 8, topZ, 6, Math.PI / 6), { size: 0.5 }));
  return out.join("");
}

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
    const out = [];
    out.push(S(G.lathe([[-8, 0], [-8, 4.4], [-6.6, 4.4], [-5.6, 5.6, 1], [0, 7.2, 1], [5.6, 5.6, 1], [6.6, 4.4], [8, 4.4], [8, 0]], F, P), { tone: "mid", crease: "lo" }));
    const neckF = UP(startX + mid, 0, PIPE_Z + 6);
    out.push(S(G.disc(0, 6, 2.2, neckF, P), { tone: "mid" }));
    out.push(S(G.disc(6, 7.4, 3.2, neckF, P), { tone: "mid" }));
    const wheelZ = PIPE_Z + 6 + 7.4;
    out.push(S(k.cylinder(startX + mid, 0, 7, wheelZ, 2.6, P, 48, 0.4), { tone: "mid" }));
    out.push(L(k.knurl(startX + mid, 0, 7, wheelZ, wheelZ + 2.6, 40, P, 0.3), { tone: "lo" }));
    out.push(L(k.ring(startX + mid, 0, 1.8, wheelZ + 2.6, P, 16), { tone: "lo" }));
    out.push(D([at([startX + mid, 0, wheelZ + 2.6])], { size: 0.55, tone: "hi" }));
    return out.join("");
  };
  // De izquierda a derecha también es de atrás hacia adelante.
  const pipeSvg = pieces.map((piece) => ({ at: piece.mid[0], svg: `<g class="aceite-tubo">${tubeSvg(piece, { tone: "mid" })}</g>` }));
  const parts = [...pipeSvg, ...nuts.map((nut) => ({ at: startX + (nut[0] + nut[1]) / 2, svg: nutSvg(nut) })), { at: startX + mid, svg: valveSvg() }];
  parts.sort((a, b) => a.at - b.at);
  return out.join("") + parts.map((part) => part.svg).join("");
}

const STYLE = `<style>
.aceite .iso-fill{fill:#d9e4ea}
.aceite .iso-shade[data-shade="0"]{fill:#bccdd8}
.aceite .iso-shade[data-shade="1"]{fill:#c6d6df}
.aceite .iso-shade[data-shade="2"]{fill:#d0dee6}
.aceite .iso-shade[data-shade="3"]{fill:#d9e5ec}
.aceite .iso-top{fill:#e4edf2}
.aceite .iso-edge{stroke:#9fb3c0}
.aceite-tubo .tb-body{fill:#cbdae3}
.aceite-tubo .tb-shine{fill:#e6eef3}
.aceite-tubo .tb-shade{fill:#b4c7d3}
.vidrio{fill:#eef3f5;opacity:.7}
.brillo{stroke:#ffffff;stroke-width:1.6;opacity:.85}
.brillo.fino{stroke-width:.7;opacity:.7}
.tarjeta{fill:var(--anatomy-card);stroke:var(--anatomy-mid);stroke-width:.8}
.esquina{font-family:var(--anatomy-mono);font-size:13px;fill:var(--anatomy-muted);letter-spacing:.04em}
.esquina.fig,.esquina.lectura{fill:var(--anatomy-text)}
.esquina.titulo,.esquina.pista{letter-spacing:.1em}
</style>`;

const corners = [
  `<rect class="tarjeta" x="0.4" y="0.4" width="${WIDTH - 0.8}" height="${HEIGHT - 0.8}"/>`,
  `<text class="esquina fig" x="22" y="32">Fig 1</text>`,
  `<text class="esquina titulo" x="${WIDTH - 22}" y="32" text-anchor="end">PRENSA HIDRÁULICA</text>`,
  `<text class="esquina pista" x="22" y="${HEIGHT - 22}">Ø 2 cm · Ø 10 cm</text>`,
  `<text class="esquina lectura" x="${WIDTH - 22}" y="${HEIGHT - 22}" text-anchor="end">F₁/A₁ = F₂/A₂</text>`,
];

// Etiqueta a la derecha de una flecha, a media altura de su vástago, con el estilo de las esquinas.
function forceLabel(text, x, y, z0, z1, a) {
  const [sx, sy] = at([x, y, (z0 + z1) / 2]);
  return `<text class="esquina lectura" x="${(sx + a.head * G.scaleOf(P) + 6).toFixed(1)}" y="${(sy + 4.5).toFixed(1)}">${text}</text>`;
}
const SMALL_TAIL = SMALL.padZ + 4 + SMALL_ARROW.len;
const BIG_TAIL = BIG.platenZ + PLATEN.h;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  standalone: "light",
  label:
    "Prensa hidráulica sobre una base: dos cilindros de vidrio llenos de aceite, uno de 2 cm y otro de 10 cm de diámetro, unidos por un tubo con válvula. Una flecha chica empuja hacia abajo el pistón pequeño y una flecha grande sale hacia arriba del pistón grande: el aceite transmite la misma presión a ambos.",
  body: [
    STYLE,
    ...corners,
    base(),
    collar(SMALL),
    glassBack(SMALL),
    oilAndPiston(SMALL),
    smallTop(SMALL),
    glassFront(SMALL),
    arrow(SMALL.x, SMALL.y, SMALL_TAIL, -1, SMALL_ARROW),
    pipe(),
    collar(BIG),
    glassBack(BIG),
    oilAndPiston(BIG),
    bigTop(BIG),
    glassFront(BIG),
    arrow(BIG.x, BIG.y, BIG_TAIL, 1, BIG_ARROW),
    forceLabel("F₁", SMALL.x, SMALL.y, SMALL_TAIL, SMALL_TAIL - SMALL_ARROW.len, SMALL_ARROW),
    forceLabel("F₂", BIG.x, BIG.y, BIG_TAIL, BIG_TAIL + BIG_ARROW.len, BIG_ARROW),
  ],
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log("escrito", OUT, `${(svg.length / 1024).toFixed(1)} KB`);

const preview = process.argv.indexOf("--preview");
if (preview > 0) {
  const inline = svg.replace(/ class="iso-svg iso" data-theme="light"/, ' class="iso-svg"');
  const html = k.pageHtml({ title: "Prensa hidráulica", theme: "light", body: `<figure class="iso-figure"><div class="iso-plate" style="padding:0">${inline}</div></figure>` });
  writeFileSync(process.argv[preview + 1], html);
  console.log("vista previa", process.argv[preview + 1]);
}
