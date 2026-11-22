// La mesa del taller (boceto 9): borde pintado de la lámina, instrumentos (cronómetro, velocímetro,
// altímetro), regla, cámara de la mesa que se acomoda y hoja que se levanta para leer.
// Sin three.js: se ve desde el primer momento, antes de cargar el 3D.
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg", INK = "#1E1D25";
const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
const pol = (cx, cy, r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];

// ---------- borde de pintura: se borra el centro con pinceladas irregulares ----------
export function bordePintado(cv, maq) {
  const azar = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
  function pinta() {
    const r = maq.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2), W = r.width + 4, H = r.height + 4;
    cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext("2d"); x.scale(dpr, dpr);
    x.fillStyle = "#FBFAF5"; x.fillRect(0, 0, W, H);
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
}

function defs(svg, pre) {
  const d = el("defs", {}, svg);
  const lin = (id, st, x2 = 0, y2 = 1) => { const g = el("linearGradient", { id: pre + id, x1: 0, y1: 0, x2, y2 }, d); st.forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, g)); };
  lin("cromo", [[0, "#FAFBFD"], [.35, "#B8BDC7"], [.55, "#EEF0F4"], [.8, "#8E94A0"], [1, "#D9DDE4"]], 1, 1);
  lin("negro", [[0, "#5A5E6B"], [.5, "#2B2D35"], [1, "#16171C"]], 0, 1);
  lin("cara", [[0, "#FFFFFF"], [1, "#ECE9E1"]]);
  lin("brillo", [[0, "rgba(255,255,255,.75)"], [1, "rgba(255,255,255,0)"]]);
  lin("goma", [[0, "#4A4E5A"], [.5, "#30333C"], [1, "#4A4E5A"]], 1, 0);
  lin("lcd", [[0, "#D5E6CF"], [1, "#B8CFB0"]]);
  return d;
}
const vidrio = (svg, pre, cx, cy, r) => el("path", { d: `M${cx - r * .8} ${cy - r * .35} A ${r} ${r} 0 0 1 ${cx + r * .55} ${cy - r * .85} A ${r * 1.15} ${r * 1.15} 0 0 0 ${cx - r * .8} ${cy - r * .35} Z`, fill: `url(#${pre}brillo)`, opacity: .9 }, svg);
const canto = (svg, e) => svg.querySelector("defs").after(e);
const forma = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };

