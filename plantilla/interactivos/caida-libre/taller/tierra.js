// Tierra lejana low-poly: campos, río, carretera, pueblo, árboles y volcán en UNA malla con colores
// por vértice (una sola llamada de dibujo, sin sombras reales). La niebla de la escena la pierde
// en el horizonte. Es decorado: no lleva datos de física.
import * as THREE from "three";

const COL = {
  // Vivo pero natural: bosque y olivo oscuros, pastos medios, trigo y barbecho; poco verde limón.
  campos: ["#4F7F45", "#5E8A4A", "#6F8F4C", "#7D9152", "#7FA35A", "#8FAF62", "#93B26B", "#A3B46E",
           "#C9B97A", "#D2BE7E", "#B59A6A", "#A6B97A"],
  pesos: [3, 3, 3, 2, 3, 3, 2, 2, 2, 1, 1, 1],
  camino: "#D8C9A6",
  techosGranja: ["#D9694F", "#5B8DD6", "#3FA581", "#E8894F", "#C9573F"],
  rio: "#6FB3D6", orilla: "#B9D9A0", carretera: "#D8D1C2", linea: "#F4F1EA",
  muro: ["#F2EBDD", "#E8DCC8", "#F6F1E6"], techo: ["#D9694F", "#C9573F", "#B95A48"],
  arbol: "#4C7F48", arbolO: "#3E6B3E", volcanBase: "#9DB07F", volcanMedio: "#8E7F72", volcanAlto: "#A39589",
  nieve: "#F7F7F4", crater: "#6E625A",
};

