// Lámina 2.5D+ de la caída libre: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/caida-libre-2_5d.mjs                → plantilla/interactivos/caida-libre/plus/index.html
//                                                              y contenido/fisica/img/caida-libre.svg (figura fija para PDF y video)
//   node plantilla/figuras/caida-libre-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador del tiro parabólico (plantilla/figuras/tiro-parabolico-2_5d.mjs): misma página (CSS_PRENSA), lógica de
// vuelo, placa y reglas. Del de la refracción (plantilla/figuras/refraccion-2_5d.mjs): evaluador de fórmulas (más raiz()),
// formato del JSON (pasos, rangos.*.valores, decimales), pantalla completa y salida .svg. Dibujo propio: regla vertical,
// electroimán, dos bolas de distinta masa e imagen estroboscópica (una marca cada segundo, tramos 1 : 3 : 5).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "caida-libre";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(RAIZ, ".claude", "skills", "anatomy");
const k = await import("file://" + join(SKILL, "kit", "iso-kit.mjs"));
const { kitScript } = await import("file://" + join(SKILL, "scripts", "inline-kit.mjs"));
const JSON_TEMA = join(RAIZ, "contenido", "fisica", `${TEMA}-interactivo.json`);
const SALIDA = join(RAIZ, "plantilla", "interactivos", TEMA, "plus", "index.html");
const SALIDA_SVG = join(RAIZ, "contenido", "fisica", "img", `${TEMA}.svg`);
const J = JSON.parse(readFileSync(JSON_TEMA, "utf8"));

// ---------- Fórmulas: se leen de J.lecturas.formulas y se evalúan sin eval ----------
// Solo + − × ÷, paréntesis, números, nombres y las funciones sen, asen y raiz (null si no existe el resultado).
function evalua(e, v) {
  const s = String(e).replace(/\s+/g, ""); let i = 0;
  const F = { sen: (x) => (x === null ? null : Math.sin(x * Math.PI / 180)), asen: (x) => (x === null || Math.abs(x) > 1 + 1e-12 ? null : Math.asin(Math.max(-1, Math.min(1, x))) * 180 / Math.PI),
    raiz: (x) => (x === null || x < -1e-12 ? null : Math.sqrt(Math.max(0, x))) };
  const op = (a, b, f) => (a === null || b === null ? null : f(a, b));
  const hoja = () => {
    const r = /^(\d+(?:\.\d+)?|[A-Za-z_]\w*)/.exec(s.slice(i));
    if (!r) throw new Error("Fórmula no válida: " + e);
    i += r[0].length;
    if (/^\d/.test(r[0])) return +r[0];
    if (r[0] in F && s[i] === "(") { i++; const a = suma(); i++; return F[r[0]](a); }
    if (!(r[0] in v)) throw new Error("Fórmula con un nombre desconocido: " + r[0]);
    return v[r[0]];
  };
  const fac = () => { if (s[i] === "(") { i++; const r = suma(); i++; return r; } if (s[i] === "-") { i++; const a = fac(); return a === null ? null : -a; } return hoja(); };
  const prod = () => { let r = fac(); while (s[i] === "*" || s[i] === "/") { const o = s[i++], b = fac(); r = op(r, b, o === "*" ? (x, y) => x * y : (x, y) => x / y); } return r; };
  const suma = () => { let r = prod(); while (s[i] === "+" || s[i] === "-") { const o = s[i++], b = prod(); r = op(r, b, o === "+" ? (x, y) => x + y : (x, y) => x - y); } return r; };
  return suma();
}
// Variables de entrada: t (manda el dibujo), n (manda la predicción) y tMax (el final de la regla, de rangos.t.max); lo demás, del JSON.
function calc(J, ent) {
  const v = { ...J.valoresIniciales, tMax: J.rangos.t.max, ...ent };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}
const num = (v, dec = 2) => {
  if (v === null || v === undefined) return "—";
  const r = Math.round(v * 10 ** dec + (v >= 0 ? 1e-9 : -1e-9)) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
// Todos los números de un estado: crudos (d), con sus decimales del JSON (f) y uno por segundo cumplido (ks).
// La bola fantasma de la trampa no pasa del suelo (hFant se recorta a la altura de la regla).
function datos(J, s) {
  const DEC = J.lecturas.decimales || {}, tMax = J.rangos.t.max;
  const d = calc(J, { t: s.t, n: s.n });
  d.hFant = Math.min(d.hFant, d.tMaxH);
  const f = {}; for (const x in d) f[x] = num(d[x], DEC[x] ?? 0);
  const ks = [];
  for (let q = 1; q <= Math.floor(tMax + 1e-9); q++) {
    const a = calc(J, { t: q, n: s.n }).h, b = calc(J, { t: q - 1, n: s.n }).h;
    ks.push({ k: q, h: a, h0: b, tot: num(a, DEC.h ?? 0), tramo: num(a - b, DEC.h ?? 0) });
  }
  return { d, f, ks };
}

// ---------- Modelo del dibujo (unidades del mundo = metros; z hacia arriba; el frente es +y) ----------
// La regla, la caída y las marcas de cada segundo están a la misma escala; las bolas, el electroimán y las flechas no.
const VI = J.valoresIniciales, RG = J.rangos, ES = J.escena;
const HT = calc(J, {}).tMaxH;                                // altura de la salida sobre el suelo (lo que cae en tMax)
const R1 = 3.4, R2 = 4.2;                                    // radios de las bolas de m1 y m2 (no a escala)
const XA = 13.5, XB = 25.5;                                    // x de cada bola
const XV = 17.9, XAC = 20.1;                                 // x de las flechas v y a (entre las bolas)
const XBR = XB + R2 + 4.5;                                   // x de los corchetes de cada segundo
const ZARM = HT + 2 * R2 + 1.2, ARM_H = 1.6;                 // brazo del electroimán (base y alto)
const POSTE = { x: -3.2, y: -1.6, w: 3.2, d: 3.2, r: 0.3 };
const PLACA = { x: -10, y: -10, w: 52, d: 20, r: 4 }, PLACA_H = 4, PATA_H = 3;
const W = 260, H = 600;   // angosta: en el celular la figura sale más grande (la altura de la regla manda la escala)
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [-10, 0, ZARM + ARM_H + 7], [XB + 4, 0, ZARM + ARM_H + 7], [XBR + 7, 0, HT]],
  W, H, { pad: 10, azimuth: 78, elevation: 20 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const fx = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- Piezas fijas ----------
function placa() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLACA, -PLACA_H - PATA_H, PLACA_H, P)}"/>`];
  const patas = k.corners(PLACA, 6).sort((a, b) => prof(a) - prof(b));
  for (const [x, y] of patas) {
    o.push(S(k.cylinder(x, y, 2.6, -PLACA_H - PATA_H, 0.8, P, 24), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 2, -PLACA_H - PATA_H + 0.8, PATA_H - 0.8, P, 24), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLACA, -PLACA_H, PLACA_H, P, 8, 0.8), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PLACA, 2.4), 0, P), { tone: "lo" }));
  const torn = k.corners(PLACA, 4);
  o.push(L(torn.map(([x, y]) => k.ring(x, y, 1, 0, P, 16)).join(""), { tone: "lo" }));
  o.push(D(torn.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Zona de caída bajo las bolas
  const z = { x: XA - 5, y: -6, w: XB - XA + 10, d: 12, r: 1.5 };
  o.push(`<path class="zona" d="${k.planOutline(z, 0, P)}"/>`);
  o.push(L(k.lineOnTop([XA, -2], [XA, 2], 0, P) + k.lineOnTop([XA - 2, 0], [XA + 2, 0], 0, P)
    + k.lineOnTop([XB, -2], [XB, 2], 0, P) + k.lineOnTop([XB - 2, 0], [XB + 2, 0], 0, P), { tone: "lo" }));
  // Placa de datos grabada al frente
  const pl = { x: PLACA.x + PLACA.w - 35, y: PLACA.y + PLACA.d - 5.5, w: 32, d: 3.6, r: 0.5 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 1.6, pl.y + 2.6], 0.4, P, "x"), tpl(J.figura.placa, { g: num(VI.g, 0) }), { size: 1.7, tone: "lo" }));
  return `<g data-parte="09">${o.join("")}</g>`;
}

