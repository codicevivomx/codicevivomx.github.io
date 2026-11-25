// Paleta de la lámina (taller.cine.paletas.predeterminada; ?paleta=neutra = colores originales).
// Cada color sRGB pasa a OKLCH (luminosidad L, croma C, tono h) y:
//   croma × «croma» sin tocar L (vivo, no neón);  contraste: L se estira alrededor de «pivote»;
//   verde → menta y verdes hacia un verde fresco;  cielo → azules claros más azules;  coral → más encendido.
// Si el color resultante sale de la gama sRGB, se baja el croma (no la luz) hasta que entra.
// Se aplica una sola vez al cargar (CSS, SVG, canvas y materiales de three.js): nunca por cuadro.
const lim = (x) => Math.max(0, Math.min(1, x));
const ventana = (h, centro, radio) => {           // 1 en el centro, 0 a «radio» grados (circular)
  const d = Math.abs(((h - centro + 540) % 360) - 180);
  return d < radio ? .5 + .5 * Math.cos(Math.PI * d / radio) : 0;
};
const aLin = (c) => (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
const aSrgb = (c) => (c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055);
function aOklab(r, g, b) {
  r = aLin(r); g = aLin(g); b = aLin(b);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .808675766 * s];
}
function deOklab(L, a, b) {                       // → sRGB lineal (puede salir de 0..1)
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3,
    s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
    -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
}

export function crearPaleta(p) {
  if (!p) return { activa: false, hex: (h) => h, css: (s) => String(s), num: (n) => n, alCambiar() {} };
  const { croma = 1, contraste = 1, pivote = .6, verde = 0, cielo = 0, coral = 0 } = p;
  function rgb(r, g, b) {                          // sRGB 0..1 → sRGB 0..1
    const [L0, A, B] = aOklab(r, g, b);
    let C = Math.hypot(A, B), h = (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
    const wg = ventana(h, 150, 50) * verde, wc = ventana(h, 232, 30) * cielo, wr = ventana(h, 35, 25) * coral;
    h += (145 - h) * wg * .8; C *= 1 + wg * .5;
    h += (240 - h) * wc * .5; C *= 1 + wc * .8;
    C *= 1 + wr * .6;
    C *= croma;
    const L = Math.max(0, Math.min(1, pivote + (L0 - pivote) * contraste));
    const hr = h * Math.PI / 180, ca = Math.cos(hr), sa = Math.sin(hr);
    let lin = deOklab(L, C * ca, C * sa);
    if (lin.some((x) => x < -1e-4 || x > 1 + 1e-4)) {   // fuera de gama: baja el croma, conserva L y h
      let lo = 0, hi = C;
      for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2, t = deOklab(L, mid * ca, mid * sa); if (t.every((x) => x >= -1e-4 && x <= 1 + 1e-4)) lo = mid; else hi = mid; }
      lin = deOklab(L, lo * ca, lo * sa);
    }
    return lin.map((x) => lim(aSrgb(lim(x))));
  }
  const a2 = (n) => Math.round(lim(n) * 255).toString(16).padStart(2, "0");
  const hex = (h) => {                             // "#RRGGBB" o "#RGB" → "#RRGGBB"
    let s = h.replace("#", ""); if (s.length === 3) s = s.replace(/./g, (c) => c + c);
    const [r, g, b] = rgb(parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255);
    return "#" + a2(r) + a2(g) + a2(b);
  };
  // Reemplaza todos los colores de un texto CSS/SVG: #hex, %23hex (data-URI), rgb() y rgba().
  const css = (s) => String(s)
    .replace(/(#|%23)([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m, pre, h) => pre + hex("#" + h).slice(1))
    .replace(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)/g, (m, r, g, b, al) => {
      const [x, y, z] = rgb(r / 255, g / 255, b / 255).map((v) => Math.round(v * 255));
      return al === undefined ? `rgb(${x}, ${y}, ${z})` : `rgba(${x}, ${y}, ${z}, ${al})`;
    });
  const num = (n) => parseInt(hex("#" + n.toString(16).padStart(6, "0")).slice(1), 16);
  return { activa: true, hex, css, num, alCambiar() {} };
}

// Pasa la paleta por el DOM una vez: hojas de estilo propias, estilos en línea y atributos SVG.
export function avivarDOM(P, raiz = document) {
  if (!P.activa) return;
  const reglas = (lista) => {
    for (const r of lista) {
      if (r.cssRules) reglas(r.cssRules);
      if (!r.style) continue;
      for (let i = 0; i < r.style.length; i++) {
        const k = r.style[i], v = r.style.getPropertyValue(k);
        if (/#|rgb/.test(v)) r.style.setProperty(k, P.css(v), r.style.getPropertyPriority(k));
      }
    }
  };
  for (const h of document.styleSheets) { try { reglas(h.cssRules); } catch { /* hoja ajena */ } }
  raiz.querySelectorAll("[style]").forEach((e) => e.setAttribute("style", P.css(e.getAttribute("style"))));
  raiz.querySelectorAll("svg [fill], svg [stroke], svg [stop-color]").forEach((e) => {
    for (const a of ["fill", "stroke", "stop-color"]) { const v = e.getAttribute(a); if (v && !v.startsWith("url")) e.setAttribute(a, P.css(v)); }
  });
}
