// Paletas cambiables (?paleta=a | b | c | ajuste; valores en taller.cine.paletas del JSON).
// Cada color sRGB pasa por HSV:
//   verde  → los tonos verdes/menta se acercan a un verde puro y ganan saturación;
//   cielo  → los azules claros se acercan a azul cielo y ganan saturación;
//   coral  → los rojos/corales ganan saturación y luz;
//   saturacion × y contraste (valor estirado alrededor de «pivote»).
// Se aplica al cargar y, con ?paleta=ajuste, cada vez que se suelta un deslizador: nunca por cuadro.
const lim = (x) => Math.max(0, Math.min(1, x));
const ventana = (h, centro, radio) => {           // 1 en el centro, 0 a «radio» grados (circular)
  const d = Math.abs(((h - centro + 540) % 360) - 180);
  return d < radio ? .5 + .5 * Math.cos(Math.PI * d / radio) : 0;
};
const NEUTRA = { saturacion: 1, contraste: 1, pivote: .6, verde: 0, cielo: 0, coral: 0 };

export function crearPaleta(inicial) {
  let p = inicial ? { ...NEUTRA, ...inicial } : null;
  const avisos = [];
  function rgb(r, g, b) {                           // 0..1 → 0..1
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = 60 * (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    let s = mx ? d / mx : 0, v = mx;
    const wg = ventana(h, 125, 60) * p.verde, wc = ventana(h, 205, 35) * p.cielo, wr = ventana(h, 12, 24) * p.coral;
    h += (130 - h) * wg * .8; s *= 1 + wg * .6;
    h += (212 - h) * wc * .6; s *= 1 + wc * .8;
    s *= 1 + wr * .5; v += (1 - v) * wr * .3;
    s = lim(s * p.saturacion); v = lim(p.pivote + (v - p.pivote) * p.contraste);
    h = ((h % 360) + 360) % 360 / 60;
    const c = v * s, x = c * (1 - Math.abs((h % 2) - 1)), m = v - c, k = Math.floor(h) % 6;
    const [a, b2, c2] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
    return [a + m, b2 + m, c2 + m];
  }
  const a2 = (n) => Math.round(lim(n) * 255).toString(16).padStart(2, "0");
  const hex = (h) => {                              // "#RRGGBB" o "#RGB" → "#RRGGBB"
    let s = h.replace("#", ""); if (s.length === 3) s = s.replace(/./g, (c) => c + c);
    if (!p) return "#" + s;
    const [r, g, b] = rgb(parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255);
    return "#" + a2(r) + a2(g) + a2(b);
  };
  // Reemplaza todos los colores de un texto CSS/SVG: #hex, %23hex (data-URI), rgb() y rgba().
  const css = (s) => !p ? String(s) : String(s)
    .replace(/(#|%23)([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m, pre, h) => pre + hex("#" + h).slice(1))
    .replace(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)/g, (m, r, g, b, al) => {
      const [x, y, z] = rgb(r / 255, g / 255, b / 255).map((v) => Math.round(v * 255));
      return al === undefined ? `rgb(${x}, ${y}, ${z})` : `rgba(${x}, ${y}, ${z}, ${al})`;
    });
  const num = (n) => parseInt(hex("#" + n.toString(16).padStart(6, "0")).slice(1), 16);
  return {
    get activa() { return !!p; }, get valores() { return p && { ...p }; },
    hex, css, num,
    fijar(nueva) { p = nueva ? { ...NEUTRA, ...nueva } : null; avisos.forEach((f) => f()); },
    alCambiar(f) { avisos.push(f); },
  };
}

// Pasa la paleta por el DOM (hojas de estilo propias, estilos en línea y atributos SVG). Guarda los
// colores originales la primera vez para poder reaplicar otra paleta sin acumular cambios.
export function avivarDOM(P, raiz = document) {
  const reglas = [], enLinea = new Map(), atributos = [];
  const junta = (lista) => {
    for (const r of lista) {
      if (r.cssRules) junta(r.cssRules);
      if (!r.style) continue;
      for (let i = 0; i < r.style.length; i++) {
        const k = r.style[i], v = r.style.getPropertyValue(k);
        if (/#|rgb/.test(v)) reglas.push([r.style, k, v, r.style.getPropertyPriority(k)]);
      }
    }
  };
  for (const h of document.styleSheets) { try { junta(h.cssRules); } catch { /* hoja ajena */ } }
  raiz.querySelectorAll("[style]").forEach((e) => enLinea.set(e, e.getAttribute("style")));
  raiz.querySelectorAll("svg [fill], svg [stroke], svg [stop-color]").forEach((e) => {
    for (const a of ["fill", "stroke", "stop-color"]) { const v = e.getAttribute(a); if (v && !v.startsWith("url")) atributos.push([e, a, v]); }
  });
  function aplica() {
    for (const [st, k, v, pr] of reglas) st.setProperty(k, P.css(v), pr);
    for (const [e, v] of enLinea) e.setAttribute("style", P.css(v));
    for (const [e, a, v] of atributos) e.setAttribute(a, P.css(v));
  }
  if (P.activa) aplica();
  P.alCambiar(aplica);
}
