/* Códice Vivo · Láminas 2.0 · Cuaderno (ver docs/diseno-laminas-2.md)
   Libreta de papel rayado con cinta (como la hoja de notas del video de la catapulta). Ahí viven los números:
   datos, medidas, fórmulas paso a paso (se escriben a mano con animación), predicción vs resultado y el truco.
   En escritorio es un panel lateral; en celular, una hoja que sube desde abajo.

   const cuaderno = creaCuaderno({ boton, titulo, secciones: [{ id, titulo }] });
   cuaderno.escribe(id, [lineas], { anima })   → reemplaza el contenido de la sección
   cuaderno.anota(id, linea, { anima })        → agrega una línea al final (medidas, predicciones)
   cuaderno.abre() · cierra() · alterna() · abierto
   Las líneas son HTML corto (se permite <sub>, <b>, <i>, <span class="l2-c-…">). */

let serie = 0;
const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function creaCuaderno(o) {
  const id = "l2c" + (++serie), boton = o.boton;
  const hoja = document.createElement("aside");
  hoja.className = "l2-cuaderno"; hoja.id = id; hoja.setAttribute("aria-label", o.titulo || "Cuaderno"); hoja.hidden = true;
  hoja.innerHTML = `<div class="l2-cuaderno__papel">
      <span class="l2-cuaderno__cinta" aria-hidden="true"></span>
      <div class="l2-cuaderno__cab"><h2 class="l2-cuaderno__t" tabindex="-1">${o.titulo || "Cuaderno"}</h2>
        <button type="button" class="l2-cuaderno__cerrar" aria-label="Cerrar el cuaderno"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>
      <div class="l2-cuaderno__cuerpo">${o.secciones.map((s) => `<section class="l2-cuaderno__sec" data-sec="${s.id}"><h3>${s.titulo}</h3><div class="l2-cuaderno__lineas"></div></section>`).join("")}</div>
    </div>`;
  document.body.appendChild(hoja);
  const tit = hoja.querySelector(".l2-cuaderno__t"), cuerpo = hoja.querySelector(".l2-cuaderno__cuerpo");
  const lineasDe = (s) => hoja.querySelector(`[data-sec="${s}"] .l2-cuaderno__lineas`);
  let abierto = false, pendientes = 0, cola = Promise.resolve();

  boton.setAttribute("aria-controls", id); boton.setAttribute("aria-expanded", "false");
  boton.classList.add("l2-cuaderno-b");
  const insignia = document.createElement("span"); insignia.className = "l2-cuaderno-b__n"; insignia.hidden = true; boton.appendChild(insignia);
  function marcaPendiente(n) { pendientes = abierto ? 0 : pendientes + n; insignia.hidden = !pendientes; insignia.textContent = pendientes; }

  function abre() {
    if (abierto) return; abierto = true; hoja.hidden = false;
    requestAnimationFrame(() => hoja.classList.add("es-abierto"));
    document.documentElement.classList.add("l2-con-cuaderno");
    boton.setAttribute("aria-expanded", "true"); marcaPendiente(0);
    tit.focus({ preventScroll: true });
    /* lo que se escribió con el cuaderno cerrado se escribe ahora, a la vista */
    animaRenglones([...hoja.querySelectorAll(".l2-renglon.es-pendiente")], false);
  }
  function cierra(devolver = true) {
    if (!abierto) return; abierto = false; hoja.classList.remove("es-abierto");
    document.documentElement.classList.remove("l2-con-cuaderno");
    boton.setAttribute("aria-expanded", "false");
    setTimeout(() => { if (!abierto) hoja.hidden = true; }, quieto() ? 0 : 280);
    if (devolver) boton.focus({ preventScroll: true });
  }
  boton.addEventListener("click", () => (abierto ? cierra() : abre()));
  hoja.querySelector(".l2-cuaderno__cerrar").addEventListener("click", () => cierra());
  hoja.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); cierra(); } });

  /* Escritura a mano: cada renglón se descubre de izquierda a derecha, uno tras otro. */
  function animaRenglones(lista, desplaza = true) {
    lista.forEach((r) => r.classList.remove("es-pendiente"));
    if (!lista.length || quieto()) return;
    let retraso = 0;
    lista.forEach((r) => {
      const dur = Math.min(1.1, 0.25 + r.textContent.length * 0.022);
      r.style.setProperty("--dur", dur + "s"); r.style.setProperty("--ret", retraso + "s");
      r.classList.remove("es-escribe"); void r.offsetWidth; r.classList.add("es-escribe");
      retraso += dur * 0.85;
    });
    const ultimo = lista[lista.length - 1];
    if (abierto && desplaza) ultimo.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function renglon(html) { const p = document.createElement("p"); p.className = "l2-renglon"; p.innerHTML = html; return p; }

  function escribe(sec, lineas, op = {}) {
    const c = lineasDe(sec); if (!c) return;
    c.textContent = "";
    const nuevos = lineas.map((h) => c.appendChild(renglon(h)));
    if (op.anima === false) return;
    if (abierto) animaRenglones(nuevos); else { nuevos.forEach((r) => r.classList.add("es-pendiente")); marcaPendiente(op.cuenta || 1); }
  }
  function anota(sec, html, op = {}) {
    const c = lineasDe(sec); if (!c) return;
    const r = c.appendChild(renglon(html));
    if (op.anima === false) return;
    if (abierto) animaRenglones([r]); else { r.classList.add("es-pendiente"); marcaPendiente(1); }
  }

  return {
    abre, cierra, alterna: () => (abierto ? cierra() : abre()),
    escribe, anota,
    limpia(sec) { const c = lineasDe(sec); if (c) c.textContent = ""; },
    ve(sec) { const s = hoja.querySelector(`[data-sec="${sec}"]`); abre(); if (s) cuerpo.scrollTo({ top: s.offsetTop - 8, behavior: quieto() ? "auto" : "smooth" }); },
    get abierto() { return abierto; },
    el: hoja
  };
}
