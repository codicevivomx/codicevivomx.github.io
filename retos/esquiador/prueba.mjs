/* Prueba del reto del esquiador:  node retos/esquiador/prueba.mjs
   20 generaciones con semilla por nivel (más un barrido de 2000 por nivel) y comprueba que:
   · siempre hay solución con la altura entera del control (niveles 2-4);
   · las cuentas dan enteros donde el diseño lo dice (v del nivel 1; h·c cuadrado perfecto y x entera en 2-4);
   · nivel 2: 4 opciones distintas y positivas, una sola correcta, cada distractor sale de su error
     y cae fuera de la zona;
   · niveles 3 y 4: el control no empieza en una solución y el error típico (sin fricción / con la altura
     del borde) no cae en la zona.
   No usa la página: reto.js y motor.js se cargan como módulos de Node. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const motor = require('../motor/motor.js');
const { reto, fisica } = require('./reto.js');
const { vBorde, tCaida, alcance, simula, soluciones, errores2 } = fisica;

let fallas = 0, revisadas = 0;
const exige = (cond, nivel, semilla, texto) => { revisadas++; if (!cond) { fallas++; console.error(`  ✗ nivel ${nivel}, semilla ${semilla}: ${texto}`); } };
const entero = (n) => Number.isInteger(n);
const igual = (a, b) => Math.abs(a - b) < 1e-6;
const cuadrado = (n) => entero(n) && Math.round(Math.sqrt(n)) ** 2 === n;

const REVISA = {
  1(d, s) {
    exige([5, 20, 45, 80].includes(d.h) && d.b === 5, 1, s, `h = ${d.h}, b = ${d.b}`);
    exige(entero(d.v) && igual(d.v, Math.sqrt(20 * d.h)), 1, s, `v = ${d.v} no es entera o no es √(2gh)`);
    exige(entero(d.x) && igual(d.x, 2 * Math.sqrt(d.h * d.b)), 1, s, `x = ${d.x}`);
    return `h = ${d.h} m → v = ${d.v} m/s, cae a ${d.x} m`;
  },
  2(d, s) {
    exige(cuadrado(d.h * d.b) && entero(d.X) && igual(d.X, 2 * Math.sqrt(d.h * d.b)), 2, s, `h·b = ${d.h * d.b}, X = ${d.X}`);
    exige(igual(alcance(d.h, d.b), d.X), 2, s, 'la física no da X con la h correcta');
    const valores = d.opciones.map((o) => o.valor);
    exige(valores.length === 4 && new Set(valores).size === 4, 2, s, `las 4 opciones no son distintas: ${valores}`);
    exige(valores.every((v) => v >= 1), 2, s, `hay opciones no positivas: ${valores}`);
    exige(d.opciones.filter((o) => o.correcta).length === 1 && d.opciones.find((o) => o.correcta).valor === d.h, 2, s, 'la correcta no es h');
    const esperados = Object.fromEntries(errores2(d).map((o) => [o.error, Math.round(o.valor * 10) / 10]));
    d.opciones.filter((o) => !o.correcta).forEach((o) => {
      exige(igual(o.valor, esperados[o.error]), 2, s, `el distractor ${o.error} no corresponde a su error`);
      exige(simula(o.valor, d.lugar).tipo !== 'acierto', 2, s, `el distractor ${o.valor} m cae en la zona`);
    });
    exige(simula(d.h, d.lugar).tipo === 'acierto', 2, s, 'la correcta no cae en la zona');
    const pasos = reto.niveles[1].pasos(d);
    exige(pasos[0].opciones.filter((o) => !o.correcta).every((o) => o.pista), 2, s, 'falta la pista de un distractor');
    exige(reto.niveles[1].pistas(d)[2].startsWith('Truco de examen: x = 2√(h·b), no depende de g.'), 2, s, 'la pista final no trae el truco');
    return `b = ${d.b}, zona ${d.X - d.W}-${d.X + d.W} m → h = ${d.h}; opciones ${valores.join(' / ')} (${d.opciones.filter((o) => !o.correcta).map((o) => o.error).join(', ')})`;
  },
  3(d, s) {
    exige(cuadrado(d.h * d.b) && entero(d.X), 3, s, `h·b = ${d.h * d.b}, X = ${d.X}`);
    exige(igual(alcance(d.h, d.b, d.k), d.X), 3, s, 'x = 2√(h·b·k) no da X');
    const sol = soluciones(d.lugar);
    exige(sol.includes(d.h), 3, s, `la h de origen (${d.h}) no está entre las soluciones`);
    exige(simula(d.hIni, d.lugar).tipo !== 'acierto', 3, s, 'el control empieza en una solución');
    exige(simula(Math.round(d.h0), d.lugar).tipo !== 'acierto', 3, s, 'la altura sin fricción también sirve');
    return `fricción ${d.f} %, b = ${d.b}, X = ${d.X} → h = ${d.h} (sin fricción ${d.h0}); soluciones ${sol.join(', ')}`;
  },
  4(d, s) {
    exige(cuadrado(d.h * d.c) && entero(d.X), 4, s, `h·c = ${d.h * d.c}, X = ${d.X}`);
    exige(d.c === (d.variante === 'arriba' ? d.b - d.dd : d.b + d.dd) && d.b >= 2, 4, s, `b = ${d.b}, c = ${d.c}, desnivel ${d.dd}`);
    exige(igual(alcance(d.h, d.c, d.k), d.X), 4, s, 'x = 2√(h·c·k) no da X');
    const sol = soluciones(d.lugar);
    exige(sol.includes(d.h), 4, s, `la h de origen (${d.h}) no está entre las soluciones`);
    exige(simula(d.hIni, d.lugar).tipo !== 'acierto', 4, s, 'el control empieza en una solución');
    exige(simula(Math.round(d.hBorde), d.lugar).tipo !== 'acierto', 4, s, 'usar la altura del borde también sirve');
    exige(reto.niveles[3].pistas(d).length === 3, 4, s, 'pistas');
    return `${d.variante} ${d.dd} m, b = ${d.b}, c = ${d.c}, fricción ${d.f} %, X = ${d.X} → h = ${d.h}; soluciones ${sol.join(', ')}`;
  }
};

reto.niveles.forEach((nivel, i) => {
  const n = i + 1;
  console.log(`\nNivel ${n} · ${nivel.titulo}`);
  for (let semilla = 1; semilla <= 20; semilla++) {
    const d = nivel.genera(motor.azar(semilla));
    const linea = REVISA[n](d, semilla);
    exige(typeof nivel.enunciado(d) === 'string' && nivel.pistas(d).length === 3, n, semilla, 'enunciado o pistas');
    console.log(`  ${String(semilla).padStart(2)}. ${linea}`);
  }
  const tope = 2000, vistos = new Set();
  const callar = console.log; console.log = () => {};
  for (let semilla = 1000; semilla < 1000 + tope; semilla++) { const d = nivel.genera(motor.azar(semilla)); REVISA[n](d, semilla); vistos.add(JSON.stringify([d.h, d.b, d.f, d.variante, d.dd])); }
  console.log = callar;
  console.log(`  + barrido de ${tope} semillas: ${vistos.size} casos distintos`);
});

/* el caso del video: rampa de 20 m, borde a 5 m → 20 m/s, 1 s de vuelo, cae a 20 m (se pasa de la zona de 10-15 m) */
{
  exige(igual(vBorde(20), 20) && igual(tCaida(5), 1) && igual(alcance(20, 5), 20), 'video', '-', 'el caso del video no coincide');
  exige(simula(20, { b: 5, k: 1, X: 12.5, W: 2.5, paso: null }).tipo === 'largo', 'video', '-', 'en el video se pasa de la zona');
}

console.log(`\n${revisadas} comprobaciones, ${fallas} fallas.`);
process.exit(fallas ? 1 : 0);
