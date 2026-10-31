// Lámina 2.5D+ del tiro parabólico: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/tiro-parabolico-2_5d.mjs                → plantilla/interactivos/tiro-parabolico/plus/index.html
//   node plantilla/figuras/tiro-parabolico-2_5d.mjs --vista <ruta> → copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML a mano: se regenera con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de la prensa (plantilla/figuras/prensa-hidraulica-2_5d.mjs): misma página y lógica, otro dibujo.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(RAIZ, ".claude", "skills", "anatomy");
const k = await import("file://" + join(SKILL, "kit", "iso-kit.mjs"));
const { kitScript } = await import("file://" + join(SKILL, "scripts", "inline-kit.mjs"));
const JSON_TEMA = join(RAIZ, "contenido", "fisica", "tiro-parabolico-interactivo.json");
const SALIDA = join(RAIZ, "plantilla", "interactivos", "tiro-parabolico", "plus", "index.html");
const J = JSON.parse(readFileSync(JSON_TEMA, "utf8"));

// ---------- Modelo del dibujo (unidades del mundo; z hacia arriba; el tiro va en el plano y = 0) ----------
// Una sola escala en metros para lo horizontal y lo vertical: así la parábola tiene su forma real.
const V0MAX = J.rangos.v0.max, G = J.valoresIniciales.g;
const RMAX = V0MAX * V0MAX / G;                                  // alcance mayor posible (45°, v0 máx.)
const HMAX = (V0MAX * Math.sin(J.rangos.ang.max * Math.PI / 180)) ** 2 / (2 * G); // altura mayor posible
const M = 3;                                                     // unidades por metro
const XM = Math.ceil(RMAX / 10) * 10 + 5;                        // largo de la regla en m
const HM = Math.ceil(HMAX / 5) * 5;                              // alto del poste en m
const RB = 5.5, PAD_H = 0.8, ZB = RB + PAD_H;                    // balón (no a escala) y su base
const KV = 2.1;                                                  // unidades por m/s en las flechas (escala propia)
const POSTE = -18;                                               // x del poste de altura
const PLACA = { x: -34, y: -26, w: XM * M + 50, d: 52, r: 8 }, PLACA_H = 8, PATA_H = 5;
const REGLA = { y0: 13, y1: 21, z: 0.8 };
const TR = { r: 24, y: -6 };                                     // transportador

const W = 640, H = 340;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [POSTE, 0, HM * M + 14], [XM * M * 0.5, 0, HM * M + 14]],
  W, H, { pad: 14, azimuth: 78, elevation: 20 },
);

const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const fx = (v) => Math.round(v * 10) / 10;

// ---------- Piezas ----------
function placa() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLACA, -PLACA_H - PATA_H, PLACA_H, P)}"/>`];
  const patas = k.corners(PLACA, 22).sort((a, b) => prof(a) - prof(b));
  for (const [x, y] of patas) {
    o.push(S(k.cylinder(x, y, 7, -PLACA_H - PATA_H, 1.6, P, 28), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 5.4, -PLACA_H - PATA_H + 1.6, PATA_H - 1.6, P, 28), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLACA, -PLACA_H, PLACA_H, P, 8, 1.6), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PLACA, 5), 0, P), { tone: "lo" }));
  const torn = k.corners(PLACA, 10);
  o.push(L(torn.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  o.push(D(torn.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Líneas de la cancha: cada 10 m a lo ancho y la línea de tiro (y = 0)
  let cancha = "";
  for (let m = 10; m <= XM - 5; m += 10) cancha += k.lineOnTop([m * M, -19], [m * M, 10], 0, P);
  o.push(L(cancha, { tone: "faint" }));
  o.push(L(k.lineOnTop([0, 0], [(XM - 2) * M, 0], 0, P), { tone: "lo", dashed: true }));
  // Placa de datos grabada al frente
  const pl = { x: PLACA.x + PLACA.w - 96, y: -23, w: 84, d: 8, r: 1 };
  o.push(S(k.slabOf(pl, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 4, pl.y + 5.6], 0.6, P, "x"), `TIRO PARABÓLICO · g = ${G} m/s²`, { size: 3, tone: "lo" }));
  o.push(D([at([pl.x + 1.8, pl.y + 4.5, 0.6]), at([pl.x + pl.w - 1.8, pl.y + 4.5, 0.6])], { size: 0.4 }));
  return o.join("");
}

// Regla de alcance al frente: marca cada metro, mayor cada 5 m, número cada 10 m.
function reglaAlcance() {
  const o = [S(k.slabOf({ x: -6, y: REGLA.y0, w: XM * M + 8, d: REGLA.y1 - REGLA.y0, r: 1 }, 0, REGLA.z, P, 3), { tone: "hi", crease: "none" })];
  let menor = "", medio = "", mayor = "";
  for (let m = 0; m <= XM; m++) {
    const largo = m % 10 === 0 ? 4.2 : m % 5 === 0 ? 3 : 1.6;
    const d = k.lineOnTop([m * M, REGLA.y0], [m * M, REGLA.y0 + largo], REGLA.z, P);
    if (m % 10 === 0) mayor += d; else if (m % 5 === 0) medio += d; else menor += d;
  }
  o.push(L(menor, { tone: "faint" }), L(medio, { tone: "lo" }), L(mayor, { tone: "mid" }));
  for (let m = 0; m <= XM - 5; m += 10) { const p = at([m * M, REGLA.y1, 0]);
    o.push(`<text class="t-regla" x="${fx(p[0])}" y="${fx(p[1] + 11)}" text-anchor="middle">${m}${m === XM - 5 ? " m" : ""}</text>`); }
  return `<g data-parte="07">${o.join("")}</g>`;
}

// Banderín de caída: se mueve a lo largo de x; solo aparece cuando se conoce R.
function caida() {
  const o = [];
  o.push(L(k.ring(0, 0, 4.2, 0, P, 24), { tone: "mid" }));
  o.push(S(k.cylinder(0, 0, 0.9, 0, 26, P, 12), { tone: "hi", crease: "none" }));
  const a = at([0, 0, 26]), b = at([0, 0, 18]), c = at([11, 0, 22]);
  o.push(`<polygon class="banderin" points="${fx(a[0])},${fx(a[1])} ${fx(b[0])},${fx(b[1])} ${fx(c[0])},${fx(c[1])}"/>`);
  const t = at([0, 0, 30]);
  o.push(`<text class="t-caida" id="t-caida" x="${fx(t[0])}" y="${fx(t[1])}" text-anchor="middle"></text>`);
  return `<g id="caida" class="solo-revelado" data-parte="07">${o.join("")}</g>`;
}

// Poste-regla de altura detrás del punto de lanzamiento: marca cada metro, número cada 10 m.
function poste() {
  const o = [];
  o.push(S(k.cylinder(POSTE, 0, 6, 0, 1.4, P, 28, 0.3), { tone: "mid" }));
  o.push(S(k.slabOf({ x: POSTE - 1.6, y: -2.6, w: 3.2, d: 5.2, r: 0.5 }, 1.4, HM * M + 4, P, 2), { tone: "hi", crease: "none" }));
  o.push(S(k.cylinder(POSTE, 0, 2.6, HM * M + 5.4, 1.6, P, 20, 0.3), { tone: "mid" }));
  let menor = "", medio = "", mayor = "";
  for (let m = 0; m <= HM; m++) {
    const z = ZB + m * M, largo = m % 10 === 0 ? 4.2 : m % 5 === 0 ? 3 : 1.6;
    if (z > HM * M + 5) break;
    const d = k.segment([POSTE + 1.6, 0, z], [POSTE + 1.6 + largo, 0, z], P);
    if (m % 10 === 0) mayor += d; else if (m % 5 === 0) medio += d; else menor += d;
  }
  o.push(L(menor, { tone: "faint" }), L(medio, { tone: "lo" }), L(mayor, { tone: "mid" }));
  for (let m = 0; ZB + m * M <= HM * M + 5; m += 10) { const p = at([POSTE - 2.5, 0, ZB + m * M]);
    o.push(`<text class="t-regla" x="${fx(p[0])}" y="${fx(p[1] + 3.5)}" text-anchor="end">${m}${ZB + (m + 10) * M > HM * M + 5 ? " m" : ""}</text>`); }
  return `<g data-parte="06">${o.join("")}</g>`;
}

// Transportador de pie, en el plano del tiro, detrás del balón: marcas cada 5°, mayor cada 15°; 37° y 53° en dorado.
function transportador() {
  const o = [], c = [0, TR.y, ZB], arco = (r, a0, a1, n = 40) =>
    k.pathOf(Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return at([c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)]); }));
  o.push(`<path class="transp" d="${arco(TR.r, 0, 90)} ${k.segment([0, TR.y, ZB], [TR.r, TR.y, ZB], P)} ${k.segment([0, TR.y, ZB], [0, TR.y, ZB + TR.r], P)} Z"/>`);
  o.push(L(arco(TR.r, 0, 90) + arco(TR.r - 4.5, 0, 90), { tone: "mid" }));
  let menor = "", mayor = "";
  for (let g = 0; g <= 90; g += 5) {
    const a = g * Math.PI / 180, r0 = g % 15 === 0 ? TR.r - 4.5 : TR.r - 2.2;
    const d = k.segment([r0 * Math.cos(a), TR.y, ZB + r0 * Math.sin(a)], [TR.r * Math.cos(a), TR.y, ZB + TR.r * Math.sin(a)], P);
    if (g % 15 === 0) mayor += d; else menor += d;
  }
  o.push(L(menor, { tone: "lo" }), L(mayor, { tone: "mid" }));
  const marcas = Object.keys(J.aproximaciones).filter((g) => /^\d+$/.test(g)).map((g) => {
    const a = +g * Math.PI / 180; return at([(TR.r + 2.2) * Math.cos(a), TR.y, ZB + (TR.r + 2.2) * Math.sin(a)]);
  });
  o.push(marcas.map(([x, y]) => `<circle class="marca-oro" cx="${fx(x)}" cy="${fx(y)}" r="1.6"/>`).join(""));
  o.push(D([at(c)], { size: 0.6 }));
  return `<g data-parte="08">${o.join("")}</g>`;
}

