/* Prueba del reto de la catapulta:  node retos/catapulta/prueba.mjs
   20 generaciones con semilla por nivel (más un barrido de 2000 por nivel) y comprueba que:
   · siempre hay solución (niveles 3 y 4: se buscan todas las combinaciones enteras de los controles);
   · las cuentas dan enteros donde el diseño lo dice (vx, vy; D; alturas de muralla y colina);
   · nivel 2: t < tiempo de vuelo, la piedra arriba del suelo, muralla ≥ 1 m y a 1-3 m de la altura real,
     las 4 opciones distintas y positivas, una sola correcta, y el choque real coincide con la respuesta;
   · nivel 4: la variante de muralla solo se resuelve con ángulo mayor de 45°.
   No usa la página: reto.js y motor.js se cargan como módulos de Node. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const motor = require('../motor/motor.js');
const { reto, fisica } = require('./reto.js');
const { comp, alturaEn, vuelo, alcance, simula, soluciones, G } = fisica;

let fallas = 0, revisadas = 0;
const exige = (cond, nivel, semilla, texto) => { revisadas++; if (!cond) { fallas++; console.error(`  ✗ nivel ${nivel}, semilla ${semilla}: ${texto}`); } };
const entero = (n) => Number.isInteger(n);
const igual = (a, b) => Math.abs(a - b) < 1e-9;

const REVISA = {
  1(d, s) {
    exige([10, 15, 20, 25, 30].includes(d.v) && [37, 53].includes(d.ang), 1, s, `v = ${d.v}, ángulo = ${d.ang}`);
    exige(entero(d.vx) && entero(d.vy), 1, s, `vx = ${d.vx}, vy = ${d.vy} no son enteros`);
    exige(igual(d.vx, d.v * d.cos) && igual(d.vy, d.v * d.sen), 1, s, 'vx, vy no salen de v·cos y v·sen');
    exige(d.vx * d.vx + d.vy * d.vy === d.v * d.v, 1, s, 'vx² + vy² ≠ v²');
    return `v = ${d.v}, ${d.ang}° → vx = ${d.vx}, vy = ${d.vy}`;
  },
  2(d, s) {
    exige(entero(d.vx) && entero(d.vy), 2, s, 'vx, vy no son enteros');
    exige([0.5, 1, 1.5].includes(d.t) && d.t < vuelo(d), 2, s, `t = ${d.t} no es menor que el vuelo (${vuelo(d)})`);
    exige(igual(d.x, d.vx * d.t), 2, s, 'x ≠ vx·t');
    exige(igual(d.y, d.vy * d.t - 0.5 * G * d.t * d.t) && d.y > 0, 2, s, `altura real = ${d.y}`);
    const dif = Math.abs(d.H - d.y);
    exige(entero(d.H) && d.H >= 1 && dif >= 1 && dif <= 3, 2, s, `muralla de ${d.H} m con altura real ${d.y}`);
    const valores = d.opciones.map((o) => o.valor);
    exige(valores.length === 4 && new Set(valores).size === 4, 2, s, `las 4 opciones no son distintas: ${valores}`);
    exige(valores.every((v) => v > 0), 2, s, `hay opciones que no son positivas: ${valores}`);
    exige(d.opciones.filter((o) => o.correcta).length === 1 && d.opciones.find((o) => o.correcta).valor === d.y, 2, s, 'la correcta no es la altura real');
    const esperados = { 'sin-gravedad': d.vy * d.t, 'v-completa': d.v * d.t - 5 * d.t * d.t, coseno: d.vx * d.t - 5 * d.t * d.t };
    exige(d.opciones.filter((o) => !o.correcta).every((o) => igual(o.valor, esperados[o.error])), 2, s, 'un distractor no corresponde a su error');
    /* lo que se verá al lanzar (muralla de 1 m de grueso) coincide con la respuesta */
    const choca = simula(d, { D: 1e9, muralla: { x: d.x, alto: d.H } }).tipo === 'muralla';
    exige(choca === !d.pasa, 2, s, `la animación ${choca ? 'choca' : 'pasa'} pero la respuesta dice ${d.pasa ? 'pasa' : 'no pasa'}`);
    /* los textos del nivel se arman sin error */
    const pasos = reto.niveles[1].pasos(d);
    exige(pasos[1].opciones.length === 4 && pasos[1].opciones.filter((o) => !o.correcta).every((o) => o.pista), 2, s, 'falta la pista de un distractor');
    return `v = ${d.v}, ${d.ang}°, t = ${d.t} s → x = ${d.x}, y = ${d.y}, muralla ${d.H} m (${d.pasa ? 'pasa' : 'choca'}); opciones ${valores.join(' / ')}`;
  },
  3(d, s) {
    exige(entero(d.D) && d.D >= 25 && d.D <= 90, 3, s, `D = ${d.D}`);
    const sol = soluciones(d.lugar);
    exige(sol.length > 0, 3, s, 'sin solución');
    exige(simula(comp(d.base.v, d.base.ang), d.lugar).tipo === 'acierto', 3, s, 'la combinación de origen no acierta');
    exige(simula(comp(15, 30), d.lugar).tipo !== 'acierto', 3, s, 'los controles ya empiezan en una solución');
    exige(alcance(comp(d.vMin, 45)) >= d.D - 0.001, 3, s, 'la pista final da una velocidad que no alcanza');
    return `D = ${d.D} m (sale de ${d.base.ang}°, ${d.base.v} m/s); ${sol.length} soluciones`;
  },
  4(d, s) {
    exige(entero(d.D) && d.D >= 25 && d.D <= 85, 4, s, `D = ${d.D}`);
    const sol = soluciones(d.lugar);
    exige(sol.length > 0, 4, s, 'sin solución');
    exige(simula(comp(d.base.v, d.base.ang), d.lugar).tipo === 'acierto', 4, s, 'la combinación de origen no acierta');
    exige(simula(comp(15, 30), d.lugar).tipo !== 'acierto', 4, s, 'los controles ya empiezan en una solución');
    if (d.variante === 'colina') exige(entero(d.h) && d.h >= 3 && d.h <= 8 && !d.muralla, 4, s, `colina de ${d.h} m`);
    else {
      exige(entero(d.muralla.x) && entero(d.muralla.alto) && d.muralla.alto >= 6, 4, s, 'muralla no entera');
      exige(sol.every((q) => q.ang > 45), 4, s, 'la muralla se libra con ángulo bajo');
    }
    exige(reto.niveles[3].pistas(d).length === 3, 4, s, 'pistas');
    return `${d.variante}: D = ${d.D} m` + (d.h ? `, colina ${d.h} m` : `, muralla ${d.muralla.alto} m a ${d.muralla.x} m`) + ` (sale de ${d.base.ang}°, ${d.base.v} m/s); ${sol.length} soluciones`;
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
  /* barrido largo, sin imprimir cada caso */
  const tope = n === 4 ? 300 : 2000, vistos = new Set();
  const callar = console.log; console.log = () => {};
  for (let semilla = 1000; semilla < 1000 + tope; semilla++) { const d = nivel.genera(motor.azar(semilla)); REVISA[n](d, semilla); vistos.add(JSON.stringify(d.base || [d.v, d.ang, d.t, d.H])); }
  console.log = callar;
  console.log(`  + barrido de ${tope} semillas: ${vistos.size} casos distintos`);
});

