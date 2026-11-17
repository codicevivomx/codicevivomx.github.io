/* Códice Vivo · reproductor de retos «Aplica lo aprendido»
   Reproduce en el navegador la misma composición que se usa para el video de TikTok
   (plantilla/videos/<id>/) y se detiene en cada pausa con 3 opciones para tocar.

   Uso:  <div data-reto="../../plantilla/videos/<id>/" data-volver="../../libros/fisica-unam/#sec-retos"></div>
         <script src="../reproductor.js" defer></script>

   Qué espera de la composición (así están el esquiador y la catapulta):
   · index.html con las capas [data-composition-src] y los <audio class="clip"> (voz y SFX).
   · compositions/pausas.html: un .clip por pausa, en orden. Aquí esa capa se oculta y en su lugar
     salen las opciones; al acertar, el video salta al final de ese clip.
   · storyboard.json: las tomas con «pausa» (pregunta, opciones, correcta, pista), en el mismo orden.
   · La pregunta grabada de la pausa N es el <audio id="voz-pN"> (si no existe, no suena nada).
   · En PC, los mosaicos con filtro SVG se convierten a imagen una vez (horneaTexturas).

   En celular NO se usa la composición en vivo (sus capas agotan la memoria gráfica y la página parpadea,
   sobre todo en los navegadores internos de Instagram y TikTok). Ahí se reproduce un MP4 ligero:
     <div data-reto="…" data-video="../../assets/video/<id>">   →   <id>.mp4 (720p, faststart) y <id>.json
   <id>.json = { duracion, pausas: [{ t0, tq, t1 }] } lo escribe retos/video-ligero.mjs a partir de la composición.
   En cada pausa (t0) salen las mismas preguntas y pistas, tapando la tarjeta que el video trae dibujada; el video
   sigue hasta tq (fin de la pregunta grabada, que así la dice el propio video: un audio aparte lo bloquean los
   celulares por no venir de un toque) y ahí se detiene. Al acertar salta a t1 (se brinca la cuenta regresiva).
   Se usa en pantallas táctiles o chicas y en navegadores internos; ?video=mp4 o ?video=vivo lo fuerza para probar.
   Si el MP4 no carga, se intenta la composición en vivo.
   Nada se descarga hasta tocar «Empezar». */