// Base del lanzamiento (tee plano)
const base = () => S(k.cylinder(0, 0, 8, 0, PAD_H, P, 36, 0.2), { tone: "mid" }) + L(k.ring(0, 0, 5, PAD_H, P, 28), { tone: "faint" });

// Balón: esfera (su proyección es un círculo) con costuras; se dibuja en el origen y la página lo traslada.
function balon() {
  const c = at([0, 0, ZB]), r = RB * P.scale;
  const o = [`<circle class="balon" cx="${fx(c[0])}" cy="${fx(c[1])}" r="${fx(r)}"/>`];
  o.push(`<path class="balon-sombra" d="M ${fx(c[0] - r * 0.15)} ${fx(c[1] + r * 0.99)} A ${fx(r)} ${fx(r)} 0 0 0 ${fx(c[0] + r * 0.99)} ${fx(c[1] - r * 0.15)} A ${fx(r * 0.82)} ${fx(r * 0.82)} 0 0 1 ${fx(c[0] - r * 0.15)} ${fx(c[1] + r * 0.99)} Z"/>`);
  o.push(L(k.sideRing([0, 0, ZB], RB, "x", P, 28) + k.ring(0, 0, RB, ZB, P, 28), { tone: "lo" }));
  o.push(`<circle class="balon-brillo" cx="${fx(c[0] - r * 0.38)}" cy="${fx(c[1] - r * 0.4)}" r="${fx(r * 0.2)}"/>`);
  return `<g id="balon" data-parte="01">${o.join("")}</g>`;
}

const flecha = (id, parte) => `<g id="fl-${id}" class="flecha fl-${id}" data-parte="${parte}"><line/><polygon/><text class="t-vel"></text></g>`;

const figura = k.figureSvg({
  width: W, height: H, label: J.figura.aria,
  body: [
    placa(), reglaAlcance(), poste(), transportador(), base(),
    `<g data-parte="05" id="g-cima" class="oculto"><path id="guia-h" class="guia" d=""/><path id="guia-v" class="guia" d=""/><circle id="cima" class="cima" r="3"/><text id="t-h" class="t-h"></text></g>`,
    `<path id="parabola" class="parabola solo-revelado" d=""/><path id="ref" class="ref oculto" d=""/><text id="t-ref" class="t-ref oculto"></text>`,
    `<path id="estela" class="estela" data-parte="01" d=""/>`,
    caida(),
    `<g id="fantasma" class="solo-trampa"><path id="fant-v" class="fantasma" d=""/><path id="fant-b" class="fantasma" d=""/><text class="t-trampa" text-anchor="start"><tspan id="t-fantasma"></tspan><tspan id="t-real" dy="15"></tspan></text></g>`,
    `<path id="sombra" class="sombra" d="${k.ring(0, 0, RB, 0.05, P, 28)}"/>`,
    `<g data-parte="02"><path id="arco" class="arco" d=""/><text id="t-ang" class="t-ang"></text></g>`,
    flecha("v0", "02"), balon(), flecha("v", "01"), flecha("vx", "03"), flecha("vy", "04"),
    `<g id="mango" data-parte="02"><circle class="mango-toque" r="18"/><circle class="mango" r="6"/></g>`,
    `<g id="rot"></g>`,
  ],
});

