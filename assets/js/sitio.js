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
  { tipo: 'Retos «Aplica lo aprendido»', titulo: '¿Con qué velocidad llega el esquiador?', nota: 'El primer reto: un problema completo para usar lo que ya sabes.', estado: 'en camino' },
  { tipo: 'Para repasar', titulo: 'PDF con marca de agua', nota: 'Cada lámina en una hoja, para imprimir o estudiar sin conexión.', estado: 'en camino' },
  { tipo: 'Nuevo libro', titulo: 'Matemáticas', nota: 'Con el mismo formato de láminas interactivas.', estado: 'en camino' },
  { tipo: 'Nuevo libro', titulo: 'Historia', nota: 'Con el mismo formato de láminas interactivas.', estado: 'en camino' }
];

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

  /* Despliegue al hacer scroll: cada [data-rev] recibe .visto una sola vez.
     (html.anima lo pone un script en el <head>; sin él, todo se ve desde el inicio.) */
  window.__revListo = true;
  var porVer = document.querySelectorAll('[data-rev]');
  if (document.documentElement.classList.contains('anima') && 'IntersectionObserver' in window) {
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('visto'); ojo.unobserve(en.target); } });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    porVer.forEach(function (el) { ojo.observe(el); });
    /* Recorrido de 6 pasos: el riel se llena conforme bajas */
    var recorrido = document.querySelector('[data-recorrido]');
    if (recorrido) {
      var pendienteR = false;
      var mide = function () {
        pendienteR = false;
        var r = recorrido.getBoundingClientRect();
        recorrido.style.setProperty('--avance', Math.max(0, Math.min(1, (window.innerHeight * 0.62 - r.top) / r.height)).toFixed(3));
      };
      window.addEventListener('scroll', function () { if (!pendienteR) { pendienteR = true; requestAnimationFrame(mide); } }, { passive: true });
      mide();
    }
  } else {
    document.documentElement.classList.remove('anima');
    porVer.forEach(function (el) { el.classList.add('visto'); });
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
