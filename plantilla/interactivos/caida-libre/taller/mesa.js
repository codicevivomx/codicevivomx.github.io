// La mesa del taller (boceto 9): borde pintado de la lámina, instrumentos (cronómetro, velocímetro,
// altímetro), regla, cámara de la mesa que se acomoda y hoja que se levanta para leer.
// Sin three.js: se ve desde el primer momento, antes de cargar el 3D.
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg", INK = "#1E1D25";
const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
const pol = (cx, cy, r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];

// ---------- borde de pintura: se borra el centro con pinceladas irregulares ----------
export function bordePintado(cv, maq, P = { css: (s) => s }) {
  const azar = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
  function pinta() {
    const r = maq.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2), W = r.width + 4, H = r.height + 4;
    cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext("2d"); x.scale(dpr, dpr);
    x.fillStyle = P.css("#FBFAF5"); x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = "destination-out"; const rnd = azar(7), m = W < 500 ? 18 : 30;
    x.fillStyle = "#000"; x.fillRect(m + 18, m + 18, W - 2 * (m + 18), H - 2 * (m + 18));
    const borde = (n, px, py) => { for (let i = 0; i < n; i++) { const cx = px(rnd()), cy = py(rnd()); x.globalAlpha = .55 + rnd() * .45; x.beginPath(); x.ellipse(cx, cy, 10 + rnd() * 26, 6 + rnd() * 16, rnd() * 3.14, 0, 6.28); x.fill(); } };
    const n = Math.round((W + H) / 5);
    borde(n, (u) => m + u * (W - 2 * m), () => m + 8 + rnd() * 18);
    borde(n, (u) => m + u * (W - 2 * m), () => H - m - 8 - rnd() * 18);
    borde(n, () => m + 8 + rnd() * 18, (u) => m + u * (H - 2 * m));
    borde(n, () => W - m - 8 - rnd() * 18, (u) => m + u * (H - 2 * m));
    x.globalAlpha = .22;
    for (let i = 0; i < 70; i++) {
      const lado = i % 4, L = 30 + rnd() * 90, g = 2 + rnd() * 5;
      if (lado < 2) x.fillRect(m + rnd() * (W - 2 * m - L), lado ? H - m + rnd() * 8 : m - rnd() * 8 - g, L, g);
      else x.fillRect(lado === 2 ? m - rnd() * 8 - g : W - m + rnd() * 8, m + rnd() * (H - 2 * m - L), g, L);
    }
  }
  new ResizeObserver(pinta).observe(maq);
  return pinta;
}

