/* Códice Vivo · Tiro parabólico 2.0 · situación real: tiro libre en una cancha de fútbol (estilo tinta).
   Misma física que el laboratorio: la página calcula el tiro y aquí solo se dibuja.
   Vista de lado con un poco de profundidad: x a lo largo de la cancha, y hacia arriba, z hacia el frente.
   La barrera (5 jugadores), el portero y la portería están a escala (en metros); el balón y el pateador se dibujan
   más grandes para que se vean. La sombra del balón sigue su posición en el suelo (ayuda a leer la altura).
   Usa los ayudantes de tinta compartidos (plantilla/laminas2/escenas.js).

   El fondo se dibuja una sola vez; en cada cuadro solo se mueven el balón, su sombra y el rastro.
   El encuadre sigue a la trayectoria y el alto del contenedor se ajusta (sin cielo vacío).

   const cancha = creaCancha(contenedor, { barrera: { x, alto }, porteria: { x, alto }, alRedimensionar });
   Interfaz ESCENA (igual que el laboratorio): svg, capaPrediccion, capaHerramientas, aPantalla, dePantalla,
   escalaTexto, pxPorMetro, encuadra({ x1, y1 }), pinta(E). */
import { tinta } from "../../../laminas2/escenas.js";

const { el, n1, n2, wob, forma, det, achura, circulo, nube, rng, FINO, TINTA, AZUL, CORAL, VERDE } = tinta;
const S = 10;                                     // unidades del SVG por metro
const ZX = -0.45, ZY = 0.32;                       // profundidad oblicua: z hacia el frente baja y va a la izquierda
const P = (x, y = 0, z = 0) => [n2((x + ZX * z) * S), n2((-y + ZY * z) * S)];
const X_FONDO = [-12, 100];                        // la cancha dibujada (m): cubre cualquier tiro de la lámina