// Regla vertical: el 0 arriba (la salida) y la altura total en el suelo. Marca cada metro, mayor cada 5 m, número cada 25 m.
function regla() {
  const o = [];
  o.push(S(k.cylinder(POSTE.x + POSTE.w / 2, 0, 3.6, 0, 1, P, 28, 0.2), { tone: "mid" }));
  o.push(S(k.slabOf(POSTE, 1, ZARM + ARM_H + 1.2 - 1, P, 2), { tone: "hi", crease: "none" }));
  const yf = POSTE.y + POSTE.d;
  let franjas = "";
  for (let m = 0; m < HT; m += 10) {
    const z0 = HT - m - 5, z1 = HT - m, x0 = POSTE.x + 0.25, x1 = -0.25;
    franjas += k.pathOf([at([x0, yf, z0]), at([x1, yf, z0]), at([x1, yf, z1]), at([x0, yf, z1])]) + "Z";
  }
  o.push(`<path class="franja" d="${franjas}"/>`);
  let menor = "", medio = "", mayor = "";
  for (let m = 0; m <= HT; m++) {
    const z = HT - m, largo = m % 25 === 0 ? 2.6 : m % 5 === 0 ? 1.7 : 0.9;
    const d = k.segment([0, yf, z], [-largo, yf, z], P);
    if (m % 25 === 0) mayor += d; else if (m % 5 === 0) medio += d; else menor += d;
  }
  o.push(L(menor, { tone: "faint" }), L(medio, { tone: "lo" }), L(mayor, { tone: "mid" }));
  for (let m = 0; m <= HT; m += 25) { const p = at([POSTE.x - 1.2, 0, HT - m]);
    o.push(`<text class="t-regla" x="${fx(p[0])}" y="${fx(p[1] + 3)}" text-anchor="end">${m}${m + 25 > HT ? " m" : ""}</text>`); }
  return `<g data-parte="02">${o.join("")}</g>`;
}

