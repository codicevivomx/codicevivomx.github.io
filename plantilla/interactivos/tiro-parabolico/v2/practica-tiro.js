/* Códice Vivo · Tiro parabólico 2.0 · los 8 problemas de práctica (los usa plantilla/laminas2/practica.js).
   Números de examen: g = 10 m/s²; 37° y 53° con sen y cos de 0.6 y 0.8. Toda la física sale de genera().
   Cada opción incorrecta es un error típico y trae su propia explicación. */

const G = 10;
const TRIG = { 37: { sen: 0.6, cos: 0.8 }, 53: { sen: 0.8, cos: 0.6 } };
const f = (v, d = 2) => { const k = 10 ** d, r = Math.round(v * k) / k; return String(r); };
const rad = (g) => g * Math.PI / 180;

/* ---------- Boceto a tinta (opcional, arriba del enunciado) ---------- */
function boceto(o) {
  const W = 320, H = 130, x0 = 24, y0 = 108, L = o.largo || 270, alto = o.alto || 70;
  const px = (u) => x0 + u * L, py = (v) => y0 - v * alto;
  let d = ""; for (let i = 0; i <= 40; i++) { const u = i / 40; d += (i ? "L" : "M") + px(u).toFixed(1) + " " + py(4 * u * (1 - u)).toFixed(1); }
  const a = rad(o.ang || 45), ax = x0 + 46 * Math.cos(a), ay = y0 - 46 * Math.sin(a);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || "Boceto del tiro"}">`;
  s += `<path d="M8 ${y0}H${W - 8}" class="bo-suelo"/><path d="${d}" class="bo-tray"/>`;
  s += `<path d="M${x0} ${y0}L${ax.toFixed(1)} ${ay.toFixed(1)}" class="bo-v"/><path d="M${ax.toFixed(1)} ${ay.toFixed(1)}l${(-8 * Math.cos(a - 0.45)).toFixed(1)} ${(8 * Math.sin(a - 0.45)).toFixed(1)}M${ax.toFixed(1)} ${ay.toFixed(1)}l${(-8 * Math.cos(a + 0.45)).toFixed(1)} ${(8 * Math.sin(a + 0.45)).toFixed(1)}" class="bo-v"/>`;
  s += `<path d="M${x0 + 20} ${y0}A20 20 0 0 0 ${(x0 + 20 * Math.cos(a)).toFixed(1)} ${(y0 - 20 * Math.sin(a)).toFixed(1)}" class="bo-arco"/>`;
  if (o.tAng) s += `<text x="${x0 + 26}" y="${y0 - 6}" class="bo-t">${o.tAng}</text>`;
  if (o.tV) s += `<text x="${(ax + 4).toFixed(1)}" y="${(ay - 4).toFixed(1)}" class="bo-t">${o.tV}</text>`;
  if (o.barrera != null) { const bx = px(o.barrera); s += `<path d="M${bx - 5} ${y0}V${y0 - 22}H${bx + 5}V${y0}" class="bo-barrera"/><text x="${bx}" y="${y0 + 16}" class="bo-t bo-c">${o.tBarrera || ""}</text>`; }
  if (o.tH) s += `<path d="M${px(0.5)} ${py(1)}V${y0}" class="bo-cota"/><text x="${px(0.5) + 6}" y="${py(0.5)}" class="bo-t">${o.tH}</text>`;
  if (o.tR) s += `<text x="${px(0.5)}" y="${y0 + 16}" class="bo-t bo-c">${o.tR}</text>`;
  return s + "</svg>";
}

/* Opciones sin repetir: si dos errores dan el mismo número, se queda el primero y se rellena. */
function unicas(ops, relleno) {
  const vistas = new Set(), out = [];
  for (const o of ops) { if (!vistas.has(o.texto)) { vistas.add(o.texto); out.push(o); } }
  for (const o of relleno || []) { if (out.length >= 4) break; if (!vistas.has(o.texto)) { vistas.add(o.texto); out.push(o); } }
  return out.slice(0, 4);
}

