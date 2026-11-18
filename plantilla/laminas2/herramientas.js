/* Códice Vivo · Láminas 2.0 · Herramientas (ver docs/diseno-laminas-2.md)
   Regla, cronómetro, transportador y velocidad. Una a la vez (abrir una cierra la otra), dibujadas sobre la
   escena y con una lectura grande encima de ella. Están pegadas a la física:
     · Regla: sus extremos se pegan al balón, a las marcas del rastro, a los puntos especiales (cima, caída) y al suelo.
     · Cronómetro: ligado al reloj de la simulación; tocar dos marcas del rastro da el tiempo entre ellas.
     · Transportador: centrado en el balón y alineado con su velocidad en ese instante (al inicio, el ángulo de salida).
     · Velocidad: flechas vx / vy grandes sobre el balón, que siguen el tiempo.
   «Anotar» manda la medida al cuaderno. Trabajan en metros del mundo, así sirven en cualquier escena.

   const herr = creaHerramientas({ barra, lectura, reloj: () => t,
     movil: { pos(t) → [x, y], vel(t) → [vx, vy] | null },
     imanes: () → [{ p: [x, y], nombre }],        (puntos donde se pega la regla: balón, cima, caída…)
     marcas: () → [{ t, p: [x, y] }],             (marcas del rastro, para el cronómetro y la regla)
     suelo: () → y, anota(texto), alDibujar() });
   herr.usa(escena) · herr.actualiza() · herr.vectores(si) · herr.activa(id | null) · herr.activa_ (id actual) */

const NS = "http://www.w3.org/2000/svg";
const el = (t, at = {}, par) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; };
const r1 = (v) => Math.round(v * 10) / 10;
const num = (v, dec = 1) => { const k = 10 ** dec, r = Math.round(v * k) / k; return (r < 0 ? "−" : "") + String(Math.abs(r)); };

const ICONOS = {
  regla: '<path d="M2 13L13 2l5 5L7 18z"/><path d="M5 10l2 2M8 7l1.5 1.5M11 4l2 2"/>',
  cronometro: '<circle cx="10" cy="11.5" r="6.5"/><path d="M10 11.5V8M8 2.5h4M15 6l1.3-1.3"/>',
  transportador: '<path d="M2.5 15.5a7.5 7.5 0 0 1 15 0z"/><path d="M10 15.5L14.5 9.5"/>',
  velocidad: '<path d="M4 16h11M12 13l3 3-3 3M4 16V5M1.5 7.5L4 5l2.5 2.5"/>'
};
const NOMBRES = { regla: "Regla", cronometro: "Cronómetro", transportador: "Transportador", velocidad: "Velocidad" };

