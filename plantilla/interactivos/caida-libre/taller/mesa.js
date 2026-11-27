// La mesa del taller: borde pintado de la lámina, instrumentos (cronómetro, velocímetro, altímetro) sobre
// el estuche pre-renderizado, regla y hoja que se levanta para leer. La mesa es recta (cenital).
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
  rad("sombraInt", [[0, "rgba(0,0,0,0)"], [.84, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.30)"]]);
  rad("cristal", [[0, "rgba(255,255,255,.5)"], [.6, "rgba(255,255,255,.1)"], [1, "rgba(255,255,255,0)"]], .32, .22, .7);
  lin("brillo", [[0, "rgba(255,255,255,.7)"], [1, "rgba(255,255,255,0)"]]);
  return d;
}
// Cristal: brillo radial + reflejo curvo arriba a la izquierda + filo de luz abajo a la derecha.
function cristal(svg, pre, cx, cy, r) {
  el("circle", { cx, cy, r, fill: `url(#${pre}cristal)` }, svg);
  el("path", { d: `M${cx - r * .8} ${cy - r * .35} A ${r} ${r} 0 0 1 ${cx + r * .55} ${cy - r * .85} A ${r * 1.15} ${r * 1.15} 0 0 0 ${cx - r * .8} ${cy - r * .35} Z`, fill: `url(#${pre}brillo)`, opacity: .8 }, svg);
  const [x1, y1] = pol(cx, cy, r - 2, 2.0), [x2, y2] = pol(cx, cy, r - 2, 2.9);
  el("path", { d: `M${x1} ${y1} A ${r - 2} ${r - 2} 0 0 1 ${x2} ${y2}`, fill: "none", stroke: "rgba(255,255,255,.7)", "stroke-width": 1.4, "stroke-linecap": "round" }, svg);
}
// Cuerpo pre-renderizado (Blender, modelos/mesa/fuentes/instrumentos.py): ocupa el viewBox completo.
const cuerpo = (svg, href, w, h) => el("image", { href, x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none" }, svg);
// Aguja con sombra: la sombra va desplazada en pantalla (no gira con la aguja).
function aguja(svg, cx, cy, dibuja) {
  const s = el("g", { opacity: .28 }, svg), a = el("g", {}, svg);
  dibuja(s, "#000000"); dibuja(a, null);
  return (grados) => { s.setAttribute("transform", `translate(1.6 2.6) rotate(${grados} ${cx} ${cy})`); a.setAttribute("transform", `rotate(${grados} ${cx} ${cy})`); };
}

// ---------- instrumentos: cuerpos renderizados + capa SVG animada; devuelven la función que los mueve ----------
export function instrumentos(D, ruta) {
  const E = D.esc, X = D.T.textos, CI = D.cine.instrumentos, XI = CI.textos, MONO = "Geist Mono,monospace";
  const colSeg = ["#E3B95A", "#3FA581", "#D9694F"];                     // 1 s amarillo, 2 s menta, 3 s coral (los tramos)

  // Cronómetro de competencia (escena3d.cronometroVuelta s por vuelta). Aguja principal + aguja de vueltas (split)
  // que se queda en 1, 2 y 3 s. Marca el tiempo FÍSICO. El botón (corona) se hunde al arrancar.
  const C = $("cronometro"); defs(C, "c"); const VUELTA = E.cronometroVuelta, cx = 80, cy = 106;
  cuerpo(C, ruta + "inst-crono.webp", 160, 190);
  const corona = cuerpo(C, ruta + "inst-crono-corona.webp", 160, 190);
  const DIV = VUELTA * 5;
  for (let i = 0; i < DIV; i++) { const a = i / DIV * 6.283, may = i % 25 === 0, med = i % 5 === 0; const [x1, y1] = pol(cx, cy, 64, a), [x2, y2] = pol(cx, cy, may ? 52 : med ? 56.5 : 60, a);
    el("line", { x1, y1, x2, y2, stroke: may ? "#C0392B" : INK, "stroke-width": may ? 2.2 : med ? 1.1 : .45 }, C); }
  el("circle", { cx, cy, r: 64.5, fill: "none", stroke: INK, "stroke-width": .5 }, C);
  for (let s = 5; s <= VUELTA; s += 5) { const [x, y] = pol(cx, cy, 44, s / VUELTA * 6.283); el("text", { x, y: y + 4, "text-anchor": "middle", "font-family": MONO, "font-size": 11, "font-weight": 500, fill: INK }, C).textContent = s; }
  el("text", { x: cx, y: 80, "text-anchor": "middle", "font-family": "Geist,sans-serif", "font-size": 5.6, "letter-spacing": 1.6, fill: "#6E7480" }, C).textContent = "CÓDICE VIVO";
  el("circle", { cx, cy: 131, r: 13, fill: "#EFEBE2", stroke: "#8A8F99", "stroke-width": .8 }, C);
  for (let i = 0; i < 15; i++) { const a = i / 15 * 6.283, [x1, y1] = pol(cx, 131, 12.5, a), [x2, y2] = pol(cx, 131, i % 5 ? 10.8 : 9.5, a); el("line", { x1, y1, x2, y2, stroke: INK, "stroke-width": i % 5 ? .5 : .9 }, C); }
  el("line", { x1: cx, y1: 131, x2: cx, y2: 121, stroke: INK, "stroke-width": 1.2, "stroke-linecap": "round" }, C);
  el("circle", { cx, cy: 131, r: 1.6, fill: INK }, C);
  el("circle", { cx, cy, r: 67, fill: "url(#csombraInt)" }, C);
  const gS = aguja(C, cx, cy, (g, sombra) => {                         // vueltas (split): azul, más delgada
    el("path", { d: `M${cx - .8} ${cy + 14} L ${cx - .5} ${cy - 57} L ${cx} ${cy - 61} L ${cx + .5} ${cy - 57} L ${cx + .8} ${cy + 14} Z`, fill: sombra || "#3D6FCB" }, g);
  });
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
  cuerpo(V, ruta + "inst-velo.webp", 160, 190);
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

  // Altímetro digital de muñeca: altitud − h (taller.formulas.alt). El cuerpo y la pantalla vacía son el render.
  const L = $("altimetro"); defs(L, "a");
  cuerpo(L, ruta + "inst-alti.webp", 160, 200);
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
  el("path", { d: "M40 56 L 78 56 L 50 120 L 40 120 Z", fill: "rgba(255,255,255,.16)" }, L);

  // Altímetro analógico de paracaidista: carátula 0–altimetroMax m, una vuelta. Con 45 m de caída la aguja
  // apenas gira (≈ 4°): es realista y la etiqueta lo dice.
  const A = $("altimetroA"); defs(A, "n"); const AMAX = CI.altimetroMax, ax = 80, ay = 80;
  cuerpo(A, ruta + "inst-altia.webp", 160, 160);
  for (let m = 0; m < AMAX; m += CI.altimetroPaso) {
    const a = m / AMAX * 6.283, may = m % 1000 === 0, med = m % 500 === 0, [x1, y1] = pol(ax, ay, 56, a), [x2, y2] = pol(ax, ay, may ? 45 : med ? 49 : 52, a);
    el("line", { x1, y1, x2, y2, stroke: INK, "stroke-width": may ? 2.4 : med ? 1.3 : .6 }, A);
    if (may) { const [x, y] = pol(ax, ay, 35, a); el("text", { x, y: y + 6, "text-anchor": "middle", "font-family": "Bricolage Grotesque,sans-serif", "font-size": 17, "font-weight": 800, fill: INK }, A).textContent = m / 1000; }
  }
  el("text", { x: ax, y: ay + 22, "text-anchor": "middle", "font-family": MONO, "font-size": 6.5, fill: "#6E7480" }, A).textContent = XI.altimetroEscala;
  el("circle", { cx: ax, cy: ay, r: 57, fill: "url(#nsombraInt)" }, A);
  const gA = aguja(A, ax, ay, (g, sombra) => {
    el("path", { d: `M${ax - 3} ${ay + 12} L ${ax - 1.2} ${ay - 44} L ${ax} ${ay - 50} L ${ax + 1.2} ${ay - 44} L ${ax + 3} ${ay + 12} Z`, fill: sombra || INK }, g);
    if (!sombra) el("path", { d: `M${ax - 1.2} ${ay - 36} L ${ax} ${ay - 50} L ${ax + 1.2} ${ay - 36} Z`, fill: "#F0644A" }, g);
  });
  el("circle", { cx: ax, cy: ay, r: 5, fill: "url(#ncromo)", stroke: INK, "stroke-width": 1 }, A);
  cristal(A, "n", ax, ay, 56);

  // Registrador de cinta: la tira la jala la caída; un punto cada «intervalo» s de tiempo físico. El primer
  // punto es el más lejano (sale primero); la separación entre puntos crece 1:3:5 por segundo.
  const R = $("registro"), RW = 600, X0 = 132, XF = 592, HT = D.calc({ t: D.TC }).h, K = (XF - X0) / HT;
  const dt = CI.registro.intervalo, nPts = Math.round(D.TC / dt);
  el("image", { href: ruta + "inst-registrador.webp", x: 0, y: 10, width: 140, height: 90 }, R);
  const tira = el("rect", { x: X0 - 4, y: 52, width: 0, height: 16, fill: "#FFFDF6", stroke: "#C9C2B0", "stroke-width": .8 }, R);
  R.insertBefore(tira, R.firstChild);                                    // la tira pasa por debajo del aparato
  const puntos = Array.from({ length: nPts + 1 }, (_, i) => {
    const k = Math.min(D.TC, i * dt), seg = Math.max(1, Math.ceil(k - 1e-9));
    return { t: k, h: D.calc({ t: k }).h, c: el("circle", { cx: X0, cy: 60, r: 2.8, fill: i ? colSeg[(seg - 1) % 3] : INK, opacity: 0 }, R), _: 0 };
  });
  const hk = (k) => D.calc({ t: k }).h, mitad = D.tramos.map((_, i) => (hk(i) + hk(i + 1)) / 2);
  const etqSeg = D.tramos.map((_, i) => el("text", { x: 0, y: 86, "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 600, fill: colSeg[i % 3], opacity: 0 }, R));
  etqSeg.forEach((e, i) => (e.textContent = D.tpl(XI.registroSeg, { k: i + 1 })));
  $("nReg").textContent = D.tpl(XI.registro, { dt: D.num(dt, 2) });
  $("nAltA").textContent = D.tpl(XI.altimetroNota, { h: D.num(HT, 0), grados: D.num(HT / AMAX * 360, 0) });

  let ant = null;
  return (t) => {
    if (t === ant) return; ant = t;
    const v = D.calc({ t }), f = D.fmt(v);
    gC(t / VUELTA * 360);
    gS((t < 1 ? t : Math.min(D.TC, Math.floor(t + 1e-9))) / VUELTA * 360);
    corona.setAttribute("transform", t > 0 ? "translate(0 3.2)" : "");
    gV(ang(v.v) * 180 / Math.PI);
    const [x1, y1] = pol(cx, vy, 63.5, A0), [x2, y2] = pol(cx, vy, 63.5, ang(v.v) + 1e-3);
    encendido.setAttribute("d", `M${x1} ${y1} A 63.5 63.5 0 ${ang(v.v) - A0 > 3.14 ? 1 : 0} 1 ${x2} ${y2}`);
    lcdV.textContent = f.v;
    alt.textContent = D.num(v.alt, 0).replace(/\s/g, ""); barra.setAttribute("width", Math.min(70, v.h / HT * 70));
    caida.setAttribute("opacity", t > 0 ? 1 : .3); baja.setAttribute("opacity", t > 0 ? 1 : .15);
    gA(v.alt / AMAX * 360);
    // cinta: cada punto ya hecho está a h(t) − h(t_i) de la salida del aparato
    tira.setAttribute("width", t > 0 ? v.h * K + 10 : 0);
    puntos.forEach((p) => { const on = t > 0 && p.t <= t + 1e-9; p.c.setAttribute("opacity", on ? 1 : 0); if (on) p.c.setAttribute("cx", X0 + 4 + (v.h - p.h) * K); });
    etqSeg.forEach((e, i) => {
      const on = t >= i + 1 - 1e-9; e.setAttribute("opacity", on ? 1 : 0);
      if (on) e.setAttribute("x", X0 + 4 + (v.h - mitad[i]) * K);
    });
    const k = t < 1 ? 0 : Math.min(D.tramos.length, Math.floor(t + 1e-9));
    $("nCrono").textContent = k ? D.tpl(XI.cronoVuelta, { ...f, k }) : D.tpl(X.cronometro, f);
    $("nVel").textContent = D.tpl(X.velocimetro, f);
    $("nAlt").textContent = D.tpl(X.altimetro, f);
  };
}

// ---------- cotas de plano técnico: 0 · h(1) · h(2) · h(3) m (de las fórmulas); cada tramo se llena en su segundo ----------
export function cotas(D, cont) {
  const XI = D.cine.instrumentos.textos, claves = D.tramos.map((_, i) => D.porK("hk", i + 1));
  const cero = document.createElement("div"); cero.className = "cota-0";
  cero.innerHTML = `<span class="fin">${D.tpl(XI.cotaMarca, { x: 0 })}</span>`; cont.appendChild(cero);
  const tramos = D.tramos.map((s, i) => {
    const d = document.createElement("div"); d.className = `cota-tramo s${i % 3 + 1}`; d.style.flex = `${s} 1 0`;
    d.innerHTML = `<span class="rot">${D.tpl(XI.cotaSeg, { k: i + 1 })}<br>${D.tpl(XI.cotaTramo, { x: D.num(s, 0) })}</span><span class="fin">${D.tpl(XI.cotaMarca, { x: D.num(claves[i], 0) })}</span>`;
    cont.appendChild(d); return d;
  });
  let ant = null;
  return (t) => {
    if (t === ant) return; ant = t;
    const h = D.calc({ t }).h;
    tramos.forEach((d, i) => {
      const a = i ? claves[i - 1] : 0, k = Math.max(0, Math.min(1, (h - a) / (claves[i] - a)));
      d.style.setProperty("--k", (k * 100).toFixed(1) + "%"); d.classList.toggle("on", t > i + 1e-9 && k > 0);
    });
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

// ---------- hoja levantada (FLIP de la miniatura a la hoja de frente) ----------
export function hojaLevantada({ mesa, lev, reduce, origenDe }) {
  let visible = false;
  function fija() {
    if (innerWidth <= 700) { lev.style.width = ""; return; }
    const w = Math.min(innerWidth * .94, 520, mesa.clientWidth - 16);         // en PC lado a lado, la mesa mide ~42 %
    lev.style.width = w + "px"; lev.style.left = (mesa.clientWidth - w) / 2 + "px";
  }
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