// Mitad de un anillo horizontal que mira hacia quien ve (las vueltas de la bobina)
function arcoFrente(cx, cy, r, z) {
  const [vx, vy] = k.towardViewer(P), a0 = Math.atan2(vy, vx);
  return k.pathOf(Array.from({ length: 17 }, (_, i) => { const a = a0 - Math.PI / 2 + Math.PI * i / 16; return at([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); }));
}
// Brazo con dos electroimanes: cada uno toca la parte de arriba de su bola (las dos bolas empiezan con el fondo a la misma altura).
function electroiman() {
  const o = [];
  const brazo = { x: POSTE.x - 0.6, y: -1.4, w: XB + 4 - POSTE.x, d: 2.8, r: 0.4 };
  o.push(S(k.slabOf(brazo, ZARM, ARM_H, P, 3, 0.2), { tone: "mid" }));
  o.push(S(k.slabOf({ x: POSTE.x - 0.9, y: -2, w: POSTE.w + 1.8, d: 4, r: 0.4 }, ZARM - 0.6, ARM_H + 1.2, P, 3, 0.2), { tone: "lo" }));
  for (const [x, r] of [[XA, R1], [XB, R2]]) {
    const z0 = HT + 2 * r;
    o.push(S(k.cylinder(x, 0, 1.6, z0 + 0.5, ZARM - z0 - 0.5, P, 24, 0.15), { tone: "mid" }));
    let bob = "";
    for (let z = z0 + 1; z < ZARM - 0.3; z += 0.55) bob += arcoFrente(x, 0, 1.62, z);
    o.push(L(bob, { tone: "lo" }));
    o.push(S(k.cylinder(x, 0, 1.1, z0, 0.5, P, 20, 0.1), { tone: "lo" }));
  }
  const c = at([XB + 2.6, 1.4, ZARM + ARM_H / 2]);
  o.push(`<circle class="led" cx="${fx(c[0])}" cy="${fx(c[1])}" r="1.8"/>`);
  // Cable de corriente: del brazo baja pegado al poste y entra a su base
  const cab = [[0.5, 0.3, ZARM - 0.4], [0.9, 0.3, ZARM - 2.5], [0.9, 0.3, 4], [1.6, 0.6, 1.6], [2.4, 0.9, 0.9]].map(at);
  o.push(`<path class="cable" d="${k.pathOf(cab)}"/>`);
  for (const z of [ZARM - 12, ZARM - 40, ZARM - 70, ZARM - 100]) { const q = at([0.9, 0.3, z]); o.push(`<rect class="grapa" x="${fx(q[0] - 1.6)}" y="${fx(q[1] - 1)}" width="3.2" height="2" rx="0.6"/>`); }
  return `<g data-parte="01">${o.join("")}</g>`;
}

// ---------- Lo que cambia: la vista arma el SVG de las bolas, marcas, corchetes, flechas y trampa para un estado ----------
// C: datos del dibujo; K: funciones del kit (iso); s: { t, n, trampa }; Dt: datos(J, s).
function vista(C, K, s, J, Dt) {
  const P = C.P, iso = (p) => K.iso(p, P), F = J.figura, f = Dt.f, o = [];
  const r1 = (x) => Math.round(x * 10) / 10, ux = iso([1, 0, 0])[0] - iso([0, 0, 0])[0];
  const c1 = (h) => C.HT - h + C.R1, c2 = (h) => C.HT - h + C.R2;
  const txt = (p, cls, s2, a = "start", dy = 0, parte) => `<text class="${cls}" x="${r1(p[0])}" y="${r1(p[1] + dy)}" text-anchor="${a}"${parte ? ` data-parte="${parte}"` : ""}>${s2}</text>`;
  const bola = (x, z, r, cls, et, parte) => {
    const c = iso([x, 0, z]), R = r * ux;
    return `<g class="${cls}" data-parte="${parte}"><circle class="bola-c" cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(R)}"/>`
      + `<circle class="bola-brillo" cx="${r1(c[0] - R * 0.38)}" cy="${r1(c[1] - R * 0.4)}" r="${r1(R * 0.2)}"/>`
      + (et ? `<text class="t-masa" x="${r1(c[0])}" y="${r1(c[1] + R * 0.22)}" text-anchor="middle" font-size="${r1(R * 0.6)}">${et}</text>` : "") + `</g>`;
  };
  const sombra = (x, z, r, cls) => { const c = iso([x, 0, z]); return `<circle class="${cls}" cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r * ux)}"/>`; };
  const flecha = (p0, p1, cls) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    if (l < 2) return "";
    const u = [dx / l, dy / l], cab = Math.min(9, l * 0.6), an = cab * 0.5, b = [p1[0] - u[0] * cab, p1[1] - u[1] * cab];
    return `<g class="flecha ${cls}"><line x1="${r1(p0[0])}" y1="${r1(p0[1])}" x2="${r1(b[0] + u[0])}" y2="${r1(b[1] + u[1])}"/>`
      + `<polygon points="${r1(p1[0])},${r1(p1[1])} ${r1(b[0] - u[1] * an)},${r1(b[1] + u[0] * an)} ${r1(b[0] + u[1] * an)},${r1(b[1] - u[0] * an)}"/></g>`;
  };
  const t = s.t, h = Dt.d.h, suelo = t >= J.rangos.t.max - 1e-9;
  // Sombra de cada bola en la placa: más chica y oscura mientras más cerca del suelo
  const alto = (C.HT - h) / C.HT;
  for (const [x, r] of [[C.XA, C.R1], [C.XB, C.R2]]) {
    const rs = r * (0.75 + 0.6 * alto), pts = Array.from({ length: 24 }, (_, i) => { const a = i / 24 * 2 * Math.PI; return iso([x + rs * Math.cos(a), rs * 0.95 * Math.sin(a), 0.05]); });
    o.push(`<path class="sombra-suelo" opacity="${r1((0.42 - 0.3 * alto) * 100) / 100}" d="M${pts.map((p) => r1(p[0]) + " " + r1(p[1])).join("L")}Z"/>`);
  }
  // Nivel: de la regla al fondo de las bolas, con un cursor dorado sobre la regla
  if (h > 0.3) {
    const a = iso([0, 1.6, C.HT - h]), b = iso([C.XA - C.R1 - 0.3, 0, C.HT - h]);
    o.push(`<g data-parte="02"><path class="nivel" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}"/>`
      + `<polygon class="cursor" points="${r1(a[0] + 0.5)},${r1(a[1])} ${r1(a[0] - 4.5)},${r1(a[1] - 3)} ${r1(a[0] - 4.5)},${r1(a[1] + 3)}"/></g>`);
  }
  // Estela: el camino recorrido por la bola ligera
  if (h > 0.05) { const a = iso([C.XA, 0, C.HT + C.R1]), b = iso([C.XA, 0, c1(h)]); o.push(`<path class="estela" data-parte="05" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}"/>`); }
  // Marcas de cada segundo (estroboscópica), totales a la izquierda y tramos a la derecha
  const ks = Dt.ks.filter((q) => q.k <= t + 1e-9);
  const corchete = (h0, h1, cls, parte, et) => {
    const a = iso([C.XBR, 0, C.HT - h0]), b = iso([C.XBR, 0, C.HT - h1]), e = 0.9 * ux;
    const dd = `M${r1(a[0] - e)} ${r1(a[1])}L${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}L${r1(b[0] - e)} ${r1(b[1])}`;
    let g = `<g class="${cls}" data-parte="${parte}">` + (cls.includes("tramo-n") && s.brillo > 0 ? `<path class="tramo-brillo" opacity="${r1(s.brillo * 10) / 10}" d="${dd}"/>` : "") + `<path d="M${r1(a[0] - e)} ${r1(a[1])}L${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}L${r1(b[0] - e)} ${r1(b[1])}"/>`;
    if (et) { const m = iso([C.XBR + 1.1, 0, C.HT - (h0 + h1) / 2]); g += txt(m, "t-tramo", et, "start", 4); }
    return g + `</g>`;
  };
  for (const q of ks) {
    if (Math.abs(t - q.k) > 1e-6) o.push(`<g class="estrobo" data-parte="03">${sombra(C.XA, c1(q.h), C.R1, "marca-bola")}${sombra(C.XB, c2(q.h), C.R2, "marca-bola")}</g>`);
    const pt = iso([1.2, 0, C.HT - q.h]), pr = iso([0, 1.6, C.HT - q.h]);
    o.push(`<g data-parte="03"><path class="marca-raya" d="M${r1(pr[0])} ${r1(pr[1])}L${r1(pr[0] + 1.2 * ux)} ${r1(pr[1])}"/>`
      + txt(pt, "t-total", tpl(F.total, { x: q.tot }), "start", 3.5) + txt(pt, "t-seg", tpl(F.tiempo, { k: q.k }), "start", 13) + `</g>`);
    if (!s.trampa) o.push(corchete(q.h0, q.h, q.k === s.n ? "tramo tramo-n" : "tramo", q.k === s.n ? "04" : "03", tpl(F.tramo, { x: q.tramo })));
  }
  const k0 = Math.floor(t + 1e-9), h0 = k0 >= 1 ? Dt.ks[k0 - 1].h : 0;
  if (!s.trampa && t - k0 > 1e-6 && h - h0 > 0.3) o.push(corchete(h0, h, "tramo tramo-parcial", "03", ""));
  // Trampa: dónde estaría la pesada si cayera el doble de rápido
  if (s.trampa) {
    // Texto centrado bajo la fantasma (o encima si ya está cerca del suelo); «|» parte las líneas
    const hf = Dt.d.hFant, a = iso([C.XB, 0, c2(h) - C.R2]), b = iso([C.XB, 0, c2(hf) + C.R2]);
    const lineas = [...tpl(F.fantasma, f).split("|"), ...tpl(F.real, f).split("|")], abajo = hf < C.HT - 30;
    const tp = iso([C.XB, 0, abajo ? c2(hf) - C.R2 - 1.5 : c2(hf) + C.R2 + 1.5]), y0 = abajo ? tp[1] + 9 : tp[1] - 14 * (lineas.length - 1) - 3;
    o.push(`<g data-parte="06"><path class="fantasma" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}"/>${sombra(C.XB, c2(hf), C.R2, "fantasma")}`
      + `<text class="t-trampa" x="${r1(tp[0])}" y="${r1(y0)}" text-anchor="middle">${lineas.map((x, i) => `<tspan x="${r1(tp[0])}"${i ? ' dy="14"' : ""}>${x}</tspan>`).join("")}</text></g>`);
  }
  // Las dos bolas: siempre a la misma altura de caída
  o.push(bola(C.XA, c1(h), C.R1, "bola bola-1", tpl(F.masa1, f), "05"), bola(C.XB, c2(h), C.R2, "bola bola-2", tpl(F.masa2, f), "06"));
  // Al llegar al suelo: marcas de golpe junto a cada bola y «llegan juntas»
  if (suelo) {
    let g = "";
    for (const [x, r] of [[C.XA, C.R1], [C.XB, C.R2]]) for (const sg of [-1, 1]) {
      const a = iso([x + sg * (r + 0.6), 0, 0.6]), b = iso([x + sg * (r + 2.4), 0, 1.8]), c = iso([x + sg * (r + 0.9), 0, 2.2]), d = iso([x + sg * (r + 2), 0, 4]);
      g += `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}M${r1(c[0])} ${r1(c[1])}L${r1(d[0])} ${r1(d[1])}`;
    }
    const p = iso([(C.XA + C.XB) / 2, 0, c2(h) + C.R2 + 10]), ls = tpl(F.juntas, f).split("|");
    o.push(`<g data-parte="09"><path class="golpe" d="${g}"/><text class="t-juntas" x="${r1(p[0])}" y="${r1(p[1])}" text-anchor="middle">${ls.map((x, i) => `<tspan x="${r1(p[0])}"${i ? ' dy="15"' : ""}>${x}</tspan>`).join("")}</text></g>`);
  }
  // Flechas: v crece con t (escala propia) y a = g mide siempre lo mismo
  if (!s.trampa && !suelo) {
    const z = c1(h), vz = z - Dt.d.v * J.escena.kv, az = z - J.escena.aLargo;
    o.push(`<g data-parte="07">${flecha(iso([C.XAC, 0, z]), iso([C.XAC, 0, az]), "fl-a")}${txt(iso([C.XAC + 0.8, 0, az]), "t-vel t-a", tpl(F.a, f), "start", 4)}</g>`);
    if (Dt.d.v > 1e-9) o.push(`<g data-parte="08">${flecha(iso([C.XV, 0, z]), iso([C.XV, 0, vz]), "fl-v")}${txt(iso([C.XV - 0.8, 0, vz]), "t-vel t-v", tpl(F.v, f), "end", 4)}</g>`);
    else o.push(`<g data-parte="08">${txt(iso([C.XV - 0.8, 0, z - 8]), "t-vel t-v", F.v0, "end", 4)}</g>`);
  }
  return o.join("");
}

