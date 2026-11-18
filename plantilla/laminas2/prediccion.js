/* Códice Vivo · Láminas 2.0 · Predecir primero (ver docs/diseno-laminas-2.md)
   Antes de correr la simulación, el alumno marca su predicción: arrastra marcadores sobre la escena
   o escribe el valor. Los campos empiezan vacíos y no se puede lanzar sin predecir.
   Al terminar, la predicción queda como «fantasma» y se compara con lo real.

   const pred = creaPrediccion({ panel, marcadores: [MARCADOR], alFijar(valores), alReiniciar(), alDibujar(), texto });
   pred.usa(escena)           → dibuja sus marcadores dentro de esa escena (otra vez al cambiar de escena)
   pred.completa()            → ¿ya hay valor en todos los marcadores?
   pred.fija()                → bloquea la predicción (si está completa); devuelve true si se fijó
   pred.pide()                → avisa «primero predice» (cuando intentan lanzar sin predecir)
   pred.compara({ id: real }) → fantasma + «te faltaron / te pasaste»; devuelve [{ id, etiqueta, pred, real, dif, texto, acierto }]
   pred.reinicia({ vaciar })  → vuelve a dejar predecir · pred.estado: "abierta" | "fijada" | "comparada"
   pred.redibuja()            → tras cambiar el encuadre de la escena
   Si la escena da caja() (el rectángulo visible, en unidades del SVG) y un marcador queda fuera,
   en su lugar se dibuja en el borde «tu predicción: 88 m →» (la flecha apunta hacia donde quedó).

   ESCENA (la misma que usan las herramientas):
     { svg, aPantalla([x, y]) → [sx, sy] (unidades del SVG), dePantalla([sx, sy]) → [x, y], escalaTexto() → unidades del SVG por px }
   MARCADOR:
     { id, etiqueta, corta, unidad, min, max, paso, tol,
       espera                                                                     (valor donde se dibuja el marcador vacío, con «?»)
       geo(v) → { asa: [x, y], linea: [[x, y], [x, y]], texto: [x, y], ancla }   (en metros del mundo)
       valorDe([x, y]) → v }                                                      (del punto arrastrado al valor) */

const NS = "http://www.w3.org/2000/svg";
const el = (t, at = {}, par) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; };
const r1 = (v) => Math.round(v * 10) / 10;
const num = (v, dec = 1) => { const k = 10 ** dec, r = Math.round(v * k) / k; return (r < 0 ? "−" : "") + String(Math.abs(r)); };
const hay = (v) => v != null && isFinite(v);
let serie = 0;

export function textoDiferencia(pred, real, tol, unidad) {
  const dif = real - pred;
  if (Math.abs(dif) <= tol) return `¡Le atinaste! (${num(Math.abs(dif))} ${unidad} de diferencia)`;
  return dif > 0 ? `Te faltaron ${num(dif)} ${unidad}` : `Te pasaste ${num(-dif)} ${unidad}`;
}

