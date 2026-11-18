// Lámina 2.0 del tiro parabólico (piloto de Láminas 2.0, ver docs/diseno-laminas-2.md).
// Uso (desde la raíz del repo):
//   node plantilla/figuras/tiro-parabolico-v2.mjs   → plantilla/interactivos/tiro-parabolico/v2/index.html
// No editar el HTML a mano: se regenera con este script. El kit de Anatomy (.claude/skills/anatomy, fuera del repo
// público) solo se usa aquí, al generar: la página no lo lleva dentro. La proyección del dibujo es afín, así que la
// página recibe solo su matriz (CFG.A) y con eso mueve el balón, la sombra y las marcas.
// Piezas compartidas: plantilla/laminas2/ (tiempo, predicción, cuaderno, herramientas, escenas, práctica).
// Lo propio del tema: v2/cancha.js (situación real) y v2/practica-tiro.js (8 problemas).
// El dibujo del riel viene del generador 2.5D+ (tiro-parabolico-2_5d.mjs); cuando se apruebe v2, ese se borra.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(RAIZ, ".claude", "skills", "anatomy");
const k = await import("file://" + join(SKILL, "kit", "iso-kit.mjs"));
const JSON_TEMA = join(RAIZ, "contenido", "fisica", "tiro-parabolico-interactivo.json");
const SALIDA = join(RAIZ, "plantilla", "interactivos", "tiro-parabolico", "v2", "index.html");
const J = JSON.parse(readFileSync(JSON_TEMA, "utf8"));

// ---------- Modelo del dibujo (unidades del mundo; z hacia arriba; el tiro va en el plano y = 0) ----------
const V0MAX = J.rangos.v0.max, G = J.valoresIniciales.g;
const RMAX = V0MAX * V0MAX / G;
const HMAX = (V0MAX * Math.sin(J.rangos.ang.max * Math.PI / 180)) ** 2 / (2 * G);
const M = 3;                                                     // unidades por metro
const XM = Math.ceil(RMAX / 10) * 10 + 5;                        // largo de la regla en m
const HM = Math.ceil(HMAX / 5) * 5;                              // alto del poste en m
const RB = 5.5, PAD_H = 0.8, ZB = RB + PAD_H;                    // balón (no a escala) y su base
const POSTE = -18;
const PLACA = { x: -34, y: -26, w: XM * M + 50, d: 52, r: 8 }, PLACA_H = 8, PATA_H = 5;
const REGLA = { y0: 13, y1: 21, z: 0.8 };
const TR = { r: 24, y: -6 };

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

// ---------- Piezas del riel ----------
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
  let cancha = "";
  for (let m = 10; m <= XM - 5; m += 10) cancha += k.lineOnTop([m * M, -19], [m * M, 10], 0, P);
  o.push(L(cancha, { tone: "faint" }));
  o.push(L(k.lineOnTop([0, 0], [(XM - 2) * M, 0], 0, P), { tone: "lo", dashed: true }));
  const pl = { x: PLACA.x + PLACA.w - 96, y: -23, w: 84, d: 8, r: 1 };
  o.push(S(k.slabOf(pl, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 4, pl.y + 5.6], 0.6, P, "x"), `TIRO PARABÓLICO · g = ${G} m/s²`, { size: 3, tone: "lo" }));
  o.push(D([at([pl.x + 1.8, pl.y + 4.5, 0.6]), at([pl.x + pl.w - 1.8, pl.y + 4.5, 0.6])], { size: 0.4 }));
  return o.join("");
}
// Regla de alcance: marca cada metro, mayor cada 5 m; número cada 10 m (en celular, cada 20 m).
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
    o.push(`<text class="t-regla${m % 20 ? " impar" : ""}" x="${fx(p[0])}" y="${fx(p[1] + 4)}" dy="0.8em" text-anchor="middle">${m}${m === XM - 5 ? " m" : ""}</text>`); }
  return o.join("");
}
// Banderín de caída (se mueve a lo largo de x; aparece cuando se conoce R).
function caida() {
  const o = [];
  o.push(L(k.ring(0, 0, 4.2, 0, P, 24), { tone: "mid" }));
  o.push(S(k.cylinder(0, 0, 0.9, 0, 26, P, 12), { tone: "hi", crease: "none" }));
  const a = at([0, 0, 26]), b = at([0, 0, 18]), c = at([11, 0, 22]);
  o.push(`<polygon class="banderin" points="${fx(a[0])},${fx(a[1])} ${fx(b[0])},${fx(b[1])} ${fx(c[0])},${fx(c[1])}"/>`);
  return `<g id="caida" class="solo-revelado">${o.join("")}</g>`;
}
// Poste-regla de altura detrás del punto de lanzamiento.
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
    o.push(`<text class="t-regla${m % 20 ? " impar" : ""}" x="${fx(p[0])}" y="${fx(p[1])}" dy="0.35em" text-anchor="end">${m}${ZB + (m + 10) * M > HM * M + 5 ? " m" : ""}</text>`); }
  return o.join("");
}
// Transportador de pie detrás del balón: marcas cada 5°, mayor cada 15°; 37° y 53° en dorado.
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
  return o.join("");
}
const base = () => S(k.cylinder(0, 0, 8, 0, PAD_H, P, 36, 0.2), { tone: "mid" }) + L(k.ring(0, 0, 5, PAD_H, P, 28), { tone: "faint" });
function balon() {
  const c = at([0, 0, ZB]), r = RB * P.scale;
  const o = [`<circle class="balon" cx="${fx(c[0])}" cy="${fx(c[1])}" r="${fx(r)}"/>`];
  o.push(`<path class="balon-sombra" d="M ${fx(c[0] - r * 0.15)} ${fx(c[1] + r * 0.99)} A ${fx(r)} ${fx(r)} 0 0 0 ${fx(c[0] + r * 0.99)} ${fx(c[1] - r * 0.15)} A ${fx(r * 0.82)} ${fx(r * 0.82)} 0 0 1 ${fx(c[0] - r * 0.15)} ${fx(c[1] + r * 0.99)} Z"/>`);
  o.push(L(k.sideRing([0, 0, ZB], RB, "x", P, 28) + k.ring(0, 0, RB, ZB, P, 28), { tone: "lo" }));
  o.push(`<circle class="balon-brillo" cx="${fx(c[0] - r * 0.38)}" cy="${fx(c[1] - r * 0.4)}" r="${fx(r * 0.2)}"/>`);
  return `<g id="balon">${o.join("")}</g>`;
}