// ---------- instrumentos: devuelven la función que los mueve ----------
export function instrumentos(D) {
  const E = D.esc, X = D.T.textos;
  // Cronómetro mecánico (escena3d.cronometroVuelta segundos por vuelta)
  const C = $("cronometro"); defs(C, "c"); const VUELTA = E.cronometroVuelta;
  canto(C, forma("circle", { cx: 80, cy: 112, r: 76, fill: "#6E7480", stroke: INK, "stroke-width": 1.8 }));
  el("rect", { x: 68, y: 10, width: 24, height: 16, rx: 3, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1.5 }, C);
  for (let i = 0; i < 9; i++) el("line", { x1: 63 + i * 4.2, y1: 2, x2: 63 + i * 4.2, y2: 12, stroke: "#7C828E", "stroke-width": 1.2 }, C);
  el("rect", { x: 60, y: 1, width: 40, height: 12, rx: 5, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1.5 }, C);
  el("rect", { x: 24, y: 28, width: 14, height: 9, rx: 3, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1.4, transform: "rotate(-40 31 32)" }, C);
  el("circle", { cx: 80, cy: 106, r: 76, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1.8 }, C);
  el("circle", { cx: 80, cy: 106, r: 68, fill: "#9AA0AB" }, C);
  el("circle", { cx: 80, cy: 106, r: 65, fill: "url(#ccara)", stroke: "#6E7480", "stroke-width": 1 }, C);
  const DIV = VUELTA * 5;
  for (let i = 0; i < DIV; i++) { const a = i / DIV * 6.283, may = i % 25 === 0, med = i % 5 === 0; const [x1, y1] = pol(80, 106, 63, a), [x2, y2] = pol(80, 106, may ? 52 : med ? 56 : 59.5, a);
    el("line", { x1, y1, x2, y2, stroke: may ? "#C0392B" : INK, "stroke-width": may ? 2 : med ? 1.1 : .45 }, C); }
  for (let s = 5; s <= VUELTA; s += 5) { const [x, y] = pol(80, 106, 44, s / VUELTA * 6.283); el("text", { x, y: y + 4, "text-anchor": "middle", "font-family": "Geist Mono,monospace", "font-size": 11, "font-weight": 500, fill: INK }, C).textContent = s; }
  el("circle", { cx: 80, cy: 130, r: 13, fill: "#F4F1EA", stroke: "#8A8F99", "stroke-width": 1 }, C);
  for (let i = 0; i < 15; i++) { const a = i / 15 * 6.283, [x1, y1] = pol(80, 130, 12, a), [x2, y2] = pol(80, 130, 10, a); el("line", { x1, y1, x2, y2, stroke: INK, "stroke-width": .6 }, C); }
  el("line", { x1: 80, y1: 130, x2: 80, y2: 120, stroke: INK, "stroke-width": 1.2 }, C);
  const agC = el("g", {}, C);
  el("line", { x1: 80, y1: 124, x2: 80, y2: 46, stroke: "#C0392B", "stroke-width": 1.8, "stroke-linecap": "round" }, agC);
  el("circle", { cx: 80, cy: 120, r: 3.2, fill: "#C0392B" }, agC);
  el("circle", { cx: 80, cy: 106, r: 4.5, fill: "url(#ccromo)", stroke: INK, "stroke-width": 1 }, C);
  vidrio(C, "c", 80, 106, 62);

  // Velocímetro de tablero, m/s y km/h (km/h = taller.formulas.kmh)
  const V = $("velocimetro"); defs(V, "v"); const MAX = E.velocimetroMax, A0 = -2.36, A1 = 2.36, ang = (v) => A0 + (A1 - A0) * v / MAX;
  canto(V, forma("circle", { cx: 80, cy: 105, r: 78, fill: "#0E0F12", stroke: INK, "stroke-width": 1.8 }));
  el("circle", { cx: 80, cy: 98, r: 78, fill: "url(#vnegro)", stroke: INK, "stroke-width": 1.8 }, V);
  el("circle", { cx: 80, cy: 98, r: 70, fill: "url(#vcromo)" }, V);
  el("circle", { cx: 80, cy: 98, r: 65, fill: "#16171C" }, V);
  [[-.78], [.78], [0]].forEach(([a]) => { const [x, y] = pol(80, 98, 74, a * 2.4 + (a === 0 ? 3.14 : 0)); el("circle", { cx: x, cy: y, r: 3, fill: "url(#vcromo)", stroke: INK, "stroke-width": .8 }, V); el("line", { x1: x - 2, y1: y, x2: x + 2, y2: y, stroke: INK, "stroke-width": .8 }, V); });
  const arco = (r, a, b, c, w) => { const [x1, y1] = pol(80, 98, r, a), [x2, y2] = pol(80, 98, r, b); el("path", { d: `M${x1} ${y1} A ${r} ${r} 0 ${b - a > 3.14 ? 1 : 0} 1 ${x2} ${y2}`, fill: "none", stroke: c, "stroke-width": w }, V); };
  arco(59, ang(MAX * 5 / 6), ang(MAX), "#D9694F", 4);
  for (let v = 0; v <= MAX; v += 2) { const a = ang(v), may = v % 10 === 0, [x1, y1] = pol(80, 98, 62, a), [x2, y2] = pol(80, 98, may ? 51 : 57, a); el("line", { x1, y1, x2, y2, stroke: "#F4F1EA", "stroke-width": may ? 2 : .9 }, V);
    if (may) { const [x, y] = pol(80, 98, 42, a); el("text", { x, y: y + 4, "text-anchor": "middle", "font-family": "Geist Mono,monospace", "font-size": 10, "font-weight": 500, fill: "#F4F1EA" }, V).textContent = v; } }
  const kmhMax = D.calc({ v: MAX }).kmh;
  for (let k = 0; k <= kmhMax + 1e-6; k += 50) { const vEq = MAX * k / kmhMax, [x, y] = pol(80, 98, 27, ang(vEq)); el("text", { x, y: y + 3, "text-anchor": "middle", "font-family": "Geist Mono,monospace", "font-size": 6.5, fill: "#E3B95A" }, V).textContent = k; }
  el("text", { x: 80, y: 140, "text-anchor": "middle", "font-family": "Geist Mono,monospace", "font-size": 7.5, fill: "#F4F1EA" }, V).textContent = "m/s";
  el("text", { x: 80, y: 149, "text-anchor": "middle", "font-family": "Geist Mono,monospace", "font-size": 6.5, fill: "#E3B95A" }, V).textContent = "km/h";
  const agV = el("g", {}, V); el("path", { d: "M78.5 108 L 80 40 L 81.5 108 Z", fill: "#FF6A3D" }, agV);
  el("circle", { cx: 80, cy: 98, r: 7, fill: "url(#vnegro)", stroke: "#5A5E6B", "stroke-width": 1 }, V);
  vidrio(V, "v", 80, 98, 62);

  // Altímetro digital de muñeca: altitud − h (taller.formulas.alt)
  const L = $("altimetro"); defs(L, "a");
  canto(L, forma("rect", { x: 20, y: 40, width: 120, height: 128, rx: 30, fill: "#0E0F12" }));
  el("rect", { x: 54, y: 0, width: 52, height: 52, rx: 6, fill: "url(#agoma)", stroke: INK, "stroke-width": 1.5 }, L);
  el("rect", { x: 54, y: 148, width: 52, height: 52, rx: 6, fill: "url(#agoma)", stroke: INK, "stroke-width": 1.5 }, L);
  [160, 172, 184].forEach((y) => el("ellipse", { cx: 80, cy: y, rx: 3, ry: 2.2, fill: "#16171C" }, L));
  el("rect", { x: 62, y: 6, width: 36, height: 8, rx: 2, fill: "none", stroke: "url(#acromo)", "stroke-width": 3 }, L);
  el("rect", { x: 20, y: 34, width: 120, height: 128, rx: 30, fill: "url(#anegro)", stroke: INK, "stroke-width": 1.8 }, L);
  el("rect", { x: 25, y: 39, width: 110, height: 118, rx: 26, fill: "none", stroke: "#3FA581", "stroke-width": 3 }, L);
  [[16, 66], [144, 66], [16, 124], [144, 124]].forEach(([x, y]) => el("rect", { x: x - 4, y: y - 8, width: 8, height: 16, rx: 3, fill: "url(#acromo)", stroke: INK, "stroke-width": 1.2 }, L));
  el("rect", { x: 36, y: 52, width: 88, height: 70, rx: 8, fill: "url(#alcd)", stroke: "#0E0F12", "stroke-width": 2 }, L);
  el("text", { x: 44, y: 66, "font-family": "Geist Mono,monospace", "font-size": 7.5, fill: "#3B4A3A" }, L).textContent = "ALT";
  el("text", { x: 116, y: 66, "text-anchor": "end", "font-family": "Geist Mono,monospace", "font-size": 7.5, fill: "#3B4A3A" }, L).textContent = "m";
  const alt = el("text", { x: 116, y: 104, "text-anchor": "end", "font-family": "Geist Mono,monospace", "font-size": 27, "font-weight": 500, fill: "#1E2A22" }, L);
  const barra = el("rect", { x: 44, y: 110, width: 0, height: 4, fill: "#1E2A22" }, L);
  el("text", { x: 80, y: 140, "text-anchor": "middle", "font-family": "Geist,sans-serif", "font-size": 7, "letter-spacing": 1.5, fill: "#BFC3D6" }, L).textContent = "FREEFALL";
  vidrio(L, "a", 80, 88, 40);

  const HT = D.calc({ t: D.TC }).h;
  return (t) => {
    const v = D.calc({ t }), f = D.fmt(v);
    agC.setAttribute("transform", `rotate(${t / VUELTA * 360} 80 106)`);
    agV.setAttribute("transform", `rotate(${ang(v.v) * 180 / Math.PI} 80 98)`);
    alt.textContent = D.num(v.alt, 0).replace(/\s/g, ""); barra.setAttribute("width", Math.min(72, v.h / HT * 72));
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
