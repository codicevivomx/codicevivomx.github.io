// Verificador de choques (?colisiones=1, solo para depurar; no se carga en uso normal).
// Recorre el guion y cuenta vértices de una pieza que quedan DENTRO de otra pieza cerrada
// (paridad de cruces de un rayo). Pares: persona ↔ avioneta, persona ↔ velas, sola ↔ tándem e
// instructor ↔ alumna dentro del tándem. Las cuerdas, bandas y el slider no cuentan como «vela».
import * as THREE from "three";

const v = new THREE.Vector3();
// Piezas abiertas (tiras y calcas): sus vértices sí se revisan, pero no sirven como sólido para la paridad.
const ABIERTAS = /costura|reloj_|panel|remache|franja_coral/;
const DIR = new THREE.Vector3(1, .0137, .0071).normalize();       // rayo algo inclinado: no roza aristas

// Vértices en el mundo (con esqueleto y morphs) de las mallas visibles de «raiz».
function vertices(raiz, sin = null) {
  const out = [];
  raiz.updateMatrixWorld(true);
  raiz.traverseVisible((m) => {
    if (!m.isMesh || m.name === "contorno" || (sin && bajo(m, sin))) return;
    const n = m.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); out.push(v.x, v.y, v.z, i, m.id); }
  });
  return out;
}
// Triángulos en el mundo; filtroCara(malla, i0, i1, i2, nombreMaterial) decide cuáles entran.
function triangulos(raiz, filtroCara = () => true, sin = null) {
  const out = [];
  raiz.updateMatrixWorld(true);
  raiz.traverseVisible((m) => {
    if (!m.isMesh || m.name === "contorno" || (sin && bajo(m, sin))) return;
    const g = m.geometry, idx = g.index, n = idx ? idx.count : g.attributes.position.count;
    const mats = [].concat(m.material), grupos = g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
    const p = (i) => { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); return [v.x, v.y, v.z]; };
    for (const gr of grupos) {
      const nombre = mats[gr.materialIndex]?.name || "";
      if (ABIERTAS.test(nombre)) continue;                // tiras sin volumen: no encierran nada
      for (let k = gr.start; k < gr.start + gr.count; k += 3) {
        const a = idx ? idx.getX(k) : k, b = idx ? idx.getX(k + 1) : k + 1, c = idx ? idx.getX(k + 2) : k + 2;
        if (filtroCara(m, a, b, c, nombre)) out.push(...p(a), ...p(b), ...p(c));
      }
    }
  });
  return out;
}
const bajo = (m, anc) => { for (let p = m; p; p = p.parent) if (p === anc) return true; return false; };   // la vela cuelga de la persona
const caja = (T) => {
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], T[i + k]); b[k + 3] = Math.max(b[k + 3], T[i + k]); }
  return b;
};
// Cuántos puntos de P (x,y,z,…) caen dentro del sólido T (triángulos). Paridad de cruces.
function dentro(P, T, paso = 5) {
  const b = caja(T); let n = 0; const ej = [];
  for (let i = 0; i < P.length; i += paso) {
    const x = P[i], y = P[i + 1], z = P[i + 2];
    if (x < b[0] || y < b[1] || z < b[2] || x > b[3] || y > b[4] || z > b[5]) continue;
    let cruces = 0;
    for (let t = 0; t < T.length; t += 9) {
      const e1x = T[t + 3] - T[t], e1y = T[t + 4] - T[t + 1], e1z = T[t + 5] - T[t + 2];
      const e2x = T[t + 6] - T[t], e2y = T[t + 7] - T[t + 1], e2z = T[t + 8] - T[t + 2];
      const px = DIR.y * e2z - DIR.z * e2y, py = DIR.z * e2x - DIR.x * e2z, pz = DIR.x * e2y - DIR.y * e2x;
      const det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue;
      const sx = x - T[t], sy = y - T[t + 1], sz = z - T[t + 2], u = (sx * px + sy * py + sz * pz) / det; if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const w = (DIR.x * qx + DIR.y * qy + DIR.z * qz) / det; if (w < 0 || u + w > 1) continue;
      if ((e2x * qx + e2y * qy + e2z * qz) / det > 1e-6) cruces++;
    }
    if (cruces % 2) { n++; if (ej.length < 3) ej.push([x, y, z].map((c) => +c.toFixed(2))); (dentro.ids ||= []).push([P[i + 3], P[i + 4]]); }
  }
  return { n, ej };
}
// Hueso dominante de un vértice (para separar instructor y alumna del tándem).
function huesoDe(m, i) {
  if (!m?.isSkinnedMesh) return (m?.name || "?") + "/" + ([].concat(m?.material)[0]?.name || "");
  const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  let mej = 0, w = -1;
  for (let k = 0; k < 4; k++) { const x = sw.getComponent(i, k); if (x > w) { w = x; mej = si.getComponent(i, k); } }
  return m.skeleton.bones[mej].name;
}
function esAlumna(m, i) {
  if (!m.isSkinnedMesh) return false;
  const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  let mej = 0, w = -1;
  for (let k = 0; k < 4; k++) { const x = sw.getComponent(i, k); if (x > w) { w = x; mej = si.getComponent(i, k); } }
  return m.skeleton.bones[mej].name.startsWith("alu_");
}