(function () {
  'use strict';
  function crea(etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }
  var ICONOS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z"/></svg>',
    sonido: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5v5h4l5.5 4.5v-14L7 9.5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 5.8a9 9 0 0 1 0 12.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mudo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5v5h4l5.5 4.5v-14L7 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    otra: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 4.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M3.5 4.5l2 5.6 5.5-2.2z"/></svg>'
  };

  /* Celular: puntero táctil, pantalla chica o navegador interno de una app. */
  function esCelular() {
    var toque = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    var chica = Math.min(screen.width || 9999, screen.height || 9999) <= 600;   // lado corto de la pantalla (una laptop mide 768 o más)
    var interno = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|Snapchat|Line\//i.test(navigator.userAgent);
    return toque || chica || interno;
  }

  function monta(caja) {
    var base = new URL(caja.getAttribute('data-reto'), location.href).href.replace(/\/?$/, '/');
    var volver = caja.getAttribute('data-volver');
    var rutaVideo = caja.getAttribute('data-video'), forzado = /[?&]video=(mp4|vivo)\b/.exec(location.search);
    var ligero = !!rutaVideo && (forzado ? forzado[1] === 'mp4' : esCelular());
    if (rutaVideo) rutaVideo = new URL(rutaVideo, location.href).href;

    /* ---------- Interfaz ---------- */
    caja.textContent = '';
    caja.classList.add('rp');
    var escenario = crea('div', 'rp__escenario');
    var portada = crea('div', 'rp__portada');
    var empezar = crea('button', 'boton rp__empezar', 'Empezar el reto');
    empezar.type = 'button';
    var nota = crea('p', 'rp__nota', 'Con sonido · 3 preguntas · poco más de un minuto');
    portada.appendChild(empezar); portada.appendChild(nota);
    var pregunta = crea('div', 'rp__pregunta'); pregunta.hidden = true;
    var fin = crea('div', 'rp__fin'); fin.hidden = true;
    escenario.appendChild(portada); escenario.appendChild(pregunta); escenario.appendChild(fin);

    var barra = crea('div', 'rp__barra');
    var bPlay = crea('button', 'rp__boton'); bPlay.type = 'button'; bPlay.disabled = true;
    var avance = crea('div', 'rp__avance'); avance.setAttribute('role', 'progressbar'); avance.setAttribute('aria-label', 'Avance del reto');
    avance.setAttribute('aria-valuemin', '0'); avance.setAttribute('aria-valuemax', '100');
    var relleno = crea('div', 'rp__relleno'); avance.appendChild(relleno);
    var bSonido = crea('button', 'rp__boton'); bSonido.type = 'button';
    var bOtra = crea('button', 'rp__boton'); bOtra.type = 'button'; bOtra.disabled = true;
    bOtra.innerHTML = ICONOS.otra; bOtra.setAttribute('aria-label', 'Empezar de nuevo');
    barra.appendChild(bPlay); barra.appendChild(avance); barra.appendChild(bSonido); barra.appendChild(bOtra);
    caja.appendChild(escenario); caja.appendChild(barra);

    /* ---------- Estado ---------- */
    var marco, win, capas = [], pausas = [], clipsAudio = [], total = 0;
    var t = 0, andando = false, enPausa = null, terminado = false, listo = false;
    var mudo = false, ctx = null, salida = null, sonando = [], bufers = {};
    var reloj0 = 0, t0 = 0, aciertos = 0;
    var vid = null;   // modo MP4: el <video>

    function pintaBotones() {
      bPlay.innerHTML = andando ? ICONOS.pausa : ICONOS.play;
      bPlay.setAttribute('aria-label', andando ? 'Pausar' : 'Reproducir');
      bSonido.innerHTML = mudo ? ICONOS.mudo : ICONOS.sonido;
      bSonido.setAttribute('aria-label', mudo ? 'Activar el sonido' : 'Silenciar');
      bSonido.setAttribute('aria-pressed', mudo ? 'true' : 'false');
    }
    pintaBotones();

    function escala() {
      if (marco) marco.style.transform = 'scale(' + (escenario.clientWidth / 1080) + ')';
    }
    if ('ResizeObserver' in window) new ResizeObserver(escala).observe(escenario);
    else window.addEventListener('resize', escala);

    /* ---------- Sonido (Web Audio: un solo permiso al tocar «Empezar») ---------- */
    var conCtx = false;   // el reloj se elige al arrancar: el del audio (si está activo) o el de la página
    function ahora() { return conCtx ? ctx.currentTime : performance.now() / 1000; }
    function callar() {
      for (var i = 0; i < sonando.length; i++) { try { sonando[i].stop(); } catch (e) { /* ya terminó */ } }
      sonando = [];
    }
    function toca(clip, cuando, desde) {
      var buf = bufers[clip.src];
      if (!ctx || !buf) return;
      var resto = Math.min(clip.dur, buf.duration) - desde;
      if (resto <= 0.01) return;
      var nodo = ctx.createBufferSource(), vol = ctx.createGain();
      nodo.buffer = buf; vol.gain.value = clip.vol;
      nodo.connect(vol); vol.connect(salida);
      nodo.start(cuando, desde, resto);
      sonando.push(nodo);
    }
    /* Programa todo lo que falta desde el segundo «desde» hasta la siguiente pausa. */
    function programa(desde) {
      callar();
      if (!ctx || ctx.state !== 'running') return;
      var tope = total, c0 = ctx.currentTime + 0.03;
      for (var i = 0; i < pausas.length; i++) if (!pausas[i].hecha) { tope = pausas[i].t0; break; }
      for (var j = 0; j < clipsAudio.length; j++) {
        var c = clipsAudio[j];
        if (c.dePausa || c.t >= tope || c.t + c.dur <= desde) continue;
        toca(c, c0 + Math.max(0, c.t - desde), Math.max(0, desde - c.t));
      }
    }
    function cargaAudio(aviso) {
      var unicos = {}, lista = [];
      clipsAudio.forEach(function (c) { if (!unicos[c.src]) { unicos[c.src] = 1; lista.push(c.src); } });
      var hechos = 0;
      return Promise.all(lista.map(function (src) {
        return fetch(src).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
          .then(function (ab) { return new Promise(function (ok, mal) { ctx.decodeAudioData(ab, ok, mal); }); })
          .then(function (buf) { bufers[src] = buf; })
          .catch(function () { /* un sonido que falte no detiene el reto */ })
          .then(function () { hechos++; aviso('Cargando sonido… ' + Math.round(hechos / lista.length * 100) + ' %'); });
      }));
    }

    /* ---------- Composición ---------- */
    function arma() {
      var doc = marco.contentDocument;
      win = marco.contentWindow;
      if (!win.gsap) throw new Error('sin gsap');
      var raiz = doc.querySelector('[data-composition-id][data-duration]:not([data-composition-src])');
      total = parseFloat(raiz.getAttribute('data-duration'));
      /* los <audio> se leen y se quitan: el sonido lo lleva Web Audio */
      [].forEach.call(doc.querySelectorAll('audio[data-start]'), function (a) {
        var v = parseFloat(a.getAttribute('data-volume'));
        clipsAudio.push({ id: a.id, src: new URL(a.getAttribute('src'), base).href, t: parseFloat(a.getAttribute('data-start')),
          dur: parseFloat(a.getAttribute('data-duration')), vol: isNaN(v) ? 1 : v, dePausa: false });
        a.removeAttribute('src'); a.parentNode.removeChild(a);
      });
      var anfitriones = [].slice.call(doc.querySelectorAll('[data-composition-src]'));
      return Promise.all(anfitriones.map(function (h) {
        return fetch(new URL(h.getAttribute('data-composition-src'), base).href).then(function (r) { if (!r.ok) throw new Error('falta una capa'); return r.text(); });
      })).then(function (textos) {
        var guiones = [];
        anfitriones.forEach(function (h, i) {
          var id = h.getAttribute('data-composition-id');
          var plantilla = new DOMParser().parseFromString(textos[i], 'text/html').querySelector('template');
          var nodos = [].slice.call(plantilla.content.childNodes);
          nodos.forEach(function (n) {
            if (n.nodeName === 'STYLE') {
              var st = doc.createElement('style');
              st.textContent = n.textContent.replace(/#root\b/g, '[data-composition-id="' + id + '"]');
              doc.head.appendChild(st);
            } else if (n.nodeName === 'SCRIPT') guiones.push(n.textContent);
            else h.appendChild(doc.importNode(n, true));
          });
          capas.push({ id: id, el: h, t: parseFloat(h.getAttribute('data-start')) || 0, dur: parseFloat(h.getAttribute('data-duration')) || total, visto: null, clips: [] });
        });
        guiones.forEach(function (codigo) {
          var s = doc.createElement('script');
          s.textContent = '(function(){' + codigo + '\n})();';
          doc.body.appendChild(s);
        });
        capas.forEach(function (c) {
          c.tl = win.__timelines && win.__timelines[c.id];
          c.clips = [].map.call(c.el.querySelectorAll('.clip[data-start]'), function (e) {
            return { el: e, t: parseFloat(e.getAttribute('data-start')), dur: parseFloat(e.getAttribute('data-duration')), visto: null };
          });
        });
        return Promise.race([horneaTexturas(doc), new Promise(function (ok) { setTimeout(ok, 4000); })]);
      }).then(function () {
        return doc.fonts && doc.fonts.ready ? Promise.race([doc.fonts.ready, new Promise(function (ok) { setTimeout(ok, 2500); })]) : null;
      });
    }
    /* Texturas: un <pattern> cuyo mosaico lleva un filtro SVG (feTurbulence: grano, vetas, ruido) obliga al
       navegador a recalcular el ruido cada vez que repinta, y en celular el dibujo parpadea porque no alcanza
       a rasterizar. Aquí cada mosaico se dibuja una sola vez a una imagen (al doble, para los acercamientos) y
       el patrón queda usando esa imagen. Si algo falla, el mosaico se queda con su filtro, como en el video. */
    function horneaTexturas(doc) {
      var tareas = [];
      [].forEach.call(doc.querySelectorAll('pattern'), function (pat) {
        var pieza = pat.querySelector('[filter]');
        var ref = pieza && /url\(["']?#([^"')]+)/.exec(pieza.getAttribute('filter'));
        var filtro = ref && doc.getElementById(ref[1]);
        var w = parseFloat(pat.getAttribute('width')), h = parseFloat(pat.getAttribute('height'));
        if (!filtro || !(w > 0) || !(h > 0) || pat.children.length !== 1) return;
        var serie = new XMLSerializer(), K = 2;
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * K + '" height="' + h * K + '" viewBox="0 0 ' + w + ' ' + h + '"><defs>' +
          serie.serializeToString(filtro) + '</defs>' + serie.serializeToString(pieza) + '</svg>';
        tareas.push(new Promise(function (ok) {
          var img = new Image();
          img.onload = function () {
            try {
              var lienzo = document.createElement('canvas'); lienzo.width = w * K; lienzo.height = h * K;
              lienzo.getContext('2d').drawImage(img, 0, 0, w * K, h * K);
              var imagen = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
              imagen.setAttribute('width', w); imagen.setAttribute('height', h);
              imagen.setAttribute('preserveAspectRatio', 'none');
              imagen.setAttribute('href', lienzo.toDataURL('image/png'));
              pat.replaceChild(imagen, pieza);
            } catch (e) { /* se queda el filtro */ }
            ok();
          };
          img.onerror = function () { ok(); };
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }));
      });
      return Promise.all(tareas);
    }
    function preparaPausas(guion) {
      var capa = capas.filter(function (c) { return c.id === 'pausas'; })[0];
      var conPausa = (guion.tomas || []).filter(function (x) { return x.pausa; });
      if (!capa) return;
      capa.oculta = true;
      capa.clips.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (c, i) {
        if (!conPausa[i]) return;
        var p = { t0: capa.t + c.t, t1: capa.t + c.t + c.dur, datos: conPausa[i].pausa, hecha: false, voz: null, fallos: 0 };
        clipsAudio.forEach(function (a) {
          if (a.id === 'voz-p' + (i + 1)) { p.voz = a; a.dePausa = true; }
          else if (a.t >= p.t0 - 0.001 && a.t < p.t1) a.dePausa = true;   // la cuenta regresiva del video
        });
        pausas.push(p);
        var marca = crea('span', 'rp__marca'); marca.style.left = (p.t0 / total * 100) + '%'; avance.appendChild(marca);
      });
    }

    /* ---------- Pintar un instante ---------- */
    function pinta() {
      for (var i = 0; i < capas.length; i++) {
        var c = capas[i], l = t - c.t, ve = !c.oculta && l >= 0 && l < c.dur;
        if (ve !== c.visto) { c.el.style.visibility = ve ? 'visible' : 'hidden'; c.visto = ve; }
        if (!ve) continue;
        if (c.tl) c.tl.time(l);
        for (var j = 0; j < c.clips.length; j++) {
          var k = c.clips[j], vk = l >= k.t && l < k.t + k.dur;
          if (vk !== k.visto) { k.el.style.visibility = vk ? 'inherit' : 'hidden'; k.visto = vk; }
        }
      }
      avanza();
    }
    function avanza() {
      var pct = Math.min(100, t / total * 100);
      relleno.style.width = pct + '%';
      avance.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
    /* Modo MP4: el reloj es el del video. En t0 salen las opciones y el video sigue diciendo la pregunta;
       en tq (fin de la pregunta grabada) se detiene hasta que respondan. */
    function cuadroVideo() {
      if (!andando || !vid) return;
      t = vid.currentTime;
      for (var i = 0; i < pausas.length; i++) {
        var p = pausas[i];
        if (p.hecha || t < p.t0) continue;
        if (enPausa !== p) abrePausa(p, true);
        if (t >= p.tq) { vid.pause(); andando = false; pintaBotones(); avanza(); return; }
        break;
      }
      if (vid.ended || t >= total - 0.05) { vid.pause(); t = total; avanza(); acaba(); return; }
      avanza();
      requestAnimationFrame(cuadroVideo);
    }
    function cuadro() {
      if (!andando) return;
      t = t0 + (ahora() - reloj0);
      for (var i = 0; i < pausas.length; i++) {
        var p = pausas[i];
        if (!p.hecha && t >= p.t0) { t = p.t0 - 0.001; pinta(); abrePausa(p); return; }
      }
      if (t >= total) { t = total - 0.001; pinta(); acaba(); return; }
      pinta();
      requestAnimationFrame(cuadro);
    }
    function sigue() {
      if (!listo || andando || enPausa || terminado) return;
      if (vid) {
        andando = true; pintaBotones();
        var q = vid.play();
        if (q && q.catch) q.catch(function () { andando = false; pintaBotones(); });
        requestAnimationFrame(cuadroVideo);
        return;
      }
      var arranca = function () {
        conCtx = !!ctx && ctx.state === 'running';
        andando = true; t0 = t; reloj0 = ahora();
        programa(t); pintaBotones(); requestAnimationFrame(cuadro);
      };
      if (ctx && ctx.state === 'suspended') ctx.resume().then(arranca, arranca); else arranca();
    }
    function detiene() {
      if (!andando) return;
      andando = false; if (vid) vid.pause(); callar(); pintaBotones();
    }

    /* ---------- Pausas: 3 opciones; error → pista y reintento; acierto → sigue ---------- */
    /* sigueSonando (modo MP4): el video continúa mientras dice la pregunta */
    function abrePausa(p, sigueSonando) {
      andando = !!sigueSonando; enPausa = p; if (!sigueSonando) callar(); pintaBotones(); bPlay.disabled = true;
      pregunta.textContent = '';
      pregunta.classList.toggle('rp__pregunta--video', !!vid);
      var tarjeta = crea('div', 'rp__tarjeta');
      tarjeta.appendChild(crea('p', 'rp__turno', 'Tu turno'));
      var q = crea('p', 'rp__q', p.datos.pregunta); q.id = 'rp-q-' + pausas.indexOf(p);
      tarjeta.appendChild(q);
      var grupo = crea('div', 'rp__opciones'); grupo.setAttribute('role', 'group'); grupo.setAttribute('aria-labelledby', q.id);
      var aviso = crea('p', 'rp__pista'); aviso.setAttribute('aria-live', 'polite');
      p.datos.opciones.forEach(function (texto, i) {
        var b = crea('button', 'rp__opcion', texto); b.type = 'button';
        b.addEventListener('click', function () {
          if (p.hecha) return;
          if (i === p.datos.correcta) {
            p.hecha = true; if (!p.fallos) aciertos++;
            b.classList.add('rp__opcion--bien');
            aviso.className = 'rp__pista rp__pista--bien'; aviso.textContent = '¡Correcto!';
            [].forEach.call(grupo.children, function (o) { o.disabled = o !== b; });
            setTimeout(function () { cierraPausa(p); }, 900);
          } else {
            p.fallos++;
            b.classList.add('rp__opcion--mal'); b.disabled = true;
            aviso.className = 'rp__pista'; aviso.textContent = 'Pista: ' + p.datos.pista;
          }
        });
        grupo.appendChild(b);
      });
      tarjeta.appendChild(grupo); tarjeta.appendChild(aviso);
      pregunta.appendChild(tarjeta); pregunta.hidden = false;
      /* En vivo, la pregunta grabada suena aparte (en el MP4 ya viene en el video). Si el navegador durmió
         el audio, se despierta antes de tocarla. */
      if (!vid && p.voz && ctx) {
        var suena = function () { if (enPausa === p && ctx.state === 'running') toca(p.voz, ctx.currentTime + 0.05, 0); };
        if (ctx.state === 'running') suena(); else ctx.resume().then(suena, function () { /* sin permiso de audio */ });
      }
    }
    function cierraPausa(p) {
      if (enPausa !== p) return;
      enPausa = null; pregunta.hidden = true; bPlay.disabled = false;
      callar(); t = p.t1;
      if (vid) {
        vid.currentTime = p.t1;
        if (andando) return;   // respondió antes de que terminara la pregunta: el video ya va andando
      }
      sigue();
    }

    function acaba() {
      andando = false; terminado = true; pintaBotones(); bPlay.disabled = true;
      fin.textContent = '';
      var tarjeta = crea('div', 'rp__tarjeta');
      tarjeta.appendChild(crea('p', 'rp__turno', 'Reto terminado'));
      tarjeta.appendChild(crea('p', 'rp__q', pausas.length ? 'Acertaste ' + aciertos + ' de ' + pausas.length + ' a la primera.' : '¡Listo!'));
      var otra = crea('button', 'boton rp__repetir', 'Repetir'); otra.type = 'button';
      otra.addEventListener('click', reinicia);
      tarjeta.appendChild(otra);
      if (volver) { var a = crea('a', 'enlace rp__volver', '← Volver al libro'); a.href = volver; tarjeta.appendChild(a); }
      fin.appendChild(tarjeta); fin.hidden = false;
    }
    function reinicia() {
      if (!listo) return;
      andando = false; callar();
      enPausa = null; terminado = false; aciertos = 0; t = 0;
      pausas.forEach(function (p) { p.hecha = false; p.fallos = 0; });
      pregunta.hidden = true; fin.hidden = true; bPlay.disabled = false;
      if (vid) { vid.pause(); vid.currentTime = 0; avanza(); } else pinta();
      sigue();
    }

    /* ---------- Arranque en celular: MP4 ligero + pausas por tiempo ---------- */
    function empiezaVideo() {
      empezar.disabled = true;
      if (caja.scrollIntoView) caja.scrollIntoView({ block: 'center', behavior: 'auto' });
      nota.textContent = 'Cargando…';
      var v = crea('video', 'rp__video'), fallo = false;
      v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.playsInline = true;
      v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1; v.preload = 'auto'; v.muted = mudo;
      v.disablePictureInPicture = true; v.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback');
      var aVivo = function () {   // sin MP4: se intenta la composición
        if (fallo) return; fallo = true;
        try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* nada que soltar */ }
        if (v.parentNode) v.parentNode.removeChild(v);
        vid = null; ligero = false; listo = false; andando = false; pausas = [];
        [].forEach.call(avance.querySelectorAll('.rp__marca'), function (m) { m.parentNode.removeChild(m); });
        empieza();
      };
      v.addEventListener('error', aVivo);
      v.src = rutaVideo + '.mp4';
      escenario.insertBefore(v, portada);
      vid = v;
      /* play() va dentro del toque para que el navegador deje sonar el video */
      var arranque = v.play();
      if (arranque && arranque.catch) arranque.catch(function () { /* se reintenta al estar todo listo */ });
      Promise.all([
        fetch(rutaVideo + '.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }),
        fetch(base + 'storyboard.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
      ]).then(function (datos) {
        if (fallo) return;
        var mapa = datos[0], conPausa = (datos[1].tomas || []).filter(function (x) { return x.pausa; });
        total = mapa.duracion;
        mapa.pausas.forEach(function (m, i) {
          if (!conPausa[i]) return;
          var p = { t0: m.t0, tq: m.tq > m.t0 ? Math.min(m.tq, m.t1) : m.t0, t1: m.t1, datos: conPausa[i].pausa, hecha: false, fallos: 0 };
          pausas.push(p);
          var marca = crea('span', 'rp__marca'); marca.style.left = (p.t0 / total * 100) + '%'; avance.appendChild(marca);
        });
        var listoYa = function () {
          if (fallo || listo) return;
          listo = true; portada.hidden = true; bPlay.disabled = false; bOtra.disabled = false;
          andando = !v.paused; pintaBotones();
          if (andando) requestAnimationFrame(cuadroVideo); else sigue();
        };
        if (v.readyState >= 2) listoYa(); else { v.addEventListener('loadeddata', listoYa, { once: true }); v.addEventListener('playing', listoYa, { once: true }); }
      }).catch(aVivo);
    }

    /* ---------- Arranque (al tocar «Empezar») ---------- */
    function empieza() {
      if (ligero) { empiezaVideo(); return; }
      empezar.disabled = true;
      if (caja.scrollIntoView) caja.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      var aviso = function (texto) { nota.textContent = texto; };
      aviso('Cargando…');
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try { ctx = new AC(); salida = ctx.createGain(); salida.gain.value = mudo ? 0 : 1; salida.connect(ctx.destination); if (ctx.state === 'suspended') ctx.resume();
          /* desbloqueo: un sonido mudo dentro del toque, para que el navegador deje sonar después las preguntas */
          var mudito = ctx.createBufferSource(); mudito.buffer = ctx.createBuffer(1, 1, 22050); mudito.connect(ctx.destination); mudito.start(0); }
        catch (e) { ctx = null; }
      }
      marco = crea('iframe', 'rp__lienzo');
      marco.setAttribute('title', 'Animación del reto'); marco.setAttribute('aria-hidden', 'true'); marco.setAttribute('tabindex', '-1');
      marco.width = 1080; marco.height = 1920;
      var guion = fetch(base + 'storyboard.json').then(function (r) { return r.json(); });
      new Promise(function (ok, mal) { marco.addEventListener('load', ok); marco.addEventListener('error', mal); marco.src = base + 'index.html'; escenario.insertBefore(marco, portada); escala(); })
        .then(arma)
        .then(function () { return guion; })
        .then(function (g) { preparaPausas(g); return ctx ? cargaAudio(aviso) : null; })
        .then(function () {
          listo = true; t = 0; pinta();
          portada.hidden = true; bPlay.disabled = false; bOtra.disabled = false;
          sigue();
        })
        .catch(function () {
          if (marco && marco.parentNode) marco.parentNode.removeChild(marco);
          aviso('No se pudo cargar el reto. Revisa tu conexión e inténtalo de nuevo.');
          empezar.disabled = false; empezar.addEventListener('click', empieza, { once: true });
          capas = []; pausas = []; clipsAudio = [];
        });
    }
    empezar.addEventListener('click', empieza, { once: true });
    bPlay.addEventListener('click', function () { if (andando) detiene(); else sigue(); });
    escenario.addEventListener('click', function (ev) {
      if (!listo || enPausa || terminado || ev.target.closest('button, a')) return;
      if (andando) detiene(); else sigue();
    });
    bSonido.addEventListener('click', function () {
      mudo = !mudo;
      if (salida) salida.gain.value = mudo ? 0 : 1;
      if (vid) vid.muted = mudo;
      pintaBotones();
    });
    bOtra.addEventListener('click', reinicia);
    document.addEventListener('visibilitychange', function () { if (document.hidden) detiene(); });
  }

  var cajas = document.querySelectorAll('[data-reto]');
  for (var i = 0; i < cajas.length; i++) monta(cajas[i]);
})();
