/* Códice Vivo · Láminas 2.0 · Pantalla completa
   Lleva la lámina (escena + controles compactos) a toda la pantalla. Idea tomada del «modo lámina» de
   leyes-de-newton-1, hecha pieza compartida:
     · Usa la API de pantalla completa si el navegador la permite (y en Android pide girar a horizontal).
     · Si no (iPhone, navegador de Instagram…), simula: capa fija a 100dvh y sin desplazamiento de la página.
     · En celular vertical sugiere girar el teléfono.
     · Esc o ✕ para salir; al salir del modo nativo con el gesto del sistema, también se sale.
   Qué se ve dentro lo decide la página con data-pc en los hijos de «raiz»:
     data-pc="cabeza" | "escena" | "pred" | "tiempo" | "herr"  (lo que no lleva data-pc se oculta).
   «dentro»: elementos que viven fuera de raiz (p. ej. el cuaderno) y deben verse encima en el modo nativo.

   const pc = creaPantallaCompleta({ boton, raiz, dentro: [el], alCambiar(si) });
   pc.entra() · pc.sale() · pc.activa */

let serie = 0;

export function creaPantallaCompleta(o) {
  const id = "l2pc" + (++serie), raiz = o.raiz, boton = o.boton;
  let activa = false, simulada = false, huecos = [], antesFoco = null;

  const cerrar = document.createElement("button");
  cerrar.type = "button"; cerrar.className = "l2-pc__cerrar"; cerrar.setAttribute("aria-label", "Salir de pantalla completa");
  cerrar.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  const gira = document.createElement("p");
  gira.className = "l2-pc__gira"; gira.id = id + "-gira";
  gira.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 12a9 9 0 0 1 4-7.5M3 12l-1.5-2M3 12l2-1.2"/></svg><span>Gira el teléfono para verla más grande</span>';
  raiz.append(cerrar, gira);
  boton.classList.add("l2-pc-b"); boton.setAttribute("aria-pressed", "false");

  const nativa = () => !!(document.fullscreenEnabled && raiz.requestFullscreen);

  async function entra() {
    if (activa) return; activa = true; antesFoco = document.activeElement;
    huecos = (o.dentro || []).filter(Boolean).map((e) => { const c = document.createComment("l2-pc"); e.before(c); raiz.appendChild(e); return [e, c]; });
    raiz.classList.add("l2-pc"); document.documentElement.classList.add("l2-pc-abierta");
    simulada = true;
    if (nativa()) {
      try { await raiz.requestFullscreen({ navigationUI: "hide" }); simulada = false; } catch (e) { simulada = true; }
      if (!simulada) { try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch (e) { /* no se puede bloquear: se sugiere girar */ } }
    }
    raiz.classList.toggle("l2-pc--simulada", simulada);
    boton.setAttribute("aria-pressed", "true");
    cerrar.focus({ preventScroll: true });
    if (o.alCambiar) o.alCambiar(true);
  }
  function sale() {
    if (!activa) return; activa = false;
    raiz.classList.remove("l2-pc", "l2-pc--simulada"); document.documentElement.classList.remove("l2-pc-abierta");
    huecos.forEach(([e, c]) => c.replaceWith(e)); huecos = [];
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* nada */ }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    boton.setAttribute("aria-pressed", "false");
    (antesFoco && antesFoco.isConnected ? antesFoco : boton).focus({ preventScroll: true });
    if (o.alCambiar) o.alCambiar(false);
  }
  boton.addEventListener("click", () => (activa ? sale() : entra()));
  cerrar.addEventListener("click", sale);
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && activa && !simulada) sale(); });
  document.addEventListener("keydown", (e) => { if (activa && e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); sale(); } });

  return { entra, sale, get activa() { return activa; }, get simulada() { return simulada; } };
}
