// Lámina 2.5D+ de la reflexión de la luz: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/reflexion-2_5d.mjs                → plantilla/interactivos/reflexion/plus/index.html
//                                                           y contenido/fisica/img/reflexion.svg (figura fija para PDF y video)
//   node plantilla/figuras/reflexion-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de la ley de Ohm (plantilla/figuras/ley-de-ohm-2_5d.mjs): misma página (CSS_PRENSA), pantalla completa,
// evaluador de fórmulas, predicción y pasos desde el JSON, recorrido automático, movimiento reducido y salida .svg.
// Otro dibujo: un disco óptico graduado (de Hartl) inclinado hacia quien mira sobre su soporte, con un espejo plano en el centro
// y una lámpara láser que corre por el borde. Otra lógica: al encender, la punta del haz viaja hasta el espejo y de ahí sale
// reflejada; los arcos θi y θr crecen juntos desde la normal; al apagar, la cola del haz se va y los arcos se borran.
//
// ÓPTICA REUTILIZABLE (para refracción y lo que siga): todo lo que vive en el plano del disco usa las funciones de la sección
// «Óptica del disco»: enPlano (a, b, h → mundo), polar, arcoPlano, rayoPlano, tramo (haz animado por cabeza y cola), caja
// (prisma orientado sobre el disco: lámpara, espejo, bloque de vidrio), discoSolido y graduaciones (transportador del disco).
// Ángulos en grados, medidos en el plano del disco contra las manecillas desde +a (a la derecha); b hacia arriba.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "reflexion";
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
// Variable de entrada: el ángulo de la lámpara con el espejo (alfa, en grados); lo demás (beta, la prueba) viene del JSON.
function calc(J, alfa) {
  const v = { ...J.valoresIniciales, alfa };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}
// El valor permitido más cercano (rangos.alfa.valores: sin los ángulos donde dos opciones de la predicción coinciden)
function cercano(lista, x) { return lista.reduce((m, v) => (Math.abs(v - x) < Math.abs(m - x) ? v : m), lista[0]); }

// ---------- Óptica del disco (reutilizable): el plano del disco y lo que se dibuja en él ----------
// C.O: centro del disco (mundo); C.U, C.WV: ejes a y b del plano; C.N: normal de la cara (hacia quien mira); C.VISTA: hacia la cámara.
function enPlano(C, a, b, h = 0) {
  return [C.O[0] + a * C.U[0] + b * C.WV[0] + h * C.N[0], C.O[1] + a * C.U[1] + b * C.WV[1] + h * C.N[1], C.O[2] + a * C.U[2] + b * C.WV[2] + h * C.N[2]];
}
function polar(r, grados) { const t = grados * Math.PI / 180; return [r * Math.cos(t), r * Math.sin(t)]; }
// Arco de radio r entre dos ángulos (en el plano del disco, a la altura h)
function arcoPlano(C, K, r, g0, g1, h = 0, n = 0) {
  n = n || Math.max(2, Math.ceil(Math.abs(g1 - g0) / 3));
  let d = "";
  for (let i = 0; i <= n; i++) { const [a, b] = polar(r, g0 + (g1 - g0) * i / n); const q = K.iso(enPlano(C, a, b, h), C.P); d += (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }
  return d;
}
// Recta entre dos puntos del plano ([a, b]) a la altura h
function rayoPlano(C, K, p0, p1, h = 0) {
  const q0 = K.iso(enPlano(C, p0[0], p0[1], h), C.P), q1 = K.iso(enPlano(C, p1[0], p1[1], h), C.P);
  return "M" + q0[0].toFixed(1) + " " + q0[1].toFixed(1) + "L" + q1[0].toFixed(1) + " " + q1[1].toFixed(1);
}
// Haz por una quebrada del plano (puntos [a, b]): se dibuja solo lo que hay entre la cola y la cabeza (fracciones 0–1 del largo total)
function tramo(C, K, pts, cola, cabeza, h = 0) {
  const lar = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = lar.reduce((x, y) => x + y, 0);
  const u0 = Math.max(0, cola) * tot, u1 = Math.min(1, cabeza) * tot;
  if (u1 - u0 < 0.05) return "";
  const en = (u) => { let i = 0, ac = 0; while (i < lar.length - 1 && ac + lar[i] < u) ac += lar[i++]; const f = lar[i] ? (u - ac) / lar[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; };
  const q = [en(u0)]; let ac = 0;
  for (let i = 0; i < lar.length; i++) { ac += lar[i]; if (ac > u0 && ac < u1) q.push(pts[i + 1]); }
  q.push(en(u1));
  return q.map((p, i) => { const s = K.iso(enPlano(C, p[0], p[1], h), C.P); return (i ? "L" : "M") + s[0].toFixed(1) + " " + s[1].toFixed(1); }).join("");
}
// Doblar por una recta del plano que pasa por el centro (ángulo gEje): cada punto gira t grados alrededor de esa recta y sale
// del disco hacia quien mira; con t = 180 cae en su reflejo. Sirve para mostrar que dos ángulos son iguales (reflexión) o que no lo son.
function doblar(C, K, pts, gEje, t, h = 0) {
  const ea = Math.cos(gEje * Math.PI / 180), eb = Math.sin(gEje * Math.PI / 180), la = eb, lb = -ea;   // eje y su perpendicular (lado de las manecillas)
  const ct = Math.cos(t * Math.PI / 180), st = Math.sin(t * Math.PI / 180);
  return pts.map((p, i) => {
    const al = p[0] * ea + p[1] * eb, d = p[0] * la + p[1] * lb;
    const q = K.iso(enPlano(C, al * ea + d * ct * la, al * eb + d * ct * lb, h + Math.abs(d) * st), C.P);
    return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
  }).join("");
}
// Prisma orientado sobre la cara del disco: centro [a, b], ángulo del largo (grados), largo [l0, l1], ancho [w0, w1], alto [h0, h1].
// Devuelve sus 6 caras con d, si se ve y su tono (la de enfrente = tapa; las demás, sombra 0–3 según la luz del kit).
function caja(C, K, cen, gr, lr, wr, hr) {
  const t = gr * Math.PI / 180, ca = Math.cos(t), sa = Math.sin(t);
  const p = (l, w, h) => enPlano(C, cen[0] + l * ca - w * sa, cen[1] + l * sa + w * ca, h);
  const d1 = [C.U[0] * ca + C.WV[0] * sa, C.U[1] * ca + C.WV[1] * sa, C.U[2] * ca + C.WV[2] * sa];
  const d2 = [-C.U[0] * sa + C.WV[0] * ca, -C.U[1] * sa + C.WV[1] * ca, -C.U[2] * sa + C.WV[2] * ca];
  const [l0, l1] = lr, [w0, w1] = wr, [h0, h1] = hr;
  const caras = [
    [C.N, [p(l0, w0, h1), p(l1, w0, h1), p(l1, w1, h1), p(l0, w1, h1)]],
    [d1, [p(l1, w0, h0), p(l1, w1, h0), p(l1, w1, h1), p(l1, w0, h1)]],
    [d1.map(x => -x), [p(l0, w0, h0), p(l0, w1, h0), p(l0, w1, h1), p(l0, w0, h1)]],
    [d2, [p(l0, w1, h0), p(l1, w1, h0), p(l1, w1, h1), p(l0, w1, h1)]],
    [d2.map(x => -x), [p(l0, w0, h0), p(l1, w0, h0), p(l1, w0, h1), p(l0, w0, h1)]],
    [C.N.map(x => -x), [p(l0, w0, h0), p(l1, w0, h0), p(l1, w1, h0), p(l0, w1, h0)]],
  ];
  return caras.map(([n, q], i) => {
    const vis = n[0] * C.VISTA[0] + n[1] * C.VISTA[1] + n[2] * C.VISTA[2] > 0.004;
    const luz = (n[0] * C.LUZ[0] + n[1] * C.LUZ[1] + 1) / 2;
    const tono = i === 0 ? "t" : String(Math.min(3, Math.max(0, Math.floor(luz * 4))));
    return { vis, tono, d: "M" + q.map(x => { const s = K.iso(x, C.P); return s[0].toFixed(1) + " " + s[1].toFixed(1); }).join("L") + "Z" };
  });
}

// ---------- Modelo del dibujo (unidades del mundo; x a la derecha, y hacia el frente, z hacia arriba). Nada va a escala. ----------
const VI = J.valoresIniciales, RG = J.rangos, ES = J.escena;
const AZ = 66, EL = 30;                                                           // cámara (la misma de la ley de Ohm)
const GIRO_DISCO = 0, INCL = EL - 14;                                             // el disco mira a la cámara y se inclina 14° menos que ella: se ve su canto y los ángulos casi no se deforman
const RAD = Math.PI / 180;
const PSI = (AZ - GIRO_DISCO) * RAD, TAU = INCL * RAD;
const U = [Math.sin(PSI), -Math.cos(PSI), 0], N0 = [Math.cos(PSI), Math.sin(PSI), 0];
const WV = [-N0[0] * Math.sin(TAU), -N0[1] * Math.sin(TAU), Math.cos(TAU)];
const NC = [N0[0] * Math.cos(TAU), N0[1] * Math.cos(TAU), Math.sin(TAU)];
const VISTA = [Math.cos(AZ * RAD) * Math.cos(EL * RAD), Math.sin(AZ * RAD) * Math.cos(EL * RAD), Math.sin(EL * RAD)];
const LUZ = [-Math.sin(AZ * RAD), Math.cos(AZ * RAD)];
const RD = 30, ESP = 1.4;                                                         // radio y grueso del disco
const BLOQ_H = 6;                                                                 // alto del pie
const O = [-N0[0] * 9, -N0[1] * 9, BLOQ_H + RD * Math.cos(TAU) + 0.6];            // centro de la cara del disco
const HB = 1.4;                                                                   // altura del haz sobre la cara (roza el disco)
const RL = RD - 7.5, LL = 5, LW = 2.4, LH = 4.2;                                  // lámpara: radio de su centro, medio largo, medio ancho, alto
const ML = 13, MT = 3.2, MH = 3.4;                                                // espejo: medio largo, grueso (detrás de la cara que refleja), alto
const RA = 10.5, RAF = 16;                                                        // radios de los arcos θ y del arco fantasma
const PLACA = { x: -28, y: -19, w: 56, d: 31, r: 5 }, PLACA_H = 4, PATA_H = 4;
const FUENTE = { x: -24, y: -1, w: 10, d: 7, r: 1.2 }, FUENTE_H = 5;             // fuente del láser, sobre la mesa

const W = 520, H = 440;
const rim = Array.from({ length: 24 }, (_, i) => { const [a, b] = polar(RD + 1, i * 15); return [a, b]; });
const C0 = { O, U, WV, N: NC };
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [PLACA.x, PLACA.y + PLACA.d, -12], ...rim.map(([a, b]) => enPlano(C0, a, b, 0)), enPlano(C0, 0, RD + 7, 0)],
  W, H, { pad: 12, azimuth: AZ, elevation: EL },
);
const CFG0 = { P, O, U, WV, N: NC, VISTA, LUZ };
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], c[2] || 0], P);
const pt2 = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);

