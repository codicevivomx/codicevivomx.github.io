/* Códice Vivo · Tiro parabólico 2.0 · situación real: tiro libre en una cancha de fútbol (estilo tinta).
   Misma física que el laboratorio: la página calcula el tiro y aquí solo se dibuja.
   Vista de lado con un poco de profundidad: x a lo largo de la cancha, y hacia arriba, z hacia el frente.
   La barrera y la portería están a escala (en metros); el balón y el pateador se dibujan más grandes para que se vean.
   Usa los ayudantes de tinta compartidos (plantilla/laminas2/escenas.js).

   const cancha = creaCancha(contenedor, { barrera: { x, alto }, porteria: { x, alto }, alRedimensionar });
   Interfaz ESCENA (igual que el laboratorio): svg, capaPrediccion, capaHerramientas, aPantalla, dePantalla,
   escalaTexto, pxPorMetro, encuadra({ x1, y1 }), pinta(E). */
import { tinta } from "../../../laminas2/escenas.js";

const { el, n1, n2, wob, forma, det, achura, circulo, rng, FINO, TINTA, AZUL, CORAL, VERDE } = tinta;
const S = 10;                                     // unidades del SVG por metro
const ZX = -0.45, ZY = 0.32;                       // profundidad oblicua: z hacia el frente baja y va a la izquierda
const P = (x, y = 0, z = 0) => [n2((x + ZX * z) * S), n2((-y + ZY * z) * S)];
const ASPECTO = 640 / 340;