// ---------- Esqueleto de la figura ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];
const CFG = { P, HT, R1, R2, XA, XB, XV, XAC, XBR, ZARM, ARM_H, PLACA, PLACA_H, POSTE, W, H, ROT };
const S0 = { t: 0, n: VI.n, trampa: false };
// Degradados de las bolas (los colores salen de las variables del tema, así cambian en claro y oscuro)
const DEFS = `<defs><radialGradient id="gb1" cx=".36" cy=".32" r=".78"><stop offset="0" class="gb1-0"/><stop offset=".55" class="gb1-1"/><stop offset="1" class="gb1-2"/></radialGradient>`
  + `<radialGradient id="gb2" cx=".36" cy=".32" r=".78"><stop offset="0" class="gb2-0"/><stop offset=".55" class="gb2-1"/><stop offset="1" class="gb2-2"/></radialGradient></defs>`;
const figura = k.figureSvg({
  width: W, height: H, label: J.figura.aria,
  body: [
    DEFS, placa(), regla(), electroiman(),
    `<g id="dyn">${vista(CFG, k, S0, J, datos(J, S0))}</g>`,
    `<g id="rot"></g>`,
    `<g id="mango" data-parte="05"><circle class="pista" id="pista-1"/><circle class="pista" id="pista-2"/><circle class="mango-toque" id="toque-1" r="15"/><circle class="mango-toque" id="toque-2" r="15"/></g>`,
  ],
});

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, evalua, calc, num, tpl, datos y vista) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const NS = "http://www.w3.org/2000/svg";
const el = (t, c) => { const e = document.createElementNS(NS, t); if (c) e.setAttribute("class", c); return e; };
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const P = C.P, K = { iso };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/caida-libre-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/caida-libre-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V0 = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles, ES = J.escena, DEC = L.decimales || {};
const TMAX = RG.t.max, PASO = RG.t.paso, NS_ = RG.n.valores;
const conUnidad = (v, u) => v + (/^[°′″]/.test(u) ? "" : " ") + u;
const redondeaT = (x) => Math.max(RG.t.min, Math.min(TMAX, +(Math.round(x / PASO) * PASO).toFixed(6)));

// Estado: t manda el dibujo; n (solo de rangos.n.valores) manda la predicción
let t = 0, n = V0.n, trampaOn = false, sel = null, fase = "quieto", enRecorrido = false, tocado = false, ultimoK = 0, brillo0 = 0, yaArrastro = false;
let Dt = datos(J, { t, n });
const F = () => Dt.f;

const svg = $(".iso-svg"), stage = $(".iso-stage"), dyn = $("#dyn"), sT = $("#s-t"), bSol = $("#soltar"), bTrampa = $("#trampa"),
  bExamen = $("#examen"), nota = $("#nota"), mango = $("#mango"), toque1 = $("#toque-1"), toque2 = $("#toque-2"), pista1 = $("#pista-1"), pista2 = $("#pista-2");

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#pred-t").textContent = J.prediccion.titulo;
$("#etq-h").textContent = L.altura;
$("#l-t").textContent = CT.t;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
$("#escala").textContent = `Regla y caída a escala · 0 a ${num(Dt.d.tMaxH, 0)} m`;
sT.min = RG.t.min; sT.max = TMAX; sT.step = PASO; sT.value = t;
stage.setAttribute("aria-valuemin", RG.t.min); stage.setAttribute("aria-valuemax", TMAX);
stage.setAttribute("aria-label", "Lámina: flechas arriba y abajo cambian el tiempo de caída; B suelta o pausa");

