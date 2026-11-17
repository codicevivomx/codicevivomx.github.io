// Códice Vivo · JS mínimo del sitio: mini reto, gatos escondidos, parallax del mundo e inclinación de tarjetas.

/* ENLACES PENDIENTES: cámbialos aquí y se actualizan en todo el sitio.
   En el HTML llevan data-enlace="preventa" o data-enlace="tiktok" (con href="#" de respaldo). */
var ENLACES = {
  preventa: '#', // formulario de la preventa
  tiktok: '#',   // perfil de TikTok
  avisame: '#'   // «Avísame cuando salga» (libros próximos, en la biblioteca)
};

/* LO QUE VIENE (portada): para sumar algo, agrega una línea.
   estado: 'listo' o 'en camino'. «enlace» es opcional (si lo pones, el título se vuelve liga). */
var LO_QUE_VIENE = [
  { tipo: 'Retos «Aplica lo aprendido»', titulo: '¿Con qué velocidad llega el esquiador?', corto: 'Retos «Aplica lo aprendido»', nota: 'El primer reto: un problema completo para usar lo que ya sabes.', estado: 'listo', enlace: 'retos/esquiador/' },
  { tipo: 'Para repasar', titulo: 'PDF con marca de agua', nota: 'Cada lámina en una hoja, para imprimir o estudiar sin conexión.', estado: 'en camino' },
  { tipo: 'Nuevo libro', titulo: 'Matemáticas', nota: 'Con el mismo formato de láminas interactivas.', estado: 'en camino' },
  { tipo: 'Nuevo libro', titulo: 'Historia', nota: 'Con el mismo formato de láminas interactivas.', estado: 'en camino' }
];

/* Fuentes que solo se usan abajo del primer pantallazo (títulos en Fraunces e itálicas):
   se piden cuando la página ya cargó, para no competir con lo de arriba. Mientras llegan se ve la serif base. */
var RAIZ = ((document.currentScript && document.currentScript.src) || '').replace(/assets\/js\/[^\/]*$/, '');
function fuentesDeAbajo() {
  if (!window.FontFace || !document.fonts) return;
  [['Fraunces', 'assets/fuentes/fraunces-es.woff2', { weight: '300 700', style: 'normal' }],
   ['EB Garamond', 'plantilla/codice/fuentes/eb-garamond-italica.woff2', { weight: '400', style: 'italic' }]
  ].forEach(function (f) {
    var cara = new FontFace(f[0], 'url(' + RAIZ + f[1] + ') format("woff2")', f[2]);
    cara.display = 'swap';
    document.fonts.add(cara);   // solo se descarga si la página de verdad la usa; si falla, queda la serif base
  });
}
if (document.readyState === 'complete') setTimeout(fuentesDeAbajo, 0);
else window.addEventListener('load', function () { setTimeout(fuentesDeAbajo, 0); });

