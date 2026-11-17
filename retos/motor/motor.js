/* Códice Vivo · motor de retos interactivos (ver docs/diseno-retos.md)
   Lleva lo que es igual en todos los retos: niveles, números aleatorios con semilla, validación con
   tolerancia, pistas en 3 escalones (pista suave → fórmula → paso resuelto), estrellas por nivel y
   progreso guardado. Cada reto es un archivo de configuración (retos/<id>/reto.js).

   Uso:  <div data-juego="<id>"></div>
         <script src="../motor/motor.js" defer></script>
         <script src="reto.js" defer></script>      → llama a MotorRetos.monta(elemento, RETO)

   RETO = { id, creaEscena(contenedor, ctx) → escena, niveles: [NIVEL], resumen: { titulo, puntos: [], enlace: { href, texto } } }
   NIVEL = { id, titulo, etiqueta,
             genera(az) → datos            (az: azar con semilla; toda la física sale de aquí)
             enunciado(datos) → texto
             pistas(datos) → [suave, fórmula, paso resuelto]
             prepara(escena, datos, ctx)   (deja la escena lista)
             pasos(datos) → [PASO] }
   PASO (campo «tipo»):
     numeros  { pregunta, campos: [{ id, etiqueta, unidad, valor, tol }], alFallar(), alAcertar() }
     opciones { pregunta, opciones: [{ texto, correcta, pista, valor }], prediccion, id, alAcertar() }
              · «pista» de una opción: explica ese error en concreto (si falta, sale el siguiente escalón).
              · prediccion: true → se anota la respuesta sin calificarla (queda en respuestas[id]).
     tiros    { pregunta, controles: [{ id, etiqueta, min, max, paso, valor, unidad }], intentos, boton,
                alCambiar(escena, datos, valores), lanza(escena, datos, valores, n) → { bien, mensaje }, estrellas(n) }
     accion   { pregunta, boton, ejecuta(escena, datos, respuestas) → { mensaje, fallo } }
   Todos los ganchos reciben (escena, datos, …, ctx) y pueden devolver una promesa.
   ctx = { anima(segundos, paso(k), curva), espera(segundos), reducido() }: con «menos movimiento» las
   animaciones saltan a su estado final. Al cambiar de nivel, las animaciones en curso se abandonan. */
