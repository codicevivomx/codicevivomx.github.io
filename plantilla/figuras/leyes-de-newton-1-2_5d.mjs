// Lámina 2.5D+ de la primera ley de Newton (inercia): dibujo con el kit de Anatomy, página en estilo fusión.
// Uso (desde la raíz del repo):
//   node plantilla/figuras/leyes-de-newton-1-2_5d.mjs                → plantilla/interactivos/leyes-de-newton-1/plus/index.html
//                                                                     y contenido/fisica/img/leyes-de-newton-1.svg (figura fija para PDF y video)
//   node plantilla/figuras/leyes-de-newton-1-2_5d.mjs --vista <ruta> → además, copia con el JSON dentro (vista previa sin servidor)
// No editar el HTML ni el SVG a mano: se regeneran con este script. El kit vive en .claude/skills/anatomy (fuera del repo público).
// Parte del generador del tiro parabólico (plantilla/figuras/tiro-parabolico-2_5d.mjs): misma página y lógica, otro dibujo.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMA = "leyes-de-newton-1";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL = join(RAIZ, ".claude", "skills", "anatomy");
const k = await import("file://" + join(SKILL, "kit", "iso-kit.mjs"));
const { kitScript } = await import("file://" + join(SKILL, "scripts", "inline-kit.mjs"));
const JSON_TEMA = join(RAIZ, "contenido", "fisica", `${TEMA}-interactivo.json`);
const SALIDA = join(RAIZ, "plantilla", "interactivos", TEMA, "plus", "index.html");
const SALIDA_SVG = join(RAIZ, "contenido", "fisica", "img", `${TEMA}.svg`);
const J = JSON.parse(readFileSync(JSON_TEMA, "utf8"));

// ---------- Modelo del dibujo (unidades del mundo; z hacia arriba; el disco va por y = 0) ----------
// La pista y la regla están en metros a escala; el disco, el lanzador y las flechas no.
// Ventana fija de J.escena.ventana m: si el disco pasa de SEGUIR, la cámara lo sigue y la regla se desplaza.
const ES = J.escena;
const M = 10;                                    // unidades por metro
const XL = 3.0;                                  // m de pista a la izquierda del punto donde se suelta (lanzador)
const XR = ES.ventana;                           // m visibles a la derecha
const X0 = -XL * M, X1 = XR * M;
const SEGUIR = 0.6 * XR;                         // desde aquí la cámara sigue al disco
const ZT = 1.4;                                  // alto de la pista sobre la mesa
const RD = 4.5, HD = 2.2;                          // disco
const SC = 10;                                    // tramo de contacto con el resorte (dibujo)
const KV = 2.4, KF = 90;                         // escala propia de las flechas: unidades por m/s y por unidad de μ
const PISTA = { x: X0, y: -9, w: X1 + 3 - X0, d: 18, r: 1.5 };
const PLACA = { x: X0 - 8, y: -17, w: X1 + 3 - X0 + 16, d: 38, r: 6 }, PLACA_H = 6, PATA_H = 5;
const REGLA = { y0: 11, y1: 17, z: 0.8 };
const LAN = { bx: -27, bw: 2, cara0: -SC - RD, cara1: -RD, grueso: 1.2, alto: 6, ancho: 8, poste: 7, rp: 0.8, eje: 12, zr: ZT + 3, rr: 2, vueltas: 7 };
const ZA = ZT + HD + 4;                          // altura de las flechas

const W = 640, H = 240;
const P = k.fitProjection(
  [...k.boxCorners(PLACA, -PLACA_H - PATA_H, 0), [X0, -9, ZT + 20], [X1, -9, ZT + 20]],
  W, H, { pad: 8, azimuth: 78, elevation: 24 },
);
const at = (p) => k.iso(p, P);
const S = (paths, o) => k.solidSvg(paths, o);
const L = (d, o) => k.lineSvg(d, o);
const D = (pts, o) => k.dotsSvg(pts, o);
const prof = (c) => k.depthOf([c[0], c[1], 0], P);
const fx = (v) => Math.round(v * 10) / 10;

// Ventana de recorte: todo lo que se desplaza con la cámara se corta en los extremos de la pista.
function envolvente(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo = [], arriba = [];
  for (const p of pts) { while (abajo.length > 1 && cruz(abajo[abajo.length - 2], abajo[abajo.length - 1], p) <= 0) abajo.pop(); abajo.push(p); }
  for (const p of pts.reverse()) { while (arriba.length > 1 && cruz(arriba[arriba.length - 2], arriba[arriba.length - 1], p) <= 0) arriba.pop(); arriba.push(p); }
  return abajo.slice(0, -1).concat(arriba.slice(0, -1));
}
const VENTANA = envolvente(k.boxCorners({ x: X0, y: -60, w: X1 + 2 - X0, d: 120 }, -30, 60).map(at));
const CLIP = `<defs><clipPath id="ventana-nl"><path d="${k.pathOf(VENTANA, true)}"/></clipPath></defs>`;
const recorte = (s) => `<g clip-path="url(#ventana-nl)">${s}</g>`;