function hull(q) {
  q = q.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of q.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
const cerrado = (q) => "M" + q.map(pt2).join("L") + "Z";
// Disco sólido en el plano (reutilizable): canto = envolvente de las dos caras; la cara de enfrente encima
function discoSolido(r, grueso, h0 = 0, cls = "") {
  const fr = Array.from({ length: 72 }, (_, i) => { const [a, b] = polar(r, i * 5); return at(enPlano(C0, a, b, h0)); });
  const bk = Array.from({ length: 72 }, (_, i) => { const [a, b] = polar(r, i * 5); return at(enPlano(C0, a, b, h0 - grueso)); });
  const env = cerrado(hull([...fr, ...bk]));
  return `<g class="iso-solid disco ${cls}"><path class="iso-fill" d="${env}"/><path class="iso-shade" data-shade="1" d="${env}"/><path class="iso-top" d="${cerrado(fr)}"/>`
    + `<path class="iso-line iso-edge" data-tone="hi" d="${env}"/><path class="iso-line" data-tone="mid" d="${cerrado(fr)}"/></g>`;
}
// Ángulo medido desde la normal del disco (0° arriba y abajo, 90° a los lados), para numerar el transportador
const desdeNormal = (g) => { const d = Math.abs((((g - 90) % 180) + 180) % 180); return Math.round(Math.min(d, 180 - d)); };
// Transportador del disco (reutilizable): marcas cada 5°, largas cada 10°, números cada 10° medidos desde la normal
function graduaciones() {
  let menor = "", mayor = "", tx = "";
  for (let g = 0; g < 360; g += 5) {
    const big = g % 10 === 0;
    if (!big) menor += rayoPlano(CFG0, k, polar(RD - 1, g), polar(RD - 2.6, g));
    if (big) {
      mayor += rayoPlano(CFG0, k, polar(RD - 1, g), polar(RD - 4, g));
      if (g > 180) continue;   // abajo del espejo no viaja luz: solo marcas
      const q = at(enPlano(C0, ...polar(RD - 6.6, g), 0));
      tx += `<text class="t-gra" x="${q[0].toFixed(1)}" y="${(q[1] + 2.6).toFixed(1)}">${desdeNormal(g)}</text>`;
    }
  }
  const aro = arcoPlano(CFG0, k, RD - 1, 0, 360, 0, 120), aro2 = arcoPlano(CFG0, k, RD - 9.4, 0, 360, 0, 120);
  const ejes = rayoPlano(CFG0, k, [-(RD - 9.4), 0], [RD - 9.4, 0]) + rayoPlano(CFG0, k, [0, -(RD - 9.4)], [0, RD - 9.4]);
  return `<path class="gr-aro" d="${aro}"/><path class="gr-aro2" d="${aro2}"/><path class="gr-eje" d="${ejes}"/><path class="tk menor" d="${menor}"/><path class="tk mayor" d="${mayor}"/>${tx}`;
}

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
// s: alfa (ángulo con el espejo que se dibuja), beta (giro del espejo), cabeza/cola (haz, 0–1), arco (0–1), revelado, trampa, flechas.
function vista(C, K, s, J) {
  const num = (v, dec = 0) => { const r = Math.round(v * 10 ** dec) / 10 ** dec; return (r < 0 ? "−" : "") + Math.abs(r).toFixed(dec); };
  const tpl = (t, o) => t.replace(/\{(\w+)\}/g, (m, q) => (q in o ? o[q] : m));
  const iso = (p) => K.iso(p, C.P);
  const sp = (a, b, h = 0) => iso(enPlano(C, a, b, h));
  const m = {};
  const al = s.alfa, be = s.beta, rv = s.revelado, ft = !!s.trampa;
  const gL = 180 - al, gN = 90 + be, gR = 2 * gN - gL, gG = gN - al;   // lámpara, normal, reflejado, reflejado de la trampa
  const ti = gL - gN, tr = gN - gR;
  // Espejo (gira beta alrededor del centro): la cara que refleja pasa por el centro; el vidrio y el plateado van detrás
  const cm = caja(C, K, [0, 0], be, [-C.ML, C.ML], [-C.MT, 0], [0, C.MH]);
  cm.forEach((f, i) => { m["esp" + i] = f.vis ? { _v: true, d: f.d, "data-t": f.tono } : { _v: false }; });
  let ray = "";
  for (let i = -5; i <= 5; i++) { const x = i * C.ML / 5.6; const p0 = polar(1, be), n0 = polar(1, be + 90);
    const a0 = [x * p0[0] - 0.4 * n0[0], x * p0[1] - 0.4 * n0[1]], a1 = [(x - 2) * p0[0] - (C.MT - 0.5) * n0[0], (x - 2) * p0[1] - (C.MT - 0.5) * n0[1]];
    ray += rayoPlano(C, K, a0, a1, C.MH); }
  m["esp-raya"] = { d: ray };
  m["esp-plata"] = { d: rayoPlano(C, K, polar(C.ML, be), polar(-C.ML, be), C.MH) };
  // Normal punteada (gira con el espejo)
  m["normal"] = { d: rayoPlano(C, K, [0, 0], polar(C.RD - 9.4, gN), C.HB) + rayoPlano(C, K, polar(C.RD - 4.6, gN), polar(C.RD - 1, gN), C.HB) };
  const pn = sp(...polar(C.RD + 2.6, gN), 0);
  m["t-normal"] = { x: pn[0].toFixed(1), y: (pn[1] - 2).toFixed(1) };
  // Lámpara: corre por el borde; su boca apunta al centro
  const pL = polar(C.RL, gL);
  const cl = caja(C, K, pL, gL, [-C.LL, C.LL], [-C.LW, C.LW], [0, C.LH]);
  cl.forEach((f, i) => { m["las" + i] = f.vis ? { _v: true, d: f.d, "data-t": f.tono } : { _v: false }; });
  const boca = polar(C.RL - C.LL, gL), qb = sp(boca[0], boca[1], C.HB + 0.4);
  m["las-boca"] = { cx: qb[0].toFixed(1), cy: qb[1].toFixed(1) };
  const qk = sp(...polar(C.RL + 1.6, gL), C.LH);
  m["las-perilla"] = { cx: qk[0].toFixed(1), cy: qk[1].toFixed(1) };
  const ql = sp(...polar(C.RL - 1.8, gL), C.LH);
  m["las-led"] = { cx: ql[0].toFixed(1), cy: ql[1].toFixed(1), class: "led" + (s.on ? " on" : "") };
  const qa = sp(pL[0], pL[1], C.LH / 2);
  m["agarre"] = { cx: qa[0].toFixed(1), cy: qa[1].toFixed(1) };
  // Cable de la lámpara a la fuente (curva en el mundo)
  const c0 = enPlano(C, ...polar(C.RL + C.LL, gL), 1.6), c1 = C.ENCHUFE, zt = Math.max(c0[2], c1[2]) + 4;
  let cab = "";
  for (let i = 0; i <= 20; i++) { const t = i / 20, u = 1 - t, q = [u * u * c0[0] + 2 * u * t * (c0[0] - 6) + t * t * c1[0], u * u * c0[1] + 2 * u * t * (c0[1] + 4) + t * t * c1[1], u * u * c0[2] + 2 * u * t * zt + t * t * c1[2]];
    const s2 = iso(q); cab += (i ? "L" : "M") + s2[0].toFixed(1) + " " + s2[1].toFixed(1); }
  m["cable"] = { d: cab };
  m["fuente-led"] = { class: "led" + (s.on ? " on" : "") };
  // Haz: de la boca al centro y del centro al borde, entre la cola y la cabeza
  const fin = polar(C.RD - 1.6, gR), pts = [boca, [0, 0], fin];
  const l1 = Math.hypot(boca[0], boca[1]), f1 = l1 / (l1 + C.RD - 1.6);
  const dh = tramo(C, K, pts, s.cola, s.cabeza, C.HB);
  m["haz-g"] = { d: dh }; m["haz"] = { d: dh };
  const pc = sp(0, 0, C.HB);
  m["impacto"] = { _v: s.cabeza >= f1 && s.cola < f1, cx: pc[0].toFixed(1), cy: pc[1].toFixed(1) };
  const pf = sp(fin[0], fin[1], C.HB);
  m["mancha"] = { _v: s.cabeza >= 0.999 && s.cola < 0.999, cx: pf[0].toFixed(1), cy: pf[1].toFixed(1) };
  // Flechas del sentido de la luz, a la mitad de cada tramo (cuando el haz ya pasó por ahí)
  const flecha = (p0, p1, f) => {
    const mx = p0[0] + (p1[0] - p0[0]) * f, my = p0[1] + (p1[1] - p0[1]) * f, L0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), dx = (p1[0] - p0[0]) / L0, dy = (p1[1] - p0[1]) / L0;
    const a = sp(mx - dx * 1.8 - dy * 1.3, my - dy * 1.8 + dx * 1.3, C.HB), b = sp(mx + dx * 0.8, my + dy * 0.8, C.HB), c = sp(mx - dx * 1.8 + dy * 1.3, my - dy * 1.8 - dx * 1.3, C.HB);
    return "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "L" + b[0].toFixed(1) + " " + b[1].toFixed(1) + "L" + c[0].toFixed(1) + " " + c[1].toFixed(1);
  };
  m["fl0"] = { _v: s.cabeza >= f1 * 0.55 && s.cola <= f1 * 0.45, d: flecha(boca, [0, 0], 0.55) };
  m["fl1"] = { _v: s.cabeza >= f1 + (1 - f1) * 0.6 && s.cola <= f1 + (1 - f1) * 0.5, d: flecha([0, 0], fin, 0.55) };
  // Arcos θi y θr: crecen juntos desde la normal (s.arco: 0–1)
  const A = Math.max(0, Math.min(1, s.arco));
  m["arco-i"] = { _v: A > 0.01, d: arcoPlano(C, K, C.RA, gN, gN + ti * A, C.HB) };
  m["arco-r"] = { _v: A > 0.01, d: arcoPlano(C, K, C.RA, gN, gN - tr * A, C.HB) };
  const etq = (id, g, txt, lado) => {
    // Ángulo abierto: la etiqueta va arriba del arco, junto a la normal; cerrado (rayos casi pegados a la normal): a un lado
    const n2 = abierto ? sp(...polar(C.RA + 3.4, gN), C.HB) : sp(...polar(C.RA + 3, gN - lado * 48), C.HB);
    m[id] = { _v: A > 0.6, x: (n2[0] + lado * 5).toFixed(1), y: n2[1].toFixed(1), "text-anchor": lado < 0 ? "end" : "start", _t: txt };
  };
  const abierto = ti >= 34;
  const V = { ti: num(ti), tr: num(tr) };
  etq("t-ai", gN + ti / 2, rv ? tpl(J.figura.incidencia, V) : J.figura.incidenciaInc, -1);
  etq("t-ar", gN - tr / 2, rv ? tpl(J.figura.reflexion, V) : J.figura.reflexionInc, 1);
  // Doblez: una copia del arco θi y del rayo incidente gira sobre la normal y cae encima de θr (s.doblez: 0–1 gira, 1–1.6 se queda y se apaga)
  const pd = s.doblez || 0;
  if (pd > 0) {
    const t = 180 * (1 - Math.cos(Math.PI * Math.min(1, pd))) / 2, op = pd < 1.25 ? 1 : Math.max(0, 1 - (pd - 1.25) / 0.35);
    const arcoPts = Array.from({ length: 25 }, (_, i) => polar(C.RA, gN + ti * i / 24)), rayoPts = [[0, 0], polar(C.RL - C.LL, gL)];
    const hoja = [[0, 0], ...Array.from({ length: 25 }, (_, i) => polar(C.RA + 4, gN + ti * i / 24))];
    m["doblez"] = { _v: true, opacity: op.toFixed(2) };
    m["dob-hoja"] = { d: doblar(C, K, hoja, gN, t, C.HB) + "Z" };
    m["dob-arco"] = { d: doblar(C, K, arcoPts, gN, t, C.HB) };
    m["dob-rayo"] = { d: doblar(C, K, rayoPts, gN, t, C.HB) };
    m["arco-r"].class = "arco-t" + (pd >= 1 ? " brilla" : "");
  } else { m["doblez"] = { _v: false }; m["arco-r"].class = "arco-t"; }
  // Giro del espejo: el reflejado de antes (punteado tenue) y el arco 2β entre los dos reflejados
  const gr = s.beta > 0.3;
  const gA = al;   // reflejado con el espejo derecho
  m["antes"] = gr && s.cabeza >= 0.999 ? { _v: true, d: rayoPlano(C, K, [0, 0], polar(C.RD - 1.6, gA), C.HB) } : { _v: false };
  m["arco-g"] = gr && s.cabeza >= 0.999 ? { _v: true, d: arcoPlano(C, K, C.RD - 12, gA, gR, C.HB) } : { _v: false };
  const qg = sp(...polar(C.RD - 12, gA - 7), C.HB);
  m["t-giro"] = gr && s.cabeza >= 0.999 ? { _v: true, x: qg[0].toFixed(1), y: (qg[1] + 3).toFixed(1), _t: tpl(J.figura.giro, { giro: num(2 * s.beta) }) } : { _v: false };
  // Dato: el ángulo con el espejo (lo da el problema), siempre visible, pegado al espejo del lado de la lámpara
  const aEsp = 90 - ti;
  m["dato-arco"] = { d: arcoPlano(C, K, C.RAF, 180 + be, gL, C.HB) };
  const dentro = aEsp >= 25, qd = sp(...polar(dentro ? C.RAF - 5.4 : C.RAF + 3.6, 180 + be - aEsp / 2), C.HB);
  m["t-dato"] = { x: qd[0].toFixed(1), y: (qd[1] + 3.5).toFixed(1), "text-anchor": dentro ? "middle" : "end", _t: tpl(J.figura.dato, { alfa: num(aEsp) }) };
  // Trampa: esos mismos grados medidos desde la normal, del lado del reflejado, y el rayo que saldría si fueran θr
  m["fant-arco"] = ft ? { _v: true, d: arcoPlano(C, K, C.RAF, gN, gG, C.HB) } : { _v: false };
  const qfa = sp(...polar(C.RAF + 3.6, gN - aEsp / 2), C.HB);
  m["fant-ta"] = ft ? { _v: true, x: (qfa[0] + 1).toFixed(1), y: (qfa[1] + 3.5).toFixed(1), _t: tpl(J.figura.fantasma, { qA: num(aEsp) }) } : { _v: false };
  m["fant-rayo"] = ft ? { _v: true, d: rayoPlano(C, K, [0, 0], polar(C.RD - 1.6, gG), C.HB) } : { _v: false };
  // Pista de arrastre: flechas curvas sobre el borde junto a la lámpara, hasta que alguien la mueve
  if (s.pista) {
    const R2 = C.RD + 3.4, g0 = gL - 11, g1 = gL + 11;
    const punta = (g, sg) => { const a = sp(...polar(R2, g), 0), b = sp(...polar(R2 - 1.5, g - sg * 2.6), 0), c = sp(...polar(R2 + 1.5, g - sg * 2.6), 0);
      return "M" + b[0].toFixed(1) + " " + b[1].toFixed(1) + "L" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "L" + c[0].toFixed(1) + " " + c[1].toFixed(1); };
    m["pista"] = { _v: true, d: arcoPlano(C, K, R2, g0, g1, 0) + punta(g0, -1) + punta(g1, 1) };
  } else m["pista"] = { _v: false };
  m["fant-t"] = ft ? { _v: true, x: "4", y: "16" } : { _v: false };   // arriba a la izquierda: ahí nunca hay luz
  m["fant-1"] = { x: "4", _t: tpl(J.trampa.fantasma, { qA: num(al) }) };
  m["fant-2"] = { x: "4", _t: tpl(J.trampa.real, { tr: rv ? num(tr) : "?" }) };
  // Rótulos
  // Rótulos: cada uno prueba sus lugares en orden y toma el primero que no tapa a otro rótulo ni a una etiqueta
  const mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  const junto = (r, g, dr, dg) => { const p0 = polar(r, g), p1 = polar(dr, dg); return sp(p0[0] + p1[0], p0[1] + p1[1], C.HB); };
  const ocupado = [sp(0, 0, C.HB), sp(...polar(C.RL, gL), C.LH), sp(...polar(C.RL + C.LL * 0.6, gL), C.LH), sp(...polar(C.RL - C.LL * 0.6, gL), C.LH)];
  for (const id of ["t-ai", "t-ar", "t-dato", "fant-ta"]) {
    const t = m[id]; if (!t || t._v === false || !t._t) continue;
    const w = t._t.length * 9, x = +t.x, y = +t.y - 4, a = t["text-anchor"] || "start";
    const x0 = a === "end" ? x - w : a === "middle" ? x - w / 2 : x;
    for (let f = 0; f <= 1.001; f += 0.25) ocupado.push([x0 + w * f, y]);
  }
  const holgura = (p) => Math.min(...ocupado.map(q => Math.hypot(p[0] - q[0], p[1] - q[1])));
  const rot = (nn, cands, ver = true) => {
    // el primero con holgura; si ninguno la tiene, el que quede más lejos de todo
    const p = cands.find(c => holgura(c) > 15.5) || cands.reduce((a, c) => (holgura(c) > holgura(a) ? c : a), cands[0]);
    if (ver) ocupado.push(p, p, p);
    m["rot-" + nn] = { _v: ver && !s.animando, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` };
  };
  const dos = (r, g, d) => [junto(r, g, d, g + 90), junto(r, g, d, g - 90)];
  rot("03", [junto(C.ML * 0.45, be + 180, C.MT + 4.8, be - 90), junto(C.ML * 0.45, be, C.MT + 4.8, be - 90)]);   // debajo del espejo: ahí no viaja luz
  rot("08", [mas(sp(...polar(C.RD + 1, -48), 0), 12, 6)]);
  rot("01", [junto(C.RL + 1, gL, C.LW + 5.5, gL + 90), junto(C.RL + 1, gL, C.LW + 5.5, gL - 90), sp(...polar(C.RD + 5, gL + 9), 0), sp(...polar(C.RD + 5, gL - 9), 0)]);
  rot("04", [mas(sp(...polar(C.RD - 11.6, gN), 0), 11, -2), mas(sp(...polar(C.RD - 11.6, gN), 0), -11, -2), mas(sp(...polar(C.RD - 15, gN), 0), 11, 0)]);
  rot("05", abierto ? [sp(...polar(C.RA * 0.6, gN + ti * 0.5), C.HB), sp(...polar(C.RA * 0.45, gN + ti * 0.5), C.HB)] : [sp(...polar(C.RA + 1, gN + 74), C.HB), sp(...polar(C.RA + 1, gN + 60), C.HB)]);
  rot("06", abierto ? [sp(...polar(C.RA * 0.6, gN - tr * 0.5), C.HB), sp(...polar(C.RA * 0.45, gN - tr * 0.5), C.HB)] : [sp(...polar(C.RA + 1, gN - 74), C.HB), sp(...polar(C.RA + 1, gN - 60), C.HB)]);
  rot("02", [...dos(C.RL * 0.55, gL, 4.6), ...dos(C.RL * 0.4, gL, 4.6), ...dos(C.RL * 0.7, gL, 4.6), ...dos(C.RL * 0.55, gL, 7.5)]);
  rot("07", [...dos(C.RL * 0.62, gR, 4.6), ...dos(C.RL * 0.8, gR, 4.6), ...dos(C.RL * 0.45, gR, 4.6), sp(...polar(C.RD + 4.5, gR), 0)]);
  rot("09", [...dos(C.RD - 9, gG, 4.6), ...dos(C.RD - 13, gG, 4.6), ...dos(C.RD - 5.5, gG, 4.6), ...dos(C.RD - 17, gG, 4.6)], ft);
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
// Rectángulo girado (planta) → anillo de puntos para extrude
const rectGir = (cx, cy, largo, ancho, ang) => {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  return [[-largo, -ancho], [largo, -ancho], [largo, ancho], [-largo, ancho]].map(([l, w]) => [cx + l * ca - w * sa, cy + l * sa + w * ca]);
};

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
  const pl = { x: PLACA.x + 12, y: PLACA.y + PLACA.d - 3.6, w: 30, d: 2.4, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 2.4, pl.y + 1.8], 0.4, P, "x"), J.figura.placa, { size: 1.5, tone: "lo" }));
  o.push(D([at([pl.x + 1.2, pl.y + 1.2, 0.4]), at([pl.x + pl.w - 1.2, pl.y + 1.2, 0.4])], { size: 0.4 }));
  return o.join("");
}
// Soporte: pata trasera (atrás del disco), pie con ranura y dos prensas moleteadas al frente
const PIE = enPlano(C0, 0, -RD, -ESP / 2);
function soporte(fase) {
  if (fase === "atras") {
    const a = enPlano(C0, 0, RD * 0.45, -ESP), b = [a[0] - N0[0] * 24, a[1] - N0[1] * 24, 0];
    const pata = `<path class="pata" d="M${pt2(at(a))}L${pt2(at(b))}"/><path class="pata-b" d="M${pt2(at(a))}L${pt2(at(b))}"/>`;
    const zap = S(k.cylinder(b[0], b[1], 2.4, 0, 1.2, P, 20), { tone: "mid" });
    const buje = S(k.cylinder(a[0], a[1], 0.1, a[2] - 0.1, 0.2, P, 8), { tone: "lo" });
    return zap + pata + buje;
  }
  if (fase === "pie") {
    const base = S(k.extrude(rectGir(PIE[0] - N0[0] * 1.5, PIE[1] - N0[1] * 1.5, 17, 7.5, Math.atan2(U[1], U[0])), 0, 1.4, P), { tone: "mid" });
    const bloq = S(k.extrude(rectGir(PIE[0] - N0[0] * 1.5, PIE[1] - N0[1] * 1.5, 13, 5.5, Math.atan2(U[1], U[0])), 1.4, PIE[2] - 1.4 + 1, P), { tone: "mid" });
    return base + bloq;
  }
  // Prensas al frente del canto de abajo
  return [-8, 8].map((da) => {
    const q = enPlano(C0, da, -RD + 1.2, 1.6);
    return S(k.cylinder(q[0], q[1], 1.9, PIE[2] + 1, 2.2, P, 20, 0.2), { tone: "hi", className: "metal" }) + L(k.knurl(q[0], q[1], 1.9, PIE[2] + 1.3, PIE[2] + 3, 10, P), { tone: "lo" });
  }).join("");
}
// Fuente del láser sobre la mesa: caja con interruptor y foco
const ENCHUFE = [FUENTE.x + FUENTE.w - 1, FUENTE.y + FUENTE.d / 2, FUENTE_H - 1];
function fuente(m) {
  const o = [S(k.slabOf(FUENTE, 0, FUENTE_H, P, 3, 0.3), { tone: "mid" })];
  o.push(L(k.planOutline(k.insetPlan(FUENTE, 1), FUENTE_H, P, 3), { tone: "faint" }));
  const q = at([FUENTE.x + 4, FUENTE.y + FUENTE.d / 2, FUENTE_H]);
  o.push(E("circle", "fuente-led", { class: "led", cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: "1.6" }, m));
  o.push(S(k.cylinder(FUENTE.x + 9, FUENTE.y + FUENTE.d / 2, 1.4, FUENTE_H, 1.2, P, 18, 0.2), { tone: "hi" }));
  o.push(L(k.knurl(FUENTE.x + 9, FUENTE.y + FUENTE.d / 2, 1.4, FUENTE_H + 0.2, FUENTE_H + 1, 8, P), { tone: "lo" }));
  o.push(S(k.cylinder(ENCHUFE[0], ENCHUFE[1], 0.9, FUENTE_H - 2, 1.2, P, 14), { tone: "lo" }));
  return o.join("");
}
const cara6 = (pre, m, cls) => Array.from({ length: 6 }, (_, i) => E("path", pre + i, { class: cls }, m)).join("");

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = Object.keys(J.rotulos);
function cuerpo(m) {
  return [
    placa(), soporte("atras"), soporte("pie"),
    `<g data-parte="08">${discoSolido(RD, ESP)}${graduaciones()}</g>`,
    soporte("prensas"), fuente(m),
    E("path", "cable", { class: "cable-l" }, m),
    `<g data-parte="04">` + E("path", "normal", { class: "normal" }, m) + E("text", "t-normal", { class: "t-normal", "text-anchor": "middle" }, m, esc(J.figura.normal)) + `</g>`,
    `<g data-parte="05">` + E("path", "arco-i", { class: "arco-t" }, m) + `</g>`,
    `<g data-parte="06">` + E("path", "arco-r", { class: "arco-t" }, m) + `</g>`,
    `<g data-parte="03">` + E("path", "dato-arco", { class: "arco-d" }, m) + `</g>`,
    `<g data-parte="09">` + E("path", "fant-arco", { class: "fantasma" }, m) + E("text", "fant-ta", { class: "t-trampa" }, m) + E("path", "fant-rayo", { class: "fantasma rayo-f" }, m) + `</g>`,
    `<g id="doblez" class="doblez" data-parte="06">` + E("path", "dob-hoja", { class: "dob-hoja" }, m) + E("path", "dob-rayo", { class: "dob-rayo" }, m) + E("path", "dob-arco", { class: "dob-arco" }, m) + `</g>`,
    `<g data-parte="03">` + cara6("esp", m, "cara espejo") + E("path", "esp-raya", { class: "raya" }, m) + E("path", "esp-plata", { class: "plata" }, m) + `</g>`,
    E("path", "antes", { class: "antes" }, m), E("path", "arco-g", { class: "arco-g" }, m), E("text", "t-giro", { class: "t-giro", "text-anchor": "start" }, m),
    `<g data-parte="02">` + E("path", "haz-g", { class: "haz-g" }, m) + E("path", "haz", { class: "haz" }, m) + E("path", "fl0", { class: "flecha-l" }, m) + E("circle", "impacto", { class: "impacto", r: "2.4" }, m) + `</g>`,
    `<g data-parte="07">` + E("path", "fl1", { class: "flecha-l" }, m) + E("circle", "mancha", { class: "impacto", r: "2" }, m) + `</g>`,
    `<g data-parte="01" id="lampara">` + cara6("las", m, "cara lampara") + E("circle", "las-boca", { class: "boca", r: "1" }, m) + E("circle", "las-led", { class: "led", r: "0.9" }, m)
      + E("circle", "las-perilla", { class: "perilla", r: "1.5" }, m) + E("circle", "agarre", { class: "agarre", r: "15" }, m) + `</g>`,
    E("path", "pista", { class: "pista", "data-parte": "01" }, m),
    `<g data-parte="03">` + E("text", "t-dato", { class: "t-dato" }, m) + `</g>`,
    `<g data-parte="05">` + E("text", "t-ai", { class: "t-arco" }, m) + `</g><g data-parte="06">` + E("text", "t-ar", { class: "t-arco" }, m) + `</g>`,
    E("text", "fant-t", { class: "t-trampa t-bloque", "data-parte": "09" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { ...CFG0, W, H, RD, RL, LL, LW, LH, ML, MT, MH, RA, RAF, HB, ENCHUFE, ROT, LISTA: RG.alfa.valores };
const estado0 = { alfa: VI.alfa, beta: 0, cabeza: 0, cola: 0, arco: 0, on: false, revelado: false, trampa: false, pista: true };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, vista, calc y la óptica del disco) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/reflexion-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/reflexion-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V0 = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles, ES = J.escena, DEC = L.decimales || {};
const LISTA = RG.alfa.valores;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const conUnidad = (v, u) => v + (/^[°′″]/.test(u) ? "" : " ") + u;

let alfa = V0.alfa, alfaV = alfa, betaT = 0, betaV = 0, on = false, cabeza = 0, cola = 0, arco = 0;
let doblez = -1, pideDoblez = false, barrido = null, yaBarrio = false;   // doblez: −1 apagado; barrido: {metas, i} mientras la lámpara se mueve sola
let revelado = false, trampaOn = false, sel = null, selRec = false, enRecorrido = false, pista = !quieto;
const numeros = () => {
  const d = calc(J, alfa), o = {};
  for (const x in d) o[x] = num(d[x], DEC[x] ?? 2);
  return o;
};

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#encender"), bTrampa = $("#trampa"), bExamen = $("#examen"), bGiro = $("#girar"), nota = $("#nota");
const SL = $("#s-a");

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#pred-t").textContent = J.prediccion.titulo;
$("#sum-imp").textContent = CT.profundizar;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
$("#l-a").textContent = CT.alfa; SL.min = 0; SL.max = LISTA.length - 1; SL.step = 1;
$("#escala").textContent = `Sin escala · el disco marca de 0° (normal) a 90° (espejo)`;
stage.setAttribute("aria-valuemin", LISTA[0]); stage.setAttribute("aria-valuemax", LISTA[LISTA.length - 1]);
stage.setAttribute("aria-label", "Lámina: flechas izquierda y derecha giran la lámpara; B enciende o apaga el láser");

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
const OCULTOS = ["ti", "tr", "entre", "desv", "qD", "ti2", "tr2", "entre2"];
function valores(){
  const n = numeros();
  if (!rv()) for (const x of OCULTOS) n[x] = "?";
  return n;
}
function pintarFicha(){
  const fi = J.rotulos[sel];
  if (!fi){ $("#ficha").innerHTML = fichaVacia; return; }
  const o = valores();
  $("#ficha").innerHTML = `<b>${sel} · ${tpl(fi[0], o)}.</b> ${tpl(fi[1], o)}`;
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
const estado = () => ({ alfa: alfaV, beta: betaV, cabeza, cola, arco, on, revelado: rv(), trampa: trampaOn, pista: pista && !enRecorrido && !barrido && doblez < 0, doblez: doblez > 0 ? doblez : 0, animando: doblez > 0 || !!barrido });

function render(){
  const n = numeros(), o = valores();
  aplicar(vista(C, K, estado(), J));
  // Panel
  const girado = betaT > 0;
  $("#o-t").textContent = rv() ? `${girado ? n.tr2 : n.tr}°` : "?°";
  $("#o-formula").innerHTML = rv() ? (girado ? tpl(L.mensajeGiro, n) : tpl(L.incidenciaValor, n) + " → " + tpl(L.reflexionValor, n)) : L.sinRevelar;
  const i = LISTA.indexOf(alfa);
  $("#o-a").textContent = tpl(CT.valorAlfa, { v: n.alfa });
  SL.style.setProperty("--p", (100 * i / (LISTA.length - 1)) + "%");
  if (+SL.value !== i) SL.value = i;
  SL.setAttribute("aria-valuetext", tpl(CT.valorAlfa, { v: n.alfa }));
  $("#o-al").textContent = `${n.alfa}°`;
  $("#o-ti").textContent = `${girado ? o.ti2 : o.ti}°`;
  $("#o-en").textContent = `${girado ? o.entre2 : o.entre}°`;
  const lect = `α ${n.alfa}° · θi ${girado ? o.ti2 : o.ti}° · θr ${girado ? o.tr2 : o.tr}°` + (girado ? ` · β ${n.beta}°` : "");
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", alfa);
  stage.setAttribute("aria-valuetext", tpl(CT.valorPerilla, { alfa: n.alfa, estado: on ? CT.encendido : CT.apagado }) + (rv() ? `; θi = θr = ${n.ti}°` : ""));
  bPri.textContent = on ? CT.apagar : CT.encender;
  bGiro.textContent = girado ? CT.enderezar : tpl(CT.girar, n);
  bGiro.setAttribute("aria-pressed", girado);
  $("#lampara").setAttribute("aria-label", tpl(CT.valorPerilla, { alfa: n.alfa, estado: on ? CT.encendido : CT.apagado }));
  document.querySelectorAll(".rot-b").forEach(b => { const tt = tpl(J.rotulos[b.dataset.n][0], o), sp = b.querySelector("span"); if (sp.textContent !== tt) sp.textContent = tt; });
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.espejo, tpl(L.espejoValor, o)],
    [L.incidencia, tpl(L.incidenciaValor, o)],
    [L.reflexion, tpl(L.reflexionValor, o) + "<br>" + L.comprueba + ": " + tpl(L.compruebaValor, o)],
    [L.trampa, tpl(L.trampaValor, o) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((x, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${x[0]}</span><span class="va">${x[1]}</span></li>`).join("");
  $("#impulso").innerHTML = J.profundizar.parrafos.map(p => `<p>${tpl(p, o)}</p>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento: la lámpara y el espejo se acercan a su ángulo; el haz avanza (cabeza) y se va (cola); los arcos crecen juntos ----------
let anim = 0, pendiente = false;
const VEL = ES.rapidez * 0.45;                 // fracción del haz por segundo (la luz real tarda nanosegundos: aquí va lenta para verla)
const largoInc = () => { const b = C.RL - C.LL; return b / (b + C.RD - 1.6); };
function quietoAhora(){ alfaV = alfa; betaV = betaT; if (on){ cabeza = 1; cola = 0; arco = 1; } else { cabeza = 0; cola = 0; arco = 0; } }
function correr(){
  if (quieto){ quietoAhora(); render(); return; }
  if (anim) return;
  pendiente = true;
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.max(0, Math.min(0.05, (ahora - antes) / 1000)); antes = ahora;
    if (barrido){
      // La lámpara va sola de meta en meta (máximo, mínimo y de regreso) a rapidez constante
      const meta = barrido.metas[barrido.i], paso = ES.barrido * dt;
      if (Math.abs(meta - alfaV) <= paso){ alfaV = meta; barrido.i++; if (barrido.i >= barrido.metas.length){ barrido = null; alfaV = alfa; decir(tpl(L.mensajeFinBarrido, numeros())); } }
      else alfaV += Math.sign(meta - alfaV) * paso;
    } else { alfaV += (alfa - alfaV) * (1 - Math.exp(-dt * 9)); if (Math.abs(alfa - alfaV) < 0.05) alfaV = alfa; }
    betaV += (betaT - betaV) * (1 - Math.exp(-dt * 6)); if (Math.abs(betaT - betaV) < 0.03) betaV = betaT;
    if (on){
      cola = 0; cabeza = Math.min(1, cabeza + VEL * dt);
      if (cabeza >= largoInc()) arco = Math.min(1, arco + dt * 1.4);
      // Cuando ya se ven los dos arcos y la lámpara está quieta, la hoja se dobla sobre la normal; al terminar, el barrido (una vez)
      if (pideDoblez && arco === 1 && cabeza === 1 && !barrido && alfaV === alfa && betaV === betaT){ pideDoblez = false; doblez = 0.001; decir(tpl(L.mensajeDoblez, numeros())); }
      if (doblez >= 0){ doblez += dt / ES.doblez; if (doblez >= 1.6){ doblez = -1;
        if (!yaBarrio && betaT === 0){ yaBarrio = true; const r = RG.alfa.valores; barrido = { metas: [r[r.length - 1], r[0], alfa], i: 0 };
          decir(tpl(L.mensajeBarrido, { ...numeros(), min: num(r[0]), max: num(r[r.length - 1]) })); } } }
    } else {
      arco = Math.max(0, arco - dt * 3); doblez = -1; pideDoblez = false; barrido = null;
      if (cabeza > 0){ cola = Math.min(cabeza, cola + VEL * 1.4 * dt); if (cola >= cabeza){ cabeza = 0; cola = 0; } }
    }
    render();
    const quietos = alfaV === alfa && betaV === betaT && doblez < 0 && !barrido && !(pideDoblez && on) && (on ? cabeza === 1 && arco === 1 : cabeza === 0 && arco === 0);
    if (!quietos) anim = requestAnimationFrame(paso);
    else { anim = 0; pendiente = false; render(); }
  };
  anim = requestAnimationFrame(paso);
}
function detener(){ cancelAnimationFrame(anim); anim = 0; pendiente = false; }
function encender(){
  on = true; revelado = true; pideDoblez = true;
  decir(tpl(betaT > 0 ? L.mensajeGiro : L.mensajeEncendido, numeros()));
  correr();
}
function apagar(){
  on = false; decir(tpl(L.mensajeApagado, numeros()));
  correr();
}
function principal(){ if (on) apagar(); else encender(); }

// ---------- Ángulo de la lámpara: arrastrar el brazo, el deslizador o las flechas; siempre cae en un valor de la lista ----------
function cambia(v){
  v = cercano(LISTA, v);
  if (v === alfa) return 0;
  pista = false; barrido = null; doblez = -1; if (on) pideDoblez = true;
  const antes = alfa; alfa = v;
  if (!on) revelado = false;
  if (betaT > 0){ betaT = 0; decir(tpl(L.mensajeEndereza, valores())); }
  correr();
  return v > antes ? 1 : -1;
}
const mensajeDe = (sg) => tpl(sg > 0 ? L.mensajeSube : L.mensajeBaja, valores());
const lampara = $("#lampara");
lampara.setAttribute("role", "button"); lampara.setAttribute("tabindex", "-1");
let arr = null;
// Punto de la pantalla → ángulo en el plano del disco (inversa de los ejes a y b proyectados)
function anguloDe(e){
  const ctm = svg.getScreenCTM(); if (!ctm) return null;
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const q = pt.matrixTransform(ctm.inverse());
  const o = iso(enPlano(C, 0, 0, C.HB), C.P), ua = iso(enPlano(C, 1, 0, C.HB), C.P), ub = iso(enPlano(C, 0, 1, C.HB), C.P);
  const a1 = ua[0] - o[0], a2 = ua[1] - o[1], b1 = ub[0] - o[0], b2 = ub[1] - o[1], det = a1 * b2 - a2 * b1;
  const x = q.x - o[0], y = q.y - o[1];
  const a = (x * b2 - y * b1) / det, b = (a1 * y - a2 * x) / det;
  const g = 180 - Math.atan2(b, a) * 180 / Math.PI;
  return g > 180 ? g - 360 : g;   // debajo del espejo, del lado de la lámpara: ángulo negativo (se queda en el mínimo)
}
lampara.addEventListener("pointerdown", (e) => { e.stopPropagation(); tomarControl(); arr = { x: e.clientX, y: e.clientY, movio: false, a0: alfa }; lampara.setPointerCapture(e.pointerId); });
lampara.addEventListener("pointermove", (e) => {
  if (!arr) return;
  if (!arr.movio && Math.hypot(e.clientX - arr.x, e.clientY - arr.y) < 6) return;
  arr.movio = true;
  const g = anguloDe(e); if (g === null) return;
  const v = Math.max(LISTA[0], Math.min(LISTA[LISTA.length - 1], g));
  if (cambia(v)) render();
});
const suelta = () => {
  if (arr){ if (!arr.movio) principal(); else { const sg = Math.sign(alfa - arr.a0); if (sg) decir(mensajeDe(sg)); pintarPrediccion(); render(); } }
  arr = null;
};
lampara.addEventListener("pointerup", suelta);
lampara.addEventListener("pointercancel", () => { arr = null; });
lampara.addEventListener("click", (e) => e.stopPropagation());
lampara.classList.add("toque");

// ---------- Recorrido automático: recorre los rótulos sin encender ni mostrar el resultado; se detiene al tocar ----------
const REC = C.ROT.filter(n => n !== "09");
let tRec = 0, iRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  selRec = true; setSel(REC[iRec % REC.length]); iRec++; render();
  tRec = setTimeout(pasoRecorrido, 2400);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim || on){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe ni tapa lo que hizo el usuario
  enRecorrido = true; nota.textContent = ""; pasoRecorrido();
}
function tomarControl(){
  if (barrido){ barrido = null; correr(); }
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
  detener(); on = false; alfa = alfaV = V0.alfa; betaT = betaV = 0; cabeza = cola = arco = 0; revelado = false; doblez = -1; pideDoblez = false; barrido = null;
  if (trampaOn) apagarTrampa();
  decir(tpl(L.mensajeReinicio, numeros())); render(); pintarPrediccion();
});
function apagarTrampa(){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){
    revelado = true;
    if (!on) encender(); else render();
    decir(tpl(L.mensajeTrampa, numeros()));
  } else render();
});
// Profundizar: girar el espejo beta (desde el ejemplo del examen); la normal gira con él y el reflejado gira el doble
bGiro.addEventListener("click", () => {
  tomarControl();
  if (betaT > 0){ betaT = 0; decir(tpl(L.mensajeEnderezar, numeros())); correr(); render(); return; }
  alfa = V0.alfa; betaT = V0.beta; revelado = true;
  if (!on){ on = true; }
  decir(tpl(L.mensajeGiro, numeros())); correr(); render(); pintarPrediccion();
});
SL.addEventListener("input", () => { cambia(LISTA[+SL.value]); render(); });
let ultimo = V0.alfa;
SL.addEventListener("change", () => { const sg = Math.sign(alfa - ultimo); ultimo = alfa; if (sg) decir(mensajeDe(sg)); render(); pintarPrediccion(); });
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
stage.addEventListener("keydown", (e) => {
  const t = {ArrowRight:1, ArrowUp:1, ArrowLeft:-1, ArrowDown:-1}[e.key];
  if (!t) return;
  e.preventDefault();
  const i = Math.max(0, Math.min(LISTA.length - 1, LISTA.indexOf(alfa) + t)), sg = cambia(LISTA[i]);
  ultimo = alfa;
  if (sg) decir(mensajeDe(sg)); render(); pintarPrediccion();
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
// «Predice»: las opciones salen de las fórmulas del JSON con el ángulo de la lámpara (en el orden del examen); cada una con su unidad
const LETRAS = ["A", "B", "C", "D"];
function pintarPrediccion(){
  const d = calc(J, alfa), n = numeros();
  $("#pred-q").innerHTML = tpl(J.prediccion.pregunta, n);
  const ops = J.prediccion.opciones.map((x, i) => ({ ok: !!x.correcta, e: tpl(x.retro, n), t: `${LETRAS[i]}) ${conUnidad(num(evalua(x.formula, d), DEC[x.formula] ?? 2), x.unidad || J.prediccion.unidad)}` }));
  opciones($("#pred-ops"), ops, () => {
    tomarControl(); if (trampaOn) apagarTrampa();
    revelado = true;
    if (!on) encender(); else render();
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

$("#pie").innerHTML = `<i>${J.figura.pie}</i> Modelo: el dibujo no va a escala. El disco óptico está inclinado hacia ti para que los ángulos se vean casi como son; el haz roza su cara y el espejo plano está parado sobre ella, con la cara que refleja en el centro del disco.
 La lámpara solo se detiene en ${LISTA.map(v => num(v) + "°").join(", ")} con el espejo: se saltan los ángulos donde dos opciones de la predicción darían el mismo número. El haz avanza despacio para que se vea su camino; la luz real llega al espejo en una fracción de nanosegundo.
 Al encender, una copia del arco θi se dobla sobre la normal como una hoja y cae encima de θr: por eso son iguales. La primera vez, la lámpara recorre sola todos sus ángulos y regresa; tocar la lámina la detiene. En «Profundizar», el espejo gira ${num(V0.beta)}° desde el ejemplo del examen; el punteado tenue es el rayo reflejado antes del giro.
 Si nadie toca, la lámina recorre sus partes sin encender el láser ni mostrar el resultado; con movimiento reducido, todo aparece en su lugar sin animación. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B enciende o apaga; con la lámina enfocada, ← → giran la lámpara. También puedes arrastrar la lámpara por el borde del disco o tocarla para encenderla.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#encender", "#trampa", "#bloque-a"].map(s => $(s));
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
if (quieto) quietoAhora();
pintarFicha(); render();
window.__refl = { set:(o) => { if ("alfa" in o) alfa = alfaV = o.alfa; if ("beta" in o) betaT = betaV = o.beta; if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa; render(); },
  sel:seleccionar, completa:entrar, salir, encender, apagar, angulo:(x, y) => anguloDe({ clientX:x, clientY:y }), estado:() => ({ alfa, alfaV, betaT, betaV, on, cabeza, cola, arco, revelado, trampaOn }),
  alto:() => { enRecorrido = false; clearTimeout(tRec); if (selRec){ selRec = false; setSel(null); } render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de la reflexión) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados tal cual del generador de ondas (Arquímedes v2).
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
/* Propio de la reflexión (también va en el SVG fijo) */
.disco>.iso-top{fill:var(--anatomy-face)}
.disco>.iso-shade{fill:var(--anatomy-shade-0)}
.gr-aro{fill:none;stroke:var(--anatomy-hi);stroke-width:.8}
.gr-aro2{fill:none;stroke:var(--anatomy-faint);stroke-width:.6}
.gr-eje{fill:none;stroke:var(--anatomy-faint);stroke-width:.6}
.tk{fill:none;stroke-width:.7} .tk.menor{stroke:var(--anatomy-mid)} .tk.mayor{stroke:var(--anatomy-hi);stroke-width:.9}
.t-gra{font:500 6.4px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;font-variant-numeric:tabular-nums}
.pata{fill:none;stroke:var(--anatomy-mid);stroke-width:3.2;stroke-linecap:round} .pata-b{fill:none;stroke:var(--anatomy-shade-3);stroke-width:1;stroke-linecap:round}
.metal>.iso-fill,.metal>.iso-top{fill:var(--anatomy-shade-3)}
.cara{stroke:var(--anatomy-hi);stroke-width:.6;stroke-linejoin:round}
.cara[data-t="t"]{fill:var(--anatomy-top)} .cara[data-t="0"]{fill:var(--anatomy-shade-0)} .cara[data-t="1"]{fill:var(--anatomy-shade-1)}
.cara[data-t="2"]{fill:var(--anatomy-shade-2)} .cara[data-t="3"]{fill:var(--anatomy-shade-3)}
.espejo[data-t="t"]{fill:color-mix(in srgb,var(--acento) 10%,var(--anatomy-shade-1))}
.lampara[data-t="t"]{fill:var(--anatomy-shade-2)} .lampara{fill:var(--anatomy-shade-0)}
.raya{fill:none;stroke:var(--anatomy-mid);stroke-width:.6}
.plata{fill:none;stroke:var(--anatomy-lit);stroke-width:1.6;stroke-linecap:round}
.boca{fill:var(--anatomy-hi)}
.perilla{fill:var(--anatomy-hi)}
.led{fill:var(--anatomy-lo)} .led.on{fill:var(--rubrica)}
.agarre{fill:transparent;stroke:none;cursor:grab;touch-action:none}
.cable-l{fill:none;stroke:var(--anatomy-mid);stroke-width:1.6;stroke-linecap:round}
.normal{fill:none;stroke:var(--anatomy-hi);stroke-width:.9;stroke-dasharray:3 2.4}
.t-normal{font:italic 500 11px var(--serif);fill:var(--anatomy-strong);paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.arco-t{fill:none;stroke:var(--acento);stroke-width:1.6;stroke-linecap:round}
.t-arco{font:600 11.5px var(--anatomy-mono);fill:var(--acento);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.haz-g{fill:none;stroke:var(--rubrica);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;opacity:.18}
.haz{fill:none;stroke:var(--rubrica);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.flecha-l{fill:none;stroke:var(--rubrica);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.impacto{fill:var(--rubrica);opacity:.35}
.antes{fill:none;stroke:var(--rubrica);stroke-width:1;stroke-dasharray:.01 3;stroke-linecap:round;opacity:.7}
.dob-hoja{fill:var(--acento);fill-opacity:.2;stroke:var(--acento);stroke-width:.8;stroke-opacity:.6}
.dob-arco{fill:none;stroke:var(--acento);stroke-width:2.8;stroke-linecap:round}
.dob-rayo{fill:none;stroke:var(--acento);stroke-width:1;stroke-dasharray:3 2.4;stroke-linecap:round}
.arco-t.brilla{stroke-width:3.2}
.arco-d{fill:none;stroke:var(--anatomy-hi);stroke-width:1.4;stroke-linecap:round}
.t-dato{font:600 11px var(--anatomy-mono);fill:var(--anatomy-strong);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.pista{fill:none;stroke:var(--dorado);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.arco-g{fill:none;stroke:var(--dorado);stroke-width:1.6;stroke-linecap:round}
.t-giro{font:600 11px var(--anatomy-mono);fill:var(--dorado);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.2;stroke-dasharray:4 3;stroke-linecap:round}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de la reflexión */
.escena .iso-plate-corner[data-corner="hint"]{max-width:52%}
.toque{cursor:pointer}
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px}
.escala{flex:1;min-width:0;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums}
.grande{font-size:clamp(2rem,8vw,3rem)}
.profundizar+.profundizar{border-top:none;padding-top:0}
#impulso p{margin:6px 0;max-width:62ch}
#girar{margin:4px 0 6px}
@media (max-width:560px){.escena .t-trampa,.escena .t-arco,.escena .t-giro,.escena .t-dato{font-size:15px}.escena .t-bloque{font-size:13px}.escena .t-normal{font-size:14px}.escena .t-gra{font-size:8.6px}.escena .rot circle{r:11px}.escena .rot text{font-size:12px}}
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
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .modo-lamina .compacto #bloque-a{grid-column:1 / -1}
  .modo-lamina .compacto .boton{white-space:normal;padding:8px 12px;line-height:1.2}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el del examen, encendido, con la trampa) ----------
function svgFijo() {
  const s = { alfa: VI.alfa, beta: 0, cabeza: 1, cola: 0, arco: 1, on: true, revelado: true, trampa: true };
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
  readout: `α ${VI.alfa}°`,
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
          <span class="escala" id="escala"></span>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq">${esc(J.lecturas.reflexion)} · θr</span>
          <output id="o-t" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-a"><div class="fila"><label for="s-a" id="l-a"></label><output id="o-a"></output></div><input type="range" id="s-a"></div>
        </div>
        <div class="chips">
          <div class="chip"><span>Con el espejo</span><output id="o-al"></output></div>
          <div class="chip"><span>θi desde la normal</span><output id="o-ti"></output></div>
          <div class="chip"><span>Entre los rayos</span><output id="o-en"></output></div>
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
          <button type="button" class="boton sec" id="girar" aria-pressed="false"></button>
          <div id="impulso"></div>
        </details>
      </div>
      <p class="pie" id="pie"></p>
    </section>
    <div id="pasos-b" class="pasos"></div>
  </div>
</main>
<!--respaldo-->
<script type="module">${(kitScript() + `\nconst evalua = ${evalua.toString()};\nconst calc = ${calc.toString()};\nconst cercano = ${cercano.toString()};\nconst enPlano = ${enPlano.toString()};\nconst polar = ${polar.toString()};\nconst arcoPlano = ${arcoPlano.toString()};\nconst rayoPlano = ${rayoPlano.toString()};\nconst tramo = ${tramo.toString()};\nconst caja = ${caja.toString()};\nconst doblar = ${doblar.toString()};\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
