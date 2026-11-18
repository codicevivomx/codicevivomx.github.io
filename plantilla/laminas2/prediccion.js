/* Códice Vivo · Láminas 2.0 · Predecir primero (ver docs/diseno-laminas-2.md)
   Antes de correr la simulación, el alumno marca su predicción: arrastra marcadores sobre la escena
   o escribe el valor. Al terminar, la predicción queda como «fantasma» y se compara con lo real.

   const pred = creaPrediccion({ panel, marcadores: [MARCADOR], alFijar(valores), texto });
   pred.usa(escena)          → dibuja sus marcadores dentro de esa escena (se llama otra vez al cambiar de escena)
   pred.fija()               → bloquea la predicción (la llama el botón o la página)
   pred.compara({ id: real }) → fantasma + «te faltaron / te pasaste»; devuelve [{ id, etiqueta, pred, real, dif, texto }]
   pred.reinicia()           → vuelve a dejar predecir · pred.estado: "abierta" | "fijada" | "comparada"
   pred.redibuja()           → tras cambiar el encuadre de la escena

   ESCENA (la misma que usan las herramientas):
     { svg, aPantalla([x, y]) → [sx, sy] (unidades del SVG), dePantalla([sx, sy]) → [x, y], escalaTexto() → unidades del SVG por px }
   MARCADOR:
     { id, etiqueta, unidad, min, max, paso, valor, tol,
       geo(v) → { asa: [x, y], linea: [[x, y], [x, y]], texto: [x, y], ancla }   (en metros del mundo)
       valorDe([x, y]) → v }                                                      (del punto arrastrado al valor) */

const NS = "http://www.w3.org/2000/svg";
const el = (t, at = {}, par) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; };
const r1 = (v) => Math.round(v * 10) / 10;
const num = (v, dec = 1) => { const k = 10 ** dec, r = Math.round(v * k) / k; return (r < 0 ? "−" : "") + String(Math.abs(r)); };
let serie = 0;

export function textoDiferencia(pred, real, tol, unidad) {
  const dif = real - pred;
  if (Math.abs(dif) <= tol) return `¡Le atinaste! (${num(Math.abs(dif))} ${unidad} de diferencia)`;
  return dif > 0 ? `Te faltaron ${num(dif)} ${unidad}` : `Te pasaste ${num(-dif)} ${unidad}`;
}

