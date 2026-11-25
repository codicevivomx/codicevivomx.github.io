// Datos de la lámina «El salto». Todo número que sale en pantalla viene de aquí:
// del JSON (contenido/fisica/caida-libre-interactivo.json) o de sus fórmulas.
// El evaluador, num() y tpl() son los de plantilla/interactivos/caida-libre/plus/ (sin eval).

export function evalua(e, v) {
  const s = String(e).replace(/\s+/g, ""); let i = 0;
  const F = { raiz: (x) => (x === null || x < -1e-12 ? null : Math.sqrt(Math.max(0, x))) };
  const op = (a, b, f) => (a === null || b === null ? null : f(a, b));
  const hoja = () => {
    const r = /^(\d+(?:\.\d+)?|[A-Za-z_]\w*)/.exec(s.slice(i));
    if (!r) throw new Error("Fórmula no válida: " + e);
    i += r[0].length;
    if (/^\d/.test(r[0])) return +r[0];
    if (r[0] in F && s[i] === "(") { i++; const a = suma(); i++; return F[r[0]](a); }
    if (!(r[0] in v)) throw new Error("Fórmula con un nombre desconocido: " + r[0]);
    return v[r[0]];
  };
  const fac = () => { if (s[i] === "(") { i++; const r = suma(); i++; return r; } if (s[i] === "-") { i++; const a = fac(); return a === null ? null : -a; } return hoja(); };
  const prod = () => { let r = fac(); while (s[i] === "*" || s[i] === "/") { const o = s[i++], b = fac(); r = op(r, b, o === "*" ? (x, y) => x * y : (x, y) => x / y); } return r; };
  const suma = () => { let r = prod(); while (s[i] === "+" || s[i] === "-") { const o = s[i++], b = prod(); r = op(r, b, o === "+" ? (x, y) => x + y : (x, y) => x - y); } return r; };
  return suma();
}

export const num = (v, dec = 2) => {
  if (v === null || v === undefined) return "—";
  const r = Math.round(v * 10 ** dec + (v >= 0 ? 1e-9 : -1e-9)) / 10 ** dec;
  let [i, d] = Math.abs(r).toFixed(dec).split(".");
  d = (d || "").replace(/0+$/, "");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (r < 0 && (i !== "0" || d) ? "−" : "") + i + (d ? "." + d : "");
};

export const tpl = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

const lista = (xs, y = "y") => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " " + y + " " + xs[xs.length - 1]);

export async function cargarDatos(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("No se pudo leer " + url);
  return crearDatos(await r.json());
}

export function crearDatos(J) {
  const T = J.taller;
  const DEC = { ...J.lecturas.decimales, ...T.decimales };
  const base = { ...J.valoresIniciales, tMax: J.rangos.t.max, altitud: T.altitud, masaTandem: T.masaTandem, k: 1 };

  // Valores en un instante: fórmulas de lecturas y del taller (las que dependen de k usan k = 1 si no se da).
  function calc(ent = {}) {
    const v = { ...base, ...ent };
    for (const [q, e] of Object.entries(J.lecturas.formulas)) v[q] = evalua(e, v);
    for (const [q, e] of Object.entries(T.formulas)) v[q] = evalua(e, v);
    return v;
  }
  const porK = (nombre, k) => evalua(T.formulas[nombre], { ...calc(), k });
  const fmt = (v) => { const f = {}; for (const x in v) f[x] = typeof v[x] === "number" ? num(v[x], DEC[x] ?? 0) : v[x]; return f; };

  const v0 = calc();
  const N = v0.n, TC = v0.t;                         // segundo de la predicción y tiempo de caída antes de abrir
  const tramos = Array.from({ length: Math.floor(TC + 1e-9) }, (_, i) => porK("sk", i + 1));
  const esc = T.escena3d, CI = T.cine, DUR = CI.duracion, salto = CI.salto;

  // ---------- reloj de cine ----------
  // S = tiempo de escena (lo que corre en pantalla); τ = tiempo físico. dτ/dS = ritmo: 1 en tiempo real,
  // cine.ritmo.lenta en cámara lenta, con rampas suaves. La caída se mide en τ, así que g no cambia.
  const RIT = CI.ritmo, LENTA = evalua(RIT.lenta, {}), PASO = 1 / 240, NP = Math.ceil(DUR / PASO) + 2;
  const suave = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const tau = new Float64Array(NP), rit = new Float64Array(NP);
  let sIn = null, sOut = null;
  for (let i = 0; i < NP; i++) {
    const S = i * PASO, tf = tau[i] - salto;
    let r = 1;
    if (S >= salto) {
      if (sIn === null && tf >= RIT.realTras) sIn = S;
      if (sOut === null && tf >= TC) sOut = S;
      r = sOut !== null ? LENTA + (1 - LENTA) * suave((S - sOut) / RIT.rampaSalida)
        : sIn !== null ? 1 + (LENTA - 1) * suave((S - sIn) / RIT.rampaEntrada) : 1;
    }
    rit[i] = r; if (i + 1 < NP) tau[i + 1] = tau[i] + r * PASO;
  }
  const interp = (A, S) => { const x = Math.max(0, Math.min(NP - 1.001, S / PASO)), i = Math.floor(x); return A[i] + (A[i + 1] - A[i]) * (x - i); };
  const tauDe = (S) => interp(tau, S), ritmo = (S) => interp(rit, S);
  function escenaDe(tf) {                             // S en que la caída lleva tf segundos físicos
    const obj = salto + tf; let a = 0, b = NP - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (tau[m] < obj) a = m; else b = m; }
    return (a + (obj - tau[a]) / Math.max(1e-9, tau[b] - tau[a])) * PASO;
  }
  const abrir = escenaDe(TC);
  // Tomas del guion: «de» (escena), «enT» (tiempo físico de caída) o «deAbrir» (s de escena tras abrir).
  const tomas = CI.tomas.map((x) => ({ ...x, de: x.de ?? (x.enT !== undefined ? (x.enT ? escenaDe(x.enT) : salto) : abrir + x.deAbrir) }));
  tomas.forEach((x, i) => (x.a = i + 1 < tomas.length ? tomas[i + 1].de : DUR));
  const pausas = T.pausas.map((p) => ({ ...p, en: escenaDe(CI.pausas[p.id]) }));

  const extras = {
    lenta: num(1 / LENTA, 0), ritmo: RIT.etiqueta,
    nTomas: tomas.length, nPausas: T.pausas.length,
    tramos: lista(tramos.map((x) => num(x, 0))),
    tramosTri: lista(tramos.map((x) => num(x / v0.tri, 0))),
    lista: tramos.map((x) => num(x, 0)).join(" · "),
  };
  tramos.forEach((x, i) => (extras["s" + (i + 1)] = num(x, 0)));

  // Texto de una plantilla con los valores de un instante (t por defecto el de valoresIniciales).
  const texto = (plantilla, ent = {}, mas = {}) => tpl(plantilla, { ...fmt(calc(ent)), ...extras, ...mas });

  // Tiempo de escena S → tiempo físico de caída t (0 antes del salto, TC al abrir).
  const fisica = (S) => (S < salto ? 0 : S >= abrir ? TC : Math.min(TC, tauDe(S) - salto));

  return { J, T, esc, cine: CI, DUR, tomas, pausas, DEC, calc, porK, fmt, texto, num, tpl, N, TC, tramos, salto, abrir,
    fisica, tauDe, ritmo, escenaDe, LENTA, v0 };
}
