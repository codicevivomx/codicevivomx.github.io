// Paletas cambiables (?paleta=a | ?paleta=b, valores en taller.cine.paletas del JSON).
// Cada color sRGB pasa por HSV: saturación × «saturacion» y valor estirado alrededor de «pivote»
// con «contraste». Se aplica una sola vez al cargar (CSS, SVG, canvas y materiales de three.js):
// no hay filtros ni posprocesado por cuadro.
const lim = (x) => Math.max(0, Math.min(1, x));

export function crearPaleta(p) {
  if (!p) return { activa: false, hex: (x) => x, css: (s) => s, num: (n) => n };
  const { saturacion: ks = 1, contraste: kc = 1, pivote: pv = 0.5 } = p;
  function rgb(r, g, b) {                        // 0..1 → 0..1
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const s = mx ? lim((d / mx) * ks) : 0, v = lim(pv + (mx - pv) * kc);
    const c = v * s, x = c * (1 - Math.abs(((h % 6) + 6) % 6 % 2 - 1)), m = v - c, k = Math.floor(((h % 6) + 6) % 6);
    const [a, b2, c2] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
    return [a + m, b2 + m, c2 + m];
  }
  const a2 = (n) => Math.round(lim(n) * 255).toString(16).padStart(2, "0");
  const hex = (h) => {                           // "#RRGGBB" o "#RGB" → "#RRGGBB"
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
  return { activa: true, hex, css, num };
}

// Pasa la paleta por todo el DOM una vez: hojas de estilo propias, estilos en línea y atributos SVG.
export function avivarDOM(P, raiz = document) {
  if (!P.activa) return;
  const reglas = (lista) => {
    for (const r of lista) {
      if (r.cssRules) reglas(r.cssRules);
      if (!r.style) continue;
      for (let i = 0; i < r.style.length; i++) {
        const k = r.style[i], v = r.style.getPropertyValue(k), n = P.css(v);
        if (n !== v) r.style.setProperty(k, n, r.style.getPropertyPriority(k));
      }
    }
  };
  for (const h of document.styleSheets) { try { reglas(h.cssRules); } catch { /* hoja ajena */ } }
  raiz.querySelectorAll("[style]").forEach((e) => { const v = e.getAttribute("style"), n = P.css(v); if (n !== v) e.setAttribute("style", n); });
  avivarSVG(P, raiz);
}
export function avivarSVG(P, raiz) {
  if (!P.activa) return;
  raiz.querySelectorAll("svg [fill], svg [stroke], svg [stop-color]").forEach((e) => {
    for (const a of ["fill", "stroke", "stop-color"]) { const v = e.getAttribute(a); if (v && !v.startsWith("url")) e.setAttribute(a, P.css(v)); }
  });
}
