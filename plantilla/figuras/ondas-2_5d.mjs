// Lámina 2.5D+ de ondas: dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/ondas-2_5d.mjs                → plantilla/interactivos/ondas/plus/index.html
//                                                        y contenido/fisica/img/ondas.svg (figura fija para PDF y video)
//   node plantilla/figuras/ondas-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador de calor y temperatura (plantilla/figuras/calor-y-temperatura-2_5d.mjs): misma página (CSS_PRENSA),
// pantalla completa, evaluador de fórmulas, predicción y pasos desde el JSON, y salida .svg. Otro dibujo (altavoz con perilla,
// columna de aire, pecera de vidrio con agua, micrófono e hidrófono con su contador y regla en metros) y otra lógica (cada frente
// sale del altavoz a la velocidad del aire y, al cruzar la pared, sigue a la del agua; apagar deja viajar los que ya salieron).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "ondas";
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
// Variable de entrada: la frecuencia del altavoz; lo demás (velocidades, la cuerda de la prueba) viene del JSON.
function calc(J, f) {
  const v = { ...J.valoresIniciales, f };
  for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
  return v;
}
// Dónde va (en metros desde el altavoz) un frente que salió en te, en el instante t: a vA hasta la pared (metrosAire) y luego a vB.
// La frecuencia no aparece: cada frente conserva su hora de salida, así que la separación es λ = v ÷ f en cada medio.
function posicion(d, DA, te, t) {
  const tau = t - te, xa = tau * d.vA;
  return xa <= DA ? xa : DA + (tau - DA / d.vA) * d.vB;
}
// La trampa: el mismo frente si siguiera a la velocidad del aire dentro del agua (λ conservada)
function fantasma(d, te, t) { return (t - te) * d.vA; }
// Estado quieto (movimiento reducido y figura fija): altavoz encendido desde hace mucho, con un frente justo en la pared.
function quietos(d, DA, DB, f) {
  const em = [], n0 = Math.ceil(-DA * f / d.vA), n1 = Math.floor(DB * f / d.vA) + 1;
  for (let n = n0; n <= n1; n++) em.push(-DA / d.vA - n / f);
  return em;
}

// ---------- Modelo del dibujo (unidades del mundo; x = hacia donde viaja el sonido; z hacia arriba; el frente es +y) ----------
// La regla y los frentes están a escala entre sí (ESCM unidades por metro); el altavoz, la pecera (alto y fondo) y los contadores no.
const VI = J.valoresIniciales, RG = J.rangos, ES = J.escena;
const ESCM = 10;                                                                // unidades del mundo por metro (regla y frentes)
const DA = ES.metrosAire, DB = ES.metrosAgua;
const X0 = 13.5;                                                                // membrana del altavoz: el 0 de la regla
const XW = X0 + DA * ESCM, XE = XW + DB * ESCM, VG = 0.6;                       // pared izquierda y derecha (caras interiores) y grosor del vidrio
const YH = 7, ZI = 1.4, ZW = 19, ZR = 22;                                       // medio fondo de la pecera, piso, nivel del agua y borde
const PLACA = { x: -10, y: -19, w: 142, d: 46, r: 6 }, PLACA_H = 4, PATA_H = 4;
const SPK = { x: -4, y: -9, w: 17, d: 18, r: 1.2 }, ZS0 = 1.2, ZST = 26;        // caja del altavoz sobre patas
const ZC = (ZI + ZW) / 2, XC = SPK.x + SPK.w;                                   // centro del cono, en la cara +x
const PERILLA = { x: 1.5, y: 3.5 }, PILOTO = { x: 8.5, y: 4.5 }, RP = 2.6;
const PANT = { x: -2, w: 13, z0: 4, z1: 8.6 };                                  // pantalla de la frecuencia, al frente del altavoz
const XS = X0 + 1.6 * ESCM, MS = { x: XS - 6.5, y: -15.8, w: 13, d: 1.6, r: 0.4 }, ZM0 = 25, ZM1 = 31;   // contador del aire
const XH = XW + 2.5 * ESCM, HS = { x: XH - 6.5, y: -10.2, w: 13, d: 1.6, r: 0.4 }, ZH0 = ZR + 1.4, ZH1 = ZR + 7.4; // contador del agua
const RG_ = { x: X0 - 2.5, y: 17.4, w: (DA + DB) * ESCM + 5, d: 5, r: 0.6 }, ZRG = 0.9;   // regla
const ZCA = ZW + 2.4, ZCB = ZR + 2.4, YM = 12.2, ZMA = ZW + 9;               // alturas de las cotas (aire y agua), fila del agua y altura del aire
const NA = Math.ceil(RG.f.max * DA / VI.vA) + 2;                                // frentes que caben en el aire, en el agua y fantasmas
const NB = Math.ceil(RG.f.max * DB / Math.min(VI.vA, VI.vB)) + 2;
const NG = Math.ceil(RG.f.max * DB / VI.vA) + 2;
// Partículas del medio: tres filas en el plano central de la columna, una cada SEP_P (metros); se amontonan en cada frente
const SEP_P = 0.16, AMAX = 0.28, CADA = 6;
const PTS = [];
for (const z of [ZI + 3.5, (ZI + ZW) / 2, ZW - 3.5]) for (let x = SEP_P / 2; x < DA + DB; x += SEP_P) if (Math.abs(x - DA) > SEP_P / 3) PTS.push({ id: "pt" + PTS.length, x: +x.toFixed(3), y: 0, z, agua: x > DA });