export function creaPrediccion(o) {
  const id = "l2p" + (++serie), M = o.marcadores, T = Object.assign({
    titulo: "Predice antes de lanzar",
    instruccion: "Arrastra los marcadores (o escribe el valor) y fija tu predicción.",
    fijar: "Esta es mi predicción",
    otra: "Predecir otra vez",
    fijada: "Predicción fijada. Ahora lánzalo y compara."
  }, o.texto || {});
  let escena = null, estado = "abierta", reales = null;
  const val = {}; M.forEach((m) => { val[m.id] = m.valor; });

  /* ---------- Panel (HTML) ---------- */
  const panel = o.panel;
  panel.classList.add("l2-pred");
  panel.innerHTML = `<h3 class="l2-pred__t">${T.titulo}</h3><p class="l2-pred__i">${T.instruccion}</p>
    <div class="l2-pred__campos">${M.map((m) => `<label class="l2-pred__campo"><span>${m.etiqueta}</span>
      <span class="l2-pred__dato"><input type="number" inputmode="decimal" id="${id}-${m.id}" min="${m.min}" max="${m.max}" step="${m.paso || 0.5}"> ${m.unidad}</span></label>`).join("")}</div>
    <div class="l2-pred__acciones"><button type="button" class="boton pri l2-pred__fijar">${T.fijar}</button></div>
    <ul class="l2-pred__res" aria-live="polite"></ul>`;
  const entradas = {}; M.forEach((m) => { entradas[m.id] = panel.querySelector(`#${id}-${m.id}`); });
  const bFijar = panel.querySelector(".l2-pred__fijar"), lista = panel.querySelector(".l2-pred__res"), instr = panel.querySelector(".l2-pred__i");

  const acota = (m, v) => { const p = m.paso || 0.5; v = Math.round(v / p) * p; return Math.min(m.max, Math.max(m.min, Math.round(v * 1000) / 1000)); };
  M.forEach((m) => {
    const e = entradas[m.id]; e.value = val[m.id];
    e.addEventListener("input", () => { const v = parseFloat(String(e.value).replace(",", ".")); if (!isFinite(v) || estado !== "abierta") return; val[m.id] = acota(m, v); dibuja(); });
    e.addEventListener("change", () => { e.value = val[m.id]; });
  });
  bFijar.addEventListener("click", () => { if (estado === "abierta") fija(); else reinicia(); });

  /* ---------- Capa en la escena (SVG) ---------- */
  const capa = el("g", { class: "l2-pred-capa" });
  const piezas = {};
  M.forEach((m) => {
    const g = el("g", { class: "l2-pred-m", "data-id": m.id }, capa);
    const linea = el("path", { class: "l2-pred-linea" }, g);
    const delta = el("path", { class: "l2-pred-delta" }, g);
    const tDelta = el("text", { class: "l2-pred-tdelta" }, g);
    const texto = el("text", { class: "l2-pred-texto" }, g);
    const toque = el("circle", { class: "l2-pred-toque", r: 22 }, g);
    const asa = el("circle", { class: "l2-pred-asa", r: 7 }, g);
    piezas[m.id] = { g, linea, delta, tDelta, texto, toque, asa };
    let arrastra = false;
    const punto = (ev) => { const p = escena.svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(escena.svg.getScreenCTM().inverse()); return [q.x, q.y]; };
    toque.addEventListener("pointerdown", (ev) => { if (estado !== "abierta" || !escena) return; arrastra = true; toque.setPointerCapture(ev.pointerId); ev.preventDefault(); g.classList.add("es-arrastre"); });
    toque.addEventListener("pointermove", (ev) => { if (!arrastra) return; val[m.id] = acota(m, m.valorDe(escena.dePantalla(punto(ev)))); entradas[m.id].value = val[m.id]; dibuja(); });
    const suelta = () => { arrastra = false; g.classList.remove("es-arrastre"); };
    toque.addEventListener("pointerup", suelta); toque.addEventListener("pointercancel", suelta);
  });

  const dP = (pts) => pts.map((p, i) => (i ? "L" : "M") + r1(p[0]) + " " + r1(p[1])).join("");
  function dibuja() {
    if (!escena) return;
    const k = escena.escalaTexto(), A = (p) => escena.aPantalla(p);
    capa.style.setProperty("--k", k);
    capa.classList.toggle("es-fantasma", estado !== "abierta");
    M.forEach((m) => {
      const q = piezas[m.id], g = m.geo(val[m.id]), a = A(g.asa);
      q.linea.setAttribute("d", dP(g.linea.map(A)));
      q.asa.setAttribute("cx", r1(a[0])); q.asa.setAttribute("cy", r1(a[1])); q.asa.setAttribute("r", r1(7 * k));
      q.toque.setAttribute("cx", r1(a[0])); q.toque.setAttribute("cy", r1(a[1])); q.toque.setAttribute("r", r1(22 * k));
      q.toque.style.display = estado === "abierta" ? "" : "none";
      const pt = A(g.texto || g.asa);
      q.texto.setAttribute("x", r1(pt[0])); q.texto.setAttribute("y", r1(pt[1])); q.texto.setAttribute("text-anchor", g.ancla || "middle");
      q.texto.textContent = estado === "comparada" ? "" : (estado === "abierta" ? "" : "Tú: ") + num(val[m.id]) + " " + m.unidad;
      if (estado === "comparada" && reales && m.id in reales) {
        const b = A(m.geo(reales[m.id]).asa);
        q.delta.setAttribute("d", dP([a, b]));
        /* línea más horizontal → texto encima; más vertical → texto a un lado */
        const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
        q.tDelta.setAttribute("x", r1((a[0] + b[0]) / 2 + (horiz ? 0 : 8 * k))); q.tDelta.setAttribute("y", r1((a[1] + b[1]) / 2 + (horiz ? -8 : 5) * k));
        q.tDelta.setAttribute("text-anchor", horiz ? "middle" : "start");
        q.tDelta.textContent = Math.abs(reales[m.id] - val[m.id]) <= (m.tol || 0) ? "✓" : (reales[m.id] > val[m.id] ? "+" : "−") + num(Math.abs(reales[m.id] - val[m.id])) + " " + m.unidad;
      } else { q.delta.setAttribute("d", ""); q.tDelta.textContent = ""; }
    });
  }

  function pintaPanel() {
    bFijar.textContent = estado === "abierta" ? T.fijar : T.otra;
    bFijar.classList.toggle("pri", estado === "abierta"); bFijar.classList.toggle("sec", estado !== "abierta");
    M.forEach((m) => { entradas[m.id].disabled = estado !== "abierta"; });
    instr.textContent = estado === "abierta" ? T.instruccion : estado === "fijada" ? T.fijada : "";
    if (estado !== "comparada") lista.textContent = "";
  }

  function fija() {
    if (estado !== "abierta") return;
    estado = "fijada"; pintaPanel(); dibuja();
    if (o.alFijar) o.alFijar({ ...val });
  }
  function compara(r) {
    reales = r; estado = "comparada";
    const res = M.filter((m) => m.id in r).map((m) => ({ id: m.id, etiqueta: m.etiqueta, unidad: m.unidad, pred: val[m.id], real: r[m.id], dif: r[m.id] - val[m.id], acierto: Math.abs(r[m.id] - val[m.id]) <= (m.tol || 0), texto: textoDiferencia(val[m.id], r[m.id], m.tol || 0, m.unidad) }));
    pintaPanel();
    lista.innerHTML = res.map((x) => `<li class="${x.acierto ? "es-bien" : ""}"><b>${x.etiqueta}:</b> ${x.texto}. <span>Tú ${num(x.pred)}, real ${num(x.real, 2)} ${x.unidad}.</span></li>`).join("");
    dibuja();
    return res;
  }
  function reinicia() { estado = "abierta"; reales = null; pintaPanel(); dibuja(); if (o.alReiniciar) o.alReiniciar(); }

  pintaPanel();
  return {
    usa(e) { escena = e; (e.capaPrediccion || e.svg).appendChild(capa); dibuja(); },
    fija, compara, reinicia, redibuja: dibuja,
    get estado() { return estado; },
    valores() { return { ...val }; },
    pon(v) { Object.assign(val, v); M.forEach((m) => { entradas[m.id].value = val[m.id]; }); dibuja(); }
  };
}

/* Predicción de opción: «¿cae más cerca, igual o más lejos?». Anota la elección y la página comprueba.
   preguntaOpciones(cont, { pregunta, opciones: [{ t, ok, e }], alElegir(op) }) */
export function preguntaOpciones(cont, o) {
  cont.classList.add("l2-pred-op");
  cont.innerHTML = `<p class="l2-pred-op__q">${o.pregunta}</p><div class="l2-pred-op__ops"></div><p class="l2-pred-op__res" aria-live="polite"></p>`;
  const ops = cont.querySelector(".l2-pred-op__ops"), res = cont.querySelector(".l2-pred-op__res");
  o.opciones.forEach((op) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "op"; b.innerHTML = op.t;
    b.addEventListener("click", () => {
      [...ops.children].forEach((x) => { x.disabled = true; });
      b.classList.add(op.ok ? "bien" : "mal");
      res.innerHTML = `<b>${op.ok ? "Bien" : "No"}.</b> ${op.e}`;
      if (o.alElegir) o.alElegir(op);
    });
    ops.appendChild(b);
  });
}