(function (raiz) {
  'use strict';

  /* ---------- Piezas sin página (también las usa la prueba en Node) ---------- */
  function azar(semilla) {
    var s = (semilla >>> 0) || 1;
    function num() { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    return {
      num: num,
      entero: function (a, b) { return a + Math.floor(num() * (b - a + 1)); },
      elige: function (lista) { return lista[Math.floor(num() * lista.length)]; },
      baraja: function (lista) { var c = lista.slice(); for (var i = c.length - 1; i > 0; i--) { var j = Math.floor(num() * (i + 1)), x = c[i]; c[i] = c[j]; c[j] = x; } return c; }
    };
  }
  function cerca(valor, esperado, tol) { return isFinite(valor) && Math.abs(valor - esperado) <= (tol || 0) + 1e-9; }
  /* «16», «16.5», «16,5», «16 m/s» → número; cualquier otra cosa → NaN */
  function numero(texto) {
    var s = String(texto).trim().replace(',', '.').replace(/\s*(m\/s|m|s|°)$/i, '');
    return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
  }
  function fmt(n, dec) { var k = Math.pow(10, dec == null ? 2 : dec); return String(Math.round(n * k) / k); }
  function estrellasDe(tope, fallos) { return Math.max(1, Math.min(tope, 3 - fallos)); }

  var CURVAS = {
    lineal: function (k) { return k; },
    entra: function (k) { return k * k; },
    sale: function (k) { return 1 - (1 - k) * (1 - k); },
    suave: function (k) { return k < 0.5 ? 2 * k * k : 1 - (2 - 2 * k) * (2 - 2 * k) / 2; }
  };

  /* ---------- Página ---------- */
  function crea(etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function boton(clase, texto) { var b = crea('button', clase, texto); b.type = 'button'; return b; }
  var cuenta = 0;

  function monta(cont, reto) {
    var niveles = reto.niveles, CLAVE = 'cv-reto-' + reto.id, serie = ++cuenta;

    /* Progreso: estrellas por nivel. Si el navegador no deja guardar, el reto funciona igual. */
    var progreso = {};
    try { progreso = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { progreso = {}; }
    if (typeof progreso !== 'object') progreso = {};
    function guarda() { try { localStorage.setItem(CLAVE, JSON.stringify(progreso)); } catch (e) { /* sin almacenamiento */ } }

    /* Animación: un turno por nivel abierto; al cambiar de nivel, lo anterior deja de moverse. */
    var turno = 0;
    function reducido() { return !!(raiz.matchMedia && raiz.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    function anima(segundos, paso, curva) {
      var mio = turno, f = CURVAS[curva] || CURVAS.lineal;
      return new Promise(function (ok) {
        if (reducido() || !(segundos > 0)) { paso(1); ok(); return; }
        var t0 = performance.now();
        requestAnimationFrame(function cuadro(ahora) {
          if (mio !== turno) return;
          var k = Math.min(1, Math.max(0, (ahora - t0) / (segundos * 1000)));
          paso(f(k));
          if (k < 1) requestAnimationFrame(cuadro); else ok();
        });
      });
    }
    var ctx = { anima: anima, espera: function (s) { return anima(s, function () {}); }, reducido: reducido };

    /* ---------- Interfaz ---------- */
    cont.textContent = '';
    cont.classList.add('mr');
    var nav = crea('div', 'mr__niveles'); nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', 'Niveles del reto');
    var lienzo = crea('div', 'mr__escena');
    var panel = crea('div', 'mr__panel');
    var cab = crea('p', 'mr__cab'), enun = crea('p', 'mr__enunciado'), zona = crea('div', 'mr__paso');
    var aviso = crea('p', 'mr__aviso'); aviso.setAttribute('aria-live', 'polite');
    var lista = crea('ol', 'mr__pistas'); lista.setAttribute('aria-live', 'polite'); lista.setAttribute('aria-label', 'Pistas');
    var acciones = crea('div', 'mr__acciones');
    [cab, enun, zona, aviso, lista, acciones].forEach(function (e) { panel.appendChild(e); });
    cont.appendChild(nav); cont.appendChild(lienzo); cont.appendChild(panel);
    var escena = reto.creaEscena(lienzo, ctx);

    /* ---------- Estado del nivel abierto ---------- */
    var idx = 0, datos = null, pasos = [], p = 0, fallos = 0, tope = 3, pistas = [], vistas = 0, respuestas = {}, ocupado = false, entrada = true;

    function avisa(texto, tono) { aviso.className = 'mr__aviso' + (tono ? ' mr__aviso--' + tono : ''); aviso.textContent = texto || ''; }
    function dibujaEstrellas(n, clase) {
      var s = crea('span', clase || 'mr__estrellas');
      s.setAttribute('role', 'img'); s.setAttribute('aria-label', n + ' de 3 estrellas');
      for (var i = 0; i < 3; i++) s.appendChild(crea('span', i < n ? 'es-llena' : '', i < n ? '★' : '☆'));
      return s;
    }
    function pintaNav() {
      nav.textContent = '';
      niveles.forEach(function (n, i) {
        var b = boton('mr__nivel');
        b.appendChild(crea('span', 'mr__num', String(i + 1)));
        b.appendChild(crea('span', 'mr__nombre', n.titulo));
        var e = progreso[n.id] | 0;
        if (e) b.appendChild(dibujaEstrellas(e));
        b.setAttribute('aria-label', 'Nivel ' + (i + 1) + ': ' + n.titulo + (e ? ', ' + e + ' de 3 estrellas' : ''));
        if (i === idx) b.setAttribute('aria-current', 'true');
        b.addEventListener('click', function () { if (i !== idx) abre(i); });
        nav.appendChild(b);
      });
    }
    /* Siguiente escalón de pistas. Devuelve false si ya se dieron las tres. */
    function pista() {
      if (vistas >= pistas.length) return false;
      var li = crea('li', 'mr__pista');
      li.appendChild(crea('strong', '', ['Pista', 'Fórmula', 'Un paso resuelto'][vistas] || 'Pista'));
      li.appendChild(document.createTextNode(' ' + pistas[vistas]));
      lista.appendChild(li); vistas++;
      pintaAcciones();
      return true;
    }
    function pintaAcciones() {
      acciones.textContent = '';
      var paso = pasos[p];
      if (paso && paso.tipo !== 'tiros' && paso.tipo !== 'accion' && vistas < pistas.length) {
        var b = boton('mr__menor', vistas ? 'Otra pista' : 'Pedir una pista');
        b.addEventListener('click', pista);
        acciones.appendChild(b);
      }
      var otros = boton('mr__menor', 'Otros números');
      otros.addEventListener('click', function () { abre(idx); });
      acciones.appendChild(otros);
    }

    function abre(i, mismosDatos) {
      turno++; ocupado = false;
      idx = i;
      var n = niveles[i];
      if (!mismosDatos || !datos) datos = n.genera(azar((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0));
      pasos = n.pasos(datos); p = 0; fallos = 0; tope = 3; vistas = 0; respuestas = {};
      pistas = n.pistas(datos);
      cab.textContent = 'Nivel ' + (i + 1) + ' de ' + niveles.length + ' · ' + n.titulo + ' ';
      if (n.etiqueta) cab.appendChild(crea('span', 'etiqueta', n.etiqueta));
      enun.textContent = n.enunciado(datos);
      lista.textContent = ''; avisa('');
      pintaNav();
      n.prepara(escena, datos, ctx);
      muestraPaso();
    }

    function bloquea(caja, si) {
      [].forEach.call(caja.querySelectorAll('input, button'), function (e) { e.disabled = si !== false; });
    }
    function siguiente() {
      p++;
      if (p < pasos.length) muestraPaso(); else termina();
    }
    function muestraPaso() {
      var paso = pasos[p], mio = turno;
      zona.textContent = '';
      pintaAcciones();
      var q = null;
      if (paso.pregunta) { q = crea('p', 'mr__q', paso.pregunta); q.id = 'mr-q-' + serie + '-' + idx + '-' + p; q.tabIndex = -1; zona.appendChild(q); }
      if (paso.alEntrar) paso.alEntrar(escena, datos, ctx);
      TIPOS[paso.tipo](paso, mio, q);
      if (q && !entrada) q.focus({ preventScroll: true });
      entrada = false;
    }

    var TIPOS = {
      /* Casillas de número: «Comprobar» marca cuáles están mal y da el siguiente escalón de pistas. */
      numeros: function (paso, mio) {
        var form = crea('form', 'mr__campos'); form.noValidate = true;
        var entradas = paso.campos.map(function (c, i) {
          var fila = crea('label', 'mr__campo');
          fila.appendChild(crea('span', 'mr__rotulo', c.etiqueta + ' ='));
          var e = crea('input', 'mr__entrada'); e.type = 'text'; e.inputMode = 'decimal'; e.autocomplete = 'off'; e.size = 5;
          e.setAttribute('enterkeyhint', i < paso.campos.length - 1 ? 'next' : 'done');
          fila.appendChild(e);
          if (c.unidad) fila.appendChild(crea('span', 'mr__unidad', c.unidad));
          form.appendChild(fila);
          return e;
        });
        var ok = crea('button', 'boton mr__ok', 'Comprobar'); ok.type = 'submit';
        form.appendChild(ok);
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          if (ocupado) return;
          var vals = entradas.map(function (e) { return numero(e.value); });
          if (vals.some(isNaN)) { avisa('Escribe un número en cada casilla.'); return; }
          var mal = paso.campos.filter(function (c, i) {
            var bien = cerca(vals[i], c.valor, c.tol);
            entradas[i].classList.toggle('es-mal', !bien); entradas[i].classList.toggle('es-bien', bien);
            entradas[i].setAttribute('aria-invalid', String(!bien));
            return !bien;
          });
          if (mal.length) {
            fallos++;
            avisa('Revisa ' + mal.map(function (c) { return c.etiqueta; }).join(' y ') + '.', 'mal');
            pista();
            if (paso.alFallar) paso.alFallar(escena, datos, ctx);
            return;
          }
          bloquea(form); ocupado = true; avisa('¡Correcto!', 'bien');
          Promise.resolve(paso.alAcertar && paso.alAcertar(escena, datos, ctx)).then(function () { if (mio !== turno) return; ocupado = false; siguiente(); });
        });
        zona.appendChild(form);
      },

      /* Opción múltiple. Una opción puede traer la explicación de su propio error. */
      opciones: function (paso, mio, q) {
        var grupo = crea('div', 'mr__opciones'); grupo.setAttribute('role', 'group');
        if (q) grupo.setAttribute('aria-labelledby', q.id);
        paso.opciones.forEach(function (o) {
          var b = boton('mr__opcion', o.texto);
          b.addEventListener('click', function () {
            if (ocupado) return;
            if (paso.prediccion) {
              respuestas[paso.id] = o.valor;
              avisa('Predicción anotada: «' + o.texto + '». La comprobamos al lanzar.');
              siguiente();
            } else if (o.correcta) {
              b.classList.add('es-bien'); bloquea(grupo); b.disabled = false; b.setAttribute('aria-disabled', 'true');
              ocupado = true; avisa('¡Correcto!', 'bien');
              Promise.resolve(paso.alAcertar && paso.alAcertar(escena, datos, ctx)).then(function () { if (mio !== turno) return; ocupado = false; siguiente(); });
            } else {
              fallos++;
              b.classList.add('es-mal'); b.disabled = true;
              if (o.pista) avisa(o.pista, 'mal'); else { avisa('No es esa. Inténtalo de nuevo.', 'mal'); pista(); }
            }
          });
          grupo.appendChild(b);
        });
        zona.appendChild(grupo);
      },

      /* Controles deslizantes + «Lanzar», con intentos contados. Cada fallo da un escalón de pistas. */
      tiros: function (paso, mio) {
        var n = 0, caja = crea('div', 'mr__controles'), entradas = {};
        function valores() { var v = {}; paso.controles.forEach(function (c) { v[c.id] = parseFloat(entradas[c.id].value); }); return v; }
        paso.controles.forEach(function (c) {
          var id = 'mr-c-' + serie + '-' + idx + '-' + c.id, fila = crea('div', 'mr__control');
          var rot = crea('label', 'mr__rotulo', c.etiqueta); rot.htmlFor = id;
          var sal = crea('output', 'mr__valor'); sal.htmlFor = id;
          var menos = boton('mr__paso-b', '−'), mas = boton('mr__paso-b', '+');
          menos.setAttribute('aria-label', c.etiqueta + ': menos'); mas.setAttribute('aria-label', c.etiqueta + ': más');
          var e = crea('input', 'mr__desliza'); e.type = 'range'; e.id = id; e.min = c.min; e.max = c.max; e.step = c.paso || 1; e.value = c.valor;
          entradas[c.id] = e;
          function pinta(avisar) {
            sal.textContent = e.value + (c.unidad ? (c.unidad === '°' ? '' : ' ') + c.unidad : '');
            e.setAttribute('aria-valuetext', sal.textContent);
            if (avisar && paso.alCambiar) paso.alCambiar(escena, datos, valores(), ctx);
          }
          function mueve(d) { if (e.disabled) return; e.value = Math.min(c.max, Math.max(c.min, parseFloat(e.value) + d * (c.paso || 1))); pinta(true); }
          e.addEventListener('input', function () { pinta(true); });
          menos.addEventListener('click', function () { mueve(-1); }); mas.addEventListener('click', function () { mueve(1); });
          var cabeza = crea('div', 'mr__control-cab'); cabeza.appendChild(rot); cabeza.appendChild(sal);
          var linea = crea('div', 'mr__control-linea'); linea.appendChild(menos); linea.appendChild(e); linea.appendChild(mas);
          fila.appendChild(cabeza); fila.appendChild(linea); caja.appendChild(fila);
          pinta(false);
        });
        var pie = crea('div', 'mr__lanzar'), cuantos = crea('p', 'mr__tiros');
        var lanzar = boton('boton mr__ok', paso.boton || 'Lanzar');
        function pintaTiros() { cuantos.textContent = 'Tiro ' + Math.min(n + 1, paso.intentos) + ' de ' + paso.intentos; }
        pintaTiros();
        lanzar.addEventListener('click', function () {
          if (ocupado) return;
          ocupado = true; n++; bloquea(caja); lanzar.disabled = true;
          Promise.resolve(paso.lanza(escena, datos, valores(), n, ctx)).then(function (r) {
            if (mio !== turno) return;
            ocupado = false;
            if (r.bien) {
              if (paso.estrellas) tope = Math.min(tope, paso.estrellas(n));
              avisa(r.mensaje, 'bien'); siguiente(); return;
            }
            avisa(r.mensaje, 'mal'); pista();
            if (n >= paso.intentos) {
              zona.textContent = '';
              zona.appendChild(crea('p', 'mr__q', 'Se acabaron los tiros. Lee las pistas y vuelve a intentarlo.'));
              var otra = boton('boton mr__ok', 'Intentar de nuevo');
              otra.addEventListener('click', function () { abre(idx, true); });
              zona.appendChild(otra); otra.focus({ preventScroll: true });
            } else { bloquea(caja, false); lanzar.disabled = false; pintaTiros(); }
          });
        });
        pie.appendChild(cuantos); pie.appendChild(lanzar);
        zona.appendChild(caja); zona.appendChild(pie);
      },

      /* Un botón que corre algo en la escena (p. ej. comprobar una predicción). */
      accion: function (paso, mio) {
        var b = boton('boton mr__ok', paso.boton || 'Continuar');
        b.addEventListener('click', function () {
          if (ocupado) return;
          ocupado = true; b.disabled = true;
          Promise.resolve(paso.ejecuta(escena, datos, respuestas, ctx)).then(function (r) {
            if (mio !== turno) return;
            ocupado = false;
            if (r && r.fallo) fallos++;
            if (r && r.mensaje) avisa(r.mensaje, r.fallo ? 'mal' : 'bien');
            siguiente();
          });
        });
        zona.appendChild(b);
      }
    };

    function termina() {
      var n = niveles[idx], e = estrellasDe(tope, fallos), ultimo = idx === niveles.length - 1;
      if (e > (progreso[n.id] | 0)) { progreso[n.id] = e; guarda(); }
      pintaNav();
      zona.textContent = '';
      var tarjeta = crea('div', 'mr__logro');
      tarjeta.appendChild(dibujaEstrellas(e, 'mr__estrellas mr__estrellas--grande'));
      var titulo = crea('p', 'mr__q', ['Nivel superado', '¡Bien hecho!', '¡Perfecto!'][e - 1]); titulo.tabIndex = -1;
      tarjeta.appendChild(titulo);
      if (!ultimo) {
        var sig = boton('boton mr__ok', 'Siguiente nivel');
        sig.addEventListener('click', function () { abre(idx + 1); });
        tarjeta.appendChild(sig);
      } else if (reto.resumen) {
        tarjeta.appendChild(crea('p', 'mr__resumen-t', reto.resumen.titulo));
        var ul = crea('ul', 'mr__resumen');
        reto.resumen.puntos.forEach(function (t) { ul.appendChild(crea('li', '', t)); });
        tarjeta.appendChild(ul);
        if (reto.resumen.enlace) { var a = crea('a', 'boton mr__ok', reto.resumen.enlace.texto); a.href = reto.resumen.enlace.href; tarjeta.appendChild(a); }
      }
      zona.appendChild(tarjeta);
      pintaAcciones();
      titulo.focus({ preventScroll: true });
    }

    abre(0);
    return { abre: abre, escena: escena };
  }

  var API = { monta: monta, azar: azar, cerca: cerca, numero: numero, fmt: fmt, estrellasDe: estrellasDe };
  if (typeof module === 'object' && module.exports) module.exports = API; else raiz.MotorRetos = API;
})(typeof window !== 'undefined' ? window : globalThis);