// ---------- Datos para la página ----------
const CFG = {
  P, M, KV, RB, ZB, POSTE, XM, HM, TR, REGLA, SCALE: P.scale,
  ROT: ["01", "02", "03", "04", "05", "06", "07", "08"],
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
    const r = await fetch("../../../../contenido/fisica/tiro-parabolico-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/tiro-parabolico-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, AP = J.aproximaciones, g = V.g;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const svgSub = (s) => s.replace(/<sub>(.*?)<\/sub>/g, '<tspan dy="0.3em" font-size="72%">$1</tspan><tspan dy="-0.3em">\u200b</tspan>');
// En 37° y 53° se usan los valores del examen; en los demás ángulos, la calculadora.
const trig = (a) => AP[a] ? { sen: AP[a].sen, cos: AP[a].cos, examen: true } : { sen: Math.sin(a * Math.PI / 180), cos: Math.cos(a * Math.PI / 180), examen: false };
const tiro = (v0, a) => {
  const { sen, cos, examen } = trig(a), vx = v0 * cos, vy = v0 * sen, ts = vy / g, tv = 2 * ts;
  return { v0, a, sen, cos, examen, vx, vy, ts, tv, R: vx * tv, H: vy * vy / (2 * g), Rtrampa: vx * ts };
};
const A1 = Object.keys(AP).filter((x) => /^\d+$/.test(x)).map(Number).sort((a, b) => a - b); // [37, 53]

let v0 = V.v0, ang = V.ang, t = V.t, revelado = false, trampaOn = false, refOn = false, sel = null, fase = "quieto", cimaVista = false;
const T = () => tiro(v0, ang);
const pos = (tt, s = T()) => { const u = Math.min(tt, s.tv); return [s.vx * u, Math.max(0, s.vy * u - g * u * u / 2)]; };
const W = (xm, ym, dy = 0) => iso([C.M * xm, dy, C.ZB + C.M * ym], P);   // punto del plano del tiro en pantalla

const svg = $(".iso-svg"), stage = $(".iso-stage"), sV0 = $("#s-v0"), sT = $("#s-t"), bPat = $("#patear"), bTrampa = $("#trampa"),
  bInicio = $("#inicio"), nota = $("#nota"), mango = $("#mango");

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo + " · Física · Examen de admisión UNAM";
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#etq-r").textContent = J.lecturas.alcance;
$("#l-v0").innerHTML = J.controles.v0 + ", v<sub>0</sub>";
$("#l-t").textContent = J.controles.t;
sV0.min = RG.v0.min; sV0.max = RG.v0.max; sV0.step = RG.v0.paso; sV0.value = v0;
sT.min = RG.t.min; sT.max = RG.t.max; sT.step = RG.t.paso; sT.value = t;
stage.setAttribute("aria-valuemin", RG.ang.min); stage.setAttribute("aria-valuemax", RG.ang.max);
stage.setAttribute("aria-label", "Flecha de lanzamiento: flechas del teclado para cambiar el ángulo");

// ---------- Rótulos y fichas ----------
const FICHAS = {
  "01": ["Balón", () => "Sin aire, la única fuerza es su peso, hacia abajo. Por eso solo cambia la parte vertical de su velocidad."],
  "02": ["Lanzamiento, v₀", () => { const s = T(); return `Sale a ${num(v0)} m/s y ${ang}°. El ángulo reparte esa rapidez: v<sub>x</sub> = v<sub>0</sub> cos θ y v<sub>0y</sub> = v<sub>0</sub> sen θ. Arrastra la punta para cambiarlo.`; }],
  "03": ["Velocidad horizontal, vₓ", () => { const s = T(); return `v<sub>x</sub> = ${num(v0)} × ${num(s.cos,3)} = ${num(s.vx)} m/s. Nada empuja al balón de lado: la flecha mide lo mismo en todo el vuelo.`; }],
  "04": ["Velocidad vertical, v_y", () => { const s = T(); return `Empieza en ${num(s.vy)} m/s y pierde ${num(g)} m/s cada segundo: se acorta al subir, vale 0 en la cima y crece al bajar.`; }],
  "05": ["Cima", () => { const s = T(); return `Llega en t = ${num(s.vy)} ÷ ${num(g)} = ${num(s.ts)} s. Ahí v<sub>y</sub> = 0, pero el balón sigue avanzando a ${num(s.vx)} m/s: no se detiene.`; }],
  "06": ["Regla de altura", () => { const s = T(); return `Mide la altura en metros. Máxima: H = ${num(s.vy)}² ÷ (2 × ${num(g)}) = ${num(s.H)} m. Solo depende de lo vertical.`; }],
  "07": ["Regla de alcance", () => { const s = T(); return revelado ? `Mide en metros a lo largo de la cancha. Alcance: R = ${num(s.vx)} × ${num(s.tv)} = ${num(s.R)} m (lo horizontal por el tiempo de vuelo).` : "Mide en metros a lo largo de la cancha. El alcance es lo horizontal por el tiempo de vuelo; patea para verlo."; }],
  "08": ["Transportador", () => `Marca el ángulo de salida, de ${RG.ang.min}° a ${RG.ang.max}°. Los puntos dorados son ${A1.join("° y ")}°: con ellos el examen da sen y cos exactos (triángulo 3-4-5).`]
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
const rots = {};
C.ROT.forEach(n => {
  const b = document.createElement("button"); b.type = "button"; b.className = "rot-b"; b.dataset.n = n;
  b.setAttribute("aria-pressed", "false"); b.innerHTML = `<b>${n}</b>${FICHAS[n][0]}`;
  b.addEventListener("click", () => seleccionar(n)); $("#rotulos").append(b);
  const g = el("g", "rot"); g.dataset.n = n; g.setAttribute("aria-hidden", "true");
  const c = el("circle"); c.setAttribute("r", 8.5);
  const tx = el("text"); tx.textContent = n;
  g.append(c, tx); g.addEventListener("click", (e) => { e.stopPropagation(); seleccionar(n); });
  $("#rot").append(g); rots[n] = { g, c, tx, x: null, y: null };
});
function ponRot(n, p, visible = true){
  const r = rots[n]; r.g.style.display = visible ? "" : "none"; if (!visible) return;
  const x = Math.round(p[0] * 10) / 10, y = Math.round(p[1] * 10) / 10;
  if (r.x === x && r.y === y) return; r.x = x; r.y = y;
  r.c.setAttribute("cx", x); r.c.setAttribute("cy", y); r.tx.setAttribute("x", x); r.tx.setAttribute("y", y + 0.4);
}

// ---------- Mensajes ----------
let enRecorrido = false;
const decir = (s) => { if (!enRecorrido) nota.textContent = s; };
function revelar(){ if (!revelado && !enRecorrido){ revelado = true; } }

// ---------- Dibujo que cambia ----------
const d = (pts) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
function curva(s, hasta, n = 64){ const pts = []; for (let i = 0; i <= n; i++){ const [x, y] = pos(hasta * i / n, s); pts.push(W(x, y)); } return d(pts); }
function ponFlecha(id, p0, p1, texto, lado = 1){
  const gr = $("#fl-" + id), ln = gr.querySelector("line"), pl = gr.querySelector("polygon"), tx = gr.querySelector("text");
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
  if (l < 2){ gr.style.display = "none"; return; } gr.style.display = "";
  const ux = dx / l, uy = dy / l, cab = Math.min(10, l * 0.6), an = cab * 0.5;
  const bx = p1[0] - ux * cab, by = p1[1] - uy * cab;
  ln.setAttribute("x1", p0[0].toFixed(1)); ln.setAttribute("y1", p0[1].toFixed(1)); ln.setAttribute("x2", (bx + ux).toFixed(1)); ln.setAttribute("y2", (by + uy).toFixed(1));
  pl.setAttribute("points", `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${(bx - uy * an).toFixed(1)},${(by + ux * an).toFixed(1)} ${(bx + uy * an).toFixed(1)},${(by - ux * an).toFixed(1)}`);
  if (texto === null){ tx.textContent = ""; return; }
  const nx = -uy * lado, ny = ux * lado;   // normal del lado pedido
  tx.setAttribute("x", (p0[0] + dx * 0.55 + nx * 12).toFixed(1)); tx.setAttribute("y", (p0[1] + dy * 0.55 + ny * 12 + 4).toFixed(1));
  tx.setAttribute("text-anchor", Math.abs(nx) < 0.3 ? "middle" : nx > 0 ? "start" : "end");
  tx.innerHTML = svgSub(texto);
}
const mostrar = (sel, on) => $(sel).classList.toggle("oculto", !on);
const vSc = (m) => m * C.KV / C.M;   // m/s → metros del dibujo (las flechas tienen escala propia)

function render(){
  const s = T(), [bx, by] = pos(t, s), vyt = s.vy - g * Math.min(t, s.tv), enSuelo = t >= s.tv - 1e-9 && t > 0;
  if (t >= s.ts - 1e-9) cimaVista = true;
  // Balón y sombra
  $("#balon").setAttribute("transform", translateAlong(P, [C.M * bx, 0, C.M * by]));
  $("#sombra").setAttribute("transform", translateAlong(P, [C.M * bx, 0, 0]));
  $("#estela").setAttribute("d", t > 0 ? curva(s, Math.min(t, s.tv), 48) : "");
  svg.classList.toggle("revelado", revelado);
  if (revelado) $("#parabola").setAttribute("d", curva(s, s.tv));
  // Referencia de 37° (tras predecir)
  mostrar("#ref", refOn); mostrar("#t-ref", refOn);
  if (refOn){ const r = tiro(v0, A1[0]); $("#ref").setAttribute("d", curva(r, r.tv)); const c = W(r.R * 0.5, r.H); const tr = $("#t-ref");
    tr.setAttribute("x", c[0].toFixed(1)); tr.setAttribute("y", (c[1] - 8).toFixed(1)); tr.textContent = `${A1[0]}°`; }
  // Cima y altura
  mostrar("#g-cima", cimaVista || revelado);
  const cx = s.vx * s.ts, pc = W(cx, s.H);
  $("#cima").setAttribute("cx", pc[0].toFixed(1)); $("#cima").setAttribute("cy", pc[1].toFixed(1));
  $("#guia-h").setAttribute("d", d([pc, iso([C.POSTE + 1.6, 0, C.ZB + C.M * s.H], P)]));
  $("#guia-v").setAttribute("d", d([pc, iso([C.M * cx, 0, 0], P)]));
  const ph = iso([C.POSTE + 6, 0, C.ZB + C.M * s.H], P); const th = $("#t-h");
  th.setAttribute("x", ph[0].toFixed(1)); th.setAttribute("y", (ph[1] - 6).toFixed(1)); th.textContent = `H = ${num(s.H)} m`;
  // Banderín de caída
  $("#caida").setAttribute("transform", translateAlong(P, [C.M * s.R, 0, 0]));
  $("#t-caida").textContent = `R = ${num(s.R)} m`;
  // Trampa: con el tiempo de subida se queda justo debajo de la cima
  const pf = iso([C.M * s.Rtrampa, 0, 0], P);
  $("#fant-v").setAttribute("d", d([pc, pf]));
  $("#fant-b").setAttribute("d", ring(C.M * s.Rtrampa, 0, C.RB, 0.1, P, 24));
  const tf = $("#t-fantasma"), trr = $("#t-real"), xt = pf[0] + 8, yt = (pc[1] + pf[1]) / 2 - 4;
  tf.setAttribute("x", xt.toFixed(1)); tf.parentNode.setAttribute("y", yt.toFixed(1)); trr.setAttribute("x", xt.toFixed(1));
  tf.textContent = `con t de subida: ${num(s.Rtrampa)} m`; trr.textContent = `de verdad: ${num(s.R)} m`;
  // Ángulo y flecha de lanzamiento
  const a = ang * Math.PI / 180, o = W(0, 0), rA = 15;
  const arc = []; for (let i = 0; i <= 24; i++){ const b = a * i / 24; arc.push(iso([rA * Math.cos(b), 0, C.ZB + rA * Math.sin(b)], P)); }
  $("#arco").setAttribute("d", d(arc));
  const pa = iso([(rA + 9) * Math.cos(a / 2), 0, C.ZB + (rA + 9) * Math.sin(a / 2)], P), ta = $("#t-ang");
  ta.setAttribute("x", (pa[0] + 2).toFixed(1)); ta.setAttribute("y", (pa[1] + 4).toFixed(1)); ta.textContent = `${ang}°`;
  const tip = W(vSc(s.vx), vSc(s.vy));
  const enAire = t > 0 && !enSuelo;
  ponFlecha("v0", o, tip, tpl(J.figura.v0, {v0:num(v0)}), -1);
  $("#fl-v0").style.visibility = mango.style.visibility = enAire ? "hidden" : "";
  mango.setAttribute("transform", `translate(${tip[0].toFixed(1)} ${tip[1].toFixed(1)})`);
  // Componentes en el balón
  const pb = W(bx, by), vyFl = enSuelo ? 0 : vyt;
  ponFlecha("vx", pb, W(bx + vSc(s.vx), by), t > 0 ? tpl(J.figura.vx, {vx:num(s.vx)}) : null, 1);
  ponFlecha("vy", pb, W(bx, by + vSc(vyFl)), t > 0 && !enSuelo ? tpl(J.figura.vy, {vyt: num(Math.abs(vyFl)) + (vyFl > 1e-9 ? " ↑" : vyFl < -1e-9 ? " ↓" : "")}) : null, -1);
  ponFlecha("v", pb, W(bx + vSc(s.vx), by + vSc(vyFl)), null);
  ["vx", "vy", "v"].forEach(id => $("#fl-" + id).style.visibility = t > 0 && !enSuelo ? "" : "hidden");
  // Rótulos
  const ps = iso([C.M * bx, 0, 0], P), pvx = W(bx + vSc(s.vx), by), pvy = W(bx, by + vSc(vyFl));
  ponRot("01", [ps[0] - 4, ps[1] + 15]);
  ponRot("02", [tip[0] - 14, tip[1] - 12], !enAire);
  ponRot("03", [pvx[0] + 14, pvx[1] - 2], enAire && !trampaOn);
  ponRot("04", [pvy[0] - 14, pvy[1] + (vyFl > 0 ? -2 : 2)], enAire && !trampaOn && Math.abs(vyFl) > 2);
  ponRot("05", [pc[0], pc[1] - 16], cimaVista || revelado);
  ponRot("06", iso([C.POSTE - 6, 0, C.ZB + C.M * C.HM - 6], P));
  ponRot("07", iso([C.M * (C.XM - 18), C.REGLA.y1 + 8, 0], P));
  ponRot("08", iso([-10, C.TR.y, C.ZB + 14], P));
  // Panel
  const L = J.lecturas;
  $("#o-r").textContent = revelado ? `${num(s.R)} m` : "?";
  $("#o-formula").innerHTML = revelado
    ? `R = v<sub>x</sub> × 2v<sub>0y</sub> ÷ g = ${num(s.vx)} × 2 × ${num(s.vy)} ÷ ${num(g)} = ${num(s.R)} m`
    : "Elige tu predicción o patea para verla.";
  $("#o-v0").textContent = tpl(J.controles.valorV0, {v:num(v0)});
  $("#o-t").textContent = tpl(J.controles.valorT, {v:num(Math.min(t, s.tv), 2)});
  sV0.style.setProperty("--p", (100 * (v0 - RG.v0.min) / (RG.v0.max - RG.v0.min)) + "%");
  sT.style.setProperty("--p", (100 * (t - RG.t.min) / (RG.t.max - RG.t.min)) + "%");
  if (+sT.value !== t) sT.value = t;
  sV0.setAttribute("aria-valuetext", tpl(J.controles.valorV0, {v:num(v0)}) + (revelado ? `, alcance ${num(s.R)} m` : ""));
  sT.setAttribute("aria-valuetext", `t = ${num(Math.min(t, s.tv))} s, altura ${num(by, 1)} m, avance ${num(bx, 1)} m`);
  $("#o-vx").textContent = `${num(s.vx)} m/s`;
  $("#o-vy").textContent = `${num(Math.abs(enSuelo ? 0 : vyt))} m/s`;
  $("#o-h").textContent = `${num(s.H)} m`;
  const lect = `θ ${ang}° · t ${num(Math.min(t, s.tv), 1)} s · x ${num(bx, 1)} m · y ${num(by, 1)} m`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", ang);
  stage.setAttribute("aria-valuetext", `${ang}°, v₀ = ${num(v0)} m/s` + (revelado ? `, cae a ${num(s.R)} m` : ""));
  bPat.textContent = fase === "vuelo" ? "Pausar" : t <= 0 ? "Patear" : enSuelo ? "Patear otra vez" : "Seguir";
  const nl = L.numerales, n = {v0:num(v0), cos:num(s.cos,3), sen:num(s.sen,3), vx:num(s.vx), vy:num(s.vy), g:num(g), ts:num(s.ts), tv:num(s.tv), R:num(s.R), Rtrampa:num(s.Rtrampa), H:num(s.H)};
  const filas = [
    [L.componentes, tpl(L.vxValor, n) + "<br>" + tpl(L.vyValor, n) + (s.examen ? "" : `<br><span class="et">${J.aproximaciones.nota}</span>`)],
    [L.tiempo, tpl(L.subidaValor, n) + "<br>" + tpl(L.vueloValor, n)],
    [L.alcance, tpl(L.alcanceValor, n) + `<br><span class="et">${tpl(L.trampa, n)}</span>`],
    [L.altura, tpl(L.alturaValor, n)],
    [L.cima, tpl(L.cimaValor, n) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((f, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${f[0]}</span><span class="va">${f[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento (solo mientras algo se mueve) ----------
let anim = 0;
const VEL = 1.15;   // segundos de vuelo por segundo real
function volar(hasta, fin){
  cancelAnimationFrame(anim);
  const s = T(); hasta = Math.min(hasta, s.tv);
  if (quieto){ t = hasta; aterrizar(); fase = "quieto"; render(); if (fin) fin(); return; }
  fase = "vuelo"; let antes = performance.now();
  const f = (ahora) => {
    t = Math.min(hasta, t + (ahora - antes) / 1000 * VEL); antes = ahora;
    if (t >= hasta - 1e-9){ t = hasta; fase = "quieto"; aterrizar(); render(); if (fin) fin(); return; }
    render(); anim = requestAnimationFrame(f);
  };
  render(); anim = requestAnimationFrame(f);
}
function aterrizar(){
  const s = T();
  if (t < s.tv - 1e-9 || enRecorrido) return;
  const nuevo = !revelado; revelar();
  decir(`Cae a ${num(s.R)} m después de ${num(s.tv)} s: v${"ₓ"} = ${num(s.vx)} m/s todo el vuelo × ${num(s.tv)} s.` + (nuevo ? "" : ""));
}
function pausar(){ cancelAnimationFrame(anim); fase = "quieto"; render(); }
function patear(){
  if (fase === "vuelo"){ pausar(); return; }
  const s = T(); if (t >= s.tv - 1e-9) t = 0;
  if (t === 0) decir(`Sale con v${"ₓ"} = ${num(s.vx)} m/s y v₀ᵧ = ${num(s.vy)} m/s. Mira las dos flechas: una no cambia, la otra se acorta.`);
  volar(s.tv);
}
function nuevoTiro(){ cancelAnimationFrame(anim); fase = "quieto"; t = 0; cimaVista = false; }
function ponAng(a){ a = Math.max(RG.ang.min, Math.min(RG.ang.max, Math.round(a))); if (a === ang) return; ang = a; nuevoTiro(); render(); }

// ---------- Recorrido automático: sube hasta la cima sin revelar R; se detiene al tocar y retoma a los 6 s ----------
const ANG_REC = [V.ang, 45, 30, 60].filter(a => a >= RG.ang.min && a <= RG.ang.max && !A1.slice(1).includes(a));
let tRec = 0, iRec = 0, alTerminar = null;
function giro(a1, fin){
  cancelAnimationFrame(anim); const a0 = ang, t0 = performance.now(), dur = 700;
  const f = (ahora) => { const q = Math.min(1, (ahora - t0) / dur), e = q < .5 ? 2*q*q : 1 - Math.pow(-2*q + 2, 2) / 2;
    ponAng(a0 + (a1 - a0) * e); if (q < 1) anim = requestAnimationFrame(f); else fin(); };
  anim = requestAnimationFrame(f);
}
function pasoRecorrido(){
  if (!enRecorrido) return;
  const s = T(), sigue = () => { tRec = setTimeout(pasoRecorrido, 900); };
  if (t > 0 && t < s.ts - 1e-6) volar(s.ts, sigue);
  else { iRec = (iRec + 1) % ANG_REC.length; nuevoTiro(); render(); giro(ANG_REC[iRec], () => { tRec = setTimeout(() => { if (enRecorrido) volar(T().ts, sigue); }, 300); }); }
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return; enRecorrido = true; nota.textContent = ""; iRec = Math.max(0, ANG_REC.indexOf(ang)) - 1; if (t > 0 && t < T().ts) iRec++; pasoRecorrido(); }
function tomarControl(){
  if (enRecorrido){ enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(anim); if (fase !== "quieto"){ fase = "quieto"; render(); } }
  clearTimeout(tRec); tRec = setTimeout(iniciarRecorrido, 6000);
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (!visible && enRecorrido) tomarControl(); }, {rootMargin:"0px"}).observe(stage);
setTimeout(() => { if (visible) iniciarRecorrido(); else tRec = setTimeout(iniciarRecorrido, 6000); }, 1400);

// ---------- Controles ----------
bPat.addEventListener("click", patear);
bInicio.addEventListener("click", () => {
  nuevoTiro(); v0 = V.v0; ang = V.ang; sV0.value = v0; refOn = false;
  if (trampaOn) bTrampa.click();
  decir("De vuelta al tiro del examen."); render(); preguntaPredice();
});
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; svg.classList.toggle("trampa-on", trampaOn);
  bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? "Ocultar la trampa" : "¿Y con el tiempo de subida?";
  const s = T();
  if (trampaOn){ revelar(); cimaVista = true;
    decir(`Con el tiempo de subida (${num(s.ts)} s) solo llegas a ${num(s.vx)} × ${num(s.ts)} = ${num(s.Rtrampa)} m: justo debajo de la cima. El balón también baja: el vuelo dura ${num(s.tv)} s y cae a ${num(s.R)} m.`); }
  render();
});
sV0.addEventListener("input", () => { v0 = +sV0.value; nuevoTiro(); render(); preguntaPredice(); });
sT.addEventListener("input", () => { cancelAnimationFrame(anim); fase = "quieto"; const s = T();
  t = +sT.value >= s.tv - RG.t.paso / 2 ? s.tv : +sT.value; aterrizar(); render(); });
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); patear();
});
stage.addEventListener("keydown", (e) => {
  const p = RG.ang.paso;
  const m = {ArrowUp:p, ArrowRight:p, ArrowDown:-p, ArrowLeft:-p, PageUp:5*p, PageDown:-5*p}[e.key];
  if (e.key === "Home"){ e.preventDefault(); ponAng(RG.ang.min); return; }
  if (e.key === "End"){ e.preventDefault(); ponAng(RG.ang.max); return; }
  if (m === undefined) return;
  e.preventDefault(); ponAng(ang + m);
});
// Arrastre de la flecha (dedo o mouse): touch-action:none solo en la punta
const ex = iso([1, 0, 0], P), ez = iso([0, 0, 1], P), o0 = iso([0, 0, 0], P);
const exv = [ex[0] - o0[0], ex[1] - o0[1]], ezv = [ez[0] - o0[0], ez[1] - o0[1]], det = exv[0] * ezv[1] - exv[1] * ezv[0];
const svgPt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
let arr = false;
mango.addEventListener("pointerdown", (e) => { cancelAnimationFrame(anim); fase = "quieto"; arr = true; mango.setPointerCapture(e.pointerId); e.preventDefault(); });
mango.addEventListener("pointermove", (e) => {
  if (!arr) return;
  const q = svgPt(e), b = iso([0, 0, C.ZB], P), sx = q.x - b[0], sy = q.y - b[1];
  const wx = (sx * ezv[1] - sy * ezv[0]) / det, wz = (exv[0] * sy - exv[1] * sx) / det;   // pantalla → plano del tiro
  if (wx > 0.5 || wz > 0.5) ponAng(Math.atan2(wz, Math.max(wx, 0.01)) * 180 / Math.PI);
});
const soltar = () => { if (arr){ arr = false; render(); } };
mango.addEventListener("pointerup", soltar); mango.addEventListener("pointercancel", soltar);

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
  const [aA, aB] = A1, a = tiro(v0, aA), b = tiro(v0, aB);
  $("#pred-q").innerHTML = `Si pateas a ${aB}° en vez de ${aA}°, ¿cae más cerca, igual o más lejos? Elige y la lámina patea a ${aB}° para comprobarlo.`;
  opciones($("#pred-ops"), [
    {t:"Más cerca", e:`Tienta pensar que más ángulo es menos avance: v<sub>x</sub> baja de ${num(a.vx)} a ${num(b.vx)} m/s. Pero el vuelo dura más (${num(a.tv)} → ${num(b.tv)} s) y se compensa: ${num(b.vx)} × ${num(b.tv)} = ${num(b.R)} m.`},
    {t:"Igual", ok:true, e:`${aA}° y ${aB}° suman 90°: son complementarios. Sen y cos se intercambian (${num(a.sen)} ↔ ${num(a.cos)}), así que v<sub>x</sub> × t da lo mismo: ${num(b.vx)} × ${num(b.tv)} = ${num(b.R)} m.`},
    {t:"Más lejos", e:`Tienta pensar que más alto es más lejos: sube más (H = ${num(b.H)} m contra ${num(a.H)} m), pero avanza más lento (v<sub>x</sub> = ${num(b.vx)} m/s). Cae en el mismo lugar: ${num(b.R)} m.`}
  ], () => { tomarControl(); revelado = true; refOn = true; if (ang !== aB) ang = aB; nuevoTiro(); render(); volar(T().tv); });
}

// ---------- Los 6 pasos (capa 1) ----------
const e0 = tiro(V.v0, V.ang), e45 = V.v0 * V.v0 / g;
const n = {v0:num(V.v0), ang:V.ang, g:num(g), sen:num(e0.sen), cos:num(e0.cos), vx:num(e0.vx), vy:num(e0.vy), ts:num(e0.ts), tv:num(e0.tv),
  R:num(e0.R), H:num(e0.H), Rt:num(e0.Rtrampa), Rvy:num(e0.vy * e0.tv), R45:num(e45)};
const PASOS = [
  {n:1, titulo:"Pregunta de examen", enunciado:`Se patea un balón desde el suelo con una rapidez de ${n.v0} m/s y un ángulo de ${n.ang}° sobre la horizontal. Usa g = ${n.g} m/s², sen ${n.ang}° ≈ ${n.sen} y cos ${n.ang}° ≈ ${n.cos}, y desprecia la resistencia del aire. ¿A qué distancia cae el balón?`,
    ops:[{t:`A) ${n.Rt} m`, e:`Usaste el tiempo de subida (${n.ts} s). El balón también baja: el vuelo dura el doble.`},
         {t:`B) ${n.Rvy} m`, e:`Multiplicaste por v<sub>0y</sub> = ${n.vy} m/s. La distancia la da lo horizontal: v<sub>x</sub> = ${n.vx} m/s.`},
         {t:`C) ${n.R} m`, ok:true, e:`v<sub>x</sub> = ${n.vx} m/s, vuelo 2 × ${n.ts} = ${n.tv} s, R = ${n.vx} × ${n.tv} = ${n.R} m.`},
         {t:`D) ${n.R45} m`, e:`v<sub>0</sub>² ÷ g solo vale para 45°; aquí el ángulo es ${n.ang}°.`}]},
  {n:2, titulo:"Idea en una frase", p:["El movimiento se separa en dos: en horizontal la velocidad no cambia, en vertical la gravedad frena y luego acelera, y el tiempo es el mismo para los dos.",
    "Patea en la lámina: la flecha v<sub>x</sub> mide lo mismo todo el vuelo; v<sub>y</sub> se acorta al subir, vale 0 en la cima y crece al bajar."]},
  {n:3, titulo:"Ejemplo resuelto", p:[`Componentes: v<sub>x</sub> = ${n.v0} × ${n.cos} = <b>${n.vx} m/s</b>; v<sub>0y</sub> = ${n.v0} × ${n.sen} = <b>${n.vy} m/s</b>.`,
    `Tiempo de subida: ${n.vy} ÷ ${n.g} = ${n.ts} s. Tiempo de vuelo: 2 × ${n.ts} = <b>${n.tv} s</b>.`,
    `Alcance: ${n.vx} × ${n.tv} = <b>${n.R} m</b> → respuesta C.`, `(Altura máxima: ${n.vy}² ÷ (2 × ${n.g}) = ${n.H} m.)`]},
  {n:4, titulo:"La trampa", p:[`Usar el tiempo de subida (${n.ts} s) como si fuera el de vuelo da ${n.vx} × ${n.ts} = ${n.Rt} m, la opción A. El balón sube y también baja: el tiempo de vuelo es el doble.`,
    `Las otras también tienen dueño: B (${n.Rvy} m) multiplica por v<sub>0y</sub> en vez de v<sub>x</sub>, y D (${n.R45} m) usa v<sub>0</sub>² ÷ g, que solo vale para 45°.`,
    `Pulsa «¿Y con el tiempo de subida?» en la lámina: te quedas en ${n.Rt} m, justo debajo de la cima.`]},
  {n:5, titulo:"Truco de examen", p:['Separa siempre: el tiempo lo da lo vertical <span class="formula">t = 2 v<sub>0y</sub> ÷ g</span> y la distancia, lo horizontal <span class="formula">v<sub>x</sub> × t</span>.',
    `Si te dan ${A1.join("° o ")}°, piensa en el triángulo 3-4-5: las componentes salen exactas.`]},
  {n:6, titulo:J.prueba.titulo, enunciado:J.prueba.pregunta, ops:J.prueba.opciones.map(o => ({t:`${o.letra}) ${o.texto}`, ok:o.correcta, e:o.retro}))}
];
PASOS.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.p || []).map(t => `<p>${t}</p>`).join("");
  if (p.enunciado){ s.insertAdjacentHTML("beforeend", `<p>${p.enunciado}</p>`); const l = document.createElement("div"); l.className = "opciones"; opciones(l, p.ops); s.append(l); }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});
