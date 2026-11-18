/* Códice Vivo · Láminas 2.0 · Práctica (ver docs/diseno-laminas-2.md)
   5-10 problemas por tema con el motor de retos (retos/motor/): números aleatorios, opción múltiple con
   errores típicos y pistas en 3 escalones. Y el modo examen: 10 reactivos mezclados, cronometrado.
   El motor se descarga solo cuando la práctica se acerca a la pantalla.

   montaPractica(cont, { id, problemas: [PROB], resumen, examen: { reactivos: 10, minutos: 12, bancos: [[PROB]…] } })
   PROB = { id, titulo, etiqueta?,
            genera(az) → datos             (az del motor: num, entero, elige, baraja)
            enunciado(datos) → texto
            pregunta(datos) → texto
            opciones(datos) → [{ texto, correcta, pista }]   («pista»: explica ese error en concreto)
            pistas(datos) → [suave, fórmula, paso resuelto]
            dibujo?(datos) → SVG en texto (boceto opcional arriba del enunciado) } */

const MOTOR_JS = new URL("../../retos/motor/motor.js", import.meta.url).href;
const MOTOR_CSS = new URL("../../retos/motor/motor.css", import.meta.url).href;
let cargaMotor = null;
function motor() {
  if (window.MotorRetos) return Promise.resolve(window.MotorRetos);
  if (!cargaMotor) cargaMotor = new Promise((ok, mal) => {
    if (!document.querySelector(`link[href="${MOTOR_CSS}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = MOTOR_CSS; document.head.appendChild(l); }
    const s = document.createElement("script"); s.src = MOTOR_JS; s.onload = () => ok(window.MotorRetos); s.onerror = mal; document.head.appendChild(s);
  });
  return cargaMotor;
}
const crea = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
const boton = (c, txt) => { const b = crea("button", c, txt); b.type = "button"; return b; };
const reloj = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const semilla = () => (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;

/* PROB → NIVEL del motor (un paso de opción múltiple, opciones barajadas) */
function aNivel(p) {
  return {
    id: p.id, titulo: p.titulo, etiqueta: p.etiqueta,
    genera(az) { const d = p.genera(az); d.__ops = az.baraja(p.opciones(d)); return d; },
    enunciado: (d) => p.enunciado(d),
    pistas: (d) => p.pistas(d),
    prepara(escena, d) { escena.dibuja(p.dibujo ? p.dibujo(d) : ""); },
    pasos: (d) => [{ tipo: "opciones", pregunta: p.pregunta(d), opciones: d.__ops }]
  };
}

export function montaPractica(cont, o) {
  cont.classList.add("l2-practica");
  const caja = crea("div", "l2-practica__juego"), pie = crea("div", "l2-practica__examen");
  caja.innerHTML = '<p class="l2-practica__carga">Cargando la práctica…</p>';
  cont.append(caja, pie);
  let montado = false;
  function monta() {
    if (montado) return; montado = true;
    motor().then((M) => {
      caja.textContent = "";
      const juego = crea("div"); caja.appendChild(juego);
      M.monta(juego, {
        id: o.id,
        creaEscena(lienzo) {
          lienzo.classList.add("l2-boceto");
          return { dibuja(svg) { lienzo.innerHTML = svg || ""; lienzo.hidden = !svg; } };
        },
        niveles: o.problemas.map(aNivel),
        resumen: o.resumen
      });
      if (o.examen) montaExamen(pie, M, o);
    }).catch(() => { caja.innerHTML = '<p class="l2-practica__carga">No se pudo cargar el motor de retos (retos/motor/motor.js).</p>'; });
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); monta(); } }, { rootMargin: "600px 0px" });
    io.observe(cont);
  } else monta();
  return { monta };
}

/* ---------- Modo examen ---------- */
function montaExamen(cont, M, o) {
  const X = Object.assign({ reactivos: 10, minutos: 12 }, o.examen);
  const bancos = (X.bancos || [o.problemas]).flat();
  const CLAVE = "cv-examen-" + o.id;
  let mejor = null;
  try { mejor = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) { mejor = null; }

  cont.innerHTML = "";
  const tarjeta = crea("div", "l2-examen");
  cont.appendChild(tarjeta);
  let items = [], i = 0, fin = 0, tic = 0, elegidas = [];

  function portada() {
    clearInterval(tic);
    tarjeta.innerHTML = `<p class="l2-examen__k">Modo examen</p>
      <p class="l2-examen__t">${X.reactivos} reactivos mezclados · ${X.minutos} minutos</p>
      <p>Sin pistas, como en el examen de admisión. Al final ves qué fallaste y por qué.</p>
      ${mejor ? `<p class="l2-examen__mejor">Tu mejor resultado: ${mejor.bien} de ${mejor.total} en ${reloj(mejor.seg)}.</p>` : ""}`;
    const b = boton("boton pri", "Empezar examen"); b.addEventListener("click", empieza); tarjeta.appendChild(b);
  }
  function empieza() {
    /* todos los problemas al menos una vez (si caben) y el resto al azar */
    const az = M.azar(semilla());
    let lista = az.baraja(bancos);
    while (lista.length < X.reactivos) lista = lista.concat(az.baraja(bancos));
    items = lista.slice(0, X.reactivos).map((p) => { const a = M.azar(semilla() ^ Math.floor(az.num() * 1e9)); const d = p.genera(a); return { p, d, ops: a.baraja(p.opciones(d)) }; });
    elegidas = items.map(() => null); i = 0;
    fin = performance.now() + X.minutos * 60000;
    clearInterval(tic); tic = setInterval(() => { const r = (fin - performance.now()) / 1000; const c = tarjeta.querySelector(".l2-examen__reloj"); if (c) c.textContent = reloj(r); if (r <= 0) termina(); }, 500);
    muestra();
  }
  function muestra() {
    const it = items[i];
    tarjeta.innerHTML = `<div class="l2-examen__barra"><span>Reactivo ${i + 1} de ${items.length}</span><span class="l2-examen__reloj" role="timer" aria-label="Tiempo restante">${reloj((fin - performance.now()) / 1000)}</span></div>
      <progress max="${items.length}" value="${i}"></progress>
      ${it.p.dibujo ? `<div class="l2-boceto">${it.p.dibujo(it.d)}</div>` : ""}
      <p class="l2-examen__enun">${it.p.enunciado(it.d)}</p><p class="l2-examen__q" tabindex="-1">${it.p.pregunta(it.d)}</p>`;
    const g = crea("div", "l2-examen__ops"); g.setAttribute("role", "radiogroup"); g.setAttribute("aria-label", "Opciones");
    it.ops.forEach((op, k) => {
      const b = boton("l2-examen__op", "ABCD"[k] + ") " + op.texto); b.setAttribute("role", "radio"); b.setAttribute("aria-checked", elegidas[i] === k);
      b.addEventListener("click", () => { elegidas[i] = k; [...g.children].forEach((x, j) => x.setAttribute("aria-checked", j === k)); sig.disabled = false; });
      g.appendChild(b);
    });
    tarjeta.appendChild(g);
    const acc = crea("div", "l2-examen__acc");
    const salta = boton("boton sec", "Saltar"); salta.addEventListener("click", avanza);
    const sig = boton("boton pri", i === items.length - 1 ? "Terminar" : "Siguiente"); sig.disabled = elegidas[i] == null; sig.addEventListener("click", avanza);
    acc.append(salta, sig); tarjeta.appendChild(acc);
    tarjeta.querySelector(".l2-examen__q").focus({ preventScroll: true });
  }
  function avanza() { if (i < items.length - 1) { i++; muestra(); } else termina(); }
  function termina() {
    clearInterval(tic);
    const seg = Math.min(X.minutos * 60, X.minutos * 60 - (fin - performance.now()) / 1000);
    const bien = items.filter((it, k) => elegidas[k] != null && it.ops[elegidas[k]].correcta).length;
    if (!mejor || bien > mejor.bien || (bien === mejor.bien && seg < mejor.seg)) { mejor = { bien, total: items.length, seg }; try { localStorage.setItem(CLAVE, JSON.stringify(mejor)); } catch (e) { /* sin almacenamiento */ } }
    tarjeta.innerHTML = `<p class="l2-examen__k">Resultado</p><p class="l2-examen__nota" tabindex="-1">${bien} de ${items.length}</p><p>Tiempo: ${reloj(seg)}.</p>`;
    const ol = crea("ol", "l2-examen__rev");
    items.forEach((it, k) => {
      const e = elegidas[k], ok = e != null && it.ops[e].correcta, buena = it.ops.find((x) => x.correcta);
      const li = crea("li", ok ? "es-bien" : "es-mal");
      li.innerHTML = `<b>${ok ? "✓" : "✗"} ${it.p.titulo}${/[?!.]$/.test(it.p.titulo) ? "" : "."}</b> ${ok ? buena.texto : `Elegiste ${e == null ? "nada" : it.ops[e].texto}; era ${buena.texto}. ${e != null && it.ops[e].pista ? it.ops[e].pista : it.p.pistas(it.d)[2]}`}`;
      ol.appendChild(li);
    });
    tarjeta.appendChild(ol);
    const otra = boton("boton pri", "Otro examen"); otra.addEventListener("click", empieza);
    const vuelve = boton("boton sec", "Salir"); vuelve.addEventListener("click", portada);
    const acc = crea("div", "l2-examen__acc"); acc.append(vuelve, otra); tarjeta.appendChild(acc);
    tarjeta.querySelector(".l2-examen__nota").focus({ preventScroll: true });
  }
  portada();
}
