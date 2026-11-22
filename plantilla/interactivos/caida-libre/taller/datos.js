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
  const tomas = T.tomas, esc = T.escena3d;
  const salto = tomas[2].de, abrir = tomas[4].de;
  const extras = {
    lenta: num(tomas[2].a - tomas[2].de, 1),
    nTomas: tomas.length, nPausas: T.pausas.length,
    tramos: lista(tramos.map((x) => num(x, 0))),
    tramosTri: lista(tramos.map((x) => num(x / v0.tri, 0))),
    lista: tramos.map((x) => num(x, 0)).join(" · "),
  };
  tramos.forEach((x, i) => (extras["s" + (i + 1)] = num(x, 0)));

  // Texto de una plantilla con los valores de un instante (t por defecto el de valoresIniciales).
  const texto = (plantilla, ent = {}, mas = {}) => tpl(plantilla, { ...fmt(calc(ent)), ...extras, ...mas });

  // Tiempo de escena S → tiempo físico t. Toma 3 = primer segundo en cámara lenta; toma 4 = del segundo 1 a TC.
  function fisica(S) {
    if (S < salto) return 0;
    const t3 = tomas[2], t4 = tomas[3];
    if (S < t3.a) return (S - t3.de) / (t3.a - t3.de);
    return Math.min(TC, 1 + (S - t4.de) / (t4.a - t4.de) * (TC - 1));
  }

  return { J, T, esc, tomas, pausas: T.pausas, DEC, calc, porK, fmt, texto, num, tpl, N, TC, tramos, salto, abrir, fisica, v0 };
}