const figura = k.figureSvg({
  width: W, height: H, label: J.figura.aria,
  body: [
    placa(), reglaAlcance(), poste(), transportador(), base(),
    `<g id="g-cima" class="oculto"><path id="guia-h" class="guia" d=""/><path id="guia-v" class="guia" d=""/><circle id="cima" class="cima" r="3"/><text id="t-h" class="t-h"></text></g>`,
    `<path id="parabola" class="parabola solo-revelado" d=""/><path id="ref" class="ref oculto" d=""/><text id="t-ref" class="t-ref oculto"></text>`,
    `<path id="estela" class="estela" d=""/><g id="marcas"></g>`,
    caida(), `<text id="t-caida" class="t-caida solo-revelado" text-anchor="middle"></text>`,
    `<g id="fantasma" class="solo-trampa"><path id="fant-v" class="fantasma" d=""/><path id="fant-b" class="fantasma" d="${k.ring(0, 0, RB, 0.1, P, 24)}"/><text id="t-fantasma" class="t-trampa" text-anchor="end"></text></g>`,
    `<path id="sombra" class="sombra" d="${k.ring(0, 0, RB, 0.05, P, 28)}"/>`,
    `<g><path id="arco" class="arco" d=""/><text id="t-ang" class="t-ang"></text></g>`,
    `<g id="fl-v0" class="flecha fl-v0"><line/><polygon/><text class="t-vel"></text></g>`,
    balon(),
    `<g id="mango"><circle class="mango-toque" r="22"/><circle class="mango" r="6"/></g>`,
    `<g id="capa-pred"></g><g id="capa-herr"></g>`,
  ],
});

// ---------- Datos para la página: matriz afín de la proyección y medidas ----------
const o0 = at([0, 0, 0]), dif = (p) => { const q = at(p); return [q[0] - o0[0], q[1] - o0[1]]; };
const CFG = { A: { o: o0, ex: dif([1, 0, 0]), ey: dif([0, 1, 0]), ez: dif([0, 0, 1]) }, M, RB, ZB, POSTE, XM, HM, W, H };
{ // la proyección debe ser afín (la página no lleva el kit)
  const p = [123, -7, 45], q = at(p), A = CFG.A, r = [A.o[0] + p[0] * A.ex[0] + p[1] * A.ey[0] + p[2] * A.ez[0], A.o[1] + p[0] * A.ex[1] + p[1] * A.ey[1] + p[2] * A.ez[1]];
  if (Math.hypot(q[0] - r[0], q[1] - r[1]) > 1e-6) throw new Error("La proyección del kit ya no es afín: revisa CFG.A");
}