export function creaCancha(cont, cfg) {
  const B = cfg.barrera, PO = cfg.porteria;
  const svg = el("svg", { class: "l2-tinta cancha", role: "img", "aria-label": "Dibujo a tinta: tiro libre en una cancha; el balón pasa sobre la barrera hacia la portería." }, cont);
  const fondo = el("g", {}, svg), gEst = el("g", {}, svg), gTray = el("g", {}, svg), gMarcas = el("g", {}, svg), gNotas = el("g", {}, svg), gBalon = el("g", {}, svg);
  const capaPrediccion = el("g", {}, svg), capaHerramientas = el("g", {}, svg);
  let caja = { x0: -8, x1: 70, y0: -6, y1: 30 }, vista = { x: 0, y: 0, w: 640, h: 340 };

  /* ---------- Dibujo fijo (se rehace al encuadrar porque depende de lo largo de la cancha) ---------- */
  function figura(par, x, z, h, camiseta, semilla, pose) {
    const g = el("g", {}, par), u = h / 1.8, pie = P(x, 0, z), cad = P(x, 0.95 * u, z), hom = P(x, 1.42 * u, z), cab = P(x, 1.62 * u, z);
    const dx = 0.16 * u * S, r = 0.15 * u * S;
    const piernaI = pose === "patea" ? [[pie[0] - dx * 0.4, pie[1]], cad] : [[pie[0] - dx, pie[1]], [cad[0] - dx * 0.4, cad[1]]];
    const piernaD = pose === "patea" ? [[cad[0] + dx * 0.4, cad[1]], [cad[0] + dx * 3.2, cad[1] + dx * 1.6]] : [[pie[0] + dx, pie[1]], [cad[0] + dx * 0.4, cad[1]]];
    el("path", { d: wob(piernaI, semilla, { cerrado: false, amp: 0.3 }) + wob(piernaD, semilla + 1, { cerrado: false, amp: 0.3 }), fill: "none", class: "ink grueso" }, g);
    forma(g, [[cad[0] - dx * 1.4, cad[1] + dx * 0.6], [cad[0] + dx * 1.4, cad[1] + dx * 0.6], [hom[0] + dx * 1.6, hom[1]], [hom[0] - dx * 1.6, hom[1]]], camiseta, semilla + 2, FINO);
    const brazos = pose === "barrera" ? `M${n1(hom[0] - dx * 1.3)} ${n1(hom[1] + dx * 0.4)}L${n1(cad[0] - dx * 0.4)} ${n1(cad[1] - dx * 0.5)}M${n1(hom[0] + dx * 1.3)} ${n1(hom[1] + dx * 0.4)}L${n1(cad[0] + dx * 0.4)} ${n1(cad[1] - dx * 0.5)}`
      : `M${n1(hom[0] - dx * 1.4)} ${n1(hom[1] + dx * 0.3)}L${n1(hom[0] - dx * 3)} ${n1(hom[1] + dx * 2.6)}M${n1(hom[0] + dx * 1.4)} ${n1(hom[1] + dx * 0.3)}L${n1(hom[0] + dx * 3.2)} ${n1(hom[1] - dx * 0.4)}`;
    el("path", { d: brazos, fill: "none", class: "ink" }, g);
    forma(g, circulo(cab[0], cab[1], r, 10), "#e8b98f", semilla + 3, { amp: 0.2, paso: 3 });
    return g;
  }
  function dibujaFondo() {
    fondo.textContent = "";
    const X0 = caja.x0 - 4, X1 = caja.x1 + 4, ZA = -5.5, ZF = 5.5;
    /* tribuna y anuncios al fondo */
    forma(fondo, [P(X0, 0, ZA), P(X1, 0, ZA), P(X1, 1.1, ZA), P(X0, 1.1, ZA)], "#e9dcc0", 3, { amp: 0.6 });
    let tablas = ""; for (let x = Math.ceil(X0 / 8) * 8; x < X1; x += 8) { const a = P(x, 0, ZA), b = P(x, 1.1, ZA); tablas += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; }
    det(fondo, tablas, 0.6, { op: 0.5 });
    /* pasto con franjas de corte cada 5 m */
    forma(fondo, [P(X0, 0, ZA), P(X1, 0, ZA), P(X1, 0, ZF), P(X0, 0, ZF)], "#a5cf7a", 11, { amp: 0.8 });
    let franjas = "";
    for (let x = Math.floor(X0 / 10) * 10; x < X1; x += 10) { const q = [P(x, 0, ZA), P(x + 5, 0, ZA), P(x + 5, 0, ZF), P(x, 0, ZF)]; franjas += "M" + q.map((p) => p.join(" ")).join("L") + "Z"; }
    el("path", { d: franjas, fill: "#b6dc8b" }, fondo);
    forma(fondo, [P(X0, 0, ZF), P(X1, 0, ZF), P(X1, -0.9, ZF), P(X0, -0.9, ZF)], "#a87c4c", 12, { amp: 0.6 });
    det(fondo, achura(P(X0, 0, ZF), P(X1, 0, ZF), P(X1, -0.9, ZF), P(X0, -0.9, ZF), 6, 0.02), 0.5, { op: 0.35 });
    /* cal: línea de meta en la portería, área chica y el punto del tiro libre */
    const cal = (pts) => el("path", { d: wob(pts, 70 + pts.length, { cerrado: false, amp: 0.4 }), fill: "none", stroke: "#fffdf6", "stroke-width": 2, "stroke-linecap": "round", opacity: 0.95 }, fondo);
    cal([P(PO.x, 0, ZA + 0.3), P(PO.x, 0, ZF - 0.3)]);
    cal([P(PO.x - 5.5, 0, -4.5), P(PO.x - 5.5, 0, 4.5)]);
    cal([P(PO.x - 16.5, 0, ZA + 0.3), P(PO.x - 16.5, 0, ZF - 0.3)]);
    const spot = P(0, 0, 0); el("ellipse", { cx: spot[0], cy: spot[1], rx: 3.5, ry: 1.6, fill: "#fffdf6" }, fondo);
    /* matas de pasto (sin tapar la línea del tiro) */
    const r = rng(41); let matas = "";
    for (let i = 0; i < 70; i++) {
      const x = X0 + r() * (X1 - X0), z = ZA + 0.5 + r() * (ZF - ZA - 1); if (Math.abs(z) < 0.8) continue;
      const b = P(x, 0, z), h = 3 + r() * 3;
      matas += `M${n1(b[0] - 2)} ${n1(b[1])}q-0.5 ${n1(-h * 0.6)} -2 ${n1(-h)}M${n1(b[0])} ${n1(b[1])}q0 ${n1(-h * 0.6)} 0.8 ${n1(-h * 1.1)}M${n1(b[0] + 2)} ${n1(b[1])}q0.5 ${n1(-h * 0.5)} 2.4 ${n1(-h * 0.8)}`;
    }
    el("path", { d: matas, fill: "none", class: "ink fino", opacity: 0.6 }, fondo);
    /* portería: postes, travesaño y red (a escala) */
    const pz = 3.66, ph = PO.alto, fondoRed = 1.8;
    const red = el("g", {}, fondo);
    forma(red, [P(PO.x, ph, -pz), P(PO.x + fondoRed, ph * 0.75, -pz), P(PO.x + fondoRed, 0, -pz), P(PO.x + fondoRed, 0, pz), P(PO.x + fondoRed, ph * 0.75, pz), P(PO.x, ph, pz)], "rgba(255,253,246,.55)", 80, FINO);
    let malla = ""; for (let i = 1; i < 8; i++) { const z = -pz + 2 * pz * i / 8, a = P(PO.x + fondoRed, 0, z), b = P(PO.x + fondoRed, ph * 0.75, z), c = P(PO.x, ph, z); malla += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c[0]} ${c[1]}`; }
    for (let j = 1; j < 4; j++) { const y = ph * 0.75 * j / 4, a = P(PO.x + fondoRed, y, -pz), b = P(PO.x + fondoRed, y, pz); malla += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; }
    det(red, malla, 0.5, { op: 0.55 });
    const poste = (z) => forma(fondo, [P(PO.x - 0.06, 0, z), P(PO.x + 0.06, 0, z), P(PO.x + 0.06, ph, z), P(PO.x - 0.06, ph, z)], "#fffdf6", 90 + z, FINO);
    poste(-pz); forma(fondo, [P(PO.x, ph + 0.06, -pz), P(PO.x, ph + 0.06, pz), P(PO.x, ph - 0.06, pz), P(PO.x, ph - 0.06, -pz)], "#fffdf6", 95, FINO); poste(pz);
    /* barrera: cuatro jugadores a escala, con los brazos abajo */
    [-1.4, -0.45, 0.5, 1.45].forEach((z, i) => figura(fondo, B.x, z, B.alto, "#3f63c7", 120 + i * 7, "barrera"));
    /* el pateador, detrás del balón */
    figura(fondo, -1.6, 0.9, 1.75 * 1.6, CORAL, 200, "patea");
  }

  /* ---------- Balón ---------- */
  const sombra = el("ellipse", { fill: "rgba(29,26,22,.25)" }, gBalon);
  const balonG = el("g", {}, gBalon);
  forma(balonG, circulo(0, 0, 10, 14), "#fffdf6", 300, FINO);
  el("path", { d: "M-2.5 -3.2L2.5 -3.2L4 1.4L0 4.3L-4 1.4Z", fill: TINTA }, balonG);
  det(balonG, "M-2.5 -3.2L-5 -8M2.5 -3.2L5 -8M4 1.4L9 2.5M0 4.3L0 9.5M-4 1.4L-9 2.5", 0.8, { op: 0.9 });

  /* ---------- Notas a mano ---------- */
  function nota(par, p, txt, o = {}) {
    const t = el("text", { x: n1(p[0]), y: n1(p[1]), class: "nota" + (o.chica ? " chica" : ""), "text-anchor": o.anc || "start", fill: o.color || AZUL }, par);
    if (o.dy) t.setAttribute("dy", o.dy + "em");
    t.textContent = txt; return t;
  }
  const raya = (par, d, color, clase = "") => el("path", { d, fill: "none", stroke: color, class: "raya " + clase }, par);
  const dP = (pts) => pts.map((p, i) => (i ? "L" : "M") + n1(p[0]) + " " + n1(p[1])).join("");

  /* ---------- Cámara ---------- */
  function k() { const w = svg.clientWidth || cont.clientWidth || 640; return vista.w / w; }
  function ponVista() {
    const w0 = (caja.x1 - caja.x0) * S, h0 = (caja.y1 - caja.y0) * S;
    let w = w0, h = h0; if (w / h < ASPECTO) w = h * ASPECTO; else h = w / ASPECTO;
    vista = { x: caja.x0 * S - (w - w0) * 0.25, y: -caja.y1 * S - (h - h0), w, h };   // lo que sobra va arriba: el pasto queda abajo
    svg.setAttribute("viewBox", `${n1(vista.x)} ${n1(vista.y)} ${n1(vista.w)} ${n1(vista.h)}`);
    svg.style.setProperty("--k", n2(k()));
  }
  function encuadra(o) {
    caja = { x0: -7, x1: Math.max(o.x1, PO.x + 9), y0: -5.5, y1: Math.max(o.y1, 8) };
    ponVista(); dibujaFondo();
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
        nota(gNotas, p, `${s.a}° · ${s.v0} m/s`, { dy: -0.3 });
      }
      if (E.cimaVista || E.revelado) {
        const c = P(s.vx * s.ts, s.H), b = P(s.vx * s.ts, 0);
        raya(gNotas, dP([c, b]), VERDE, "punteada");
        nota(gNotas, c, `H = ${n2(s.H)} m`, { color: VERDE, anc: "middle", dy: -0.5 });
      }
      if (E.t >= B.x / s.vx - 1e-9 && B.x < s.R) {
        const yb = s.vy * (B.x / s.vx) - 5 * (B.x / s.vx) ** 2, pasa = yb > B.alto;
        nota(gNotas, P(B.x, Math.max(yb, B.alto)), pasa ? `pasa la barrera (${n1(yb)} m)` : "¡choca con la barrera!", { color: pasa ? VERDE : CORAL, anc: "middle", dy: -0.9, chica: true });
      }
      if (E.t >= Math.min(s.tv, PO.x / s.vx) - 1e-9) {
        const tp = PO.x / s.vx, yp = tp <= s.tv ? s.vy * tp - 5 * tp * tp : -1;
        const txt = yp < 0 ? "no llega a la portería" : yp <= PO.alto ? "¡gol!" : "pasa por encima";
        if (E.t >= Math.min(s.tv, tp) - 1e-9 && (yp >= 0 || E.t >= s.tv - 1e-9)) nota(gNotas, P(PO.x + 1, PO.alto + 1.2), txt, { color: yp >= 0 && yp <= PO.alto ? VERDE : CORAL, anc: "middle", dy: -0.6 });
      }
      if (E.t >= s.tv - 1e-9) {
        const c = P(s.R, 0), t = 6 * kk;
        raya(gNotas, `M${n1(c[0] - t)} ${n1(c[1] - t * 0.6)}L${n1(c[0] + t)} ${n1(c[1] + t * 0.6)}M${n1(c[0] + t)} ${n1(c[1] - t * 0.6)}L${n1(c[0] - t)} ${n1(c[1] + t * 0.6)}`, CORAL, "tache");
        nota(gNotas, c, `cae a ${n2(s.R)} m`, { color: CORAL, anc: "middle", dy: 1.3 });
      }
      if (E.trampa) {
        const c = P(s.vx * s.ts, s.H), f = P(s.Rtrampa, 0);
        raya(gNotas, dP([c, f]), CORAL, "punteada");
        nota(gNotas, f, `con t de subida: ${n2(s.Rtrampa)} m`, { color: CORAL, anc: "end", dy: -0.6, chica: true });
      }
    }
    /* balón (más grande que a escala) y su sombra */
    const p = P(pos[0], pos[1]), rb = Math.max(0.45 * S, 7 * kk), q = P(pos[0], 0);
    balonG.setAttribute("transform", `translate(${n1(p[0])} ${n1(p[1])}) scale(${n2(rb / 10)}) rotate(${n1(pos[0] * 40)})`);
    sombra.setAttribute("cx", q[0]); sombra.setAttribute("cy", n1(q[1] + rb * 0.85)); sombra.setAttribute("rx", n1(rb * 0.9)); sombra.setAttribute("ry", n1(rb * 0.3));
    sombra.setAttribute("opacity", pos[1] > 0.3 ? 0.6 : 1);
  }
  function flecha(a, b, h) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, bx = b[0] - ux * h, by = b[1] - uy * h;
    return `M${n1(a[0])} ${n1(a[1])}L${n1(bx)} ${n1(by)}M${n1(b[0])} ${n1(b[1])}L${n1(bx - uy * h * 0.5)} ${n1(by + ux * h * 0.5)}L${n1(bx + uy * h * 0.5)} ${n1(by - ux * h * 0.5)}Z`;
  }

  encuadra({ x1: 70, y1: 20 });
  return {
    svg, capaPrediccion, capaHerramientas,
    /* el balón se dibuja con su centro un radio arriba del punto; la física usa el punto */
    aPantalla: (w) => P(w[0], w[1]),
    dePantalla: (p) => [p[0] / S, -p[1] / S],
    escalaTexto: k,
    pxPorMetro: () => S,
    encuadra, pinta,
    mostrar(si) { svg.style.display = si ? "" : "none"; if (si) { ponVista(); ultimo = ""; } }
  };
}
