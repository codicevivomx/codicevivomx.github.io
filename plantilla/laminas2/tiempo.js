/* Códice Vivo · Láminas 2.0 · Control del tiempo (ver docs/diseno-laminas-2.md)
   Reproducir / pausa, cámara lenta (×0.25, ×0.5, ×1) y línea de tiempo arrastrable.
   No sabe nada de física: solo lleva un reloj t entre 0 y «duracion» y avisa cuando cambia.

   const reloj = creaTiempo(contenedor, { duracion, paso: 0.5, velocidad: 1, alCambiar(t, info), alTerminar() });
   reloj.t · reloj.pon(t) · reloj.duracion(d) · reloj.juega() · reloj.pausa() · reloj.corriendo
   reloj.marcas() → [0.5, 1, 1.5…] (instantes del rastro, cada «paso» segundos)
   info = { corriendo, motivo: "juego" | "arrastre" | "pon" | "fin" }
   Con «menos movimiento», juega() salta al final. */

const VELOCIDADES = [0.25, 0.5, 1];
let serie = 0;

const fmt = (v) => (Math.round(v * 100) / 100).toFixed(2).replace(/0$/, "");

export function creaTiempo(cont, o = {}) {
  const id = "l2t" + (++serie);
  let dur = Math.max(0.01, o.duracion || 1), t = 0, vel = VELOCIDADES.includes(o.velocidad) ? o.velocidad : 1;
  let corriendo = false, cuadro = 0, antes = 0;
  const paso = o.paso || 0.5;
  const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  cont.classList.add("l2-tiempo");
  cont.innerHTML = `
    <button type="button" class="l2-tiempo__jugar" aria-label="Reproducir"><svg viewBox="0 0 20 20" aria-hidden="true"><path class="l2-ico-play" d="M6 4l10 6-10 6z"/><path class="l2-ico-pausa" d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z"/></svg></button>
    <input type="range" id="${id}-r" class="l2-tiempo__barra" min="0" step="0.01" aria-label="Línea de tiempo">
    <output class="l2-tiempo__t" for="${id}-r"></output>
    <div class="l2-tiempo__vel" role="radiogroup" aria-label="Velocidad">
      ${VELOCIDADES.map((v) => `<button type="button" role="radio" data-v="${v}" aria-checked="${v === vel}">×${String(v).replace(/^0/, "")}</button>`).join("")}
    </div>`;
  const bJugar = cont.querySelector(".l2-tiempo__jugar"), barra = cont.querySelector(".l2-tiempo__barra"),
    salida = cont.querySelector(".l2-tiempo__t"), bVel = [...cont.querySelectorAll(".l2-tiempo__vel button")];

  function pinta() {
    barra.max = dur; barra.value = t;
    barra.style.setProperty("--p", (100 * t / dur) + "%");
    const txt = `t = ${fmt(t)} s`;
    if (salida.textContent !== txt) salida.textContent = txt;
    barra.setAttribute("aria-valuetext", `${fmt(t)} de ${fmt(dur)} segundos`);
    bJugar.classList.toggle("es-pausa", corriendo);
    bJugar.setAttribute("aria-label", corriendo ? "Pausar" : t >= dur - 1e-9 ? "Repetir" : "Reproducir");
  }
  function avisa(motivo) { pinta(); if (o.alCambiar) o.alCambiar(t, { corriendo, motivo }); }

  function bucle(ahora) {
    t = Math.min(dur, t + (ahora - antes) / 1000 * vel); antes = ahora;
    if (t >= dur - 1e-9) { t = dur; corriendo = false; avisa("fin"); if (o.alTerminar) o.alTerminar(); return; }
    avisa("juego"); cuadro = requestAnimationFrame(bucle);
  }
  function juega() {
    if (corriendo) return;
    if (t >= dur - 1e-9) t = 0;
    if (quieto()) { t = dur; avisa("fin"); if (o.alTerminar) o.alTerminar(); return; }
    corriendo = true; antes = performance.now(); avisa("juego");
    cuadro = requestAnimationFrame(bucle);
  }
  function pausa() { if (!corriendo) return; cancelAnimationFrame(cuadro); corriendo = false; avisa("pausa"); }

  bJugar.addEventListener("click", () => {
    if (corriendo) { pausa(); return; }
    if (o.antesDeJugar && o.antesDeJugar() === false) return;
    juega();
  });
  barra.addEventListener("input", () => { cancelAnimationFrame(cuadro); corriendo = false; t = Math.min(dur, Math.max(0, +barra.value)); avisa("arrastre"); });
  bVel.forEach((b) => b.addEventListener("click", () => {
    vel = +b.dataset.v; bVel.forEach((x) => x.setAttribute("aria-checked", x === b));
  }));
  pinta();

  return {
    get t() { return t; },
    get corriendo() { return corriendo; },
    get velocidad() { return vel; },
    get total() { return dur; },
    pon(v, motivo = "pon") { t = Math.min(dur, Math.max(0, v)); avisa(motivo); },
    duracion(d) { dur = Math.max(0.01, d); if (t > dur) t = dur; pinta(); },
    juega, pausa,
    detiene() { cancelAnimationFrame(cuadro); corriendo = false; pinta(); },
    marcas(hasta = dur) { const m = []; for (let k = paso; k <= hasta + 1e-9; k += paso) m.push(Math.round(k * 1000) / 1000); return m; }
  };
}