export function creaHerramientas(o) {
  const lista = o.lista || ["regla", "cronometro", "transportador", "velocidad"];
  let escena = null, auto = false, actual = null;
  const regla = { a: [0, 0], b: [10, 0], na: "", nb: "" }, crono = { sel: [] };

  /* ---------- Barra de botones (HTML) ---------- */
  const barra = o.barra;
  barra.classList.add("l2-herr");
  barra.setAttribute("role", "group"); barra.setAttribute("aria-label", "Herramientas");
  barra.innerHTML = lista.map((h) => `<button type="button" class="l2-herr__b" data-h="${h}" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true">${ICONOS[h]}</svg><span>${NOMBRES[h]}</span></button>`).join("");
  barra.querySelectorAll(".l2-herr__b").forEach((b) => b.addEventListener("click", () => activa(actual === b.dataset.h ? null : b.dataset.h)));

  /* ---------- Lectura grande sobre la escena (HTML) ---------- */
  const lec = document.createElement("div");
  lec.className = "l2-herr__lectura"; lec.hidden = true; lec.setAttribute("aria-live", "polite");
  lec.innerHTML = `<div class="l2-herr__ltexto"><span class="l2-herr__lnombre"></span><output class="l2-herr__lvalor"></output><span class="l2-herr__lsub"></span></div>
    <div class="l2-herr__lbotones"><button type="button" class="l2-herr__anotar">Anotar</button><button type="button" class="l2-herr__cerrar" aria-label="Guardar la herramienta"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>`;
  o.lectura.appendChild(lec);
  const lNombre = lec.querySelector(".l2-herr__lnombre"), lValor = lec.querySelector(".l2-herr__lvalor"), lSub = lec.querySelector(".l2-herr__lsub");
  lec.querySelector(".l2-herr__cerrar").addEventListener("click", () => activa(null));
  lec.querySelector(".l2-herr__anotar").addEventListener("click", () => {
    const t = textoDe(); if (t && o.anota) o.anota(t, actual);
    lec.classList.remove("es-anotado"); void lec.offsetWidth; lec.classList.add("es-anotado");
  });

  function activa(h) {
    actual = h;
    barra.querySelectorAll(".l2-herr__b").forEach((b) => b.setAttribute("aria-pressed", b.dataset.h === h));
    lec.hidden = !h; lNombre.textContent = h ? NOMBRES[h] : "";
    if (h === "regla") colocaRegla();
    if (h === "cronometro") crono.sel = [];
    dibuja();
  }

  /* ---------- Capa (SVG) ---------- */
  const capa = el("g", { class: "l2-herr-capa" });
  const gR = el("g", { class: "l2-h-regla" }, capa), gC = el("g", { class: "l2-h-crono" }, capa), gT = el("g", { class: "l2-h-transp" }, capa), gV = el("g", { class: "l2-h-vel" }, capa);
  const R = { cuerpo: el("path", { class: "l2-h-cuerpo" }, gR), marcas: el("path", { class: "l2-h-marcas" }, gR) };
  const T = { arco: el("path", { class: "l2-h-cuerpo" }, gT), marcas: el("path", { class: "l2-h-marcas" }, gT), base: el("path", { class: "l2-h-brazo" }, gT), brazo: el("path", { class: "l2-h-brazo l2-h-brazo--v" }, gT), texto: el("text", { class: "l2-h-texto l2-etq", "data-prio": 1 }, gT) };
  const V = {
    vx: el("path", { class: "l2-h-fl l2-h-fl--x" }, gV), vy: el("path", { class: "l2-h-fl l2-h-fl--y" }, gV), v: el("path", { class: "l2-h-fl l2-h-fl--v" }, gV),
    tx: el("text", { class: "l2-h-tv l2-h-tv--x l2-etq", "data-prio": 1 }, gV), ty: el("text", { class: "l2-h-tv l2-h-tv--y l2-etq", "data-prio": 1 }, gV)
  };
  const punto = (ev) => { const p = escena.svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(escena.svg.getScreenCTM().inverse()); return [q.x, q.y]; };

  /* Imán: el punto especial o la marca más cercana (a menos de 24 px); si no, el suelo (a menos de 16 px). */
  function iman(ps) {
    const k = escena.escalaTexto(), cand = [...(o.imanes ? o.imanes() : []), ...(o.marcas ? o.marcas().map((m) => ({ p: m.p, nombre: `la marca de ${num(m.t)} s` })) : [])];
    let mejor = null, dm = 24 * k;
    for (const c of cand) { const s = escena.aPantalla(c.p), d = Math.hypot(s[0] - ps[0], s[1] - ps[1]); if (d < dm) { dm = d; mejor = c; } }
    if (mejor) return { p: mejor.p.slice(), nombre: mejor.nombre };
    const w = escena.dePantalla(ps), y0 = o.suelo ? o.suelo() : 0, s0 = escena.aPantalla([w[0], y0]);
    if (Math.abs(s0[1] - ps[1]) < 16 * k) return { p: [Math.round(w[0] * 10) / 10, y0], nombre: "el suelo" };
    return { p: [Math.round(w[0] * 10) / 10, Math.round(w[1] * 10) / 10], nombre: "" };
  }
  function asa(par, alMover) {
    const g = el("g", { class: "l2-h-asa" }, par), toque = el("circle", { class: "l2-h-toque" }, g), pt = el("circle", { class: "l2-h-punto" }, g);
    let arr = false;
    toque.addEventListener("pointerdown", (ev) => { arr = true; toque.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation(); g.classList.add("es-arrastre"); });
    toque.addEventListener("pointermove", (ev) => { if (arr) { alMover(iman(punto(ev))); dibuja(); } });
    const fin = () => { arr = false; g.classList.remove("es-arrastre"); };
    toque.addEventListener("pointerup", fin); toque.addEventListener("pointercancel", fin);
    return { pon(p, k) { const s = escena.aPantalla(p); [toque, pt].forEach((c) => { c.setAttribute("cx", r1(s[0])); c.setAttribute("cy", r1(s[1])); }); toque.setAttribute("r", r1(24 * k)); pt.setAttribute("r", r1(7 * k)); } };
  }
  const aRA = asa(gR, (q) => { regla.a = q.p; regla.na = q.nombre; });
  const aRB = asa(gR, (q) => { regla.b = q.p; regla.nb = q.nombre; });

  /* Al sacar la regla: del suelo al balón si está en el aire; si no, del punto de salida a donde está el balón. */
  function colocaRegla() {
    const t = o.reloj(), p = o.movil.pos(t), y0 = o.suelo ? o.suelo() : 0;
    if (p[1] - y0 > 0.5) { regla.a = [p[0], y0]; regla.b = p.slice(); regla.na = "el suelo"; regla.nb = "el balón"; }
    else { regla.a = [0, y0]; regla.b = [Math.max(p[0], 10), y0]; regla.na = "la salida"; regla.nb = p[0] > 0.5 ? "el balón" : ""; }
  }

  const dP = (pts) => pts.map((p, i) => (i ? "L" : "M") + r1(p[0]) + " " + r1(p[1])).join("");
  function flechaD(a, b, h) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < h * 0.8) return "";
    const ux = dx / L, uy = dy / L, bx = b[0] - ux * h, by = b[1] - uy * h;
    return `M${r1(a[0])} ${r1(a[1])}L${r1(bx)} ${r1(by)}M${r1(b[0])} ${r1(b[1])}L${r1(bx - uy * h * 0.55)} ${r1(by + ux * h * 0.55)}L${r1(bx + uy * h * 0.55)} ${r1(by - ux * h * 0.55)}Z`;
  }
  function ponTexto(t, p, s, ancla = "middle") { t.setAttribute("x", r1(p[0])); t.setAttribute("y", r1(p[1])); t.setAttribute("text-anchor", ancla); t.textContent = s; }
  const anguloDe = (w) => Math.round(Math.atan2(w[1], w[0]) * 180 / Math.PI);

  function dibuja() {
    if (!escena) return;
    const k = escena.escalaTexto(), A = (p) => escena.aPantalla(p), ppm = escena.pxPorMetro(), t = o.reloj();
    capa.style.setProperty("--k", k);
    /* Regla */
    gR.style.display = actual === "regla" ? "" : "none";
    if (actual === "regla") {
      const a = A(regla.a), b = A(regla.b), dx = regla.b[0] - regla.a[0], dy = regla.b[1] - regla.a[1], L = Math.hypot(dx, dy) || 1;
      R.cuerpo.setAttribute("d", dP([a, b]));
      const pasoM = ppm > 7 * k ? 1 : 5, nx = -dy / L, ny = dx / L; let d = "";
      for (let m = 0; m <= L + 1e-6; m += pasoM) {
        const w = [regla.a[0] + dx / L * m, regla.a[1] + dy / L * m], largo = (Math.round(m) % (pasoM * 5) === 0 ? 10 : 5) * k / ppm;
        d += dP([A(w), A([w[0] + nx * largo, w[1] + ny * largo])]);
      }
      R.marcas.setAttribute("d", d);
      aRA.pon(regla.a, k); aRB.pon(regla.b, k);
    }
    /* Cronómetro: anillos tocables sobre las marcas del rastro */
    gC.style.display = actual === "cronometro" ? "" : "none";
    if (actual === "cronometro") {
      gC.textContent = "";
      (o.marcas ? o.marcas() : []).forEach((m) => {
        const s = A(m.p), elegida = crono.sel.some((x) => Math.abs(x - m.t) < 1e-6);
        const g = el("g", { class: "l2-h-marca" + (elegida ? " es-elegida" : ""), role: "button", tabindex: 0, "aria-label": `Marca de ${num(m.t)} s` }, gC);
        el("circle", { cx: r1(s[0]), cy: r1(s[1]), r: r1(20 * k), class: "l2-h-toque" }, g);
        el("circle", { cx: r1(s[0]), cy: r1(s[1]), r: r1((elegida ? 8 : 6) * k), class: "l2-h-anillo" }, g);
        const elige = (ev) => { ev.preventDefault(); ev.stopPropagation(); if (crono.sel.length >= 2) crono.sel = []; crono.sel.push(m.t); dibuja(); };
        g.addEventListener("pointerdown", elige);
        g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") elige(ev); });
      });
    }
    /* Transportador: en el balón, base horizontal y brazo a lo largo de la velocidad */
    const p = o.movil.pos(t), w = o.movil.vel(t);
    gT.style.display = actual === "transportador" ? "" : "none";
    if (actual === "transportador") {
      const r = 46 * k / ppm, ang = w ? anguloDe(w) : null, P = (g, f = 1) => [p[0] + r * f * Math.cos(g * Math.PI / 180), p[1] + r * f * Math.sin(g * Math.PI / 180)];
      const arco = []; for (let g = -90; g <= 90; g += 6) arco.push(A(P(g)));
      T.arco.setAttribute("d", dP(arco));
      let d = ""; for (let g = -90; g <= 90; g += 10) d += dP([A(P(g, g % 30 ? 0.88 : 0.78)), A(P(g))]);
      T.marcas.setAttribute("d", d);
      T.base.setAttribute("d", dP([A(p), A(P(0, 1.2))]));
      T.brazo.setAttribute("d", ang == null ? "" : dP([A(p), A(P(ang, 1.25))]));
      ponTexto(T.texto, A(P(ang == null ? 0 : ang / 2, 1.5)), ang == null ? "" : Math.abs(ang) + "°", "start");
    }
    /* Velocidad: flechas grandes sobre el balón */
    const verV = (actual === "velocidad" || auto) && w;
    gV.style.display = verV ? "" : "none";
    if (verV) {
      const kv = (actual === "velocidad" ? 3.2 : 2.4) * k / ppm, h = 11 * k;
      const pb = A(p), px = A([p[0] + w[0] * kv, p[1]]), py = A([p[0], p[1] + w[1] * kv]), pv = A([p[0] + w[0] * kv, p[1] + w[1] * kv]);
      V.vx.setAttribute("d", flechaD(pb, px, h)); V.vy.setAttribute("d", flechaD(pb, py, h)); V.v.setAttribute("d", flechaD(pb, pv, h * 0.8));
      capa.classList.toggle("es-grande", actual === "velocidad");
      ponTexto(V.tx, [px[0] + 6 * k, px[1] + 5 * k], "vx " + num(w[0]), "start");
      ponTexto(V.ty, [py[0] - 6 * k, py[1] + (w[1] >= 0 ? 4 : 14) * k], Math.abs(w[1]) < 0.05 ? "" : "vy " + num(Math.abs(w[1])) + (w[1] > 0 ? " ↑" : " ↓"), "end");
    }
    pinta();
    if (o.alDibujar) o.alDibujar();
  }

  /* Lectura grande */
  function lectura() {
    const t = o.reloj();
    if (actual === "regla") {
      const dx = regla.b[0] - regla.a[0], dy = regla.b[1] - regla.a[1], L = Math.hypot(dx, dy);
      const tipo = Math.abs(dx) < 0.05 ? "altura" : Math.abs(dy) < 0.05 ? "distancia" : `↔ ${num(Math.abs(dx))} m · ↕ ${num(Math.abs(dy))} m`;
      const del = (n) => (n.startsWith("el ") ? "del " + n.slice(3) : "de " + n), al = (n) => (n.startsWith("el ") ? "al " + n.slice(3) : "a " + n);
      const de = regla.na && regla.nb ? (del(regla.na) + " " + al(regla.nb)).replace(/^d/, "D") : "Arrastra los extremos: se pegan al balón, a las marcas y al suelo";
      return { v: num(L, 2) + " m", s: (tipo === "altura" || tipo === "distancia" ? tipo[0].toUpperCase() + tipo.slice(1) + ". " : tipo + ". ") + de + "." };
    }
    if (actual === "cronometro") {
      const s = crono.sel;
      if (s.length === 2) { const [a, b] = [Math.min(...s), Math.max(...s)]; return { v: "Δt = " + num(b - a, 2) + " s", s: `De la marca de ${num(a)} s a la de ${num(b)} s.` }; }
      if (s.length === 1) return { v: "t₁ = " + num(s[0], 2) + " s", s: "Toca otra marca del rastro." };
      return { v: "t = " + num(t, 2) + " s", s: "Toca dos marcas del rastro para medir el tiempo entre ellas." };
    }
    if (actual === "transportador") {
      const w = o.movil.vel(t);
      if (!w) return { v: "—", s: "El balón ya está en el suelo." };
      const a = anguloDe(w), lado = Math.abs(w[1]) < 0.05 || a === 0 ? "horizontal" : a > 0 ? "sobre la horizontal" : "bajo la horizontal";
      return { v: Math.abs(a) + "° " + `<span class="l2-herr__lunid">${lado}</span>`, txt: Math.abs(a) + "° " + lado,
        s: t <= 0 ? "Ángulo de salida." : lado === "horizontal" ? "En la cima: la velocidad es horizontal." : a > 0 ? `Subiendo, en t = ${num(t, 2)} s.` : `Bajando, en t = ${num(t, 2)} s.` };
    }
    if (actual === "velocidad") {
      const w = o.movil.vel(t);
      if (!w) return { v: "en reposo", s: "El balón ya cayó." };
      return { v: `v<sub>x</sub> ${num(w[0])} · v<sub>y</sub> ${num(w[1])}`, s: `m/s en t = ${num(t, 2)} s. Rapidez: ${num(Math.hypot(w[0], w[1]))} m/s. v<sub>x</sub> no cambia.` };
    }
    return { v: "", s: "" };
  }
  function pinta() {
    if (!actual) return;
    const l = lectura();
    if (lValor.innerHTML !== l.v) lValor.innerHTML = l.v;
    if (lSub.innerHTML !== l.s) lSub.innerHTML = l.s;
  }
  function textoDe() {
    const l = lectura(), t = o.reloj(), limpio = (s) => s.replace(/<sub>(.*?)<\/sub>/g, "<sub>$1</sub>");
    if (actual === "regla") return `Regla: ${l.v} (${l.s.replace(/\.$/, "").toLowerCase()})`;
    if (actual === "cronometro") return `Cronómetro: ${l.v}${crono.sel.length === 2 ? " (" + l.s.replace(/\.$/, "").toLowerCase() + ")" : ""}`;
    if (actual === "transportador") return `Transportador: ${l.txt || l.v} en t = ${num(t, 2)} s`;
    if (actual === "velocidad") return `En t = ${num(t, 2)} s: ${limpio(l.v)} m/s`;
    return "";
  }

  return {
    usa(e) { escena = e; (e.capaHerramientas || e.svg).appendChild(capa); dibuja(); },
    actualiza: dibuja, redibuja: dibuja,
    vectores(si) { if (auto !== !!si) { auto = !!si; } dibuja(); },
    activa, get actual() { return actual; }
  };
}