// Otro intento (capa 2): altura máxima a 53°, con los valores del examen
const o53 = tiro(V.v0, A1[1]), Hv = V.v0 * V.v0 / (2 * g);
$("#otro").innerHTML = `<h3>Otro intento</h3><p>Mismo balón (${n.v0} m/s, g = ${n.g} m/s²), ahora a ${A1[1]}°. ¿Qué altura máxima alcanza?</p><div class="opciones"></div>`;
opciones($("#otro .opciones"), [
  {t:`A) ${num(e0.H)} m`, e:`Esa es la de ${V.ang}°. A ${A1[1]}° la parte vertical es mayor: v<sub>0y</sub> = ${n.v0} × ${num(o53.sen)} = ${num(o53.vy)} m/s.`},
  {t:`B) ${num(o53.H)} m`, ok:true, e:`H = ${num(o53.vy)}² ÷ (2 × ${n.g}) = ${num(o53.H)} m. El alcance no cambia (${num(o53.R)} m), pero sube más.`},
  {t:`C) ${num(Hv)} m`, e:`Usaste v<sub>0</sub> completa, como si la pateara hacia arriba. Solo cuenta la parte vertical.`},
  {t:`D) ${num(o53.vy * o53.vy / g)} m`, e:"Olvidaste el 2 del denominador: H = v<sub>0y</sub>² ÷ (2g)."}
]);