// ---------- Lógica de la página (se serializa tal cual) ----------
function pagina(C, piezas) {
(async () => {
const { creaTiempo, creaPrediccion, preguntaOpciones, creaCuaderno, creaHerramientas, creaSelector, montaPractica, creaCancha, PROBLEMAS } = piezas;
const $ = (s) => document.querySelector(s);
const A = C.A;
const iso = (p) => [A.o[0] + p[0] * A.ex[0] + p[1] * A.ey[0] + p[2] * A.ez[0], A.o[1] + p[0] * A.ex[1] + p[1] * A.ey[1] + p[2] * A.ez[1]];
const mueve = (p) => { const q = iso(p); return `translate(${(q[0] - A.o[0]).toFixed(2)} ${(q[1] - A.o[1]).toFixed(2)})`; };

async function cargar(){
  const r = await fetch("../../../../contenido/fisica/tiro-parabolico-interactivo.json", {cache:"no-cache"});
  if (!r.ok) throw new Error(r.status);
  return await r.json();
}
let J;
try { J = await cargar(); }
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/tiro-parabolico-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, AP = J.aproximaciones, g = V.g, L2 = J.laminas2;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const svgSub = (s) => s.replace(/<sub>(.*?)<\/sub>/g, '<tspan dy="0.3em" font-size="72%">$1</tspan><tspan dy="-0.3em">​</tspan>');
const trig = (a) => AP[a] ? { sen: AP[a].sen, cos: AP[a].cos, examen: true } : { sen: Math.sin(a * Math.PI / 180), cos: Math.cos(a * Math.PI / 180), examen: false };
const tiro = (v0, a) => {
  const { sen, cos, examen } = trig(a), vx = v0 * cos, vy = v0 * sen, ts = vy / g, tv = 2 * ts;
  return { v0, a, sen, cos, examen, vx, vy, ts, tv, R: vx * tv, H: vy * vy / (2 * g), Rtrampa: vx * ts };
};
const A1 = Object.keys(AP).filter((x) => /^\d+$/.test(x)).map(Number).sort((a, b) => a - b); // [37, 53]

let v0 = V.v0, ang = V.ang, revelado = false, cimaVista = false, trampaOn = false, refOn = false, aterrizado = false;
const T = () => tiro(v0, ang);
const pos = (tt, s = T()) => { const u = Math.min(Math.max(tt, 0), s.tv); return [s.vx * u, Math.max(0, s.vy * u - g * u * u / 2)]; };
const vel = (tt, s = T()) => (tt >= s.tv - 1e-9 && tt > 0 ? null : [s.vx, s.vy - g * Math.max(0, tt)]);
const nota = $("#nota"), decir = (s) => { nota.textContent = s; };

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo + " · Física · Examen de admisión UNAM";
$("#l-v0").innerHTML = J.controles.v0 + ", v<sub>0</sub>";
$("#l-ang").textContent = J.controles.ang;
const sV0 = $("#s-v0"), sAng = $("#s-ang");
sV0.min = RG.v0.min; sV0.max = RG.v0.max; sV0.step = RG.v0.paso; sV0.value = v0;
sAng.min = RG.ang.min; sAng.max = RG.ang.max; sAng.step = RG.ang.paso; sAng.value = ang;

// ---------- Escena 1: el laboratorio (riel) ----------
const svg = $(".iso-svg"), dibLab = $("#lab-dibujo"), mango = $("#mango");
const Wp = (xm, ym) => iso([C.M * xm, 0, C.ZB + C.M * ym]);       // punto del plano del tiro (centro del balón)
const det = A.ex[0] * A.ez[1] - A.ex[1] * A.ez[0];
const dP = (pts) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
function ponFlecha(id, p0, p1, texto, lado = 1){
  const gr = $("#fl-" + id), ln = gr.querySelector("line"), pl = gr.querySelector("polygon"), tx = gr.querySelector("text");
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
  if (l < 2){ gr.style.display = "none"; return; } gr.style.display = "";
  const ux = dx / l, uy = dy / l, cab = Math.min(10, l * 0.6), an = cab * 0.5;
  const bx = p1[0] - ux * cab, by = p1[1] - uy * cab;
  ln.setAttribute("x1", p0[0].toFixed(1)); ln.setAttribute("y1", p0[1].toFixed(1)); ln.setAttribute("x2", (bx + ux).toFixed(1)); ln.setAttribute("y2", (by + uy).toFixed(1));
  pl.setAttribute("points", `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${(bx - uy * an).toFixed(1)},${(by + ux * an).toFixed(1)} ${(bx + uy * an).toFixed(1)},${(by - ux * an).toFixed(1)}`);
  /* el texto va más allá de la punta, para que no se salga por la izquierda en celular */
  tx.setAttribute("x", (p1[0] + 8).toFixed(1)); tx.setAttribute("y", (p1[1] - 6).toFixed(1));
  tx.setAttribute("text-anchor", "start");
  tx.innerHTML = svgSub(texto);
}
const mostrar = (sel, on) => $(sel).classList.toggle("oculto", !on);
const NS = "http://www.w3.org/2000/svg";
const lab = {
  svg, capaPrediccion: $("#capa-pred"), capaHerramientas: $("#capa-herr"), suelo: -C.ZB / C.M, bandera: 9,
  aPantalla: (w) => Wp(w[0], w[1]),
  dePantalla: ([sx, sy]) => { const b = iso([0, 0, C.ZB]), dx = sx - b[0], dy = sy - b[1]; return [(dx * A.ez[1] - dy * A.ez[0]) / det / C.M, (A.ex[0] * dy - A.ex[1] * dx) / det / C.M]; },
  escalaTexto: () => C.W / (svg.clientWidth || C.W),
  pxPorMetro: () => Math.hypot(A.ex[0], A.ex[1]) * C.M,
  encuadra() {},
  pinta(E) {
    const s = E.s, t = E.t, [bx, by] = E.pos, kk = lab.escalaTexto();
    svg.style.setProperty("--k", kk.toFixed(3));
    svg.classList.toggle("estrecha", kk > 1.35);
    const curva = (r, hasta, n = 64) => { const pts = []; for (let i = 0; i <= n; i++){ const [x, y] = pos(hasta * i / n, r); pts.push(Wp(x, y)); } return dP(pts); };
    $("#balon").setAttribute("transform", mueve([C.M * bx, 0, C.M * by]));
    $("#sombra").setAttribute("transform", mueve([C.M * bx, 0, 0]));
    $("#estela").setAttribute("d", t > 0 ? curva(s, Math.min(t, s.tv), 48) : "");
    const gm = $("#marcas"); gm.textContent = "";
    E.marcas.forEach((tm) => { const [x, y] = pos(tm, s), p = Wp(x, y), c = document.createElementNS(NS, "circle"); c.setAttribute("cx", p[0].toFixed(1)); c.setAttribute("cy", p[1].toFixed(1)); c.setAttribute("r", (2.6 * Math.min(kk, 1.6)).toFixed(1)); c.setAttribute("class", "marca-t"); gm.appendChild(c); });
    svg.classList.toggle("revelado", E.revelado);
    if (E.revelado) $("#parabola").setAttribute("d", curva(s, s.tv));
    mostrar("#ref", !!E.ref); mostrar("#t-ref", !!E.ref);
    if (E.ref){ $("#ref").setAttribute("d", curva(E.ref, E.ref.tv)); const c = Wp(E.ref.R * 0.5, E.ref.H), tr = $("#t-ref");
      tr.setAttribute("x", c[0].toFixed(1)); tr.setAttribute("y", (c[1] - 8).toFixed(1)); tr.textContent = `${E.ref.a}°`; }
    mostrar("#g-cima", E.cimaVista || E.revelado);
    const cx = s.vx * s.ts, pc = Wp(cx, s.H);
    $("#cima").setAttribute("cx", pc[0].toFixed(1)); $("#cima").setAttribute("cy", pc[1].toFixed(1));
    $("#guia-h").setAttribute("d", dP([pc, iso([C.POSTE + 1.6, 0, C.ZB + C.M * s.H])]));
    $("#guia-v").setAttribute("d", dP([pc, iso([C.M * cx, 0, 0])]));
    const ph = iso([C.POSTE + 6, 0, C.ZB + C.M * s.H]), th = $("#t-h");
    th.setAttribute("x", ph[0].toFixed(1)); th.setAttribute("y", (ph[1] - 6).toFixed(1)); th.textContent = `H = ${num(s.H)} m`;
    $("#caida").setAttribute("transform", mueve([C.M * s.R, 0, 0]));
    const pcai = iso([C.M * s.R, 0, 34]), tc = $("#t-caida"); tc.setAttribute("x", pcai[0].toFixed(1)); tc.setAttribute("y", pcai[1].toFixed(1)); tc.textContent = `R = ${num(s.R)} m`;
    svg.classList.toggle("trampa-on", E.trampa);
    const pf = iso([C.M * s.Rtrampa, 0, 0]);
    $("#fant-v").setAttribute("d", dP([pc, pf]));
    $("#fant-b").setAttribute("transform", mueve([C.M * s.Rtrampa, 0, 0]));
    const tf = $("#t-fantasma"); tf.setAttribute("x", (pf[0] - 6).toFixed(1)); tf.setAttribute("y", (pf[1] - 14 * kk).toFixed(1)); tf.textContent = `t de subida: ${num(s.Rtrampa)} m`;
    const a = s.a * Math.PI / 180, o = Wp(0, 0), rA = 15;
    const arc = []; for (let i = 0; i <= 24; i++){ const b = a * i / 24; arc.push(iso([rA * Math.cos(b), 0, C.ZB + rA * Math.sin(b)])); }
    $("#arco").setAttribute("d", dP(arc));
    const pa = iso([(rA + 10) * Math.cos(a / 2), 0, C.ZB + (rA + 10) * Math.sin(a / 2)]), ta = $("#t-ang");
    ta.setAttribute("x", (pa[0] + 3).toFixed(1)); ta.setAttribute("y", (pa[1] + 5).toFixed(1)); ta.textContent = `${s.a}°`;
    const KV = 2.1, tip = Wp(s.vx * KV / C.M, s.vy * KV / C.M);
    ponFlecha("v0", o, tip, tpl(J.figura.v0, {v0:num(s.v0)}), -1);
    $("#fl-v0").style.visibility = mango.style.visibility = E.t > 0 ? "hidden" : "";
    mango.setAttribute("transform", `translate(${tip[0].toFixed(1)} ${tip[1].toFixed(1)})`);
    $("#mango .mango-toque").setAttribute("r", (22 * kk).toFixed(1)); $("#mango .mango").setAttribute("r", (6 * Math.min(kk, 1.5)).toFixed(1));
  },
  mostrar(si) { dibLab.hidden = !si; }
};

// ---------- Escena 2: la situación real (cancha, tinta) ----------
const SIT = L2.situacion;
const cancha = creaCancha($("#cancha"), { barrera: SIT.barrera, porteria: SIT.porteria, alRedimensionar: () => { if (esc === cancha) redibuja(); } });
cancha.suelo = 0; cancha.bandera = 4;
cancha.mostrar = ((m) => (si) => { $("#cancha").hidden = !si; m(si); })(cancha.mostrar);
let esc = lab;

// ---------- Cuaderno ----------
const cuaderno = creaCuaderno({ boton: $("#b-cuaderno"), titulo: "Cuaderno", secciones: [
  { id: "datos", titulo: "Datos" }, { id: "solucion", titulo: "Paso a paso" }, { id: "prediccion", titulo: "Tu predicción vs resultado" },
  { id: "medidas", titulo: "Medidas" }, { id: "truco", titulo: "Truco de examen" }] });
cuaderno.escribe("truco", ["El tiempo lo da lo vertical: t = 2 v<sub>0y</sub> ÷ g.", "La distancia, lo horizontal: R = v<sub>x</sub> × t.",
  `${A1.join("° o ")}°: triángulo 3-4-5 → sen y cos de 0.6 y 0.8.`, "Cuidado: el tiempo de subida es solo la mitad del vuelo."], { anima: false });
function escribeDatos(){
  const s = T();
  cuaderno.escribe("datos", [`v<sub>0</sub> = ${num(v0)} m/s · θ = ${ang}° · g = ${num(g)} m/s²`,
    s.examen ? `sen ${ang}° = ${num(s.sen)} · cos ${ang}° = ${num(s.cos)} <span class="l2-c-gris">(3-4-5)</span>` : `sen ${ang}° ≈ ${num(s.sen, 3)} · cos ${ang}° ≈ ${num(s.cos, 3)} <span class="l2-c-gris">(calculadora)</span>`], { anima: false });
}
function escribeSolucion(completa, anima = true){
  const s = T(), n = (v, d = 2) => num(v, d), cs = n(s.cos, 3), sn = n(s.sen, 3);
  const l = [`v<sub>x</sub> = v<sub>0</sub> cos θ = ${n(v0)} × ${cs} = <b>${n(s.vx)} m/s</b> <span class="l2-c-gris">(no cambia)</span>`,
    `v<sub>0y</sub> = v<sub>0</sub> sen θ = ${n(v0)} × ${sn} = <b>${n(s.vy)} m/s</b>`];
  if (completa) l.push(`t<sub>subida</sub> = v<sub>0y</sub> ÷ g = ${n(s.vy)} ÷ ${n(g)} = <b>${n(s.ts)} s</b>`,
    `t<sub>vuelo</sub> = 2 × ${n(s.ts)} = <b>${n(s.tv)} s</b>`,
    `<span class="l2-c-coral">R = v<sub>x</sub> × t<sub>vuelo</sub> = ${n(s.vx)} × ${n(s.tv)} = <b>${n(s.R)} m</b></span>`,
    `<span class="l2-c-verde">H = v<sub>0y</sub>² ÷ (2g) = ${n(s.vy)}² ÷ ${n(2 * g)} = <b>${n(s.H)} m</b></span>`,
    `En la cima: v<sub>y</sub> = 0, pero v = v<sub>x</sub> = ${n(s.vx)} m/s.`);
  else l.push('<span class="l2-c-gris">Patea para ver el resto.</span>');
  cuaderno.escribe("solucion", l, { anima, cuenta: 1 });
}

// ---------- Predicción ----------
const PR = L2.prediccion;
let pred = null, fijaSinJugar = false;
pred = creaPrediccion({
  panel: $("#prediccion"),
  texto: { titulo: "Predice antes de patear", instruccion: PR.instruccion, fijar: "Fijar predicción y patear", otra: "Predecir otra vez", fijada: "Predicción fijada. Mira el tiro." },
  marcadores: [
    { id: "R", etiqueta: PR.alcance, unidad: "m", min: 0, max: C.XM - 5, paso: 0.5, valor: 30, tol: PR.tolAlcance,
      /* banderín de ~45 px de alto en pantalla, sea cual sea la escena */
      geo: (v) => { const h = 45 * esc.escalaTexto() / esc.pxPorMetro(); return { asa: [v, esc.suelo], linea: [[v, esc.suelo], [v, esc.suelo + h]], texto: [v + 0.15 * h, esc.suelo + h * 1.12], ancla: "start" }; },
      valorDe: (p) => p[0] },
    { id: "H", etiqueta: PR.altura, unidad: "m", min: 0, max: C.HM, paso: 0.5, valor: 5, tol: PR.tolAltura,
      geo: (v) => { const xa = Math.max(3, (pred ? pred.valores().R : 30) / 2), w = 30 * esc.escalaTexto() / esc.pxPorMetro(); return { asa: [xa, v], linea: [[xa - w, v], [xa + w, v]], texto: [xa - w * 1.1, v], ancla: "end" }; },
      valorDe: (p) => p[1] }
  ],
  alFijar: () => { if (fijaSinJugar || reloj.corriendo) return; if (reloj.t >= T().tv - 1e-9) reloj.pon(0); reloj.juega(); },
  alReiniciar: () => { reloj.detiene(); revelado = false; cimaVista = false; aterrizado = false; reloj.pon(0); decir(""); }
});

// ---------- Tiempo ----------
const reloj = creaTiempo($("#tiempo"), {
  duracion: T().tv, paso: L2.marcasCada,
  antesDeJugar: () => { if (pred.estado === "abierta") { pred.fija(); return false; } return true; },
  /* mover la línea de tiempo también cuenta como lanzar: la predicción queda fijada tal como está */
  alCambiar: (t) => { if (t > 0 && pred.estado === "abierta") { fijaSinJugar = true; pred.fija(); fijaSinJugar = false; } render(); if (t >= T().tv - 1e-9) aterriza(); }
});

// ---------- Herramientas ----------
const herr = creaHerramientas({
  barra: $("#herramientas"), reloj: () => reloj.t,
  movil: { pos: (t) => pos(t), vel: (t) => vel(t) },
  colocaRegla: () => ({ a: [0, esc.suelo], b: [Math.round(T().R / 2), esc.suelo] }),
  colocaTransportador: () => ({ v: [0, 0], ang: 45 }),
  anota: (txt) => cuaderno.anota("medidas", txt)
});

// ---------- Dibujo que cambia ----------
function render(){
  const s = T(), t = reloj.t, enSuelo = t >= s.tv - 1e-9 && t > 0;
  if (t >= s.ts - 1e-9) cimaVista = true;
  const E = { s, t, pos: pos(t, s), revelado, cimaVista, trampa: trampaOn, enAire: t > 0 && !enSuelo, enSuelo,
    marcas: reloj.marcas(Math.min(t, s.tv)), ref: refOn ? tiro(v0, A1[0]) : null };
  esc.pinta(E);
  herr.vectores(!reloj.corriendo && t > 0 && !enSuelo);
  sV0.style.setProperty("--p", (100 * (v0 - RG.v0.min) / (RG.v0.max - RG.v0.min)) + "%");
  sAng.style.setProperty("--p", (100 * (ang - RG.ang.min) / (RG.ang.max - RG.ang.min)) + "%");
  $("#o-v0").textContent = tpl(J.controles.valorV0, {v:num(v0)});
  $("#o-ang").textContent = tpl(J.controles.valorAng, {v:ang});
  sV0.setAttribute("aria-valuetext", tpl(J.controles.valorV0, {v:num(v0)}));
  sAng.setAttribute("aria-valuetext", tpl(J.controles.valorAng, {v:ang}));
  if (dibLab.querySelector(".iso-stage")) { const st = dibLab.querySelector(".iso-stage"); st.setAttribute("aria-valuenow", ang); st.setAttribute("aria-valuetext", `${ang}°, v₀ = ${num(v0)} m/s`); }
}
function redibuja(){ render(); pred.redibuja(); herr.redibuja(); }
function encuadra(){
  const s = T(), p = pred ? pred.valores() : { R: 0, H: 0 };
  cancha.encuadra({ x1: Math.max(s.R, p.R) + 12, y1: Math.max(s.H, p.H) * 1.2 + 3 });
}
function aterriza(){
  if (aterrizado) return;
  aterrizado = true; revelado = true;
  const s = T();
  let extra = "";
  if (pred.estado === "fijada") {
    const res = pred.compara({ R: s.R, H: s.H });
    const r = Object.fromEntries(res.map((x) => [x.id, x]));
    cuaderno.anota("prediccion", `${ang}°, ${num(v0)} m/s → alcance: tú ${num(r.R.pred, 1)} m, real ${num(s.R)} m <span class="${r.R.acierto ? "l2-c-verde" : "l2-c-coral"}">(${r.R.texto.toLowerCase()})</span>`);
    cuaderno.anota("prediccion", `altura: tú ${num(r.H.pred, 1)} m, real ${num(s.H)} m <span class="${r.H.acierto ? "l2-c-verde" : "l2-c-coral"}">(${r.H.texto.toLowerCase()})</span>`);
    extra = ` ${r.R.texto} en el alcance; ${r.H.texto.charAt(0).toLowerCase() + r.H.texto.slice(1)} en la altura.`;
  }
  escribeSolucion(true);
  decir(`Cae a ${num(s.R)} m después de ${num(s.tv)} s: v${"ₓ"} = ${num(s.vx)} m/s todo el vuelo × ${num(s.tv)} s.${extra} Abre el cuaderno para ver cada paso.`);
  render();
}
function nuevoTiro(){
  reloj.detiene(); revelado = false; cimaVista = false; aterrizado = false; refOn = false;
  if (trampaOn) ponTrampa(false);
  reloj.duracion(T().tv);
  if (pred.estado !== "abierta") pred.reinicia(); else reloj.pon(0);
  escribeDatos(); escribeSolucion(false, false); encuadra(); redibuja();
}
function ponAng(a){ a = Math.max(RG.ang.min, Math.min(RG.ang.max, Math.round(a))); if (a === ang) return; ang = a; sAng.value = a; nuevoTiro(); }
function ponTrampa(si){
  trampaOn = si; const b = $("#trampa"); b.setAttribute("aria-pressed", si); b.textContent = si ? "Ocultar la trampa" : "¿Y con el tiempo de subida?";
  const s = T();
  if (si){ revelado = true; cimaVista = true; decir(`Con el tiempo de subida (${num(s.ts)} s) solo llegas a ${num(s.vx)} × ${num(s.ts)} = ${num(s.Rtrampa)} m: justo debajo de la cima. El balón también baja: el vuelo dura ${num(s.tv)} s y cae a ${num(s.R)} m.`); }
  render();
}

// ---------- Escenas ----------
function usaEscena(id){
  esc = id === "real" ? cancha : lab;
  lab.mostrar(esc === lab); cancha.mostrar(esc === cancha);
  if (esc === cancha) encuadra();
  pred.usa(esc); herr.usa(esc); redibuja();
}
const selector = creaSelector($("#escenas"), { etiqueta: "Escena", opciones: [{ id: "lab", etiqueta: L2.escenas.laboratorio }, { id: "real", etiqueta: L2.escenas.real }], clave: "cv-l2-tiro-escena", alCambiar: usaEscena });
if ("ResizeObserver" in window) new ResizeObserver(() => { if (esc === lab) redibuja(); }).observe(dibLab);

// ---------- Controles ----------
sV0.addEventListener("input", () => { v0 = +sV0.value; nuevoTiro(); });
sAng.addEventListener("input", () => { ponAng(+sAng.value); });
$("#trampa").addEventListener("click", () => ponTrampa(!trampaOn));
$("#inicio").addEventListener("click", () => { v0 = V.v0; ang = V.ang; sV0.value = v0; sAng.value = ang; nuevoTiro(); decir("De vuelta al tiro del examen."); });
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input,textarea,select,[contenteditable]")) return;
  e.preventDefault(); if (reloj.corriendo) reloj.pausa(); else if (pred.estado === "abierta") pred.fija(); else reloj.juega();
});
const stage = dibLab.querySelector(".iso-stage");
stage.addEventListener("keydown", (e) => {
  const p = RG.ang.paso, m = {ArrowUp:p, ArrowRight:p, ArrowDown:-p, ArrowLeft:-p, PageUp:5*p, PageDown:-5*p}[e.key];
  if (e.key === "Home"){ e.preventDefault(); ponAng(RG.ang.min); return; }
  if (e.key === "End"){ e.preventDefault(); ponAng(RG.ang.max); return; }
  if (m === undefined) return;
  e.preventDefault(); ponAng(ang + m);
});
// Arrastre de la flecha de lanzamiento (solo en el laboratorio)
const svgPt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
let arr = false;
mango.addEventListener("pointerdown", (e) => { if (reloj.corriendo) return; arr = true; mango.setPointerCapture(e.pointerId); e.preventDefault(); });
mango.addEventListener("pointermove", (e) => {
  if (!arr) return;
  const q = svgPt(e), [wx, wz] = lab.dePantalla([q.x, q.y]);
  if (wx > 0.2 || wz > 0.2) ponAng(Math.atan2(wz, Math.max(wx, 0.01)) * 180 / Math.PI);
});
const soltar = () => { arr = false; };
mango.addEventListener("pointerup", soltar); mango.addEventListener("pointercancel", soltar);

// ---------- Los 6 pasos ----------
const BIEN = '<svg class="ico b" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>';
const MAL = '<svg class="ico m" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
function opciones(cont, ops){
  cont.innerHTML = "";
  ops.forEach(o => {
    const b = document.createElement("button"); b.type = "button"; b.className = "op";
    b.innerHTML = `<span>${o.t}</span><span class="res" aria-live="polite"></span>`;
    b.addEventListener("click", () => {
      b.classList.add(o.ok ? "bien" : "mal");
      b.querySelector(".res").innerHTML = `${o.ok ? BIEN : MAL} <b>${o.ok ? J.prueba.marcaCorrecta : J.prueba.marcaIncorrecta}.</b> ${o.e}`;
    });
    cont.append(b);
  });
}
const irLab = () => $(".lab").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
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
    "Patea en la lámina y pausa: la flecha v<sub>x</sub> mide lo mismo todo el vuelo; v<sub>y</sub> se acorta al subir, vale 0 en la cima y crece al bajar."]},
  {n:3, titulo:"Ejemplo resuelto", p:[`Componentes: v<sub>x</sub> = ${n.v0} × ${n.cos} = <b>${n.vx} m/s</b>; v<sub>0y</sub> = ${n.v0} × ${n.sen} = <b>${n.vy} m/s</b>.`,
    `Tiempo de subida: ${n.vy} ÷ ${n.g} = ${n.ts} s. Tiempo de vuelo: 2 × ${n.ts} = <b>${n.tv} s</b>.`,
    `Alcance: ${n.vx} × ${n.tv} = <b>${n.R} m</b> → respuesta C.`, `(Altura máxima: ${n.vy}² ÷ (2 × ${n.g}) = ${n.H} m.)`],
    boton:["Escribirlo en el cuaderno", () => { v0 = V.v0; ang = V.ang; sV0.value = v0; sAng.value = ang; nuevoTiro(); escribeSolucion(true, false); cuaderno.ve("solucion"); }]},
  {n:4, titulo:"La trampa", p:[`Usar el tiempo de subida (${n.ts} s) como si fuera el de vuelo da ${n.vx} × ${n.ts} = ${n.Rt} m, la opción A. El balón sube y también baja: el tiempo de vuelo es el doble.`,
    `Las otras también tienen dueño: B (${n.Rvy} m) multiplica por v<sub>0y</sub> en vez de v<sub>x</sub>, y D (${n.R45} m) usa v<sub>0</sub>² ÷ g, que solo vale para 45°.`],
    boton:["Ver la trampa en la lámina", () => { if (!trampaOn) ponTrampa(true); irLab(); }]},
  {n:5, titulo:"Truco de examen", p:['Separa siempre: el tiempo lo da lo vertical <span class="formula">t = 2 v<sub>0y</sub> ÷ g</span> y la distancia, lo horizontal <span class="formula">v<sub>x</sub> × t</span>.',
    `Si te dan ${A1.join("° o ")}°, piensa en el triángulo 3-4-5: las componentes salen exactas.`],
    boton:["Abrir el truco en el cuaderno", () => cuaderno.ve("truco")], complementarios:true},
  {n:6, titulo:J.prueba.titulo, enunciado:J.prueba.pregunta, ops:J.prueba.opciones.map(o => ({t:`${o.letra}) ${o.texto}`, ok:o.correcta, e:o.retro})), practica:true}
];
PASOS.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.p || []).map(t => `<p>${t}</p>`).join("");
  if (p.enunciado){ s.insertAdjacentHTML("beforeend", `<p>${p.enunciado}</p>`); const l = document.createElement("div"); l.className = "opciones"; opciones(l, p.ops); s.append(l); }
  if (p.boton){ const b = document.createElement("button"); b.type = "button"; b.className = "boton sec"; b.textContent = p.boton[0]; b.addEventListener("click", p.boton[1]); s.append(b); }
  if (p.complementarios){
    const c = document.createElement("div"); c.className = "predice"; s.append(c);
    const [aA, aB] = A1, a = tiro(V.v0, aA), b = tiro(V.v0, aB);
    preguntaOpciones(c, { pregunta: `Predice: si pateas a ${aB}° en vez de ${aA}° (misma rapidez), ¿cae más cerca, igual o más lejos?`, opciones: [
      {t:"Más cerca", e:`Tienta pensar que más ángulo es menos avance: v<sub>x</sub> baja de ${num(a.vx)} a ${num(b.vx)} m/s. Pero el vuelo dura más (${num(a.tv)} → ${num(b.tv)} s) y se compensa: ${num(b.R)} m.`},
      {t:"Igual", ok:true, e:`${aA}° y ${aB}° suman 90°: son complementarios. Sen y cos se intercambian, así que v<sub>x</sub> × t da lo mismo: ${num(b.R)} m.`},
      {t:"Más lejos", e:`Sube más (H = ${num(b.H)} m contra ${num(a.H)} m), pero avanza más lento (v<sub>x</sub> = ${num(b.vx)} m/s). Cae en el mismo lugar: ${num(b.R)} m.`}],
      alElegir: () => { v0 = V.v0; sV0.value = v0; ang = aB; sAng.value = aB; nuevoTiro(); refOn = true; pred.pon({ R: a.R }); pred.fija(); irLab(); } });
  }
  if (p.practica){
    s.insertAdjacentHTML("beforeend", `<h3 class="sub-paso">Práctica: 8 problemas</h3><p class="pie">Números nuevos en cada intento. Si fallas, la pista te dice qué error cometiste.</p>`);
    const pr = document.createElement("div"); s.append(pr);
    montaPractica(pr, { id: "tiro-parabolico", problemas: PROBLEMAS,
      resumen: { titulo: "Lo que ya dominas", puntos: ["Descomponer v₀ con el triángulo 3-4-5.", "El tiempo sale de lo vertical; la distancia, de lo horizontal.", "45° da el alcance máximo; los complementarios caen igual."] },
      examen: { reactivos: 10, minutos: 12 } });
  }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});

