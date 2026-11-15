// Lámina 2.5D+ de la conservación de la energía: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/conservacion-de-la-energia-2_5d.mjs                → plantilla/interactivos/conservacion-de-la-energia/plus/index.html
//                                                                              y contenido/fisica/img/conservacion-de-la-energia.svg (figura fija para PDF y video)
//   node plantilla/figuras/conservacion-de-la-energia-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de Arquímedes (plantilla/figuras/principio-de-arquimedes-2_5d.mjs): misma página, pantalla completa,
// evaluador de fórmulas y salida .svg; otro dibujo (banco con rampa, regla de altura, probetas de Ep y Ec, riel y tope) y otra
// lógica (la caja baja por la rampa en tiempo real; las probetas se pasan la energía y la suma no cambia).
// Diferencia con Arquímedes: la rampa cambia de forma con la altura y el ángulo, así que la vista entrega el SVG de los grupos
// que cambian («_h») en vez de solo atributos; aplicar() y E() aceptan esa clave.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "conservacion-de-la-energia";
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
// Variables de entrada: masa m, altura h, ángulo, fracción bajada b (0 arriba, 1 al pie de la rampa) y g.
// Las raíces y el seno se calculan aquí (el evaluador solo hace + − × ÷); el resto sale de J.lecturas.formulas.
// vf: rapidez al pie, v: rapidez tras bajar h·b, vMedio: rapidez a media altura (y la de olvidar el ½), rf: √factor (trampa).
function calc(J, s) {
  const g = J.constantes.g, th = s.ang * Math.PI / 180, sen = Math.sin(th), f = J.trampa.factor;
  const bm = s.h * s.b;
  const v = { m: s.m, h: s.h, g, angulo: s.ang, y: s.h - bm, bajadaM: bm, mF: f * s.m, factor: f, tGrua: J.profundizar.tGrua,
    vf: Math.sqrt(2 * g * s.h), v: Math.sqrt(2 * g * bm), vMedio: Math.sqrt(g * s.h), rf: Math.sqrt(f), L: s.h / sen, aRampa: g * sen };
  v.t = Math.sqrt(2 * v.L / v.aRampa);
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}

// ---------- Modelo del dibujo (z hacia arriba; el frente es +y) ----------
// La rampa y la regla de altura van a la misma escala (SC unidades por metro, fija: así se ve que la altura cambia y que el
// ángulo no). La caja, las probetas y la flecha no van a escala.
const VI = J.valoresIniciales, RG = J.rangos;
const W = 640, H = 420;
const PLACA = { x: -46, y: -78, w: 420, d: 132, r: 9 }, PLACA_H = 12, PATA_H = 5;
const RW = 38, TOPE_X = 338;                                         // ancho de la rampa y tope del riel
const GAUGE = [[262, -54], [300, -54]], GR = 10, GH = 118, GZ = 14;  // probetas Ep y Ec: radio, alto útil, alto del bloque
const POST = { x: -16, y: 26, w: 7, d: 7, r: 1 };                    // regla de altura
const SC = Math.min(150 / RG.h.max, 262 / (RG.h.max / Math.tan(RG.angulo.min * Math.PI / 180)));
const KCAJA = 11;                                                     // lado de la caja = KCAJA · ∛m (dibujo)
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [POST.x, POST.y, RG.h.max * SC + 16], [GAUGE[0][0], GAUGE[0][1], GZ + GH + 10], [TOPE_X + 10, 20, 30]],
  W, H, { pad: 18, azimuth: 56 },
);
const CAM = k.cameraOf(P);
const VIEW = [CAM.cosA * CAM.cosE, CAM.sinA * CAM.cosE, CAM.sinE], LUZ = [-CAM.sinA, CAM.cosA];
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);