$("#pie").innerHTML = `<i>${tpl(J.figura.pie, {g:num(g)})}</i> Modelo: ${A1.join("° y ")}° usan los valores del examen (sen y cos de 0.6 y 0.8); los demás ángulos, la calculadora.
 La cancha y las dos reglas están en metros a la misma escala, así que la parábola tiene su forma real; el balón y las flechas de velocidad no están a escala (las flechas tienen su propia escala, igual para v<sub>x</sub> y v<sub>y</sub>).
 Si nadie toca, la lámina lanza sola hasta la cima sin mostrar dónde cae. Teclas: B patea o pausa; con la lámina enfocada, las flechas cambian el ángulo de ${RG.ang.paso}° en ${RG.ang.paso}°.`;

pintarFicha(); preguntaPredice(); render();
window.__tiro = { set:(o) => { if ("t" in o) t = o.t; if ("ang" in o) ang = o.ang; if ("v0" in o){ v0 = o.v0; sV0.value = v0; } if ("rev" in o) revelado = o.rev; if ("ref" in o) refOn = o.ref; cimaVista = t >= T().ts; render(); },
  trampa:() => bTrampa.click(), sel:seleccionar, alto:() => { enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(anim); fase = "quieto"; render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio del tiro) ----------
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
const CSS_PAGINA = CSS_PRENSA + `
/* Propio del tiro parabólico */
.solo-revelado{display:none} .revelado .solo-revelado{display:inline}
.oculto{display:none}
.balon{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:.8}
.balon-sombra{fill:var(--anatomy-shade-0)} .balon-brillo{fill:var(--anatomy-lit-top)}
.sombra{fill:var(--anatomy-halo);opacity:calc(var(--anatomy-halo-opacity) * .7)}
.transp{fill:var(--agua-sup);fill-opacity:.18;stroke:none}
.marca-oro{fill:var(--dorado)}
.estela{fill:none;stroke:var(--acento);stroke-width:1.8;stroke-linecap:round}
.parabola{fill:none;stroke:var(--acento);stroke-width:1.1;stroke-dasharray:5 4;opacity:.8}
.ref{fill:none;stroke:var(--suave);stroke-width:1;stroke-dasharray:2 3}
.t-ref{font:500 12px var(--anatomy-mono);fill:var(--suave);text-anchor:middle}
.guia{fill:none;stroke:var(--dorado);stroke-width:.9;stroke-dasharray:3 3}
.cima{fill:var(--sup);stroke:var(--dorado);stroke-width:1.4}
.t-h{font:500 12px var(--anatomy-mono);fill:var(--dorado);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.banderin{fill:var(--acento)}
.t-caida{font:500 14px var(--serif);fill:var(--acento);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.arco{fill:none;stroke:var(--rubrica);stroke-width:1.3}
.t-ang{font:500 12px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.flecha line{stroke-width:2.2} .flecha.tenue{opacity:.4}
.fl-v0 line{stroke:var(--rubrica)} .fl-v0 polygon{fill:var(--rubrica)} .fl-v0 .t-vel{fill:var(--rubrica)}
.fl-vx line{stroke:var(--acento)} .fl-vx polygon{fill:var(--acento)} .fl-vx .t-vel{fill:var(--acento)}
.fl-vy line{stroke:var(--rubrica)} .fl-vy polygon{fill:var(--rubrica)} .fl-vy .t-vel{fill:var(--rubrica)}
.fl-v line{stroke:var(--suave);stroke-width:1.1;stroke-dasharray:3 2} .fl-v polygon{fill:var(--suave)}
.t-vel{font:500 14px var(--serif);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
#mango{cursor:grab;touch-action:none} .mango-toque{fill:transparent}
.mango{fill:var(--sup);stroke:var(--rubrica);stroke-width:2}
#mango:hover .mango,#mango:active .mango{fill:var(--rubrica)}
.trampa-on .fl-vx,.trampa-on .fl-vy,.trampa-on .fl-v{display:none}
.chips output{font-size:1.25rem}
.t-regla{font:500 9px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
`;
const plate = k.plateHtml({
  fig: "Lámina I",
  title: "Tiro parabólico",
  hint: J.instruccion,
  readout: `θ ${J.valoresIniciales.ang}° · t 0 s · x 0 m · y 0 m`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuenow="0">${figura}</div>`,
});
const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tiro parabólico · Códice Vivo</title>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
</head>
<body>
<main class="pagina">
  <header>
    <div class="marca-casa">Códice Vivo · Laboratorio</div>
    <h1 id="titulo">Tiro parabólico</h1>
    <p class="sub" id="subtitulo"></p>
  </header>
  <div class="rejilla">
    <div id="pasos-a" class="pasos"></div>
    <section class="tarjeta lab" aria-label="Laboratorio">
      <div class="predice">
        <h3>Predice antes de patear</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="iso escena">${plate}</div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="etq-r"></span>
          <output id="o-r" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div>
          <div class="fila"><label for="s-v0" id="l-v0"></label><output id="o-v0"></output></div>
          <input type="range" id="s-v0">
        </div>
        <div>
          <div class="fila"><label for="s-t" id="l-t"></label><output id="o-t"></output></div>
          <input type="range" id="s-t">
        </div>
        <div class="chips">
          <div class="chip"><span>v<sub>x</sub>, no cambia</span><output id="o-vx"></output></div>
          <div class="chip"><span>v<sub>y</sub> ahora</span><output id="o-vy"></output></div>
          <div class="chip"><span>Altura máxima</span><output id="o-h"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="patear" aria-keyshortcuts="b">Patear</button>
          <button type="button" class="boton sec" id="trampa" aria-pressed="false">¿Y con el tiempo de subida?</button>
          <button type="button" class="boton sec" id="inicio">Volver al inicio</button>
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
