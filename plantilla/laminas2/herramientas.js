/* Códice Vivo · Láminas 2.0 · Herramientas (ver docs/diseno-laminas-2.md)
   Regla (distancias), cronómetro, transportador y medidor de velocidad (vectores vx / vy).
   El alumno las saca cuando las necesita; lo que mide se anota en el cuaderno con «Anotar».
   Trabajan en metros del mundo: la escena dice cómo pasar de metros a pantalla, así sirven igual
   en el laboratorio y en la situación real.

   const herr = creaHerramientas({ barra, lista: ["regla", "cronometro", "transportador", "velocidad"],
                                   reloj: () => t, movil: { pos(t) → [x, y], vel(t) → [vx, vy] }, anota(texto) });
   herr.usa(escena)        → dibuja en esa escena (misma ESCENA que prediccion.js, más pxPorMetro())
   herr.actualiza()        → cuando cambia el tiempo o el tiro
   herr.vectores(si)       → muestra vx / vy en el móvil aunque el medidor esté guardado (p. ej. en pausa)
   herr.regla / herr.transportador → { a, b } / { v, ang } para que la página los coloque */

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
  let escena = null, auto = false;
  const activa = {};
  const regla = { a: [0, 0], b: [10, 0] }, transp = { v: [0, 0], ang: 45, r: 0 }, crono = { t0: null, dt: 0, corre: false };

  /* ---------- Barra (HTML) ---------- */
  const barra = o.barra;
  barra.classList.add("l2-herr");
  barra.innerHTML = `<div class="l2-herr__botones" role="group" aria-label="Herramientas">${lista.map((h) =>
    `<button type="button" class="l2-herr__b" data-h="${h}" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true">${ICONOS[h]}</svg>${NOMBRES[h]}</button>`).join("")}</div>
    <div class="l2-herr__lecturas" aria-live="polite"></div>`;
  const lecturas = barra.querySelector(".l2-herr__lecturas");
  const filas = {};
  lista.forEach((h) => {
    const f = document.createElement("div"); f.className = "l2-herr__fila"; f.dataset.h = h; f.hidden = true;
    f.innerHTML = `<span class="l2-herr__nombre">${NOMBRES[h]}</span><output class="l2-herr__valor"></output><span class="l2-herr__extra"></span>
      <button type="button" class="l2-herr__anotar">Anotar</button>`;
    lecturas.appendChild(f); filas[h] = f;
    f.querySelector(".l2-herr__anotar").addEventListener("click", () => { const t = textoDe(h); if (t && o.anota) o.anota(t, h); f.classList.add("es-anotado"); setTimeout(() => f.classList.remove("es-anotado"), 900); });
  });
  /* cronómetro: iniciar / parar */
  if (filas.cronometro) {
    const extra = filas.cronometro.querySelector(".l2-herr__extra");
    extra.innerHTML = '<button type="button" class="l2-herr__crono">Iniciar</button>';
    const b = extra.firstChild;
    b.addEventListener("click", () => {
      if (!crono.corre) { crono.t0 = o.reloj(); crono.dt = 0; crono.corre = true; }
      else { crono.dt = o.reloj() - crono.t0; crono.corre = false; }
      b.textContent = crono.corre ? "Parar" : "Iniciar"; pinta();
    });
  }
  barra.querySelectorAll(".l2-herr__b").forEach((b) => b.addEventListener("click", () => pon(b.dataset.h, b.getAttribute("aria-pressed") !== "true")));

  function pon(h, si) {
    activa[h] = si;
    barra.querySelector(`[data-h="${h}"]`).setAttribute("aria-pressed", si);
    filas[h].hidden = !si;
    if (si && h === "regla") colocaRegla();
    if (si && h === "transportador") colocaTransp();
    dibuja();
  }

  /* ---------- Capa (SVG) ---------- */
  const capa = el("g", { class: "l2-herr-capa" });
  const gR = el("g", { class: "l2-h-regla" }, capa), gT = el("g", { class: "l2-h-transp" }, capa), gV = el("g", { class: "l2-h-vel" }, capa);
  const R = { cuerpo: el("path", { class: "l2-h-cuerpo" }, gR), marcas: el("path", { class: "l2-h-marcas" }, gR), texto: el("text", { class: "l2-h-texto" }, gR) };
  const T = { arco: el("path", { class: "l2-h-cuerpo" }, gT), marcas: el("path", { class: "l2-h-marcas" }, gT), base: el("path", { class: "l2-h-brazo" }, gT), brazo: el("path", { class: "l2-h-brazo" }, gT), texto: el("text", { class: "l2-h-texto" }, gT) };
  const V = {
    vx: el("path", { class: "l2-h-fl l2-h-fl--x" }, gV), vy: el("path", { class: "l2-h-fl l2-h-fl--y" }, gV), v: el("path", { class: "l2-h-fl l2-h-fl--v" }, gV),
    tx: el("text", { class: "l2-h-tv l2-h-tv--x" }, gV), ty: el("text", { class: "l2-h-tv l2-h-tv--y" }, gV)
  };
  /* asas arrastrables (en metros del mundo) */
  function asa(par, alMover) {
    const g = el("g", { class: "l2-h-asa" }, par), toque = el("circle", { class: "l2-h-toque" }, g), punto = el("circle", { class: "l2-h-punto" }, g);
    let arr = false;
    const pt = (ev) => { const p = escena.svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(escena.svg.getScreenCTM().inverse()); return escena.dePantalla([q.x, q.y]); };
    toque.addEventListener("pointerdown", (ev) => { arr = true; toque.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation(); });
    toque.addEventListener("pointermove", (ev) => { if (arr) { alMover(pt(ev)); dibuja(); } });
    const fin = () => { arr = false; };
    toque.addEventListener("pointerup", fin); toque.addEventListener("pointercancel", fin);
    return { pon(p, k) { const s = escena.aPantalla(p); [toque, punto].forEach((c) => { c.setAttribute("cx", r1(s[0])); c.setAttribute("cy", r1(s[1])); }); toque.setAttribute("r", r1(22 * k)); punto.setAttribute("r", r1(6 * k)); } };
  }
  const redondea = (v, p = 0.5) => Math.round(v / p) * p;
  const aRA = asa(gR, (p) => { regla.a = [redondea(p[0]), Math.max(0, redondea(p[1]))]; });
  const aRB = asa(gR, (p) => { regla.b = [redondea(p[0]), Math.max(0, redondea(p[1]))]; });
  const aTV = asa(gT, (p) => { transp.v = [redondea(p[0]), Math.max(0, redondea(p[1]))]; });
  const aTB = asa(gT, (p) => { const a = Math.atan2(p[1] - transp.v[1], p[0] - transp.v[0]) * 180 / Math.PI; transp.ang = Math.round(Math.min(180, Math.max(0, a < -90 ? 180 : a))); });

  function colocaRegla() { if (o.colocaRegla) Object.assign(regla, o.colocaRegla()); }
  function colocaTransp() { if (o.colocaTransportador) Object.assign(transp, o.colocaTransportador()); }

  const dP = (pts) => pts.map((p, i) => (i ? "L" : "M") + r1(p[0]) + " " + r1(p[1])).join("");
  function flechaD(a, b, h) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < h * 0.8) return "";
    const ux = dx / L, uy = dy / L, bx = b[0] - ux * h, by = b[1] - uy * h;
    return `M${r1(a[0])} ${r1(a[1])}L${r1(bx)} ${r1(by)}M${r1(b[0])} ${r1(b[1])}L${r1(bx - uy * h * 0.5)} ${r1(by + ux * h * 0.5)}L${r1(bx + uy * h * 0.5)} ${r1(by - ux * h * 0.5)}Z`;
  }
  function ponTexto(t, p, s, ancla = "middle") { t.setAttribute("x", r1(p[0])); t.setAttribute("y", r1(p[1])); t.setAttribute("text-anchor", ancla); t.textContent = s; }

  function dibuja() {
    if (!escena) return;
    const k = escena.escalaTexto(), A = (p) => escena.aPantalla(p), ppm = escena.pxPorMetro();
    capa.style.setProperty("--k", k);
    /* Regla */
    gR.style.display = activa.regla ? "" : "none";
    if (activa.regla) {
      const a = A(regla.a), b = A(regla.b), dx = regla.b[0] - regla.a[0], dy = regla.b[1] - regla.a[1], L = Math.hypot(dx, dy) || 1;
      R.cuerpo.setAttribute("d", dP([a, b]));
      const pasoM = ppm * 1 > 8 * k ? 1 : 5, nx = -dy / L, ny = dx / L; let d = "";
      for (let m = 0; m <= L + 1e-6; m += pasoM) {
        const w = [regla.a[0] + dx / L * m, regla.a[1] + dy / L * m], largo = (Math.round(m) % (pasoM * 5) === 0 ? 9 : 5) * k / ppm;
        d += dP([A(w), A([w[0] + nx * largo, w[1] + ny * largo])]);
      }
      R.marcas.setAttribute("d", d);
      const mid = A([(regla.a[0] + regla.b[0]) / 2 + nx * 18 * k / ppm, (regla.a[1] + regla.b[1]) / 2 + ny * 18 * k / ppm]);
      ponTexto(R.texto, mid, num(L) + " m");
      aRA.pon(regla.a, k); aRB.pon(regla.b, k);
    }
    /* Transportador */
    gT.style.display = activa.transportador ? "" : "none";
    if (activa.transportador) {
      const r = (transp.r || 60 * k / ppm), v = transp.v, P = (g, f = 1) => [v[0] + r * f * Math.cos(g * Math.PI / 180), v[1] + r * f * Math.sin(g * Math.PI / 180)];
      const arco = []; for (let g = 0; g <= 180; g += 6) arco.push(A(P(g)));
      T.arco.setAttribute("d", dP(arco) + "Z");
      let d = ""; for (let g = 0; g <= 180; g += 10) d += dP([A(P(g, g % 30 ? 0.9 : 0.82)), A(P(g))]);
      T.marcas.setAttribute("d", d);
      T.base.setAttribute("d", dP([A(v), A(P(0, 1.15))]));
      T.brazo.setAttribute("d", dP([A(v), A(P(transp.ang, 1.15))]));
      ponTexto(T.texto, A(P(transp.ang / 2, 0.55)), transp.ang + "°");
      aTV.pon(v, k); aTB.pon(P(transp.ang, 1.15), k);
    }
    /* Velocidad */
    const verV = (activa.velocidad || auto) && o.movil;
    gV.style.display = verV ? "" : "none";
    if (verV) {
      const t = o.reloj(), p = o.movil.pos(t), w = o.movil.vel(t), kv = 2.4 * k / ppm, h = 9 * k;
      if (!w) gV.style.display = "none";
      else {
        const pb = A(p), px = A([p[0] + w[0] * kv, p[1]]), py = A([p[0], p[1] + w[1] * kv]), pv = A([p[0] + w[0] * kv, p[1] + w[1] * kv]);
        V.vx.setAttribute("d", flechaD(pb, px, h)); V.vy.setAttribute("d", flechaD(pb, py, h)); V.v.setAttribute("d", flechaD(pb, pv, h * 0.8));
        ponTexto(V.tx, [px[0] + 6 * k, px[1] + 5 * k], "vx " + num(w[0]), "start");
        ponTexto(V.ty, [py[0] - 6 * k, py[1] + (w[1] >= 0 ? 4 : 12) * k], "vy " + num(Math.abs(w[1])) + (Math.abs(w[1]) < 0.05 ? "" : w[1] > 0 ? " ↑" : " ↓"), "end");
        V.ty.style.display = Math.abs(w[1]) < 0.05 && !activa.velocidad ? "none" : "";
      }
    }
    pinta();
  }

  function textoDe(h) {
    const t = o.reloj();
    if (h === "regla") return `Regla: ${num(Math.hypot(regla.b[0] - regla.a[0], regla.b[1] - regla.a[1]))} m`;
    if (h === "transportador") return `Transportador: ${transp.ang}°`;
    if (h === "cronometro") return `Cronómetro: ${num(crono.corre ? t - crono.t0 : crono.dt, 2)} s`;
    if (h === "velocidad" && o.movil) { const w = o.movil.vel(t); return w ? `En t = ${num(t, 2)} s: v<sub>x</sub> = ${num(w[0])} m/s, v<sub>y</sub> = ${num(w[1])} m/s` : ""; }
    return "";
  }
  function pinta() {
    const t = o.reloj();
    const ponV = (h, s) => { if (!filas[h] || filas[h].hidden) return; const out = filas[h].querySelector(".l2-herr__valor"); if (out.innerHTML !== s) out.innerHTML = s; };
    ponV("regla", num(Math.hypot(regla.b[0] - regla.a[0], regla.b[1] - regla.a[1])) + " m");
    ponV("transportador", transp.ang + "°");
    ponV("cronometro", num(crono.corre ? Math.max(0, t - crono.t0) : crono.dt, 2) + " s");
    if (o.movil) { const w = o.movil.vel(t); ponV("velocidad", w ? `v<sub>x</sub> ${num(w[0])} · v<sub>y</sub> ${num(w[1])} m/s` : "en reposo"); }
  }

  return {
    usa(e) { escena = e; (e.capaHerramientas || e.svg).appendChild(capa); dibuja(); },
    actualiza: dibuja, redibuja: dibuja,
    vectores(si) { auto = !!si; dibuja(); },
    activa: (h, si = true) => pon(h, si),
    get regla() { return regla; }, get transportador() { return transp; }
  };
}