$("#pie").innerHTML = `<i>${tpl(J.figura.pie, {g:num(g)})}</i> Modelo: ${A1.join("° y ")}° usan los valores del examen (sen y cos de 0.6 y 0.8); los demás ángulos, la calculadora.
 En el laboratorio, la cancha y las reglas están en metros a la misma escala; en la cancha de fútbol, la barrera (${num(SIT.barrera.alto)} m) y la portería (${num(SIT.porteria.alto)} m) también. El balón y las flechas no están a escala.
 El rastro marca un punto cada ${num(L2.marcasCada)} s. Teclas: B patea o pausa; con el laboratorio enfocado, las flechas cambian el ángulo.`;

escribeDatos(); escribeSolucion(false, false);
usaEscena(selector.id);
window.__tiro = { set:(o) => { if ("v0" in o){ v0 = o.v0; sV0.value = v0; } if ("ang" in o){ ang = o.ang; sAng.value = ang; } nuevoTiro(); if ("t" in o) reloj.pon(o.t); },
  reloj, pred, cuaderno, herr, selector, estado:() => ({ v0, ang, t: reloj.t, revelado, aterrizado, pred: pred.estado }) };
})();
}

// ---------- Página ----------
const CSS_PAGINA = `
@font-face{font-family:"EB Garamond";font-style:normal;font-weight:400 600;font-display:swap;src:url(../../../codice/fuentes/eb-garamond.woff2) format("woff2")}
:root{
  --bg:#F6F1E6;--sup:#FFFCF6;--texto:#2E2117;--suave:#77634F;--borde:#E5DACA;--borde-fuerte:#CDBEA5;
  --acento:#2F6F73;--rubrica:#A5352A;--dorado:#B08A3E;--bien:#2F7D5B;--mal:#A5352A;--agua-sup:#D9EEEC;--sobre-acento:#FFFFFF;
  --serif:"EB Garamond","Iowan Old Style",Georgia,serif;
  color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#17120D;--sup:#211912;--texto:#EFE4CF;--suave:#B6A385;--borde:#382C20;--borde-fuerte:#4D3D2C;
  --acento:#7FB3B0;--rubrica:#E07A5F;--dorado:#D9B26A;--bien:#7FC9A0;--mal:#E07A5F;--agua-sup:#8CC4C0;--sobre-acento:#17120D;color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#17120D;--sup:#211912;--texto:#EFE4CF;--suave:#B6A385;--borde:#382C20;--borde-fuerte:#4D3D2C;
  --acento:#7FB3B0;--rubrica:#E07A5F;--dorado:#D9B26A;--bien:#7FC9A0;--mal:#E07A5F;--agua-sup:#8CC4C0;--sobre-acento:#17120D;color-scheme:dark}
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
  --anatomy-text:#BCAE98;--anatomy-muted:#7E715F;--anatomy-paper:#211912;--anatomy-face:#2A2018;--anatomy-top:#2B2119;
  --anatomy-shade-0:#1A140E;--anatomy-shade-1:#1D1610;--anatomy-shade-2:#201812;--anatomy-shade-3:#241B14;
  --anatomy-lit-top:#3A2E23;--anatomy-lit-shade:#2C2219;
  --anatomy-hi:#E3D7C3;--anatomy-mid:#7C6F5F;--anatomy-lo:#4B4035;--anatomy-faint:#33291F;--anatomy-lit:#FFF7E8;
  --anatomy-halo:#050302;--anatomy-halo-opacity:.85;--anatomy-dot:#E3D7C3}}
:root[data-theme="dark"] .iso{
  --anatomy-text:#BCAE98;--anatomy-muted:#7E715F;--anatomy-paper:#211912;--anatomy-face:#2A2018;--anatomy-top:#2B2119;
  --anatomy-shade-0:#1A140E;--anatomy-shade-1:#1D1610;--anatomy-shade-2:#201812;--anatomy-shade-3:#241B14;
  --anatomy-lit-top:#3A2E23;--anatomy-lit-shade:#2C2219;
  --anatomy-hi:#E3D7C3;--anatomy-mid:#7C6F5F;--anatomy-lo:#4B4035;--anatomy-faint:#33291F;--anatomy-lit:#FFF7E8;
  --anatomy-halo:#050302;--anatomy-halo-opacity:.85;--anatomy-dot:#E3D7C3}
html{background:var(--bg)}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--texto);font:400 17px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;-webkit-text-size-adjust:100%}
output{font-variant-numeric:tabular-nums}
sub,sup{font-size:.72em;line-height:0;position:relative;vertical-align:baseline}
sub{bottom:-.25em} sup{top:-.45em}
.pagina{max-width:1160px;margin:0 auto;padding:20px 12px 40px}
header{margin-bottom:18px}
.marca-casa{font:italic 400 1.05rem/1.2 var(--serif);color:var(--rubrica)}
h1{margin:2px 0 4px;font:500 clamp(2.1rem,8vw,3.1rem)/1.02 var(--serif);letter-spacing:-.015em}
.sub{margin:0;padding-bottom:12px;border-bottom:3px double var(--borde-fuerte);color:var(--suave)}
.rejilla{display:grid;gap:16px;grid-template-columns:minmax(0,1fr);grid-template-areas:"a" "lab" "b"}
#pasos-a{grid-area:a} #pasos-b{grid-area:b} .lab{grid-area:lab}
.pasos{display:grid;gap:16px;align-content:start}
.tarjeta{background:var(--sup);border:1px solid var(--borde);border-radius:12px;padding:18px 16px 16px;display:grid;gap:6px;justify-items:start}
.tarjeta>*{max-width:100%}
.tarjeta>.opciones,.tarjeta>.predice,.tarjeta>div{justify-self:stretch}
.tarjeta h2{display:flex;align-items:center;gap:10px;margin:0 0 4px;font:500 1.4rem/1.15 var(--serif)}
.n{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;border:1.5px solid var(--rubrica);color:var(--rubrica);font:500 1.05rem/1 var(--serif);font-variant-numeric:lining-nums}
.tarjeta p{margin:0;max-width:62ch}
.sub-paso{margin:14px 0 0;font:500 1.25rem/1.2 var(--serif);color:var(--rubrica)}
.formula{display:inline-block;padding:4px 10px;border-radius:8px;background:var(--bg);font:500 1.2rem var(--serif);font-variant-numeric:lining-nums}
.opciones{display:grid;gap:8px;margin-top:6px}
.op{font:inherit;color:var(--texto);text-align:left;background:var(--sup);border:1.5px solid var(--borde);border-radius:12px;padding:12px 14px;min-height:48px;cursor:pointer}
@media (hover:hover){.op:hover{border-color:var(--suave)}}
.op:focus-visible,.boton:focus-visible,input:focus-visible,.iso-stage:focus-visible{outline:3px solid var(--acento);outline-offset:2px}
.op .res{display:block;margin-top:4px;font-size:.92rem;color:var(--suave)}
.op.bien{border:2px solid var(--bien)} .op.mal{border:2px dashed var(--mal)}
.op:disabled{cursor:default}
.ico{width:1em;height:1em;vertical-align:-.15em;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.ico.b{stroke:var(--bien)} .ico.m{stroke:var(--mal)}
.lab{padding:10px 10px 16px;border:3px double var(--borde-fuerte);display:grid;gap:12px;justify-items:stretch}
.predice{background:var(--bg);border-radius:12px;padding:12px 14px;margin-top:6px}
.lab-barra{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.b-cuaderno{display:inline-flex;align-items:center;gap:8px;font:600 1rem/1 var(--sans,system-ui);min-height:44px;padding:0 16px;border-radius:999px;border:2px solid var(--texto);background:var(--sup);color:var(--texto);cursor:pointer}
.b-cuaderno svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.b-cuaderno:focus-visible{outline:3px solid var(--acento);outline-offset:2px}
.escenario{position:relative;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px var(--borde);background:var(--sup)}
.escenario .iso-figure{margin:0}
.escenario .iso-svg{display:block;width:100%;height:auto}
#lab-dibujo[hidden],#cancha[hidden]{display:none}
#cancha{aspect-ratio:640/340;background:#f3ead6}
.iso-stage{touch-action:pan-y;user-select:none;-webkit-user-select:none}
.controles{display:grid;gap:10px}
.fila{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-weight:600}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:36px;margin:0;background:transparent;cursor:pointer;--p:0%}
input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:linear-gradient(to right,var(--acento) var(--p),var(--borde) var(--p))}
input[type=range]::-moz-range-track{height:8px;border-radius:4px;background:var(--borde)}
input[type=range]::-moz-range-progress{height:8px;border-radius:4px;background:var(--acento)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-9px;border-radius:50%;background:var(--sup);border:3px solid var(--acento);box-shadow:inset 0 0 0 4px var(--sup),inset 0 0 0 10px var(--dorado)}
input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--sup);border:3px solid var(--acento)}
.nota{margin:0;color:var(--texto);min-height:1.5em}
.botones{display:flex;gap:8px;flex-wrap:wrap}
.boton{font:inherit;font-weight:600;border-radius:999px;padding:10px 18px;min-height:44px;cursor:pointer;border:1.5px solid var(--acento)}
.boton.pri{background:var(--acento);color:var(--sobre-acento)} .boton.sec{background:transparent;color:var(--acento)}
.boton.sec[aria-pressed="true"]{border-color:var(--rubrica);color:var(--rubrica)}
.pie{margin:0;font-size:.9rem;color:var(--suave);max-width:70ch}
.pie i{font-family:var(--serif);font-size:1.05rem;color:var(--texto)}
@media (min-width:880px){
  .pagina{padding:36px 28px 56px}
  .rejilla{grid-template-columns:minmax(0,1fr) minmax(0,1.45fr);grid-template-rows:auto 1fr;grid-template-areas:"a lab" "b lab";column-gap:24px;align-items:start}
  .lab{padding:14px 14px 18px}
}
/* Dibujo del riel. --k = unidades del SVG por px: los textos de la escena miden lo mismo en pantalla (mín. 14 px). */
.iso-svg{--k:1}
.solo-revelado{display:none} .revelado .solo-revelado{display:inline}
.oculto{display:none}
.solo-trampa{display:none} .trampa-on .solo-trampa{display:inline}
.balon{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:.8}
.balon-sombra{fill:var(--anatomy-shade-0)} .balon-brillo{fill:var(--anatomy-lit-top)}
.sombra{fill:var(--anatomy-halo);opacity:calc(var(--anatomy-halo-opacity) * .7)}
.transp{fill:var(--agua-sup);fill-opacity:.18;stroke:none}
.marca-oro{fill:var(--dorado)}
.estela{fill:none;stroke:var(--acento);stroke-width:1.8;stroke-linecap:round}
.marca-t{fill:var(--sup);stroke:var(--acento);stroke-width:1.4}
.parabola{fill:none;stroke:var(--acento);stroke-width:1.1;stroke-dasharray:5 4;opacity:.8}
.ref{fill:none;stroke:var(--suave);stroke-width:1.2;stroke-dasharray:2 3}
.guia{fill:none;stroke:var(--dorado);stroke-width:.9;stroke-dasharray:3 3}
.cima{fill:var(--sup);stroke:var(--dorado);stroke-width:1.4}
.banderin{fill:var(--acento)}
.arco{fill:none;stroke:var(--rubrica);stroke-width:1.3}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.flecha line{stroke:var(--rubrica);stroke-width:2.2;stroke-linecap:round} .flecha polygon{fill:var(--rubrica)}
.t-h,.t-caida,.t-ang,.t-vel,.t-ref,.t-trampa{font:600 calc(15px*var(--k)) var(--sans,system-ui);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:calc(4px*var(--k));stroke-linejoin:round}
.t-h{fill:var(--dorado)} .t-caida{fill:var(--acento)} .t-ang,.t-vel,.t-trampa{fill:var(--rubrica)} .t-ref{fill:var(--suave);text-anchor:middle}
.t-trampa{font-size:calc(14px*var(--k))}
.t-regla{font:500 calc(14px*var(--k)) var(--sans,system-ui);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.estrecha .t-regla.impar{display:none}
#mango{cursor:grab;touch-action:none} .mango-toque{fill:transparent}
.mango{fill:var(--sup);stroke:var(--rubrica);stroke-width:2}
#mango:hover .mango,#mango:active .mango{fill:var(--rubrica)}
`;