export const PROBLEMAS = [
  /* 1 · Descomponer */
  {
    id: "descomponer", titulo: "Descomponer", etiqueta: "37° / 53°",
    genera(az) { const v0 = az.elige([10, 15, 20, 25, 30, 40, 50]), ang = az.elige([37, 53]), pide = az.elige(["vx", "vy"]); return { v0, ang, pide, ...TRIG[ang] }; },
    enunciado: (d) => `Se patea un balón a ${d.v0} m/s con un ángulo de ${d.ang}° sobre el suelo (sen ${d.ang}° = ${d.sen}, cos ${d.ang}° = ${d.cos}).`,
    pregunta: (d) => d.pide === "vx" ? "¿Cuánto vale su velocidad horizontal, vx?" : "¿Cuánto vale su velocidad vertical inicial, v0y?",
    opciones(d) {
      const bien = d.pide === "vx" ? d.cos : d.sen, otro = d.pide === "vx" ? d.sen : d.cos;
      return unicas([
        { texto: `${f(d.v0 * bien)} m/s`, correcta: true },
        { texto: `${f(d.v0 * otro)} m/s`, pista: d.pide === "vx" ? "Esa es la vertical. La horizontal va con cos θ (el lado pegado al ángulo)." : "Esa es la horizontal. La vertical va con sen θ (el lado de enfrente del ángulo)." },
        { texto: `${f(d.v0)} m/s`, pista: "Esa es la rapidez completa. Hay que repartirla en dos con sen y cos." },
        { texto: `${f(d.v0 / 2)} m/s`, pista: "La mitad solo sale con 30° (sen 30° = 0.5). Aquí usa el triángulo 3-4-5." }
      ]);
    },
    pistas: (d) => ["Dibuja el triángulo: v0 es la hipotenusa y las componentes son los catetos.",
      "vx = v0 · cos θ   y   v0y = v0 · sen θ.",
      d.pide === "vx" ? `vx = ${d.v0} × ${d.cos} = ${f(d.v0 * d.cos)} m/s` : `v0y = ${d.v0} × ${d.sen} = ${f(d.v0 * d.sen)} m/s`],
    dibujo: (d) => boceto({ ang: d.ang, tAng: d.ang + "°", tV: d.v0 + " m/s", alto: 60 })
  },
  /* 2 · Tiempo de vuelo */
  {
    id: "tiempo", titulo: "Tiempo de vuelo",
    genera(az) { const v0 = az.elige([10, 15, 20, 25, 30, 40, 50]), ang = az.elige([37, 53]); return { v0, ang, ...TRIG[ang] }; },
    enunciado: (d) => `Un balón sale del suelo a ${d.v0} m/s y ${d.ang}° (sen = ${d.sen}, cos = ${d.cos}, g = 10 m/s²).`,
    pregunta: () => "¿Cuánto tiempo pasa en el aire?",
    opciones(d) {
      const vy = d.v0 * d.sen, vx = d.v0 * d.cos;
      return unicas([
        { texto: `${f(2 * vy / G)} s`, correcta: true },
        { texto: `${f(vy / G)} s`, pista: "Ese es solo el tiempo de subida. El balón también baja y tarda lo mismo: el vuelo es el doble." },
        { texto: `${f(2 * vx / G)} s`, pista: "Usaste vx. El tiempo lo decide lo vertical: la gravedad solo frena a v0y." },
        { texto: `${f(2 * d.v0 / G)} s`, pista: "Usaste v0 completa, como si lo patearas hacia arriba. Solo cuenta la parte vertical." }
      ]);
    },
    pistas: (d) => ["Lo vertical sube, se frena y baja. Lo horizontal no influye en el tiempo.",
      "t de subida = v0y ÷ g;  t de vuelo = 2 · v0y ÷ g.",
      `v0y = ${d.v0} × ${d.sen} = ${f(d.v0 * d.sen)} m/s → t = 2 × ${f(d.v0 * d.sen)} ÷ 10 = ${f(2 * d.v0 * d.sen / G)} s`]
  },
  /* 3 · Altura máxima */
  {
    id: "altura", titulo: "Altura máxima",
    genera(az) { const v0 = az.elige([10, 15, 20, 25, 30, 40]), ang = az.elige([37, 53]); return { v0, ang, ...TRIG[ang] }; },
    enunciado: (d) => `Se patea un balón a ${d.v0} m/s y ${d.ang}° (sen = ${d.sen}, cos = ${d.cos}, g = 10 m/s²).`,
    pregunta: () => "¿Qué altura máxima alcanza?",
    opciones(d) {
      const vy = d.v0 * d.sen, vx = d.v0 * d.cos;
      return unicas([
        { texto: `${f(vy * vy / (2 * G))} m`, correcta: true },
        { texto: `${f(vy * vy / G)} m`, pista: "Olvidaste el 2: H = v0y² ÷ (2g)." },
        { texto: `${f(d.v0 * d.v0 / (2 * G))} m`, pista: "Usaste v0 completa. Para la altura solo cuenta la parte vertical, v0y." },
        { texto: `${f(vx * vx / (2 * G))} m`, pista: "Usaste vx. Lo horizontal no sube: la altura sale de v0y." }
      ]);
    },
    pistas: (d) => ["En la cima vy = 0; solo importa la parte vertical.",
      "H = v0y² ÷ (2g).",
      `v0y = ${f(d.v0 * d.sen)} m/s → H = ${f(d.v0 * d.sen)}² ÷ 20 = ${f((d.v0 * d.sen) ** 2 / 20)} m`],
    dibujo: (d) => boceto({ ang: d.ang, tAng: d.ang + "°", tV: d.v0 + " m/s", tH: "H = ?", alto: d.ang === 53 ? 80 : 55 })
  },
  /* 4 · Alcance */
  {
    id: "alcance", titulo: "Alcance",
    genera(az) { const v0 = az.elige([10, 15, 20, 25, 30, 40, 50]), ang = az.elige([37, 53]); return { v0, ang, ...TRIG[ang] }; },
    enunciado: (d) => `Un balón sale del suelo a ${d.v0} m/s y ${d.ang}° (sen = ${d.sen}, cos = ${d.cos}, g = 10 m/s²).`,
    pregunta: () => "¿A qué distancia cae?",
    opciones(d) {
      const vy = d.v0 * d.sen, vx = d.v0 * d.cos, tv = 2 * vy / G;
      return unicas([
        { texto: `${f(vx * tv)} m`, correcta: true },
        { texto: `${f(vx * tv / 2)} m`, pista: "Usaste el tiempo de subida. El balón sube y baja: el vuelo dura el doble." },
        { texto: `${f(vy * tv)} m`, pista: "Multiplicaste por v0y. La distancia la da lo horizontal: vx × t." },
        { texto: `${f(d.v0 * d.v0 / G)} m`, pista: "v0² ÷ g solo vale para 45°." }
      ]);
    },
    pistas: (d) => ["Separa: el tiempo sale de lo vertical y la distancia de lo horizontal.",
      "R = vx × t de vuelo, con t = 2 v0y ÷ g.",
      `vx = ${f(d.v0 * d.cos)} m/s, t = ${f(2 * d.v0 * d.sen / G)} s → R = ${f(d.v0 * d.cos)} × ${f(2 * d.v0 * d.sen / G)} = ${f(d.v0 * d.cos * 2 * d.v0 * d.sen / G)} m`],
    dibujo: (d) => boceto({ ang: d.ang, tAng: d.ang + "°", tV: d.v0 + " m/s", tR: "R = ?", alto: 55 })
  },
  /* 5 · ¿Pasa la barrera? */
  {
    id: "barrera", titulo: "¿Pasa la barrera?", etiqueta: "situación real",
    genera(az) {
      const c = az.elige([[10, 37, 1], [10, 37, 0.5], [10, 53, 1], [15, 37, 1], [15, 37, 0.5], [20, 37, 0.5], [15, 53, 1], [5, 53, 0.5], [20, 53, 0.5]]);
      const [v0, ang, t] = c, T = TRIG[ang];
      return { v0, ang, t, ...T, vx: v0 * T.cos, vy: v0 * T.sen, d: v0 * T.cos * t, h: 2 };
    },
    enunciado: (d) => `Tiro libre: el balón sale a ${d.v0} m/s y ${d.ang}° (sen = ${d.sen}, cos = ${d.cos}, g = 10 m/s²). La barrera mide ${d.h} m y está a ${f(d.d)} m.`,
    pregunta: () => "¿A qué altura va el balón al llegar a la barrera?",
    opciones(d) {
      const y = (t, g = G) => d.vy * t - g * t * t / 2, veredicto = (v) => (v > d.h ? "la pasa" : "choca");
      const ok = y(d.t), sinG = d.vy * d.t, sinMedio = y(d.t, 2 * G), tMal = d.d / d.v0, yMal = y(tMal);
      return unicas([
        { texto: `${f(ok)} m: ${veredicto(ok)}`, correcta: true },
        { texto: `${f(sinG)} m: ${veredicto(sinG)}`, pista: "Olvidaste la gravedad: y = v0y·t − ½·g·t²." },
        sinMedio > 0 ? { texto: `${f(sinMedio)} m: ${veredicto(sinMedio)}`, pista: "Te faltó el ½: la caída es ½·g·t² = 5t²." } : null,
        { texto: `${f(yMal)} m: ${veredicto(yMal)}`, pista: "Calculaste el tiempo con v0. Para llegar a la barrera cuenta vx: t = d ÷ vx." }
      ].filter(Boolean), [ok + 1.5, ok - 1, ok + 3].filter((v) => v > 0).map((v) => ({ texto: `${f(v)} m: ${veredicto(v)}`, pista: "Revisa la cuenta: t = d ÷ vx y luego y = v0y·t − 5t²." })));
    },
    pistas: (d) => ["Primero, ¿cuánto tarda en llegar a la barrera? Eso lo decide lo horizontal.",
      "t = d ÷ vx;  luego  y = v0y·t − 5t².",
      `t = ${f(d.d)} ÷ ${f(d.vx)} = ${f(d.t)} s → y = ${f(d.vy)} × ${f(d.t)} − 5 × ${f(d.t)}² = ${f(d.vy * d.t - 5 * d.t * d.t)} m`],
    dibujo: (d) => boceto({ ang: d.ang, tAng: d.ang + "°", tV: d.v0 + " m/s", barrera: Math.min(0.45, d.t / (2 * d.vy / G)), tBarrera: f(d.d) + " m", alto: 55 })
  },
  /* 6 · Ángulo de alcance máximo */
  {
    id: "maximo", titulo: "Alcance máximo",
    genera(az) { return { v0: az.elige([10, 15, 20, 25, 30]) }; },
    enunciado: (d) => `Puedes patear el balón a ${d.v0} m/s con el ángulo que quieras (g = 10 m/s², sin aire).`,
    pregunta: () => "¿Con qué ángulo llega más lejos y a qué distancia cae?",
    opciones(d) {
      const R = d.v0 * d.v0 / G;
      return unicas([
        { texto: `45°, a ${f(R)} m`, correcta: true },
        { texto: `45°, a ${f(R / 2)} m`, pista: "v0² ÷ (2g) es la altura si lo pateas hacia arriba. A 45° el alcance es v0² ÷ g." },
        { texto: `37°, a ${f(R)} m`, pista: `A 37° cae a 0.96 · v0² ÷ g = ${f(0.96 * R)} m: un poco antes que a 45°.` },
        { texto: `60°, a ${f(R)} m`, pista: "Más ángulo no es más lejos: sube más pero avanza más lento. El reparto justo es 45°." }
      ]);
    },
    pistas: () => ["El alcance depende de sen 2θ. ¿Cuándo vale 1?",
      "R = v0² · sen 2θ ÷ g; máximo con 2θ = 90°.",
      "θ = 45° → R = v0² ÷ g."]
  },
  /* 7 · Ángulos complementarios */
  {
    id: "complementarios", titulo: "Mismo alcance",
    genera(az) { const ang = az.elige([37, 30, 20, 15, 25, 35, 40, 10]), v0 = az.elige([10, 20, 30]); return { ang, v0, R: v0 * v0 * Math.sin(rad(2 * ang)) / G }; },
    enunciado: (d) => `Un balón pateado a ${d.v0} m/s y ${d.ang}° cae a unos ${f(d.R, 1)} m.`,
    pregunta: () => "¿Con qué otro ángulo, y la misma rapidez, cae en el mismo lugar?",
    opciones(d) {
      const doble = 2 * d.ang === 90 - d.ang ? d.ang / 2 : 2 * d.ang;
      return unicas([
        { texto: `${90 - d.ang}°`, correcta: true },
        { texto: `${doble}°`, pista: "Duplicar el ángulo no da el mismo alcance. Busca el que sume 90° con el tuyo." },
        { texto: "45°", pista: "45° es el de alcance máximo: cae más lejos que cualquier otro." },
        { texto: `${180 - d.ang}°`, pista: "Los ángulos con el mismo alcance suman 90°, no 180°." }
      ]);
    },
    pistas: () => ["Si cambias sen por cos, ¿cambia vx × t?",
      "R = 2 v0² · sen θ · cos θ ÷ g: es igual para θ y para 90° − θ.",
      "Complementarios: el otro ángulo es 90° − θ."]
  },
  /* 8 · Problema inverso */
  {
    id: "inverso", titulo: "Al revés", etiqueta: "inverso",
    genera(az) { const v0 = az.elige([10, 15, 20, 25, 30]), ang = az.elige([37, 53]); return { v0, ang, ...TRIG[ang], R: v0 * v0 * 0.96 / G }; },
    enunciado: (d) => `Un balón pateado a ${d.ang}° cae a ${f(d.R)} m (sen = ${d.sen}, cos = ${d.cos}, g = 10 m/s²).`,
    pregunta: () => "¿Con qué rapidez se pateó?",
    opciones(d) {
      return unicas([
        { texto: `${f(d.v0, 1)} m/s`, correcta: true },
        { texto: `${f(Math.sqrt(d.R * G), 1)} m/s`, pista: "Usaste R = v0² ÷ g, que solo vale para 45°. Aquí sen 2θ = 2 × 0.6 × 0.8 = 0.96." },
        { texto: `${f(Math.sqrt(d.R * G / 0.6), 1)} m/s`, pista: "Usaste sen θ. La fórmula lleva sen 2θ = 2 sen θ cos θ = 0.96." },
        { texto: `${f(Math.sqrt(d.R * G / 1.92), 1)} m/s`, pista: "Dividiste de más entre 2. R = v0² · 0.96 ÷ g." }
      ]);
    },
    pistas: (d) => ["Escribe el alcance en función de v0 y despeja.",
      "R = v0² · 2 sen θ cos θ ÷ g = v0² · 0.96 ÷ 10.",
      `v0² = ${f(d.R)} × 10 ÷ 0.96 = ${f(d.v0 * d.v0)} → v0 = ${f(d.v0)} m/s`],
    dibujo: (d) => boceto({ ang: d.ang, tAng: d.ang + "°", tV: "v0 = ?", tR: f(d.R) + " m", alto: 55 })
  }
];