// ---------- Rótulos y fichas (texto del JSON) ----------
const fichaVacia = "Toca un número para ver qué hace cada parte.";
function aplicarSel(){
  svg.querySelectorAll("[data-parte]").forEach(e => {
    const dentro = e.closest(`[data-parte="${sel}"]`) || e.querySelector(`[data-parte="${sel}"]`);
    e.classList.toggle("apagado", !!sel && !dentro);
  });
}
function seleccionar(q){
  sel = sel === q ? null : q;
  document.querySelectorAll(".rot-b").forEach(b => b.setAttribute("aria-pressed", b.dataset.n === sel));
  svg.querySelectorAll(".rot").forEach(g => g.classList.toggle("activo", g.dataset.n === sel));
  aplicarSel(); pintarFicha();
}
function pintarFicha(){
  const r = J.rotulos[sel];
  $("#ficha").innerHTML = r ? `<b>${sel} · ${tpl(r[0], F())}.</b> ${tpl(r[1], F())}` : fichaVacia;
}
const rots = {};
C.ROT.forEach(q => {
  const b = document.createElement("button"); b.type = "button"; b.className = "rot-b"; b.dataset.n = q;
  b.setAttribute("aria-pressed", "false"); b.innerHTML = `<b>${q}</b>${tpl(J.rotulos[q][0], F())}`;
  b.addEventListener("click", () => seleccionar(q)); $("#rotulos").append(b);
  const g = el("g", "rot"); g.dataset.n = q; g.setAttribute("aria-hidden", "true");
  const c = el("circle"); c.setAttribute("r", 8.5);
  const tx = el("text"); tx.textContent = q;
  g.append(c, tx); g.addEventListener("click", (e) => { e.stopPropagation(); seleccionar(q); });
  $("#rot").append(g); rots[q] = { g, c, tx, x: null, y: null };
});
function ponRot(q, p, visible = true){
  const r = rots[q]; r.g.style.display = visible ? "" : "none"; if (!visible) return;
  const x = Math.round(p[0] * 10) / 10, y = Math.round(p[1] * 10) / 10;
  if (r.x === x && r.y === y) return; r.x = x; r.y = y;
  r.c.setAttribute("cx", x); r.c.setAttribute("cy", y); r.tx.setAttribute("x", x); r.tx.setAttribute("y", y + 0.4);
}

// ---------- Mensajes ----------
const decir = (s) => { if (!enRecorrido) nota.textContent = s; };
const mensajeAhora = () => {
  const f = F();
  if (t <= 0) return tpl(L.mensajeInicio, f);
  if (t >= TMAX - 1e-9) return tpl(L.mensajeSuelo, f);
  return tpl(L.mensajeArrastre, f);
};

