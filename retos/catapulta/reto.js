/* Códice Vivo · reto de la catapulta (tiro parabólico). Configuración para retos/motor/motor.js.
   Especificación: docs/diseno-retos.md. Toda la física se calcula aquí a partir de los números
   generados (g = 10 m/s², sin aire); ningún resultado está escrito a mano.
   La parte de física no toca la página: `node retos/catapulta/prueba.mjs` la revisa. */
(function (raiz) {
  'use strict';
  var G = 10;
  /* Valores de examen: con 37° y 53° se usan 0.6 y 0.8 (así vx y vy salen enteros). */
  var EXAMEN = { 37: { sen: 0.6, cos: 0.8 }, 53: { sen: 0.8, cos: 0.6 } };
  var limpia = function (n) { return Math.round(n * 1e6) / 1e6; };
  var fmt = function (n, dec) { var k = Math.pow(10, dec == null ? 2 : dec); return String(Math.round(n * k) / k); };

  /* ---------- Física ---------- */
  function trig(ang) { return EXAMEN[ang] || { sen: Math.sin(ang * Math.PI / 180), cos: Math.cos(ang * Math.PI / 180) }; }
  function comp(v, ang) { var t = trig(ang); return { vx: limpia(v * t.cos), vy: limpia(v * t.sen) }; }
  function alturaEn(c, t) { return c.vy * t - 0.5 * G * t * t; }
  function vuelo(c) { return 2 * c.vy / G; }
  function alcance(c) { return c.vx * vuelo(c); }
  function cima(c) { return c.vy * c.vy / (2 * G); }

  /* Sigue la trayectoria real hasta que la piedra toca algo.
     lugar = { D: distancia a la puerta, h: altura de la colina (0 = piso), muralla: { x, alto } }
     La muralla mide 1 m de grueso (centrada en x); la colina empieza 3 m antes de la puerta.
     Devuelve { tipo, t, x, y, dif, falta }:
       acierto · cae a 1 m o menos de la puerta          corto / largo · dif = metros de diferencia
       muralla · choca con ella (falta = lo que le faltó de altura)      colina · choca con la ladera */
  var GRUESO = 1, LADERA = 3, ALTO_CASTILLO = 17, TOL = 1;
  function simula(c, lugar) {
    var h = lugar.h || 0, D = lugar.D, T = vuelo(c), m = lugar.muralla;
    if (m) {
      var ta = (m.x - GRUESO / 2) / c.vx, tb = (m.x + GRUESO / 2) / c.vx;
      if (ta < T) {
        var ya = alturaEn(c, ta);
        if (ya <= m.alto) return { tipo: 'muralla', t: ta, x: m.x - GRUESO / 2, y: ya, falta: m.alto - ya };
        if (alturaEn(c, tb) <= m.alto) { var tm = (c.vy + Math.sqrt(c.vy * c.vy - 2 * G * m.alto)) / G; return { tipo: 'muralla', t: tm, x: c.vx * tm, y: m.alto, falta: 0 }; }
      }
    }
    var t = T;
    if (h) {
      var tc = (D - LADERA) / c.vx;
      if (T <= tc) return { tipo: 'corto', t: T, x: c.vx * T, y: 0, dif: c.vx * T - D };
      var yc = alturaEn(c, tc);
      if (yc < h) return { tipo: 'colina', t: tc, x: D - LADERA, y: yc, falta: h - yc };
      t = (c.vy + Math.sqrt(c.vy * c.vy - 2 * G * h)) / G;
    }
    var x = c.vx * t, dif = x - D;
    if (Math.abs(dif) <= TOL + 1e-9) return { tipo: 'acierto', t: t, x: x, y: h, dif: dif };
    if (dif < 0) return { tipo: 'corto', t: t, x: x, y: h, dif: dif };
    /* se pasó: pega en el castillo (cara en x = D) o, si va muy alta, vuela por encima */
    var tD = D / c.vx, yD = alturaEn(c, tD);
    if (yD - h < ALTO_CASTILLO) return { tipo: 'largo', t: tD, x: D, y: yD, dif: dif, pega: true };
    return { tipo: 'largo', t: t, x: x, y: h, dif: dif };
  }
  /* Todas las combinaciones enteras de los controles (ángulo 15°-75°, v 10-30) que aciertan. */
  var CONTROL = { ang: [15, 75], v: [10, 30] };
  function soluciones(lugar) {
    var lista = [];
    for (var a = CONTROL.ang[0]; a <= CONTROL.ang[1]; a++) for (var v = CONTROL.v[0]; v <= CONTROL.v[1]; v++)
      if (simula(comp(v, a), lugar).tipo === 'acierto') lista.push({ ang: a, v: v });
    return lista;
  }
  /* La velocidad entera más chica que alcanza la distancia D (a 45°). */
  function vMinima(D) { return Math.min(CONTROL.v[1], Math.max(CONTROL.v[0], Math.ceil(Math.sqrt(G * D) - 1e-9))); }

  /* ---------- Generadores (az = azar con semilla del motor) ---------- */
  var VELOCIDADES = [10, 15, 20, 25, 30], ANGULOS = [37, 53];
  function genera1(az) {
    var v = az.elige(VELOCIDADES), ang = az.elige(ANGULOS), c = comp(v, ang), t = trig(ang);
    return { v: v, ang: ang, sen: t.sen, cos: t.cos, vx: c.vx, vy: c.vy };
  }
  /* Nivel 2: muralla en x = vx·t con t ∈ {0.5, 1, 1.5} s, la piedra todavía en el aire; la muralla mide un
     número entero de metros que difiere de la altura real entre 1 y 3 m. Los 3 distractores salen de errores
     típicos y se descartan los casos donde dos opciones coinciden o alguna no es positiva. */
  function genera2(az) {
    for (var i = 0; i < 2000; i++) {
      var d = genera1(az), t = az.elige([0.5, 1, 1.5]);
      if (t >= vuelo(d)) continue;
      var y = limpia(alturaEn(d, t));
      if (y <= 0) continue;
      var distractores = [
        { error: 'sin-gravedad', valor: limpia(d.vy * t) },
        { error: 'v-completa', valor: limpia(d.v * t - 0.5 * G * t * t) },
        { error: 'coseno', valor: limpia(d.vx * t - 0.5 * G * t * t) }
      ];
      var valores = [y].concat(distractores.map(function (o) { return o.valor; }));
      if (valores.some(function (a, k) { return a <= 0 || valores.indexOf(a) !== k; })) continue;
      var alturas = [];
      for (var H = 1; H <= y + 3; H++) { var dif = Math.abs(H - y); if (dif >= 1 && dif <= 3) alturas.push(H); }
      if (!alturas.length) continue;
      d.t = t; d.x = limpia(d.vx * t); d.y = y; d.H = az.elige(alturas); d.pasa = y > d.H;
      d.caida = limpia(0.5 * G * t * t);
      d.opciones = az.baraja([{ valor: y, correcta: true }].concat(distractores));
      return d;
    }
    throw new Error('nivel 2: no salió un caso válido');
  }
  /* Nivel 3: D sale de una combinación entera (ángulo, v) cuyo alcance cae a 0.5 m o menos de un entero. */
  function genera3(az) {
    for (var i = 0; i < 2000; i++) {
      var ang = az.entero(CONTROL.ang[0], CONTROL.ang[1]), v = az.entero(CONTROL.v[0], CONTROL.v[1]), R = alcance(comp(v, ang)), D = Math.round(R);
      if (D < 25 || D > 90) continue;
      return { D: D, lugar: { D: D }, base: { ang: ang, v: v }, vMin: vMinima(D) };
    }
    throw new Error('nivel 3: no salió un caso válido');
  }
  /* Nivel 4, dos variantes: castillo sobre una colina (blanco a altura h) o muralla alta cerca del
     trabuquete, que solo se libra con ángulo alto (se comprueba con todas las combinaciones). */
  function genera4(az) {
    for (var i = 0; i < 5000; i++) {
      var variante = az.elige(['colina', 'muralla']), d, c, D;
      if (variante === 'colina') {
        var ang = az.entero(30, 65), v = az.entero(15, 30), h = az.entero(3, 8);
        c = comp(v, ang);
        if (c.vy * c.vy <= 2 * G * h + 1) continue;
        D = Math.round(c.vx * (c.vy + Math.sqrt(c.vy * c.vy - 2 * G * h)) / G);
        if (D < 25 || D > 80) continue;
        d = { variante: variante, D: D, h: h, lugar: { D: D, h: h }, base: { ang: ang, v: v } };
      } else {
        var ang2 = az.entero(52, 72), v2 = az.entero(18, 30), x = az.elige([6, 8, 10, 12]);
        c = comp(v2, ang2);
        D = Math.round(alcance(c));
        if (D < 25 || D > 85) continue;
        var alto = Math.floor(Math.min(alturaEn(c, (x - GRUESO / 2) / c.vx), alturaEn(c, (x + GRUESO / 2) / c.vx)) - 1);
        if (alto < 6) continue;
        d = { variante: variante, D: D, h: 0, muralla: { x: x, alto: alto }, lugar: { D: D, muralla: { x: x, alto: alto } }, base: { ang: ang2, v: v2 } };
      }
      var sol = soluciones(d.lugar);
      if (!sol.length) continue;
      if (variante === 'muralla' && sol.some(function (s) { return s.ang <= 45; })) continue;
      d.vMin = vMinima(D);
      return d;
    }
    throw new Error('nivel 4: no salió un caso válido');
  }

  /* ---------- Textos que dependen de los números ---------- */
  var m1 = function (n) { return fmt(n, 2) + ' m'; };
  var cuanto = function (dif) { var a = Math.abs(dif); return fmt(a, a < 1.1 ? 2 : 1); };
  function mensajeTiro(s, d) {
    if (s.tipo === 'acierto') return '¡Le diste a la puerta! La piedra cayó a ' + fmt(s.x, 1) + ' m.';
    if (s.tipo === 'corto') return 'Te faltaron ' + cuanto(s.dif) + ' m: la piedra cayó a ' + fmt(s.x, 1) + ' m.';
    if (s.tipo === 'largo') return 'Te pasaste ' + cuanto(s.dif) + ' m' + (s.pega ? ': la piedra pegó en el castillo, arriba de la puerta.' : ': la piedra voló por encima del castillo.');
    if (s.tipo === 'muralla') return s.falta > 0 ? 'Chocó con la muralla: llegó a ' + fmt(Math.max(0, s.y), 1) + ' m de altura y le faltaron ' + fmt(s.falta, 1) + ' m para pasarla.' : 'Cayó encima de la muralla: le faltó muy poco para librarla.';
    return 'Chocó con la ladera de la colina: llegó a ' + fmt(Math.max(0, s.y), 1) + ' m de altura y la colina mide ' + d.h + ' m.';
  }

  /* ---------- Cajas de cámara (en metros) ---------- */
  var CERCA = { x0: -8, x1: 10, y1: 9.5, z: 3 };
  function general(d, c) { return { x0: -9, x1: Math.max(d.D + 9, c ? alcance(c) + 4 : 0), y1: Math.max(14, (d.h || 0) + 14, c ? cima(c) + 3 : 0) }; }

  /* Un tiro con los controles (niveles 3 y 4): anima la trayectoria real y marca dónde cayó. */
  function tira(esc, d, vals) {
    var c = comp(vals.v, vals.ang), s = simula(c, d.lugar);
    var vista = general(d, c);
    return esc.lanza({ vx: c.vx, vy: c.vy, tFin: s.t, cerca: d.apunte, general: vista }).then(function () {
      if (s.tipo === 'acierto') { esc.brilla(); esc.tiembla(1.2); return esc.polvo(s.x, s.y, 1.3); }
      if (s.tipo === 'muralla' || s.tipo === 'colina' || s.pega) { esc.tiembla(0.8); esc.polvo(s.x, Math.max(0, s.y), 0.8); return esc.cae(); }
      return esc.polvo(s.x, s.y);
    }).then(function () {
      if (s.tipo === 'corto' || (s.tipo === 'largo' && !s.pega)) esc.tache(s.x, s.y, fmt(s.x, 1) + ' m');
      return { bien: s.tipo === 'acierto', mensaje: mensajeTiro(s, d) };
    });
  }
  function controles() {
    return [
      { id: 'ang', etiqueta: 'Ángulo', min: CONTROL.ang[0], max: CONTROL.ang[1], paso: 1, valor: 30, unidad: '°' },
      { id: 'v', etiqueta: 'Contrapeso (velocidad de salida)', min: CONTROL.v[0], max: CONTROL.v[1], paso: 1, valor: 15, unidad: 'm/s' }
    ];
  }
  function alApuntar(esc, d, vals) { esc.encuadra(d.apunte, 0.4); esc.apunta(vals.ang, vals.v); }

  /* ---------- Niveles ---------- */
  var NIVELES = [
    {
      id: 'descompon', titulo: 'Descompón', etiqueta: 'Muestra gratis',
      genera: genera1,
      enunciado: function (d) { return 'El trabuquete lanza la piedra a ' + d.v + ' m/s con un ángulo de ' + d.ang + '°. Usa sen ' + d.ang + '° = ' + d.sen + ' y cos ' + d.ang + '° = ' + d.cos + '.'; },
      pistas: function (d) {
        return [
          'La velocidad es la hipotenusa de un triángulo: vx es el lado acostado (lo que avanza) y vy el lado parado (lo que sube).',
          'vx = v · cos θ y vy = v · sen θ.',
          'vx = ' + d.v + ' · ' + d.cos + ' = ' + d.vx + ' m/s. Ahora haz lo mismo para vy con el seno.'
        ];
      },
      prepara: function (esc, d) {
        d.D = Math.max(40, Math.ceil(alcance(d)) + 6);
        esc.prepara({ D: d.D, vista: CERCA });
        esc.triangulo(d, 'dato');
      },
      pasos: function (d) {
        return [{
          tipo: 'numeros', pregunta: '¿Cuánto valen las dos partes de la velocidad?',
          campos: [{ id: 'vx', etiqueta: 'vx', unidad: 'm/s', valor: d.vx, tol: 0.05 }, { id: 'vy', etiqueta: 'vy', unidad: 'm/s', valor: d.vy, tol: 0.05 }],
          alFallar: function (esc) { esc.triangulo(d, 'pista'); },
          alAcertar: function (esc, _d, ctx) {
            return esc.triangulo(d, 'resuelto').then(function () { return ctx.espera(0.7); })
              .then(function () { return esc.lanza({ vx: d.vx, vy: d.vy, tFin: vuelo(d), flechas: true, general: general(d, d) }); })
              .then(function () { return esc.polvo(alcance(d), 0); });
          }
        }];
      }
    },
    {
      id: 'predice', titulo: 'Predice antes de lanzar', etiqueta: 'En el libro',
      genera: genera2,
      enunciado: function (d) { return 'La piedra sale a ' + d.v + ' m/s con ' + d.ang + '° (sen ' + d.ang + '° = ' + d.sen + ', cos ' + d.ang + '° = ' + d.cos + '). A ' + m1(d.x) + ' hay una muralla de ' + d.H + ' m de alto.'; },
      pistas: function (d) {
        return [
          'Primero averigua cuánto tarda la piedra en llegar a la muralla; avanza siempre a vx.',
          't = x / vx y después y = vy · t − 5t².',
          'vx = ' + d.v + ' · ' + d.cos + ' = ' + d.vx + ' m/s, así que t = ' + fmt(d.x) + ' / ' + d.vx + ' = ' + fmt(d.t) + ' s. Con ese tiempo calcula la altura.'
        ];
      },
      prepara: function (esc, d) {
        d.D = Math.max(Math.ceil(d.x) + 14, Math.ceil(alcance(d)) + 6);
        d.vistaMuralla = { x0: -9, x1: d.x + 9, y1: Math.max(12, d.H + 4, d.y + 4) };
        esc.prepara({ D: d.D, muralla: { x: d.x, alto: d.H }, vista: d.vistaMuralla });
        esc.cotaSuelo(0, d.x, m1(d.x));
        esc.cotaAlto(d.x - 0.5, 0, d.H, d.H + ' m', { anc: 'end', frente: true });
      },
      pasos: function (d) {
        var ERRORES = {
          'sin-gravedad': 'Eso es vy · t: te faltó la gravedad. En ' + fmt(d.t) + ' s la piedra ya cayó 5t² = ' + fmt(d.caida) + ' m. Réstalos.',
          'v-completa': 'Usaste la velocidad completa (' + d.v + ' m/s). Para subir solo cuenta la parte vertical: vy = v · sen ' + d.ang + '° = ' + d.vy + ' m/s.',
          'coseno': 'Usaste el coseno: v · cos ' + d.ang + '° = ' + d.vx + ' m/s es lo que avanza (vx). Lo que sube es vy = v · sen ' + d.ang + '° = ' + d.vy + ' m/s.'
        };
        return [
          { tipo: 'opciones', id: 'pasa', prediccion: true, pregunta: '¿Pasa la muralla?', opciones: [{ texto: 'Sí pasa', valor: true }, { texto: 'No pasa', valor: false }] },
          {
            tipo: 'opciones', pregunta: '¿A qué altura va la piedra al llegar a la muralla?',
            opciones: d.opciones.map(function (o) { return { texto: m1(o.valor), correcta: !!o.correcta, pista: ERRORES[o.error] }; })
          },
          {
            tipo: 'accion', boton: 'Lanzar', pregunta: 'Ahora compruébalo.',
            ejecuta: function (esc, _d, resp) {
              var s = simula(d, { D: 1e9, muralla: { x: d.x, alto: d.H } }), choca = s.tipo === 'muralla';
              var cota = function () { esc.cotaAlto(d.x, 0, d.y + 0.5, 'y = ' + m1(d.y), { z: 0, color: '#e4572e', punteada: true, arriba: true, frente: true, anc: 'end' }); };
              return esc.lanza({
                vx: d.vx, vy: d.vy, tFin: choca ? s.t : vuelo(d), lento: [d.x - 3, d.x + 2.5], cerca: CERCA, general: d.vistaMuralla,
                eventos: [
                  { x: d.x - 5, haz: function () { esc.encuadra({ x0: d.x - 11, x1: d.x + 7, y1: Math.max(d.H, d.y) + 4 }, 0.5); } },
                  { x: d.x - 0.5, haz: cota },
                  { x: d.x + 3, haz: function () { esc.encuadra({ x0: -9, x1: alcance(d) + 5, y1: Math.max(14, cima(d) + 3) }, 0.8); } }
                ]
              }).then(function () {
                if (choca) { esc.tiembla(1); esc.polvo(s.x, Math.max(0, s.y), 0.9); return esc.cae(); }
                return esc.polvo(alcance(d), 0);
              }).then(function () {
                var acerto = resp.pasa === d.pasa;
                var hecho = 'La piedra llega a ' + m1(d.y) + ' y la muralla mide ' + d.H + ' m: ' + (d.pasa ? 'pasa por ' + m1(limpia(d.y - d.H)) + '.' : 'choca; le faltaron ' + m1(limpia(d.H - d.y)) + '.');
                return { fallo: !acerto, mensaje: hecho + (acerto ? ' Tu predicción fue correcta.' : ' Tu predicción falló.') };
              });
            }
          }
        ];
      }
    },
    {
      id: 'apunta', titulo: 'Apunta', etiqueta: 'En el libro',
      genera: genera3,
      enunciado: function (d) { return 'La puerta del castillo está a ' + d.D + ' m. Elige el ángulo y el contrapeso (más contrapeso = más velocidad de salida). Aciertas si la piedra cae a 1 m o menos de la puerta.'; },
      pistas: function (d) {
        return [
          'Con más velocidad la piedra llega más lejos. Con el ángulo, el alcance crece hasta 45° y después vuelve a bajar.',
          'Alcance: R = v² · sen(2θ) / g, con g = 10 m/s².',
          'El alcance máximo es a 45°: R = v² / g. Con v = ' + d.vMin + ' m/s da ' + d.vMin + '² / 10 = ' + fmt(d.vMin * d.vMin / G, 1) + ' m.'
        ];
      },
      prepara: function (esc, d) {
        d.apunte = CERCA;
        esc.prepara({ D: d.D, vista: general(d) });
        esc.cotaSuelo(0, d.D, d.D + ' m');
      },
      pasos: function () {
        return [{ tipo: 'tiros', pregunta: 'Tienes 3 tiros.', intentos: 3, controles: controles(), alCambiar: alApuntar, lanza: tira, estrellas: function (n) { return 4 - n; } }];
      }
    },
    {
      id: 'final', titulo: 'Reto final', etiqueta: 'En el libro',
      genera: genera4,
      enunciado: function (d) {
        return d.variante === 'colina'
          ? 'El castillo está sobre una colina de ' + d.h + ' m de alto y su puerta queda a ' + d.D + ' m. Elige el ángulo y el contrapeso: la piedra tiene que llegar arriba, a 1 m o menos de la puerta.'
          : 'La puerta está a ' + d.D + ' m, pero a solo ' + d.muralla.x + ' m del trabuquete hay una muralla de ' + d.muralla.alto + ' m de alto. Elige el ángulo y el contrapeso para librarla y caer a 1 m o menos de la puerta.';
      },
      pistas: function (d) {
        var c, y;
        if (d.variante === 'colina') {
          c = comp(d.vMin, 45); y = alturaEn(c, d.D / c.vx);
          return [
            'El blanco está arriba: la piedra tiene que llegar a la puerta cuando todavía va a ' + d.h + ' m de altura. Apunta como si la puerta estuviera más lejos.',
            'Altura al llegar: t = D / vx y después y = vy · t − 5t². Tiene que dar ' + d.h + ' m en D = ' + d.D + ' m.',
            'Con 45° y v = ' + d.vMin + ' m/s, a los ' + d.D + ' m la piedra va a ' + fmt(y, 1) + ' m de altura; necesitas ' + d.h + ' m. ' + (y < d.h ? 'Súbele al contrapeso.' : 'Ajusta desde ahí.')
          ];
        }
        c = comp(d.vMin, 60); y = alturaEn(c, d.muralla.x / c.vx);
        return [
          'Con un tiro bajo la piedra choca con la muralla. Dos ángulos que suman 90° llegan igual de lejos: usa el más alto.',
          'Alcance: R = v² · sen(2θ) / g. Altura al pasar la muralla: t = x / vx y después y = vy · t − 5t².',
          'Con 60° y v = ' + d.vMin + ' m/s, la piedra pasa por la muralla a ' + fmt(y, 1) + ' m de altura (mide ' + d.muralla.alto + ' m) y su alcance es de ' + fmt(alcance(c), 1) + ' m. Ajusta desde ahí.'
        ];
      },
      prepara: function (esc, d) {
        var m = d.muralla;
        d.apunte = m ? { x0: -8, x1: Math.max(10, m.x + 4), y1: Math.max(9.5, m.alto + 3), z: 4 } : CERCA;
        esc.prepara({ D: d.D, h: d.h, muralla: m, vista: general(d) });
        esc.cotaSuelo(0, d.D, d.D + ' m');
        if (d.h) esc.cotaAlto(d.D - 3, 0, d.h, d.h + ' m', { z: 7.5, anc: 'end' });
        if (m) { esc.cotaAlto(m.x - 0.5, 0, m.alto, m.alto + ' m', { anc: 'end', frente: true }); esc.cotaSuelo(0, m.x, m.x + ' m', { z: 3.4, f: 3.6 }); }
      },
      pasos: function () {
        return [{ tipo: 'tiros', pregunta: 'Tienes 5 tiros.', intentos: 5, controles: controles(), alCambiar: alApuntar, lanza: tira, estrellas: function (n) { return n <= 2 ? 3 : n <= 4 ? 2 : 1; } }];
      }
    }
  ];

  var RETO = {
    id: 'catapulta',
    creaEscena: function (cont, ctx) { return raiz.EscenaCatapulta.crea(cont, ctx); },
    niveles: NIVELES,
    resumen: {
      titulo: 'Lo que usaste',
      puntos: [
        'Descomponer la velocidad: vx = v · cos θ y vy = v · sen θ.',
        'Usar el tiempo: t = x / vx y después y = vy · t − 5t².',
        'Alcance máximo a 45°: R = v² / g.'
      ],
      enlace: { href: '../../plantilla/interactivos/tiro-parabolico/plus/', texto: 'Repasar la lámina de tiro parabólico' }
    }
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = { reto: RETO, fisica: { G: G, comp: comp, alturaEn: alturaEn, vuelo: vuelo, alcance: alcance, simula: simula, soluciones: soluciones, CONTROL: CONTROL } };
  } else {
    var caja = document.querySelector('[data-juego="catapulta"]');
    if (caja && raiz.MotorRetos && raiz.EscenaCatapulta) raiz.MotorRetos.monta(caja, RETO);
  }
})(typeof window !== 'undefined' ? window : globalThis);
