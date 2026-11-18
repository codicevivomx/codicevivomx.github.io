/* Códice Vivo · Láminas 2.0 · Etiquetas sin encimarse
   Toda etiqueta de escena lleva class="l2-etq" y data-prio (1 = la más importante, no se mueve).
   acomodaEtiquetas(svg) recorre las etiquetas visibles por prioridad y, si una tapa a otra ya colocada,
   la corre arriba, abajo o a los lados; si no cabe en ningún lado, la oculta (las de menor prioridad).
   data-fija="1": la etiqueta no se mueve (p. ej. los números de una regla); si choca, se oculta.
   Funciona con cualquier escena (laboratorio, tinta) y con las piezas (predicción, herramientas). */

const MOV = [[0, 0], [0, -1], [0, 1], [0, -2], [0, 2], [1, 0], [-1, 0], [0, -3], [1, -1], [-1, -1], [0, 3]];

export function acomodaEtiquetas(svg, o = {}) {
  const lista = [...svg.querySelectorAll(".l2-etq")];
  const vivas = [];
  for (const e of lista) {
    e.removeAttribute("transform"); e.classList.remove("l2-etq-oculta");
    if (!e.textContent.trim()) continue;
    let b; try { b = e.getBBox(); } catch (x) { continue; }
    if (!b.width || !b.height) continue;     /* oculta (display:none) o vacía */
    vivas.push({ e, b, p: +(e.dataset.prio || 5), fija: !!e.dataset.fija });
  }
  vivas.sort((a, c) => a.p - c.p);
  const pad = (o.margen || 2), puestas = (o.obstaculos || []).slice();
  const choca = (r) => puestas.some((q) => r.x < q.x + q.width + pad && r.x + r.width + pad > q.x && r.y < q.y + q.height + pad && r.y + r.height + pad > q.y);
  for (const v of vivas) {
    const { b } = v, dy = b.height * 0.85, dx = b.width * 0.6;
    let puesta = null;
    for (const [mx, my] of (v.fija ? [[0, 0]] : MOV)) {
      const r = { x: b.x + mx * dx, y: b.y + my * dy, width: b.width, height: b.height };
      if (!choca(r)) { puesta = { r, mx, my }; break; }
    }
    if (!puesta) { if (v.p >= 3) { v.e.classList.add("l2-etq-oculta"); continue; } puesta = { r: b, mx: 0, my: 0 }; }
    if (puesta.mx || puesta.my) v.e.setAttribute("transform", `translate(${(puesta.mx * dx).toFixed(1)} ${(puesta.my * dy).toFixed(1)})`);
    puestas.push(puesta.r);
  }
}