// ---------- Vista: estado → atributos (y SVG de los grupos que cambian) ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
function vista(C, K, s, J) {
  const P = C.P, d = calc(J, s), rv = s.revelado;
  const num = (v, dec = 1) => {
    const r = Math.round(v * 10 ** dec) / 10 ** dec;
    let [i, dd] = Math.abs(r).toFixed(dec).split(".");
    dd = (dd || "").replace(/0+$/, "");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (r < 0 ? "−" : "") + i + (dd ? "." + dd : "");
  };
  const tpl = (t, o) => t.replace(/\{(\w+)\}/g, (m, q) => (q in o ? o[q] : m));
  const at = (p) => K.iso(p, P), mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  const Sd = (a, o) => K.solidSvg(a, o), Ln = (a, o) => K.lineSvg(a, o), Dt = (a, o) => K.dotsSvg(a, o);
  const parte = (n, x) => `<g data-parte="${n}">${x}</g>`;
  const m = {};

  // Sólidos convexos en cualquier orientación (la rampa y la caja inclinada): caras visibles con 4 tonos según la luz
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const pp = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const uni = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const casco = (pts) => {
    const q = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of q.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  const poli = (pts) => K.pathOf(pts, true);
  const solido = (V3, caras, { tone = "hi", lit = false, cls = "", fantasma = false } = {}) => {
    const c = V3.reduce((a, v) => [a[0] + v[0] / V3.length, a[1] + v[1] / V3.length, a[2] + v[2] / V3.length], [0, 0, 0]);
    const pan = V3.map(at), hp = poli(casco(pan));
    if (fantasma) return `<path class="fantasma" d="${hp}"/>`;
    const ve = [], tonos = [[], [], [], []], tapas = [];
    caras.forEach((f) => {
      let n = uni(cruz(sub(V3[f[1]], V3[f[0]]), sub(V3[f[2]], V3[f[0]])));
      if (pp(n, sub(V3[f[0]], c)) < 0) n = n.map((x) => -x);
      const vis = pp(n, C.VIEW) > 1e-6; ve.push(vis);
      if (!vis) return;
      const dd = poli(f.map((i) => pan[i]));
      if (n[2] > 0.55) tapas.push(dd);
      else { const h = Math.hypot(n[0], n[1]) || 1, l = ((n[0] / h) * C.LUZ[0] + (n[1] / h) * C.LUZ[1] + 1) / 2; tonos[Math.min(3, Math.max(0, Math.floor(l * 4)))].push(dd); }
    });
    const aristas = new Map(), pliegues = [];
    caras.forEach((f, fi) => f.forEach((a, i) => { const b = f[(i + 1) % f.length], key = a < b ? a + "-" + b : b + "-" + a;
      if (aristas.has(key)) { if (ve[aristas.get(key)] && ve[fi]) pliegues.push(K.pathOf([pan[a], pan[b]])); } else aristas.set(key, fi); }));
    return `<g class="iso-solid ${cls}"${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${hp}"/>`
      + tonos.map((t, i) => t.length ? `<path class="iso-shade" data-shade="${i}" d="${t.join("")}"/>` : "").join("")
      + (tapas.length ? `<path class="iso-top" d="${tapas.join("")}"/>` : "")
      + (pliegues.length ? `<path class="iso-line iso-crease" data-tone="faint" d="${pliegues.join("")}"/>` : "")
      + `<path class="iso-line iso-edge" data-tone="${tone}" d="${hp}"/></g>`;
  };
  const CAJA_F = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];

  // Geometría: la rampa sale de h y del ángulo, a escala fija
  const th = s.ang * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
  const Hp = s.h * C.SC, Rp = Hp / Math.tan(th), Lp = d.L * C.SC, lado = (mm) => C.KCAJA * Math.cbrt(mm);
  const enPiso = s.fase === "piso" || s.fase === "tope";
  const enRampa = (dd, y, up) => [dd * cs + up * sn, y, Hp - dd * sn + up * cs];   // a dd del borde de arriba, up sobre la superficie
  const caja = (mm) => {
    const l = lado(mm);
    if (enPiso) {
      const x0 = Rp + 2 + s.xf * C.SC;
      return { v: [0, 1].flatMap((a) => [0, 1].flatMap((b) => [0, 1].map((c) => [x0 + a * l, (b - 0.5) * l, c * l]))), l,
        c: [x0 + l / 2, 0, l / 2], frente: [x0 + l, 0, l / 2], dir: [1, 0, 0] };
    }
    const dd = l / 2 + 3 + s.b * (Lp - l - 3);
    return { v: [0, 1].flatMap((a) => [0, 1].flatMap((b) => [0, 1].map((c) => enRampa(dd + (a - 0.5) * l, (b - 0.5) * l, c * l)))), l,
      c: enRampa(dd, 0, l / 2), frente: enRampa(dd + l / 2, 0, l / 2), dir: [cs, 0, -sn] };
  };

  // Probetas: el nivel de cada una es su parte de la energía total (llenas = E)
  const nivel = [d.E ? d.Ep / d.E : 0, d.E ? d.Ec / d.E : 0];
  C.GAUGE.forEach(([x, y], i) => {
    const hl = C.GH * nivel[i];
    m[i ? "g-ec" : "g-ep"] = { _h: hl > 0.6 ? Sd(K.cylinder(x, y, C.GR - 0.8, C.GZ + 4, hl, P, 36), { tone: "mid", crease: "none", className: i ? "agua" : "agua clara" }) : "" };
  });

  // Escena: rieles, rampa, regla de altura, pasador, caja, fantasma, tope y flecha (en orden de pintura)
  const o = [];
  const riel = (y) => { const x0 = Rp - 2, pl = { x: x0, y, w: C.TOPE_X - x0, d: 4, r: 1 };
    return Sd(K.slabOf(pl, 0, 3, P, 3, 0.4), { tone: "mid" }) + Dt([x0 + 6, C.TOPE_X - 6].map((x) => at([x, y + 2, 3])), { size: 0.4 }); };
  o.push(parte("08", riel(-C.RW / 2 - 6)));
  // Rampa (prisma triangular) con guías, ranura dorada a media altura, remaches, transportador y bisagras
  const y0 = -C.RW / 2, y1 = C.RW / 2;
  const R3 = [[0, y0, 0], [Rp, y0, 0], [0, y0, Hp], [0, y1, 0], [Rp, y1, 0], [0, y1, Hp]];
  let r = `<path class="iso-halo" d="${poli(casco([[0, y0, 0], [Rp, y0, 0], [0, y1, 0], [Rp, y1, 0]].map(at)))}"/>`;
  r += solido(R3, [[0, 1, 2], [3, 4, 5], [2, 1, 4, 5], [0, 2, 5, 3], [0, 1, 4, 3]], { tone: "mid" });
  for (const y of [y0 + 3, y1 - 3]) r += Ln(K.pathOf([at([0, y, Hp]), at([Rp, y, 0])]), { tone: "lo" });
  const rem = []; for (let i = 1; i < 8; i++) { const f = i / 8; if ((1 - f) * Hp > 8) rem.push(at([f * Rp - 4 * sn, y1, (1 - f) * Hp - 4 * cs])); }
  r += Dt(rem, { size: 0.45 });
  r += Sd(K.slabOf({ x: Rp - 3, y: y0 - 3, w: 6, d: 5, r: 1.5 }, 0, 4, P, 3), { tone: "mid" }) + Sd(K.slabOf({ x: Rp - 3, y: y1 - 2, w: 6, d: 5, r: 1.5 }, 0, 4, P, 3), { tone: "mid" });
  o.push(parte("03", r));
  o.push(parte("04", Ln(K.pathOf([at([0, y1, Hp / 2]), at([Rp / 2, y1, Hp / 2])]), { tone: "mid", className: "marca-h" })));
  const RT = Math.min(30, Rp * 0.4), arco = [], mk = [];
  for (let i = 0; i <= 24; i++) { const a = th * i / 24; arco.push(at([Rp - RT * Math.cos(a), y1, RT * Math.sin(a)])); }
  for (let g = 5; g < s.ang; g += 5) { const a = g * Math.PI / 180, l = g % 15 === 0 ? 4 : 2.2;
    mk.push(K.pathOf([at([Rp - RT * Math.cos(a), y1, RT * Math.sin(a)]), at([Rp - (RT - l) * Math.cos(a), y1, (RT - l) * Math.sin(a)])])); }
  const pa = at([Rp - RT - 4, y1, 3]);
  o.push(parte("09", Ln(K.pathOf(arco), { tone: "mid" }) + Ln(mk.join(""), { tone: "lo" })
    + `<text class="t-regla" text-anchor="end" x="${pa[0].toFixed(1)}" y="${(pa[1] + 2).toFixed(1)}">${tpl(J.figura.angulo, { angulo: num(s.ang, 0) })}</text>`));
  // Regla de altura: poste con marcas cada metro (cada 2 si es alta), mayor cada 5, corredera dorada a media altura
  const PO = C.POST, tope = Hp + 8, fx = PO.x + PO.w, fy = PO.y + PO.d, cada = s.h <= 10 ? 1 : 2;
  let p2 = Sd(K.slabOf({ x: PO.x - 5, y: PO.y - 5, w: 17, d: 17, r: 2 }, 0, 4, P, 4, 0.5), { tone: "mid" })
    + Dt([[PO.x - 2, PO.y - 2], [PO.x + 9, PO.y + 9]].map(([x, y]) => at([x, y, 4])), { size: 0.4 })
    + Sd(K.slabOf(PO, 4, tope - 4, P, 2, 0.3), { tone: "mid" });
  let mn = "", mj = "";
  for (let q = 0; q <= s.h + 1e-9; q += cada) { const z = q * C.SC, big = q % 5 === 0, sg = K.pathOf([at([fx, fy, z]), at([fx - (big ? 5 : 3), fy, z])]); if (big) mj += sg; else mn += sg; }
  p2 += Ln(mn, { tone: "lo" }) + Ln(mj, { tone: "mid" });
  p2 += Sd(K.cylinder(PO.x + PO.w / 2, PO.y + PO.w / 2, 2.6, tope, 2.4, P, 16), { tone: "mid" });
  const ph = at([PO.x, fy, Hp + 3]);
  p2 += `<text class="t-regla" text-anchor="end" x="${(ph[0] - 4).toFixed(1)}" y="${ph[1].toFixed(1)}">${tpl(J.figura.h, { h: num(s.h, 0) })}</text>`;
  o.push(parte("02", p2));
  o.push(parte("04", Sd(K.slabOf({ x: PO.x - 1.5, y: PO.y - 1.5, w: PO.w + 3, d: PO.w + 3, r: 0.8 }, Hp / 2 - 2, 4, P, 2, 0.3), { tone: "mid", className: "corredera" })));
  // Pasador de liberación: abajo sujeta la caja; sube al soltarla
  const suelto = !(s.fase === "arriba" && s.b === 0), pz = suelto ? 14 : 0, pq = enRampa(lado(s.m) + 6, C.RW / 2 - 6, 0);
  o.push(parte("01", Sd(K.cylinder(pq[0], pq[1], 2.2, pq[2] + pz, 9, P, 14), { tone: "hi" })
    + Sd(K.cylinder(pq[0], pq[1], 3.6, pq[2] + pz + 9, 2.4, P, 18), { tone: "mid" })
    + Ln(K.knurl(pq[0], pq[1], 3.6, pq[2] + pz + 9, pq[2] + pz + 11.4, 14, P), { tone: "lo" })));
  // Caja (la que hay que mirar, en lit), con su masa grabada; fantasma de la trampa
  const B = caja(s.m);
  const top = at([B.c[0], B.c[1], B.c[2] + B.l / 2]);
  o.push(`<g class="arrastre" data-parte="01">${solido(B.v, CAJA_F, { tone: "hi", lit: true })}`
    + `<text class="t-regla" text-anchor="middle" x="${top[0].toFixed(1)}" y="${(top[1] + 3).toFixed(1)}">${tpl(J.figura.m, { m: num(s.m, 0) })}</text></g>`);
  if (s.trampa) {
    const BF = caja(d.mF), tf = at([BF.c[0], BF.c[1], BF.c[2] + BF.l * 0.9]);
    o.push(`<g data-parte="01">${solido(BF.v, CAJA_F, { fantasma: true })}<text class="t-trampa" text-anchor="middle" x="${(tf[0] - 36).toFixed(1)}" y="${(tf[1] - 26).toFixed(1)}">`
      + `<tspan>${tpl(J.figura.fantasma, { mFantasma: num(d.mF, 0) })}</tspan><tspan x="${(tf[0] - 36).toFixed(1)}" dy="14">${rv ? tpl(J.figura.real, { vf: num(d.vf) }) : tpl(J.figura.real, { vf: "?" })}</tspan></text></g>`);
  }
  o.push(parte("08", riel(C.RW / 2 + 2)));
  o.push(parte("08", Sd(K.slabOf({ x: C.TOPE_X, y: -26, w: 9, d: 52, r: 1.5 }, 0, 26, P, 3, 0.6), { tone: "mid" })
    + Dt([[C.TOPE_X + 4.5, -19], [C.TOPE_X + 4.5, 19]].map(([x, y]) => at([x, y, 26])), { size: 0.45 })
    + Sd(K.slabOf({ x: C.TOPE_X - 4, y: -12, w: 4, d: 24, r: 1.5 }, 5, 14, P, 4), { tone: "lo" })));
  if (s.trampa) { const pr = at([Rp - 10, 60, -16]);
    o.push(`<text class="t-trampa" data-parte="09" text-anchor="start" x="${pr[0].toFixed(1)}" y="${pr[1].toFixed(1)}">${J.figura.fantasmaRampa}</text>`); }
  // Flecha de velocidad (no a escala): sale de la cara de enfrente de la caja, en la dirección del movimiento
  const vAhora = enPiso ? d.vf : d.v;
  let fl = null;
  if (vAhora > 0.05 && s.fase !== "tope") {
    const len = 16 + vAhora * 2.2, a0 = B.frente, a1 = [a0[0] + B.dir[0] * len, a0[1], a0[2] + B.dir[2] * len];
    const A = at(a0), F = at(a1), u = [F[0] - A[0], F[1] - A[1]], l = Math.hypot(u[0], u[1]), ux = u[0] / l, uy = u[1] / l;
    const cab = Math.min(8, l * 0.6), an = cab * 0.5, bx = F[0] - ux * cab, by = F[1] - uy * cab;
    o.push(`<g class="flecha" data-parte="10"><line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${(bx + ux).toFixed(1)}" y2="${(by + uy).toFixed(1)}"/>`
      + `<polygon points="${F[0].toFixed(1)},${F[1].toFixed(1)} ${(bx - uy * an).toFixed(1)},${(by + ux * an).toFixed(1)} ${(bx + uy * an).toFixed(1)},${(by - ux * an).toFixed(1)}"/>`
      + `<text class="t-vel" x="${(F[0] + 8).toFixed(1)}" y="${(F[1] - 6).toFixed(1)}">${rv ? tpl(J.figura.v, { v: num(vAhora) }) : tpl(J.figura.v, { v: "?" })}</text></g>`);
    fl = a1;
  }
  m["g-escena"] = { _h: o.join("") };

  // Lecturas de las probetas (texto bajo cada una)
  C.GAUGE.forEach(([x, y], i) => { const q = at([x + C.GR * C.TV[0], y + C.GR * C.TV[1], 0]);
    m[i ? "t-ec" : "t-ep"] = { x: q[0].toFixed(1), y: (q[1] + 13).toFixed(1), _t: tpl(i ? J.figura.Ec : J.figura.Ep, { Ep: num(d.Ep), Ec: num(d.Ec) }).replace(/<\/?sub>/g, "") }; });
  const qe = at([(C.GAUGE[0][0] + C.GAUGE[1][0]) / 2, C.GAUGE[0][1], C.GZ + C.GH + 22]);
  m["t-e"] = { x: qe[0].toFixed(1), y: qe[1].toFixed(1), _t: tpl(J.figura.E, { E: num(d.E) }) };

  // Rótulos
  const rot = (nn, p, ver = true) => { m["rot-" + nn] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  rot("01", mas(at([B.c[0], B.c[1], B.c[2] + B.l / 2]), 16, -22));
  rot("02", mas(at([PO.x, PO.y + PO.d, Hp * 0.75]), -16, 0));
  rot("03", mas(at([Rp * 0.6, C.RW / 2, Hp * 0.16]), -8, 16));
  rot("04", mas(at([Rp * 0.25, C.RW / 2, Hp / 2]), 10, 20));
  rot("05", mas(at([C.GAUGE[0][0] - C.GR, C.GAUGE[0][1], C.GZ + C.GH * 0.8]), -16, 0));
  rot("06", mas(at([C.GAUGE[1][0] + C.GR, C.GAUGE[1][1], C.GZ + C.GH * 0.55]), 16, 0));
  rot("07", mas(at([C.GAUGE[0][0] + 20, C.GAUGE[0][1] - 14, C.GZ]), 0, -10));
  rot("08", mas(at([C.TOPE_X - 40, C.RW / 2 + 6, 0]), 0, 18));
  rot("09", mas(at([Rp - RT * 0.9, C.RW / 2, 4]), -16, 18));
  rot("10", fl ? mas(at(fl), 4, 16) : [0, 0], !!fl);
  return m;
}

// ---------- Piezas fijas ----------
function placa() {
  const o = [`<path class="iso-halo" d="${k.haloOf(PLACA, -PLACA_H - PATA_H, PLACA_H, P)}"/>`];
  for (const [x, y] of k.corners(PLACA, 22).sort((a, b) => prof(a) - prof(b))) {
    o.push(S(k.cylinder(x, y, 7, -PLACA_H - PATA_H, 1.6, P, 28), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 5.4, -PLACA_H - PATA_H + 1.6, PATA_H - 1.6, P, 28), { tone: "mid" }));
  }
  o.push(S(k.slabOf(PLACA, -PLACA_H, PLACA_H, P, 8, 1.6), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(PLACA, 5), 0, P), { tone: "lo" }));
  const torn = k.corners(PLACA, 10);
  o.push(L(torn.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), D(torn.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Regla del piso (nivel de referencia, h = 0)
  const tira = { x: -20, y: PLACA.y + PLACA.d - 15, w: 372, d: 7, r: 1 };
  o.push(S(k.slabOf(tira, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(tira.x + 4, tira.x + tira.w - 4, 4, 5, tira.y + 0.8, 0.6, [2, 3.6], P);
  o.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const pr = at([tira.x + tira.w - 2, tira.y + tira.d, 0]);
  o.push(`<text class="t-regla" text-anchor="end" x="${pr[0].toFixed(1)}" y="${(pr[1] + 11).toFixed(1)}">${esc(J.figura.referencia)}</text>`);
  // Placa de datos al fondo, a la izquierda
  const pl = { x: -38, y: -70, w: 40, d: 22, r: 2 };
  o.push(S(k.slabOf(pl, 0, 0.8, P, 3, 0.4), { tone: "mid" }));
  for (let i = 0; i < 3; i++) o.push(L(k.lineOnTop([pl.x + 6, pl.y + 6 + i * 5], [pl.x + pl.w - 8 - i * 6, pl.y + 6 + i * 5], 0.8, P), { tone: "lo", free: true }));
  o.push(D([[pl.x + 3, pl.y + 3], [pl.x + pl.w - 3, pl.y + pl.d - 3]].map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  return `<g data-parte="08">${o.join("")}</g>`;
}
// Bloque de las probetas con el tubo que las une (la energía solo pasa de una a otra)
function bloque() {
  const b = { x: GAUGE[0][0] - 16, y: GAUGE[0][1] - 14, w: 70, d: 28, r: 3 };
  return `<g data-parte="07"><path class="iso-halo" d="${k.haloOf(b, 0, GZ, P)}"/>` + S(k.slabOf(b, 0, GZ, P, 5, 0.8), { tone: "mid" })
    + L(k.sideSeam(b, GZ - 4, P, 5), { tone: "faint" }) + D(k.corners(b, 4).map(([x, y]) => at([x, y, GZ])), { size: 0.45 })
    + S(k.slabOf({ x: GAUGE[0][0], y: GAUGE[0][1] - 2, w: GAUGE[1][0] - GAUGE[0][0], d: 4, r: 2 }, GZ, 4, P, 4), { tone: "lo" })
    + GAUGE.map(([x, y]) => S(k.cylinder(x, y, GR + 2.4, GZ, 4, P, 36, 0.5), { tone: "mid" })).join("") + `</g>`;
}
// Vidrio de una probeta con su graduación (mayor cada 25 %) y su aro de arriba
function vidrio(i) {
  const [x, y] = GAUGE[i], fx = x + GR * CAM.cosA, fy = y + GR * CAM.sinA;
  let mn = "", mj = "";
  for (let q = 0; q <= 20; q++) { const z = GZ + 4 + GH * q / 20, big = q % 5 === 0, l = big ? 3.4 : 2;
    const sg = k.pathOf([at([fx, fy, z]), at([fx - l * CAM.sinA, fy + l * CAM.cosA, z])]); if (big) mj += sg; else mn += sg; }
  return S(k.cylinder(x, y, GR, GZ + 4, GH, P, 36), { tone: "mid", crease: "none", className: "vidrio" })
    + L(mn, { tone: "lo" }) + L(mj, { tone: "mid" })
    + S(k.cylinder(x, y, GR + 1.6, GZ + 4 + GH, 3, P, 36, 0.4), { tone: "mid" }) + L(k.ring(x, y, GR - 1, GZ + 7 + GH, P, 30), { tone: "lo" });
}

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = J.rotulos.map((r) => r.n);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function E(tag, id, attrs, m, inner = "") {
  const v = (m && m[id]) || {}, a = { id, ...attrs };
  for (const [q, x] of Object.entries(v)) if (q[0] !== "_") a[q] = x;
  if (v._v === false) a.style = "display:none";
  const txt = "_t" in v ? esc(v._t) : "_h" in v ? v._h : inner;
  return `<${tag}${Object.entries(a).map(([q, x]) => ` ${q}="${esc(x)}"`).join("")}>${txt}</${tag}>`;
}
function cuerpo(m) {
  return [
    placa(), bloque(),
    `<g data-parte="05">${E("g", "g-ep", {}, m)}${vidrio(0)}</g>`,
    `<g data-parte="06">${E("g", "g-ec", {}, m)}${vidrio(1)}</g>`,
    E("g", "g-escena", {}, m),
    E("text", "t-ep", { class: "t-regla", "text-anchor": "middle", "data-parte": "05" }, m),
    E("text", "t-ec", { class: "t-regla", "text-anchor": "middle", "data-parte": "06" }, m),
    E("text", "t-e", { class: "t-regla", "text-anchor": "middle", "data-parte": "07" }, m),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { P, W, H, SC, KCAJA, RW, TOPE_X, GAUGE, GR, GH, GZ, POST, VIEW, LUZ, TV: [CAM.cosA, CAM.sinA], ROT };
const estado0 = { m: VI.m, h: VI.h, ang: VI.angulo, b: VI.bajada / 100, fase: "arriba", xf: 0, revelado: false, trampa: false };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, vista y calc) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg, cylinder, slabOf, knurl };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/conservacion-de-la-energia-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/conservacion-de-la-energia-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles;
const num = (v, dec = 1) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const sinEtiquetas = (s) => s.replace(/<[^>]+>/g, "");

let m = V.m, h = V.h, ang = V.angulo, b = V.bajada / 100, fase = "arriba", xf = 0;
let revelado = false, trampaOn = false, sel = null, selRec = false, enRecorrido = false;
const numeros = (st = { m, h, ang, b }) => {
  const d = calc(J, st);
  return { m: num(d.m, 0), h: num(d.h, 1), g: num(d.g), angulo: num(d.angulo, 0), y: num(d.y), bajadaM: num(d.bajadaM),
    E: num(d.E), Ep: num(d.Ep), Ec: num(d.Ec), v: num(d.v), vf: num(d.vf), vMedio: num(d.vMedio), L: num(d.L), aRampa: num(d.aRampa),
    t: num(d.t), mFantasma: num(d.mF, 0), EFantasma: num(d.EF), factor: num(d.factor, 0), gh: num(d.gh), v2: num(d.v2),
    tGrua: num(d.tGrua), P: num(d.Pot), mitadH: num(d.h / 2), mitadE: num(d.E / 2) };
};
const abajo = () => fase === "piso" || fase === "tope" || b >= 1 - 1e-9;

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#soltar"), bTrampa = $("#trampa"), bExamen = $("#examen"), nota = $("#nota");
const SL = { h: $("#s-h"), m: $("#s-m"), angulo: $("#s-angulo"), bajada: $("#s-bajada") };
const VALOR = { h: "valorH", m: "valorM", angulo: "valorAngulo", bajada: "valorBajada" };

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#pred-t").textContent = J.prediccion.titulo;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
for (const q in SL){ $("#l-" + q).textContent = CT[q]; Object.assign(SL[q], { min: RG[q].min, max: RG[q].max, step: RG[q].paso }); }
stage.setAttribute("aria-valuemin", "0"); stage.setAttribute("aria-valuemax", "100");
stage.setAttribute("aria-label", "Lámina: flechas arriba y abajo suben o bajan la caja por la rampa; B la suelta");

// ---------- Rótulos y fichas (nombre y texto en J.rotulos; lo que aún no se revela sale como «?») ----------
const fichaVacia = "Toca un número para ver qué hace cada parte.";
const ROTULO = Object.fromEntries(J.rotulos.map(r => [r.n, r]));
function setSel(n){
  sel = n;
  document.querySelectorAll(".rot-b").forEach(q => q.setAttribute("aria-pressed", q.dataset.n === sel));
  apagar();
  svg.querySelectorAll(".rot").forEach(g => g.classList.toggle("activo", g.dataset.n === sel));
  pintarFicha();
}
// Como la escena se redibuja, el atenuado se vuelve a poner después de cada cambio
function apagar(){
  svg.querySelectorAll("[data-parte]").forEach(e => {
    const dentro = e.closest(`[data-parte="${sel}"]`) || e.querySelector(`[data-parte="${sel}"]`);
    e.classList.toggle("apagado", !!sel && !dentro);
  });
}
const seleccionar = (n) => { selRec = false; setSel(sel === n ? null : n); };
function valores(){
  const rv = revelado && !enRecorrido, n = numeros(), oc = (v) => (rv ? v : "?");
  return { ...n, v: oc(n.v), vf: oc(n.vf), vMedio: oc(n.vMedio) };
}
function pintarFicha(){
  const f = ROTULO[sel];
  if (!f){ $("#ficha").innerHTML = fichaVacia; return; }
  $("#ficha").innerHTML = `<b>${sel} · ${f.nombre}.</b> ${tpl(f.ficha, valores())}`;
}
C.ROT.forEach(n => {
  const q = document.createElement("button"); q.type = "button"; q.className = "rot-b"; q.dataset.n = n;
  q.setAttribute("aria-pressed", "false"); q.innerHTML = `<b>${n}</b><span>${ROTULO[n].nombre}</span>`;
  q.addEventListener("click", () => seleccionar(n)); $("#rotulos").append(q);
  $("#rot-" + n).addEventListener("click", (e) => { e.stopPropagation(); seleccionar(n); });
});

// ---------- Mensajes ----------
const decir = (s) => { if (!enRecorrido) nota.textContent = s; };

// ---------- Dibujo que cambia: la vista da los atributos; solo se escriben los que cambian ----------
const previo = new Map();
function aplicar(mm){
  let redibujo = false;
  for (const id in mm){
    if (id[0] === "_") continue;
    const e = document.getElementById(id); if (!e) continue;
    const v = mm[id];
    for (const q in v){
      const val = q === "_v" ? (v[q] ? "" : "none") : String(v[q]), clave = id + "|" + q;
      if (previo.get(clave) === val) continue; previo.set(clave, val);
      if (q === "_v") e.style.display = val; else if (q === "_t") e.textContent = val;
      else if (q === "_h"){ e.innerHTML = val; redibujo = true; } else e.setAttribute(q, val);
    }
  }
  if (redibujo && sel) apagar();
}
const estado = () => ({ m, h, ang, b, fase, xf, revelado: revelado && !enRecorrido, trampa: trampaOn });
const valorDe = (q) => tpl(CT[VALOR[q]], { v: num(q === "bajada" ? b * 100 : { h, m, angulo: ang }[q], 0) });

function render(){
  const rv = revelado && !enRecorrido, d = calc(J, { m, h, ang, b }), n = numeros(), o = valores();
  aplicar(vista(C, K, estado(), J));
  const vAhora = fase === "piso" || fase === "tope" ? d.vf : d.v;
  // Panel
  $("#o-v").textContent = rv ? `${num(vAhora)} m/s` : "?";
  $("#o-formula").innerHTML = rv ? tpl(abajo() ? L.rapidezAbajo : L.rapidezValor, n) : L.sinRevelar;
  for (const q in SL){
    const val = q === "bajada" ? b * 100 : { h, m, angulo: ang }[q], s = SL[q];
    s.style.setProperty("--p", (100 * (val - RG[q].min) / (RG[q].max - RG[q].min)) + "%");
    if (Math.abs(+s.value - val) > 1e-6) s.value = val;
    $("#o-" + q).textContent = valorDe(q);
    s.setAttribute("aria-valuetext", valorDe(q));
  }
  $("#o-ep").textContent = `${n.Ep} J`; $("#o-ec").textContent = `${n.Ec} J`; $("#o-e").textContent = `${n.E} J`;
  const lect = `bajó ${n.bajadaM} de ${n.h} m · v ${rv ? num(vAhora) : "?"} m/s`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", num(b * 100, 0));
  stage.setAttribute("aria-valuetext", `bajó ${n.bajadaM} de ${n.h} m, Ep ${n.Ep} J, Ec ${n.Ec} J` + (rv ? `, rapidez ${num(vAhora)} m/s` : ""));
  bPri.textContent = abajo() ? CT.reiniciar : CT.soltar;
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.energia, tpl(L.energiaValor, n)], [L.reparto, tpl(L.epValor, n) + "<br>" + tpl(L.ecValor, n) + `<br><span class="et">${tpl(L.suma, n)}</span>`],
    [L.rapidez, rv ? tpl(L.rapidezValor, n) + "<br>" + tpl(L.rapidezAbajo, n) : L.pendiente], ["Rampa", tpl(L.rampa, n)]
  ];
  if (trampaOn) filas.push(["Trampa", rv ? tpl(L.trampa, n) : L.pendiente]);
  $("#lecturas").innerHTML = filas.map((q, i) => `<li><span class="nl">${nl[i] || "·"}</span><span class="et">${q[0]}</span><span class="va">${q[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento: la caja baja con aceleración g·sen θ (en tiempo real) y sigue por el riel hasta el tope ----------
let anim = 0, tR = 0;
const limitePiso = () => { const d = calc(J, { m, h, ang, b: 1 }), Rp = h * C.SC / Math.tan(ang * Math.PI / 180); return Math.max(0, (C.TOPE_X - 4 - Rp - 2 - C.KCAJA * Math.cbrt(m)) / C.SC); };
function avanzar(dt){
  const d = calc(J, { m, h, ang, b: 1 });
  if (fase === "rampa"){ tR += dt; b = Math.min(1, 0.5 * d.aRampa * tR * tR / d.L); if (b >= 1){ fase = "piso"; xf = 0; } return true; }
  if (fase === "piso"){ xf += d.vf * dt; if (xf >= limitePiso()){ xf = limitePiso(); fase = "tope"; return false; } return true; }
  return false;
}
function terminar(){
  if (enRecorrido) return;
  const n = numeros();
  decir(tpl(L.mensajeFin, n) + (trampaOn ? " " + tpl(L.mensajeTrampa, n) : ""));
}
let pendiente = false;   // corrida interrumpida por salir de pantalla: se retoma al volver
function correr(){
  cancelAnimationFrame(anim); pendiente = true;
  if (quieto){ b = 1; fase = "tope"; xf = limitePiso(); pendiente = false; terminar(); render(); return; }
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
    const sigue = avanzar(dt); render();
    if (sigue) anim = requestAnimationFrame(paso); else { anim = 0; pendiente = false; terminar(); render(); }
  };
  render(); anim = requestAnimationFrame(paso);
}
function nuevo(){ cancelAnimationFrame(anim); anim = 0; pendiente = false; }
function arriba(){ nuevo(); b = 0; fase = "arriba"; xf = 0; }
function soltar(){
  nuevo(); revelado = true;
  if (abajo()){ arriba(); decir(tpl(L.mensajeArriba, numeros())); render(); return; }
  const d = calc(J, { m, h, ang, b: 1 });
  tR = Math.sqrt(2 * b * d.L / d.aRampa); fase = "rampa";
  decir("Bajando: la Ep se vuelve Ec y la suma no cambia.");
  correr();
}
const principal = soltar;

// ---------- Arrastre de la caja por la rampa (solo la caja captura el dedo) ----------
let arr = null;
const enSvg = (e) => { const q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; return q.matrixTransform(svg.getScreenCTM().inverse()); };
svg.addEventListener("pointerdown", (e) => {
  if (e.button > 0 || !e.target.closest(".arrastre")) return;
  e.stopPropagation(); tomarControl(); nuevo(); revelado = true; fase = "arriba"; xf = 0;
  const th = ang * Math.PI / 180, Hp = h * C.SC, Rp = Hp / Math.tan(th);
  arr = { a: iso([0, 0, Hp], C.P), z: iso([Rp, 0, 0], C.P), id: e.pointerId }; svg.setPointerCapture(e.pointerId); svg.classList.add("tomado");
});
svg.addEventListener("pointermove", (e) => {
  if (!arr || e.pointerId !== arr.id) return;
  const q = enSvg(e), dx = arr.z[0] - arr.a[0], dy = arr.z[1] - arr.a[1];
  b = Math.round(Math.max(0, Math.min(1, ((q.x - arr.a[0]) * dx + (q.y - arr.a[1]) * dy) / (dx * dx + dy * dy))) * 20) / 20; render();
});
const suelta = (e) => { if (!arr || e.pointerId !== arr.id) return; arr = null; svg.classList.remove("tomado"); render(); };
svg.addEventListener("pointerup", suelta); svg.addEventListener("pointercancel", suelta);

// ---------- Recorrido automático: baja y sube la caja y recorre los rótulos, sin mostrar la rapidez; se detiene al tocar ----------
const REC = C.ROT.map((n, i) => ({ b: i % 2 ? 0 : 1, sel: n }));
let tRec = 0, iRec = 0, animRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  const r = REC[iRec % REC.length]; iRec++;
  selRec = true; setSel(r.sel);
  const b0 = b, t0 = performance.now(), DUR = 900;
  nuevo(); fase = "arriba"; xf = 0;
  const paso = (ahora) => {
    if (!enRecorrido) return;
    const u = Math.min(1, (ahora - t0) / DUR), e = u * u * (3 - 2 * u);
    b = b0 + (r.b - b0) * e; render();
    if (u < 1) animRec = requestAnimationFrame(paso);
    else { b = r.b; render(); tRec = setTimeout(pasoRecorrido, 2200); }
  };
  animRec = requestAnimationFrame(paso);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim || arr){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe una corrida del usuario
  enRecorrido = true; nota.textContent = ""; pasoRecorrido();
}
function tomarControl(){
  if (enRecorrido){
    enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(animRec); animRec = 0;
    if (selRec){ selRec = false; setSel(null); }
    b = Math.round(b * 20) / 20; render();
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
function alExamen(){
  nuevo(); m = V.m; h = V.h; ang = V.angulo; arriba(); revelado = false;
  if (trampaOn){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
  document.querySelectorAll("#pred-ops .op").forEach(q => { q.classList.remove("bien", "mal"); q.querySelector(".res").innerHTML = ""; });
  decir(tpl(L.mensajeReinicio, numeros())); render();
}
bExamen.addEventListener("click", alExamen);
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){ arriba(); revelado = true; decir("Las dos cajas bajan juntas: compara cómo llegan."); soltar(); }
  else render();
});
for (const q in SL) SL[q].addEventListener("input", () => {
  nuevo(); revelado = true; const v = +SL[q].value;
  if (q === "bajada"){ b = v / 100; fase = "arriba"; xf = 0; }
  else { if (q === "h") h = v; else if (q === "m") m = v; else ang = v; if (fase !== "arriba"){ fase = "arriba"; xf = 0; } }
  render();
});
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
stage.addEventListener("keydown", (e) => {
  const dv = {ArrowDown:1, ArrowUp:-1}[e.key];
  if (dv === undefined) return;
  e.preventDefault(); nuevo(); revelado = true; fase = "arriba"; xf = 0;
  b = Math.max(0, Math.min(1, Math.round(b * 20 + dv) / 20)); render();
});

// ---------- Preguntas ----------
const BIEN = '<svg class="ico b" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>';
const MAL = '<svg class="ico m" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
function opciones(cont, ops, alElegir){
  cont.innerHTML = "";
  ops.forEach(o => {
    const q = document.createElement("button"); q.type = "button"; q.className = "op";
    q.innerHTML = `<span>${o.t}</span><span class="res" aria-live="polite"></span>`;
    q.addEventListener("click", () => {
      q.classList.add(o.ok ? "bien" : "mal");
      q.querySelector(".res").innerHTML = `${o.ok ? BIEN : MAL} <b>${o.ok ? J.prueba.marcaCorrecta : J.prueba.marcaIncorrecta}.</b> ${o.e}`;
      if (alElegir) alElegir(o);
    });
    cont.append(q);
  });
}
// Predice: la caja de factor × m. Opciones relativas (no revelan la rapidez), ordenadas de menor a mayor
const LETRAS = ["A", "B", "C", "D"];
const ex = { m: V.m, h: V.h, ang: V.angulo, b: 0 }, d0 = calc(J, ex), n0 = numeros(ex), n1 = numeros({ ...ex, b: 1 });
const OPP = J.prediccion.opciones.map(q => ({ v: evalua(q.formula, d0), ok: q.tipo === "igual", e: tpl(q.retro, n0), t0: tpl(q.texto, n0) }))
  .sort((p, q) => p.v - q.v).map((q, i) => ({ ...q, t: `${LETRAS[i]}) ${q.t0}` }));
$("#pred-q").innerHTML = tpl(J.prediccion.pregunta, n0);
opciones($("#pred-ops"), OPP, () => {
  tomarControl(); nuevo(); m = V.m; h = V.h; ang = V.angulo; arriba(); revelado = true;
  if (!trampaOn){ trampaOn = true; bTrampa.setAttribute("aria-pressed", "true"); bTrampa.textContent = CT.ocultarTrampa; }
  soltar();
});

// ---------- Los 6 pasos (capa 1) ----------
const n = n0;
const OPX = J.examen.opciones.map(o => ({ t: `${o.letra}) ${num(evalua(o.formula, d0))} m/s`, ok: !!o.correcta, e: tpl(o.retro, n) }));
const letra = (f) => J.examen.opciones.find(o => o.formula === f).letra;
const PASOS = [
  {n:1, titulo:"Pregunta de examen", enunciado:tpl(J.examen.pregunta, n), ops:OPX},
  {n:2, titulo:"Idea en una frase", p:['Sin fricción, la energía mecánica no se crea ni se pierde: la energía potencial de arriba se vuelve energía cinética abajo. Como la masa aparece en las dos, se cancela: <span class="formula">v = √(2·g·h)</span>',
    `En la lámina, las dos probetas se pasan la energía mientras la caja baja; la suma se queda en ${n.E} J.`]},
  {n:3, titulo:"Ejemplo resuelto", p:[`<span class="numeral">I.</span> Arriba: E<sub>p</sub> = m·g·h = ${n.m} × ${n.g} × ${n.h} = <b>${n.E} J</b> y E<sub>c</sub> = 0 (parte del reposo).`,
    `<span class="numeral">II.</span> Abajo toda es cinética: ${n.E} = ½ × ${n.m} × v² → v² = ${n.v2} → <b>v = ${n1.vf} m/s</b> → respuesta ${letra("vf")}.`,
    `A media altura (${n.mitadH} m): E<sub>p</sub> = ${n.mitadE} J, E<sub>c</sub> = ${n.mitadE} J y v = ${n.vMedio} m/s. Eso es a la mitad, no abajo.`]},
  {n:4, titulo:"La trampa", p:[`Creer que la masa importa. Con ${n.mFantasma} kg: E<sub>p</sub> = ${n.mFantasma} × ${n.g} × ${n.h} = ${n.EFantasma} J, y ${n.EFantasma} = ½ × ${n.mFantasma} × v² da v = ${n1.vf} m/s, igual que con ${n.m} kg. La caja pesada tiene más energía, pero también necesita más para moverse.`,
    `Una rampa más suave (más larga) baja la misma altura: llega a los mismos ${n1.vf} m/s, solo tarda más. La de ${n.angulo}° mide ${n.L} m y tarda ${n.t} s.`,
    `Los distractores también tienen dueño: ${letra("v2")} (${n.v2} m/s) se queda en v² y no saca la raíz; ${letra("vMedio")} (${n.vMedio} m/s) olvida el ½ y además es la rapidez a media altura; ${letra("gh")} (${n.gh} m/s) usa v = g·h.`,
    `Pulsa «${CT.trampa}» en la lámina: la caja punteada de ${n.mFantasma} kg baja junto a la de ${n.m} kg y llega igual.`]},
  {n:5, titulo:"Truco de examen", p:['Iguala m·g·h = ½·m·v²: la masa se tacha y queda <span class="formula">v = √(2·g·h)</span>',
    "No sacar la raíz es el error más común. La rapidez crece con la raíz de la altura: cuadruplicar la altura solo duplica la rapidez."]},
  {n:6, titulo:J.prueba.titulo, enunciado:J.prueba.pregunta, ops:J.prueba.opciones.map(o => ({ t:`${o.letra}) ${o.texto}`, ok:!!o.correcta, e:o.retro }))}
];
PASOS.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.p || []).map(t => `<p>${t}</p>`).join("");
  if (p.enunciado){ s.insertAdjacentHTML("beforeend", `<p>${p.enunciado}</p>`); const l = document.createElement("div"); l.className = "opciones"; opciones(l, p.ops); s.append(l); }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});
// Capa 2: trabajo, tiempo en la rampa y potencia (J.profundizar)
$("#otro").innerHTML = J.profundizar.items.map(it => `<h3>${it.titulo}</h3><p>${tpl(it.texto, n)}</p>`).join("");

$("#pie").innerHTML = `<i>${sinEtiquetas(J.figura.pie).split(". ")[0]}.</i> ${J.figura.pie.split(". ").slice(1).join(". ")}
 Modelo: la rampa y la regla de altura van a la misma escala, así que al cambiar la altura la rampa crece y al cambiar el ángulo solo se alarga. La caja baja en tiempo real (la de ${n.angulo}° tarda ${n.t} s) y al llegar abajo sigue por el riel sin fricción hasta el tope. «${CT.reiniciar}» la regresa arriba: alguien hace ese trabajo, ${n.E} J. «${CT.examen}» vuelve a ${n.m} kg, ${n.h} m y ${n.angulo}°.
 Si nadie toca, la lámina baja y sube la caja sola sin mostrar la rapidez. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B suelta la caja o la regresa; con la lámina enfocada, ↑ ↓ la suben y bajan. También puedes arrastrarla.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#soltar", "#bloque-bajada"].map(s => $(s));
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
window.__energia = { set:(o) => { if ("m" in o) m = o.m; if ("h" in o) h = o.h; if ("ang" in o) ang = o.ang; if ("b" in o) b = o.b; if ("fase" in o) fase = o.fase; if ("xf" in o) xf = o.xf;
  if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa; render(); },
  sel:seleccionar, completa:entrar, salir, alto:() => { enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(animRec); cancelAnimationFrame(anim); anim = 0; if (selRec){ selRec = false; setSel(null); } render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio del tema) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados de Arquímedes v2 (pasarán a piezas compartidas).
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
/* Propio de la conservación de la energía (también va en el SVG fijo) */
.agua>.iso-fill{fill:var(--agua-1)} .agua>.iso-top{fill:var(--agua-sup)}
.agua>.iso-shade[data-shade="0"]{fill:color-mix(in srgb,var(--agua-2) 55%,var(--agua-1))} .agua>.iso-shade[data-shade="1"]{fill:color-mix(in srgb,var(--agua-2) 38%,var(--agua-1))}
.agua>.iso-shade[data-shade="2"]{fill:color-mix(in srgb,var(--agua-2) 20%,var(--agua-1))} .agua>.iso-shade[data-shade="3"]{fill:var(--agua-1)}
.agua>.iso-edge{stroke:var(--agua-2)}
.agua.clara>.iso-fill,.agua.clara>.iso-shade{fill:color-mix(in srgb,var(--agua-1) 45%,var(--agua-sup))} .agua.clara>.iso-top{fill:var(--agua-sup)}
.vidrio>.iso-fill{fill:var(--agua-sup);fill-opacity:.16} .vidrio>.iso-shade{opacity:.18} .vidrio>.iso-top{fill:none}
.corredera>.iso-top{fill:color-mix(in srgb,var(--dorado) 35%,var(--anatomy-top))} .corredera>.iso-shade{fill:color-mix(in srgb,var(--dorado) 25%,var(--anatomy-shade-1))} .corredera>.iso-edge{stroke:var(--dorado)}
.marca-h{fill:none;stroke:var(--dorado);stroke-width:1.8;stroke-linecap:round}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.tk{fill:none;stroke-width:.6} .tk.menor{stroke:var(--anatomy-lo)} .tk.mayor{stroke:var(--anatomy-mid)}
.t-regla{font:500 8.5px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.flecha line{stroke:var(--rubrica);stroke-width:2.4;stroke-linecap:round} .flecha polygon{fill:var(--rubrica)}
.t-vel{font:500 14px var(--serif);fill:var(--rubrica);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de la conservación de la energía */
.arrastre{cursor:grab;touch-action:none} .tomado .arrastre{cursor:grabbing}
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
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .modo-lamina .compacto #soltar{grid-column:1/-1}}`;

// ---------- Figura fija para PDF y video (modo claro, estado del examen con la caja al pie de la rampa) ----------
function svgFijo() {
  const s = { ...estado0, b: 1, revelado: true };
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
  title: "Conservación de la energía",
  hint: J.instruccion,
  readout: "bajó 0 m",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuenow="0">${figura}</div>`,
});
const desliza = (q) => `<div id="bloque-${q}"><div class="fila"><label for="s-${q}" id="l-${q}"></label><output id="o-${q}"></output></div><input type="range" id="s-${q}"></div>`;
const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Conservación de la energía · Códice Vivo</title>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
</head>
<body>
<main class="pagina">
  <header>
    <div class="marca-casa">Códice Vivo · Laboratorio</div>
    <h1 id="titulo">Conservación de la energía</h1>
    <p class="sub" id="subtitulo"></p>
  </header>
  <div class="rejilla">
    <div id="pasos-a" class="pasos"></div>
    <section class="tarjeta lab" aria-label="Laboratorio">
      <div class="predice">
        <h3 id="pred-t">Predice antes de soltar</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
        <p class="gira" aria-hidden="true">Gira el teléfono para verla más grande</p>
        <div class="iso escena">${plate}</div>
        <div class="barra-lamina">
          <span class="escala" id="escala">Escala: rampa y regla en m; caja y probetas no</span>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq">Rapidez de la caja, v</span>
          <output id="o-v" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="chips">
          <div class="chip"><span>E<sub>p</sub> (altura)</span><output id="o-ep"></output></div>
          <div class="chip"><span>E<sub>c</sub> (movimiento)</span><output id="o-ec"></output></div>
          <div class="chip"><span>Energía total</span><output id="o-e"></output></div>
        </div>
        <div class="deslizadores">${desliza("bajada")}${desliza("h")}${desliza("m")}${desliza("angulo")}</div>
        <div class="botones">
          <button type="button" class="boton pri" id="soltar" aria-keyshortcuts="b">Soltar</button>
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