export function revisar(escena, D, muestras) {
  const { av, yo, tan } = escena.piezas;
  const informe = [], total = {};
  const visto = {};
  const mallas = new Map(); [av, yo.o, tan.o].forEach((r) => r.traverse((m) => m.isMesh && mallas.set(m.id, m)));
  const nota = (S, par, r) => { const ids = dentro.ids || []; dentro.ids = null; if (!r.n) return;
    const h = {}; ids.forEach(([i, id]) => { const k = huesoDe(mallas.get(id), i); h[k] = (h[k] || 0) + 1; });
    r.huesos = Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => k + ":" + n).join(" "); total[par] = (total[par] || 0) + 1; visto[par] = (visto[par] || 0) + 1;
    if (visto[par] <= 4) informe.push({ S: +S.toFixed(2), par, puntos: r.n, ej: r.ej, huesos: r.huesos }); };
  const esVela = (m, a, b, c, nombre) => /vela|boca/.test(nombre);
  for (const [S, est] of muestras) {
    escena.dibuja(S, { dt: 0, pausa: null, libre: false, tapado: 0, ...est });
    const tAv = triangulos(av);
    const sola = vertices(yo.o, yo.vela), velas = [yo.vela, tan.vela].map((x) => triangulos(x, esVela));
    nota(S, "sola→avioneta", dentro(sola, tAv));
    nota(S, "avioneta→sola", dentro(vertices(av), triangulos(yo.o, undefined, yo.vela)));
    if (tan.o.visible) {
      const tv = vertices(tan.o, tan.vela);
      nota(S, "tándem→avioneta", dentro(tv, tAv));
      nota(S, "sola→tándem", dentro(sola, triangulos(tan.o, undefined, tan.vela)));
      // instructor ↔ alumna: vértices de una dentro de los triángulos de la otra
      const mall = new Map(); tan.o.traverse((m) => m.isMesh && mall.set(m.id, m));
      const deAlu = [], deIns = [];
      for (let i = 0; i < tv.length; i += 5) (esAlumna(mall.get(tv[i + 4]), tv[i + 3]) ? deAlu : deIns).push(tv[i], tv[i + 1], tv[i + 2], tv[i + 3], tv[i + 4]);
      const triDe = (alu) => triangulos(tan.o, (m, a, b, c) => esAlumna(m, a) === alu && esAlumna(m, b) === alu && esAlumna(m, c) === alu, tan.vela);
      nota(S, "alumna→instructor", dentro(deAlu, triDe(false)));
      nota(S, "instructor→alumna", dentro(deIns, triDe(true)));
    }
    if (yo.vela.visible) {                       // cada vela por separado (su propia caja)
      const tv = tan.o.visible ? vertices(tan.o, tan.vela) : [];
      nota(S, "sola→vela sola", dentro(sola, velas[0])); nota(S, "sola→vela tándem", dentro(sola, velas[1]));
      nota(S, "tándem→vela sola", dentro(tv, velas[0])); nota(S, "tándem→vela tándem", dentro(tv, velas[1]));
    }
  }
  return { muestras: muestras.length, pares: total, casos: informe };
}