const ICONO_CUADERNO = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 2.5h10.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H4z"/><path d="M4 2.5v15M7.5 6.5h5M7.5 9.5h5M7.5 12.5h3"/></svg>';
const HTML = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Tiro parabólico 2.0 · Códice Vivo</title>
<link rel="preload" href="../../../codice/fuentes/eb-garamond.woff2" as="font" type="font/woff2" crossorigin>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
<link rel="stylesheet" href="../../../laminas2/laminas2.css">
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
      <div class="lab-barra">
        <div id="escenas"></div>
        <button type="button" class="b-cuaderno" id="b-cuaderno">${ICONO_CUADERNO}Cuaderno</button>
      </div>
      <div id="prediccion"></div>
      <div class="escenario">
        <div id="lab-dibujo" class="iso"><div class="iso-stage" tabindex="0" role="slider" aria-label="Flecha de lanzamiento: flechas del teclado para cambiar el ángulo" aria-valuemin="${J.rangos.ang.min}" aria-valuemax="${J.rangos.ang.max}" aria-valuenow="${J.valoresIniciales.ang}">${figura}</div></div>
        <div id="cancha" hidden></div>
      </div>
      <div id="tiempo"></div>
      <p class="nota" id="nota" aria-live="polite"></p>
      <div class="controles">
        <div>
          <div class="fila"><label for="s-v0" id="l-v0"></label><output id="o-v0" for="s-v0"></output></div>
          <input type="range" id="s-v0">
        </div>
        <div>
          <div class="fila"><label for="s-ang" id="l-ang"></label><output id="o-ang" for="s-ang"></output></div>
          <input type="range" id="s-ang">
        </div>
      </div>
      <div id="herramientas"></div>
      <div class="botones">
        <button type="button" class="boton sec" id="trampa" aria-pressed="false">¿Y con el tiempo de subida?</button>
        <button type="button" class="boton sec" id="inicio">Volver al tiro del examen</button>
      </div>
      <p class="pie" id="pie"></p>
    </section>
    <div id="pasos-b" class="pasos"></div>
  </div>
</main>
<script type="module">
import { creaTiempo } from "../../../laminas2/tiempo.js";
import { creaPrediccion, preguntaOpciones } from "../../../laminas2/prediccion.js";
import { creaCuaderno } from "../../../laminas2/cuaderno.js";
import { creaHerramientas } from "../../../laminas2/herramientas.js";
import { creaSelector } from "../../../laminas2/escenas.js";
import { montaPractica } from "../../../laminas2/practica.js";
import { creaCancha } from "./cancha.js";
import { PROBLEMAS } from "./practica-tiro.js";
(${pagina.toString()})(${JSON.stringify(CFG)}, { creaTiempo, creaPrediccion, preguntaOpciones, creaCuaderno, creaHerramientas, creaSelector, montaPractica, creaCancha, PROBLEMAS });
</script>
</body>
</html>
`;

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, HTML);
console.log("escrito:", SALIDA, (Buffer.byteLength(HTML) / 1024).toFixed(1) + " KB");
