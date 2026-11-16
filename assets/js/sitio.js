// Códice Vivo · JS mínimo del sitio: mini reto, gatos escondidos, parallax del mundo e inclinación de tarjetas.

/* ENLACES PENDIENTES: cámbialos aquí y se actualizan en todo el sitio.
   En el HTML llevan data-enlace="preventa" o data-enlace="tiktok" (con href="#" de respaldo). */
var ENLACES = {
  preventa: '#', // formulario de la preventa
  tiktok: '#',   // perfil de TikTok
  avisame: '#'   // «Avísame cuando salga» (libros próximos, en la biblioteca)
};

(function () {
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    });
  });

  /* Gatos escondidos: al tocarlos sueltan corazones pixelados */
  var NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.gatos').forEach(function (gato) {
    gato.addEventListener('click', function () {
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
    if (hayWebGL) {
      var carga = function () { import('./escena-libro.js').then(function (m) { return m.monta(escena); }).catch(function () { /* queda la imagen fija */ }); };
      if (document.readyState === 'complete') setTimeout(carga, 60); else window.addEventListener('load', function () { setTimeout(carga, 60); });
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

  /* Tarjetas: se inclinan hacia el puntero */
  if (conMouse) {
    document.querySelectorAll('.tarjeta').forEach(function (t) {
      t.addEventListener('pointermove', function (e) {
        var r = t.getBoundingClientRect();
        t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 9 + 'deg');
        t.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 7 + 'deg');
      });
      t.addEventListener('pointerleave', function () {
        t.style.removeProperty('--rx');
        t.style.removeProperty('--ry');
      });
    });
  }
})();
