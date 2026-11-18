/* Códice Vivo · reto del esquiador (energía + tiro horizontal). Configuración para retos/motor/motor.js.
   Especificación: docs/diseno-retos.md («Reto 2: Esquiador»). Toda la física se calcula aquí a partir de los
   números generados (g = 10 m/s², sin aire); ningún resultado está escrito a mano.
   Medidas: h = altura de la rampa (de arriba hasta el borde) · b = altura del borde sobre el suelo ·
   c = caída del borde a la zona (= b en terreno plano; b ∓ desnivel en el nivel 4) · x = distancia desde el borde.
   Rampa: v = √(2gh·k), con k = parte de la energía que queda (1 sin fricción). Vuelo: t = √(2c/g), x = v·t.
   Juntas: x = 2√(h·c·k). Los números se eligen para que h·c sea cuadrado perfecto y x salga entera.
   La parte de física no toca la página: `node retos/esquiador/prueba.mjs` la revisa. */
(function (raiz) {
  'use strict';
  var G = 10;
  var limpia = function (n) { return Math.round(n * 1e6) / 1e6; };
  var fmt = function (n, dec) { var k = Math.pow(10, dec == null ? 2 : dec); return String(Math.round(n * k) / k); };
  var esCuadrado = function (n) { var s = Math.round(Math.sqrt(n)); return s * s === n; };

  /* ---------- Física ---------- */
  function vBorde(h, k) { return Math.sqrt(2 * G * h * (k == null ? 1 : k)); }
  function tCaida(c) { return Math.sqrt(2 * c / G); }
  function alcance(h, c, k) { return limpia(vBorde(h, k) * tCaida(c)); }

  /* Sigue el vuelo real desde el borde hasta que el esquiador toca algo.
     lugar = { b, k (energía que queda), X (centro de la zona), W (media zona), paso: { xs, d } | null }
     paso: a partir de x = xs el terreno sube d m (d > 0) o baja |d| m (d < 0); la zona está en esa parte.
     Devuelve { tipo, x, y, t, v, dif }:
       acierto · cae en la zona (|x − X| ≤ W)       corto / largo · dif = x − X
       orilla · choca con la orilla del desnivel (solo si sube); y = altura a la que iba */
  function simula(h, lugar) {
    var b = lugar.b, v = vBorde(h, lugar.k), p = lugar.paso, x, y = 0, t;
    var tb = tCaida(b), x0 = v * tb;
    if (!p) { t = tb; x = x0; }
    else if (p.d > 0) {
      if (x0 <= p.xs) { t = tb; x = x0; }
      else {
        var ts = p.xs / v, ys = b - 0.5 * G * ts * ts;
        if (ys <= p.d) return { tipo: 'orilla', x: p.xs, y: ys, t: ts, v: v, dif: p.xs - lugar.X };
        t = tCaida(b - p.d); x = v * t; y = p.d;
      }
    } else {
      if (x0 < p.xs) { t = tb; x = x0; }
      else { t = tCaida(b - p.d); x = v * t; y = p.d; }
    }
    x = limpia(x);
    var dif = limpia(x - lugar.X), enZona = y === (p ? p.d : 0);
    if (enZona && Math.abs(dif) <= lugar.W + 1e-9) return { tipo: 'acierto', x: x, y: y, t: t, v: v, dif: dif };
    return { tipo: dif < 0 ? 'corto' : 'largo', x: x, y: y, t: t, v: v, dif: dif, arriba: !!p && y !== p.d };
  }
  /* Todas las alturas enteras del control que caen en la zona. */
  var CONTROL = { h: [1, 60] };
  function soluciones(lugar) {
    var lista = [];
    for (var h = CONTROL.h[0]; h <= CONTROL.h[1]; h++) if (simula(h, lugar).tipo === 'acierto') lista.push(h);
    return lista;
  }

  /* Parejas (h, c) enteras con h·c cuadrado perfecto: x = 2√(h·c) sale entera. */
  var PAREJAS = [];
  for (var hh = 4; hh <= 60; hh++) for (var cc = 2; cc <= 10; cc++) if (esCuadrado(hh * cc)) PAREJAS.push({ h: hh, c: cc, s: Math.round(Math.sqrt(hh * cc)) });
  /* Fricción: la nieve quita f % de la energía; queda k = r², con r exacto para que x siga entera. */
  var FRICCION = [{ f: 19, r: 0.9 }, { f: 36, r: 0.8 }, { f: 51, r: 0.7 }];

  /* ---------- Generadores (az = azar con semilla del motor) ---------- */
  /* Nivel 1: h que da v entera (5, 20, 45, 80 m → 10, 20, 30, 40 m/s). Borde a 5 m, como en el video. */
  function genera1(az) {
    var h = az.elige([5, 20, 45, 80]), b = 5;
    return { h: h, b: b, v: limpia(vBorde(h)), x: alcance(h, b), t: tCaida(b) };
  }
  /* Nivel 2: la zona mide 4 m (centro en x = 2√(h·b)). Los 3 distractores son alturas que salen de errores
     típicos al despejar h; se descartan las que coinciden, no son positivas o caerían dentro de la zona. */
  var W2 = 2;
  function errores2(d) {
    var v = d.X / d.t;
    return [
      { error: 'sin-dos', valor: 2 * d.h },                   // h = v²/g: olvidó el ½ de ½mv²
      { error: 'resta-borde', valor: d.h - d.b },             // midió la rampa desde el suelo: le quitó el borde
      { error: 'sin-raiz-t', valor: limpia(5 * d.h / d.b) },  // t = 2b/g, sin la raíz
      { error: 'sin-raiz-v', valor: limpia(v / (2 * G)) }     // v = 2gh, sin la raíz
    ];
  }
  function genera2(az) {
    for (var i = 0; i < 2000; i++) {
      var p = az.elige(PAREJAS), X = 2 * p.s;
      if (X < 12 || X > 36) continue;
      var d = { h: p.h, b: p.c, X: X, W: W2, t: tCaida(p.c) };
      d.v = limpia(vBorde(d.h));
      d.lugar = { b: d.b, k: 1, X: X, W: W2, paso: null };
      var usados = [d.h], validos = [];
      az.baraja(errores2(d)).forEach(function (o) {
        o.valor = Math.round(o.valor * 10) / 10;
        if (o.valor < 1 || usados.some(function (u) { return Math.abs(u - o.valor) < 1; })) return;
        if (Math.abs(alcance(o.valor, d.b) - X) <= W2 + 0.5) return;
        usados.push(o.valor); validos.push(o);
      });
      if (validos.length < 3) continue;
      d.opciones = [{ valor: d.h, correcta: true }].concat(validos.slice(0, 3)).sort(function (a, c) { return a.valor - c.valor; });
      d.hVista = 12;
      return d;
    }
    throw new Error('nivel 2: no salió un caso válido');
  }
  /* Nivel 3: con fricción. Se elige la pareja (h, b) y la fricción para que x = 2√(h·b)·r sea entera. */
  var W = 1.5, H_INICIO = [10, 30, 6];
  function inicio(lugar) { for (var i = 0; i < H_INICIO.length; i++) if (simula(H_INICIO[i], lugar).tipo !== 'acierto') return H_INICIO[i]; return 1; }
  function genera3(az) {
    for (var i = 0; i < 4000; i++) {
      var fr = az.elige(FRICCION), p = az.elige(PAREJAS), X = limpia(2 * p.s * fr.r);
      if (!Number.isInteger(X) || X < 10 || X > 36) continue;
      var k = limpia(fr.r * fr.r), d = { h: p.h, b: p.c, f: fr.f, k: k, X: X, W: W };
      d.lugar = { b: d.b, k: k, X: X, W: W, paso: null };
      d.h0 = limpia(X * X / (4 * d.b));
      if (simula(Math.round(d.h0), d.lugar).tipo === 'acierto') continue;   // la altura sin fricción no debe servir
      d.hIni = inicio(d.lugar);
      return d;
    }
    throw new Error('nivel 3: no salió un caso válido');
  }
  /* Nivel 4: la zona está en un desnivel (sube o baja d m desde el piso del borde); a veces también hay fricción.
     La pareja es (h, c) con c = caída real hasta la zona; b = c + d (si sube) o c − d (si baja). */
  function genera4(az) {
    for (var i = 0; i < 6000; i++) {
      var variante = az.elige(['arriba', 'abajo']), fr = az.elige([{ f: 0, r: 1 }].concat(FRICCION.slice(0, 2)));
      var p = az.elige(PAREJAS), X = limpia(2 * p.s * fr.r), dd = az.entero(2, 4);
      if (!Number.isInteger(X) || X < 14 || X > 36) continue;
      var c = p.c, b = variante === 'arriba' ? c + dd : c - dd;
      if (b < 2 || b > 12) continue;
      var k = limpia(fr.r * fr.r), xs = X - W - 2, d = { variante: variante, h: p.h, b: b, c: c, dd: dd, f: fr.f, k: k, X: X, W: W, xs: xs };
      if (xs < 4) continue;
      d.lugar = { b: b, k: k, X: X, W: W, paso: { xs: xs, d: variante === 'arriba' ? dd : -dd } };
      if (simula(p.h, d.lugar).tipo !== 'acierto') continue;
      /* el error típico (usar la altura del borde en vez de la caída real) no debe caer en la zona */
      d.hBorde = limpia(X * X / (4 * b * k));
      if (simula(Math.round(d.hBorde), d.lugar).tipo === 'acierto') continue;
      if (!soluciones(d.lugar).length) continue;
      d.hIni = inicio(d.lugar);
      return d;
    }
    throw new Error('nivel 4: no salió un caso válido');
  }

  /* ---------- Textos que dependen de los números ---------- */
  var m = function (n) { return fmt(n, 1) + ' m'; };
  function mensajeTiro(s, d) {
    if (s.tipo === 'acierto') return '¡En la zona! Cayó a ' + m(s.x) + ' del borde.';
    if (s.tipo === 'orilla') return 'Chocó con la orilla del desnivel: al llegar iba a ' + m(Math.max(0, s.y)) + ' del piso y el desnivel mide ' + d.dd + ' m. Necesita más velocidad.';
    if (s.arriba) return (d.variante === 'abajo' ? 'No llegó al desnivel: cayó a ' + m(s.x) + ', todavía arriba.' : 'Cayó antes del escalón, a ' + m(s.x) + '.') + ' Te faltaron ' + m(-s.dif) + '.';
    if (s.tipo === 'corto') return 'Te faltaron ' + m(-s.dif) + ': cayó a ' + m(s.x) + ' del borde.';
    return 'Te pasaste ' + m(s.dif) + ': cayó a ' + m(s.x) + ' del borde.';
  }

  /* ---------- Cajas de cámara (en metros: x desde el borde, y sobre el piso del borde) ---------- */
  function general(h, d) { var bajo = d.lugar && d.lugar.paso ? Math.min(0, d.lugar.paso.d) : 0; return { x0: -h - 3, x1: (d.X || d.x || 20) + (d.W || 0) + 6, y0: bajo - 1, y1: d.b + h + 3 }; }
  function aterriza(d) { var bajo = d.lugar && d.lugar.paso ? Math.min(0, d.lugar.paso.d) : 0; return { x0: -4, x1: (d.X || d.x) + (d.W || 0) + 6, y0: bajo - 1, y1: d.b + 4 }; }

  /* Un salto con el control de altura (niveles 3 y 4): anima el recorrido real y marca dónde cayó. */
  function salta(esc, d, vals) {
    var s = simula(vals.h, d.lugar);
    return esc.suelta({ h: vals.h, b: d.b, k: d.k, sim: s, caja: aterriza(d) }).then(function () {
      if (s.tipo === 'acierto') { esc.brilla(); esc.bien(s.x, s.y); }
      else esc.tache(s.x, Math.max(s.y, 0), fmt(s.x, 1) + ' m');
      return { bien: s.tipo === 'acierto', mensaje: mensajeTiro(s, d) };
    });
  }
  function control(d) { return [{ id: 'h', etiqueta: 'Altura de la rampa', min: CONTROL.h[0], max: CONTROL.h[1], paso: 1, valor: d.hIni, unidad: 'm' }]; }
  function alCambiar(esc, d, vals) { esc.rampa(vals.h, 0, 'h = ' + vals.h + ' m'); esc.mira(general(vals.h, d)); }

  /* ---------- Niveles ---------- */
  var NIVELES = [
    {
      id: 'energia', titulo: 'Baja la rampa', etiqueta: 'Muestra gratis',
      genera: genera1,
      enunciado: function (d) { return 'El esquiador se suelta desde lo alto de una rampa de ' + d.h + ' m (de arriba hasta el borde). Sin fricción y con g = 10 m/s².'; },
      pistas: function (d) {
        return [
          'Arriba solo tiene energía potencial; en el borde toda se volvió cinética. La masa no importa: se cancela.',
          'mgh = ½mv², así que v = √(2gh).',
          'v = √(2 · 10 · ' + d.h + ') = √' + (20 * d.h) + '. ¿Qué número al cuadrado da ' + (20 * d.h) + '?'
        ];
      },
      prepara: function (esc, d) {
        esc.prepara({ h: d.h, b: d.b, textoH: d.h + ' m', textoB: d.b + ' m', vista: general(d.h, d) });
      },
      pasos: function (d) {
        return [{
          tipo: 'numeros', pregunta: '¿Con qué velocidad llega al borde de la rampa?',
          campos: [{ id: 'v', etiqueta: 'v', unidad: 'm/s', valor: d.v, tol: 0.5 }],
          alFallar: function (esc) { esc.energia(); },
          alAcertar: function (esc) {
            var s = simula(d.h, { b: d.b, k: 1, X: d.x, W: 0.5, paso: null });
            return esc.suelta({ h: d.h, b: d.b, k: 1, sim: s, caja: aterriza(d), etiquetaV: 'v = ' + d.v + ' m/s' })
              .then(function () { esc.cotaSuelo(0, s.x, m(s.x)); });
          }
        }];
      }
    },
    {
      id: 'predice', titulo: 'Predice la altura', etiqueta: 'En el libro',
      genera: genera2,
      enunciado: function (d) { return 'El borde de la rampa está a ' + d.b + ' m del suelo y la zona de aterrizaje va de ' + (d.X - d.W) + ' a ' + (d.X + d.W) + ' m del borde. Sin fricción, ¿desde qué altura (medida desde el borde) hay que soltar al esquiador para caer en el centro, a ' + d.X + ' m?'; },
      pistas: function (d) {
        return [
          'Empieza por el vuelo: cuánto tarda en caer los ' + d.b + ' m del borde. En ese tiempo tiene que avanzar ' + d.X + ' m.',
          'Caída: t = √(2b/g). Avance: x = v · t. Rampa: v = √(2gh).',
          'Truco de examen: x = 2√(h·b), no depende de g. Despeja: h = x² / (4b) = ' + d.X + '² / (4 · ' + d.b + ').'
        ];
      },
      prepara: function (esc, d) {
        esc.prepara({ h: d.hVista, b: d.b, textoH: 'h = ?', textoB: d.b + ' m', zona: { X: d.X, W: d.W }, cotaZona: true, vista: general(Math.max(d.hVista, d.h), d) });
      },
      pasos: function (d) {
        var cae = function (h) { return m(alcance(h, d.b)); };
        var ERRORES = {
          'sin-dos': function (o) { return 'Con ' + m(o.valor) + ' saldría muy rápido y caería a ' + cae(o.valor) + ', pasando la zona. De mgh = ½mv² sale h = v²/(2g): te faltó el 2.'; },
          'resta-borde': function (o) { return 'Con ' + m(o.valor) + ' caería a ' + cae(o.valor) + ', antes de la zona. Le quitaste los ' + d.b + ' m del borde, pero la altura de la rampa ya se mide desde el borde: esos ' + d.b + ' m solo cuentan para el vuelo.'; },
          'sin-raiz-t': function (o) { return 'Con ' + m(o.valor) + ' caería a ' + cae(o.valor) + '. El tiempo de caída es t = √(2b/g) = √(' + (2 * d.b) + '/10) s: te faltó la raíz.'; },
          'sin-raiz-v': function (o) { return 'Con ' + m(o.valor) + ' caería a ' + cae(o.valor) + ', muy corto. La rapidez es v = √(2gh), no 2gh: te faltó la raíz.'; }
        };
        return [
          {
            tipo: 'opciones', pregunta: '¿Qué altura de rampa necesitas?',
            opciones: d.opciones.map(function (o) { return { texto: m(o.valor), correcta: !!o.correcta, pista: o.correcta ? null : ERRORES[o.error](o) }; }),
            alAcertar: function (esc) { return esc.rampa(d.h, 0.8, 'h = ' + d.h + ' m'); }
          },
          {
            tipo: 'accion', boton: 'Soltar al esquiador', pregunta: 'Ahora compruébalo.',
            ejecuta: function (esc) {
              var s = simula(d.h, d.lugar);
              return esc.suelta({ h: d.h, b: d.b, k: 1, sim: s, caja: aterriza(d), etiquetaV: 'v = ' + fmt(d.v, 1) + ' m/s' }).then(function () {
                esc.brilla(); esc.bien(s.x, s.y);
                return { mensaje: 'Sale del borde a ' + fmt(d.v, 1) + ' m/s, tarda ' + fmt(d.t, 2) + ' s en caer y avanza ' + m(s.x) + ': justo en el centro.' };
              });
            }
          }
        ];
      }
    },
    {
      id: 'friccion', titulo: 'Con fricción', etiqueta: 'En el libro',
      genera: genera3,
      enunciado: function (d) { return 'Ahora la nieve frena: en la rampa se pierde el ' + d.f + ' % de la energía (se vuelve calor). El borde está a ' + d.b + ' m del suelo y la zona va de ' + (d.X - d.W) + ' a ' + (d.X + d.W) + ' m. Ajusta la altura de la rampa.'; },
      pistas: function (d) {
        return [
          'Con fricción llega más lento que sin ella, así que necesitas más altura que sin fricción.',
          'Solo queda el ' + (100 - d.f) + ' % de la energía: ½mv² = ' + d.k + ' · mgh → v = √(2gh · ' + d.k + '). El vuelo es igual: x = v · √(2b/g).',
          'Sin fricción bastaría h = x² / (4b) = ' + fmt(d.h0, 2) + ' m. Con fricción divide entre ' + d.k + '.'
        ];
      },
      prepara: function (esc, d) {
        esc.prepara({ h: d.hIni, b: d.b, k: d.k, textoH: 'h = ' + d.hIni + ' m', textoB: d.b + ' m', zona: { X: d.X, W: d.W }, cotaZona: true, vista: general(d.hIni, d) });
      },
      pasos: function (d) {
        return [{ tipo: 'tiros', boton: 'Soltar', pregunta: 'Tienes 3 intentos.', intentos: 3, controles: control(d), alCambiar: alCambiar, lanza: salta, estrellas: function (n) { return 4 - n; } }];
      }
    },
    {
      id: 'final', titulo: 'Reto final', etiqueta: 'En el libro',
      genera: genera4,
      enunciado: function (d) {
        var donde = d.variante === 'arriba' ? 'sobre un escalón de nieve ' + d.dd + ' m más alto que el piso del borde' : 'abajo de un desnivel de ' + d.dd + ' m';
        return 'El borde está a ' + d.b + ' m del piso y la zona (de ' + (d.X - d.W) + ' a ' + (d.X + d.W) + ' m) queda ' + donde + '. ' +
          (d.f ? 'La nieve quita el ' + d.f + ' % de la energía en la rampa. ' : 'Sin fricción. ') + 'Ajusta la altura de la rampa.';
      },
      pistas: function (d) {
        var signo = d.variante === 'arriba' ? ' − ' : ' + ', kk = d.k === 1 ? '' : ' · ' + d.k;
        return [
          'Lo que importa para el vuelo es cuánto cae desde el borde hasta la zona, no hasta el piso de abajo del borde.',
          'Caída real: c = ' + d.b + signo + d.dd + ' = ' + d.c + ' m. Con el truco: x = 2√(h · c' + kk + ').',
          'Si usas los ' + d.b + ' m del borde te da h = ' + fmt(d.hBorde, 1) + ' m y no cae en la zona. Con c = ' + d.c + ' m: h = x² / (4c' + kk + ').'
        ];
      },
      prepara: function (esc, d) {
        esc.prepara({ h: d.hIni, b: d.b, k: d.k, textoH: 'h = ' + d.hIni + ' m', textoB: d.b + ' m', zona: { X: d.X, W: d.W }, paso: d.lugar.paso, cotaZona: true, vista: general(d.hIni, d) });
      },
      pasos: function (d) {
        return [{ tipo: 'tiros', boton: 'Soltar', pregunta: 'Tienes 5 intentos.', intentos: 5, controles: control(d), alCambiar: alCambiar, lanza: salta, estrellas: function (n) { return n <= 2 ? 3 : n <= 4 ? 2 : 1; } }];
      }
    }
  ];

  var RETO = {
    id: 'esquiador',
    creaEscena: function (cont, ctx) { return raiz.EscenaEsquiador.crea(cont, ctx); },
    niveles: NIVELES,
    resumen: {
      titulo: 'Lo que usaste',
      puntos: [
        'Conservación de la energía: mgh = ½mv², v = √(2gh).',
        'Tiro horizontal: t = √(2c/g) y x = v · t.',
        'Truco de examen: x = 2√(h · c), no depende de g. Con fricción, multiplica h por la parte de energía que queda.'
      ],
      enlace: { href: '../../plantilla/interactivos/tiro-parabolico/plus/', texto: 'Repasar la lámina de tiro parabólico' }
    }
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = { reto: RETO, fisica: { G: G, vBorde: vBorde, tCaida: tCaida, alcance: alcance, simula: simula, soluciones: soluciones, CONTROL: CONTROL, errores2: errores2 } };
  } else {
    var caja = document.querySelector('[data-juego="esquiador"]');
    if (caja && raiz.MotorRetos && raiz.EscenaEsquiador) raiz.MotorRetos.monta(caja, RETO);
  }
})(typeof window !== 'undefined' ? window : globalThis);