// ---------- Vista: estado → atributos de los elementos que cambian ----------
// Se usa igual en el navegador (cada cuadro) y aquí (figura fija). K son las funciones del kit.
function vista(C, K, s, J) {
  const P = C.P, M = C.M, g = J.valoresIniciales.g, RG = J.rangos;
  const num = (v, dec = 2) => {
    const r = Math.round(v * 10 ** dec) / 10 ** dec;
    let [i, d] = Math.abs(r).toFixed(dec).split(".");
    d = (d || "").replace(/0+$/, "");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
    return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
  };
  const tpl = (t, o) => t.replace(/\{(\w+)\}/g, (m, q) => (q in o ? o[q] : m));
  const a = s.mu * g, tA = a > 0 ? s.v0 / a : Infinity, dT = a > 0 ? s.v0 * s.v0 / (2 * a) : Infinity;
  const pos = (t) => { if (a > 0) t = Math.min(t, tA); return s.v0 * t - a * t * t / 2; };
  const vel = (t) => Math.max(0, s.v0 - a * t);
  const suelto = s.fase === "desliza" || s.fase === "parado" || s.fase === "fuera";
  const camU = s.cam * M;
  const m = {};
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const iso = (p) => K.iso(p, P);

  // Disco, lanzador y émbolo
  const xr = s.fase === "listo" ? -C.SC : s.fase === "contacto" ? -C.SC + C.SC * s.tau * s.tau : pos(s.t) * M;
  const xu = suelto ? xr - camU : xr;
  m["disco"] = { transform: K.translateAlong(P, [xu, 0, 0]), _v: xu > C.X0 - C.RD * 3 && xu < C.X1 + C.RD * 3 };
  const cara = s.fase === "listo" ? C.LAN.cara0 : s.fase === "contacto" ? C.LAN.cara0 + C.SC * s.tau * s.tau : C.LAN.cara1;
  const lan = K.translateAlong(P, [-camU, 0, 0]), visLan = C.LAN.bx - camU > C.X0 - 30;
  m["lanzador"] = { transform: lan, _v: visLan };
  m["lanzador-b"] = { transform: lan, _v: visLan };
  const emb = K.translateAlong(P, [cara - C.LAN.cara0, 0, 0]);
  m["embolo-eje"] = { transform: emb }; m["embolo-cabeza"] = { transform: emb };
  const res = K.coil(C.LAN.bx + C.LAN.bw, cara - C.LAN.grueso, [0, C.LAN.zr], C.LAN.rr, C.LAN.vueltas, "x", P);
  m["res-a"] = { d: res.back }; m["res-b"] = { d: res.front };

  // Tramo de fricción (empieza donde se suelta el disco) y su textura: más puntos con más μ
  const t0 = Math.max(C.X0, -camU), t1 = C.X1 + 3;
  m["tramo"] = { d: K.onTop([[t0, -9], [t1, -9], [t1, 9], [t0, 9]], C.ZT, P, true), class: s.mu > 0 ? "tramo" : "tramo hielo",
    "fill-opacity": s.mu > 0 ? (0.05 + 0.16 * s.mu / RG.mu.max).toFixed(3) : "0.3" };
  let tex = "";
  if (s.mu > 0) {
    const n = 6 * s.mu / RG.mu.max, h = (i, j) => { const q = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return q - Math.floor(q); };
    for (let j = 0; j < 6; j++) {
      for (let i = Math.max(0, Math.floor((s.cam + C.X0 / M) * n)); i <= (s.cam + C.XR) * n + 1; i++) {
        const xm = (i + h(i, j)) / n, u = (xm - s.cam) * M;
        if (u < Math.max(C.X0, -camU) + 0.5 || u > C.X1 + 2) continue;
        const p = iso([u, -7.5 + j * 3 + (h(j, i) - 0.5) * 2, C.ZT]);
        tex += `M${pt(p)}h.01`;
      }
    }
  }
  m["textura"] = { d: tex };

  // Regla: etiquetas cada 1, 5 o 10 m según el recorrido; marcas menores cada quinto
  const dRef = a > 0 ? dT : s.v0 * J.escena.duracionMax + C.XR;
  const LL = dRef <= 16 ? 1 : dRef <= 45 ? 5 : 10, men = LL / 5;
  let tkM = "", tkm = ""; const etq = [];
  for (let i = Math.max(0, Math.ceil((s.cam + C.X0 / M) / men)); i * men <= s.cam + C.XR + 1e-9; i++) {
    const u = (i * men - s.cam) * M;
    if (u < C.X0 + 3 || u > C.X1) continue;
    const mayor = i % 5 === 0;
    const dd = K.onTop([[u, C.REGLA.y0], [u, C.REGLA.y0 + (mayor ? 3.6 : 1.8)]], C.REGLA.z, P);
    if (mayor) { tkM += dd; etq.push([u, i * men]); } else tkm += dd;
  }
  m["tk-mayor"] = { d: tkM }; m["tk-menor"] = { d: tkm };
  for (let i = 0; i < C.NETQ; i++) {
    const e = etq[i];
    if (!e) { m["tr" + i] = { _v: false }; continue; }
    const p = iso([e[0], C.REGLA.y1, 0]);
    m["tr" + i] = { _v: true, x: p[0].toFixed(1), y: (p[1] + 10).toFixed(1), _t: num(e[1]) + (e[1] === 0 ? " m" : "") };
  }

  // Marcas estroboscópicas: una cada dt s de tiempo real; la previa (tenue) muestra todo el recorrido
  const marcas = (hasta) => {
    let dd = "", vis = [];
    const dt = J.escena.dt;
    for (let i = 0; i <= 4000; i++) {
      const tk = i * dt;
      if (tk > hasta + 1e-9 || (a > 0 && tk > tA + 1e-9)) break;
      const u = pos(tk) * M - camU;
      if (u > C.X1 + 2) break;
      if (u < C.X0) continue;
      dd += K.ring(u, 0, 1.1, C.ZT, P, 10); vis.push(u);
    }
    return [dd, vis];
  };
  const [dm, vm] = suelto ? marcas(s.t) : ["", []];
  const verPrevia = s.revelado && !s.recorrido;
  const [dp, vp] = verPrevia ? marcas(a > 0 ? tA : 1e4) : ["", []];
  m["marcas"] = { d: dm }; m["previa"] = { d: dp };

  // Banderín donde se detiene, o aviso en el borde si queda fuera de la vista
  const ud = a > 0 ? dT * M - camU : Infinity;
  m["tope-d"] = { _v: verPrevia && a > 0 && ud >= C.X0 + 2 && ud <= C.X1, transform: K.translateAlong(P, [isFinite(ud) ? ud : 0, 0, 0]) };
  m["t-d"] = { _t: a > 0 ? tpl(J.figura.d, { d: num(dT) }) : "" };
  const pb = iso([C.X1 - 1, -9, C.ZT + 9]);
  m["t-borde"] = { _v: verPrevia && (a === 0 || ud > C.X1), x: pb[0].toFixed(1), y: pb[1].toFixed(1),
    _t: (a > 0 ? tpl(J.figura.d, { d: num(dT) }) : J.figura.sinFin) + " →" };
  const pc = iso([C.X1 - 1, -9, C.ZT + 17]);
  m["t-cam"] = { _v: (s.fase === "contacto" || s.fase === "desliza") && s.N > 1, x: pc[0].toFixed(1), y: pc[1].toFixed(1), _t: tpl(J.figura.camara, { n: s.N }) };

  // Fantasma de la trampa: lo empuja el resorte y se queda donde lo suelta
  const xg = (suelto ? 0 : xr) - (suelto ? camU : 0);
  m["fantasma"] = { _v: s.trampa, d: K.ring(xg, 0, C.RD, C.ZT, P, 28) + K.ring(xg, 0, C.RD, C.ZT + C.HD, P, 28) };
  const pf = iso([Math.max(xg, C.X0 + 2), 0, C.ZT + C.HD + 15]);
  m["fant-t"] = { _v: s.trampa, x: pf[0].toFixed(1), y: pf[1].toFixed(1) };
  m["fant-1"] = { x: pf[0].toFixed(1), _t: J.figura.fantasma };
  m["fant-2"] = { x: pf[0].toFixed(1), _t: a > 0 ? tpl(J.figura.realFrena, { d: num(dT) }) : tpl(J.figura.realSigue, { v0: num(s.v0) }) };

  // Flechas: empuje (solo en contacto), velocidad y fricción (solo mientras desliza)
  const flecha = (id, p0, p1, texto, lado, ver, punta = false) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    if (!ver || l < 2) { m[id] = { _v: false }; return; }
    const ux = dx / l, uy = dy / l, cab = Math.min(9, l * 0.6), an = cab * 0.5, bx = p1[0] - ux * cab, by = p1[1] - uy * cab;
    const nx = -uy * lado, ny = ux * lado;
    m[id] = { _v: true };
    m[id + "-l"] = { x1: p0[0].toFixed(1), y1: p0[1].toFixed(1), x2: (bx + ux).toFixed(1), y2: (by + uy).toFixed(1) };
    m[id + "-p"] = { points: `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${(bx - uy * an).toFixed(1)},${(by + ux * an).toFixed(1)} ${(bx + uy * an).toFixed(1)},${(by - ux * an).toFixed(1)}` };
    m[id + "-t"] = punta   // texto más allá de la punta (flechas horizontales que comparten altura)
      ? { x: (p1[0] + ux * 5).toFixed(1), y: (p1[1] + uy * 5 + 4.5).toFixed(1), "text-anchor": ux > 0 ? "start" : "end", _t: texto }
      : { x: (p0[0] + dx * 0.5 + nx * 11).toFixed(1), y: (p0[1] + dy * 0.5 + ny * 11 + 4).toFixed(1),
        "text-anchor": Math.abs(nx) < 0.3 ? "middle" : nx > 0 ? "start" : "end", _t: texto };
  };
  const enVista = xu > C.X0 && xu < C.X1;
  const v = suelto ? vel(s.t) : 0, mueve = s.fase === "desliza" && v > 1e-6 && enVista;
  const F0 = iso([xu - C.RD - 10, 0, C.ZA]), F1 = iso([xu + 1, 0, C.ZA]);
  flecha("fl-F", F0, F1, J.figura.empuje, -1, s.fase === "contacto", true);
  const V0 = iso([xu, 0, C.ZA]), V1 = iso([xu + C.KV * v, 0, C.ZA]);
  flecha("fl-v", V0, V1, tpl(J.figura.v, { v: num(v, 1) }), -1, mueve, true);
  const f0 = iso([xu - 1, 0, C.ZA]), f1 = iso([xu - 1 - C.KF * s.mu, 0, C.ZA]);
  flecha("fl-f", f0, f1, J.figura.f, 1, mueve && s.mu > 0, true);
  const pz = iso([xu - 3, 0, C.ZA]);
  m["t-f0"] = { _v: mueve && s.mu === 0, x: pz[0].toFixed(1), y: (pz[1] + 4).toFixed(1), _t: J.figura.f0 };

  // Rótulos
  const rot = (n, p, ver = true) => { m["rot-" + n] = { _v: ver, transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` }; };
  const mas = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  rot("01", mas(iso([C.LAN.bx + 1 - camU, -8, C.ZT + 7.6]), -4, -12), C.LAN.bx - camU > C.X0 - 4);
  rot("02", mas(iso([xu + C.RD, C.RD, C.ZT]), 9, 9), enVista || s.fase === "listo" || s.fase === "contacto");
  rot("03", mas(iso([Math.max(-camU, C.X0) + 6, -9, C.ZT]), 0, -12), -camU > C.X0 - 4);
  rot("04", mas(iso([C.X0 + 9, C.REGLA.y1, 0]), 0, 12));
  const vv = vm.length > 2 ? vm : vp;
  const um = vv.length ? vv[Math.floor(vv.length * 0.45)] : 0;
  rot("05", mas(iso([um, -2.5, C.ZT]), 0, -13), vv.length > 2);
  const medio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let p6 = mas(s.mu > 0 ? medio(f0, f1) : pz, s.mu > 0 ? 0 : -14, -14), p7 = mas(medio(V0, V1), 0, -14);
  if (p7[0] - p6[0] < 19) { const e = (19 - (p7[0] - p6[0])) / 2; p6 = mas(p6, -e, 0); p7 = mas(p7, e, 0); }
  rot("06", p6, mueve);
  rot("07", p7, mueve);
  rot("08", mas(iso([xg, -C.RD, C.ZT + C.HD]), -13, -8), s.trampa && suelto && xg > C.X0 + 4);
  rot("09", mas([(F0[0] + F1[0]) / 2, (F0[1] + F1[1]) / 2], 0, -13), s.fase === "contacto");
  return m;
}

// ---------- Piezas fijas ----------
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
  // Placa de datos grabada al frente
  const pl = { x: X1 - 58, y: -16.2, w: 56, d: 2.6, r: 0.6 };
  o.push(S(k.slabOf(pl, 0, 0.4, P, 3), { tone: "lo", crease: "none" }));
  o.push(k.faceTextSvg(k.topMatrix([pl.x + 3, pl.y + 2], 0.4, P, "x"), `PRIMERA LEY · INERCIA · g = ${J.valoresIniciales.g} m/s²`, { size: 1.7, tone: "lo" }));
  o.push(D([at([pl.x + 1.4, pl.y + 1.3, 0.4]), at([pl.x + pl.w - 1.4, pl.y + 1.3, 0.4])], { size: 0.4 }));
  return o.join("");
}

function reglaBase() {
  return S(k.slabOf({ x: X0 + 2, y: REGLA.y0, w: X1 - X0 - 1, d: REGLA.y1 - REGLA.y0, r: 0.8 }, 0, REGLA.z, P, 3), { tone: "hi", crease: "none" })
    + L(k.lineOnTop([X0 + 3, REGLA.y0 + 4.6], [X1, REGLA.y0 + 4.6], REGLA.z, P), { tone: "faint" });
}

function pista() {
  const o = [S(k.slabOf(PISTA, 0, ZT, P, 4, 0.3), { tone: "mid" })];
  // Bordes guía a lo largo de la pista
  o.push(L(k.lineOnTop([X0 + 1, -8.2], [X1 + 2, -8.2], ZT, P) + k.lineOnTop([X0 + 1, 8.2], [X1 + 2, 8.2], ZT, P), { tone: "faint" }));
  return o.join("");
}

// Lanzador de resorte: placa trasera, riel, resorte, émbolo y dos topes (el delantero se dibuja después del disco)
function lanzadorA(m) {
  const o = [];
  o.push(L(k.lineOnTop([LAN.bx - 1, -2.4], [LAN.cara1 - 0.6, -2.4], ZT, P) + k.lineOnTop([LAN.bx - 1, 2.4], [LAN.cara1 - 0.6, 2.4], ZT, P), { tone: "lo" }));
  const placaT = { x: LAN.bx, y: -8, w: LAN.bw, d: 16, r: 0.4 };
  o.push(S(k.slabOf(placaT, ZT, 7.6, P, 3, 0.2), { tone: "mid" }));
  o.push(D([at([LAN.bx + 1, -6, ZT + 7.6]), at([LAN.bx + 1, 6, ZT + 7.6])], { size: 0.5 }));
  o.push(S(k.cylinder(LAN.bx - 1.6, 0, 1.1, ZT, 0.8, P, 16), { tone: "lo" }));
  o.push(E("path", "res-a", { class: "resorte atras" }, m));
  o.push(E("g", "embolo-eje", {}, m, S(k.slabOf({ x: LAN.cara0 - LAN.grueso - LAN.eje, y: -0.6, w: LAN.eje, d: 1.2, r: 0.4 }, LAN.zr - 0.6, 1.2, P, 3), { tone: "hi", crease: "none" })));
  o.push(E("path", "res-b", { class: "resorte" }, m));
  const cab = { x: LAN.cara0 - LAN.grueso, y: -LAN.ancho, w: LAN.grueso, d: 2 * LAN.ancho, r: 0.4 };
  o.push(E("g", "embolo-cabeza", {}, m, S(k.slabOf(cab, ZT + 0.3, LAN.alto, P, 3, 0.2), { tone: "mid" })
    + L(k.lineOnTop([cab.x + cab.w, -LAN.ancho + 1], [cab.x + cab.w, LAN.ancho - 1], ZT + 0.3 + LAN.alto, P), { tone: "faint" })));
  o.push(S(k.cylinder(LAN.cara1 + LAN.rp, -LAN.poste, LAN.rp, ZT, 4, P, 16, 0.2), { tone: "mid" }));
  return E("g", "lanzador", { "data-parte": "01" }, m, o.join(""));
}
const lanzadorB = (m) => E("g", "lanzador-b", { "data-parte": "01" }, m, S(k.cylinder(LAN.cara1 + LAN.rp, LAN.poste, LAN.rp, ZT, 4, P, 16, 0.2), { tone: "mid" }));

// Disco: cilindro bajo con anillo y centro marcados; se dibuja donde se suelta y la página lo traslada
const disco = (m) => E("g", "disco", { "data-parte": "02" }, m,
  S(k.cylinder(0, 0, RD, ZT, HD, P, 40, 0.3), { tone: "hi", lit: true })
  + L(k.ring(0, 0, RD * 0.62, ZT + HD, P, 28), { tone: "lo" }) + D([at([0, 0, ZT + HD])], { size: 0.6 }));

// Banderín donde se detiene
function topeD(m) {
  const o = [L(k.ring(0, 0, 2.6, ZT, P, 20), { tone: "mid" }), S(k.cylinder(0, 0, 0.5, ZT, 16, P, 10), { tone: "hi", crease: "none" })];
  const a = at([0, 0, ZT + 16]), b = at([0, 0, ZT + 11]), c = at([7, 0, ZT + 13.5]);
  o.push(`<polygon class="banderin" points="${fx(a[0])},${fx(a[1])} ${fx(b[0])},${fx(b[1])} ${fx(c[0])},${fx(c[1])}"/>`);
  const t = at([0, 0, ZT + 19]);
  o.push(E("text", "t-d", { class: "t-d", x: fx(t[0]), y: fx(t[1]), "text-anchor": "middle" }, m));
  return E("g", "tope-d", { "data-parte": "04" }, m, o.join(""));
}

const flecha = (id, cls, parte, m) => E("g", id, { class: `flecha ${cls}`, "data-parte": parte }, m,
  E("line", id + "-l", {}, m) + E("polygon", id + "-p", {}, m) + E("text", id + "-t", { class: "t-vel" }, m));

// ---------- Esqueleto de la figura: cada elemento que cambia toma sus atributos de la vista ----------
const ROT = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];
const NETQ = 24;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function E(tag, id, attrs, m, inner = "") {
  const v = (m && m[id]) || {}, a = { id, ...attrs };
  for (const [q, x] of Object.entries(v)) if (q[0] !== "_") a[q] = x;
  if (v._v === false) a.style = "display:none";
  const txt = "_t" in v ? esc(v._t) : inner;
  return `<${tag}${Object.entries(a).map(([q, x]) => ` ${q}="${esc(x)}"`).join("")}>${txt}</${tag}>`;
}
function cuerpo(m) {
  return [
    CLIP, placa(),
    `<g data-parte="04">${reglaBase()}${recorte(E("path", "tk-menor", { class: "tk menor" }, m) + E("path", "tk-mayor", { class: "tk mayor" }, m)
      + Array.from({ length: NETQ }, (_, i) => E("text", "tr" + i, { class: "t-regla", "text-anchor": "middle" }, m)).join(""))}</g>`,
    pista(),
    recorte(`<g data-parte="03">${E("path", "tramo", {}, m)}${E("path", "textura", { class: "textura" }, m)}</g>`
      + `<g data-parte="05">${E("path", "previa", { class: "previa" }, m)}${E("path", "marcas", { class: "marcas" }, m)}</g>`
      + lanzadorA(m) + `<g data-parte="08">${E("path", "fantasma", { class: "fantasma" }, m)}</g>` + disco(m) + lanzadorB(m) + topeD(m)
      + flecha("fl-f", "fl-f", "06", m) + E("text", "t-f0", { class: "t-vel t-f0", "text-anchor": "end", "data-parte": "06" }, m)
      + flecha("fl-v", "fl-v", "07", m) + flecha("fl-F", "fl-F", "09", m)),
    E("text", "t-borde", { class: "t-borde", "text-anchor": "end", "data-parte": "04" }, m),
    E("text", "fant-t", { class: "t-trampa", "data-parte": "08" }, m, E("tspan", "fant-1", {}, m) + E("tspan", "fant-2", { dy: 14 }, m)),
    E("text", "t-cam", { class: "t-cam", "text-anchor": "end" }, m),
    `<g id="rot">${ROT.map((n) => E("g", "rot-" + n, { class: "rot", "data-n": n, "aria-hidden": "true" }, m, `<circle r="8.5"/><text y="0.4">${n}</text>`)).join("")}</g>`,
  ];
}

const CFG = { P, M, X0, X1, XL, XR, SEGUIR, ZT, RD, HD, SC, KV, KF, ZA, REGLA, LAN, NETQ, ROT };
const V = J.valoresIniciales;
const estado0 = { v0: V.v0, mu: V.mu, fase: "listo", tau: 0, t: 0, cam: 0, revelado: false, trampa: false, recorrido: false, N: 1 };
const figura = k.figureSvg({ width: W, height: H, label: J.figura.aria, body: cuerpo(vista(CFG, k, estado0, J)) });

// ---------- Lógica de la página (se serializa tal cual; usa las funciones del kit y vista) ----------
function pagina(C) {
(async () => {
const $ = (s) => document.querySelector(s);
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const K = { iso, ring, onTop, translateAlong, coil };

async function cargar(){
  try {
    const r = await fetch("../../../../contenido/fisica/leyes-de-newton-1-interactivo.json", {cache:"no-cache"});
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
catch (e) { $("#nota").textContent = "No se pudo leer contenido/fisica/leyes-de-newton-1-interactivo.json. Abre la página con npx serve, no como archivo."; return; }

// ---------- Números (todos salen del JSON o de una fórmula) ----------
const V = J.valoresIniciales, RG = J.rangos, ES = J.escena, g = V.g;
const num = (v, dec = 2) => {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return (r < 0 ? "−" : "") + i + (d ? "." + d : "");
};
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const frena = (v0, mu) => { const a = mu * g; return { v0, mu, a, t: a > 0 ? v0 / a : Infinity, d: a > 0 ? v0 * v0 / (2 * a) : Infinity }; };
const CONTACTO = 0.45;   // s de pantalla que dura el empujón del resorte (dibujo, no física)

let v0 = V.v0, mu = V.mu, fase = "listo", tau = 0, t = 0, cam = 0, camFija = false, N = 1;
let revelado = false, trampaOn = false, sel = null, enRecorrido = false;
const F = () => frena(v0, mu);
const pos = (tt, f = F()) => { const u = Math.min(tt, f.t); return v0 * u - f.a * u * u / 2; };
const velo = (tt, f = F()) => Math.max(0, v0 - f.a * tt);
const factor = () => { const f = F(); return f.a > 0 ? Math.max(1, Math.ceil(f.t / ES.duracionMax)) : 1; };

const svg = $(".iso-svg"), stage = $(".iso-stage"), sV0 = $("#s-v0"), sMu = $("#s-mu"), bPri = $("#empujar"), bTrampa = $("#trampa"),
  bExamen = $("#examen"), nota = $("#nota");

$("#titulo").textContent = J.titulo;
$("#subtitulo").textContent = J.subtitulo + " · Física · Examen de admisión UNAM";
$(".iso-plate-corner[data-corner=hint]").textContent = J.instruccion;
$("#etq-d").textContent = J.lecturas.distancia;
$("#l-v0").innerHTML = J.controles.v0 + ", v<sub>0</sub>";
$("#l-mu").textContent = J.controles.mu;
$("#pred-t").textContent = J.prediccion.titulo;
bTrampa.textContent = J.controles.trampa; bExamen.textContent = J.controles.examen;
sV0.min = RG.v0.min; sV0.max = RG.v0.max; sV0.step = RG.v0.paso; sV0.value = v0;
sMu.min = RG.mu.min; sMu.max = RG.mu.max; sMu.step = RG.mu.paso; sMu.value = mu;
stage.setAttribute("aria-valuemin", RG.mu.min); stage.setAttribute("aria-valuemax", RG.mu.max);
stage.setAttribute("aria-label", "Pista: flechas izquierda y derecha cambian la fricción; arriba y abajo, la rapidez inicial");

// ---------- Rótulos y fichas ----------
const FICHAS = {
  "01": ["Lanzador de resorte", () => `El resorte comprimido empuja el disco solo mientras lo toca, hasta que el émbolo choca con los topes. Ahí lo suelta a ${num(v0)} m/s y el disco sigue por su cuenta.`],
  "02": ["Disco", () => `Su masa no cambia la cuenta: la fricción (μ·m·g) y la inercia crecen igual con m, así que a = μ × g = ${num(mu)} × ${num(g)} = ${num(F().a)} m/s².`],
  "03": ["Tramo de fricción", () => mu > 0 ? `μ = ${num(mu)}. Más puntos, más rugoso. Empieza donde el resorte suelta el disco; la parte del lanzador es lisa.` : "μ = 0: como hielo perfecto. Nada frena al disco."],
  "04": ["Regla", () => { const f = F(); return `Mide en metros desde donde se suelta el disco. Si el disco sale de la vista, la regla se desplaza con él y la barra de abajo muestra todo el recorrido.` + (revelado ? (f.a > 0 ? ` Se detiene en d = ${num(v0)}² ÷ (2 × ${num(f.a)}) = ${num(f.d)} m.` : " Con μ = 0 no hay banderín: no se detiene.") : ""); }],
  "05": ["Marcas estroboscópicas", () => `Una marca cada ${num(ES.dt)} s de tiempo real, aunque la animación vaya en cámara rápida. Igual de separadas: velocidad constante. Cada vez más juntas: se frena.`],
  "06": ["Fricción, f", () => mu > 0 ? `f = μ·m·g apunta hacia atrás y es la única fuerza horizontal: frena al disco a = ${num(mu)} × ${num(g)} = ${num(F().a)} m/s². Cuando se detiene, desaparece.` : "Con μ = 0, f = 0: la fuerza neta es cero y la velocidad no cambia."],
  "07": ["Velocidad, v", () => "La flecha mide la rapidez. Solo se acorta si una fuerza lo frena; con μ = 0 mide lo mismo todo el camino."],
  "08": ["Fantasma", () => "Lo que pasaría si moverse necesitara una fuerza: al soltarlo se detendría aunque μ = 0. No pasa. " + J.lecturas.mensaje],
  "09": ["Empuje del resorte", () => `Existe solo mientras el resorte toca el disco y cambia su velocidad de 0 a ${num(v0)} m/s. Al soltarlo desaparece y el disco sigue sin él: la fuerza cambia el movimiento, no lo mantiene.`]
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
C.ROT.forEach(n => {
  const b = document.createElement("button"); b.type = "button"; b.className = "rot-b"; b.dataset.n = n;
  b.setAttribute("aria-pressed", "false"); b.innerHTML = `<b>${n}</b>${FICHAS[n][0]}`;
  b.addEventListener("click", () => seleccionar(n)); $("#rotulos").append(b);
  $("#rot-" + n).addEventListener("click", (e) => { e.stopPropagation(); seleccionar(n); });
});

// ---------- Mensajes ----------
const decir = (s) => { if (!enRecorrido) nota.textContent = s; };

// ---------- Dibujo que cambia: la vista da los atributos; solo se escriben los que cambian ----------
const previo = new Map();
function aplicar(m){
  for (const id in m){
    const e = document.getElementById(id); if (!e) continue;
    const v = m[id];
    for (const q in v){
      const val = q === "_v" ? (v[q] ? "" : "none") : String(v[q]), clave = id + "|" + q;
      if (previo.get(clave) === val) continue; previo.set(clave, val);
      if (q === "_v") e.style.display = val; else if (q === "_t") e.textContent = val; else e.setAttribute(q, val);
    }
  }
}
const estado = () => ({ v0, mu, fase, tau, t, cam, revelado, trampa: trampaOn, recorrido: enRecorrido, N });

function render(){
  const f = F(), suelto = fase === "desliza" || fase === "parado" || fase === "fuera", rv = revelado && !enRecorrido;
  aplicar(vista(C, K, estado(), J));
  const x = suelto ? pos(t, f) : 0, v = suelto ? velo(t, f) : 0, tt = suelto ? Math.min(t, f.t) : 0;
  // Panel
  const L = J.lecturas, n = { mu: num(mu), g: num(g), a: num(f.a), v0: num(v0), tAlto: num(f.t), d: num(f.d) };
  $("#o-d").textContent = rv ? (f.a > 0 ? `${num(f.d)} m` : "∞") : "?";
  $("#o-formula").innerHTML = rv ? (f.a > 0 ? tpl(L.distanciaValor, n) : tpl(L.sinFriccion, n)) : "Elige tu predicción o empuja para verla.";
  $("#o-v0").textContent = tpl(J.controles.valorV0, {v:num(v0)});
  $("#o-mu").textContent = tpl(J.controles.valorMu, {v:num(mu)});
  sV0.style.setProperty("--p", (100 * (v0 - RG.v0.min) / (RG.v0.max - RG.v0.min)) + "%");
  sMu.style.setProperty("--p", (100 * (mu - RG.mu.min) / (RG.mu.max - RG.mu.min)) + "%");
  if (+sV0.value !== v0) sV0.value = v0;
  if (+sMu.value !== mu) sMu.value = mu;
  sV0.setAttribute("aria-valuetext", tpl(J.controles.valorV0, {v:num(v0)}) + (rv && f.a > 0 ? `, se detiene a ${num(f.d)} m` : ""));
  sMu.setAttribute("aria-valuetext", tpl(J.controles.valorMu, {v:num(mu)}) + `, frenado ${num(f.a)} m/s²`);
  $("#o-a").textContent = `${num(f.a)} m/s²`;
  $("#o-t").textContent = rv ? (f.a > 0 ? `${num(f.t)} s` : "∞") : "?";
  $("#o-v").textContent = `${num(v, 1)} m/s`;
  const lect = `t ${num(tt, 1)} s · x ${num(x, 1)} m · v ${num(v, 1)} m/s`;
  const rd0 = $("[data-readout]"); if (rd0.textContent !== lect) rd0.textContent = lect;
  stage.setAttribute("aria-valuenow", mu);
  stage.setAttribute("aria-valuetext", `μ = ${num(mu)}, v₀ = ${num(v0)} m/s` + (suelto ? `, x = ${num(x, 1)} m, v = ${num(v, 1)} m/s` : ""));
  bPri.textContent = fase === "listo" ? J.controles.empujar : J.controles.reiniciar;
  // Barra de recorrido: 0 → d (o ∞), con la ventana visible y el disco
  const fin = rv && f.a > 0 ? f.d : Math.max(cam + C.XR, x), escala = Math.max(C.XR, fin) * (rv && f.a === 0 ? 1.15 : 1);
  const pc = (q) => Math.max(0, Math.min(100, 100 * q / escala)).toFixed(2) + "%";
  const ven = $("#mb-ven"); ven.style.left = pc(cam); ven.style.width = pc(Math.min(C.XR, escala - cam));
  $("#mb-dot").style.left = pc(Math.max(0, x));
  $("#mb-fin").textContent = rv ? (f.a > 0 ? `${num(f.d)} m` : "∞") : "?";
  // Profundizar
  const nl = L.numerales;
  const filas = [
    [L.frenado, tpl(L.frenadoValor, n)],
    [L.alto, f.a > 0 ? tpl(L.altoValor, n) : "nunca: a = 0"],
    [L.distancia, f.a > 0 ? tpl(L.distanciaValor, n) : tpl(L.sinFriccion, n)],
    ["La trampa", L.trampa + `<br><span class="et">${L.mensaje}</span>`]
  ];
  $("#lecturas").innerHTML = filas.map((q, i) => `<li><span class="nl">${nl[i]}</span><span class="et">${q[0]}</span><span class="va">${q[1]}</span></li>`).join("");
  if (sel) pintarFicha();
}

// ---------- Movimiento (solo mientras algo se mueve) ----------
let anim = 0;
function avanzar(dt, hasta){
  if (fase === "contacto"){
    tau = Math.min(1, tau + dt / CONTACTO);
    if (tau >= 1){ fase = "desliza"; t = 0; decir("Suelta: ya nada lo empuja hacia adelante." + (mu > 0 ? " Solo actúa la fricción, hacia atrás." : " Y con μ = 0, nada lo frena.")); }
    return true;
  }
  if (fase !== "desliza") return false;
  const f = F();
  t = Math.min(t + dt * N, hasta, f.t);
  const x = pos(t, f);
  if (!camFija) cam = Math.max(0, x - C.SEGUIR);
  if (f.a > 0 && t >= f.t - 1e-9){ fase = "parado"; return false; }
  if (t >= hasta - 1e-9) return false;
  if (f.a === 0){
    if (t >= ES.duracionMax) camFija = true;
    if ((x - cam) * C.M > C.X1 + C.RD + 4){ fase = "fuera"; return false; }
  }
  return true;
}
function terminar(){
  if (enRecorrido || (fase !== "parado" && fase !== "fuera")) return;
  revelado = true; const f = F();
  if (fase === "parado") decir(`Se detuvo en ${num(f.t)} s, después de ${num(f.d)} m: lo frenó la fricción (a = ${num(f.a)} m/s²), no se le «acabó» el empuje.`);
  else decir(tpl(J.lecturas.sinFriccion, {v0:num(v0)}));
}
let pendiente = null;   // corrida interrumpida por salir de pantalla: se retoma al volver
function correr(hasta = Infinity, fin = null){
  cancelAnimationFrame(anim); pendiente = { hasta, fin };
  if (quieto){
    const f = F(); fase = "desliza"; tau = 1;
    if (f.a > 0){ t = Math.min(hasta, f.t); if (t >= f.t) fase = "parado"; }
    else { t = Math.min(hasta, ES.duracionMax); if (t >= ES.duracionMax) fase = "fuera"; }
    cam = Math.max(0, pos(t, f) - C.SEGUIR); pendiente = null; terminar(); render(); if (fin) fin(); return;
  }
  let antes = performance.now();
  const paso = (ahora) => {
    const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
    const sigue = avanzar(dt, hasta); render();
    if (sigue) anim = requestAnimationFrame(paso); else { anim = 0; pendiente = null; terminar(); render(); if (fin) fin(); }
  };
  render(); anim = requestAnimationFrame(paso);
}
function nuevo(){ cancelAnimationFrame(anim); anim = 0; pendiente = null; fase = "listo"; tau = 0; t = 0; cam = 0; camFija = false; }
function empujar(hasta, fin){
  nuevo(); N = factor(); fase = "contacto";
  decir(`El resorte empuja: su fuerza cambia la velocidad del disco de 0 a ${num(v0)} m/s.`);
  correr(hasta, fin);
}
function principal(){
  if (fase === "listo") empujar();
  else { nuevo(); decir(""); render(); }
}

// ---------- Recorrido automático: empuja y deja deslizar sin llegar al alto; se detiene al tocar y retoma a los 6 s ----------
const REC = [[V.v0, V.mu], [RG.v0.max, RG.mu.paso], [RG.v0.min + 2 * RG.v0.paso, RG.mu.max], [RG.v0.max - 2 * RG.v0.paso, RG.mu.max - RG.mu.paso]]
  .filter(([a, b]) => b > 0 && a >= RG.v0.min && a <= RG.v0.max);
let tRec = 0, iRec = 0;
function pasoRecorrido(){
  if (!enRecorrido) return;
  [v0, mu] = REC[iRec % REC.length]; iRec++;
  nuevo(); render();
  tRec = setTimeout(() => { if (enRecorrido) empujar(0.45 * F().t, () => { tRec = setTimeout(pasoRecorrido, 1100); }); }, 500);
}
function iniciarRecorrido(){ if (quieto || enRecorrido) return;
  if (anim){ tRec = setTimeout(iniciarRecorrido, 6000); return; }   // no interrumpe una corrida del usuario
  enRecorrido = true; nota.textContent = ""; pasoRecorrido();
}
function tomarControl(){
  if (enRecorrido){ enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(anim); anim = 0; pendiente = null; render(); }
  clearTimeout(tRec); tRec = setTimeout(iniciarRecorrido, 6000);
}
const lab = $(".lab");
["pointerdown", "keydown", "wheel"].forEach(ev => lab.addEventListener(ev, tomarControl, {capture:true, passive:true}));
lab.addEventListener("focusin", tomarControl);
let visible = false;
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (!visible && enRecorrido) tomarControl(); if (!visible && anim){ cancelAnimationFrame(anim); anim = 0; }
  if (visible && !anim && pendiente && (fase === "contacto" || fase === "desliza")) correr(pendiente.hasta, pendiente.fin); }, {rootMargin:"0px"}).observe(stage);
setTimeout(() => { if (visible) iniciarRecorrido(); else tRec = setTimeout(iniciarRecorrido, 6000); }, 1400);

// ---------- Controles ----------
bPri.addEventListener("click", principal);
bExamen.addEventListener("click", () => {
  nuevo(); v0 = V.v0; mu = V.mu;
  if (trampaOn) bTrampa.click();
  decir("De vuelta al ejemplo del examen."); render();
});
bTrampa.addEventListener("click", () => {
  trampaOn = !trampaOn; bTrampa.setAttribute("aria-pressed", trampaOn);
  bTrampa.textContent = trampaOn ? J.controles.ocultarTrampa : J.controles.trampa;
  if (trampaOn){ revelado = true; mu = RG.mu.min; empujar(); decir(J.lecturas.trampa); }
  else render();
});
sV0.addEventListener("input", () => { v0 = +sV0.value; nuevo(); render(); });
sMu.addEventListener("input", () => { mu = +sMu.value; nuevo(); render(); });
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "b" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input[type=text],textarea,select,[contenteditable]")) return;
  e.preventDefault(); tomarControl(); principal();
});
const redondea = (x, p) => Math.round(x / p) * p;
stage.addEventListener("keydown", (e) => {
  const dm = {ArrowRight:1, ArrowLeft:-1}[e.key], dv = {ArrowUp:1, ArrowDown:-1}[e.key];
  if (dm === undefined && dv === undefined) return;
  e.preventDefault();
  if (dm) mu = Math.max(RG.mu.min, Math.min(RG.mu.max, +redondea(mu + dm * RG.mu.paso, RG.mu.paso).toFixed(4)));
  if (dv) v0 = Math.max(RG.v0.min, Math.min(RG.v0.max, v0 + dv * RG.v0.paso));
  nuevo(); render();
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
$("#pred-q").textContent = J.prediccion.pregunta;
opciones($("#pred-ops"), J.prediccion.opciones.map(o => ({t:o.texto, ok:o.correcta, e:tpl(o.retro, {v0:num(v0)})})),
  () => { tomarControl(); revelado = true; mu = RG.mu.min; empujar(); });

// ---------- Los 6 pasos (capa 1) ----------
const e0 = frena(V.v0, V.mu), e1 = frena(V.v0, RG.mu.paso);
const n = {v0:num(V.v0), mu:num(V.mu), g:num(g), a:num(e0.a), t:num(e0.t), d:num(e0.d), mu1:num(RG.mu.paso), a1:num(e1.a), t1:num(e1.t), d1:num(e1.d)};
const PASOS = [
  {n:1, titulo:"Pregunta de examen", enunciado:`Un disco de hockey se desliza en línea recta a ${n.v0} m/s sobre hielo sin fricción. ¿Qué fuerza neta se necesita para que siga a ${n.v0} m/s en la misma dirección?`,
    ops:[{t:"A) Una fuerza constante hacia adelante", e:"Es la idea de Aristóteles: «si se mueve, algo lo empuja». Sin fricción no hace falta ninguna fuerza para seguir."},
         {t:"B) Ninguna: la fuerza neta debe ser cero", ok:true, e:"Velocidad constante ⇔ fuerza neta cero. Sin fricción nada lo frena y nada tiene que empujarlo."},
         {t:"C) Una fuerza que crezca con el tiempo", e:"Confunde mantener la velocidad con acelerar: una fuerza neta, crezca o no, cambiaría la velocidad."},
         {t:"D) Una fuerza igual a su peso", e:"El peso apunta hacia abajo y lo equilibra el hielo (la normal). No empuja hacia adelante."}]},
  {n:2, titulo:"Idea en una frase", p:["Un cuerpo sigue como va (quieto o a velocidad constante en línea recta) mientras la fuerza neta sea cero; una fuerza no hace falta para moverse, hace falta para <b>cambiar</b> el movimiento.",
    "Empuja en la lámina: la flecha del resorte existe solo mientras lo toca. Después, con fricción las marcas se juntan; con μ = 0 quedan igual de separadas."]},
  {n:3, titulo:"Ejemplo resuelto", p:[`El mismo disco (${n.v0} m/s) pasa a un piso con μ = ${n.mu} (g = ${n.g} m/s²). La fuerza neta es la fricción, hacia atrás: a = ${n.mu} × ${n.g} = <b>${n.a} m/s²</b> (frenado).`,
    `Se detiene en t = ${n.v0} ÷ ${n.a} = <b>${n.t} s</b>, después de recorrer d = ${n.v0}² ÷ (2 × ${n.a}) = <b>${n.d} m</b>.`,
    `Con μ = ${n.mu1}: a = ${n.a1} m/s², se detiene en ${n.t1} s y recorre ${n.d1} m.`,
    "Con μ = 0: a = 0, no se detiene nunca → respuesta B."]},
  {n:4, titulo:"La trampa", p:["Pensar que «si se mueve, algo lo está empujando» (la idea de Aristóteles) lleva a la A. En la vida diaria las cosas se detienen por la fricción, no porque se les acabe una fuerza.",
    "Las otras también tienen dueño: C confunde mantener la velocidad con acelerar, y D confunde el peso con una fuerza que mueve (el peso lo equilibra el hielo, la normal).",
    `Pulsa «${J.controles.trampa}» en la lámina: el fantasma se queda donde lo suelta el resorte; el disco de verdad sigue.`]},
  {n:5, titulo:"Truco de examen", p:['Velocidad constante o reposo ⇔ <span class="formula">ΣF = 0</span>. Lee «constante», «uniforme» o «en reposo» y escribe ΣF = 0 sin hacer cuentas.',
    "Si algo se frena, busca la fuerza que lo frena (fricción, aire), no la que «le falta»."]},
  {n:6, titulo:J.prueba.titulo, enunciado:J.prueba.pregunta, ops:J.prueba.opciones.map(o => ({t:`${o.letra}) ${o.texto}`, ok:o.correcta, e:o.retro}))}
];
PASOS.forEach(p => {
  const s = document.createElement("section"); s.className = "tarjeta";
  s.innerHTML = `<h2><span class="n">${p.n}</span>${p.titulo}</h2>` + (p.p || []).map(t => `<p>${t}</p>`).join("");
  if (p.enunciado){ s.insertAdjacentHTML("beforeend", `<p>${p.enunciado}</p>`); const l = document.createElement("div"); l.className = "opciones"; opciones(l, p.ops); s.append(l); }
  $(p.n <= 2 ? "#pasos-a" : "#pasos-b").append(s);
});
// Otro intento (capa 2): el más rápido en el piso más rugoso
const o2 = frena(RG.v0.max, RG.mu.max);
$("#otro").innerHTML = `<h3>Otro intento</h3><p>Ahora el disco sale a ${num(o2.v0)} m/s sobre un piso con μ = ${num(o2.mu)} (g = ${n.g} m/s²). ¿Qué distancia recorre hasta detenerse?</p><div class="opciones"></div>`;
opciones($("#otro .opciones"), [
  {t:`A) ${num(o2.v0 * o2.v0 / o2.a)} m`, e:`Olvidaste el 2: d = v<sub>0</sub>² ÷ (2a) = ${num(o2.v0)}² ÷ (2 × ${num(o2.a)}).`},
  {t:`B) ${num(o2.d)} m`, ok:true, e:`a = ${num(o2.mu)} × ${n.g} = ${num(o2.a)} m/s²; d = ${num(o2.v0)}² ÷ (2 × ${num(o2.a)}) = ${num(o2.d)} m, en ${num(o2.t)} s.`},
  {t:`C) ${num(o2.t)} m`, e:`Ese número es el tiempo hasta detenerse (${num(o2.t)} s), no la distancia.`},
  {t:`D) ${num(o2.v0 * o2.v0 / (2 * o2.mu))} m`, e:`Usaste μ como si fuera la aceleración. Falta multiplicar por g: a = μ × g = ${num(o2.a)} m/s².`}
]);

$("#pie").innerHTML = `<i>${tpl(J.figura.pie, {g:num(g)})}</i> Modelo: la pista y la regla están en metros a escala; el disco, el lanzador y las flechas no (las flechas tienen su propia escala). El resorte empuja solo en la zona lisa del lanzador; desde donde suelta el disco empieza el tramo con fricción μ.
 Si el disco sale de la vista, la regla se desplaza con él y la barra de abajo muestra el recorrido completo. Las marcas van cada ${num(ES.dt)} s de tiempo real; si el frenado dura más de ${num(ES.duracionMax)} s, la animación va en cámara rápida y la lámina lo indica (×N).
 Si nadie toca, la lámina empuja sola sin mostrar dónde se detiene. En el celular, «Pantalla completa» la muestra grande (mejor con el teléfono girado) y se acerca con pellizco. Teclas: B empuja o vuelve al inicio; con la lámina enfocada, ← → cambian μ y ↑ ↓ cambian v<sub>0</sub>.`;

// ---------- Pantalla completa («modo lámina»), con zoom de pellizco y arrastre ----------
const pant = $("#pantalla"), bCompleta = $("#completa"), bCerrar = $("#cerrar"), compacto = $("#compacto");
const MOVIBLES = ["#empujar", "#bloque-v0", "#bloque-mu"].map(s => $(s));
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
window.__newton = { set:(o) => { if ("v0" in o) v0 = o.v0; if ("mu" in o) mu = o.mu; if ("rev" in o) revelado = o.rev; if ("trampa" in o){ trampaOn = o.trampa; }
    if ("fase" in o){ fase = o.fase; tau = o.tau ?? 1; t = o.t ?? 0; N = factor(); const f = F(); if (fase === "parado") t = f.t; cam = o.cam ?? Math.max(0, pos(t, f) - C.SEGUIR); }
    render(); },
  sel:seleccionar, completa:entrar, salir, alto:() => { enRecorrido = false; clearTimeout(tRec); cancelAnimationFrame(anim); anim = 0; render(); } };
})();
}

// ---------- Página (CSS de la prensa + lo propio de la primera ley) ----------
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
const CSS_FIG = `
/* Propio de la primera ley (también va en el SVG fijo) */
.tramo{fill:var(--rubrica)} .tramo.hielo{fill:var(--agua-sup)}
.textura{fill:none;stroke:var(--anatomy-mid);stroke-width:1.3;stroke-linecap:round}
.marcas{fill:var(--acento);stroke:var(--agua-2);stroke-width:.4}
.previa{fill:none;stroke:var(--acento);stroke-width:.7;opacity:.6}
.resorte{fill:none;stroke:var(--anatomy-hi);stroke-width:1.1;stroke-linecap:round} .resorte.atras{stroke:var(--anatomy-mid)}
.tk{fill:none;stroke-width:.6} .tk.menor{stroke:var(--anatomy-lo)} .tk.mayor{stroke:var(--anatomy-mid)}
.t-regla{font:500 9px var(--anatomy-mono);fill:var(--anatomy-text);font-variant-numeric:tabular-nums}
.banderin{fill:var(--acento)}
.t-d,.t-borde{font:500 14px var(--serif);fill:var(--acento);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.flecha line{stroke-width:2.2;stroke-linecap:round}
.fl-v line{stroke:var(--acento)} .fl-v polygon{fill:var(--acento)} .fl-v .t-vel{fill:var(--acento)}
.fl-f line,.fl-F line{stroke:var(--rubrica)} .fl-f polygon,.fl-F polygon{fill:var(--rubrica)} .fl-f .t-vel,.fl-F .t-vel,.t-f0{fill:var(--rubrica)}
.fl-F line{stroke-width:3.2}
.t-vel{font:500 14px var(--serif);font-variant-numeric:lining-nums tabular-nums;paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.t-cam{font:500 11px var(--anatomy-mono);fill:var(--suave);letter-spacing:.04em}
.fantasma{fill:none;stroke:var(--rubrica);stroke-width:1.1;stroke-dasharray:4 3}
.t-trampa{font:500 11px var(--anatomy-mono);fill:var(--rubrica);paint-order:stroke;stroke:var(--sup);stroke-width:4px;stroke-linejoin:round}
.rot{cursor:pointer}
.rot circle{fill:var(--sup);stroke:var(--dorado);stroke-width:1.1}
.rot text{font:500 9.5px var(--anatomy-mono);fill:var(--anatomy-text);text-anchor:middle;dominant-baseline:central}
.rot.activo circle{fill:var(--dorado);stroke:var(--dorado)} .rot.activo text{fill:var(--sup)}
`;
const CSS_PAGINA = CSS_PRENSA + CSS_FIG + `
/* Página de la primera ley */
.chips output{font-size:1.25rem}
.minibarra{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;font:500 11.5px ui-monospace,Consolas,monospace;color:var(--suave);font-variant-numeric:tabular-nums;margin-top:-4px}
.mb-pista{position:relative;height:10px;border-radius:5px;background:var(--borde)}
.mb-ven{position:absolute;top:-3px;bottom:-3px;border:1.5px solid var(--suave);border-radius:4px}
.mb-dot{position:absolute;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--acento);box-shadow:0 0 0 2px var(--sup)}
/* Pantalla completa («modo lámina»): figura grande, controles compactos, zoom con pellizco */
.pantalla{display:grid;gap:12px}
.barra-lamina{display:flex;align-items:center;gap:10px;margin-top:-4px}
.barra-lamina .minibarra{flex:1;min-width:0;margin:0}
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
.modo-lamina .compacto{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr);gap:6px 16px;align-items:center}
.modo-lamina .compacto .fila{font-size:.82rem;font-weight:600}
.modo-lamina .compacto input[type=range]{height:30px}
.modo-lamina .compacto .boton{white-space:nowrap}
@media (orientation:portrait){.modo-lamina .gira{display:block;margin:0 52px 0 0;font-size:.85rem;color:var(--suave)}
  .modo-lamina .compacto{grid-template-columns:minmax(0,1fr) minmax(0,1fr)} .modo-lamina .compacto #empujar{grid-column:1/-1}}
`;

// ---------- Figura fija para PDF y video (modo claro, estado de ejemplo: el disco a medio frenado) ----------
function svgFijo() {
  const v0 = V.v0, mu = V.mu, a = mu * V.g, tMedio = 0.4 * v0 / a;
  const s = { v0, mu, fase: "desliza", tau: 1, t: tMedio, cam: 0, revelado: true, trampa: false, recorrido: false, N: 1 };
  const claro = CSS_PRENSA.slice(CSS_PRENSA.indexOf(":root{"), CSS_PRENSA.indexOf("@media (prefers-color-scheme:dark)"))
    .replace(":root{", "svg{").replace(/\s*color-scheme:light;box-sizing:border-box;[\s\S]*?\n\}/, "}");
  const tibio = CSS_PRENSA.slice(CSS_PRENSA.indexOf(".iso{"), CSS_PRENSA.indexOf("@media", CSS_PRENSA.indexOf(".iso{"))).replace(".iso{", "svg.iso{");
  const estilo = `<style>${k.ISO_CSS}${claro}${tibio}svg{background:var(--bg)}${CSS_FIG}</style>`;
  return k.figureSvg({ width: W, height: H, label: J.figura.aria, className: "iso", body: [estilo, ...cuerpo(vista(CFG, k, s, J))] })
    .replace('<svg ', '<svg width="1280" height="600" ');
}

const plate = k.plateHtml({
  fig: "Lámina I",
  title: "Primera ley de Newton",
  hint: J.instruccion,
  readout: "t 0 s · x 0 m · v 0 m/s",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuenow="0">${figura}</div>`,
});
const HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Primera ley de Newton · Códice Vivo</title>
<style>${k.ISO_CSS}${CSS_PAGINA}</style>
</head>
<body>
<main class="pagina">
  <header>
    <div class="marca-casa">Códice Vivo · Laboratorio</div>
    <h1 id="titulo">Primera ley de Newton</h1>
    <p class="sub" id="subtitulo"></p>
  </header>
  <div class="rejilla">
    <div id="pasos-a" class="pasos"></div>
    <section class="tarjeta lab" aria-label="Laboratorio">
      <div class="predice">
        <h3 id="pred-t">Predice antes de empujar</h3>
        <p id="pred-q"></p>
        <div class="opciones" id="pred-ops"></div>
      </div>
      <div class="pantalla" id="pantalla" role="group" aria-label="Lámina">
        <button type="button" class="cerrar" id="cerrar" aria-label="Salir de pantalla completa">✕</button>
        <p class="gira" aria-hidden="true">Gira el teléfono para verla más grande</p>
        <div class="iso escena">${plate}</div>
        <div class="barra-lamina">
          <div class="minibarra" aria-hidden="true"><span>0</span><div class="mb-pista"><div class="mb-ven" id="mb-ven"></div><div class="mb-dot" id="mb-dot"></div></div><span id="mb-fin">?</span></div>
          <button type="button" class="boton sec completa" id="completa">⛶ Pantalla completa</button>
        </div>
        <div class="compacto" id="compacto"></div>
      </div>
      <div class="rotulos" id="rotulos" role="group" aria-label="Partes de la lámina"></div>
      <p class="ficha" id="ficha" aria-live="polite"></p>
      <div class="controles">
        <div class="lectura">
          <span class="lectura-etq" id="etq-d"></span>
          <output id="o-d" class="grande">?</output>
          <p class="cuenta num" id="o-formula"></p>
        </div>
        <div id="bloque-v0">
          <div class="fila"><label for="s-v0" id="l-v0"></label><output id="o-v0"></output></div>
          <input type="range" id="s-v0">
        </div>
        <div id="bloque-mu">
          <div class="fila"><label for="s-mu" id="l-mu"></label><output id="o-mu"></output></div>
          <input type="range" id="s-mu">
        </div>
        <div class="chips">
          <div class="chip"><span>Frenado, a = μ·g</span><output id="o-a"></output></div>
          <div class="chip"><span>Tiempo hasta detenerse</span><output id="o-t"></output></div>
          <div class="chip"><span>v ahora</span><output id="o-v"></output></div>
        </div>
        <div class="botones">
          <button type="button" class="boton pri" id="empujar" aria-keyshortcuts="b">Empujar</button>
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
<script type="module">${(kitScript() + `\nconst vista = ${vista.toString()};\n(${pagina.toString()})(${JSON.stringify(CFG)});`).replace(/<\/(script)/gi, "<\\/$1")}</script>
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
