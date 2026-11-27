// Etiquetas de la escena 3D como texto HTML sobre el lienzo. En cada cuadro se proyectan y, si dos
// se enciman, la de menor prioridad se recorre en vertical hasta quedar libre (en el boceto 9 eran
// sprites y se tapaban entre sí en algunos ángulos). Las que caen bajo la hoja levantada se recorren
// hacia arriba.
import * as THREE from "three";

export function crearEtiquetas(contenedor) {
  const capa = document.createElement("div");
  capa.className = "capa-etiquetas";
  capa.setAttribute("aria-hidden", "true");
  contenedor.appendChild(capa);
  const todas = [];
  const p = new THREE.Vector3();

  // lado: "centro" | "der" (a la derecha del punto) | "izq"; prioridad: mayor = no se mueve.
  function nueva(texto, { clase = "", lado = "centro", prioridad = 1 } = {}) {
    const el = document.createElement("span");
    el.className = "et3d " + clase;
    el.textContent = texto;
    capa.appendChild(el);
    const e = { el, pos: new THREE.Vector3(), visible: false, lado, prioridad, w: 0, h: 0, texto };
    e.poner = (t) => { if (t !== e.texto) { e.texto = t; el.textContent = t; e.w = 0; } };
    todas.push(e);
    return e;
  }

  function actualizar(cam, W, H, { techo = H } = {}) {
    const cajas = [];
    for (const e of todas) {
      if (!e.visible) { if (e.el.style.display !== "none") e.el.style.display = "none"; continue; }
      p.copy(e.pos).project(cam);
      if (p.z > 1 || p.z < -1 || Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2) { e.el.style.display = "none"; continue; }
      if (e.el.style.display === "none") e.el.style.display = "";
      if (!e.w) { e.w = e.el.offsetWidth; e.h = e.el.offsetHeight; }
      const x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H;
      const cx = e.lado === "der" ? x + 8 + e.w / 2 : e.lado === "izq" ? x - 8 - e.w / 2 : x;
      cajas.push({ e, x: cx, y });
    }
    cajas.sort((a, b) => b.e.prioridad - a.e.prioridad || a.y - b.y);
    const puestas = [];
    for (const c of cajas) {
      const { w, h } = c.e;
      let y = Math.min(c.y, techo - h / 2 - 4);           // fuera de la hoja levantada
      for (let k = 0; k < 24; k++) {
        const o = puestas.find((q) => Math.abs(q.x - c.x) < (q.e.w + w) / 2 + 4 && Math.abs(q.y - y) < (q.e.h + h) / 2 + 2);
        if (!o) break;
        const abajo = c.y >= o.y && y + (o.e.h + h) / 2 + 3 + o.y - y < techo;
        y = o.y + (abajo ? 1 : -1) * ((o.e.h + h) / 2 + 3);
      }
      c.y = y;
      puestas.push(c);
      c.e.el.style.transform = `translate(${Math.round(c.x - w / 2)}px, ${Math.round(y - h / 2)}px)`;
    }
  }

  return { nueva, actualizar, capa };
}