export function creaCancha(cont, cfg) {
  const B = cfg.barrera, PO = cfg.porteria;
  const svg = el("svg", { class: "l2-tinta cancha", preserveAspectRatio: "xMidYMid meet", role: "img", "aria-label": "Dibujo a tinta: tiro libre en una cancha; el balón pasa sobre la barrera hacia la portería." }, cont);
  const fondo = el("g", {}, svg), gEst = el("g", {}, svg), gTray = el("g", {}, svg), gMarcas = el("g", {}, svg), gNotas = el("g", {}, svg), gBalon = el("g", {}, svg);
  const capaPrediccion = el("g", {}, svg), capaHerramientas = el("g", {}, svg);
  let caja = { x0: -8, x1: 70, y0: -6, y1: 30 }, vista = { x: 0, y: 0, w: 640, h: 340 };

  /* ---------- Dibujo fijo (una sola vez) ----------
     Todo en tinta: contorno con temblor (wob), rellenos planos y achurado para la sombra. Nada de filtros. */

  /* Jugador de tinta: piernas con calcetas y tacos, short, camiseta, brazos y cabeza con pelo.
     pose: "barrera" (manos al frente), "portero" (brazos arriba, guantes), "patea" (pierna atrás, brazos abiertos). */
  function jugador(par, x, z, h, ropa, semilla, pose) {
    const g = el("g", {}, par), u = h / 1.8, Q = (dx, y) => P(x + dx * u, y * u, z), m = 0.13 * u;
    const piel = ropa.piel || "#e0a878", pelo = ropa.pelo || "#2b211b";
    const piernas = pose === "patea"
      ? [[Q(0.05, 0), Q(0.02, 0.48), Q(0, 0.9)], [Q(-0.42, 0.28), Q(-0.2, 0.55), Q(0, 0.9)]]
      : pose === "portero" ? [[Q(-0.2, 0), Q(-0.16, 0.48), Q(-0.08, 0.9)], [Q(0.2, 0), Q(0.16, 0.48), Q(0.08, 0.9)]]
      : [[Q(-0.09, 0), Q(-0.08, 0.48), Q(-0.06, 0.9)], [Q(0.09, 0), Q(0.08, 0.48), Q(0.06, 0.9)]];
    piernas.forEach(([pie, rod, cad], i) => {
      forma(g, [[cad[0] - m * S * 0.5, cad[1]], [cad[0] + m * S * 0.5, cad[1]], [rod[0] + m * S * 0.45, rod[1]], [pie[0] + m * S * 0.4, pie[1] - 1], [pie[0] - m * S * 0.4, pie[1] - 1], [rod[0] - m * S * 0.45, rod[1]]], piel, semilla + i, FINO);
      forma(g, [[rod[0] - m * S * 0.47, rod[1] + 1], [rod[0] + m * S * 0.47, rod[1] + 1], [pie[0] + m * S * 0.42, pie[1] - 1.5], [pie[0] - m * S * 0.42, pie[1] - 1.5]], ropa.calcetas || "#fffdf6", semilla + 3 + i, FINO);
      const d = pose === "patea" && i === 1 ? -1 : 1;
      forma(g, [[pie[0] - m * S * 0.5, pie[1] - 2], [pie[0] + d * m * S * 1.3, pie[1] - 1.2], [pie[0] + d * m * S * 1.3, pie[1] + 0.6], [pie[0] - m * S * 0.5, pie[1] + 0.6]], "#1d1a16", semilla + 6 + i, FINO);
    });
    const c = Q(0, 0.9), hom = Q(0, 1.42), cab = Q(0, 1.63), an = 0.22 * u * S;
    forma(g, [[c[0] - an * 0.95, c[1] - 1], [c[0] + an * 0.95, c[1] - 1], [c[0] + an, c[1] - 0.2 * u * S], [c[0] - an, c[1] - 0.2 * u * S]], ropa.short, semilla + 9, FINO);
    const torso = [[c[0] - an * 0.9, c[1] - 0.18 * u * S], [c[0] + an * 0.9, c[1] - 0.18 * u * S], [hom[0] + an, hom[1]], [hom[0] - an, hom[1]]];
    forma(g, torso, ropa.camiseta, semilla + 10, FINO);
    det(g, achura(torso[1], torso[2], [hom[0] + an * 0.3, hom[1]], [c[0] + an * 0.3, c[1] - 0.18 * u * S], 1.6, 0.4), 0.35, { op: 0.45 });
    if (ropa.raya) el("path", { d: `M${n1(hom[0] - an * 0.15)} ${n1(hom[1] + 1)}L${n1(c[0] - an * 0.15)} ${n1(c[1] - 0.2 * u * S)}`, stroke: ropa.raya, "stroke-width": n1(an * 0.35), fill: "none" }, g);
    /* brazos: hombro → codo → mano */
    const hI = [hom[0] - an * 0.9, hom[1] + 1.2], hD = [hom[0] + an * 0.9, hom[1] + 1.2];
    const brazos = pose === "portero" ? [[hI, Q(-0.5, 1.7), Q(-0.62, 2.05)], [hD, Q(0.5, 1.7), Q(0.62, 2.05)]]
      : pose === "patea" ? [[hI, Q(-0.42, 1.22), Q(-0.68, 1.1)], [hD, Q(0.35, 1.5), Q(0.62, 1.6)]]
      : [[hI, Q(-0.12, 1.12), Q(0.02, 0.95)], [hD, Q(0.14, 1.12), Q(0.04, 0.97)]];
    brazos.forEach(([a, b, d], i) => {
      el("path", { d: wob([a, b, d], semilla + 12 + i, { cerrado: false, amp: 0.2, paso: 4 }), fill: "none", stroke: "#1d1a16", "stroke-width": n1(m * S * 1.25), "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      el("path", { d: wob([a, b, d], semilla + 12 + i, { cerrado: false, amp: 0.2, paso: 4 }), fill: "none", stroke: pose === "portero" ? ropa.camiseta : piel, "stroke-width": n1(m * S * 0.8), "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      if (pose === "portero") forma(g, circulo(d[0], d[1], m * S * 0.75, 8), "#f6efdd", semilla + 15 + i, { amp: 0.15, paso: 2 });
    });
    /* cuello, cabeza y pelo */
    forma(g, circulo(cab[0], cab[1], 0.13 * u * S, 12), piel, semilla + 18, { amp: 0.15, paso: 2.5 });
    forma(g, [[cab[0] - 0.13 * u * S, cab[1] - 0.01 * u * S], [cab[0] - 0.1 * u * S, cab[1] - 0.12 * u * S], [cab[0] + 0.02 * u * S, cab[1] - 0.15 * u * S], [cab[0] + 0.13 * u * S, cab[1] - 0.06 * u * S], [cab[0] + 0.08 * u * S, cab[1] - 0.03 * u * S], [cab[0] - 0.05 * u * S, cab[1] - 0.07 * u * S]], pelo, semilla + 19, { amp: 0.1, paso: 2 });
    return g;
  }

  function dibujaFondo() {
    fondo.textContent = "";
    const [X0, X1] = X_FONDO, ZA = -5.5, ZF = 5.5;
    /* nubes de tinta (solo se ven si el encuadre es alto) */
    const nubes = el("g", { opacity: 0.85 }, fondo);
    [[6, 13, 3.2], [28, 18, 4], [52, 12, 3.6], [80, 20, 4.4], [-4, 22, 3]].forEach(([x, y, r], i) => { const p = P(x, y, -8); el("path", { d: nube(p[0], p[1], r * S * 0.5, 900 + i), fill: "#fffdf6", class: "ink fino" }, nubes); });
    /* tribuna y anuncios al fondo: tablas de colores alternos */
    const colores = ["#e9dcc0", "#d9e6ef", "#f1d3c4", "#e9dcc0", "#dfe9cf"];
    for (let x = X0, i = 0; x < X1; x += 8, i++) forma(fondo, [P(x, 0, ZA), P(x + 8, 0, ZA), P(x + 8, 1.1, ZA), P(x, 1.1, ZA)], colores[i % colores.length], 3 + i, { amp: 0.5 });
    /* pasto con franjas de corte cada 5 m */
    forma(fondo, [P(X0, 0, ZA), P(X1, 0, ZA), P(X1, 0, ZF), P(X0, 0, ZF)], "#a5cf7a", 11, { amp: 0.8 });
    let franjas = "";
    for (let x = Math.floor(X0 / 10) * 10; x < X1; x += 10) { const q = [P(x, 0, ZA), P(x + 5, 0, ZA), P(x + 5, 0, ZF), P(x, 0, ZF)]; franjas += "M" + q.map((p) => p.join(" ")).join("L") + "Z"; }
    el("path", { d: franjas, fill: "#b6dc8b" }, fondo);
    forma(fondo, [P(X0, 0, ZF), P(X1, 0, ZF), P(X1, -0.9, ZF), P(X0, -0.9, ZF)], "#a87c4c", 12, { amp: 0.6 });
    det(fondo, achura(P(X0, 0, ZF), P(X1, 0, ZF), P(X1, -0.9, ZF), P(X0, -0.9, ZF), 6, 0.02), 0.5, { op: 0.35 });
    /* cal: línea de meta, área chica (5.5 m), área grande (16.5 m), su media luna, punto penal (11 m) y el punto del tiro libre */
    const cal = (pts, semilla) => el("path", { d: wob(pts, semilla, { cerrado: false, amp: 0.4, paso: 20 }), fill: "none", stroke: "#fffdf6", "stroke-width": 2.2, "stroke-linecap": "round", opacity: 0.95 }, fondo);
    cal([P(PO.x, 0, ZA + 0.3), P(PO.x, 0, ZF - 0.3)], 70);
    cal([P(PO.x, 0, -5.5 + 0.4), P(PO.x - 5.5, 0, -5.5 + 0.4), P(PO.x - 5.5, 0, 5.1), P(PO.x, 0, 5.1)], 71);
    cal([P(PO.x - 16.5, 0, ZA + 0.3), P(PO.x - 16.5, 0, ZF - 0.3)], 72);
    const pen = PO.x - 11, luna = [];
    for (let a = -80; a <= 80; a += 8) { const r = a * Math.PI / 180, x = pen - 9.15 * Math.cos(r), z = 9.15 * Math.sin(r); if (x < PO.x - 16.5 && Math.abs(z) < 5.2) luna.push(P(x, 0, z)); }
    if (luna.length > 1) cal(luna, 73);
    [[pen, 0], [0, 0]].forEach(([x, z]) => { const s = P(x, 0, z); el("ellipse", { cx: s[0], cy: s[1], rx: 3.2, ry: 1.5, fill: "#fffdf6" }, fondo); });
    /* matas de pasto (sin tapar la línea del tiro) */
    const r = rng(41); let matas = "";
    for (let i = 0; i < 90; i++) {
      const x = X0 + r() * (X1 - X0), z = ZA + 0.5 + r() * (ZF - ZA - 1); if (Math.abs(z) < 0.8) continue;
      const b = P(x, 0, z), hh = 3 + r() * 3;
      matas += `M${n1(b[0] - 2)} ${n1(b[1])}q-0.5 ${n1(-hh * 0.6)} -2 ${n1(-hh)}M${n1(b[0])} ${n1(b[1])}q0 ${n1(-hh * 0.6)} 0.8 ${n1(-hh * 1.1)}M${n1(b[0] + 2)} ${n1(b[1])}q0.5 ${n1(-hh * 0.5)} 2.4 ${n1(-hh * 0.8)}`;
    }
    el("path", { d: matas, fill: "none", class: "ink fino", opacity: 0.6 }, fondo);
    /* portería a escala: red con malla en rombos, postes de atrás, poste lejano, travesaño y poste cercano */
    const pz = 3.66, ph = PO.alto, fr = 2;
    const red = el("g", {}, fondo);
    const caja = [P(PO.x, ph, -pz), P(PO.x + fr, ph * 0.8, -pz), P(PO.x + fr, 0, -pz), P(PO.x + fr, 0, pz), P(PO.x + fr, ph * 0.8, pz), P(PO.x, ph, pz)];
    forma(red, caja, "rgba(255,253,246,.5)", 80, FINO);
    let malla = "";
    for (let i = 0; i <= 12; i++) { const z = -pz + 2 * pz * i / 12, a = P(PO.x + fr, 0, z), b = P(PO.x + fr, ph * 0.8, z), c = P(PO.x, ph, z); malla += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c[0]} ${c[1]}`; }
    for (let j = 1; j <= 5; j++) { const y = ph * 0.8 * j / 6, a = P(PO.x + fr, y, -pz), b = P(PO.x + fr, y, pz); malla += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; }
    for (let j = 1; j <= 3; j++) { const f = j / 4, a = P(PO.x + fr * f, ph * (1 - 0.2 * f), -pz), b = P(PO.x + fr * f, ph * (1 - 0.2 * f), pz); malla += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; }
    det(red, malla, 0.45, { op: 0.6 });
    const palo = (a, b, semilla) => { el("path", { d: wob([a, b], semilla, { cerrado: false, amp: 0.15, paso: 12 }), fill: "none", stroke: "#1d1a16", "stroke-width": 3.4, "stroke-linecap": "round" }, fondo); el("path", { d: wob([a, b], semilla, { cerrado: false, amp: 0.15, paso: 12 }), fill: "none", stroke: "#fffdf6", "stroke-width": 1.8, "stroke-linecap": "round" }, fondo); };
    palo(P(PO.x + fr, 0, -pz), P(PO.x + fr, ph * 0.8, -pz), 91); palo(P(PO.x + fr, 0, pz), P(PO.x + fr, ph * 0.8, pz), 92);
    palo(P(PO.x, 0, -pz), P(PO.x, ph, -pz), 93);
    /* portero, entre los postes (se dibuja antes del poste cercano y el travesaño) */
    jugador(fondo, PO.x - 0.6, 0.6, 1.85, { camiseta: "#f2b632", short: "#1d1a16", calcetas: "#f2b632", pelo: "#5a3a22" }, 400, "portero");
    palo(P(PO.x, ph, -pz), P(PO.x, ph, pz), 94); palo(P(PO.x, 0, pz), P(PO.x, ph, pz), 95);
    /* barrera: cinco jugadores a escala, hombro con hombro */
    const tonos = ["#e0a878", "#c98a5a", "#f0c39a", "#a8714a", "#e8b48a"], pelos = ["#2b211b", "#1d1a16", "#7a4a26", "#1d1a16", "#3b2a1e"];
    [-1.6, -0.8, 0, 0.8, 1.6].forEach((z, i) => jugador(fondo, B.x + (i % 2) * 0.12, z, B.alto - 0.05 * (i % 3), { camiseta: "#3f63c7", short: "#fffdf6", calcetas: "#3f63c7", raya: "#fffdf6", piel: tonos[i], pelo: pelos[i] }, 120 + i * 23, "barrera"));
    /* el pateador, detrás del balón, en plena patada (más grande que a escala, como el balón) */
    jugador(fondo, -1.25, 0.7, 1.8 * 1.5, { camiseta: CORAL, short: "#fffdf6", calcetas: CORAL, raya: "#fffdf6", piel: "#c98a5a" }, 200, "patea");
  }

  /* ---------- Balón: gajos (pentágono al centro y cinco medios pentágonos en el borde) ---------- */
  const sombra = el("ellipse", { fill: "rgba(29,26,22,.28)" }, gBalon);
  const balonG = el("g", {}, gBalon);
  forma(balonG, circulo(0, 0, 10, 16), "#fffdf6", 300, FINO);
  const penta = (cx, cy, r, giro) => Array.from({ length: 5 }, (_, i) => { const a = giro + i * 1.2566; return [n2(cx + r * Math.cos(a)), n2(cy + r * Math.sin(a))]; });
  el("path", { d: "M" + penta(0, 0, 3.4, -1.5708).map((p) => p.join(" ")).join("L") + "Z", fill: TINTA }, balonG);
  let gajos = "", parches = "";
  for (let i = 0; i < 5; i++) {
    const a = -1.5708 + i * 1.2566, v = [3.4 * Math.cos(a), 3.4 * Math.sin(a)], w = [7.2 * Math.cos(a), 7.2 * Math.sin(a)];
    gajos += `M${n2(v[0])} ${n2(v[1])}L${n2(w[0])} ${n2(w[1])}`;
    const c = [9.6 * Math.cos(a + 0.6283), 9.6 * Math.sin(a + 0.6283)];
    parches += "M" + penta(c[0], c[1], 2.6, a + 0.6283 + 3.1416).map((p) => p.join(" ")).join("L") + "Z";
  }
  const recorte = el("clipPath", { id: "cancha-balon-" + Math.random().toString(36).slice(2, 7) }, balonG);
  el("circle", { r: 9.6 }, recorte);
  el("path", { d: parches, fill: TINTA, "clip-path": `url(#${recorte.id})` }, balonG);
  det(balonG, gajos, 0.8, { op: 0.85 });
  det(balonG, achura([-9, 3], [8, 6], [6, 9], [-6, 8], 2, 0.4), 0.4, { op: 0.35 });

  /* ---------- Notas a mano ---------- */
  function nota(par, p, txt, o = {}) {
    const t = el("text", { x: n1(p[0]), y: n1(p[1]), class: "nota l2-etq" + (o.chica ? " chica" : ""), "data-prio": o.prio || 2, "text-anchor": o.anc || "start", fill: o.color || AZUL }, par);
    if (o.dy) t.setAttribute("dy", o.dy + "em");
    t.textContent = txt; return t;
  }
  const raya = (par, d, color, clase = "") => el("path", { d, fill: "none", stroke: color, class: "raya " + clase }, par);
  const dP = (pts) => pts.map((p, i) => (i ? "L" : "M") + n1(p[0]) + " " + n1(p[1])).join("");

  /* ---------- Cámara ---------- */
  /* unidades del SVG por px de pantalla (con «meet» manda el lado más justo) */
  function k() { const w = svg.clientWidth || cont.clientWidth, h = svg.clientHeight || cont.clientHeight; return w && h ? Math.max(vista.w / w, vista.h / h) : vista.w / 640; }
  function ponVista() {
    const w0 = (caja.x1 - caja.x0) * S, h0 = (caja.y1 - caja.y0) * S;
    /* fuera de pantalla completa, el alto del contenedor sigue a la caja (entre 1.3:1 y 2.4:1);
       dentro, manda el hueco disponible */
    const enPC = !!cont.closest(".l2-pc"), propia = Math.min(2.4, Math.max(1.3, w0 / h0));
    const asp = enPC && cont.clientHeight ? Math.max(cont.clientWidth / cont.clientHeight, propia) : propia;
    if (!enPC) cont.style.aspectRatio = asp.toFixed(3); else cont.style.aspectRatio = "";
    let w = w0, h = h0; if (w / h < asp) w = h * asp; else h = w / asp;
    vista = { x: caja.x0 * S - (w - w0) * 0.3, y: -caja.y1 * S - (h - h0), w, h };   // lo que sobra va arriba: el pasto queda abajo
    svg.setAttribute("viewBox", `${n1(vista.x)} ${n1(vista.y)} ${n1(vista.w)} ${n1(vista.h)}`);
    svg.style.setProperty("--k", n2(k()));
  }
  /* o = { x1, y1 } en metros; se redondea a 5 m para no regalar el resultado antes de patear */
  function encuadra(o) {
    const x1 = Math.ceil(Math.max(o.x1, PO.x + 6) / 5) * 5, y1 = Math.ceil(Math.max(o.y1, PO.alto + 2.5) / 2.5) * 2.5;
    caja = { x0: -6, x1, y0: -2.9, y1 };
    ponVista();
  }
  if ("ResizeObserver" in window) new ResizeObserver(() => { ponVista(); if (cfg.alRedimensionar) cfg.alRedimensionar(); }).observe(cont);

  /* ---------- Pintar el estado ----------
     E = { s: { vx, vy, ts, tv, R, H, Rtrampa, a, v0 }, t, pos: [x, y], revelado, cimaVista, marcas: [t], trampa, enAire, enSuelo } */
  let ultimo = "";
  function pinta(E) {
    const s = E.s, kk = k(), pos = E.pos;
    svg.style.setProperty("--k", n2(kk));
    const at = (t) => { const u = Math.min(t, s.tv); return [s.vx * u, Math.max(0, s.vy * u - 5 * u * u)]; };
    const curva = (hasta, n = 60) => { const pts = []; for (let i = 0; i <= n; i++) { const w = at(hasta * i / n); pts.push(P(w[0], w[1])); } return dP(pts); };
    /* trayectoria (rastro punteado), parábola completa si ya se conoce y marcas cada 0.5 s */
    gTray.textContent = "";
    if (E.revelado) raya(gTray, curva(s.tv), TINTA, "guia");
    if (E.t > 0) raya(gTray, curva(E.t), TINTA, "rastro");
    gMarcas.textContent = "";
    (E.marcas || []).forEach((tm) => { if (tm > E.t + 1e-9) return; const w = at(tm), p = P(w[0], w[1]); el("circle", { cx: p[0], cy: p[1], r: n1(3.2 * kk), class: "marca" }, gMarcas); });
    /* notas: ángulo y v0 antes de patear; cima, barrera, portería y caída cuando ocurren */
    const firma = [s.v0, s.a, E.revelado, E.cimaVista, E.t >= s.tv - 1e-9, E.t > 0, E.trampa, n2(kk), E.t >= B.x / s.vx, E.t >= PO.x / s.vx].join("|");
    if (firma !== ultimo) {
      ultimo = firma; gNotas.textContent = "";
      if (!(E.t > 0)) {
        const a = s.a * Math.PI / 180, L = Math.max(4, 3.2 * kk * 14 / S), o = P(0, 0.4), p = P(L * Math.cos(a), 0.4 + L * Math.sin(a));
        raya(gNotas, dP([o, P(L * 1.1, 0.4)]), "#6b7080", "punteada");
        raya(gNotas, flecha(o, p, 9 * kk), AZUL, "relleno");
        nota(gNotas, p, `${s.a}° · ${s.v0} m/s`, { dy: -0.3, prio: 2 });
      }
      if (E.cimaVista || E.revelado) {
        const c = P(s.vx * s.ts, s.H), b = P(s.vx * s.ts, 0);
        raya(gNotas, dP([c, b]), VERDE, "punteada");
        nota(gNotas, c, `H = ${n2(s.H)} m`, { color: VERDE, anc: "middle", dy: -0.5, prio: 1 });
      }
      if (E.t >= B.x / s.vx - 1e-9 && B.x < s.R) {
        const yb = s.vy * (B.x / s.vx) - 5 * (B.x / s.vx) ** 2, pasa = yb > B.alto;
        nota(gNotas, P(B.x, B.alto), pasa ? `pasa la barrera (${n1(yb)} m > ${n1(B.alto)} m)` : `¡choca con la barrera! (${n1(Math.max(yb, 0))} m)`, { color: pasa ? VERDE : CORAL, anc: "middle", dy: 1.5, chica: true, prio: 1 });
      }
      if (E.t >= Math.min(s.tv, PO.x / s.vx) - 1e-9) {
        const tp = PO.x / s.vx, yp = tp <= s.tv ? s.vy * tp - 5 * tp * tp : -1;
        const txt = yp < 0 ? "no llega a la portería" : yp <= PO.alto ? `¡gol! entra a ${n1(yp)} m` : `sobre el travesaño (${n1(yp)} m)`;
        if (E.t >= Math.min(s.tv, tp) - 1e-9 && (yp >= 0 || E.t >= s.tv - 1e-9)) nota(gNotas, P(PO.x, PO.alto + 0.6), txt, { color: yp >= 0 && yp <= PO.alto ? VERDE : CORAL, anc: "end", dy: -0.4, prio: 1 });
      }
      if (E.t >= s.tv - 1e-9) {
        const c = P(s.R, 0), t = 6 * kk;
        raya(gNotas, `M${n1(c[0] - t)} ${n1(c[1] - t * 0.6)}L${n1(c[0] + t)} ${n1(c[1] + t * 0.6)}M${n1(c[0] + t)} ${n1(c[1] - t * 0.6)}L${n1(c[0] - t)} ${n1(c[1] + t * 0.6)}`, CORAL, "tache");
        nota(gNotas, c, `cae a ${n2(s.R)} m`, { color: CORAL, anc: "middle", dy: 1.3, prio: 2 });
      }
      if (E.trampa) {
        const c = P(s.vx * s.ts, s.H), f = P(s.Rtrampa, 0);
        raya(gNotas, dP([c, f]), CORAL, "punteada");
        nota(gNotas, f, `con t de subida: ${n2(s.Rtrampa)} m`, { color: CORAL, anc: "end", dy: -0.6, chica: true, prio: 2 });
      }
    }
    /* balón (más grande que a escala) y su sombra */
    const p = P(pos[0], pos[1]), rb = Math.max(0.45 * S, 7 * kk), q = P(pos[0], 0);
    balonG.setAttribute("transform", `translate(${n1(p[0])} ${n1(p[1])}) scale(${n2(rb / 10)}) rotate(${n1(pos[0] * 40)})`);
    /* la sombra se queda en el suelo bajo el balón y se encoge y aclara mientras más alto va */
    const f = 1 - Math.min(0.55, pos[1] / 14);
    sombra.setAttribute("cx", q[0]); sombra.setAttribute("cy", n1(q[1] + rb * 0.85)); sombra.setAttribute("rx", n1(rb * 0.95 * f)); sombra.setAttribute("ry", n1(rb * 0.32 * f));
    sombra.setAttribute("opacity", n2(0.35 + 0.65 * f));
  }
  function flecha(a, b, h) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, bx = b[0] - ux * h, by = b[1] - uy * h;
    return `M${n1(a[0])} ${n1(a[1])}L${n1(bx)} ${n1(by)}M${n1(b[0])} ${n1(b[1])}L${n1(bx - uy * h * 0.5)} ${n1(by + ux * h * 0.5)}L${n1(bx + uy * h * 0.5)} ${n1(by - ux * h * 0.5)}Z`;
  }

  dibujaFondo();
  encuadra({ x1: PO.x + 6, y1: 6 });
  return {
    svg, capaPrediccion, capaHerramientas,
    /* el balón se dibuja con su centro un radio arriba del punto; la física usa el punto */
    aPantalla: (w) => P(w[0], w[1]),
    dePantalla: (p) => [p[0] / S, -p[1] / S],
    escalaTexto: k,
    pxPorMetro: () => S,
    encuadra, pinta,
    mostrar(si) { svg.style.display = si ? "" : "none"; if (si) { ponVista(); ultimo = ""; } },
    ajusta() { ponVista(); ultimo = ""; }
  };
}