export function creaPrediccion(o) {
  const id = "l2p" + (++serie), M = o.marcadores, T = Object.assign({
    titulo: "Predice antes de lanzar",
    fijar: "Fijar y lanzar",
    corto: "Lanzar ▶",
    otra: "Predecir otra vez",
    pide: "Primero escribe o arrastra tu predicción.",
    fijada: "Predicción fijada."
  }, o.texto || {});
  let escena = null, estado = "abierta", reales = null;
  const val = {}; M.forEach((m) => { val[m.id] = null; });

  /* ---------- Panel (HTML): título y una sola fila con los campos y el botón ---------- */
  const panel = o.panel;
  panel.classList.add("l2-pred");
  panel.innerHTML = `<h3 class="l2-pred__t">${T.titulo}</h3>
    <div class="l2-pred__fila">${M.map((m) => `<label class="l2-pred__campo"><span class="l2-pred__etq">${m.etiqueta}</span>
      <span class="l2-pred__dato"><input type="text" inputmode="decimal" autocomplete="off" id="${id}-${m.id}" placeholder="?" aria-describedby="${id}-aviso"><span class="l2-pred__u">${m.unidad}</span></span></label>`).join("")}
      <button type="button" class="boton pri l2-pred__fijar"><span class="l2-pred__largo">${T.fijar}</span><span class="l2-pred__corto" aria-hidden="true">${T.corto}</span></button></div>
    <p class="l2-pred__aviso" id="${id}-aviso" aria-live="polite"></p>
    <ul class="l2-pred__res" aria-live="polite"></ul>`;
  const entradas = {}; M.forEach((m) => { entradas[m.id] = panel.querySelector(`#${id}-${m.id}`); });
  const bFijar = panel.querySelector(".l2-pred__fijar"), lista = panel.querySelector(".l2-pred__res"), aviso = panel.querySelector(".l2-pred__aviso");
  const avisa = (s, malo) => { aviso.textContent = s || ""; aviso.classList.toggle("es-mal", !!malo); };

  const acota = (m, v) => { const p = m.paso || 0.5; v = Math.round(v / p) * p; return Math.min(m.max, Math.max(m.min, Math.round(v * 1000) / 1000)); };
  M.forEach((m) => {
    const e = entradas[m.id];
    e.addEventListener("input", () => {
      if (estado !== "abierta") return;
      const s = String(e.value).trim().replace(",", ".").replace(/\s*m$/i, ""), v = parseFloat(s);
      val[m.id] = s === "" || !isFinite(v) ? null : acota(m, v); avisa(""); dibuja(); pinta();
    });
    e.addEventListener("change", () => { e.value = hay(val[m.id]) ? val[m.id] : ""; });
    e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); bFijar.click(); } });
  });
  bFijar.addEventListener("click", () => { if (estado === "abierta") { if (!fija()) pide(); } else reinicia(); });

  /* ---------- Capa en la escena (SVG) ---------- */
  const capa = el("g", { class: "l2-pred-capa" });
  const piezas = {};
  M.forEach((m, i) => {
    const g = el("g", { class: "l2-pred-m", "data-id": m.id }, capa);
    const linea = el("path", { class: "l2-pred-linea" }, g);
    const delta = el("path", { class: "l2-pred-delta" }, g);
    const tDelta = el("text", { class: "l2-pred-tdelta l2-etq", "data-prio": 3 }, g);
    const texto = el("text", { class: "l2-pred-texto l2-etq", "data-prio": 2 }, g);
    const borde = el("text", { class: "l2-pred-texto l2-pred-borde l2-etq", "data-prio": 1, "data-fija": 1 }, g);
    const toque = el("circle", { class: "l2-pred-toque", r: 22 }, g);
    const asa = el("circle", { class: "l2-pred-asa", r: 7 }, g);
    piezas[m.id] = { g, linea, delta, tDelta, texto, borde, toque, asa };
    let arrastra = false;
    const punto = (ev) => { const p = escena.svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(escena.svg.getScreenCTM().inverse()); return [q.x, q.y]; };
    toque.addEventListener("pointerdown", (ev) => { if (estado !== "abierta" || !escena) return; arrastra = true; toque.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation(); g.classList.add("es-arrastre"); });
    toque.addEventListener("pointermove", (ev) => { if (!arrastra) return; val[m.id] = acota(m, m.valorDe(escena.dePantalla(punto(ev)))); entradas[m.id].value = val[m.id]; avisa(""); dibuja(); pinta(); });
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
      const q = piezas[m.id], vacio = !hay(val[m.id]), v = vacio ? m.espera : val[m.id], g = m.geo(v), a = A(g.asa);
      q.g.classList.toggle("es-vacio", vacio);
      q.g.style.display = vacio && estado !== "abierta" ? "none" : "";
      q.linea.setAttribute("d", dP(g.linea.map(A)));
      q.asa.setAttribute("cx", r1(a[0])); q.asa.setAttribute("cy", r1(a[1])); q.asa.setAttribute("r", r1(7 * k));
      q.toque.setAttribute("cx", r1(a[0])); q.toque.setAttribute("cy", r1(a[1])); q.toque.setAttribute("r", r1(22 * k));
      q.toque.style.display = estado === "abierta" ? "" : "none";
      const pt = A(g.texto || g.asa);
      q.texto.setAttribute("x", r1(pt[0])); q.texto.setAttribute("y", r1(pt[1])); q.texto.setAttribute("text-anchor", g.ancla || "middle");
      q.texto.textContent = estado === "comparada" ? "" : vacio ? (m.corta || m.etiqueta) + "?" : (estado === "abierta" ? "" : "Tú: ") + num(v) + " " + m.unidad;
      if (estado === "comparada" && reales && m.id in reales && !vacio) {
        const b = A(m.geo(reales[m.id]).asa);
        q.delta.setAttribute("d", dP([a, b]));
        /* línea más horizontal → texto encima; más vertical → texto a un lado */
        const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
        q.tDelta.setAttribute("x", r1((a[0] + b[0]) / 2 + (horiz ? 0 : 8 * k))); q.tDelta.setAttribute("y", r1((a[1] + b[1]) / 2 + (horiz ? -8 : 5) * k));
        q.tDelta.setAttribute("text-anchor", horiz ? "middle" : "start");
        /* sin signo: «te faltaron X m» / «te pasaste X m» (lo mismo que dice el panel) */
        q.tDelta.textContent = Math.abs(reales[m.id] - v) <= (m.tol || 0) ? "¡le atinaste!" : (reales[m.id] > v ? "te faltaron " : "te pasaste ") + num(Math.abs(reales[m.id] - v)) + " " + m.unidad;
      } else { q.delta.setAttribute("d", ""); q.tDelta.textContent = ""; }
      /* ¿quedó fuera de cuadro? flecha en el borde con su valor */
      const vb = escena.caja ? escena.caja() : null, mg = 12 * k;
      const fuera = !!vb && !vacio && (a[0] < vb.x + mg || a[0] > vb.x + vb.w - mg || a[1] < vb.y + mg || a[1] > vb.y + vb.h - mg);
      [q.linea, q.asa, q.texto, q.delta, q.tDelta, q.toque].forEach((e) => { e.style.visibility = fuera ? "hidden" : ""; });
      if (fuera) {
        const der = a[0] > vb.x + vb.w - mg, izq = a[0] < vb.x + mg, arr = a[1] < vb.y + mg;
        const fl = der ? "→" : izq ? "←" : arr ? "↑" : "↓", val = num(v) + " " + m.unidad;
        const x = Math.min(vb.x + vb.w - mg, Math.max(vb.x + mg, a[0])), y = Math.min(vb.y + vb.h - mg, Math.max(vb.y + mg + 14 * k, a[1]));
        q.borde.setAttribute("x", r1(x)); q.borde.setAttribute("y", r1(y));
        q.borde.setAttribute("text-anchor", der ? "end" : izq ? "start" : "middle");
        q.borde.textContent = izq ? `${fl} tu predicción: ${val}` : `tu predicción: ${val} ${fl}`;
      } else q.borde.textContent = "";
    });
    if (o.alDibujar) o.alDibujar();
  }

  function completa() { return M.every((m) => hay(val[m.id])); }
  function pinta() {
    bFijar.classList.toggle("pri", estado === "abierta"); bFijar.classList.toggle("sec", estado !== "abierta");
    bFijar.classList.toggle("es-incompleta", estado === "abierta" && !completa());
    bFijar.setAttribute("aria-label", estado === "abierta" ? T.fijar : T.otra);
    bFijar.querySelector(".l2-pred__largo").textContent = estado === "abierta" ? T.fijar : T.otra;
    bFijar.querySelector(".l2-pred__corto").textContent = estado === "abierta" ? T.corto : T.otra;
    M.forEach((m) => { entradas[m.id].readOnly = estado !== "abierta"; });
    panel.classList.toggle("es-bloqueada", estado !== "abierta");
    if (estado !== "comparada") lista.textContent = "";
  }
  function pide() {
    avisa(T.pide, true);
    const vacio = M.find((m) => !hay(val[m.id]));
    if (vacio) entradas[vacio.id].focus({ preventScroll: true });
    panel.classList.remove("es-pide"); void panel.offsetWidth; panel.classList.add("es-pide");
  }
  function fija() {
    if (estado !== "abierta") return true;
    if (!completa()) return false;
    estado = "fijada"; avisa(T.fijada); pinta(); dibuja();
    if (o.alFijar) o.alFijar({ ...val });
    return true;
  }
  function compara(r) {
    reales = r; estado = "comparada"; avisa("");
    const res = M.filter((m) => m.id in r && hay(val[m.id])).map((m) => ({ id: m.id, etiqueta: m.etiqueta, unidad: m.unidad, pred: val[m.id], real: r[m.id], dif: r[m.id] - val[m.id], acierto: Math.abs(r[m.id] - val[m.id]) <= (m.tol || 0), texto: textoDiferencia(val[m.id], r[m.id], m.tol || 0, m.unidad) }));
    pinta();
    lista.innerHTML = res.map((x) => `<li class="${x.acierto ? "es-bien" : ""}"><b>${x.etiqueta}:</b> ${x.texto}. <span>Tú ${num(x.pred)}, real ${num(x.real, 2)} ${x.unidad}.</span></li>`).join("");
    dibuja();
    return res;
  }
  function reinicia(op = {}) {
    estado = "abierta"; reales = null; avisa("");
    if (op.vaciar) M.forEach((m) => { val[m.id] = null; entradas[m.id].value = ""; });
    pinta(); dibuja(); if (o.alReiniciar) o.alReiniciar();
  }

  pinta();
  return {
    usa(e) { escena = e; (e.capaPrediccion || e.svg).appendChild(capa); dibuja(); },
    fija, compara, reinicia, pide, completa, redibuja: dibuja,
    get estado() { return estado; },
    valores() { return { ...val }; },
    pon(v) { Object.assign(val, v); M.forEach((m) => { entradas[m.id].value = hay(val[m.id]) ? val[m.id] : ""; }); pinta(); dibuja(); }
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
