// Principio de Arquímedes — interactivo 2D (Códice Vivo)
(() => {
  const RUTA_JSON = "../../../contenido/fisica/principio-de-arquimedes-interactivo.json";

  // Física
  const PESO = 26.46;        // N (2 700 · 9.8 · 0.001)
  const E_MAX = 9.8;         // N (1 000 · 9.8 · 0.001)
  // Geometría de la lámina (coordenadas del SVG)
  const PX_N = 4;            // escala del dinamómetro: 4 px por N
  const DY_MAX = 150;        // recorrido del dinamómetro; el SVG está dibujado en DY_MAX
  const LADO = 80;           // lado del cubo en px
  const NIVEL = 375;         // nivel del agua = pico del vaso de derrame
  const FONDO = 553.5;       // fondo interior de los vasos
  const RECOL_ALTO = 74.5;   // altura del agua desalojada con el cubo completo (misma área)
  const BAJADA = 32.5;       // cuánto baja el nivel si se saca el cubo entero (6400 / 197)
  const FLECHA_PX = 3.5;     // escala común de fuerzas: 3.5 px por N
  const CENTRO_CUBO = 445.8; // centro del cubo en el estado dibujado
  const IND_Y = 276.8;       // fin del resorte en el estado dibujado (16.7 N)
  const MARCA_DIBUJADA = PESO - E_MAX;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const din = $("#dinamometro-dentro");
  const cordon = $("#dinamometro-dentro-cordon");
  const resorte = $("#dinamometro-dentro-resorte polyline");
  const indicador = $("#dinamometro-dentro-indicador");
  const lectura = indicador.querySelector("text");
  const cubo = $("#cubo");
  const aguaRects = $$("#agua rect");
  const superficie = $("#agua line");
  const chorro = $("#agua-desplazada path");
  const recolRects = $$("#agua-desplazada rect");
  const fEmpuje = $("#flecha-empuje");
  const fPeso = $("#flecha-peso");
  const rango = $("#bajar");
  const salida = $("#sumergido");

  let fMax = 0;   // fracción máxima sumergida = agua ya derramada
  let tChorro;

  const puntosResorte = (yFin) => {
    const y0 = 206, n = 12, paso = (yFin - y0) / n, p = [`540,${y0}`];
    for (let i = 1; i < n; i++) p.push(`${i % 2 ? 532 : 548},${(y0 + paso * i).toFixed(1)}`);
    p.push(`540,${yFin.toFixed(1)}`);
    return p.join(" ");
  };

  const flecha = (g, x, y0, largo, arriba) => {
    g.style.display = largo < 1 ? "none" : "";
    const s = arriba ? -1 : 1, punta = y0 + s * largo, base = largo > 12 ? punta - s * 12 : y0;
    const linea = g.querySelector("line");
    linea.setAttribute("y1", y0.toFixed(1));
    linea.setAttribute("y2", base.toFixed(1));
    g.querySelector("polygon").setAttribute("points", `${x},${punta.toFixed(1)} ${x - 7},${base.toFixed(1)} ${x + 7},${base.toFixed(1)}`);
    g.querySelector("text").setAttribute("y", (arriba ? punta + 8 : punta - 4).toFixed(1));
  };

  const mostrarChorro = () => {
    chorro.style.display = "";
    clearTimeout(tChorro);
    tChorro = setTimeout(() => { chorro.style.display = "none"; }, 700);
  };

  function actualizar() {
    const dy = DY_MAX * rango.value / 1000;
    const hundirLleno = LADO + PX_N * E_MAX;            // 119.2 px para quedar sumergido con el vaso lleno
    let f = Math.min(1, dy / hundirLleno);
    if (f >= fMax) {
      if (f > fMax + 1e-6) mostrarChorro();
      fMax = f;                                          // el vaso está al pico: el agua extra se derrama
    } else {
      // El agua derramada no regresa: el nivel bajó y el cubo queda menos sumergido
      f = Math.max(0, Math.min(1, (dy - BAJADA * fMax) / (hundirLleno - BAJADA)));
    }

    const E = E_MAX * f, marca = PESO - E;
    const mov = dy - DY_MAX, off = PX_N * (marca - MARCA_DIBUJADA);

    din.setAttribute("transform", `translate(0 ${mov.toFixed(1)})`);
    cordon.setAttribute("y1", (40 - mov).toFixed(1));
    indicador.setAttribute("transform", `translate(0 ${off.toFixed(1)})`);
    resorte.setAttribute("points", puntosResorte(IND_Y + off));
    lectura.textContent = `${marca.toFixed(1)} N`;
    cubo.setAttribute("transform", `translate(0 ${(mov + off).toFixed(1)})`);

    const nivel = NIVEL + BAJADA * (fMax - f);
    aguaRects.forEach((r) => { r.setAttribute("y", nivel.toFixed(1)); r.setAttribute("height", (FONDO - nivel).toFixed(1)); });
    superficie.setAttribute("y1", nivel.toFixed(1));
    superficie.setAttribute("y2", nivel.toFixed(1));

    const h = RECOL_ALTO * fMax;
    recolRects.forEach((r) => { r.setAttribute("y", (FONDO - h).toFixed(1)); r.setAttribute("height", h.toFixed(1)); });
    chorro.setAttribute("d", `M690 392Q712 410 712 440V${(FONDO - h).toFixed(1)}`);

    const cy = CENTRO_CUBO + mov + off;
    flecha(fEmpuje, 528, cy, FLECHA_PX * E, true);
    flecha(fPeso, 552, cy, FLECHA_PX * PESO, false);

    const pct = Math.round(f * 100);
    salida.textContent = `${pct} %`;
    rango.setAttribute("aria-valuetext", `${pct} % sumergido, el dinamómetro marca ${marca.toFixed(1)} N`);
    $("#c-vol").textContent = (0.001 * f).toFixed(4);
    $("#c-emp").textContent = E.toFixed(1);
    $("#c-marca").textContent = marca.toFixed(1);
    $("#c-nota").textContent =
      f === 0 ? "Fuera del agua: el dinamómetro marca el peso completo."
      : f < 1 ? "Mientras más volumen entra al agua, mayor es el empuje."
      : dy > hundirLleno + 1 ? "Más hondo, mismo empuje: el volumen sumergido ya no cambia."
      : "Sumergido por completo: el dinamómetro marca peso − empuje.";
  }

  rango.addEventListener("input", actualizar);
  $("#reiniciar").addEventListener("click", () => { rango.value = 0; fMax = 0; actualizar(); });
  chorro.style.display = "none";
  actualizar();

  // ---------- Contenido de los 6 pasos ----------
  const BIEN = '<svg class="marca-svg m-bien" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>';
  const MAL = '<svg class="marca-svg m-mal" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

  function pregunta(sec, q) {
    const p = document.createElement("p");
    p.innerHTML = q.enunciado;
    const lista = document.createElement("div");
    lista.className = "opciones";
    q.opciones.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "boton";
      b.innerHTML = `<span>${o.texto}</span><span class="marca" aria-live="polite"></span>`;
      b.addEventListener("click", () => {
        const bien = !!o.correcta;
        b.classList.add(bien ? "correcta" : "incorrecta");
        b.querySelector(".marca").innerHTML = `${bien ? BIEN : MAL} ${bien ? "Correcto." : "No."} ${o.explicacion}`;
      });
      lista.append(b);
    });
    sec.append(p, lista);
  }

  function pintar(d) {
    $("#titulo").textContent = d.titulo;
    $("#subtitulo").textContent = d.subtitulo;
    $("#pie-lamina").textContent = d.pieLamina;
    d.pasos.forEach((paso) => {
      const sec = document.createElement("section");
      sec.innerHTML = `<h2 class="titulo-seccion"><span class="paso">Paso ${paso.n}.</span>${paso.titulo}</h2>`;
      (paso.parrafos || []).forEach((t) => { const p = document.createElement("p"); p.innerHTML = t; sec.append(p); });
      if (paso.pregunta) pregunta(sec, paso.pregunta);
      $(paso.n <= 2 ? "#pasos-a" : "#pasos-b").append(sec);
    });
  }

  fetch(RUTA_JSON)
    .then((r) => r.json())
    .then(pintar)
    .catch(() => {
      $("#pasos-a").innerHTML = '<p class="suave">No se pudo cargar el contenido. Abre la página con <code>npx serve .</code> desde la raíz del repo.</p>';
    });
})();
