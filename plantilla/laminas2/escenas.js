/* Códice Vivo · Láminas 2.0 · Modo situación real (ver docs/diseno-laminas-2.md)
   1) creaSelector: botón para cambiar la escena de laboratorio por una situación real con la misma física.
   2) tinta: ayudantes de dibujo estilo «tinta» (los mismos del video y del reto de la catapulta,
      retos/catapulta/escena.js) para que cada tema dibuje su situación real sin copiarlos.

   creaSelector(cont, { opciones: [{ id, etiqueta }], inicial, clave, alCambiar(id) }) → { id, pon(id) }
     «clave» guarda la elección en el navegador (si deja). */

export function creaSelector(cont, o) {
  let id = o.inicial || o.opciones[0].id;
  try { const g = o.clave && localStorage.getItem(o.clave); if (g && o.opciones.some((x) => x.id === g)) id = g; } catch (e) { /* sin almacenamiento */ }
  cont.classList.add("l2-selector");
  cont.setAttribute("role", "radiogroup"); cont.setAttribute("aria-label", o.etiqueta || "Escena");
  cont.innerHTML = o.opciones.map((x) => `<button type="button" role="radio" data-id="${x.id}">${x.etiqueta}</button>`).join("");
  const bs = [...cont.querySelectorAll("button")];
  function pon(nuevo, avisar = true) {
    id = nuevo;
    bs.forEach((b) => b.setAttribute("aria-checked", b.dataset.id === id));
    try { if (o.clave) localStorage.setItem(o.clave, id); } catch (e) { /* sin almacenamiento */ }
    if (avisar && o.alCambiar) o.alCambiar(id);
  }
  bs.forEach((b) => b.addEventListener("click", () => { if (b.dataset.id !== id) pon(b.dataset.id); }));
  cont.addEventListener("keydown", (e) => {
    const i = bs.findIndex((b) => b.dataset.id === id), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return; e.preventDefault(); const b = bs[(i + d + bs.length) % bs.length]; pon(b.dataset.id); b.focus();
  });
  pon(id, false);
  return { get id() { return id; }, pon };
}

/* ---------- Tinta ---------- */
const NS = "http://www.w3.org/2000/svg";
const TINTA = "#1d1a16", AZUL = "#1f3fa6", CORAL = "#e4572e", VERDE = "#1f8f5f", PAPEL = "#f6efdd", GRIS = "#6b7080";
const el = (tag, at = {}, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; };
const n1 = (v) => Math.round(v * 10) / 10, n2 = (v) => Math.round(v * 100) / 100;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rng = (semilla) => { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* Trazo con temblor: cada lado se parte en tramos curvos que se salen un poco de la línea. */
function wob(pts, semilla, o = {}) {
  const amp = o.amp == null ? 1.3 : o.amp, paso = o.paso || 34, cerrado = o.cerrado !== false, r = rng(semilla), j = () => (r() * 2 - 1) * amp;
  const q = pts.map((p) => [p[0] + j() * 0.5, p[1] + j() * 0.5]);
  let d = "M" + n2(q[0][0]) + " " + n2(q[0][1]);
  const n = cerrado ? q.length : q.length - 1;
  for (let i = 0; i < n; i++) {
    const a = q[i], b = q[(i + 1) % q.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, k = Math.max(1, Math.round(L / paso)), nx = -dy / L, ny = dx / L;
    for (let s = 1; s <= k; s++) {
      const tm = (s - 0.5) / k, te = s / k, o1 = j(), o2 = s === k ? 0 : j() * 0.4;
      d += "Q" + n2(a[0] + dx * tm + nx * o1) + " " + n2(a[1] + dy * tm + ny * o1) + " " + n2(a[0] + dx * te + nx * o2) + " " + n2(a[1] + dy * te + ny * o2);
    }
  }
  return d + (cerrado ? "Z" : "");
}
const forma = (par, pts, fill, semilla, o = {}) => el("path", { d: wob(pts, semilla, o), fill, class: "ink" + (o.cls ? " " + o.cls : "") }, par);
const FINO = { amp: 0.3, paso: 9 };
const circulo = (cx, cy, r, n = 12) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 6.2832), cy + r * Math.sin(i / n * 6.2832)]);
const redondo = (cx, cy, r) => `M${n2(cx - r)} ${n2(cy)}a${r} ${r} 0 1 0 ${n2(2 * r)} 0a${r} ${r} 0 1 0 ${n2(-2 * r)} 0`;
/* Detalle fino (achurado, grietas). */
const det = (par, d, w = 0.45, o = {}) => el("path", { d, fill: "none", stroke: o.color || TINTA, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: o.op == null ? 0.7 : o.op }, par);
function achura(A, B, C, D, paso, sh = 0.55) {
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(2, Math.round(L / paso)); let d = "";
  for (let i = -Math.ceil(n * sh); i < n; i++) {
    const u = (i + 0.5) / n, t0 = Math.max(0, -u / sh), t1 = Math.min(1, (1 - u) / sh);
    if (t1 - t0 < 0.1) continue;
    const p = lerp(lerp(A, B, u + sh * t0), lerp(D, C, u + sh * t0), t0), q = lerp(lerp(A, B, u + sh * t1), lerp(D, C, u + sh * t1), t1);
    d += `M${n2(p[0])} ${n2(p[1])}L${n2(q[0])} ${n2(q[1])}`;
  }
  return d;
}
function nube(cx, cy, r, semilla) {
  const rr = rng(semilla), n = 6, pts = [];
  for (let i = 0; i < n; i++) { const an = i / n * 6.2832 + rr() * 0.4, q = r * (0.75 + rr() * 0.4); pts.push([cx + q * Math.cos(an) * 1.25, cy + q * Math.sin(an) * 0.85]); }
  let d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`;
  for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], ch = Math.hypot(p[0] - q[0], p[1] - q[1]) * 0.6; d += `A${n2(ch)} ${n2(ch)} 0 0 1 ${n2(p[0])} ${n2(p[1])}`; }
  return d + "Z";
}

export const tinta = { NS, TINTA, AZUL, CORAL, VERDE, PAPEL, GRIS, FINO, el, n1, n2, lerp, rng, wob, forma, circulo, redondo, det, achura, nube };