(function () {
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* «Lo que viene»: se arma con la lista de arriba */
  var viene = document.getElementById('lo-que-viene');
  if (viene) LO_QUE_VIENE.forEach(function (x) {
    var li = document.createElement('li'), listo = x.estado === 'listo';
    li.className = 'viene__item' + (listo ? ' viene__item--listo' : '');
    var tipo = document.createElement('span'); tipo.className = 'viene__tipo'; tipo.textContent = x.tipo || '';
    var h = document.createElement('h3');
    if (x.enlace) { var a = document.createElement('a'); a.href = x.enlace; a.textContent = x.titulo; h.appendChild(a); } else h.textContent = x.titulo;
    var p = document.createElement('p'); p.textContent = x.nota || '';
    var e = document.createElement('span'); e.className = 'viene__estado'; e.textContent = listo ? 'Listo' : 'En camino';
    li.appendChild(tipo); li.appendChild(h); li.appendChild(p); li.appendChild(e);
    viene.appendChild(li);
  });

  /* Pie, columna «Próximamente»: lo que en la lista de arriba aún no está listo
     («corto» es el nombre breve; si falta, se usa el título) */
  document.querySelectorAll('[data-proximamente]').forEach(function (ul) {
    var base = ul.getAttribute('data-base') || './';
    LO_QUE_VIENE.forEach(function (x) {
      if (x.estado === 'listo') return;
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = base + '#viene'; a.textContent = x.corto || x.titulo;
      li.appendChild(a); ul.appendChild(li);
    });
  });

  /* Despliegue al hacer scroll: cada [data-rev] recibe .visto una sola vez.
     (html.anima lo pone un script en el <head>; sin él, todo se ve desde el inicio.) */
  window.__revListo = true;
  var porVer = document.querySelectorAll('[data-rev]');
  if (document.documentElement.classList.contains('anima') && 'IntersectionObserver' in window) {
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('visto'); ojo.unobserve(en.target); } });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    porVer.forEach(function (el) { ojo.observe(el); });
  } else {
    document.documentElement.classList.remove('anima');
    porVer.forEach(function (el) { el.classList.add('visto'); });
  }

  /* «Cómo enseñamos»: al bajar se marca el paso activo, la lámina de muestra resalta esa parte
     y el riel se llena. (No es animación: también funciona con «menos movimiento», sin transiciones.) */
  var metodo = document.querySelector('[data-metodo]'), recorrido = document.querySelector('[data-recorrido]');
  if (metodo && recorrido) {
    var pasos = recorrido.querySelectorAll('.recorrido__paso'), botones = recorrido.querySelectorAll('.recorrido__boton'),
      chips = metodo.querySelectorAll('.mini__chip'), hoja = metodo.querySelector('.mini__hoja'), activo = 0, pendienteR = false, mano = null;
    // activa un paso: lista, lámina y chips quedan sincronizados
    var activa = function (n, foco) {
      n = Math.max(1, Math.min(pasos.length, n));
      if (n !== activo) {
        metodo.style.setProperty('--lado', n > activo ? 1 : -1);      // de qué lado entra la zona en celular
        activo = n; metodo.setAttribute('data-activo', n);
        pasos.forEach(function (p, i) { p.classList.toggle('es-activo', i === n - 1); });
        botones.forEach(function (b, i) { b.setAttribute('aria-selected', i === n - 1 ? 'true' : 'false'); b.tabIndex = i === n - 1 ? 0 : -1; });
        chips.forEach(function (c, i) { c.setAttribute('aria-pressed', i === n - 1 ? 'true' : 'false'); });
      }
      if (foco && botones[n - 1]) botones[n - 1].focus({ preventScroll: true });
    };
    // elección a mano: manda hasta que el usuario se desplace un buen tramo (tramo = fracción del alto de pantalla)
    var elige = function (n, tramo, foco) { mano = { y: window.scrollY, d: window.innerHeight * tramo }; activa(n, foco); };
    var conPuntero = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    botones.forEach(function (b, i) {
      b.addEventListener('click', function () { elige(i + 1, 0.6); });
      if (conPuntero) b.addEventListener('mouseenter', function () { if (!mano || mano.d < 200) elige(i + 1, 0.12); });
      b.addEventListener('keydown', function (e) {
        var k = e.key, n = k === 'ArrowDown' || k === 'ArrowRight' ? activo + 1 : k === 'ArrowUp' || k === 'ArrowLeft' ? activo - 1 : k === 'Home' ? 1 : k === 'End' ? pasos.length : 0;
        if (n) { e.preventDefault(); elige(n, 0.6, true); }
      });
    });
    chips.forEach(function (c, i) { c.addEventListener('click', function () { elige(i + 1, 0.6); }); });
    if (hoja) {                                                       // deslizar la lámina: siguiente o anterior
      var x0 = null, y0 = 0;
      hoja.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      hoja.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) elige(activo + (dx < 0 ? 1 : -1), 0.6);
      }, { passive: true });
    }
    var mide = function () {
      pendienteR = false;
      var angosto = window.innerWidth < 800, linea = window.innerHeight * (angosto ? 0.72 : 0.55), n = 1;
      if (mano && Math.abs(window.scrollY - mano.y) > mano.d) mano = null;
      if (!mano) {
        pasos.forEach(function (p, i) { if (p.getBoundingClientRect().top < linea) n = i + 1; });
        activa(n);
      }
      if (!quieto) {
        var r = recorrido.getBoundingClientRect();
        recorrido.style.setProperty('--avance', Math.max(0, Math.min(1, (linea - r.top) / r.height)).toFixed(3));
      }
    };
    window.addEventListener('scroll', function () { if (!pendienteR) { pendienteR = true; requestAnimationFrame(mide); } }, { passive: true });
    window.addEventListener('resize', mide);
    mide();
  }
  var conMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.querySelectorAll('[data-enlace]').forEach(function (a) {
    var url = ENLACES[a.getAttribute('data-enlace')];
    if (url && url !== '#') { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
  });

  /* Visor «así se ve por dentro»: la lámina se carga hasta que la tocan */
  document.querySelectorAll('.visor').forEach(function (visor) {
    var boton = visor.querySelector('.visor__boton');
    if (!boton) return;
    boton.addEventListener('click', function (e) {
      e.preventDefault();
      var marco = document.createElement('iframe');
      marco.src = visor.getAttribute('data-visor');
      marco.title = visor.getAttribute('data-titulo') || 'Lámina interactiva';
      visor.textContent = '';
      visor.appendChild(marco);
      marco.focus();
    });
  });

  /* Mini reto: revela la respuesta al elegir una opción */
  var opciones = document.querySelectorAll('.reto .opcion');
  var respuesta = document.getElementById('reto-respuesta');
  var nota = document.getElementById('reto-nota');
  opciones.forEach(function (boton) {
    boton.addEventListener('click', function () {
      opciones.forEach(function (o) {
        o.disabled = true;
        if (o.hasAttribute('data-correcta')) o.classList.add('es-correcta');
      });
      if (!boton.hasAttribute('data-correcta')) boton.classList.add('es-error');
      nota.textContent = boton.getAttribute('data-nota');
      respuesta.hidden = false;
      bajaLaBola();
    });
  });

  /* Al responder el reto: la bola baja por la rampa (acelerando) y aparece la flecha con v = 20 m/s */
  function bajaLaBola() {
    var rampa = document.getElementById('reto-rampa'), bola = document.getElementById('reto-bola'), v = document.getElementById('reto-v');
    var figura = rampa && rampa.closest('svg');
    if (!rampa || !bola || !rampa.getTotalLength) return;
    var largo = rampa.getTotalLength(), dur = 850, t0 = null;
    var pon = function (f) {
      var s = largo * (0.03 + 0.97 * f), p = rampa.getPointAtLength(s), q = rampa.getPointAtLength(Math.min(largo, s + 1));
      var dx = q.x - p.x, dy = q.y - p.y, n = Math.hypot(dx, dy) || 1;
      bola.setAttribute('cx', (p.x + dy / n * 9).toFixed(1)); bola.setAttribute('cy', (p.y - dx / n * 9).toFixed(1));
    };
    var fin = function () { pon(1); v.textContent = 'v = 20 m/s'; figura.classList.add('reto--resuelto'); };
    if (quieto) return fin();
    v.style.opacity = 0;
    requestAnimationFrame(function paso(t) {
      if (t0 === null) t0 = t;
      var f = Math.min(1, (t - t0) / dur);
      pon(f * f);                                   // acelera: recorre más en cada instante
      if (f < 1) requestAnimationFrame(paso); else { fin(); v.style.opacity = 1; }
    });
  }

  /* Gatos escondidos: al tocarlos sueltan corazones pixelados */
  var NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.gatos, .siesta').forEach(function (gato) {
    gato.addEventListener('click', function () {
      if (gato.classList.contains('siesta')) {            // los del pie despiertan un momento
        gato.classList.add('es-despierto');
        clearTimeout(gato.__sueno);
        gato.__sueno = setTimeout(function () { gato.classList.remove('es-despierto'); }, 2200);
      }
      for (var i = 0; i < 3; i++) {
        var c = document.createElementNS(NS, 'svg');
        c.setAttribute('viewBox', '0 0 7 6');
        c.setAttribute('class', 'corazon');
        c.setAttribute('shape-rendering', 'crispEdges');
        c.innerHTML = '<path d="M1 0h2v1h1v-1h2v1h1v2h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-2h1z"/>';
        c.style.setProperty('--dx', (i - 1) * 16 + 'px');
        c.style.animationDelay = i * 0.16 + 's';
        gato.appendChild(c);
        setTimeout(function (el) { el.remove(); }, 1700, c);
      }
    });
  });

  /* Libros del estante: si la página trae su ficha (biblioteca), el toque abre el panel de selección;
     si no (portada), el «próximamente» solo se queda abierto */
  document.querySelectorAll('.libro3d[data-ficha], .libro3d--pronto').forEach(function (libro) {
    var ficha = libro.getAttribute('data-ficha') && document.getElementById(libro.getAttribute('data-ficha'));
    libro.addEventListener('click', function (e) {
      if (ficha && ficha.showModal) { e.preventDefault(); ficha.showModal(); }
      else if (libro.classList.contains('libro3d--pronto')) libro.classList.toggle('es-abierto');
    });
  });
  document.querySelectorAll('dialog.ficha').forEach(function (ficha) {
    ficha.addEventListener('click', function (e) { if (e.target === ficha) ficha.close(); });   // clic fuera = cerrar
  });

  /* Barra fija de compra (celular): aparece cuando el botón principal ya quedó arriba */
  var barra = document.querySelector('[data-barra]'), comprar = document.getElementById('comprar');
  if (barra && comprar && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      var ver = !e[0].isIntersecting && e[0].boundingClientRect.top < 0;
      barra.classList.toggle('es-visible', ver);
      barra.setAttribute('aria-hidden', ver ? 'false' : 'true');
      barra.querySelector('a').tabIndex = ver ? 0 : -1;
    }).observe(comprar);
  }

  /* Escena 3D del libro: three.js se pide solo aquí, ya pintada la página, si hay WebGL y sin «menos movimiento».
     Si no, se queda la imagen fija. */
  var escena = document.querySelector('[data-escena]');
  if (escena && !quieto) {
    var hayWebGL = (function () { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
    if (hayWebGL && 'IntersectionObserver' in window) {
      /* Memoria gráfica: el 3D nunca se carga si no se ve.
         · Con mouse: se pide cuando la escena entra a la pantalla.
         · En celular: solo al tocar la imagen fija, y se suelta (contexto WebGL incluido) al salir de la pantalla. */
      var pista = escena.querySelector('.producto__pista'), textoPista = pista ? pista.textContent : '', cargando = false;
      var carga = function () {
        if (cargando || escena.__escena) return Promise.resolve();
        cargando = true;
        return import('./escena-libro.js').then(function (m) { return m.monta(escena); }).catch(function () { /* queda la imagen fija */ }).then(function () { cargando = false; });
      };
      if (conMouse) {
        var alVer = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { alVer.disconnect(); carga(); } }, { rootMargin: '200px 0px' });
        alVer.observe(escena);
      } else {
        var invita = function () {
          escena.classList.add('es-toca'); escena.setAttribute('role', 'button'); escena.tabIndex = 0;
          escena.setAttribute('aria-label', 'Ver el libro en 3D');
          if (pista) pista.textContent = 'Toca para ver en 3D';
        };
        var abre = function () {
          if (!escena.classList.contains('es-toca')) return;
          escena.classList.remove('es-toca'); escena.removeAttribute('role'); escena.removeAttribute('tabindex'); escena.removeAttribute('aria-label');
          if (pista) pista.textContent = textoPista;
          carga();
        };
        escena.addEventListener('click', abre);
        escena.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abre(); } });
        new IntersectionObserver(function (e) {
          if (e[0].isIntersecting || !escena.__escena) return;
          escena.__escena.suelta(); invita();
        }).observe(escena);
        invita();
      }
    }
  }

  if (quieto) return;

  /* Parallax del mundo: scroll + puntero (o giroscopio donde no pide permiso) */
  var mundo = document.querySelector('.mundo');
  if (mundo) {
    var mx = 0, my = 0, sy = 0, pendiente = false;
    var pinta = function () {
      pendiente = false;
      mundo.style.setProperty('--mx', mx.toFixed(3));
      mundo.style.setProperty('--my', my.toFixed(3));
      mundo.style.setProperty('--sy', sy.toFixed(0));
    };
    var pide = function () { if (!pendiente) { pendiente = true; requestAnimationFrame(pinta); } };
    var limita = function (v) { return Math.max(-1, Math.min(1, v)); };
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y > mundo.offsetHeight) return;
      sy = y; pide();
    }, { passive: true });
    if (conMouse) {
      mundo.addEventListener('pointermove', function (e) {
        mx = (0.5 - e.clientX / window.innerWidth) * 2;
        my = (0.5 - e.clientY / window.innerHeight) * 2;
        pide();
      });
    } else if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null || window.scrollY > mundo.offsetHeight) return;
        mx = limita(-e.gamma / 30);
        my = limita(-(e.beta - 45) / 30);
        pide();
      });
    }
  }

  /* En pantallas táctiles, las cajas se hunden un poco mientras las tocas (clase es-presion) */
  document.querySelectorAll('.portada .tarjeta, .portada .paso, .portada .viene__item, .portada .bloque, .tienda .tarjeta, .tienda .ventajas li, .tienda .proximos li').forEach(function (t) {
    t.addEventListener('touchstart', function () { t.classList.add('es-presion'); }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (ev) { t.addEventListener(ev, function () { t.classList.remove('es-presion'); }, { passive: true }); });
  });

  /* Tarjetas y cajas grandes: se inclinan en 3D hacia el puntero (máx. ~6°).
     --rx/--ry los usa .tarjeta (transform); --ax/--ay/--ang, las cajas que se inclinan con «rotate». */
  if (conMouse) {
    document.querySelectorAll('.tarjeta, .portada .paso, .portada .viene__item, .portada .bloque, .tienda .ventajas li, .tienda .proximos li').forEach(function (t) {
      t.addEventListener('pointermove', function (e) {
        var r = t.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
        t.style.setProperty('--ry', (dx * 12).toFixed(2) + 'deg');
        t.style.setProperty('--rx', (-dy * 12).toFixed(2) + 'deg');
        t.style.setProperty('--ax', (-dy).toFixed(3));
        t.style.setProperty('--ay', dx.toFixed(3));
        t.style.setProperty('--ang', Math.min(6, Math.hypot(dx, dy) * 12).toFixed(2) + 'deg');
      });
      t.addEventListener('pointerleave', function () {
        ['--rx', '--ry', '--ax', '--ay', '--ang'].forEach(function (v) { t.style.removeProperty(v); });
      });
    });
  }
})();
