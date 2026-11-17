/* Códice Vivo · escena del reto de la catapulta (estilo «tinta»).
   El dibujo es el de la composición del video (plantilla/videos/aplica-tiro-catapulta/compositions/escena.html):
   mismos ayudantes de trazo, suelo, castillo, muralla, trabuquete y piedra, con las mismas semillas.
   Lo que cambia para el juego: la puerta, la muralla y la colina van donde digan los números del nivel,
   la cámara es el viewBox (encuadra una caja en metros { x0, x1, y1, z }) y el movimiento usa ctx.anima del motor (sin GSAP).
   Si se retoca el dibujo en el video, hay que traer aquí el cambio a mano.

   Proyección: x (hacia el castillo) sube a la derecha, z (profundidad) baja a la derecha, y es la altura.
   1 m = 20 px. La piedra se dibuja 0.5 m arriba de su altura (su radio), igual que en el video.
   Medidas de notas y rayas en «u» = 1 % del ancho visible, para que se lean igual de cerca que de lejos. */
(function () {
  'use strict';
  const G = 10;
  const NS = "http://www.w3.org/2000/svg";
  const S = 20, OX = 230, OY = 1290, CX = 0.8660254 * S, CY = 0.5 * S;
  const P = (x, y = 0, z = 0) => [OX + CX * (x + z), OY - CY * x + CY * z - S * y];
  const TINTA = "#1d1a16", AZUL = "#1f3fa6", CORAL = "#e4572e", VERDE = "#1f8f5f", GRIS_N = "#6b7080", SOGA = "#d6b77c", SOGA_O = "#7a5a2c";
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; };
  const n1 = (v) => Math.round(v * 10) / 10, n2 = (v) => Math.round(v * 100) / 100;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const rad = (g) => g * Math.PI / 180;
  const rng = (semilla) => { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---------- Ayudantes de dibujo (del video, sin cambios) ---------- */
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
  /* Detalle fino (vetas, achurado, grietas): su grosor crece con el acercamiento. */
  const det = (par, d, w = 0.45, o = {}) => el("path", { d, fill: "none", stroke: o.color || TINTA, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: o.op == null ? 0.7 : o.op }, par);
  function vetas(A, B, C, D, n, semilla, nudo = true) {
    const r = rng(semilla); let d = "";
    for (let i = 0; i < n; i++) {
      const v = (i + 0.5 + (r() - 0.5) * 0.5) / n, a0 = r() * 0.3, a1 = 0.7 + r() * 0.3;
      d += wob([lerp(lerp(A, D, v), lerp(B, C, v), a0), lerp(lerp(A, D, v), lerp(B, C, v), a1)], semilla * 7 + i, { cerrado: false, amp: 0.3, paso: 7 });
    }
    if (nudo) { const v = 0.3 + r() * 0.4, u = 0.2 + r() * 0.6, c = lerp(lerp(A, D, v), lerp(B, C, v), u), rr = 0.7 + r() * 0.5; d += `M${n2(c[0] - rr * 1.7)} ${n2(c[1])}a${n2(rr * 1.7)} ${n2(rr)} 0 1 0 ${n2(rr * 3.4)} 0a${n2(rr * 1.7)} ${n2(rr)} 0 1 0 ${n2(-rr * 3.4)} 0M${n2(c[0] - rr * 0.6)} ${n2(c[1])}h${n2(rr * 1.2)}`; }
    return d;
  }
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
  /* Caja isométrica: cara izquierda (base), cara derecha (sombra, con achurado) y tapa (luz). */
  function caja(par, x0, y0, z0, x1, y1, z1, c, semilla, o = {}) {
    const g = el("g", {}, par);
    const I = [P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)], Dr = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], T = [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)];
    forma(g, I, c.i, semilla, o); forma(g, Dr, c.d, semilla + 1, o); forma(g, T, c.t, semilla + 2, o);
    if (o.achura) det(g, achura(Dr[0], Dr[1], Dr[2], Dr[3], o.achura), 0.4, { op: 0.5 });
    if (o.veta === "x") { det(g, vetas(T[0], T[1], T[2], T[3], 3, semilla + 3) + vetas(Dr[0], Dr[1], Dr[2], Dr[3], 2, semilla + 4, false)); const m = lerp(I[0], I[2], 0.5); det(g, [0.55, 0.3].map((f, i) => wob(I.map((p) => lerp(m, p, f)), semilla + 5 + i, { amp: 0.25, paso: 6 })).join("")); }
    if (o.veta === "y") { det(g, vetas(I[0], I[3], I[2], I[1], 3, semilla + 3) + vetas(Dr[0], Dr[3], Dr[2], Dr[1], 2, semilla + 4, false)); }
    return g;
  }
  function vigaPts(a, b, th) {
    const A = P(a[0], a[1], a[2] || 0), B = P(b[0], b[1], b[2] || 0), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * th, ny = dx / L * th;
    return [[A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], [B[0] - nx, B[1] - ny], [A[0] - nx, A[1] - ny]];
  }
  /* Sillares: hiladas, juntas alternadas, bloques con otro tono y grietas. */
  function sillaresM(par, m, y0, y1, a0, a1, alto, ancho, semilla) {
    const r = rng(semilla), filas = Math.round((y1 - y0) / alto); let lineas = "", claros = "", oscuros = "", grietas = "";
    for (let c = 0; c < filas; c++) {
      const ya = y0 + c * alto, yb = ya + alto;
      if (c) lineas += wob([m(ya, a0), m(ya, a1)], semilla + c, { cerrado: false, amp: 0.7 });
      let zs = [a0]; for (let z = a0 + (c % 2 ? ancho : ancho / 2); z < a1 - 0.2; z += ancho) zs.push(z); zs.push(a1);
      for (let i = 0; i < zs.length - 1; i++) {
        if (i) { const a = m(ya, zs[i]), b = m(yb, zs[i]); lineas += "M" + n2(a[0]) + " " + n2(a[1]) + "L" + n2(b[0] + r() - 0.5) + " " + n2(b[1]); }
        const q = "M" + [m(ya, zs[i]), m(ya, zs[i + 1]), m(yb, zs[i + 1]), m(yb, zs[i])].map((p) => n2(p[0]) + " " + n2(p[1])).join("L") + "Z", azar = r();
        if (azar < 0.22) oscuros += q; else if (azar > 0.8) claros += q;
        if (r() < 0.45) { const p = m(ya + alto * (0.25 + r() * 0.5), zs[i] + (zs[i + 1] - zs[i]) * (0.2 + r() * 0.6)); grietas += `M${n2(p[0])} ${n2(p[1])}l${n2(1.5 + r() * 2)} ${n2(1 + r())}l${n2(0.5 + r())} ${n2(-1.4 + r())}`; }
        if (r() < 0.5) { const p = m(ya + alto * (0.2 + r() * 0.6), zs[i] + (zs[i + 1] - zs[i]) * (0.2 + r() * 0.6)); grietas += `M${n2(p[0])} ${n2(p[1])}h0.6M${n2(p[0] + 1.6)} ${n2(p[1] + 1.1)}h0.6`; }
      }
    }
    el("path", { d: oscuros, fill: "rgba(70,45,30,.14)" }, par); el("path", { d: claros, fill: "rgba(255,255,255,.3)" }, par);
    el("path", { d: lineas, fill: "none", class: "ink fino", opacity: 0.8 }, par);
    det(par, grietas, 0.5, { op: 0.75 });
  }
  const sillares = (par, x, y0, y1, z0, z1, alto, ancho, semilla) => sillaresM(par, (y, z) => P(x, y, z), y0, y1, z0, z1, alto, ancho, semilla);
  function musgo(par, m, a0, a1, semilla, n = 6) {
    const r = rng(semilla); let d = "", puntos = "";
    for (let i = 0; i < n; i++) {
      const c = m(r() < 0.75 ? 0.15 + r() * 0.5 : 1.5 + r() * 3, a0 + (a1 - a0) * r()), rx = 3 + r() * 5, ry = 1.6 + r() * 2;
      d += wob(Array.from({ length: 8 }, (_, k) => [c[0] + rx * Math.cos(k * 0.7854), c[1] + ry * Math.sin(k * 0.7854)]), semilla + i, { amp: 0.5, paso: 4 });
      puntos += `M${n2(c[0] - rx * 0.4)} ${n2(c[1])}h0.5M${n2(c[0] + rx * 0.3)} ${n2(c[1] - ry * 0.3)}h0.5`;
    }
    el("path", { d, fill: "#86b35c", stroke: TINTA, "stroke-width": 0.5 }, par); det(par, puntos, 0.5, { color: "#3f6b2a", op: 0.9 });
  }
  /* Viga con volumen: de a = [x, y] a b = [x, y] en el plano z = zc. */
  function viga3Pts(a, b, zc, ha, hb, w) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, s = (-nx + ny) > 0 ? 1 : -1;
    const A1 = [a[0] + nx * ha * s, a[1] + ny * ha * s], B1 = [b[0] + nx * hb * s, b[1] + ny * hb * s], A2 = [a[0] - nx * ha * s, a[1] - ny * ha * s], B2 = [b[0] - nx * hb * s, b[1] - ny * hb * s];
    return { lat: [P(A1[0], A1[1], zc - w), P(B1[0], B1[1], zc - w), P(B1[0], B1[1], zc + w), P(A1[0], A1[1], zc + w)], fr: [P(A1[0], A1[1], zc + w), P(B1[0], B1[1], zc + w), P(B2[0], B2[1], zc + w), P(A2[0], A2[1], zc + w)], luz: s * ny > 0.55 };
  }
  function viga3(par, a, b, zc, h, w, c, semilla, liso) {
    const q = viga3Pts(a, b, zc, h, h, w), g = el("g", {}, par);
    forma(g, q.lat, q.luz ? c.t : c.i, semilla, FINO); forma(g, q.fr, c.d, semilla + 1, FINO);
    det(g, achura(q.fr[0], q.fr[1], q.fr[2], q.fr[3], 2.2), 0.4, { op: 0.5 });
    if (!liso) det(g, vetas(q.lat[0], q.lat[1], q.lat[2], q.lat[3], 2, semilla + 2) + vetas(q.fr[0], q.fr[1], q.fr[2], q.fr[3], 2, semilla + 3, false));
    return g;
  }
  const amarre3 = (par, a, b, f0, f1, zc, h, w, semilla) => {
    const u = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], q = viga3Pts(u(f0), u(f1), zc, h + 0.06, h + 0.06, w + 0.06);
    forma(par, q.lat, SOGA, semilla, FINO); forma(par, q.fr, "#b8955c", semilla + 1, FINO);
    det(par, achura(q.lat[0], q.lat[1], q.lat[2], q.lat[3], 1.4, 0.9) + achura(q.fr[0], q.fr[1], q.fr[2], q.fr[3], 1.4, 0.9), 0.55, { color: SOGA_O, op: 0.95 });
  };
  const pernos = (par, pts, r = 0.8) => el("path", { d: pts.map((p) => redondo(p[0], p[1], r)).join(""), fill: "#c9cbd2", stroke: TINTA, "stroke-width": 0.35 }, par);
  const herraje = (par, xy, z, semilla, bol) => { forma(par, xy.map((p) => P(p[0], p[1], z)), "#6f7178", semilla, FINO).setAttribute("class", "ink fino"); if (bol) pernos(par, bol.map((p) => P(p[0], p[1], z))); };
  const disco = (cx, cy, r, z, n = 16) => Array.from({ length: n }, (_, i) => P(cx + r * Math.cos(i / n * 6.2832), cy + r * Math.sin(i / n * 6.2832), z));
  function rueda(par, cx, r, z, semilla) {
    const g = el("g", {}, par);
    forma(g, disco(cx, r, r, z - 0.32), "#9a6a30", semilla, FINO);
    forma(g, disco(cx, r, r, z), "#c98f4a", semilla + 1, FINO);
    forma(g, disco(cx, r, r * 0.76, z), "#e6b877", semilla + 2, FINO).setAttribute("class", "ink fino");
    let rayos = ""; for (let i = 0; i < 4; i++) { const an = i * 0.7854 + 0.3, a = P(cx + r * 0.74 * Math.cos(an), r + r * 0.74 * Math.sin(an), z), b = P(cx - r * 0.74 * Math.cos(an), r - r * 0.74 * Math.sin(an), z); rayos += `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`; }
    det(g, rayos, 0.9, { op: 0.85 });
    const q = disco(cx, r, r, z); det(g, achura(q[9], q[13], q[1], q[5], 2.2, 0.4), 0.4, { op: 0.35 });
    forma(g, disco(cx, r, r * 0.24, z), "#6f7178", semilla + 3, FINO).setAttribute("class", "ink fino");
    pernos(g, [P(cx, r, z)], 0.7);
    return g;
  }
  function cono(par, cx, y0, cz, r, h, semilla) {
    const g = el("g", {}, par), E = (gr, f = 1, y = y0) => P(cx + r * f * Math.cos(rad(gr)), y, cz + r * f * Math.sin(rad(gr))), ap = P(cx, y0 + h, cz);
    const arco = (g0, g1, f, y) => { const pts = []; for (let i = 0; i <= 8; i++) pts.push(E(g0 + (g1 - g0) * i / 8, f, y)); return pts; };
    forma(g, [...arco(225, 45, 1, y0), ap], "#D2634A", semilla, FINO);
    el("path", { d: "M" + [...arco(135, 45, 1, y0), ap].map((p) => n2(p[0]) + " " + n2(p[1])).join("L") + "Z", fill: "#A5352A" }, g);
    el("path", { d: "M" + [...arco(225, 190, 1, y0), ap].map((p) => n2(p[0]) + " " + n2(p[1])).join("L") + "Z", fill: "#F4A680", opacity: 0.6 }, g);
    det(g, achura(E(135), E(45), ap, ap, 2.2, 0.3), 0.4, { op: 0.5 });
    let tejas = "";
    [0.26, 0.5, 0.72].forEach((f, k) => { const a = arco(225, 45, 1 - f, y0 + h * f); tejas += wob(a, semilla + 5 + k, { cerrado: false, amp: 0.3, paso: 5 }); a.forEach((p, i) => { if (i % 2 === k % 2 && i < 8) tejas += `M${n2(p[0])} ${n2(p[1])}l${n2((ap[0] - p[0]) * 0.16)} ${n2((ap[1] - p[1]) * 0.16)}`; }); });
    det(g, tejas, 0.5, { op: 0.8 });
    el("path", { d: wob([...arco(225, 45, 1, y0), ap], semilla, FINO), fill: "none", class: "ink" }, g);
    return { g, ap };
  }
  function nube(cx, cy, r, semilla) {
    const rr = rng(semilla), n = 6, pts = [];
    for (let i = 0; i < n; i++) { const an = i / n * 6.2832 + rr() * 0.4, q = r * (0.75 + rr() * 0.4); pts.push([cx + q * Math.cos(an) * 1.25, cy + q * Math.sin(an) * 0.85]); }
    let d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`;
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], ch = Math.hypot(p[0] - q[0], p[1] - q[1]) * 0.6; d += `A${n2(ch)} ${n2(ch)} 0 0 1 ${n2(p[0])} ${n2(p[1])}`; }
    return d + "Z";
  }
  const MADERA = { t: "#e6b877", i: "#c98f4a", d: "#9a6a30" };
  const MAD = { ...FINO, achura: 2.2 };
  const sombraQ = (par, q) => { const g = el("g", {}, par); el("path", { d: "M" + q.map((p) => n1(p[0]) + " " + n1(p[1])).join("L") + "Z", fill: "#8dbb63" }, g); det(g, achura(q[0], q[3], q[2], q[1], 3), 0.5, { color: "#3f6b2a", op: 0.5 }); return g; };

  /* --- Suelo: isla de pasto con matas, flores y el muro de ladrillo al fondo. Llega hasta x = X1.
         libre(x, z) dice dónde no poner matas (bajo las construcciones y el paso de la piedra). --- */
  function haceSuelo(suelo, X1, libre) {
    const largo = (X1 + 11) / 63;
    forma(suelo, [P(-11, 0, -9.6), P(-11, 0, 9), P(-11, -1.3, 9), P(-11, -1.3, -9.6)], "#c79a66", 11);
    forma(suelo, [P(-11, 0, 9), P(X1, 0, 9), P(X1, -1.3, 9), P(-11, -1.3, 9)], "#a87c4c", 12);
    det(suelo, achura(P(-11, 0, 9), P(X1, 0, 9), P(X1, -1.3, 9), P(-11, -1.3, 9), 4, 0.02), 0.5, { op: 0.4 });
    forma(suelo, [P(-11, 0, -9.6), P(X1, 0, -9.6), P(X1, 0, 9), P(-11, 0, 9)], "#a5cf7a", 13);
    const r = rng(41), ancho = X1 + 9;
    for (let i = 0; i < Math.round(12 * largo); i++) { const c = P(-9 + r() * (ancho - 3), 0, -7.5 + r() * 15); el("ellipse", { cx: n1(c[0]), cy: n1(c[1]), rx: n1(26 + r() * 30), ry: n1(9 + r() * 8), fill: "#b6dc8b", transform: `rotate(-30 ${n1(c[0])} ${n1(c[1])})` }, suelo); }
    sombraQ(suelo, [P(-6.8, 0, -2.4), P(3.2, 0, -2.4), P(3.2, 0, 2.4), P(-6.8, 0, 2.4)]);
    /* muro de ladrillo al fondo */
    const LAD = { t: "#eba283", i: "#b9583c", d: "#d67b5b" };
    caja(suelo, -11, 0, -9.6, X1, 3.2, -9, LAD, 20);
    let juntas = "", tonoA = "", tonoB = "";
    for (let c = 0; c < 4; c++) for (let x = -11 + (c % 2 ? 1 : 0); x < X1; x += 2) {
      const xb = Math.min(x + 2, X1), a = P(x, c * 0.8, -9), b = P(x, (c + 1) * 0.8, -9); juntas += "M" + n1(a[0]) + " " + n1(a[1]) + "L" + n1(b[0] + (r() - 0.5)) + " " + n1(b[1]);
      const q = "M" + [a, P(xb, c * 0.8, -9), P(xb, (c + 1) * 0.8, -9), b].map((p) => n1(p[0]) + " " + n1(p[1])).join("L") + "Z", azar = r();
      if (azar < 0.2) tonoA += q; else if (azar > 0.84) tonoB += q;
    }
    el("path", { d: tonoA, fill: "rgba(110,35,15,.2)" }, suelo); el("path", { d: tonoB, fill: "rgba(255,225,190,.28)" }, suelo);
    el("path", { d: juntas, fill: "none", class: "ink fino", opacity: 0.75 }, suelo);
    [0.8, 1.6, 2.4].forEach((y, i) => el("path", { d: wob([P(-11, y, -9), P(X1, y, -9)], 30 + i, { cerrado: false, amp: 0.9 }), fill: "none", class: "ink fino", opacity: 0.75 }, suelo));
    /* matas de pasto, piedritas y flores pequeñas */
    let matas = "", cuenta = 0;
    for (let i = 0; i < 900 * largo && cuenta < 130 * largo; i++) {
      const x = -10 + r() * (ancho - 0), z = -8.3 + r() * 16.6; if (!libre(x, z)) continue;
      const b = P(x, 0, z), h = 7 + r() * 7, hojas = 3 + Math.floor(r() * 3);
      for (let k = 0; k < hojas; k++) { const f = (k / (hojas - 1) - 0.5) * 2; matas += `M${n1(b[0] + f * 4)} ${n1(b[1] + Math.abs(f))}Q${n1(b[0] + f * 5)} ${n1(b[1] - h * 0.5)} ${n1(b[0] + f * (8 + r() * 4))} ${n1(b[1] - h * (1 - Math.abs(f) * 0.35))}`; }
      cuenta++;
    }
    el("path", { d: matas, fill: "none", class: "ink fino" }, suelo);
    let petalosA = "", petalosB = "", centros = "", tallos = "", guijarros = "";
    for (let i = 0, k = 0; i < 400 * largo && k < 38 * largo; i++) {
      const x = -10 + r() * ancho, z = -8.3 + r() * 16.6; if (!libre(x, z)) continue;
      const b = P(x, 0, z), c = [b[0], b[1] - 5 - r() * 3]; let p = "";
      for (let j = 0; j < 5; j++) p += redondo(c[0] + 2.1 * Math.cos(j * 1.2566), c[1] + 2.1 * Math.sin(j * 1.2566), 1.5);
      if (k % 2) petalosA += p; else petalosB += p;
      centros += redondo(c[0], c[1], 1.1); tallos += `M${n1(b[0])} ${n1(b[1])}L${n1(c[0])} ${n1(c[1] + 2)}`; k++;
    }
    for (let i = 0, k = 0; i < 200 * largo && k < 16 * largo; i++) { const x = -10 + r() * ancho, z = -8.3 + r() * 16.6; if (!libre(x, z)) continue; const b = P(x, 0, z); guijarros += wob(circulo(b[0], b[1], 1.6 + r() * 1.8, 9), 600 + i, { amp: 0.35, paso: 3 }); k++; }
    det(suelo, tallos, 0.7, { color: "#3f6b2a", op: 1 });
    el("path", { d: petalosA, fill: "#fffdf6", stroke: TINTA, "stroke-width": 0.35 }, suelo); el("path", { d: petalosB, fill: "#ffd0e0", stroke: TINTA, "stroke-width": 0.35 }, suelo);
    el("path", { d: centros, fill: "#f2b632" }, suelo);
    el("path", { d: guijarros, fill: "#cfc8ba", stroke: TINTA, "stroke-width": 0.6 }, suelo);
  }

  /* --- Castillo (del video): se dibuja una vez con la puerta en x = 40 y el juego lo desplaza. --- */
  const X_CAST = 40;
  function haceCastillo(cast) {
    const ARENISCA = { t: "#F8D9A0", i: "#E6BE88", d: "#B48A68" };
    sombraQ(cast, [P(45, 0, -5.4), P(51, 0, -5.4), P(51, 0, 5.6), P(41.5, 0, 5.6)]);
    const banderin = (par, pie, semilla) => { const punta = [pie[0], pie[1] - 34]; el("path", { d: `M${n2(pie[0])} ${n2(pie[1])}L${n2(punta[0])} ${n2(punta[1])}`, fill: "none", class: "ink" }, par); forma(par, [punta, [punta[0] + 20, punta[1] + 3], [punta[0] + 40, punta[1] + 9], [punta[0] + 22, punta[1] + 13], [punta[0], punta[1] + 20]], "#D2634A", semilla, FINO); };
    const tronera = (par, x, y, z, semilla) => { forma(par, [P(x, y, z - 0.16), P(x, y, z + 0.16), P(x, y + 1.3, z + 0.16), P(x, y + 1.55, z), P(x, y + 1.3, z - 0.16)], "#453848", semilla, FINO).setAttribute("class", "ink fino"); };
    const ventana = (par, x, y, z, semilla) => { forma(par, [P(x, y, z - 0.5), P(x, y, z + 0.5), P(x, y + 1.1, z + 0.5), P(x, y + 1.6, z), P(x, y + 1.1, z - 0.5)], "#FFD877", semilla, FINO); const a = P(x, y, z), b = P(x, y + 1.55, z), c = P(x, y + 0.8, z - 0.5), d = P(x, y + 0.8, z + 0.5); det(par, `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}M${n2(c[0])} ${n2(c[1])}L${n2(d[0])} ${n2(d[1])}`, 0.6, { op: 0.9 }); forma(par, [P(x, y - 0.18, z - 0.65), P(x, y - 0.18, z + 0.65), P(x, y, z + 0.65), P(x, y, z - 0.65)], ARENISCA.t, semilla + 1, FINO).setAttribute("class", "ink fino"); };
    const cCuerpo = caja(cast, 40, 0, -4, 45, 8, 4, ARENISCA, 50, { achura: 3 });
    sillares(cCuerpo, 40, 0, 8, -4, 4, 1, 1.25, 51);
    sillaresM(cCuerpo, (y, x) => P(x, y, 4), 0, 8, 40, 45, 1, 1.25, 52);
    ventana(cCuerpo, 40, 5.2, -2.3, 53); ventana(cCuerpo, 40, 5.2, 2.3, 55); tronera(cCuerpo, 40, 5.3, 0, 57);
    musgo(cCuerpo, (y, z) => P(40, y, z), -3.2, 3.2, 58, 7);
    const cAlmenas = el("g", {}, cast);
    [-3.1, -1.7, -0.45, 0.8, 2.2].forEach((z, i) => caja(cAlmenas, 40, 8, z, 40.9, 8.9, z + 0.85, ARENISCA, 60 + i * 3, { ...FINO, achura: 2.2 }));
    const torre = (z0, semilla) => {
      const g = el("g", {}, cast), z1 = z0 + 2.2, zc = z0 + 1.1;
      caja(g, 39.3, 0, z0, 41.5, 12, z1, ARENISCA, semilla, { achura: 2.6 });
      sillares(g, 39.3, 0, 12, z0, z1, 1, 0.75, semilla + 3);
      sillaresM(g, (y, x) => P(x, y, z1), 0, 12, 39.3, 41.5, 1, 0.75, semilla + 4);
      tronera(g, 39.3, 4.4, zc, semilla + 5); tronera(g, 39.3, 8.6, zc, semilla + 6);
      musgo(g, (y, z) => P(39.3, y, z), z0, z1, semilla + 7, 3);
      caja(g, 39.1, 12, z0 - 0.2, 41.7, 12.7, z1 + 0.2, ARENISCA, semilla + 8, { ...FINO, achura: 2 });
      const c = cono(g, 40.4, 12.7, zc, 1.75, 4.3, semilla + 12);
      banderin(g, c.ap, semilla + 30);
      return g;
    };
    torre(-5.4, 80);
    /* portón de madera con herrajes y remaches, y antorchas a los lados */
    const cPuerta = el("g", {}, cast);
    const arcoPuerta = (m, alto) => [P(40, 0, -m), P(40, alto - 1.1, -m), P(40, alto - 0.35, -m * 0.62), P(40, alto, 0), P(40, alto - 0.35, m * 0.62), P(40, alto - 1.1, m), P(40, 0, m)];
    const ptsPuerta = arcoPuerta(1.45, 3.9);
    forma(cPuerta, arcoPuerta(1.85, 4.4), "#DDB07A", 69, FINO);
    { let dov = ""; arcoPuerta(1.85, 4.4).forEach((p, i) => { const q = ptsPuerta[i]; dov += `M${n2(p[0])} ${n2(p[1])}L${n2(q[0])} ${n2(q[1])}`; }); [1, 2].forEach((y) => [-1, 1].forEach((s) => { const a = P(40, y, 1.45 * s), b = P(40, y, 1.85 * s); dov += `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`; })); det(cPuerta, dov, 0.6, { op: 0.85 }); }
    forma(cPuerta, ptsPuerta, "#8a5a34", 70, FINO);
    el("path", { d: [-0.95, -0.47, 0, 0.47, 0.95].map((z) => { const a = P(40, 0.05, z), b = P(40, 3.85 - Math.abs(z) * 0.75, z); return "M" + n2(a[0]) + " " + n2(a[1]) + "L" + n2(b[0]) + " " + n2(b[1]); }).join(""), fill: "none", class: "ink fino", opacity: 0.85 }, cPuerta);
    det(cPuerta, vetas(P(40, 0.1, -1.4), P(40, 2.7, -1.4), P(40, 2.7, -0.5), P(40, 0.1, -0.5), 3, 73) + vetas(P(40, 0.1, 0.5), P(40, 2.7, 0.5), P(40, 2.7, 1.4), P(40, 0.1, 1.4), 3, 74), 0.45);
    [0.75, 2.35].forEach((y, i) => { forma(cPuerta, [P(40, y, -1.42), P(40, y, 1.42), P(40, y + 0.34, 1.42), P(40, y + 0.34, -1.42)], "#5d5f66", 71 + i, FINO).setAttribute("class", "ink fino"); pernos(cPuerta, [-1.15, -0.7, -0.24, 0.24, 0.7, 1.15].map((z) => P(40, y + 0.17, z)), 0.75); });
    el("path", { d: redondo(P(40, 1.65, 0.3)[0], P(40, 1.65, 0.3)[1], 1.5), fill: "none", stroke: TINTA, "stroke-width": 0.7 }, cPuerta);
    const cBrillo = el("path", { d: wob(ptsPuerta, 70, FINO), fill: "none", stroke: "#ffcf33", "stroke-width": 11, "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke", opacity: 0 }, cPuerta);
    [-2.45, 2.45].forEach((z) => {
      const a = P(40, 2.9, z), b = P(39.72, 3.75, z), g = el("g", {}, cPuerta);
      el("path", { d: `M${n2(P(40, 3.1, z)[0])} ${n2(P(40, 3.1, z)[1])}L${n2((a[0] + b[0]) / 2)} ${n2((a[1] + b[1]) / 2)}`, fill: "none", stroke: TINTA, "stroke-width": 0.9 }, g);
      el("path", { d: `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`, fill: "none", stroke: TINTA, "stroke-width": 2.6, "stroke-linecap": "round" }, g);
      el("path", { d: `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`, fill: "none", stroke: "#9a6a30", "stroke-width": 1.5, "stroke-linecap": "round" }, g);
      el("path", { d: `M${n2(b[0])} ${n2(b[1] + 1)}c-5.5 -3 -4 -8 -0.5 -12.5c0.6 3 4.4 4 4 8.5c-0.2 2.2 -1.6 3.4 -3.5 4z`, fill: "#f08a24", stroke: TINTA, "stroke-width": 0.7, "stroke-linejoin": "round" }, g);
      el("path", { d: `M${n2(b[0])} ${n2(b[1])}c-2.4 -1.6 -1.8 -4 -0.2 -6.2c0.4 1.8 2.2 2.2 1.8 4.4c-0.2 1 -0.8 1.5 -1.6 1.8z`, fill: "#ffe27a" }, g);
    });
    torre(3.2, 90);
    return cBrillo;
  }

  /* --- Muralla (del video): `alto` hasta lo alto de las almenas, centrada en x, de 1 m de grueso. --- */
  function haceMuralla(mur, x, alto) {
    const GRIS = { t: "#ddd6c8", i: "#bdb5a6", d: "#8f8778" }, xa = x - 0.5, xb = x + 0.5, cuerpo = Math.max(0.2, alto - 0.8);
    sombraQ(mur, [P(xb, 0, -4.5), P(xb + 3.1, 0, -4.5), P(xb + 3.1, 0, 4.5), P(xb, 0, 4.5)]);
    const mCaja = caja(mur, xa, 0, -4.5, xb, cuerpo, 4.5, GRIS, 100, { achura: 2.6 });
    sillares(mCaja, xa, 0, cuerpo, -4.5, 4.5, 1.3, 1.5, 104);
    sillaresM(mCaja, (y, xx) => P(xx, y, 4.5), 0, cuerpo, xa, xb, 1.3, 0.5, 105);
    musgo(mCaja, (y, z) => P(xa, Math.min(y, cuerpo * 0.8), z), -4.3, 4.3, 106, 8);
    [-4.5, -2.5, -0.5, 1.5, 3.5].forEach((z, i) => { const g = caja(mur, xa, cuerpo, z, xb, alto, z + 1, GRIS, 110 + i * 3, { ...FINO, achura: 2.2 }); const a = P(xa, alto - 0.4, z), b = P(xa, alto - 0.4, z + 1); det(g, `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}M${n2(a[0] + 3)} ${n2(a[1] + 4)}h0.6M${n2(b[0] - 4)} ${n2(b[1] - 3)}h0.6`, 0.5, { op: 0.7 }); });
  }

  /* --- Colina (solo en el juego): meseta de tierra con pasto arriba; el castillo se sube a ella. --- */
  function haceColina(par, x0, x1, h) {
    const TIERRA = { t: "#a5cf7a", i: "#c79a66", d: "#a87c4c" };
    const g = caja(par, x0, 0, -7.5, x1, h, 7.5, TIERRA, 300, { achura: 4 });
    let estratos = "";
    for (let y = 1; y < h; y += 1.4) estratos += wob([P(x0, y, -7.5), P(x0, y + 0.15, 7.5)], 310 + Math.round(y * 10), { cerrado: false, amp: 1.4, paso: 22 });
    el("path", { d: estratos, fill: "none", class: "ink fino", opacity: 0.45 }, g);
    const r = rng(320); let matas = "";
    for (let i = 0; i < 26; i++) { const b = P(x0 + 0.3 + r() * 2.2, h, -7 + r() * 14), a = 7 + r() * 6; for (let k = -1; k <= 1; k++) matas += `M${n1(b[0] + k * 4)} ${n1(b[1])}Q${n1(b[0] + k * 5)} ${n1(b[1] - a * 0.5)} ${n1(b[0] + k * 9)} ${n1(b[1] - a * (1 - Math.abs(k) * 0.35))}`; }
    el("path", { d: matas, fill: "none", class: "ink fino" }, g);
  }

  /* ---------- La escena ---------- */
  function crea(cont, ctx) {
    const svg = el("svg", { class: "esc", role: "img", "aria-label": "Dibujo a tinta: un trabuquete a la izquierda y, a lo lejos, el castillo con su puerta." }, cont);
    const mundo = el("g", {}, svg);
    const gSuelo = el("g", {}, mundo), gColina = el("g", {}, mundo), gCotas = el("g", {}, mundo), gCastT = el("g", {}, mundo), gMur = el("g", {}, mundo),
      gRastros = el("g", {}, mundo), gTreb = el("g", {}, mundo), gVuelo = el("g", {}, mundo), gPolvo = el("g", {}, mundo), gNotas = el("g", {}, mundo), gApunte = el("g", {}, mundo);
    const cBrillo = haceCastillo(gCastT);

    /* --- Trabuquete (del video): vigas de sección cuadrada, herrajes, ruedas y contrapeso de tablones --- */
    const treb = gTreb, PIV2 = [-3, 6.6], L2 = 7, C2 = 2.4, ZL = 1.5, PIE_A = [-5.6, 1.2], PIE_B = [-0.4, 1.2];
    const lado = (z, semilla) => {
      const g = el("g", {}, treb), zf = z + 0.33;
      if (z < 0) { rueda(g, -5.2, 0.85, z - 0.45, semilla + 40); rueda(g, -0.8, 0.85, z - 0.45, semilla + 45); }
      caja(g, -6.5, 0.5, z - 0.35, 0.5, 1.2, z + 0.35, MADERA, semilla, { ...MAD, veta: "x" });
      pernos(g, [-6.1, -5.1, -0.9, 0.1].map((x) => P(x, 0.85, z + 0.35)), 0.8);
      viga3(g, PIE_A, PIV2, z, 0.3, 0.3, MADERA, semilla + 4); viga3(g, PIE_B, PIV2, z, 0.3, 0.3, MADERA, semilla + 8);
      viga3(g, [-4.75, 3], [-1.25, 3], z, 0.2, 0.26, MADERA, semilla + 12);
      amarre3(g, PIE_A, PIV2, 0.29, 0.37, z, 0.3, 0.3, semilla + 16); amarre3(g, PIE_B, PIV2, 0.29, 0.37, z, 0.3, 0.3, semilla + 18);
      amarre3(g, PIE_A, PIV2, 0.8, 0.86, z, 0.3, 0.3, semilla + 20); amarre3(g, PIE_B, PIV2, 0.8, 0.86, z, 0.3, 0.3, semilla + 22);
      herraje(g, [[-6.15, 1.22], [-5.05, 1.22], [-4.9, 1.95], [-5.6, 1.95]], zf, semilla + 24, [[-5.85, 1.45], [-5.3, 1.45], [-5.25, 1.8]]);
      herraje(g, [[0.15, 1.22], [-0.95, 1.22], [-1.1, 1.95], [-0.4, 1.95]], zf, semilla + 25, [[-0.15, 1.45], [-0.7, 1.45], [-0.75, 1.8]]);
      herraje(g, [[-3.65, 5.65], [-2.35, 5.65], [-2.62, 6.95], [-3.38, 6.95]], zf, semilla + 26, [[-3.4, 5.85], [-2.6, 5.85]]);
      forma(g, disco(PIV2[0], PIV2[1], 0.5, zf + 0.02), "#8d8f96", semilla + 27, FINO).setAttribute("class", "ink fino");
      forma(g, disco(PIV2[0], PIV2[1], 0.22, zf + 0.02, 10), "#3a3b40", semilla + 28, FINO).setAttribute("class", "ink fino");
      if (z > 0) { rueda(g, -5.2, 0.85, z + 0.78, semilla + 40); rueda(g, -0.8, 0.85, z + 0.78, semilla + 45); }
      return g;
    };
    lado(-ZL, 150);
    const tCruz = el("g", {}, treb);
    caja(tCruz, -6.3, 0.55, -ZL, -5.75, 1.15, ZL, MADERA, 200, { ...MAD });
    caja(tCruz, -0.25, 0.55, -ZL, 0.3, 1.15, ZL, MADERA, 205, { ...MAD });
    const tBrazoG = el("g", {}, treb);
    { const q = vigaPts([PIV2[0], PIV2[1], -ZL], [PIV2[0], PIV2[1], ZL], 3.6); forma(tBrazoG, q, "#6f7178", 160, FINO); det(tBrazoG, achura(q[0], q[1], q[2], q[3], 1.8, 0.5), 0.4, { op: 0.5 }); }
    const tHonda = [el("path", { fill: "none", stroke: TINTA, "stroke-width": 2.6, "stroke-linecap": "round" }, tBrazoG), el("path", { fill: "none", stroke: SOGA, "stroke-width": 1.5, "stroke-linecap": "round" }, tBrazoG), el("path", { fill: "none", stroke: SOGA_O, "stroke-width": 1.5, "stroke-dasharray": "0.8 1.6", opacity: 0.9 }, tBrazoG)];
    const tBolsaT = el("g", {}, tBrazoG);
    forma(tBolsaT, [[-17, -4], [-16, 8], [-8, 15], [0, 17], [8, 15], [16, 8], [17, -4], [9, 5], [0, 7], [-9, 5]], "#8a5a34", 166, FINO);
    det(tBolsaT, "M-14 2l1.5 1.2M-11 8l1.5 1M-5 12.5l1.2 0.6M5 12.5l-1.2 0.6M11 8l-1.5 1M14 2l-1.5 1.2M-13 6q13 9 26 0", 0.5, { op: 0.8 });
    pernos(tBolsaT, [[-16.5, -3], [16.5, -3]], 1.3);
    const tBrazoL = el("path", { fill: MADERA.i, class: "ink" }, tBrazoG), tBrazo = el("path", { fill: MADERA.d, class: "ink" }, tBrazoG), tBrazoV = det(tBrazoG, ""), tBrazoA = det(tBrazoG, "", 0.4, { op: 0.5 });
    const tAmarre = el("path", { fill: SOGA, class: "ink" }, tBrazoG), tAmarreL = det(tBrazoG, "", 0.55, { color: SOGA_O, op: 0.95 });
    forma(tBrazoG, disco(PIV2[0], PIV2[1], 0.5, 0.27), "#8d8f96", 167, FINO).setAttribute("class", "ink fino");
    forma(tBrazoG, disco(PIV2[0], PIV2[1], 0.2, 0.27, 10), "#3a3b40", 168, FINO).setAttribute("class", "ink fino");
    pernos(tBrazoG, [0, 1, 2, 3].map((i) => P(PIV2[0] + 0.36 * Math.cos(i * 1.5708 + 0.5), PIV2[1] + 0.36 * Math.sin(i * 1.5708 + 0.5), 0.27)), 0.55);
    const tPesoG = el("g", {}, treb), tCadena = el("path", { fill: "none", stroke: TINTA, "stroke-width": 2 }, tPesoG), tCadena2 = el("path", { fill: "none", stroke: "#a3a5ac", "stroke-width": 0.85 }, tPesoG), tPesoT = el("g", {}, tPesoG);
    {
      const X0 = -1.15, X1 = 1.15, Z0 = -1.05, Z1 = 1.05, Y0 = -3.2, Y1 = -0.9, r = rng(171);
      const roca = (x, y, z, rr, semilla) => { const c = P(x, y, z); forma(tPesoT, circulo(c[0], c[1], rr, 9), ["#aaa59b", "#bdb8ad", "#948f85"][semilla % 3], semilla, { amp: 0.7, paso: 5 }).setAttribute("class", "ink fino"); det(tPesoT, `M${n2(c[0] - rr * 0.5)} ${n2(c[1] - rr * 0.2)}l${n2(rr * 0.4)} ${n2(rr * 0.3)}M${n2(c[0] + rr * 0.1)} ${n2(c[1] + rr * 0.3)}l${n2(rr * 0.4)} ${n2(-rr * 0.2)}` + achura([c[0] - rr * 0.8, c[1] + rr * 0.3], [c[0] + rr * 0.6, c[1] + rr * 0.6], [c[0] + rr * 0.5, c[1] + rr * 0.9], [c[0] - rr * 0.5, c[1] + rr * 0.7], 1.6, 0.4), 0.45, { op: 0.7 }); };
      [[0.5, -0.4], [-0.5, -0.6], [0.1, 0.5]].forEach((p, i) => roca(p[0], Y1 + 0.35, p[1], 9 + r() * 3, 172 + i));
      caja(tPesoT, X0, Y0, Z0, X1, Y1, Z1, MADERA, 170, { ...FINO, achura: 2 });
      let tablas = "";
      [-0.35, 0.35].forEach((z) => { const a = P(X0, Y0, z), b = P(X0, Y1, z); tablas += `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`; });
      [-0.4, 0.4].forEach((x) => { const a = P(x, Y0, Z1), b = P(x, Y1, Z1); tablas += `M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`; });
      el("path", { d: tablas, fill: "none", class: "ink fino", opacity: 0.85 }, tPesoT);
      det(tPesoT, vetas(P(X0, Y0, Z0), P(X0, Y1, Z0), P(X0, Y1, Z1), P(X0, Y0, Z1), 5, 176) + vetas(P(X0, Y0, Z1), P(X0, Y1, Z1), P(X1, Y1, Z1), P(X1, Y0, Z1), 4, 177));
      forma(tPesoT, [P(X0 + 0.2, Y1, Z0 + 0.2), P(X1 - 0.2, Y1, Z0 + 0.2), P(X1 - 0.2, Y1, Z1 - 0.2), P(X0 + 0.2, Y1, Z1 - 0.2)], "#5e4326", 178, FINO).setAttribute("class", "ink fino");
      [[-0.55, 0.45], [0.45, 0.35], [-0.1, -0.2], [0.55, -0.5], [-0.6, -0.55]].forEach((p, i) => roca(p[0], Y1 + 0.18, p[1], 7.5 + r() * 3, 180 + i));
      [-1.5, -2.85].forEach((y, i) => {
        forma(tPesoT, [P(X0, y, Z0), P(X0, y, Z1), P(X0, y + 0.3, Z1), P(X0, y + 0.3, Z0)], "#6f7178", 186 + i * 2, FINO).setAttribute("class", "ink fino");
        forma(tPesoT, [P(X0, y, Z1), P(X1, y, Z1), P(X1, y + 0.3, Z1), P(X0, y + 0.3, Z1)], "#52545a", 187 + i * 2, FINO).setAttribute("class", "ink fino");
        pernos(tPesoT, [-0.75, -0.1, 0.6].map((z) => P(X0, y + 0.15, z)).concat([-0.7, 0, 0.7].map((x) => P(x, y + 0.15, Z1))), 0.75);
      });
      const a = P(0, Y1 + 0.75, 0); el("path", { d: `M${n2(a[0] - 4.5)} ${n2(a[1] + 9)}Q${n2(a[0] - 5)} ${n2(a[1] - 3)} ${n2(a[0])} ${n2(a[1] - 3)}Q${n2(a[0] + 5)} ${n2(a[1] - 3)} ${n2(a[0] + 4.5)} ${n2(a[1] + 9)}`, fill: "none", stroke: TINTA, "stroke-width": 2.2, "stroke-linecap": "round" }, tPesoT);
      el("path", { d: `M${n2(a[0] - 4.5)} ${n2(a[1] + 9)}Q${n2(a[0] - 5)} ${n2(a[1] - 3)} ${n2(a[0])} ${n2(a[1] - 3)}Q${n2(a[0] + 5)} ${n2(a[1] - 3)} ${n2(a[0] + 4.5)} ${n2(a[1] + 9)}`, fill: "none", stroke: "#a3a5ac", "stroke-width": 1 }, tPesoT);
    }
    lado(ZL, 180);

    /* --- Piedra, su sombra y el rastro punteado --- */
    const viejos = el("g", { opacity: 0.4 }, gRastros);
    const rastro = el("path", { fill: "none", stroke: TINTA, "stroke-linecap": "round" }, gRastros);
    const sombra = el("ellipse", { rx: 13, ry: 6, fill: "rgba(29,26,22,.22)" }, gVuelo);
    const piedraT = el("g", {}, gVuelo), piedra = el("g", {}, piedraT);
    forma(piedra, circulo(0, 0, 13.5), "#aaa59b", 190, FINO);
    el("path", { d: "M-10 2Q-3 13 10 4Q4 9 -10 2Z", fill: "#7f7a70" }, piedra);
    el("path", { d: "M-7 -8Q-1 -12 5 -9Q0 -9.5 -7 -8Z", fill: "#c9c4ba" }, piedra);
    det(piedra, "M-6 -3l3 2l-1 3M4 -5l2 3l3 0M-2 5l3 1M7 2l1.5 2M-9 -1h1M1 -1h0.8" + achura([-11, 3], [9, 9], [8, 12], [-8, 9], 2, 0.4), 0.5, { op: 0.75 });
    const fVx = el("path", { fill: CORAL, stroke: CORAL, "stroke-linejoin": "round", opacity: 0 }, gVuelo), fVy = el("path", { fill: VERDE, stroke: VERDE, "stroke-linejoin": "round", opacity: 0 }, gVuelo);

    /* ---------- Estado ---------- */
    const e = { a2: 220, peso: 0, sx: -7.2, sy: 0, honda: 1 };
    let lugar = { D: X_CAST, h: 0, borde: 1e9, muralla: null };   // lo que hay en el nivel
    let vista = { x: 0, y: 0, w: 1080, h: 864 }, cajaActual = { x0: -9, x1: 14, y1: 12 }, escalables = [];
    const u = () => vista.w / 100;
    const piso = (x) => (lugar.h && x >= lugar.borde ? lugar.h : 0);
    const camino = (f, hasta) => { if (hasta <= 0) return ""; let d = ""; for (let t = 0; ; t += 0.04) { const tt = Math.min(t, hasta), w = f(tt), p = P(w[0], w[1] + 0.5); d += (d ? "L" : "M") + n1(p[0]) + " " + n1(p[1]); if (tt >= hasta) break; } return d; };

    /* Brazo, cadena, honda y piedra (del video). */
    function dibuja() {
      const b = rad(e.a2), cb = Math.cos(b), sb = Math.sin(b), en2 = (f) => [PIV2[0] + L2 * f * cb, PIV2[1] + L2 * f * sb], p2 = en2(1), q2 = [PIV2[0] - C2 * cb, PIV2[1] - C2 * sb];
      const qb = viga3Pts(q2, p2, 0, 0.4, 0.15, 0.24);
      tBrazoL.setAttribute("d", wob(qb.lat, 161, FINO)); tBrazoL.setAttribute("fill", qb.luz ? MADERA.t : MADERA.i);
      tBrazo.setAttribute("d", wob(qb.fr, 162, FINO));
      tBrazoV.setAttribute("d", vetas(qb.lat[0], qb.lat[1], qb.lat[2], qb.lat[3], 2, 163) + vetas(qb.fr[0], qb.fr[1], qb.fr[2], qb.fr[3], 3, 164));
      tBrazoA.setAttribute("d", achura(qb.fr[0], qb.fr[1], qb.fr[2], qb.fr[3], 2.2));
      const m2 = viga3Pts(en2(0.9), en2(0.95), 0, 0.22, 0.2, 0.29), m3 = viga3Pts(en2(-0.26), en2(-0.31), 0, 0.44, 0.45, 0.29);
      tAmarre.setAttribute("d", wob(m2.lat, 165, FINO) + wob(m2.fr, 166, FINO) + wob(m3.lat, 167, FINO) + wob(m3.fr, 168, FINO));
      tAmarreL.setAttribute("d", [m2.lat, m2.fr, m3.lat, m3.fr].map((q) => achura(q[0], q[1], q[2], q[3], 1.4, 0.9)).join(""));
      const h0 = P(q2[0], q2[1], 0.1), h1 = P(q2[0] + e.peso * 0.5, q2[1] - 1.05, 0.1), o = P(0, 0), ux = h1[0] - h0[0], uy = h1[1] - h0[1], lc = Math.hypot(ux, uy) || 1, ang = n1(Math.atan2(uy, ux) * 57.2958), N = 5, ra = lc / N * 0.78;
      let cad = "";
      for (let i = 0; i < N; i++) { const m = lerp(h0, h1, (i + 0.5) / N), rb = i % 2 ? 0.7 : 2.1, x0 = n2(m[0] - ux / lc * ra), y0 = n2(m[1] - uy / lc * ra), x1 = n2(m[0] + ux / lc * ra), y1 = n2(m[1] + uy / lc * ra); cad += `M${x0} ${y0}A${n2(ra)} ${rb} ${ang} 1 0 ${x1} ${y1}A${n2(ra)} ${rb} ${ang} 1 0 ${x0} ${y0}`; }
      tCadena.setAttribute("d", cad); tCadena2.setAttribute("d", cad);
      tPesoT.setAttribute("transform", `translate(${n1(h1[0] - o[0])} ${n1(h1[1] - o[1])})`);
      const s = P(e.sx, e.sy + 0.5), s0 = P(e.sx, piso(e.sx)), t2 = P(p2[0], p2[1]), suelta = e.honda <= 0.5;
      const bolsa = suelta ? [t2[0] - cb * 6, t2[1] + 34] : s;
      const cuerda = (dx) => `M${n1(t2[0])} ${n1(t2[1])}Q${n1((t2[0] + bolsa[0] + dx) / 2 + (suelta ? dx * 0.2 : 0))} ${n1((t2[1] + bolsa[1]) / 2 + (suelta ? 0 : 7))} ${n1(bolsa[0] + dx)} ${n1(bolsa[1] - 3)}`;
      const dh = cuerda(-16.5) + cuerda(16.5);
      tHonda.forEach((p) => p.setAttribute("d", dh));
      tBolsaT.setAttribute("transform", `translate(${n1(bolsa[0])} ${n1(bolsa[1])})` + (suelta ? " scale(0.8 1)" : ""));
      /* de lejos la piedra se dibuja más grande para que no se pierda */
      const k = suelta ? Math.max(1, vista.w / 1300) : 1;
      piedraT.setAttribute("transform", `translate(${n1(s[0])} ${n1(s[1])}) scale(${n2(k)})`);
      sombra.setAttribute("cx", n1(s0[0])); sombra.setAttribute("cy", n1(s0[1] + 3)); sombra.setAttribute("rx", n1(13 * k)); sombra.setAttribute("ry", n1(6 * k));
      sombra.setAttribute("opacity", e.sy > piso(e.sx) + 0.35 ? 1 : 0);
      /* detrás de la muralla, la piedra se dibuja antes que ella */
      const atras = !!lugar.muralla && e.sx > lugar.muralla.x + 0.5;
      if (atras !== (gVuelo.nextSibling === gMur)) mundo.insertBefore(gVuelo, atras ? gMur : gPolvo);
    }

    /* ---------- Cámara: el viewBox encuadra una caja en metros { x0, x1, y1 } ---------- */
    function cajaDe(c) {
      const z = c.z || 6, pts = [P(c.x0, -1.3, z), P(c.x0, 0, -z), P(c.x0, c.y1, 0), P(c.x1, 0, z), P(c.x1, c.y1, -z), P(c.x1, -1.3, z)];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pts.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      let w = (x1 - x0) * 1.06, h = (y1 - y0) * 1.06; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const asp = cont.clientWidth && cont.clientHeight ? cont.clientWidth / cont.clientHeight : 1.25;
      if (w / h < asp) w = h * asp; else h = w / asp;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    }
    /* pone el tamaño de una nota o raya según el ancho visible */
    function mide(q) {
      const uu = u();
      if (q.letra) { q.el.setAttribute("font-size", n2(q.letra * uu)); q.el.setAttribute("stroke-width", n2(q.letra * uu * 0.24)); }
      if (q.raya) q.el.setAttribute("stroke-width", n2(q.raya * uu));
      if (q.puntos) q.el.setAttribute("stroke-dasharray", q.puntos.map((p) => n2(p * uu)).join(" "));
    }
    function ponVista(v) {
      vista = v;
      svg.setAttribute("viewBox", `${n1(v.x)} ${n1(v.y)} ${n1(v.w)} ${n1(v.h)}`);
      /* de lejos, el contorno de tinta se adelgaza para que el dibujo no se empaste (ver estilos.css) */
      svg.style.setProperty("--k", n2(Math.max(0.4, Math.min(1, 800 / v.w))));
      escalables = escalables.filter((q) => q.fijo || q.el.isConnected);
      escalables.forEach(mide);
      dibuja();
    }
    const escala = (elem, q) => { const r = { el: elem, ...q }; escalables.push(r); mide(r); return elem; };
    escala(rastro, { raya: 0.9, puntos: [0.01, 2.2], fijo: true });
    function encuadra(c, dur = 0.6) {
      cajaActual = c;
      const a = vista, b = cajaDe(c);
      return ctx.anima(dur, (k) => ponVista({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k }), "suave");
    }
    if ("ResizeObserver" in window) new ResizeObserver(() => ponVista(cajaDe(cajaActual))).observe(cont);

    /* ---------- Notas a mano (Caveat), rayas, flechas y cotas ---------- */
    /* texto anclado a un punto en px; dx y dy en «em» para que acompañen al tamaño */
    function texto(par, p, str, o = {}) {
      const g = el("g", o.rot ? { transform: `rotate(${o.rot} ${n1(p[0])} ${n1(p[1])})` } : {}, par);
      const t = el("text", { x: n1(p[0]), y: n1(p[1]), dx: (o.dx || 0) + "em", dy: (o.dy || 0) + "em", "text-anchor": o.anc || "start", class: "nota", fill: o.color || AZUL }, g);
      t.textContent = str;
      escala(t, { letra: o.f || 4.4 });
      return g;
    }
    const raya = (par, d, color, w = 0.7, puntos) => { const p = el("path", { d, fill: "none", stroke: color, "stroke-linecap": "round", "stroke-linejoin": "round" }, par); return escala(p, { raya: w, puntos }); };
    const dLinea = (a, b) => `M${n1(a[0])} ${n1(a[1])}L${n1(b[0])} ${n1(b[1])}`;
    /* flecha de a → b: raya + punta (un solo path relleno) */
    function dFlecha(a, b, h) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (L < h * 0.6) return "";
      const ux = dx / L, uy = dy / L;
      return `M${n1(a[0])} ${n1(a[1])}L${n1(b[0] - ux * h * 0.6)} ${n1(b[1] - uy * h * 0.6)}M${n1(b[0])} ${n1(b[1])}L${n1(b[0] - ux * h - uy * h * 0.5)} ${n1(b[1] - uy * h + ux * h * 0.5)}L${n1(b[0] - ux * h + uy * h * 0.5)} ${n1(b[1] - uy * h - ux * h * 0.5)}Z`;
    }
    const flecha = (par, a, b, color, w = 0.9) => { const p = el("path", { d: dFlecha(a, b, 2.6 * u()), fill: color, stroke: color, "stroke-linecap": "round", "stroke-linejoin": "round" }, par); return escala(p, { raya: w }); };
    /* aparece dibujándose (o de golpe con «menos movimiento») */
    const traza = (p, dur = 0.4) => { const L = p.getTotalLength ? p.getTotalLength() : 0; if (!L) return Promise.resolve(); p.setAttribute("stroke-dasharray", n1(L)); return ctx.anima(dur, (k) => p.setAttribute("stroke-dashoffset", n1(L * (1 - k))), "suave").then(() => { p.removeAttribute("stroke-dasharray"); p.removeAttribute("stroke-dashoffset"); }); };
    const dCota = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, t = 1.3 * u(), nx = -dy / L * t, ny = dx / L * t; return `M${n1(a[0] + nx)} ${n1(a[1] + ny)}L${n1(a[0] - nx)} ${n1(a[1] - ny)}` + dLinea(a, b) + `M${n1(b[0] + nx)} ${n1(b[1] + ny)}L${n1(b[0] - nx)} ${n1(b[1] - ny)}`; };

    /* Cota en el piso, de x0 a x1 (por delante del paso de la piedra). */
    function cotaSuelo(x0, x1, str, o = {}) {
      const z = o.z == null ? 6.2 : o.z, y = o.y || 0;
      raya(gCotas, dCota(P(x0, y, z), P(x1, y, z)), o.color || AZUL, 0.6);
      return texto(gCotas, P((x0 + x1) / 2, y, z), str, { anc: "middle", rot: -30, dy: -0.35, color: o.color, f: o.f });
    }
    /* Cota vertical en x, de y0 a y1. */
    function cotaAlto(x, y0, y1, str, o = {}) {
      const z = o.z == null ? 5.3 : o.z, par = o.frente ? gNotas : gCotas, a = P(x, y0, z), b = P(x, y1, z);
      raya(par, o.punteada ? dLinea(a, b) : dCota(a, b), o.color || AZUL, 0.6, o.punteada ? [0.9, 0.9] : null);
      return texto(par, lerp(a, b, o.arriba ? 1 : 0.5), str, { anc: o.anc || "start", dx: o.anc === "end" ? -0.4 : 0.4, dy: o.arriba ? -0.4 : 0.3, color: o.color, f: o.f });
    }
    const rotulo = (x, y, str, o = {}) => texto(gNotas, P(x, y, o.z || 0), str, o);
    /* Tache donde cayó la piedra, con su rótulo debajo. */
    function tache(x, y, str) {
      const c = P(x, y), t = 1.4 * u();
      raya(gNotas, `M${n1(c[0] - t)} ${n1(c[1] - t * 0.6)}L${n1(c[0] + t)} ${n1(c[1] + t * 0.6)}M${n1(c[0] + t)} ${n1(c[1] - t * 0.6)}L${n1(c[0] - t)} ${n1(c[1] + t * 0.6)}`, CORAL, 0.8);
      if (str) texto(gNotas, c, str, { anc: "middle", dy: 1.5, color: CORAL, f: 3.8 });
    }

    /* Flecha de la velocidad de salida mientras se apunta. */
    function apunta(ang, v) {
      gApunte.textContent = "";
      const largo = (3.5 + v / 5) * Math.max(1, vista.w / 1100), a = rad(ang), o = P(0, 0.5), p = P(largo * Math.cos(a), 0.5 + largo * Math.sin(a));
      raya(gApunte, dLinea(o, P(largo * 0.9, 0.5)), GRIS_N, 0.45, [0.8, 0.8]);
      flecha(gApunte, o, p, AZUL, 1);
      texto(gApunte, p, ang + "° · " + v + " m/s", { dx: 0.3, dy: -0.2, f: 4.6 });
    }
    const sinApunte = () => { gApunte.textContent = ""; };

    /* Triángulo de velocidades sobre el trabuquete.
       modo «dato»: solo v y el ángulo · «pista»: los catetos punteados, por colorear · «resuelto»: catetos de color con su valor. */
    function triangulo(d, modo) {
      gApunte.textContent = "";
      const k = 9 / d.v, A = P(0, 0.5), B = P(k * d.vx, 0.5), C = P(k * d.vx, 0.5 + k * d.vy), listo = [];
      raya(gApunte, dLinea(A, P(k * d.vx + 1.5, 0.5)), GRIS_N, 0.4, [0.8, 0.8]);
      if (modo === "pista") { raya(gApunte, dLinea(A, B), CORAL, 0.9, [1.4, 1.2]); raya(gApunte, dLinea(B, C), VERDE, 0.9, [1.4, 1.2]); }
      if (modo === "resuelto") { listo.push(flecha(gApunte, A, B, CORAL, 1.1), flecha(gApunte, B, C, VERDE, 1.1)); }
      let arco = ""; const rr = 2.6, sen = d.vy / d.v, cos = d.vx / d.v, tope = Math.atan2(sen, cos);
      for (let i = 0; i <= 8; i++) { const a = tope * i / 8, p = P(rr * Math.cos(a), 0.5 + rr * Math.sin(a)); arco += (arco ? "L" : "M") + n1(p[0]) + " " + n1(p[1]); }
      raya(gApunte, arco, AZUL, 0.5);
      flecha(gApunte, A, C, AZUL, 1.1);
      texto(gApunte, P(rr * 1.25, 0.5 + rr * 0.42), d.ang + "°", { f: 3.8, dy: 0.3 });
      texto(gApunte, lerp(A, C, 0.55), "v = " + d.v + " m/s", { anc: "end", dx: -0.5, dy: -0.3, f: 4.4 });
      if (modo !== "dato") {
        texto(gApunte, lerp(A, B, 0.5), modo === "pista" ? "vx = ?" : "vx = " + d.vx + " m/s", { anc: "middle", dy: 1.25, color: CORAL, f: 4.4 });
        texto(gApunte, lerp(B, C, 0.5), modo === "pista" ? "vy = ?" : "vy = " + d.vy + " m/s", { dx: 0.4, dy: 0.3, color: VERDE, f: 4.4 });
      }
      return listo.reduce((antes, f) => antes.then(() => traza(f, 0.45)), Promise.resolve());
    }

    /* ---------- Movimiento ---------- */
    function carga() { e.a2 = 220; e.sx = -7.2; e.sy = 0; e.honda = 1; fVx.setAttribute("opacity", 0); fVy.setAttribute("opacity", 0); }
    /* El rastro del tiro anterior queda tenue. */
    function guardaRastro() {
      const d = rastro.getAttribute("d");
      if (d) { const p = el("path", { d, fill: "none", stroke: TINTA, "stroke-linecap": "round" }, viejos); escala(p, { raya: 0.8, puntos: [0.01, 2.2] }); ponVista(vista); }
      rastro.setAttribute("d", "");
    }
    /* Lanza la piedra por la parábola real: x = vx·t, y = vy·t − 5t², hasta t = tFin.
       tr = { vx, vy, tFin, lento: [xa, xb] (cámara lenta en ese tramo), flechas (vx y vy pegadas a la piedra),
              cerca, general (cajas de cámara: salida y vuelo), eventos: [{ x, haz }] (al pasar por x) } */
    function lanza(tr) {
      const f = (t) => [tr.vx * t, tr.vy * t - 0.5 * G * t * t];
      guardaRastro(); sinApunte(); carga(); dibuja();
      const base = Math.max(1, tr.tFin / 3.2), tramos = [];
      if (tr.lento) {
        const ta = Math.min(tr.tFin, Math.max(0, tr.lento[0] / tr.vx)), tb = Math.min(tr.tFin, tr.lento[1] / tr.vx);
        tramos.push([0, ta, base], [ta, tb, base * 0.22], [tb, tr.tFin, base]);
      } else tramos.push([0, tr.tFin, base]);
      const total = tramos.reduce((s, q) => s + (q[1] - q[0]) / q[2], 0);
      const tiempoEn = (real) => { for (const q of tramos) { const d = (q[1] - q[0]) / q[2]; if (real <= d) return q[0] + real * q[2]; real -= d; } return tr.tFin; };
      const eventos = (tr.eventos || []).map((q) => ({ ...q, hecho: false }));
      const DUR = 0.45;
      return (tr.cerca ? encuadra(tr.cerca, 0.45) : Promise.resolve())
        .then(() => ctx.anima(0.3, (k) => { e.a2 = 220 + 6 * k; dibuja(); }, "suave"))
        .then(() => {
          /* el brazo gira (y rebota al final) mientras la honda jala la piedra hasta el origen */
          ctx.anima(DUR, (k) => { e.a2 = 226 - 151 * k * k * k; dibuja(); }).then(() => ctx.anima(0.44, (k) => { e.a2 = 75 + 8 * Math.sin(k * Math.PI) * (k < 1 ? 1 : 0); dibuja(); }));
          return ctx.anima(DUR * 0.68, (k) => { const w = k * 0.68; if (w >= 0.33) e.honda = 0; if (w >= 0.18) { const q = (w - 0.18) / 0.5; e.sx = -7.2 * (1 - q * q * q); } dibuja(); });
        })
        .then(() => {
          e.sx = 0; e.sy = 0; e.honda = 0;
          if (tr.general) encuadra(tr.general, 0.9);
          return ctx.anima(total, (k) => {
            const t = k >= 1 ? tr.tFin : tiempoEn(k * total), w = f(t);
            e.sx = w[0]; e.sy = w[1];
            rastro.setAttribute("d", camino(f, t));
            if (tr.flechas) {
              const kf = 6 / Math.hypot(tr.vx, tr.vy) * Math.max(1, vista.w / 1300), c = P(w[0], w[1] + 0.5), h = 2 * u();
              fVx.setAttribute("d", dFlecha(c, P(w[0] + tr.vx * kf, w[1] + 0.5), h)); fVy.setAttribute("d", dFlecha(c, P(w[0], w[1] + 0.5 + (tr.vy - G * t) * kf), h));
              fVx.setAttribute("stroke-width", n2(0.8 * u())); fVy.setAttribute("stroke-width", n2(0.8 * u()));
              fVx.setAttribute("opacity", 1); fVy.setAttribute("opacity", 1);
            }
            eventos.forEach((q) => { if (!q.hecho && w[0] >= q.x - 1e-6) { q.hecho = true; q.haz(); } });
            dibuja();
          });
        });
    }
    /* La piedra cae a plomo hasta el piso (después de chocar). */
    function cae() { const y0 = e.sy, y1 = piso(e.sx - 0.01); return ctx.anima(0.35, (k) => { e.sy = y0 + (y1 - y0) * k; dibuja(); }, "entra"); }
    /* Polvo estilo tinta: nubecitas con contorno que salen a los lados y se encogen. */
    function polvo(x, y = 0, fuerza = 1) {
      const r = rng(Math.round(x * 100) + 7), g = el("g", {}, gPolvo), k = Math.max(1, vista.w / 1300) * fuerza, nubes = [];
      for (let i = 0; i < 6; i++) {
        const ld = i % 2 ? 1 : -1, c = P(x + ld * (0.5 + (i >> 1) * 0.75) * k, y + 0.3 + r() * 0.3, (r() - 0.5) * 1.2), rr = (5 + r() * 4.5) * k;
        nubes.push({ n: el("path", { d: nube(c[0], c[1], rr, 700 + i), fill: "#f6efdd", class: "ink fino" }, g), c, rr, dx: ld * (10 + r() * 12) * k, dy: -(4 + r() * 9) * k });
      }
      return ctx.anima(0.9, (t) => {
        nubes.forEach((q) => {
          const s = t < 0.25 ? t / 0.25 : 1 - Math.max(0, (t - 0.65) / 0.35) * 0.75, ox = q.c[0], oy = q.c[1] + q.rr;
          q.n.setAttribute("transform", `translate(${n1(q.dx * t + ox)} ${n1(q.dy * t + oy)}) scale(${n2(s)}) translate(${n1(-ox)} ${n1(-oy)})`);
          q.n.setAttribute("opacity", n2(t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35));
        });
      }, "sale").then(() => g.remove());
    }
    function tiembla(amp = 1) {
      return ctx.anima(0.45, (k) => { const q = amp * 1.1 * u() * (1 - k); mundo.setAttribute("transform", `translate(${n1(q * Math.sin(k * 41))} ${n1(q * Math.cos(k * 33))})`); }).then(() => mundo.removeAttribute("transform"));
    }
    const brilla = () => cBrillo.setAttribute("opacity", 1);

    /* Deja la escena lista para un nivel.
       o = { D (puerta), h (altura de la colina), muralla: { x, alto }, vista: caja inicial } */
    function prepara(o) {
      const D = o.D, h = o.h || 0, X1 = D + 12;
      lugar = { D, h, borde: h ? D - 3 : 1e9, muralla: o.muralla || null };
      [gSuelo, gColina, gCotas, gMur, gPolvo, gNotas, gApunte, viejos].forEach((g) => { g.textContent = ""; });
      rastro.setAttribute("d", "");
      mundo.removeAttribute("transform"); cBrillo.setAttribute("opacity", 0);
      const m = lugar.muralla;
      haceSuelo(gSuelo, X1, (x, z) => !(Math.abs(z) < 1.7 || (x < 1.5 && Math.abs(z) < 3) || (x > D - 1.5 - (h ? 2.5 : 0) && Math.abs(z) < (h ? 8 : 6)) || (m && x > m.x - 2 && x < m.x + 4.5 && Math.abs(z) < 5.2)));
      if (h) haceColina(gColina, D - 3, D + 10.5, h);
      if (m) haceMuralla(gMur, m.x, m.alto);
      gCastT.setAttribute("transform", `translate(${n1(CX * (D - X_CAST))} ${n1(-CY * (D - X_CAST) - S * h)})`);
      carga();
      cajaActual = o.vista;
      ponVista(cajaDe(o.vista));
    }

    return { prepara, encuadra, apunta, sinApunte, triangulo, lanza, cae, polvo, tiembla, brilla, cotaSuelo, cotaAlto, rotulo, tache };
  }

  window.EscenaCatapulta = { crea };
})();