// ---------- Dibujo que cambia: la vista arma el SVG del estado ----------
const W3 = (p) => iso(p, P);
function render(){
  Dt = datos(J, { t, n });
  const f = F(), d = Dt.d, suelo = t >= TMAX - 1e-9;
  const brillo = brillo0 ? Math.max(0, 1 - (performance.now() - brillo0) / 1600) : 0;
  dyn.innerHTML = vista(C, K, { t, n, trampa: trampaOn, brillo }, J, Dt);
  svg.classList.toggle("trampa-on", trampaOn);
  svg.classList.toggle("soltada", t > 0);
  // Asas de arrastre en las dos bolas
  const c1 = C.HT - d.h + C.R1, c2 = C.HT - d.h + C.R2, p1 = W3([C.XA, 0, c1]), p2 = W3([C.XB, 0, c2]);
  toque1.setAttribute("cx", p1[0].toFixed(1)); toque1.setAttribute("cy", p1[1].toFixed(1));
  toque2.setAttribute("cx", p2[0].toFixed(1)); toque2.setAttribute("cy", p2[1].toFixed(1));
  // Pista de arrastre: anillo punteado alrededor de cada bola hasta el primer arrastre
  const ux = W3([1, 0, 0])[0] - W3([0, 0, 0])[0];
  [[pista1, p1, C.R1], [pista2, p2, C.R2]].forEach(([e, p, r]) => { e.setAttribute("cx", p[0].toFixed(1)); e.setAttribute("cy", p[1].toFixed(1)); e.setAttribute("r", (r * ux + 4).toFixed(1)); });
  svg.classList.toggle("arrastrado", yaArrastro || trampaOn);
  // Rótulos: en orden de arriba hacia abajo (01 electroimán … 09 suelo)
  const kn = Dt.ks[n - 1];
  const vz = c1 - d.v * ES.kv, az = c1 - ES.aLargo;
  ponRot("01", W3([8, 0, C.ZARM + C.ARM_H + 3]));
  ponRot("02", W3([C.POSTE.x - 5, 0, C.HT + 7.6]));
  ponRot("03", W3([7.6, 0, C.HT - 12]), t >= 2.5 - 1e-9);
  ponRot("04", W3([C.XBR - 2.8, 0, C.HT - (kn.h0 + kn.h) / 2]), t >= n - 1e-9 && !trampaOn);
  ponRot("05", W3([C.XA - 6.8, 0, c1 + 3]));
  ponRot("06", W3([C.XB - C.R2 - 2.2, 0, c2 + 3.6]));
  ponRot("07", W3([C.XAC + 3.4, 0, az - 4.6]), !trampaOn && !suelo);
  ponRot("08", W3([C.XV - 4.5, 0, Math.min(vz, c1 - 8) - 4.6]), !trampaOn && !suelo);
  ponRot("09", W3([C.PLACA.x + C.PLACA.w - 8, C.PLACA.y + C.PLACA.d, -C.PLACA_H / 2]));
  aplicarSel();
  // Panel
  $("#o-h").textContent = `${f.h} m`;
  $("#o-formula").innerHTML = tpl(L.alturaValor, f);
  $("#o-t").textContent = tpl(CT.valorT, f);
  $("#o-v").textContent = `${f.v} m/s`;
  $("#c-n").textContent = tpl(CT.valorN, f);
  $("#o-n").textContent = t >= n - 1e-9 ? `${f.sn} m` : "?";
  $("#o-tt").textContent = `${f.t} s`;
  sT.style.setProperty("--p", (100 * (t - RG.t.min) / (TMAX - RG.t.min)) + "%");
  if (Math.abs(+sT.value - t) > 1e-9) sT.value = t;
  const vt = tpl(CT.valorLamina, f);
  sT.setAttribute("aria-valuetext", vt);
  stage.setAttribute("aria-valuenow", f.t); stage.setAttribute("aria-valuetext", vt);
  const lect = `t ${f.t} s · h ${f.h} m · v ${f.v} m/s`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  bSol.textContent = fase === "vuelo" ? CT.pausar : t <= 0 ? CT.soltar : suelo ? CT.otraVez : CT.seguir;
  document.querySelectorAll("#pred-n button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.n === n));
  const nl = L.numerales, filas = [
    [L.velocidad, tpl(L.velocidadValor, f)],
    [L.altura, tpl(L.alturaValor, f)],
    [L.comprueba, tpl(L.compruebaValor, f)],
    [tpl(L.segundo, f), tpl(L.segundoValor, f)],
    [L.masa, tpl(L.masaValor, f) + `<br><span class="et">${tpl(L.mensaje, f)}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((x, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${x[0]}</span><span class="va">${x[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento (solo mientras algo se mueve) ----------
let anim = 0;
function volar(hasta, fin){
  cancelAnimationFrame(anim);
  hasta = Math.min(hasta, TMAX);
  if (quieto){ t = hasta; fase = "quieto"; render(); llegar(); if (fin) fin(); return; }
  fase = "vuelo"; let antes = performance.now(); ultimoK = Math.floor(t + 1e-9);
  const f = (ahora) => {
    t = Math.min(hasta, t + (ahora - antes) / 1000 * ES.velocidad); antes = ahora;
    const kq = Math.floor(t + 1e-9);
    if (kq > ultimoK && kq >= 1 && t < hasta - 1e-9){ ultimoK = kq; decir(tpl(L.mensajeSegundo, datos(J, { t: kq, n }).f)); if (kq === n) pulsar(); }
    if (t >= hasta - 1e-9){ t = hasta; fase = "quieto"; render(); llegar(); if (fin) fin(); return; }
    render(); anim = requestAnimationFrame(f);
  };
  render(); anim = requestAnimationFrame(f);
}
// Brillo del tramo del segundo n (se apaga en 1.6 s); con movimiento reducido no hay brillo
let animB = 0;
function pulsar(){
  if (quieto || trampaOn) return;
  brillo0 = performance.now(); cancelAnimationFrame(animB);
  const f = () => { if (fase !== "vuelo") render(); if (performance.now() - brillo0 < 1600) animB = requestAnimationFrame(f); else { brillo0 = 0; render(); } };
  animB = requestAnimationFrame(f);
}
function llegar(){
  if (Math.abs(t - n) < 1e-9) pulsar();
  if (t >= TMAX - 1e-9) decir(tpl(L.mensajeSuelo, F()));
  else if (Math.abs(t - Math.round(t)) < 1e-9 && t >= 1) decir(tpl(L.mensajeSegundo, F()));
  else decir(mensajeAhora());
}
function pausar(){ cancelAnimationFrame(anim); fase = "quieto"; render(); }
function soltar(){
  if (fase === "vuelo"){ pausar(); return; }
  if (t >= TMAX - 1e-9) t = 0;
  if (t === 0) decir(tpl(L.mensajeSoltar, F()));
  volar(TMAX);
}
function ponT(x){ x = redondeaT(x); if (Math.abs(x - t) < 1e-9) return false; cancelAnimationFrame(anim); fase = "quieto"; t = x; render(); return true; }
function apagarTrampa(){ if (!trampaOn) return; trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }

// ---------- Recorrido automático: la primera vez, suelta hasta escena.recorrido s (sin llegar a los tramos que se preguntan) y vuelve ----------
let tRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  t = 0; render();
  tRec = setTimeout(() => { if (enRecorrido) volar(ES.recorrido, () => { tRec = setTimeout(pasoRecorrido, 1100); }); }, 700);
}
function iniciarRecorrido(){ if (quieto || enRecorrido || tocado) return; enRecorrido = true; pasoRecorrido(); }
function tomarControl(){
  tocado = true;
  if (enRecorrido){ enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(anim); fase = "quieto"; t = 0; render(); decir(tpl(L.mensajeInicio, F())); }
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible && !tocado && !enRecorrido) iniciarRecorrido(); }, {rootMargin:"0px"}).observe(stage);

// ---------- Controles ----------
bSol.addEventListener("click", soltar);
bExamen.addEventListener("click", () => {
  cancelAnimationFrame(anim); fase = "quieto"; apagarTrampa(); t = V0.t; n = V0.n; render(); pintarPrediccion();
  decir(tpl(L.mensajeReinicio, F()));
});
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn;
  bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn && t <= 0){ t = 1; }
  render();
  decir(trampaOn ? tpl(L.mensajeTrampa, F()) : mensajeAhora());
});
sT.addEventListener("input", () => { if (ponT(+sT.value)) decir(mensajeAhora()); });
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); soltar();
});
stage.addEventListener("keydown", (e) => {
  const m = {ArrowUp:-PASO, ArrowLeft:-PASO, ArrowDown:PASO, ArrowRight:PASO, PageUp:-1, PageDown:1}[e.key];
  if (e.key === "Home"){ e.preventDefault(); if (ponT(0)) decir(mensajeAhora()); return; }
  if (e.key === "End"){ e.preventDefault(); if (ponT(TMAX)) decir(mensajeAhora()); return; }
  if (m === undefined) return;
  e.preventDefault(); if (ponT(t + m)) decir(mensajeAhora());
});
// Arrastre de las bolas (dedo o mouse): touch-action:none solo en las asas; la altura de la pantalla da h y de h sale t
const UZ = W3([0, 0, 0])[1] - W3([0, 0, 1])[1];   // unidades de pantalla por metro de caída
const svgPt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
let arr = null;
mango.addEventListener("pointerdown", (e) => {
  cancelAnimationFrame(anim); fase = "quieto"; arr = { y: svgPt(e).y, h: Dt.d.h, id: e.pointerId };
  mango.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
});
mango.addEventListener("pointermove", (e) => {
  if (!arr || e.pointerId !== arr.id) return;
  const h = Math.max(0, Math.min(Dt.d.tMaxH, arr.h + (svgPt(e).y - arr.y) / UZ));
  if (ponT(Math.sqrt(2 * h / V0.g))){ yaArrastro = true; decir(mensajeAhora()); }
});
// El navegador no siempre respeta touch-action dentro del SVG: si el dedo empieza en un asa, la página no se desplaza
mango.addEventListener("touchstart", (e) => e.preventDefault(), {passive:false});
const soltarAsa = () => { if (arr){ arr = null; render(); } };
mango.addEventListener("pointerup", soltarAsa); mango.addEventListener("pointercancel", soltarAsa);

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
// «Predice»: n solo toma los valores de rangos.n.valores (ahí las cuatro opciones no coinciden); las opciones salen de las fórmulas
const LETRAS = ["A", "B", "C", "D"];
NS_.forEach(q => {
  const b = document.createElement("button"); b.type = "button"; b.className = "seg"; b.dataset.n = q;
  b.textContent = tpl(CT.valorN, { n: q }); b.setAttribute("aria-pressed", q === n);
  b.addEventListener("click", () => { if (n === q) return; n = q; pintarPrediccion(); render(); });
  $("#pred-n").append(b);
});
$("#pred-n").setAttribute("aria-label", CT.n);
function pintarPrediccion(){
  const d = calc(J, { t, n }), f = datos(J, { t, n }).f;
  $("#pred-q").innerHTML = tpl(J.prediccion.pregunta, f);
  const ops = J.prediccion.opciones.map((x, i) => ({ ok: !!x.correcta, e: tpl(x.retro, f),
    t: `${LETRAS[i]}) ` + conUnidad(num(evalua(x.formula, d), DEC[x.formula] ?? 0), x.unidad || J.prediccion.unidad) }));
  opciones($("#pred-ops"), ops, () => {
    tomarControl(); apagarTrampa(); cancelAnimationFrame(anim); t = 0; render();
    volar(n, () => decir(tpl(L.mensajePrediccion, F())));
  });
}
pintarPrediccion();

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

$("#pie").innerHTML = `<i>${tpl(J.figura.pie, F())}</i> Modelo: la regla, la caída y las marcas de cada segundo están a la misma escala (de 0 a ${num(Dt.d.tMaxH, 0)} m, lo que cae en ${num(TMAX, 0)} s con g = ${num(V0.g, 0)} m/s²); las bolas, el electroimán y las flechas no (las flechas tienen su propia escala). Sin resistencia del aire.
 La predicción solo pregunta por los segundos ${NS_.join(", ")}: en el 1 y el 2 algunas opciones darían el mismo número. El tiempo avanza de ${num(PASO, 1)} en ${num(PASO, 1)} s.
 La primera vez, la lámina suelta las bolas solo hasta ${num(ES.recorrido, 0)} s y regresa, sin mostrar los tramos que se preguntan; tocarla la detiene. Con movimiento reducido, todo aparece en su lugar sin animación. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B suelta o pausa; con la lámina enfocada, ↑ ↓ cambian el tiempo. También puedes arrastrar las bolas hacia arriba o abajo.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#soltar", "#trampa", "#bloque-t"].map(s => $(s));
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
  }
  bCerrar.focus({preventScroll:true}); decir("Pantalla completa: pellizca o usa Ctrl + rueda para acercar; doble toque o Esc para volver.");
}
function salir(){
  if (!modo) return; modo = false; sinZoom();
  huecos.forEach(([e, c]) => c.replaceWith(e)); huecos = [];
  pant.classList.remove("modo-lamina"); document.documentElement.classList.remove("sin-scroll");
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

pintarFicha(); render(); decir(tpl(L.mensajeInicio, F()));
window.__caida = { set:(o) => { if ("t" in o) t = o.t; if ("n" in o){ n = o.n; pintarPrediccion(); } if ("trampa" in o){ trampaOn = o.trampa; } render(); },
  sel:seleccionar, completa:entrar, salir, soltar, estado:() => ({ t, n, trampaOn, fase, enRecorrido, h: Dt.d.h, v: Dt.d.v }),
  alto:() => { enRecorrido = false; tocado = true; clearTimeout(tRec); cancelAnimationFrame(anim); fase = "quieto"; render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de la caída libre) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados tal cual del generador del tiro parabólico.
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
// Lo que dibuja la vista (también va dentro de la figura fija .svg)
const CSS_FIG = `
.oculto{display:none}
.zona{fill:none;stroke:var(--anatomy-lo);stroke-width:.7;stroke-dasharray:3 2}
.led{fill:var(--rubrica)} /* encendido: sostiene */
.bola-1 .bola-c{fill:url(#gb1);stroke:var(--anatomy-hi);stroke-width:.8}
.bola-2 .bola-c{fill:url(#gb2);stroke:var(--anatomy-hi);stroke-width:.8}
.gb1-0{stop-color:var(--anatomy-paper)} .gb1-1{stop-color:var(--anatomy-face)} .gb1-2{stop-color:var(--anatomy-lo)}
.gb2-0{stop-color:var(--anatomy-lo)} .gb2-1{stop-color:var(--anatomy-mid)} .gb2-2{stop-color:var(--anatomy-hi)}
.bola-brillo{fill:var(--anatomy-paper);opacity:.85} .bola-2 .bola-brillo{opacity:.4}
.sombra-suelo{fill:#2a2118}
.franja{fill:var(--dorado);fill-opacity:.13}
.cable{fill:none;stroke:var(--anatomy-hi);stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}
.grapa{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:.6}
.led{stroke:var(--anatomy-hi);stroke-width:.5} svg.soltada .led{fill:var(--anatomy-lo)}
.nivel{fill:none;stroke:var(--dorado);stroke-width:.9;stroke-dasharray:2 2}
.cursor{fill:var(--dorado)}
.tramo-brillo{fill:none;stroke:var(--rubrica);stroke-width:7;stroke-linecap:round;stroke-opacity:.3}
.golpe{fill:none;stroke:var(--rubrica);stroke-width:1.3;stroke-linecap:round}
.t-juntas{font:600 13px var(--serif);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-masa{font-family:var(--anatomy-mono);font-weight:500;fill:var(--anatomy-hi)} .bola-2 .t-masa{fill:var(--anatomy-paper)}
.marca-bola{fill:var(--acento);fill-opacity:.12;stroke:var(--acento);stroke-width:.8;stroke-opacity:.55}
.marca-raya{stroke:var(--dorado);stroke-width:1.3}
.estela{fill:none;stroke:var(--acento);stroke-width:1.6;stroke-linecap:round;opacity:.7}
.t-total{font:600 10px var(--anatomy-mono);fill:var(--dorado);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-seg{font:500 8.5px var(--anatomy-mono);fill:var(--anatomy-text);paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.tramo path{fill:none;stroke:var(--acento);stroke-width:1.1}
.tramo-n path{stroke:var(--rubrica);stroke-width:2}
.tramo-parcial path{stroke:var(--suave);stroke-dasharray:2 2}
.t-tramo{font:500 12px var(--serif);fill:var(--acento);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.tramo-n .t-tramo{fill:var(--rubrica);font-weight:600;font-size:13px}
.flecha line{stroke-width:2.2;stroke-linecap:round}
.fl-v line{stroke:var(--rubrica)} .fl-v polygon{fill:var(--rubrica)}
.fl-a line{stroke:var(--acento)} .fl-a polygon{fill:var(--acento)}
.t-vel{font:500 13px var(--serif);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-v{fill:var(--rubrica)} .t-a{fill:var(--acento)}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-regla{font:500 9px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de la caída libre */
.escena .iso-svg{display:block;max-height:min(88vh,800px);margin:0 auto}
.escena .iso-plate-corner[data-corner="hint"]{max-width:52%}
#dyn{pointer-events:none}
#mango{cursor:grab;touch-action:none} .mango-toque{fill:transparent}
.pista{fill:none;stroke:var(--acento);stroke-width:1.4;stroke-dasharray:3 3;pointer-events:none;animation:pista 1.6s ease-in-out infinite}
svg.arrastrado .pista{display:none}
@keyframes pista{0%,100%{stroke-opacity:.25}50%{stroke-opacity:.95}}
@media (prefers-reduced-motion:reduce){.pista{animation:none;stroke-opacity:.6}}
#mango:active{cursor:grabbing}
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px}
.escala{flex:1;min-width:0;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums}
.grande{font-size:clamp(2rem,8vw,3rem)}
.segmentos{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.seg{font:inherit;font-size:.9rem;font-weight:600;color:var(--acento);background:transparent;border:1.5px solid var(--acento);border-radius:999px;padding:6px 14px;min-height:44px;cursor:pointer}
.seg[aria-pressed="true"]{background:var(--acento);color:var(--sobre-acento)}
.seg:focus-visible{outline:3px solid var(--acento);outline-offset:2px}
@media (max-width:560px){.escena .t-total{font-size:12px}.escena .t-seg{font-size:10px}.escena .t-tramo{font-size:14px}.escena .tramo-n .t-tramo{font-size:15px}.escena .t-vel{font-size:15px}.escena .t-trampa{font-size:13px}.escena .t-regla{font-size:10.5px}.escena .t-juntas{font-size:15px}.escena .rot circle{r:11px}.escena .rot text{font-size:12px}}
/* Pantalla completa («modo lámina»): figura grande, controles compactos, zoom con pellizco */
.pantalla{display:grid;gap:12px}
.barra-lamina{display:flex;align-items:center;gap:10px;margin-top:-4px}
.boton.completa{padding:6px 14px;font-size:.88rem;white-space:nowrap}
.cerrar,.compacto:empty{display:none}
html.sin-scroll,html.sin-scroll body{overflow:hidden}
.modo-lamina{position:fixed;inset:0;z-index:50;background:var(--bg);display:flex;flex-direction:column;gap:6px;
  padding:max(8px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
.modo-lamina .escena{flex:1;min-height:0;display:flex}
.modo-lamina .iso-figure{flex:1;min-height:0;display:flex}
.modo-lamina.pantalla .escena .iso-plate{flex:1;min-height:0;display:flex;padding:30px 6px 26px;overflow:hidden}
.modo-lamina .iso-stage{flex:1;min-height:0;display:flex;overflow:hidden;touch-action:none}
.modo-lamina .iso-svg{width:100%;height:100%;max-height:none;transform-origin:0 0}
.modo-lamina .iso-plate-corner[data-corner="hint"]{display:none}
.modo-lamina .iso-plate-corner[data-corner="title"]{right:64px}
.modo-lamina .compacto output{white-space:nowrap}
.modo-lamina .completa{display:none}
.modo-lamina .cerrar{display:grid;place-items:center;position:absolute;z-index:3;top:max(10px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));
  width:44px;height:44px;border-radius:50%;border:1.5px solid var(--borde-fuerte);background:var(--sup);color:var(--texto);font:600 1.1rem/1 system-ui,sans-serif;cursor:pointer}
.cerrar:focus-visible,.completa:focus-visible{outline:3px solid var(--acento);outline-offset:2px}
.modo-lamina .compacto{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px 12px;align-items:center}
.modo-lamina .compacto .fila{font-size:.82rem;font-weight:600}
.modo-lamina .compacto input[type=range]{height:30px}
.modo-lamina .compacto .boton{white-space:nowrap;padding:8px 12px}
@media (max-width:560px){.modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.modo-lamina .compacto #bloque-t{grid-column:1 / -1}.modo-lamina .compacto .boton{white-space:normal;line-height:1.2}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado del examen: t = valoresIniciales.t, tramo del segundo n resaltado) ----------
function svgFijo() {
  const s = { t: VI.t, n: VI.n, trampa: false };
  const claro = CSS_PRENSA.slice(CSS_PRENSA.indexOf(":root{"), CSS_PRENSA.indexOf("@media (prefers-color-scheme:dark)"))
    .replace(":root{", "svg{").replace(/\s*color-scheme:light;box-sizing:border-box;[\s\S]*?\n\}/, "}");
  const tibio = CSS_PRENSA.slice(CSS_PRENSA.indexOf(".iso{"), CSS_PRENSA.indexOf("@media", CSS_PRENSA.indexOf(".iso{"))).replace(".iso{", "svg.iso{");
  const estilo = `<style>${k.ISO_CSS}${claro}${tibio}svg{background:var(--bg)}${CSS_FIG}</style>`;
  return k.figureSvg({ width: W, height: H, label: J.figura.aria, className: "iso", body: [estilo, DEFS, placa(), regla(), electroiman(), vista(CFG, k, s, J, datos(J, s))] })
    .replace('<svg ', `<svg width="${2 * W}" height="${2 * H}" `);
}

const plate = k.plateHtml({
  fig: "Lámina I",
  title: J.titulo,
  hint: J.instruccion,
  readout: `t 0 s · h 0 m · v 0 m/s`,
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
        <h3 id="pred-t">Predice antes de soltar</h3>
        <div class="segmentos" id="pred-n" role="group"></div>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
        <div class="iso escena">${plate}</div>
        <div class="barra-lamina">
          <span class="escala" id="escala"></span>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="etq-h"></span>
          <output id="o-h" class="grande">0 m</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-t"><div class="fila"><label for="s-t" id="l-t"></label><output id="o-t"></output></div><input type="range" id="s-t"></div>
        </div>
        <div class="chips">
          <div class="chip"><span>Tiempo</span><output id="o-tt"></output></div>
          <div class="chip"><span>Velocidad</span><output id="o-v"></output></div>
          <div class="chip"><span id="c-n"></span><output id="o-n"></output></div>
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
        </details>
      </div>
      <p class="pie" id="pie"></p>
    </section>
    <div id="pasos-b" class="pasos"></div>
  </div>
</main>
<!--respaldo-->
<script type="module">${(kitScript() + `\nconst evalua = ${evalua.toString()};\nconst calc = ${calc.toString()};\nconst num = ${num.toString()};\nconst tpl = ${tpl.toString()};\nconst datos = ${datos.toString()};\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
