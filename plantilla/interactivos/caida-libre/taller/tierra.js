// Tierra lejana low-poly: campos, río, carretera, pueblo, árboles y volcán en UNA malla con colores
// por vértice (una sola llamada de dibujo, sin sombras reales). La niebla de la escena la pierde
// en el horizonte. Es decorado: no lleva datos de física.
import * as THREE from "three";

const COL = {
  campos: ["#A9D77A", "#C9DD8F", "#93C96E", "#E2D39A", "#B6DC87", "#D7C77F", "#8CBF67"],
  rio: "#6FB3D6", orilla: "#B9D9A0", carretera: "#D8D1C2", linea: "#F4F1EA",
  muro: ["#F2EBDD", "#E8DCC8", "#F6F1E6"], techo: ["#D9694F", "#C9573F", "#B95A48"],
  arbol: "#5E9E5C", arbolO: "#4E8A50", volcanBase: "#9DB07F", volcanMedio: "#8E7F72", volcanAlto: "#A39589",
  nieve: "#F7F7F4", crater: "#6E625A",
};

// escala: el mapa se arma en unidades «de plano» y se encoge para que los campos se lean lejanos.
export function crearTierra({ y = -420, hex = (x) => x, escala = .45 } = {}) {
  let s = 11; const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pos = [], col = [], c = new THREE.Color();
  const pon = (h) => c.setStyle(hex(h), THREE.SRGBColorSpace);
  const tri = (a, b, d, h) => { pon(h); for (const p of [a, b, d]) { pos.push(p[0], p[1], p[2]); col.push(c.r, c.g, c.b); } };
  const quad = (a, b, d, e, h) => { tri(a, b, d, h); tri(a, d, e, h); };
  const mezcla = (h1, h2, k) => "#" + new THREE.Color(h1).lerp(new THREE.Color(h2), k).getHexString();

  // Campos: mosaico de parcelas con un poco de variación de tono.
  const N = 40, L = 70, X0 = -1400, Z0 = -1700;
  quad([-7000, -1, -7000], [-7000, -1, 7000], [7000, -1, 7000], [7000, -1, -7000], "#B5D38A");   // fondo hasta el horizonte
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = X0 + i * L, z = Z0 + j * L, base = COL.campos[Math.floor(azar() * COL.campos.length)];
    const h = mezcla(base, azar() < .5 ? "#FFFFFF" : "#6E8F4E", azar() * .12);
    quad([x, 0, z], [x, 0, z + L], [x + L, 0, z + L], [x + L, 0, z], h);
  }
  // Tira a lo largo de una curva (río y carretera).
  function tira(f, ancho, alto, h, n = 60) {
    for (let k = 0; k < n; k++) {
      const p = f(k / n), q = f((k + 1) / n), dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l * ancho / 2, nz = dx / l * ancho / 2;
      quad([p[0] - nx, alto, p[1] - nz], [p[0] + nx, alto, p[1] + nz], [q[0] + nx, alto, q[1] + nz], [q[0] - nx, alto, q[1] - nz], h);
    }
  }
  const rio = (u) => [X0 + u * N * L, -260 + 140 * Math.sin(u * 7) + 60 * Math.sin(u * 17)];
  tira(rio, 34, .4, COL.orilla); tira(rio, 20, .8, COL.rio);
  const carretera = (u) => [X0 + u * N * L, 320 - u * 1000 + 40 * Math.sin(u * 5)];
  tira(carretera, 8, 1.2, COL.carretera, 40); tira(carretera, 1.2, 1.4, COL.linea, 40);

  // Caja con techo de otro color (sin cara de abajo).
  function caja(x, z, w, d, h, muro, techo) {
    const a = [x - w / 2, 0, z - d / 2], b = [x + w / 2, 0, z - d / 2], e = [x + w / 2, 0, z + d / 2], f = [x - w / 2, 0, z + d / 2];
    const A = [a[0], h, a[2]], B = [b[0], h, b[2]], E = [e[0], h, e[2]], F = [f[0], h, f[2]];
    quad(f, e, E, F, muro); quad(e, b, B, E, mezcla(muro, "#8A8070", .12)); quad(b, a, A, B, muro); quad(a, f, F, A, mezcla(muro, "#8A8070", .12));
    const cima = [x, h + Math.min(w, d) * .45, z];                                   // techo de cuatro aguas
    tri(F, E, cima, techo); tri(E, B, cima, mezcla(techo, "#000000", .12)); tri(B, A, cima, techo); tri(A, F, cima, mezcla(techo, "#000000", .12));
  }
  // Pueblo junto al río, con su iglesia.
  const PX = 150, PZ = -330;
  for (let k = 0; k < 46; k++) {
    const r = 18 + azar() * 80, a = azar() * 6.283, w = 8 + azar() * 7, d = 8 + azar() * 7;
    caja(PX + r * Math.cos(a), PZ + r * Math.sin(a) * .7, w, d, 5 + azar() * 7,
      COL.muro[k % 3], COL.techo[Math.floor(azar() * 3)]);
  }
  caja(PX, PZ, 12, 22, 16, COL.muro[2], COL.techo[1]); caja(PX, PZ - 14, 7, 7, 30, COL.muro[2], COL.techo[0]);

  // Árboles: conos de 5 lados en bosquecillos.
  function arbol(x, z, h) {
    const r = h * .32, cima = [x, h, z];
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * 6.283, b = (k + 1) / 5 * 6.283;
      tri([x + r * Math.cos(a), 0, z + r * Math.sin(a)], cima, [x + r * Math.cos(b), 0, z + r * Math.sin(b)], k % 2 ? COL.arbol : COL.arbolO);
    }
  }
  [[-260, -120], [380, -60], [-80, -560], [520, -520], [-520, 160], [260, 220]].forEach(([bx, bz]) => {
    for (let k = 0; k < 9; k++) arbol(bx + (azar() - .5) * 90, bz + (azar() - .5) * 70, 12 + azar() * 10);
  });

  // Volcán al fondo: cono truncado con anillos de color, cráter y nieve.
  const VX = -620, VZ = -1350, SEG = 18;
  const anillos = [[300, 0, COL.volcanBase], [190, 120, COL.volcanMedio], [95, 215, COL.volcanAlto], [52, 262, COL.nieve], [30, 250, COL.crater]];
  const jit = Array.from({ length: SEG }, () => .88 + azar() * .24);
  for (let r = 0; r < anillos.length - 1; r++) {
    const [r0, y0, h0] = anillos[r], [r1, y1] = anillos[r + 1];
    for (let k = 0; k < SEG; k++) {
      const a = k / SEG * 6.283, b = (k + 1) / SEG * 6.283, ja = jit[k], jb = jit[(k + 1) % SEG];
      const p = (rr, yy, ang, j) => [VX + rr * j * Math.cos(ang), yy, VZ + rr * j * Math.sin(ang)];
      const hh = r === 2 && k % 3 === 0 ? COL.nieve : h0;                           // lenguas de nieve
      quad(p(r0, y0, a, ja), p(r1, y1, a, ja), p(r1, y1, b, jb), p(r0, y0, b, jb), k % 2 ? hh : mezcla(hh, "#000000", .08));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
  m.position.y = y; m.scale.setScalar(escala); m.matrixAutoUpdate = false; m.updateMatrix();
  m.userData.tris = pos.length / 9;
  return m;
}