/* piezas del motor */
exige(motor.numero('16,5') === 16.5 && motor.numero(' 12 m/s') === 12 && Number.isNaN(motor.numero('doce')) && Number.isNaN(motor.numero('')), 'motor', '-', 'numero()');
exige(motor.cerca(16.04, 16, 0.05) && !motor.cerca(16.1, 16, 0.05), 'motor', '-', 'cerca()');
exige(motor.estrellasDe(3, 0) === 3 && motor.estrellasDe(3, 1) === 2 && motor.estrellasDe(3, 5) === 1 && motor.estrellasDe(2, 0) === 2, 'motor', '-', 'estrellasDe()');
/* el caso del video: 20 m/s a 37° pasa la muralla de 6 m a 16 m (va a 7 m) y cae a 38.4 m, corta para la puerta a 40 m */
{
  const c = comp(20, 37), s = simula(c, { D: 40, muralla: { x: 16, alto: 6 } });
  exige(c.vx === 16 && c.vy === 12 && igual(alturaEn(c, 1), 7) && s.tipo === 'corto' && igual(s.x, 38.4), 'video', '-', 'el caso del video no coincide');
  exige(simula(comp(20, 45), { D: 40 }).tipo === 'acierto', 'video', '-', '45° a 20 m/s debe dar en la puerta a 40 m');
}

console.log(`\n${revisadas} comprobaciones, ${fallas} fallas.`);
process.exit(fallas ? 1 : 0);