function defs(svg, pre) {
  const d = el("defs", {}, svg);
  const lin = (id, st, x2 = 0, y2 = 1) => { const g = el("linearGradient", { id: pre + id, x1: 0, y1: 0, x2, y2 }, d); st.forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, g)); };
  const rad = (id, st, cx = .5, cy = .5, r = .5) => { const g = el("radialGradient", { id: pre + id, cx, cy, r }, d); st.forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, g)); };
  lin("cromo", [[0, "#FAFBFD"], [.35, "#B8BDC7"], [.55, "#EEF0F4"], [.8, "#8E94A0"], [1, "#D9DDE4"]], 1, 1);
  lin("cromoInv", [[0, "#7E848F"], [.45, "#E9ECF1"], [.6, "#A9AFB9"], [1, "#F6F7F9"]], 1, 1);
  lin("negro", [[0, "#5A5E6B"], [.5, "#2B2D35"], [1, "#16171C"]], 0, 1);
  rad("cara", [[0, "#FFFFFF"], [.75, "#F8F6F0"], [1, "#E6E1D5"]]);
  rad("caraOsc", [[0, "#2E313B"], [.8, "#191B21"], [1, "#0E0F13"]]);
  rad("sombraInt", [[0, "rgba(0,0,0,0)"], [.84, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.32)"]]);
  rad("cristal", [[0, "rgba(255,255,255,.55)"], [.6, "rgba(255,255,255,.12)"], [1, "rgba(255,255,255,0)"]], .32, .22, .7);
  lin("brillo", [[0, "rgba(255,255,255,.75)"], [1, "rgba(255,255,255,0)"]]);
  lin("goma", [[0, "#4A4E5A"], [.5, "#30333C"], [1, "#4A4E5A"]], 1, 0);
  lin("correa", [[0, "#3A3D47"], [.5, "#24262D"], [1, "#3A3D47"]], 1, 0);
  lin("lcd", [[0, "#C9DCC2"], [.12, "#DDEBD6"], [1, "#B5CCAC"]]);
  return d;
}
// Cristal: brillo radial + reflejo curvo arriba a la izquierda + filo de luz abajo a la derecha.
function cristal(svg, pre, cx, cy, r) {
  el("circle", { cx, cy, r, fill: `url(#${pre}cristal)` }, svg);
  el("path", { d: `M${cx - r * .8} ${cy - r * .35} A ${r} ${r} 0 0 1 ${cx + r * .55} ${cy - r * .85} A ${r * 1.15} ${r * 1.15} 0 0 0 ${cx - r * .8} ${cy - r * .35} Z`, fill: `url(#${pre}brillo)`, opacity: .85 }, svg);
  const [x1, y1] = pol(cx, cy, r - 2, 2.0), [x2, y2] = pol(cx, cy, r - 2, 2.9);
  el("path", { d: `M${x1} ${y1} A ${r - 2} ${r - 2} 0 0 1 ${x2} ${y2}`, fill: "none", stroke: "rgba(255,255,255,.7)", "stroke-width": 1.4, "stroke-linecap": "round" }, svg);
}
const canto = (svg, e) => svg.querySelector("defs").after(e);
const forma = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const tornillo = (svg, pre, x, y, a = .6) => { el("circle", { cx: x, cy: y, r: 3.2, fill: `url(#${pre}cromo)`, stroke: INK, "stroke-width": .8 }, svg);
  el("line", { x1: x - 2.2 * Math.cos(a), y1: y - 2.2 * Math.sin(a), x2: x + 2.2 * Math.cos(a), y2: y + 2.2 * Math.sin(a), stroke: INK, "stroke-width": .9 }, svg); };
// Aguja con sombra: la sombra va desplazada en pantalla (no gira con la aguja).
function aguja(svg, cx, cy, dibuja) {
  const s = el("g", { opacity: .28 }, svg), a = el("g", {}, svg);
  dibuja(s, "#000000"); dibuja(a, null);
  return (grados) => { s.setAttribute("transform", `translate(1.6 2.6) rotate(${grados} ${cx} ${cy})`); a.setAttribute("transform", `rotate(${grados} ${cx} ${cy})`); };
}

// ---------- instrumentos: devuelven la función que los mueve ----------
export function instrumentos(D) {
  const E = D.esc, X = D.T.textos, MONO = "Geist Mono,monospace";

  // Cronómetro mecánico (escena3d.cronometroVuelta segundos por vuelta). Marca el tiempo FÍSICO.
  const C = $("cronometro"); defs(C, "c"); const VUELTA = E.cronometroVuelta, cx = 80, cy = 106;
  canto(C, forma("circle", { cx, cy: 112, r: 76, fill: "#5E636E", stroke: INK, "stroke-width": 1.8 }));
  el("rect", { x: 69, y: 12, width: 22, height: 16, rx: 3, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1.4 }, C);
  for (let i = 0; i < 11; i++) el("line", { x1: 60 + i * 4, y1: 3, x2: 60 + i * 4, y2: 13, stroke: "#7C828E", "stroke-width": 1.1 }, C);
  el("rect", { x: 57, y: 1, width: 46, height: 13, rx: 6, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1.4 }, C);
  el("rect", { x: 61, y: 3, width: 38, height: 3, rx: 1.5, fill: "rgba(255,255,255,.7)" }, C);
  [[-40, 31, 32], [40, 129, 32]].forEach(([g, x, y]) => el("rect", { x: x - 7, y: y - 5, width: 14, height: 10, rx: 3, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1.3, transform: `rotate(${g} ${x} ${y})` }, C));
  el("circle", { cx, cy, r: 77, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1.8 }, C);
  el("circle", { cx, cy, r: 72, fill: "url(#ccromoInv)" }, C);
  el("circle", { cx, cy, r: 68.5, fill: "#8C929D" }, C);
  el("circle", { cx, cy, r: 67, fill: "url(#ccara)", stroke: "#B9BDC6", "stroke-width": .8 }, C);
  const DIV = VUELTA * 5;
  for (let i = 0; i < DIV; i++) { const a = i / DIV * 6.283, may = i % 25 === 0, med = i % 5 === 0; const [x1, y1] = pol(cx, cy, 64, a), [x2, y2] = pol(cx, cy, may ? 52 : med ? 56.5 : 60, a);
    el("line", { x1, y1, x2, y2, stroke: may ? "#C0392B" : INK, "stroke-width": may ? 2.2 : med ? 1.1 : .45 }, C); }
  el("circle", { cx, cy, r: 64.5, fill: "none", stroke: INK, "stroke-width": .5 }, C);
  for (let s = 5; s <= VUELTA; s += 5) { const [x, y] = pol(cx, cy, 44, s / VUELTA * 6.283); el("text", { x, y: y + 4, "text-anchor": "middle", "font-family": MONO, "font-size": 11, "font-weight": 500, fill: INK }, C).textContent = s; }
  el("text", { x: cx, y: 80, "text-anchor": "middle", "font-family": "Geist,sans-serif", "font-size": 5.6, "letter-spacing": 1.6, fill: "#6E7480" }, C).textContent = "CÓDICE VIVO";
  el("circle", { cx, cy: 131, r: 15, fill: "url(#ccromoInv)" }, C);
  el("circle", { cx, cy: 131, r: 13, fill: "#EFEBE2", stroke: "#8A8F99", "stroke-width": .8 }, C);
  for (let i = 0; i < 15; i++) { const a = i / 15 * 6.283, [x1, y1] = pol(cx, 131, 12.5, a), [x2, y2] = pol(cx, 131, i % 5 ? 10.8 : 9.5, a); el("line", { x1, y1, x2, y2, stroke: INK, "stroke-width": i % 5 ? .5 : .9 }, C); }
  el("line", { x1: cx, y1: 131, x2: cx, y2: 121, stroke: INK, "stroke-width": 1.2, "stroke-linecap": "round" }, C);
  el("circle", { cx, cy: 131, r: 1.6, fill: INK }, C);
  el("circle", { cx, cy, r: 67, fill: "url(#csombraInt)" }, C);
  const gC = aguja(C, cx, cy, (g, sombra) => {
    const rojo = sombra || "#C0392B";
    el("path", { d: `M${cx - 1.1} ${cy + 20} L ${cx - .7} ${cy - 58} L ${cx} ${cy - 62} L ${cx + .7} ${cy - 58} L ${cx + 1.1} ${cy + 20} Z`, fill: rojo }, g);
    el("circle", { cx, cy: cy + 16, r: 4, fill: rojo }, g);
    if (!sombra) el("circle", { cx, cy: cy + 16, r: 1.6, fill: "#F4F1EA" }, g);
  });
  el("circle", { cx, cy, r: 5.2, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1 }, C);
  el("circle", { cx, cy, r: 1.8, fill: "#C0392B" }, C);
  cristal(C, "c", cx, cy, 66);

  // Velocímetro de tablero, m/s y km/h (km/h = taller.formulas.kmh)
  const V = $("velocimetro"); defs(V, "v"); const MAX = E.velocimetroMax, A0 = -2.36, A1 = 2.36, ang = (v) => A0 + (A1 - A0) * Math.min(v, MAX) / MAX, vy = 98;
  canto(V, forma("circle", { cx, cy: 105, r: 78, fill: "#0B0C0F", stroke: INK, "stroke-width": 1.8 }));
  el("circle", { cx, cy: vy, r: 78, fill: "url(#vnegro)", stroke: INK, "stroke-width": 1.8 }, V);
  el("circle", { cx, cy: vy, r: 72, fill: "url(#vcromo)" }, V);
  el("circle", { cx, cy: vy, r: 68, fill: "url(#vcromoInv)" }, V);
  el("circle", { cx, cy: vy, r: 65.5, fill: "url(#vcaraOsc)" }, V);
  [-.78, .78, 3.14].forEach((a, i) => { const [x, y] = pol(cx, vy, 75, a * (i < 2 ? 2.4 : 1)); tornillo(V, "v", x, y, .4 + i); });
  const arco = (r, a, b, c, w, extra = {}) => { const [x1, y1] = pol(cx, vy, r, a), [x2, y2] = pol(cx, vy, r, b); return el("path", { d: `M${x1} ${y1} A ${r} ${r} 0 ${b - a > 3.14 ? 1 : 0} 1 ${x2} ${y2}`, fill: "none", stroke: c, "stroke-width": w, ...extra }, V); };
  arco(63.5, A0, A1, "#2A2D36", 3);
  const encendido = arco(63.5, A0, A0 + 1e-3, "#3FA581", 3, { "stroke-linecap": "round" });
  arco(58.5, ang(MAX * 5 / 6), ang(MAX), "#D9694F", 4.5);
  for (let v = 0; v <= MAX; v += 1) { const a = ang(v), may = v % 10 === 0, med = v % 5 === 0, [x1, y1] = pol(cx, vy, 61, a), [x2, y2] = pol(cx, vy, may ? 50 : med ? 54 : 57.5, a);
    el("line", { x1, y1, x2, y2, stroke: "#F4F1EA", "stroke-width": may ? 2 : med ? 1.1 : .55, opacity: may || med ? 1 : .7 }, V);
    if (may) { const [x, y] = pol(cx, vy, 42, a); el("text", { x, y: y + 4, "text-anchor": "middle", "font-family": MONO, "font-size": 10, "font-weight": 500, fill: "#F4F1EA" }, V).textContent = v; } }
  const kmhMax = D.calc({ v: MAX }).kmh;
  arco(31, A0, A1, "rgba(227,185,90,.45)", .6);
  for (let k = 0; k <= kmhMax + 1e-6; k += 10) { const a = ang(MAX * k / kmhMax), may = k % 50 === 0, [x1, y1] = pol(cx, vy, 31, a), [x2, y2] = pol(cx, vy, may ? 34.5 : 33, a);
    el("line", { x1, y1, x2, y2, stroke: "#E3B95A", "stroke-width": may ? .9 : .5 }, V);
    if (may) { const [x, y] = pol(cx, vy, 26, a); el("text", { x, y: y + 2.5, "text-anchor": "middle", "font-family": MONO, "font-size": 6.2, fill: "#E3B95A" }, V).textContent = k; } }
  el("rect", { x: 61, y: 122, width: 38, height: 14, rx: 2.5, fill: "#0A0B0D", stroke: "#3A3D47", "stroke-width": .8 }, V);
  el("text", { x: 95, y: 132.5, "text-anchor": "end", "font-family": MONO, "font-size": 9.5, fill: "#FFB347", opacity: .14 }, V).textContent = "88.8";
  const lcdV = el("text", { x: 95, y: 132.5, "text-anchor": "end", "font-family": MONO, "font-size": 9.5, "font-weight": 500, fill: "#FFB347" }, V);
  el("text", { x: cx, y: 145, "text-anchor": "middle", "font-family": MONO, "font-size": 7, fill: "#F4F1EA" }, V).textContent = "m/s";
  el("text", { x: cx, y: 153, "text-anchor": "middle", "font-family": MONO, "font-size": 6, fill: "#E3B95A" }, V).textContent = "km/h";
  el("circle", { cx, cy: vy, r: 65.5, fill: "url(#vsombraInt)" }, V);
  const gV = aguja(V, cx, vy, (g, sombra) => {
    el("path", { d: `M${cx - 2} ${vy + 12} L ${cx - .8} ${vy - 56} L ${cx} ${vy - 60} L ${cx + .8} ${vy - 56} L ${cx + 2} ${vy + 12} Z`, fill: sombra || "#FF6A3D" }, g);
    if (!sombra) el("path", { d: `M${cx - .35} ${vy - 4} L ${cx} ${vy - 57} L ${cx + .35} ${vy - 4} Z`, fill: "#FFD2B8" }, g);
  });
  el("circle", { cx, cy: vy, r: 7.5, fill: "url(#vnegro)", stroke: "#5A5E6B", "stroke-width": 1 }, V);
  el("circle", { cx: cx - 2, cy: vy - 2.4, r: 2.2, fill: "rgba(255,255,255,.35)" }, V);
  cristal(V, "v", cx, vy, 64);

  // Altímetro digital de muñeca: altitud − h (taller.formulas.alt)
  const L = $("altimetro"); defs(L, "a");
  canto(L, forma("rect", { x: 20, y: 40, width: 120, height: 128, rx: 30, fill: "#0E0F12" }));
  [[0, 50], [150, 50]].forEach(([y, hh]) => {
    el("rect", { x: 53, y, width: 54, height: hh, rx: 6, fill: "url(#acorrea)", stroke: INK, "stroke-width": 1.4 }, L);
    el("rect", { x: 57, y: y + 3, width: 46, height: hh - 6, rx: 4, fill: "none", stroke: "#5A5E6B", "stroke-width": .6, "stroke-dasharray": "2 1.6" }, L);
  });
  [162, 174, 186].forEach((y) => { el("ellipse", { cx: 80, cy: y, rx: 3.2, ry: 2.3, fill: "#0E0F12" }, L); el("ellipse", { cx: 80, cy: y + .6, rx: 2.4, ry: 1.2, fill: "rgba(255,255,255,.12)" }, L); });
  el("rect", { x: 61, y: 6, width: 38, height: 9, rx: 2, fill: "none", stroke: "url(#acromo)", "stroke-width": 3 }, L);
  el("rect", { x: 20, y: 34, width: 120, height: 128, rx: 30, fill: "url(#anegro)", stroke: INK, "stroke-width": 1.8 }, L);
  el("rect", { x: 24, y: 38, width: 112, height: 120, rx: 27, fill: "none", stroke: "#3FA581", "stroke-width": 3.4 }, L);
  for (let i = 0; i < 24; i++) {                                    // muescas del bisel
    const s = i / 24 * 2 * (104 + 116);
    const [x, y] = s < 104 ? [28 + s, 40] : s < 220 ? [132, 40 + s - 104] : s < 324 ? [132 - (s - 220), 156] : [28, 156 - (s - 324)];
    el("circle", { cx: x, cy: y, r: .9, fill: "#C8F0DD", opacity: .55 }, L);
  }
  [[16, 66], [144, 66], [16, 124], [144, 124]].forEach(([x, y]) => { el("rect", { x: x - 4.5, y: y - 9, width: 9, height: 18, rx: 3, fill: "url(#acromo)", stroke: INK, "stroke-width": 1.2 }, L);
    for (let k = -1; k <= 1; k++) el("line", { x1: x - 2.5, y1: y + k * 4, x2: x + 2.5, y2: y + k * 4, stroke: "#6E7480", "stroke-width": .6 }, L); });
  el("rect", { x: 34, y: 50, width: 92, height: 76, rx: 9, fill: "#0A0B0D" }, L);
  el("rect", { x: 37, y: 53, width: 86, height: 70, rx: 7, fill: "url(#alcd)" }, L);
  el("rect", { x: 37, y: 53, width: 86, height: 5, rx: 3, fill: "rgba(0,0,0,.12)" }, L);
  el("text", { x: 44, y: 67, "font-family": MONO, "font-size": 7.5, fill: "#3B4A3A" }, L).textContent = "ALT";
  el("text", { x: 116, y: 67, "text-anchor": "end", "font-family": MONO, "font-size": 7.5, fill: "#3B4A3A" }, L).textContent = "m";
  const baja = el("path", { d: "M62 61 L 68 61 L 65 66 Z", fill: "#1E2A22", opacity: .15 }, L);
  el("text", { x: 116, y: 102, "text-anchor": "end", "font-family": MONO, "font-size": 27, "font-weight": 500, fill: "#1E2A22", opacity: .09 }, L).textContent = "8888";
  const alt = el("text", { x: 116, y: 102, "text-anchor": "end", "font-family": MONO, "font-size": 27, "font-weight": 500, fill: "#1E2A22" }, L);
  el("rect", { x: 44, y: 108, width: 72, height: 6, rx: 1, fill: "none", stroke: "#3B4A3A", "stroke-width": .7 }, L);
  for (let k = 1; k < 6; k++) el("line", { x1: 44 + k * 12, y1: 114, x2: 44 + k * 12, y2: 116.5, stroke: "#3B4A3A", "stroke-width": .5 }, L);
  const barra = el("rect", { x: 45, y: 109, width: 0, height: 4, fill: "#1E2A22" }, L);
  const caida = el("text", { x: 80, y: 141, "text-anchor": "middle", "font-family": "Geist,sans-serif", "font-size": 7, "letter-spacing": 1.5, fill: "#8FE3C0", opacity: .3 }, L);
  caida.textContent = "FREEFALL";
  el("rect", { x: 37, y: 53, width: 86, height: 70, rx: 7, fill: "url(#abrillo)", opacity: .35 }, L);
  el("path", { d: "M40 56 L 78 56 L 50 120 L 40 120 Z", fill: "rgba(255,255,255,.18)" }, L);

  const HT = D.calc({ t: D.TC }).h;
  let ant = null;
  return (t) => {
    if (t === ant) return; ant = t;
    const v = D.calc({ t }), f = D.fmt(v);
    gC(t / VUELTA * 360);
    gV(ang(v.v) * 180 / Math.PI);
    const [x1, y1] = pol(cx, vy, 63.5, A0), [x2, y2] = pol(cx, vy, 63.5, ang(v.v) + 1e-3);
    encendido.setAttribute("d", `M${x1} ${y1} A 63.5 63.5 0 ${ang(v.v) - A0 > 3.14 ? 1 : 0} 1 ${x2} ${y2}`);
    lcdV.textContent = f.v;
    alt.textContent = D.num(v.alt, 0).replace(/\s/g, ""); barra.setAttribute("width", Math.min(70, v.h / HT * 70));
    caida.setAttribute("opacity", t > 0 ? 1 : .3); baja.setAttribute("opacity", t > 0 ? 1 : .15);
    $("nCrono").textContent = D.tpl(X.cronometro, f);
    $("nVel").textContent = D.tpl(X.velocimetro, f);
    $("nAlt").textContent = D.tpl(X.altimetro, f);
  };
}

// ---------- regla de la mesa: 0 … h(TC) cada «tri» m ----------
export function regla(D, cont) {
  const HT = D.calc({ t: D.TC }).h, paso = D.v0.tri, n = Math.round(HT / paso);
  for (let i = 0; i <= n; i++) {
    const s = document.createElement("span");
    s.style.left = i < n ? `calc(${(i / n) * 100}% + 2px)` : "auto"; if (i === n) s.style.right = "2px";
    s.textContent = D.num(i * paso, 0);
    cont.appendChild(s);
  }
  cont.style.setProperty("--div", n);
}

// ---------- cámara de la mesa: inclinada al correr, plana al leer, casi cenital en reposo ----------
export function camaraMesa(plano, estado) {
  let ant = "";
  (function mira() {
    const modo = estado();
    if (modo !== ant) { plano.classList.remove("casi", "inclinada", "plana"); plano.classList.add(modo); ant = modo; }
    requestAnimationFrame(mira);
  })();
}

// ---------- hoja levantada (FLIP de la miniatura a la hoja de frente) ----------
export function hojaLevantada({ mesa, lev, reduce, origenDe }) {
  let visible = false;
  function fija() { if (innerWidth > 700) { const w = Math.min(innerWidth * .94, 520); lev.style.left = (mesa.clientWidth - w) / 2 + "px"; } }
  function delta(origen) {
    const a = origen.getBoundingClientRect(), b = lev.getBoundingClientRect();
    return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / Math.max(1, b.height)})`;
  }
  function sube(origen) {
    visible = true; lev.dataset.origen = origen.id; lev.hidden = false; fija();
    if (reduce) return;
    lev.style.transition = "none"; lev.style.transform = delta(origen); lev.style.opacity = .4;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      lev.style.transition = "transform .55s cubic-bezier(.2,.9,.25,1.05), opacity .3s"; lev.style.transform = "none"; lev.style.opacity = 1;
    }));
  }
  function baja(origen) {
    visible = false;
    if (reduce) { lev.hidden = true; return; }
    lev.style.transition = "transform .4s ease-in, opacity .4s"; lev.style.transform = delta(origen); lev.style.opacity = 0;
    setTimeout(() => { if (!visible) lev.hidden = true; }, 400);
  }
  addEventListener("resize", fija);
  return {
    poner(quiere, origen) { if (quiere && !visible) sube(origen); if (!quiere && visible) baja(origenDe(lev.dataset.origen)); },
    get visible() { return visible; },
  };
}