const W = 640, H = 330;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [PLACA.x, PLACA.y + PLACA.d, -12], [MS.x, MS.y, ZM1 + 2], [HS.x + HS.w, HS.y, ZH1 + 2], [XE, 0, ZR + 21], [SPK.x, SPK.y, ZST + 2]],
  W, H, { pad: 10, azimuth: 72, elevation: 26 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], c[2] || 0], P);

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
function vista(C, K, s, J) {
  const P = C.P, ES = J.escena;
  const num = (v, dec = 2) => {
    const r = Math.round(v * 10 ** dec) / 10 ** dec;
    let [i, d] = Math.abs(r).toFixed(dec).split(".");
    d = (d || "").replace(/0+$/, "");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
  };
  const tpl = (t, o) => t.replace(/\{(\w+)\}/g, (m, q) => (q in o ? o[q] : m));
  const iso = (p) => K.iso(p, P);
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  const d = calc(J, s.f), rv = s.revelado, ft = !!s.trampa;
  const DA = C.DA, DB = C.DB, XM = (x) => C.X0 + x * C.ESCM;
  const m = {};
  const texto = (id, p, t, anc, ver = true) => { m[id] = ver ? { _v: true, x: p[0].toFixed(1), y: p[1].toFixed(1), "text-anchor": anc, _t: t } : { _v: false }; };
  const plano = (x) => "M" + [[x, -C.YH, C.ZI], [x, C.YH, C.ZI], [x, C.YH, C.ZW], [x, -C.YH, C.ZW]].map(q => pt(iso(q))).join("L") + "Z";

  // Altavoz: piloto encendido y perilla apuntando a «I» u «0»; la pantalla muestra la frecuencia de la fuente
  m["piloto"] = { class: "iso-solid piloto" + (s.on ? " on" : "") };
  const ang = s.on ? -Math.PI * 0.25 : -Math.PI * 0.75, rr = C.RP * 0.8;
  m["aguja-p"] = { d: "M" + pt(iso([C.PERILLA.x, C.PERILLA.y, C.ZST + 2.2])) + "L" + pt(iso([C.PERILLA.x + rr * Math.cos(ang), C.PERILLA.y + rr * Math.sin(ang), C.ZST + 2.2])) };
  m["t-fuente"] = { _t: tpl(J.figura.frecuencia, { f: num(s.f) }) };

  // Frentes: los del aire y los del agua, ordenados de atrás (x chica) hacia adelante; los que sobran se ocultan
  // El frente guía (uno de cada C.CADA) va marcado para seguirlo: acelera al cruzar la pared y se aleja más del de atrás.
  // Cerca de la pared derecha los frentes se desvanecen en vez de desaparecer de golpe.
  const guia = s.guia || [];
  const fr = s.em.map(te => ({ x: posicion(d, DA, te, s.t), g: guia.includes(te) })).filter(o => o.x >= 0 && o.x <= DA + DB).sort((a, b) => a.x - b.x);
  const xs = fr.map(o => o.x);
  const sale = (x) => Math.max(0, Math.min(1, (DA + DB - x) / 0.6)).toFixed(2);
  const frente = (o) => ({ _v: true, d: plano(XM(o.x)), class: "frente" + (o.g ? " guia" : ""), opacity: sale(o.x) });
  const aire = fr.filter(o => o.x <= DA), agua = fr.filter(o => o.x > DA);
  for (let i = 0; i < C.NA; i++) m["fa" + i] = i < aire.length ? frente(aire[i]) : { _v: false };
  for (let i = 0; i < C.NB; i++) m["fb" + i] = i < agua.length ? frente(agua[i]) : { _v: false };
  const gs = ft ? s.em.map(te => fantasma(d, te, s.t)).filter(x => x > DA && x <= DA + DB).sort((a, b) => a - b) : [];
  for (let i = 0; i < C.NG; i++) m["fg" + i] = i < gs.length ? { _v: true, d: plano(XM(gs[i])), opacity: sale(gs[i]) } : { _v: false };

  // Partículas del medio: cada una vibra alrededor de su lugar y se amontona en cada frente (compresión); no viajan con la onda.
  // Entre dos frentes seguidos, el desplazamiento es −a · sen(2π u) · (separación); delante del primer frente están quietas.
  for (const p of C.PTS) {
    let j = 0; while (j < xs.length && xs[j] <= p.x) j++;
    let xa = j > 0 ? xs[j - 1] : null, xb = j < xs.length ? xs[j] : null;
    if (xa === null && xb !== null && s.on && j + 1 < xs.length) xa = xb - (xs[j + 1] - xb);   // junto al altavoz: la compresión que se está formando
    let dx = 0;
    if (xa !== null && xb !== null && xb > xa) { const sep = xb - xa, u = (p.x - xa) / sep; dx = -Math.min(0.12 * sep, C.AMAX) * Math.sin(2 * Math.PI * u); }
    const q = iso([XM(p.x + dx), p.y, p.z]);
    m[p.id] = { cx: q[0].toFixed(1), cy: q[1].toFixed(1) };
  }

  // Cono: empuja hacia el agua justo al soltar cada frente y regresa (la fuente pone la frecuencia)
  let fase = 1;
  if (s.on) { const ult = s.em.filter(te => te <= s.t); if (ult.length) fase = ((s.t - Math.max(...ult)) * s.f) % 1; }
  const emp = s.on ? 0.9 * Math.exp(-5 * fase) : 0, av = [K.iso([emp, 0, 0], P)[0] - K.iso([0, 0, 0], P)[0], K.iso([emp, 0, 0], P)[1] - K.iso([0, 0, 0], P)[1]];
  m["cono-m"] = { transform: `translate(${av[0].toFixed(2)} ${av[1].toFixed(2)})` };
  // Pared: destella cada vez que un frente la cruza (cada frente que llega sale del otro lado)
  const cruza = s.em.some(te => { const x = posicion(d, DA, te, s.t) - DA; return x >= 0 && x < d.vB * 0.25 / ES.lento; });
  m["pared"] = { class: "pared" + (cruza ? " cruza" : "") };

  // Contadores: marcan la frecuencia cuando ya les llegó un frente; el foco se prende cada vez que pasa uno
  const ventana = (v) => v * 0.15 / ES.lento;
  const pasa = (x0, v) => s.em.some(te => { const x = posicion(d, DA, te, s.t) - x0; return x >= 0 && x < ventana(v); });
  m["led-a"] = { class: "led" + (pasa(C.SA, d.vA) ? " on" : "") };
  m["led-b"] = { class: "led" + (pasa(C.SB, d.vB) ? " on" : "") };
  m["t-ca"] = { _t: s.vistoA ? tpl(J.figura.frecuencia, { f: num(s.f) }) : J.figura.frecuenciaInc };
  m["t-cb"] = { _t: s.vistoB ? tpl(J.figura.frecuencia, { f: num(s.f) }) : J.figura.frecuenciaInc };

  // Cotas a escala: una λ junto a la pared en cada medio (la del agua queda en «?» hasta predecir o encender); la trampa, punteada
  const cota = (x0, x1, z) => { const y = C.YH, sg = (a, b) => "M" + pt(iso(a)) + "L" + pt(iso(b));
    return sg([x0, y, z], [x1, y, z]) + sg([x0, y, z - 1.3], [x0, y, z + 1.3]) + sg([x1, y, z - 1.3], [x1, y, z + 1.3]); };
  const xa0 = C.XW - d.lA * C.ESCM, xb1 = C.XW + d.lB * C.ESCM;
  m["cota-a"] = { d: cota(xa0, C.XW, C.ZCA) };
  m["cota-b"] = { _v: rv, d: cota(C.XW, xb1, C.ZCB) };
  texto("t-cota-a", mas(iso([C.XW - 1.5, C.YH, C.ZCA]), 0, -5), tpl(J.figura.lambdaAire, { l: num(d.lA) }), "end");
  texto("t-cota-b", mas(iso([C.XW + 1.5, C.YH, C.ZCB]), 0, -5), rv ? tpl(J.figura.lambdaAgua, { l: num(d.lB) }) : J.figura.lambdaInc, "start");

  // Velocidades y trampa
  m["t-va"] = { _t: tpl(J.figura.velocidadAire, { v: num(d.vA) }) };
  m["t-vb"] = { _t: tpl(J.figura.velocidadAgua, { v: num(d.vB) }) };
  const pfa = iso([C.XE, 0, C.ZR + 19]);
  m["fant-t"] = ft ? { _v: true, x: pfa[0].toFixed(1), y: pfa[1].toFixed(1) } : { _v: false };
  m["fant-1"] = { x: pfa[0].toFixed(1), _t: tpl(J.trampa.fantasma, { qA: num(d.qA) }) };
  m["fant-2"] = { x: pfa[0].toFixed(1), _t: tpl(J.trampa.real, { lB: rv ? num(d.lB) : "?" }) };

  // Rótulos
  const rot = (nn, p, ver = true) => { m["rot-" + nn] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  rot("01", mas(iso([C.SPK.x, C.SPK.y + C.SPK.d, C.ZST - 4]), -12, 0));
  rot("02", mas(iso([C.PERILLA.x - C.RP, C.PERILLA.y, C.ZST + 2]), -12, -6));
  rot("03", mas(iso([XM(DA * 0.3), C.YH, C.ZI]), -4, 12));
  rot("04", mas(iso([C.XW - C.VG, C.YH + C.VG, C.ZI]), -12, 8));
  rot("05", mas(iso([XM(DA + DB * 0.78), C.YH + C.VG, C.ZI]), 0, 12));
  rot("06", mas(iso([C.RG.x + C.RG.w, C.RG.y + C.RG.d, C.ZRG]), 12, 2));
  rot("07", mas(iso([C.MS.x + C.MS.w, C.MS.y + C.MS.d, C.ZM1]), 10, -4));
  rot("08", mas(iso([C.HS.x, C.HS.y + C.HS.d, C.ZH1]), -10, -6));
  rot("09", mas(iso([C.X0 + 1.5, 0, C.ZMA]), 8, -4));
  rot("10", mas(pfa, 12, 6), ft);
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
const fmt = (v) => { const r = Math.round(v * 10) / 10; return (r < 0 ? "−" : "") + String(Math.abs(r)); };

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
  const pl = { x: X0 - 2.5, y: PLACA.y + PLACA.d - 3.6, w: 34, d: 2.4, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 2.4, pl.y + 1.8], 0.4, P, "x"), J.figura.placa, { size: 1.5, tone: "lo" }));
  o.push(D([at([pl.x + 1.2, pl.y + 1.2, 0.4]), at([pl.x + pl.w - 1.2, pl.y + 1.2, 0.4])], { size: 0.4 }));
  return o.join("");
}
// Altavoz: caja sobre patas, cono con suspensión y tapa en la cara +x, tweeter, rejilla al frente, perilla, piloto y pantalla
function altavoz(m) {
  const o = [];
  for (const [x, y] of k.corners(SPK, 2.5).sort((a, b) => prof(a) - prof(b))) o.push(S(k.cylinder(x, y, 1.3, 0, ZS0, P, 16), { tone: "lo" }));
  o.push(S(k.slabOf(SPK, ZS0, ZST - ZS0, P, 6, 0.6), { tone: "mid" }));
  o.push(L(k.planOutline(k.insetPlan(SPK, 1.4), ZST, P), { tone: "faint" }));
  // Cono en la cara que mira al agua (x = XC): suspensión, cono, tapa y tornillos
  const xc = XC + 0.05;
  o.push(`<path class="cono-f" d="${k.sideRing([xc, 0, ZC], 7.4, "x", P, 48)}"/>`);
  o.push(L(k.sideRing([xc, 0, ZC], 6.6, "x", P, 48), { tone: "mid" }));
  o.push(E("g", "cono-m", {}, m, L(k.sideRing([xc, 0, ZC], 4.6, "x", P, 40) + k.sideRing([xc, 0, ZC], 2.8, "x", P, 32), { tone: "mid" })
    + `<path class="cono-tapa" d="${k.sideRing([xc, 0, ZC], 1.7, "x", P, 24)}"/>`));
  o.push(`<path class="cono-f" d="${k.sideRing([xc, 0, ZST - 3.6], 1.9, "x", P, 24)}"/>` + L(k.sideRing([xc, 0, ZST - 3.6], 1.0, "x", P, 20), { tone: "mid" }));
  const tor = [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + i * Math.PI / 2; return at([xc, 7.9 * Math.cos(a), ZC + 7.9 * Math.sin(a)]); });
  o.push(D(tor, { size: 0.5 }));
  // Rejilla de ventilación al frente (a los lados de la pantalla)
  const yF = SPK.y + SPK.d + 0.02;
  let rej = "";
  for (let z = PANT.z1 + 2; z < ZST - 2; z += 1.2) rej += k.segment([SPK.x + 2, yF, z], [SPK.x + SPK.w - 2, yF, z], P);
  o.push(L(rej, { tone: "lo" }));
  const parte01 = `<g data-parte="01">${o.join("")}</g>`;
  // Mandos: perilla moleteada con «0» e «I» y piloto
  const man = [S(k.cylinder(PERILLA.x, PERILLA.y, RP, ZST, 2.2, P, 32, 0.25), { tone: "hi" }), L(k.knurl(PERILLA.x, PERILLA.y, RP, ZST + 0.3, ZST + 1.9, 18, P), { tone: "lo" })];
  man.push(k.faceTextSvg(k.topMatrix([PERILLA.x - 4.6, PERILLA.y + 3.9], ZST, P, "x"), "0", { size: 2, tone: "lo" }));
  man.push(k.faceTextSvg(k.topMatrix([PERILLA.x + 3.4, PERILLA.y + 3.9], ZST, P, "x"), "I", { size: 2, tone: "lo" }));
  man.push(E("path", "aguja-p", { class: "aguja" }, m));
  const pil = k.cylinder(PILOTO.x, PILOTO.y, 1.1, ZST, 0.7, P, 20);
  man.push(E("g", "piloto", { class: "iso-solid piloto" }, m, `<path class="iso-fill" d="${pil.fill}"/><path class="iso-top" d="${pil.top}"/><path class="iso-line iso-edge" data-tone="lo" d="${pil.outline}"/>`));
  // Pantalla con la frecuencia de la fuente
  const pan = [S(k.slabOf({ x: PANT.x, y: yF, w: PANT.w, d: 0.4, r: 0.15 }, PANT.z0, PANT.z1 - PANT.z0, P, 2), { tone: "lo", className: "pantalla-q", crease: "none" })];
  pan.push(E("text", "t-fuente", { class: "t-cont", transform: k.sideMatrix([PANT.x + 1.4, yF + 0.42], PANT.z0 + 1.35, P, "left"), "font-size": "2.8" }, m));
  return parte01 + `<g data-parte="02">${man.join("")}</g><g data-parte="01">${pan.join("")}</g>`;
}
// Contador del aire: pie, poste, brazo con micrófono junto a la columna y caja con pantalla y foco
function contadorAire(m) {
  const o = [S(k.slabOf({ x: XS - 4, y: -17.6, w: 8, d: 6, r: 1 }, 0, 1, P, 4, 0.2), { tone: "mid" })];
  o.push(S(k.cylinder(XS, -14.6, 0.7, 1, ZM0 - 1, P, 16), { tone: "mid" }));
  o.push(S(k.slabOf({ x: XS - 0.6, y: -14.6, w: 1.2, d: 5.6, r: 0.3 }, ZW + 2.4, 1.2, P, 3), { tone: "lo" }));
  o.push(S(k.cylinder(XS, -8.6, 0.9, ZW - 1.2, 4.8, P, 18, 0.2), { tone: "hi" }));
  o.push(L(k.knurl(XS, -8.6, 0.9, ZW - 0.9, ZW + 0.6, 10, P), { tone: "lo" }));
  o.push(S(k.slabOf(MS, ZM0, ZM1 - ZM0, P, 3, 0.2), { tone: "mid", lit: true }));
  const yF = MS.y + MS.d + 0.02;
  o.push(S(k.slabOf({ x: MS.x + 0.9, y: yF, w: 9.9, d: 0.3, r: 0.1 }, ZM0 + 1.2, 3.6, P, 2), { tone: "lo", className: "pantalla-q", crease: "none" }));
  o.push(E("text", "t-ca", { class: "t-cont", transform: k.sideMatrix([MS.x + 1.5, yF + 0.32], ZM0 + 2.1, P, "left"), "font-size": "2" }, m));
  const pl = at([MS.x + MS.w - 1.4, yF, ZM0 + 3]);
  o.push(E("circle", "led-a", { class: "led", cx: pl[0].toFixed(1), cy: pl[1].toFixed(1), r: "2.2" }, m));
  return `<g data-parte="07">${o.join("")}</g>`;
}
// Contador del agua: caja enganchada al borde de atrás, varilla e hidrófono dentro del agua
function contadorAgua(m) {
  const o = [S(k.slabOf({ x: XH - 0.5, y: -6.6, w: 1, d: 1, r: 0.3 }, ZI + 6, ZH0 - ZI - 6, P, 3), { tone: "mid" })];
  o.push(S(k.cylinder(XH, -6.1, 1.1, ZI + 3.4, 3.2, P, 18, 0.25), { tone: "hi" }));
  for (const x of [HS.x + 1.5, HS.x + HS.w - 2.5]) o.push(S(k.slabOf({ x, y: -8.6, w: 1, d: 2, r: 0.2 }, ZR - 2, ZH0 - ZR + 2, P, 2), { tone: "lo" }));
  o.push(S(k.slabOf(HS, ZH0, ZH1 - ZH0, P, 3, 0.2), { tone: "mid", lit: true }));
  const yF = HS.y + HS.d + 0.02;
  o.push(S(k.slabOf({ x: HS.x + 0.9, y: yF, w: 9.9, d: 0.3, r: 0.1 }, ZH0 + 1.2, 3.6, P, 2), { tone: "lo", className: "pantalla-q", crease: "none" }));
  o.push(E("text", "t-cb", { class: "t-cont", transform: k.sideMatrix([HS.x + 1.5, yF + 0.32], ZH0 + 2.1, P, "left"), "font-size": "2" }, m));
  const pl = at([HS.x + HS.w - 1.4, yF, ZH0 + 3]);
  o.push(E("circle", "led-b", { class: "led", cx: pl[0].toFixed(1), cy: pl[1].toFixed(1), r: "2.2" }, m));
  return `<g data-parte="08">${o.join("")}</g>`;
}
// Pecera: base, vidrio de atrás (fondo), agua y vidrio de adelante (aristas), con la pared izquierda marcada
const TK = { x: XW - VG, y: -YH - VG, w: XE - XW + 2 * VG, d: 2 * YH + 2 * VG, r: 0.5 };
function peceraFondo() {
  const o = [S(k.slabOf({ ...TK, x: TK.x - 0.4, y: TK.y - 0.4, w: TK.w + 0.8, d: TK.d + 0.8 }, 0, ZI, P, 3, 0.2), { tone: "mid" })];
  o.push(S(k.slabOf(TK, ZI, ZR - ZI, P, 3), { tone: "hi", className: "vidrio", crease: "none" }));
  return `<g data-parte="04">${o.join("")}</g>`;
}
const AGUA = { x: XW, y: -YH, w: XE - XW, d: 2 * YH, r: 0.1 };
function peceraFrente(m) {
  const o = [L(k.planOutline(TK, ZR, P, 3) + k.planOutline({ ...AGUA, r: 0 }, ZR, P, 1), { tone: "mid" })];
  // Pared izquierda (la frontera entre medios): sus aristas visibles más marcadas
  o.push(L(k.segment([XW - VG, YH + VG, ZI], [XW - VG, YH + VG, ZR], P) + k.segment([XW, YH, ZI], [XW, YH, ZR], P), { tone: "hi" }));
  o.push(E("path", "pared", { class: "pared", d: k.segment([XW, YH, ZI], [XW, YH, ZW], P) + k.segment([XW, -YH, ZW], [XW, YH, ZW], P) }, m));
  o.push(L(k.segment([XE + VG, YH + VG, ZI], [XE + VG, YH + VG, ZR], P), { tone: "mid" }));
  return `<g data-parte="04">${o.join("")}</g>`;
}
// Regla en metros (misma escala que los frentes): marcas cada pasoRegla y números cada etiquetasRegla
function regla() {
  const o = [S(k.slabOf(RG_, 0, ZRG, P, 3, 0.15), { tone: "mid", lit: true })];
  const y0 = RG_.y + 0.5, total = DA + DB;
  let menor = "", mayor = "", tx = "";
  const n = Math.round(total / ES.pasoRegla), cada = Math.round(ES.etiquetasRegla / ES.pasoRegla);
  for (let i = 0; i <= n; i++) {
    const xm = i * ES.pasoRegla, x = X0 + xm * ESCM, big = i % cada === 0;
    const sg = k.segment([x, y0, ZRG], [x, y0 + (big ? 2.4 : 1.4), ZRG], P);
    if (big) { mayor += sg; const q = at([x, y0 + 3.6, ZRG]); tx += `<text class="t-regla" text-anchor="middle" x="${q[0].toFixed(1)}" y="${(q[1] + 3).toFixed(1)}">${esc(fmt(xm))}</text>`; }
    else menor += sg;
  }
  const qm = at([X0 + total * ESCM + 1.6, y0 + 3.6, ZRG]);
  tx += `<text class="t-regla u" x="${qm[0].toFixed(1)}" y="${(qm[1] + 3).toFixed(1)}">${esc(J.figura.regla)}</text>`;
  o.push(`<path class="tk menor" d="${menor}"/><path class="tk mayor" d="${mayor}"/>` + tx);
  return `<g data-parte="06">${o.join("")}</g>`;
}

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
const pool = (pre, n, cls, parte, m) => `<g data-parte="${parte}">` + Array.from({ length: n }, (_, i) => E("path", pre + i, { class: cls }, m)).join("") + `</g>`;
function cuerpo(m) {
  const medio = (idv, x, y, z, t, anc = "middle") => { const q = at([x, y, z]); if (anc === "start") q[0] += 22; return `<text class="t-medio" text-anchor="${anc}" x="${q[0].toFixed(1)}" y="${(q[1] + 3).toFixed(1)}">${esc(t)} · ` + E("tspan", idv, { class: "v" }, m) + `</text>`; };
  return [
    placa(), contadorAire(m), altavoz(m),
    pool("fa", NA, "frente", "03", m),
    `<g class="particulas" data-parte="03">` + PTS.filter(p => !p.agua).map(p => E("circle", p.id, { r: "1.05" }, m)).join("") + `</g>`,
    peceraFondo(), contadorAgua(m),
    `<g data-parte="05">${S(k.slabOf(AGUA, ZI, ZW - ZI, P, 1), { tone: "mid", className: "agua", crease: "none" })}</g>`,
    pool("fb", NB, "frente", "05", m),
    `<g class="particulas agua-p" data-parte="05">` + PTS.filter(p => p.agua).map(p => E("circle", p.id, { r: "1.05" }, m)).join("") + `</g>`,
    pool("fg", NG, "fantasma", "10", m),
    peceraFrente(m), regla(),
    `<g data-parte="03">` + E("path", "cota-a", { class: "cota" }, m) + E("text", "t-cota-a", { class: "t-cota" }, m) + `</g>`,
    `<g data-parte="05">` + E("path", "cota-b", { class: "cota" }, m) + E("text", "t-cota-b", { class: "t-cota" }, m) + `</g>`,
    `<g data-parte="09">` + medio("t-va", X0 + 1.5, 0, ZMA, J.figura.medioAire, "start") + medio("t-vb", XW + DB * ESCM * 0.5, YM, 0, J.figura.medioAgua) + `</g>`,
    E("text", "fant-t", { class: "t-trampa", "text-anchor": "end", "data-parte": "10" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { P, W, H, ESCM, DA, DB, X0, XW, XE, VG, YH, ZI, ZW, ZR, SPK, ZST, PERILLA, RP, MS, ZM1, HS, ZH1, RG: RG_, ZRG, ZCA, ZCB, YM, ZMA, PTS: PTS.map(({ id, x, y, z }) => ({ id, x, y, z })), AMAX, CADA, NA, NB, NG, ROT,
  SA: (XS - X0) / ESCM, SB: (XH - X0) / ESCM };
const estado0 = { f: VI.f, t: 0, em: [], on: false, revelado: false, trampa: false, vistoA: false, vistoB: false };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit, vista, calc, posicion, fantasma y quietos) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/ondas-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/ondas-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, L = J.lecturas, CT = J.controles, ES = J.escena;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const LENTO = ES.lento;   // la animación va LENTO veces más lenta que el sonido real

let f = V.f, t = 0, em = [], guia = [], nEm = 0, tSig = 0, on = false, vistoA = false, vistoB = false, dijoAgua = false;
let revelado = false, trampaOn = false, sel = null, selRec = false, enRecorrido = false;
const numeros = () => {
  const d = calc(J, f), o = {};
  for (const x in d) o[x] = num(d[x]);
  o.lento = num(LENTO);
  return o;
};

const svg = $(".iso-svg"), stage = $(".iso-stage"), bPri = $("#encender"), bTrampa = $("#trampa"), bExamen = $("#examen"), nota = $("#nota");
const SL = { f: $("#s-f") };

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo;
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#pred-t").textContent = J.prediccion.titulo;
$("#sum-imp").textContent = CT.profundizar;
bTrampa.textContent = CT.trampa; bExamen.textContent = CT.examen;
$("#l-f").textContent = CT.f; SL.f.min = RG.f.min; SL.f.max = RG.f.max; SL.f.step = RG.f.paso;
stage.setAttribute("aria-valuemin", RG.f.min); stage.setAttribute("aria-valuemax", RG.f.max);
stage.setAttribute("aria-label", "Lámina: flechas izquierda y derecha cambian la frecuencia del altavoz; B lo enciende o lo apaga");

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
const OCULTOS = ["lB"];
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
const estado = () => ({ f, t, em, guia, on, revelado: rv(), trampa: trampaOn, vistoA, vistoB });
const valorSl = (v) => tpl(CT.valorF, { v: num(v) });

function render(){
  const n = numeros(), o = valores();
  aplicar(vista(C, K, estado(), J));
  // Panel
  $("#o-v").textContent = rv() ? `${n.lB} m` : "? m";
  $("#o-formula").innerHTML = rv() ? tpl(L.aguaValor, n) : L.sinRevelar;
  const s = SL.f;
  $("#o-f").textContent = valorSl(f);
  s.style.setProperty("--p", (100 * (f - RG.f.min) / (RG.f.max - RG.f.min)) + "%");
  if (Math.abs(+s.value - f) > 1e-9) s.value = f;
  s.setAttribute("aria-valuetext", valorSl(f));
  $("#o-fr").textContent = `${n.f} Hz`;
  $("#o-la").textContent = `${n.lA} m`;
  $("#o-r").textContent = `${n.r} veces`;
  const lect = `f ${n.f} Hz · λ aire ${n.lA} m · λ agua ${o.lB} m`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", f);
  stage.setAttribute("aria-valuetext", `Altavoz de ${n.f} Hz ${on ? "encendido" : "apagado"}; en el aire λ = ${n.lA} m` + (rv() ? `; en el agua λ = ${n.lB} m` : ""));
  bPri.textContent = on ? CT.apagar : CT.encender;
  document.querySelectorAll(".rot-b").forEach(b => { const tt = tpl(J.rotulos[b.dataset.n][0], o), sp = b.querySelector("span"); if (sp.textContent !== tt) sp.textContent = tt; });
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.frecuencia, tpl(L.frecuenciaValor, o)],
    [L.aire, tpl(L.aireValor, o)],
    [L.agua, tpl(L.aguaValor, o) + "<br>" + tpl(L.razonValor, o)],
    [L.trampa, tpl(L.trampaValor, o) + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((x, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${x[0]}</span><span class="va">${x[1]}</span></li>`).join("");
  $("#impulso").innerHTML = J.profundizar.parrafos.map(p => `<p>${tpl(p, o)}</p>`).join("");
  if (sel) pintarFicha();
}

// ---------- Sonido: el reloj t (segundos reales del sonido) avanza dt ÷ LENTO; el altavoz suelta un frente cada 1 ÷ f ----------
let anim = 0, pendiente = false;
const DA = C.DA, DB = C.DB;
const vida = () => { const d = calc(J, f); return DA / d.vA + DB / (trampaOn ? Math.min(d.vA, d.vB) : d.vB); };   // lo que tarda en salir (con la trampa, el fantasma)
function revisar(){
  const d = calc(J, f), xs = em.map(te => posicion(d, DA, te, t));
  if (!vistoA && xs.some(x => x >= C.SA)) vistoA = true;
  if (!vistoB && xs.some(x => x >= C.SB)) vistoB = true;
  if (on && !dijoAgua && xs.some(x => x > DA)){ dijoAgua = true; decir(tpl(L.mensajeAgua, numeros())); }
}
function correr(){
  cancelAnimationFrame(anim); pendiente = true;
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.max(0, Math.min(0.05, (ahora - antes) / 1000)); antes = ahora;
    t += dt / LENTO;
    while (on && tSig <= t){ em.push(tSig); if (nEm++ % C.CADA === 0) guia.push(tSig); tSig += 1 / f; }
    const v = vida(); em = em.filter(te => t - te <= v); guia = guia.filter(te => t - te <= v);
    revisar(); render();
    if (on || em.length) anim = requestAnimationFrame(paso); else { anim = 0; pendiente = false; render(); }
  };
  render(); anim = requestAnimationFrame(paso);
}
function detener(){ cancelAnimationFrame(anim); anim = 0; pendiente = false; }
// Movimiento reducido: sin animación; encendido = frentes quietos en su lugar (como si llevara rato sonando)
function quietoAhora(){ const d = calc(J, f); t = 0; em = on ? quietos(d, DA, DB, f) : []; guia = em.filter((te, i) => Math.abs(Math.round((te + DA / d.vA) * f)) % C.CADA === 0); vistoA = vistoB = on; dijoAgua = on; }
function encender(){
  on = true; revelado = true; dijoAgua = false;
  decir(tpl(L.mensajeAire, numeros()));
  if (quieto){ quietoAhora(); decir(tpl(L.mensajeAgua, numeros())); render(); return; }
  tSig = t; nEm = 0; correr();
}
function apagar(){
  on = false; decir(tpl(L.mensajeApagado, numeros()));
  if (quieto){ quietoAhora(); render(); return; }
  render();   // la animación sigue hasta que salgan los frentes que ya viajaban
}
function silencio(){ detener(); on = false; em = []; guia = []; t = 0; tSig = 0; vistoA = vistoB = false; dijoAgua = false; }
function principal(){ if (on) apagar(); else encender(); }

// ---------- Perilla: tocarla enciende o apaga (es el mismo control principal) ----------
const perilla = $("#aguja-p").closest("g");
$("#piloto").parentNode.addEventListener("click", (e) => { if (!e.target.closest("#rot")) { tomarControl(); principal(); } });
perilla.classList.add("toque");

// ---------- Recorrido automático: recorre los rótulos sin encender ni mostrar el resultado; se detiene al tocar ----------
const REC = C.ROT.filter(n => n !== "10");
let tRec = 0, iRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  selRec = true; setSel(REC[iRec % REC.length]); iRec++; render();
  tRec = setTimeout(pasoRecorrido, 2400);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim || on || em.length){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe ni tapa lo que hizo el usuario
  enRecorrido = true; nota.textContent = ""; pasoRecorrido();
}
function tomarControl(){
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
  silencio(); f = V.f; revelado = false;
  if (trampaOn) apagarTrampa();
  decir(tpl(L.mensajeReinicio, numeros())); render();
});
function apagarTrampa(){ trampaOn = false; bTrampa.setAttribute("aria-pressed", "false"); bTrampa.textContent = CT.trampa; }
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? CT.ocultarTrampa : CT.trampa;
  if (trampaOn){
    revelado = true;
    if (!on && !em.length) encender(); else render();
    decir(tpl(L.mensajeTrampa, numeros()));
  } else render();
});
// Cambiar la frecuencia: los frentes que ya salieron conservan su separación; los nuevos salen con la nueva λ
function cambiaF(v){
  const f0 = f; f = v;
  if (f === f0) return;
  if (!on) revelado = false;
  if (quieto){ quietoAhora(); return; }
  if (on){ const ult = em.length ? em[em.length - 1] : t; tSig = Math.max(t, ult + 1 / f); }
}
SL.f.addEventListener("input", () => { cambiaF(+SL.f.value); render(); });
SL.f.addEventListener("change", () => { decir(tpl(L.mensajeCambio, numeros())); render(); pintarPrediccion(); });
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
const pasoR = (v) => Math.max(RG.f.min, Math.min(RG.f.max, Math.round(v / RG.f.paso) * RG.f.paso));
stage.addEventListener("keydown", (e) => {
  const df = {ArrowRight:1, ArrowLeft:-1, ArrowUp:1, ArrowDown:-1}[e.key];
  if (df === undefined) return;
  e.preventDefault(); cambiaF(pasoR(f + df * RG.f.paso));
  decir(tpl(L.mensajeCambio, numeros())); render(); pintarPrediccion();
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
// «Predice»: las opciones salen de las fórmulas del JSON con la frecuencia del deslizador (en el orden del examen)
const LETRAS = ["A", "B", "C", "D"];
function pintarPrediccion(){
  const d = calc(J, f), n = numeros();
  $("#pred-q").innerHTML = tpl(J.prediccion.pregunta, n);
  const ops = J.prediccion.opciones.map((x, i) => ({ ok: !!x.correcta, e: tpl(x.retro, n), t: `${LETRAS[i]}) ${num(evalua(x.formula, d))} ${J.prediccion.unidad}` }));
  opciones($("#pred-ops"), ops, () => {
    tomarControl(); if (trampaOn) apagarTrampa();
    revelado = true;
    if (!on) encender(); else render();
  });
}
pintarPrediccion();
bExamen.addEventListener("click", pintarPrediccion);

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

$("#pie").innerHTML = `<i>${J.figura.pie}</i> Modelo: la regla y los frentes de onda van a la misma escala: ${num(ES.metrosAire)} m de aire entre el altavoz y la pecera y ${num(ES.metrosAgua)} m de agua. El altavoz, el alto y el fondo de la pecera y los contadores con sus soportes no están a escala.
 Los frentes son planos: cada franja es una cresta de presión y entre dos crestas hay una λ. El sonido va a ${num(V.vA)} m/s en el aire y a ${num(V.vB)} m/s en el agua; la animación va ${num(LENTO)} veces más lenta. Cada contador marca la frecuencia cuando le llega el primer frente, y su foco se prende cada vez que pasa uno.
 Los puntos son partículas del medio: vibran en su lugar y se amontonan en cada frente; lo que viaja es la compresión, no las partículas. Uno de cada ${C.CADA} frentes va marcado para que lo sigas: al cruzar la pared acelera y se separa más del de atrás.
 Al apagar el altavoz ya no salen frentes, pero los que salieron siguen hasta salir de la lámina. Si cambias la frecuencia con el altavoz encendido, los frentes nuevos salen con la nueva λ y los anteriores conservan la suya.
 Si nadie toca, la lámina recorre sus partes sin encender ni mostrar el resultado; con movimiento reducido, los frentes aparecen quietos en su lugar. En el celular, «Pantalla completa» la muestra grande y se acerca con pellizco. Teclas: B enciende o apaga; con la lámina enfocada, ← → cambian la frecuencia. También puedes tocar la perilla.`;
// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#encender", "#trampa", "#bloque-f"].map(s => $(s));
const arr = null;
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

pintarFicha(); render();
window.__ondas = { set:(o) => { if ("f" in o) f = o.f; if ("t" in o) t = o.t; if ("em" in o) em = o.em; if ("rev" in o) revelado = o.rev; if ("trampa" in o) trampaOn = o.trampa;
    if ("vistos" in o) vistoA = vistoB = o.vistos; render(); },
  quietos:() => { on = true; revelado = true; quietoAhora(); render(); },
  sel:seleccionar, completa:entrar, salir, estado:() => ({ f, t, em: em.length, on, revelado, trampaOn, vistoA, vistoB }),
  alto:() => { enRecorrido = false; clearTimeout(tRec); detener(); if (selRec){ selRec = false; setSel(null); } render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de ondas) ----------
// Tokens de la fusión, grises cálidos y CSS de página: copiados tal cual del generador de calor y temperatura (Arquímedes v2).
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
/* Propio de ondas (también va en el SVG fijo) */
.agua>.iso-fill{fill:var(--agua-1);fill-opacity:.34} .agua>.iso-top{fill:var(--agua-sup);fill-opacity:.55}
.agua>.iso-shade{fill:var(--agua-1);opacity:.28}
.agua>.iso-edge{stroke:var(--agua-2)}
.vidrio>.iso-fill{fill:var(--agua-sup);fill-opacity:.12} .vidrio>.iso-shade{opacity:.14} .vidrio>.iso-top{fill:none}
.frente{fill:var(--acento);fill-opacity:.16;stroke:var(--acento);stroke-width:1.3;stroke-linejoin:round}
.frente.guia{fill-opacity:.3;stroke:var(--anatomy-lit);stroke-width:1.9}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3;stroke-linejoin:round}
.particulas circle{fill:var(--anatomy-mid)} .particulas.agua-p circle{fill:var(--agua-2)}
.pared{fill:none;stroke:transparent;stroke-width:2.6;stroke-linecap:round;transition:stroke .2s}
.pared.cruza{stroke:var(--acento)}
@media (prefers-reduced-motion:reduce){.pared{transition:none}}
.cono-f{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:.6}
.cono-tapa{fill:var(--anatomy-shade-0);stroke:var(--anatomy-mid);stroke-width:.6}
.piloto>.iso-fill,.piloto>.iso-top{fill:var(--anatomy-faint)} .piloto.on>.iso-fill,.piloto.on>.iso-top{fill:var(--rubrica)}
.aguja{fill:none;stroke:var(--anatomy-strong);stroke-width:1.2;stroke-linecap:round}
.pantalla-q>.iso-fill,.pantalla-q>.iso-top,.pantalla-q>.iso-shade{fill:color-mix(in srgb,var(--acento) 16%,var(--anatomy-shade-0))}
.t-cont{font-family:var(--anatomy-mono);font-weight:600;fill:var(--acento);font-variant-numeric:tabular-nums}
.led{fill:var(--anatomy-faint);stroke:var(--anatomy-mid);stroke-width:.6} .led.on{fill:var(--acento);stroke:var(--acento)}
.tk{fill:none;stroke-width:.6} .tk.menor{stroke:var(--anatomy-lo)} .tk.mayor{stroke:var(--anatomy-mid)}
.t-regla{font:500 8.5px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums} .t-regla.u{font:italic 500 10px var(--serif)}
.cota{fill:none;stroke:var(--anatomy-strong);stroke-width:.9} .cota.fant{stroke:var(--rubrica);stroke-dasharray:3 2}
.t-cota{font:500 11px var(--anatomy-mono);fill:var(--anatomy-strong);font-variant-numeric:tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-cota.fant{fill:var(--rubrica)}
.t-medio{font:italic 500 12px var(--serif);fill:var(--anatomy-text);letter-spacing:.06em;paint-order:stroke;stroke:var(--sup);stroke-width:3px;stroke-linejoin:round}
.t-medio .v{font:500 10.5px var(--anatomy-mono);font-style:normal;letter-spacing:0;fill:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de ondas */
.escena .iso-plate-corner[data-corner="hint"]{max-width:52%}
.toque{cursor:pointer}
.chips output{font-size:1.15rem}
.controles .deslizadores{display:grid;gap:12px}
.escala{flex:1;min-width:0;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums}
.grande{font-size:clamp(2rem,8vw,3rem)}
.profundizar+.profundizar{border-top:none;padding-top:0}
#impulso p{margin:6px 0;max-width:62ch}
@media (max-width:560px){.escena .t-cota{font-size:14px}.escena .t-trampa{font-size:13px}.escena .t-medio{font-size:15px}.escena .t-medio .v{font-size:13px}
  .escena .t-regla{font-size:10.5px}.escena .t-regla.u{font-size:13px}.escena .rot circle{r:11px}.escena .rot text{font-size:12px}}
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
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .modo-lamina .compacto #bloque-f{grid-column:1/-1}
  .modo-lamina .compacto .boton{white-space:normal;padding:8px 12px;line-height:1.2}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el del examen, sonando, con la trampa) ----------
function svgFijo() {
  const d = calc(J, VI.f);
  const em = quietos(d, DA, DB, VI.f), guia = em.filter(te => Math.abs(Math.round((te + DA / d.vA) * VI.f)) % CADA === 0);
  const s = { f: VI.f, t: 0, em, guia, on: true, revelado: true, trampa: true, vistoA: true, vistoB: true };
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
  readout: `f ${VI.f} Hz`,
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
          <span class="escala" id="escala">Escala: regla y frentes en metros; altavoz y pecera no</span>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="c-v">${esc(J.lecturas.agua)} · λ</span>
          <output id="o-v" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div class="deslizadores">
          <div id="bloque-f"><div class="fila"><label for="s-f" id="l-f"></label><output id="o-f"></output></div><input type="range" id="s-f"></div>
        </div>
        <div class="chips">
          <div class="chip"><span>Frecuencia · los dos medios</span><output id="o-fr"></output></div>
          <div class="chip"><span>λ en el aire</span><output id="o-la"></output></div>
          <div class="chip"><span>λ agua ÷ λ aire</span><output id="o-r"></output></div>
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
          <div id="impulso"></div>
        </details>
      </div>
      <p class="pie" id="pie"></p>
    </section>
    <div id="pasos-b" class="pasos"></div>
  </div>
</main>
<!--respaldo-->
<script type="module">${(kitScript() + `\nconst evalua = ${evalua.toString()};\nconst calc = ${calc.toString()};\nconst posicion = ${posicion.toString()};\nconst fantasma = ${fantasma.toString()};\nconst quietos = ${quietos.toString()};\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