// escala: el mapa se arma en unidades «de plano» y se encoge para que los campos se lean lejanos.
export function crearTierra({ y = -420, hex = (x) => x, escala = .45 } = {}) {
  let s = 11; const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pos = [], col = [], orig = [], c = new THREE.Color();
  const pon = (h) => c.setStyle(hex(h), THREE.SRGBColorSpace);
  const tri = (a, b, d, h) => { pon(h); orig.push(h); for (const p of [a, b, d]) { pos.push(p[0], p[1], p[2]); col.push(c.r, c.g, c.b); } };
  const quad = (a, b, d, e, h) => { tri(a, b, d, h); tri(a, d, e, h); };
  const mezcla = (h1, h2, k) => "#" + new THREE.Color(h1).lerp(new THREE.Color(h2), k).getHexString();

  // Campos irregulares: retícula de líneas con separación desigual y vértices desplazados (cuadriláteros
  // de formas distintas); algunas parcelas vecinas comparten color (parcelas grandes de forma libre) y
  // otras se parten en diagonal. Nada de tablero de ajedrez.
  const N = 40, L = 70, X0 = -1400, Z0 = -1700;
  quad([-7000, -1, -7000], [-7000, -1, 7000], [7000, -1, 7000], [7000, -1, -7000], "#7E9A5C");   // fondo hasta el horizonte
  const lineas = (n) => { const out = [0]; for (let k = 0; k < n; k++) out.push(out[k] + L * (.45 + azar() * 1.1)); const f = n * L / out[n]; return out.map((x) => x * f); };
  const xs = lineas(N), zs = lineas(N);
  const R = Array.from({ length: N + 1 }, (_, i) => Array.from({ length: N + 1 }, (_, j) => {
    const borde = i === 0 || j === 0 || i === N || j === N;
    return [X0 + xs[i] + (borde ? 0 : (azar() - .5) * L * .55), Z0 + zs[j] + (borde ? 0 : (azar() - .5) * L * .55)];
  }));
  const total = COL.pesos.reduce((a, b) => a + b, 0);
  const sortea = () => { let r = azar() * total; for (let k = 0; k < COL.pesos.length; k++) if ((r -= COL.pesos[k]) < 0) return k; return 0; };
  const idx = [];
  for (let i = 0; i < N; i++) { idx.push([]); for (let j = 0; j < N; j++) {
    const r = azar();
    idx[i].push(r < .3 && i ? idx[i - 1][j] : r < .5 && j ? idx[i][j - 1] : sortea());
  } }
  const tono = (k) => mezcla(COL.campos[k], azar() < .5 ? "#FFFFFF" : "#3E5A34", azar() * .08);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const [a, b, c2, d] = [R[i][j], R[i][j + 1], R[i + 1][j + 1], R[i + 1][j]].map(([x, z]) => [x, 0, z]);
    const h = tono(idx[i][j]);
    if (azar() < .18) { tri(a, b, c2, h); tri(a, c2, d, tono(sortea())); }       // parcela partida en diagonal
    else quad(a, b, c2, d, h);
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

  // Caminos de terracería: siguen algunas líneas del mosaico (entre parcelas).
  for (let k = 0; k < 14; k++) {
    const vertical = k % 2, linea = 4 + Math.floor(azar() * (N - 8)), desde = Math.floor(azar() * (N - 12)), largo = 6 + Math.floor(azar() * 10);
    const hasta = Math.min(N, desde + largo);
    for (let k = desde; k < hasta; k++) {
      const p0 = vertical ? R[linea][k] : R[k][linea], p1 = vertical ? R[linea][k + 1] : R[k + 1][linea];
      tira((u) => [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u], 5, .6, COL.camino, 1);
    }
  }

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

  // Granjas sueltas: casa + granero con techos de colores, junto a un camino imaginario.
  const granjas = [];
  for (let k = 0; k < 26; k++) {
    const gx = X0 + 120 + azar() * (N * L - 240), gz = Z0 + 120 + azar() * (N * L - 240);
    if (Math.hypot(gx - 150, gz + 330) < 160) continue;                   // lejos del pueblo
    granjas.push([gx, gz]);
  }

  // Árboles: conos de 5 lados en bosquecillos.
  function arbol(x, z, h) {
    const r = h * .32, cima = [x, h, z];
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * 6.283, b = (k + 1) / 5 * 6.283;
      tri([x + r * Math.cos(a), 0, z + r * Math.sin(a)], cima, [x + r * Math.cos(b), 0, z + r * Math.sin(b)], k % 2 ? COL.arbol : COL.arbolO);
    }
  }
  [[-260, -120], [380, -60], [-80, -560], [520, -520], [-520, 160], [260, 220], [-760, -420], [700, 300], [-300, 560], [880, -900], [-980, 640]].forEach(([bx, bz]) => {
    for (let k = 0; k < 10; k++) arbol(bx + (azar() - .5) * 110, bz + (azar() - .5) * 80, 12 + azar() * 10);
  });
  granjas.forEach(([gx, gz], k) => {
    const techo = COL.techosGranja[k % COL.techosGranja.length];
    caja(gx, gz, 11, 8, 6, COL.muro[k % 3], techo);
    caja(gx + 16, gz + 4, 14, 10, 8, mezcla(COL.muro[1], "#B98A5C", .35), techo);
    for (let a = 0; a < 3; a++) arbol(gx - 10 - a * 7, gz + 12, 10 + a * 2);
  });
  for (let k = 0; k < 4; k++) {                                         // huertos: árboles en hilera
    const hx = X0 + 300 + azar() * (N * L - 600), hz = Z0 + 300 + azar() * (N * L - 600);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) arbol(hx + i * 12, hz + j * 12, 8);
  }

  // Volcán al fondo: cono truncado con anillos de color, cráter y nieve.
  // Volcán en el horizonte (a ~1.3 km de la caída): grande y medio perdido en la niebla, no un cerrito bajo ella.
  const VX = -1000, VZ = -3500, SEG = 18, EV = 2.6;
  const anillos = [[300 * EV, 0, COL.volcanBase], [190 * EV, 120 * EV, COL.volcanMedio], [95 * EV, 215 * EV, COL.volcanAlto], [52 * EV, 262 * EV, COL.nieve], [30 * EV, 250 * EV, COL.crater]];
  const jit = Array.from({ length: SEG }, () => .88 + azar() * .24);
  for (let r = 0; r < anillos.length - 1; r++) {
    const [r0, y0, h0] = anillos[r], [r1, y1] = anillos[r + 1];
    for (let k = 0; k < SEG; k++) {
      const a = k / SEG * 6.283, b = (k + 1) / SEG * 6.283, ja = jit[k], jb = jit[(k + 1) % SEG];
      const p = (rr, yy, ang, j) => [VX + rr * j * Math.cos(ang), yy, VZ + rr * j * Math.sin(ang)];
      const hh = r === 2 && k % 3 === 0 ? COL.nieve : h0;                           // lenguas de nieve
      const bruma = mezcla(k % 2 ? hh : mezcla(hh, "#000000", .08), "#C9D8E4", .5);       // perspectiva atmosférica horneada: medio en niebla
      quad(p(r0, y0, a, ja), p(r1, y1, a, ja), p(r1, y1, b, jb), p(r0, y0, b, jb), bruma);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
  m.position.y = y; m.scale.setScalar(escala); m.matrixAutoUpdate = false; m.updateMatrix();
  m.userData.tris = pos.length / 9;
  m.userData.recolorea = (nuevoHex) => {               // al cambiar de paleta (una vez, no por cuadro)
    const a = geo.attributes.color, cache = new Map();
    orig.forEach((h, i) => {
      let k = cache.get(h); if (!k) { c.setStyle(nuevoHex(h), THREE.SRGBColorSpace); k = [c.r, c.g, c.b]; cache.set(h, k); }
      for (let j = 0; j < 3; j++) a.setXYZ(i * 3 + j, k[0], k[1], k[2]);
    });
    a.needsUpdate = true;
  };
  return m;
}
