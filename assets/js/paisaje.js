// Códice Vivo · escenas en pixel art: paisaje de la portada y sala de la biblioteca.
// Se pinta una sola vez en 5 canvas pequeños (1 pixel de arte = 2-3 px de pantalla) y el navegador los amplía.
// Sin imágenes: todo sale de ruido con semilla fija, así que el paisaje es siempre el mismo.
// Lo animado (brillo del río, humo, luciérnagas) va en 3 canvas ligeros a ~10 cuadros por segundo.
(function () {
  var mundo = document.querySelector('.mundo');
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades ---------- */
  function C(h) { return (255 << 24 | parseInt(h.slice(5, 7), 16) << 16 | parseInt(h.slice(3, 5), 16) << 8 | parseInt(h.slice(1, 3), 16)) >>> 0; }
  function R(a) { return a.map(C); }
  function hs(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
  function h2(x, y) { return hs(x * 1.31 + y * 57.77 + 0.5); }
  function n1(x) { var i = Math.floor(x), f = x - i; f = f * f * (3 - 2 * f); return hs(i) * (1 - f) + hs(i + 1) * f; }
  function fbm1(x, o) { var a = 0.5, s = 0, t = 0; for (var i = 0; i < o; i++) { s += a * n1(x); t += a; x = x * 2.03 + 17.1; a *= 0.5; } return s / t; }
  function n2(x, y) {
    var i = Math.floor(x), j = Math.floor(y), f = x - i, g = y - j; f = f * f * (3 - 2 * f); g = g * g * (3 - 2 * g);
    return (h2(i, j) * (1 - f) + h2(i + 1, j) * f) * (1 - g) + (h2(i, j + 1) * (1 - f) + h2(i + 1, j + 1) * f) * g;
  }
  function fbm2(x, y, o) { var a = 0.5, s = 0, t = 0; for (var i = 0; i < o; i++) { s += a * n2(x, y); t += a; x = x * 2.02 + 13.7; y = y * 2.02 + 7.3; a *= 0.5; } return s / t; }
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bay(x, y) { return (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }
  // Elige un color de la rampa; solo trama (dither) en una franja angosta entre dos tonos
  function pick(r, v, x, y, k) {
    var n = r.length - 1; v = v < 0 ? 0 : v > 1 ? 1 : v; var f = v * n, i = Math.floor(f); if (i >= n) return r[n];
    return ((f - i - 0.5) * (k || 2) + 0.5) > bay(x, y) ? r[i + 1] : r[i];
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- paleta: cálidos del códice + verde azulado ---------- */
  var CIELO = R(['#213C4B', '#2C5263', '#44697A', '#6E808C', '#A3868C', '#D08F78', '#EBA868', '#F6C67E', '#FBE3AE']);
  var NUBE = R(['#566A7E', '#7C7890', '#AD7F8C', '#DB957C', '#F4BC86', '#FFE4B2']);
  var SOL = R(['#FFE7A6', '#FFF6DA']);
  var BRUMA = R(['#F6CF98', '#FBE3AE']);
  var M_LEJOS = { rim: C('#F4D2A8'), luz: C('#C9B2A6'), med: C('#A3A8AE'), som: C('#8E9CA6') };
  var M_CERCA = { rim: C('#F1BE8A'), luz: C('#A8958E'), med: C('#6F8890'), som: C('#577480') };
  var SUELO = R(['#EFCB94', '#D3BC7C', '#A9AC68', '#84995C', '#5F8558', '#447058', '#325E58', '#264C4C']);
  var AGUA = R(['#FFF0C4', '#F8D79A', '#CFE0CC', '#9CCBC6', '#6FA8A8', '#4C8C90']);
  var A_LEJOS = { rim: C('#C9BE7C'), luz: C('#8FA26A'), med: C('#5E8068'), som: C('#4A6C60') };
  var A_CERCA = { rim: C('#E3C870'), luz: C('#5E8A5C'), med: C('#2A5552'), som: C('#1F4347') };
  var COL_LUZ = R(['#E6CE78', '#C2BC68', '#9BA95C', '#779456', '#5A8156', '#447058']);
  var COL_SOM = R(['#3D6A58', '#2F5A56', '#254B4C', '#1D3D42', '#173338']);
  var PIEDRA = R(['#F8D9A0', '#DDB07A', '#B48A68', '#8A6A5C', '#634E54', '#453848']);
  var TEJA = R(['#F4A680', '#D2634A', '#A5352A', '#7A2A30', '#552238']);
  var VENTANA = C('#FFD877'), VENTANA2 = C('#FFF3BE'), HOJA = C('#F3E2B8'), ORO = C('#E6C27A'), SOMBRA = C('#1F3F42');
  var FRENTE = R(['#DCCB70', '#8FA455', '#4F7A4E', '#2F5A4C', '#234848', '#1A383C', '#142C32']);
  var ROCA = R(['#F1BE8A', '#A08C88', '#6A5E6A', '#463E50', '#2C2838']);
  var FLORES = R(['#E0503F', '#F2C94C', '#FBEFD0', '#E88A6A']);

  function lienzo(c, W, H) {
    c.width = W; c.height = H; var g = c.getContext('2d'), im = g.createImageData(W, H);
    return { c: c, g: g, im: im, d: new Uint32Array(im.data.buffer), W: W, H: H };
  }
  function fin(L) { L.g.putImageData(L.im, 0, 0); }
  function put(L, x, y, c) { x |= 0; y |= 0; if (x >= 0 && x < L.W && y >= 0 && y < L.H) L.d[y * L.W + x] = c; }
  function rect(L, x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) put(L, x + i, y + j, c); }

  /* ---------- capa 0: cielo, sol y nubes ---------- */
  function cielo(L, o) {
    var W = L.W, H = L.H, d = L.d, x, y, sy = o.hz - 15 * o.k, fin_ = Math.min(H, o.hz + 30);
    for (y = 0; y < fin_; y++) for (x = 0; x < W; x++) {
      var t = Math.min(1, y / o.hz), dist = Math.hypot(x - o.sx, (y - sy) * 1.3);
      d[y * W + x] = pick(CIELO, Math.pow(t, 1.15) * 0.8 + 0.3 * Math.exp(-dist / (W * 0.12 + 34)), x, y, 1.7);
    }
    // estrellas tenues arriba
    for (var i = 0; i < 26; i++) { x = hs(i * 3.1) * W | 0; y = hs(i * 7.7 + 2) * o.hz * 0.3 | 0; put(L, x, y, hs(i) < 0.3 ? C('#FBE3AE') : C('#8FA9B4')); }
    // sol bajo
    for (y = -o.sr; y <= o.sr; y++) for (x = -o.sr; x <= o.sr; x++) { var r = Math.hypot(x, y); if (r <= o.sr + 0.3) put(L, o.sx + x, sy + y, r > o.sr - 1.6 ? SOL[0] : SOL[1]); }
    // nubes: ruido estirado a lo ancho; se iluminan por abajo (sol bajo)
    var m = new Uint8Array(W * H), k = o.k;
    for (y = 2; y < o.hz - 2; y++) for (x = 0; x < W; x++) {
      var ty = y / o.hz, env = Math.sin(Math.min(1, ty * 1.08) * Math.PI);
      var n = fbm2(x / (70 * k) + 9.1, y / (9 * k) + 3.3, 4) * 0.7 + fbm2(x / (160 * k) + 1.2, y / (26 * k), 2) * 0.3;
      if (n * (0.55 + 0.45 * env) > 0.47 + bay(x, y) * 0.03) m[y * W + x] = 1;
    }
    for (y = 2; y < o.hz - 2; y++) for (x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      var abajo = 0; for (var j = 1; j <= 5; j++) if (m[(y + j) * W + x]) abajo++;
      var arriba = 0; for (j = 1; j <= 3; j++) if (y - j >= 0 && m[(y - j) * W + x]) arriba++;
      var ds = Math.hypot(x - o.sx, (y - sy) * 1.6);
      var v = 0.05 + 0.42 * (y / o.hz) + 0.34 * Math.exp(-ds / (W * 0.2 + 40)) + 0.34 * (1 - abajo / 5) - 0.1 * (1 - arriba / 3);
      d[y * W + x] = pick(NUBE, v, x, y, 1.5);
    }
    fin(L);
  }

  /* ---------- capa 1: montañas lejanas (más claras y azuladas) ---------- */
  function sierra(L, o, base, amp, frec, sem, col, fade) {
    var W = L.W, ry = new Float32Array(W + 12), x, y;
    for (x = 0; x < W + 12; x++) { var n = fbm1((x - 6) * frec + sem, 5), r = 1 - Math.abs(2 * n - 1); ry[x] = base - amp * (0.3 * n + 0.7 * r * r); }
    var hasta = Math.min(L.H, o.hz + 8);
    for (x = 0; x < W; x++) {
      var y0 = Math.floor(ry[x + 6]);
      for (y = y0; y < hasta; y++) {
        var dd = y - y0, xs = clamp(Math.round(x + 6 - dd * 0.85 + (h2(x >> 1, y >> 1) - 0.5) * 2.4), 2, W + 9), s = ry[xs + 2] - ry[xs - 2];
        var c = s < -0.15 ? (dd < 1 ? col.rim : col.luz) : s > 1.1 ? col.som : col.med;
        var f = dd / fade; if (f * f > bay(x, y) * 0.9 + 0.1) c = pick(BRUMA, 0.2 + (y - base + amp) / (amp * 3), x, y, 1.5);
        put(L, x, y, c);
      }
    }
  }

  /* ---------- árbol (conífera o copa redonda) con sombra larga ---------- */
  function arbol(L, x, y, s, col, redondo, sinSombra) {
    var hh = Math.max(2, Math.round(s * (redondo ? 1.7 : 2.5))), hw = Math.max(1, Math.round(s * (redondo ? 1.1 : 0.95))), j, i;
    if (!sinSombra) for (i = 1; i < hh * 1.7; i++) { var yy = y + (i >> 3), xx = x + i; if (((xx + yy) & 1) || i < hh) put(L, xx, yy, SOMBRA); }
    if (s > 2.4) put(L, x, y, col.som);
    for (j = 0; j < hh; j++) {
      var f = (j + 1) / hh, w = redondo ? Math.round(hw * Math.sqrt(Math.max(0, 1 - Math.pow(2 * f - 1.15, 2) * 0.75))) : Math.round(hw * f - (s > 4 && j % 3 === 2 ? 1 : 0));
      if (w < 0) w = 0;
      for (i = -w; i <= w; i++) {
        var c = i <= -w && s > 2.2 ? col.rim : i < -w * 0.15 ? col.luz : i > w * 0.35 ? col.som : col.med;
        if (s > 3 && h2(x + i, y - j) < 0.14) c = col.som;
        put(L, x + i, y - hh + j, c);
      }
    }
  }

  /* ---------- capa 2: valle con río, bosque y niebla ---------- */
  function valle(L, o) {
    var W = L.W, H = L.H, x, y, rio = [];
    function rx(dd) { return o.sx + Math.sin(Math.pow(dd, 0.62) * 1.15 + 0.6) * (5 + dd * 0.3) + dd * o.deriva; }
    function rw(dd) { return 0.7 + dd * o.rw; }
    for (y = o.hz; y < H; y++) for (x = 0; x < W; x++) {
      var dn = (y - o.hz) / (H - o.hz), v = Math.pow(dn, 0.5) * 0.95 + (fbm2(x / 46, y / 8, 3) - 0.5) * 0.2;
      if (fbm2(x / 110 + 5, y / 26 + 2, 2) > 0.6) v += 0.1;
      put(L, x, y, pick(SUELO, v, x, y, 1.5));
    }
    // río: nace bajo el sol (refleja el cielo) y se ensancha hacia el frente
    for (y = o.hz + 1; y < H; y++) {
      var dd = y - o.hz, cx = rx(dd), hw = rw(dd), x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
      for (x = x0; x <= x1; x++) {
        var va = dd < 10 ? dd / 40 : 0.25 + 0.75 * Math.pow((dd - 10) / (H - o.hz), 0.6) + (h2(x >> 2, y) - 0.5) * 0.3;
        put(L, x, y, pick(AGUA, va, x, y, 1.6));
      }
      if (hw > 1.2) { put(L, x1 + 1, y, C('#2C5650')); put(L, x0 - 1, y, C('#D9C98A')); }
      rio.push([y, x0, x1]);
    }
    // bosque: manchones de árboles que crecen con la cercanía
    for (y = o.hz + 3; y < H + 8; y += 1 + (y - o.hz) * 0.035) {
      var d2 = y - o.hz, s = 1.2 + d2 * 0.06, col = d2 < (H - o.hz) * 0.3 ? A_LEJOS : A_CERCA, paso = Math.max(2, s * 1.5);
      for (x = (hs(y) * paso) | 0; x < W; x += paso) {
        var xx = Math.round(x + (h2(x, y | 0) - 0.5) * paso), yy = y | 0;
        if (fbm2(xx / 48 + 3, yy / 16 + 7, 3) < 0.5 || h2(xx * 3, yy * 5) > 0.72) continue;
        if (Math.abs(xx - rx(d2)) < rw(d2) + s + 2) continue;
        arbol(L, xx, yy, Math.min(9, s * (0.75 + h2(xx, yy) * 0.6)), col, h2(yy, xx) < 0.3);
      }
    }
    // niebla ligera en el fondo del valle
    for (y = o.hz - 3; y < o.hz + (H - o.hz) * 0.42; y++) for (x = 0; x < W; x++) {
      var fz = 1 - Math.abs(y - (o.hz + 9 * o.k)) / (26 * o.k); if (fz <= 0) continue;
      if (fbm2(x / 60 + 1.7, y / 5 + 4.2, 3) * fz > 0.36 + bay(x, y) * 0.5) put(L, x, y, BRUMA[(x + y) & 1]);
    }
    fin(L);
    return rio;
  }

  /* ---------- capa 3: colina con el castillo-biblioteca ---------- */
  function castillo(L, o) {
    var W = L.W, H = L.H, k = o.k, cx = Math.round(o.cx), by = o.by, cw = 31 * k, x, y, i, j;
    function hy(x) { var dx = Math.max(0, Math.abs(x - cx) - cw * 0.8); return by + Math.pow(dx / o.hw, 1.75) * o.caida + (fbm1(x * 0.07 + 3, 2) - 0.5) * 3 * (dx > 0 ? 1 : 0); }
    for (x = 0; x < W; x++) {
      var y0 = Math.round(hy(x)), lado = clamp((x - (cx - cw * 0.3)) / (cw * 1.5), 0, 1);
      for (y = y0; y < H; y++) {
        var dd = y - y0, t = Math.pow(dd / (H - by), 0.6) + (fbm2(x / 20, y / 5, 2) - 0.5) * 0.25;
        var c = lado + (h2(x >> 2, y >> 2) - 0.5) * 0.1 > bay(x, y) * 0.22 + 0.3 ? pick(COL_SOM, t * 1.1, x, y, 1.5) : pick(COL_LUZ, t * 1.25 + (dd < 1 ? -0.3 : 0), x, y, 1.5);
        if (dd === 0 && lado < 0.4) c = COL_LUZ[0];
        put(L, x, y, c);
      }
    }
    // camino que baja de la puerta
    for (j = 0; j < H - by; j++) { var px = cx - 2 * k - j * 0.95 + Math.sin(j * 0.16) * 5, py = by + 8 * k * 0 + j + 1, w = 1 + (j / 40 | 0); if (py >= hy(px)) for (i = 0; i < w; i++) put(L, px + i, py, ((j + i) & 3) ? C('#EBD3A0') : C('#C9A878')); }
    // arbolitos en las laderas
    for (i = 0; i < 16 * k; i++) { x = cx + (hs(i * 9.3) - 0.5) * W * 0.95; if (Math.abs(x - cx) < cw + 4) continue; y = hy(x) + 2 + hs(i * 4.1) * 30 * k; if (y < H + 6) arbol(L, x | 0, y | 0, 2.5 + hs(i * 2.7) * 3.5 * k, A_CERCA, hs(i) < 0.4); }

    /* piezas del castillo (luz desde la izquierda) */
    function tono(f) { return f < 0.1 ? 0 : f < 0.36 ? 1 : f < 0.62 ? 2 : f < 0.86 ? 3 : 4; }
    function torre(x, yb, w, h, libros) {
      for (var jj = 0; jj < h; jj++) for (var ii = 0; ii < w; ii++) {
        var q = tono(ii / (w - 1)), yy = yb - 1 - jj, banda = libros ? 5 + k : 4 * k;
        if (jj % banda === 0 && jj > 0) q = Math.min(5, q + 1);                 // junta entre «libros» o hiladas
        else if (h2(x + ii, yy) < 0.07) q = Math.min(5, q + 1);                 // ladrillo suelto
        if (libros && ((jj / banda | 0) & 1) && q > 0 && q < 4) q += (ii + (jj / banda | 0)) % 2 ? 0 : 0;
        put(L, x + ii, yy, PIEDRA[q]);
        if (libros && jj % banda === (banda >> 1) && (ii === 1 || ii === 3) && w > 6) put(L, x + ii, yy, ORO); // filetes de lomo
      }
      for (ii = 0; ii < w; ii += 2) put(L, x + ii, yb - h - 1, PIEDRA[tono(ii / (w - 1))]);  // almenas
    }
    function cono(xc, yb, w, h, bandera) {
      for (var jj = 0; jj <= h; jj++) {
        var half = Math.round((w / 2 + 1) * (jj / h));
        for (var ii = -half; ii <= half; ii++) put(L, xc + ii, yb - h + jj, TEJA[ii <= -half ? 0 : ii < -half * 0.2 ? 1 : ii < half * 0.3 ? 2 : ii < half * 0.75 ? 3 : 4]);
        if (jj % (2 + k) === 1) for (ii = -half + 1; ii < half; ii += 2) put(L, xc + ii, yb - h + jj, TEJA[ii < 0 ? 2 : 4]);  // tejas
      }
      rect(L, xc, yb - h - 2 * k, 1, 2 * k, PIEDRA[5]);
      if (bandera) { rect(L, xc + 1, yb - h - 2 * k, 2 * k, k, TEJA[1]); rect(L, xc + 1, yb - h - 2 * k, k, k, TEJA[0]); }
    }
    function ventana(x, y, w, h) { rect(L, x, y, w, h, VENTANA); rect(L, x, y, w, 1, VENTANA2); put(L, x + w, y + h - 1, PIEDRA[5]); rect(L, x - 1, y + h, w + 2, 1, PIEDRA[1]); }
    var info = { ventanas: [] };
    function vent(x, y, w, h) { ventana(x, y, w, h); info.ventanas.push([x, y, w, h]); }

    // torres de atrás
    torre(cx - 31 * k, by, 8 * k, 22 * k); cono(cx - 27 * k, by - 22 * k - 1, 8 * k, 9 * k);
    vent(cx - 28 * k, by - 16 * k, k, 2 * k); vent(cx - 27 * k + k, by - 9 * k, k, 2 * k);
    torre(cx + 20 * k, by, 7 * k, 30 * k); cono(cx + 23 * k + (k >> 1), by - 30 * k - 1, 7 * k, 10 * k, true);
    vent(cx + 22 * k, by - 24 * k, k, 2 * k); vent(cx + 24 * k, by - 15 * k, k, 2 * k);
    // torre alta: una pila de libros de piedra
    torre(cx + 3 * k, by, 11 * k, 48 * k, true); cono(cx + 8 * k + (k >> 1), by - 48 * k - 1, 11 * k, 13 * k, true);
    for (j = 0; j < 4; j++) vent(cx + 6 * k + (j % 2) * 3 * k, by - 43 * k + j * 5 * k, k, 2 * k);
    // torre izquierda
    torre(cx - 21 * k, by, 8 * k, 35 * k); cono(cx - 17 * k, by - 35 * k - 1, 8 * k, 11 * k, true);
    for (j = 0; j < 3; j++) vent(cx - 19 * k + (j % 2) * 3 * k, by - 30 * k + j * 7 * k, k, 2 * k);
    // nave central (sala de lectura) con tejado a dos aguas y chimenea
    var nx = cx - 12 * k, nw = 17 * k, nh = 24 * k;
    for (j = 0; j < nh; j++) for (i = 0; i < nw; i++) { var q = tono(i / (nw - 1) * 0.8); if (j % (4 * k) === 0 || h2(nx + i, j) < 0.06) q = Math.min(5, q + 1); put(L, nx + i, by - 1 - j, PIEDRA[q]); }
    rect(L, nx + nw - 5 * k, by - nh - 9 * k, 2 * k, 6 * k, PIEDRA[3]); rect(L, nx + nw - 5 * k, by - nh - 9 * k, 1, 6 * k, PIEDRA[1]); rect(L, nx + nw - 5 * k - 1, by - nh - 9 * k - 1, 2 * k + 2, 1, PIEDRA[4]);
    info.humo = [nx + nw - 4 * k, by - nh - 9 * k - 2];
    for (j = 0; j <= 9 * k; j++) { var half = Math.round((nw / 2 + 2) * (j / (9 * k))); for (i = -half; i <= half; i++) put(L, nx + (nw >> 1) + i, by - nh - 9 * k + j, TEJA[i <= -half ? 0 : i < -half * 0.1 ? 1 : i < half * 0.4 ? 2 : 3]); if (j % (2 + k) === 1) for (i = -half + 1; i < half; i += 2) put(L, nx + (nw >> 1) + i, by - nh - 9 * k + j, TEJA[i < 0 ? 2 : 4]); }
    // ventanal con arco (la biblioteca encendida) y ventanas chicas
    var vx = nx + (nw >> 1) - 2 * k, vy = by - 17 * k; rect(L, vx - 1, vy - 1, 4 * k + 2, 8 * k + 1, PIEDRA[5]); vent(vx, vy, 4 * k, 8 * k);
    put(L, vx, vy, PIEDRA[5]); put(L, vx + 4 * k - 1, vy, PIEDRA[5]); rect(L, vx + 2 * k - (k > 1 ? 1 : 0), vy, 1, 8 * k, PIEDRA[4]); rect(L, vx, vy + 3 * k, 4 * k, 1, PIEDRA[4]);
    // estantes con libros tras el ventanal (detalle sutil)
    for (i = 0; i < 4 * k; i++) if (i !== 2 * k - (k > 1 ? 1 : 0)) { put(L, vx + i, vy + 3 * k - 1, i % 3 ? TEJA[1] : C('#2F6F73')); put(L, vx + i, vy + 8 * k - 1, i % 2 ? C('#B08A3E') : TEJA[2]); }
    vent(nx + 2 * k, by - 19 * k, k, 2 * k); vent(nx + nw - 3 * k, by - 19 * k, k, 2 * k); vent(nx + 2 * k, by - 12 * k, k, 2 * k); vent(nx + nw - 3 * k, by - 12 * k, k, 2 * k);
    // muralla con contrafuertes que parecen libros de pie
    var mx = cx - 33 * k, mw = 62 * k, mh = 8 * k;
    for (j = 0; j < mh; j++) for (i = 0; i < mw; i++) { q = tono(i / (mw - 1) * 0.9); if (j === 0) q = Math.max(0, q - 1); if (j % (3 * k) === 2 || h2(mx + i, j + 9) < 0.07) q = Math.min(5, q + 1); put(L, mx + i, by - mh + j + 2, PIEDRA[q]); }
    for (i = 0; i < mw; i += 2) put(L, mx + i, by - mh + 1, PIEDRA[tono(i / (mw - 1) * 0.9)]);
    var tapas = [TEJA[2], C('#2F6F73'), C('#B08A3E'), TEJA[3], C('#3F5A4A')];
    for (i = 3 * k, j = 0; i < mw - 2 * k; i += 6 * k, j++) {
      if (Math.abs(mx + i - cx) < 4 * k) continue;
      var bh = mh + 1 + (j % 3), bx = mx + i;
      rect(L, bx, by + 2 - bh, 2 * k, bh, tapas[j % 5]); rect(L, bx, by + 2 - bh, 1, bh, PIEDRA[1]); rect(L, bx + 2 * k - 1, by + 2 - bh, 1, bh, PIEDRA[5]);
      rect(L, bx, by + 2 - bh, 2 * k, 1, HOJA); if (bh > 6) rect(L, bx + (k > 1 ? 1 : 0), by + 2 - bh + 2, k, 1, ORO);
    }
    // puerta con arco, luz adentro
    rect(L, cx - 2 * k - 1, by - 5 * k, 4 * k + 2, 5 * k + 2, PIEDRA[5]); rect(L, cx - 2 * k, by - 5 * k + 1, 4 * k, 5 * k + 1, C('#7A3A2C')); rect(L, cx - k, by - 3 * k, 2 * k, 3 * k + 2, VENTANA); put(L, cx - 2 * k, by - 5 * k + 1, PIEDRA[5]); put(L, cx + 2 * k - 1, by - 5 * k + 1, PIEDRA[5]);
    fin(L);
    return info;
  }

  /* ---------- capa 4: primer plano (pasto, flores y rocas), más contrastado ---------- */
  function frente(L, o) {
    var W = L.W, H = L.H, x, y, i, j;
    function fy(x) { return o.fy - o.loma * Math.exp(-Math.pow((x - o.gx) / o.lw, 2)) + (fbm1(x * 0.05 + 8, 3) - 0.5) * 7; }
    for (x = 0; x < W; x++) {
      var y0 = Math.round(fy(x)), pend = fy(x + 3) - fy(x - 3), brizna = (h2(x, 3) * 5) | 0;
      for (y = y0 - brizna; y < H; y++) {
        var dd = y - y0, c;
        if (dd < 0) c = FRENTE[h2(x, y) < 0.45 ? 1 : dd === -brizna ? 0 : 2];                        // briznas con la punta encendida
        else c = pick(FRENTE, 0.3 + Math.pow(dd / 34, 0.7) * 0.7 + (pend < -0.4 ? -0.16 : pend > 0.4 ? 0.1 : 0) + (h2(x >> 1, y >> 1) - 0.5) * 0.16, x, y, 1.4);
        put(L, x, y, c);
      }
      // briznas sueltas dentro del pasto
      for (j = 0; j < 4; j++) { var by = y0 + 3 + ((h2(x, j + 20) * 40) | 0); if (h2(x * 7, j) < 0.2) { put(L, x, by, FRENTE[2]); put(L, x, by - 1, FRENTE[h2(x, j) < 0.3 ? 1 : 2]); } }
    }
    // rocas con luz de contorno y sombra larga
    for (i = 0; i < o.rocas.length; i++) {
      var rx = Math.round(o.rocas[i][0]), rw = o.rocas[i][1], rh = Math.round(rw * 0.62), ry = Math.round(fy(rx)) + 2;
      for (j = 1; j < rw * 2.2; j++) for (var q = 0; q < 2; q++) if ((j + q) & 1 || j < rw) put(L, rx + j, ry + q - 1 + (j >> 3), FRENTE[6]);
      for (y = 0; y < rh; y++) { var half = Math.round(rw / 2 * Math.sqrt(1 - Math.pow((rh - 1 - y) / rh, 2.2))); for (x = -half; x <= half; x++) { var f = (x + half) / (2 * half + 0.01), g = y / rh; put(L, rx + x, ry - rh + y, ROCA[(x === -half || (y === 0 && f < 0.6)) ? 0 : f < 0.3 && g < 0.6 ? 1 : f < 0.62 ? 2 : g > 0.75 ? 4 : 3]); } }
    }
    // flores
    for (i = 0; i < W * 0.34; i++) {
      x = (hs(i * 5.3 + 1) * W) | 0; y = Math.round(fy(x)) + 1 + ((Math.pow(hs(i * 2.9), 1.6) * 26) | 0); if (Math.abs(x - o.gx) < 20 && y < fy(x) + 6) continue;
      var c2 = FLORES[(hs(i * 1.7) * 4) | 0]; put(L, x, y, FRENTE[2]); put(L, x, y - 1, FRENTE[2]); put(L, x, y - 2, c2);
      if (hs(i * 8.1) < 0.5) { put(L, x - 1, y - 2, c2); put(L, x + 1, y - 2, c2); put(L, x, y - 3, c2); put(L, x, y - 2, FLORES[1]); }
    }
    // sombra larga de los gatos
    var gy = Math.round(fy(o.gx));
    for (j = 0; j < 46; j++) for (i = 0; i < 3; i++) if ((j + i) & 1 || j < 26) put(L, o.gx + 8 + j, gy + 1 + i + (j >> 4), FRENTE[6]);
    fin(L);
    return gy;
  }

  function montaPaisaje() {
  /* ---------- montaje ---------- */
  var capas = {}, fx = {}, estado = null, ancho0 = 0;
  mundo.querySelectorAll('canvas[data-capa]').forEach(function (c) { capas[c.getAttribute('data-capa')] = c; });
  mundo.querySelectorAll('canvas[data-fx]').forEach(function (c) { fx[c.getAttribute('data-fx')] = c; });
  var gatos = mundo.querySelector('.gatos');

  function pinta() {
    var vw = mundo.clientWidth, vh = mundo.clientHeight, px = vw >= 1500 ? 3 : 2, M = 12, grande = vw >= 800;
    var Wv = Math.ceil(vw / px), Hv = Math.ceil(vh / px), W = Wv + 2 * M, H = Hv + M;
    var o = { k: grande ? 2 : 1, hz: Math.round(Hv * (grande ? 0.5 : 0.31)), sx: Math.round(M + Wv * (grande ? 0.5 : 0.24)), sr: grande ? 13 : 8,
      cx: M + Wv * (grande ? 0.77 : 0.67), gx: Math.round(M + Wv * (grande ? 0.6 : 0.5)), deriva: grande ? -0.08 : 0.04, rw: grande ? 0.075 : 0.05 };
    o.by = o.hz + (grande ? 4 : -5); o.hw = Wv * (grande ? 0.2 : 0.3); o.caida = (H - o.by) * (grande ? 0.5 : 0.62);
    o.fy = Math.round(Hv * (grande ? 0.86 : 0.86)); o.loma = grande ? 26 : 9; o.lw = grande ? 70 : 46;
    o.rocas = grande ? [[M + Wv * 0.47, 15], [M + Wv * 0.69, 22], [M + Wv * 0.9, 12], [M + Wv * 0.2, 10]] : [[M + Wv * 0.14, 12], [M + Wv * 0.84, 15]];
    var est = {};
    Object.keys(capas).concat(Object.keys(fx).map(function (n) { return 'fx' + n; })).forEach(function (n) {
      var c = n.slice(0, 2) === 'fx' ? fx[n.slice(2)] : capas[n];
      c.style.width = W * px + 'px'; c.style.height = H * px + 'px'; c.style.left = -M * px + 'px';
    });
    cielo(lienzo(capas.cielo, W, H), o);
    var Lm = lienzo(capas.sierra, W, H);
    sierra(Lm, o, o.hz - 2 * o.k, 30 * o.k, 0.016 / o.k, 3.7, M_LEJOS, 26 * o.k);
    sierra(Lm, o, o.hz + 3 * o.k, 21 * o.k, 0.027 / o.k, 41.3, M_CERCA, 22 * o.k);
    fin(Lm);
    est.rio = valle(lienzo(capas.valle, W, H), o);
    est.cas = castillo(lienzo(capas.castillo, W, H), o);
    var gy = frente(lienzo(capas.frente, W, H), o);
    if (gatos) { gatos.style.left = (o.gx - M - 17) * px + 'px'; gatos.style.top = (gy - 16) * px + 'px'; gatos.style.width = 34 * px + 'px'; mundo.style.setProperty('--px', px + 'px'); }
    ['rio', 'humo', 'luz'].forEach(function (n) { if (fx[n]) { fx[n].width = W; fx[n].height = H; } });
    est.o = o; est.W = W; est.H = H; est.Hv = Hv; estado = est; ancho0 = vw;
    mundo.classList.add('mundo--listo');
  }
  pinta();
  var espera;
  window.addEventListener('resize', function () { if (mundo.clientWidth === ancho0) return; clearTimeout(espera); espera = setTimeout(pinta, 200); });

  /* ---------- animación ligera (~10 cuadros/s): río, humo, ventanas y luciérnagas ---------- */
  if (quieto || !fx.rio) return;
  var gr = fx.rio.getContext('2d'), gh = fx.humo.getContext('2d'), gl = fx.luz.getContext('2d'), visible = true, tic = 0, motas = [], humo = [];
  for (var i = 0; i < 22; i++) motas.push([hs(i * 3.3), hs(i * 5.1 + 1), hs(i * 7.7) * 6.28, 0.4 + hs(i * 1.3)]);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(mundo);
  setInterval(function () {
    if (!visible || document.hidden || !estado) return;
    tic++;
    var e = estado, o = e.o, W = e.W, H = e.H, i, x, y;
    // brillo del agua: destellos cortos que cambian de sitio
    gr.clearRect(0, 0, W, H);
    for (i = 0; i < e.rio.length; i++) {
      var r = e.rio[i], an = r[2] - r[1]; if (an < 1) continue;
      var n = 1 + (an >> 4);
      for (var q = 0; q < n; q++) {
        var s = hs(i * 13.1 + q * 7.3 + (tic >> 2) * 3.7); if (s > 0.42) continue;
        x = r[1] + ((hs(i * 3.7 + q + (tic >> 2)) * an) | 0); var w = 1 + ((s * 9) | 0);
        gr.fillStyle = (tic + i) & 4 ? '#FFF6DA' : '#FBE3AE'; gr.fillRect(x, r[0], Math.min(w, r[2] - x + 1), 1);
      }
    }
    // humo de la chimenea
    gh.clearRect(0, 0, W, H);
    if (tic % 4 === 0) humo.push([e.cas.humo[0], e.cas.humo[1], 0, hs(tic) * 6]);
    for (i = humo.length - 1; i >= 0; i--) {
      var p = humo[i]; p[2]++; p[1] -= 0.5; p[0] += 0.18 + Math.sin((p[2] + p[3]) * 0.15) * 0.25;
      if (p[2] > 70) { humo.splice(i, 1); continue; }
      var t = p[2] / 70, rad = 1 + t * 4;
      for (y = -rad; y <= rad; y++) for (x = -rad; x <= rad; x++) {
        if (x * x + y * y > rad * rad) continue;
        var xx = Math.round(p[0] + x), yy = Math.round(p[1] + y);
        if (bay(xx, yy) > 0.85 - t * 0.75) { gh.fillStyle = (x + y) < 0 ? '#F2D2B0' : '#B9A0A4'; gh.fillRect(xx, yy, 1, 1); }
      }
    }
    // ventanas que titilan
    for (i = 0; i < e.cas.ventanas.length; i++) { var v = e.cas.ventanas[i]; if (hs(i * 9.1 + (tic >> 3)) < 0.12) { gh.fillStyle = '#F2B552'; gh.fillRect(v[0], v[1] + 1, v[2], v[3] - 1); } }
    // luciérnagas y motas de luz en el primer plano
    gl.clearRect(0, 0, W, H);
    for (i = 0; i < motas.length; i++) {
      var m = motas[i], a = tic * 0.02 * m[3] + m[2];
      x = Math.round(m[0] * W + Math.sin(a) * 9 + Math.sin(a * 0.37) * 14); y = Math.round(e.Hv * (0.6 + m[1] * 0.34) + Math.cos(a * 0.8) * 6);
      var b = Math.sin(tic * 0.11 * m[3] + m[2] * 3);
      if (b < -0.2) continue;
      gl.fillStyle = b > 0.6 ? '#FFF6C8' : '#F2D777'; gl.fillRect(x, y, 1, 1);
      if (b > 0.75) { gl.fillStyle = 'rgba(255,230,150,.45)'; gl.fillRect(x - 1, y, 3, 1); gl.fillRect(x, y - 1, 1, 3); }
    }
  }, 100);
  }
  if (mundo) montaPaisaje();

  /* =====================================================================
     Biblioteca: sala interior (ventanal al castillo, estantes altos, luz cálida, polvo flotando)
     ===================================================================== */
  var MADERA = R(['#F2C78A', '#C8915A', '#9A6A42', '#74492F', '#523326', '#3A2420', '#291A1C']);
  var MURO = R(['#F0C088', '#C2906A', '#93695A', '#6B4E4C', '#4B3944', '#33283A']);
  var LOMOS = ['#A5352A', '#7A241C', '#2F6F73', '#1F4E52', '#B08A3E', '#D9B26A', '#5A3540', '#6B4A32', '#3F5A4A', '#C4553F', '#E3CFA0', '#8C5A3C'];
  function mezcla(h, g, t) { var a = [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }), b = [1, 3, 5].map(function (i) { return parseInt(g.slice(i, i + 2), 16); }); return (255 << 24 | Math.round(a[2] + (b[2] - a[2]) * t) << 16 | Math.round(a[1] + (b[1] - a[1]) * t) << 8 | Math.round(a[0] + (b[0] - a[0]) * t)) >>> 0; }
  var LOMO_LUZ = LOMOS.map(function (c) { return mezcla(c, '#FFE2A8', 0.22); }), LOMO_MED = LOMOS.map(C), LOMO_SOM = LOMOS.map(function (c) { return mezcla(c, '#1C1424', 0.5); });

  function sala(L, k) {
    var W = L.W, H = L.H, cx = W >> 1, piso = Math.round(H * 0.68), r = Math.round(Math.min(W * 0.19, 34 * k)), wy0 = Math.round(H * 0.07), yc = wy0 + r, base = piso - 5 * k, x, y, i, j;
    function dentro(x, y, m) { return y < base && x > cx - r + m && x < cx + r - m && (y >= yc ? y > wy0 : Math.hypot(x - cx, y - yc) < r - m); }
    // muro de piedra: más claro junto al ventanal
    for (y = 0; y < piso; y++) for (x = 0; x < W; x++) {
      var d = Math.abs(x - cx) / (W * 0.5), v = 0.16 + d * 0.9 + (y / piso) * 0.08 + (h2(x >> 2, y >> 2) - 0.5) * 0.07;
      var fila = (y / (7 * k)) | 0; if (y % (7 * k) === 0 || (x + (fila & 1) * 6 * k) % (12 * k) === 0) v += 0.13;
      put(L, x, y, pick(MURO, v, x, y, 1.4));
    }
    // ventanal: atardecer, sierra, colina y castillo a lo lejos
    var hc = cx + r * 0.28, hb = base - 20 * k;
    for (y = wy0; y < base; y++) for (x = cx - r; x <= cx + r; x++) {
      if (!dentro(x, y, 0)) continue;
      var t = (y - wy0) / (base - wy0), sx = cx - r * 0.42, sy = base - 21 * k, ds = Math.hypot(x - sx, (y - sy) * 1.2), c;
      c = pick(CIELO, 0.3 + t * 0.62 + 0.3 * Math.exp(-ds / (r * 0.7)), x, y, 1.6);
      if (ds < 4 * k) c = SOL[ds < 3 * k ? 1 : 0];
      if (fbm2(x / (22 * k) + 4, y / (4 * k) + 1, 3) > 0.6 && t < 0.62) c = pick(NUBE, 0.35 + t * 0.6 + (fbm2(x / (22 * k) + 4, (y + 2) / (4 * k) + 1, 3) > 0.6 ? 0 : 0.3), x, y, 1.5);
      var my = base - 12 * k - (1 - Math.abs(2 * fbm1(x * 0.06 / k + 9, 4) - 1)) * 13 * k;
      if (y > my) c = (fbm1((x + 2) * 0.06 / k + 9, 4) > fbm1((x - 2) * 0.06 / k + 9, 4)) ? M_CERCA.luz : M_CERCA.med;
      var hy = hb + Math.pow(Math.abs(x - hc) / (r * 0.95), 1.8) * 16 * k;
      if (y > hy) c = x < hc ? pick(COL_LUZ, 0.3 + (y - hy) / (20 * k), x, y, 1.5) : pick(COL_SOM, (y - hy) / (24 * k), x, y, 1.5);
      if (y > base - 6 * k && y > hy + 6 * k) c = pick(SUELO, 0.6 + (y - base + 6 * k) / (12 * k), x, y, 1.5);
      put(L, x, y, c);
    }
    // castillo diminuto sobre la colina
    var tw = [[-6, 9, 3], [-2, 13, 3], [2, 17, 3], [6, 10, 3], [-1, 7, 5]];
    for (i = 0; i < tw.length; i++) {
      var tx = Math.round(hc + tw[i][0] * k), th = tw[i][1] * k, an = tw[i][2] * k - (k > 1 ? 1 : 0);
      for (j = 0; j < th; j++) for (x = 0; x < an; x++) if (dentro(tx + x, hb - j, 0)) put(L, tx + x, hb - j, PIEDRA[x === 0 ? 1 : x < an / 2 ? 2 : 4]);
      for (j = 0; j < 3 * k; j++) for (x = -((j * (an / 2 + 1) / (3 * k)) | 0); x <= ((j * (an / 2 + 1) / (3 * k)) | 0); x++) put(L, tx + (an >> 1) + x, hb - th - 3 * k + j, TEJA[x < 0 ? 1 : 3]);
      if (i < 4) put(L, tx + 1, hb - th + 3 * k, VENTANA);
    }
    // marco y parteluces del ventanal
    for (y = wy0 - 3 * k; y < base + 1; y++) for (x = cx - r - 3 * k; x <= cx + r + 3 * k; x++) {
      if (dentro(x, y, 0)) { if (Math.abs(x - cx) < Math.max(1, k * 0.75) || (y - wy0) % (15 * k) === 0 || !dentro(x, y, k)) put(L, x, y, MADERA[!dentro(x, y, k) && x < cx ? 2 : 5]); continue; }
      var fuera = y >= yc ? Math.abs(x - cx) - r : Math.hypot(x - cx, y - yc) - r;
      if (fuera >= 0 && fuera < 3 * k && y < base) put(L, x, y, PIEDRA[fuera < k ? 0 : x < cx ? 1 : 2]);
    }
    rect(L, cx - r - 4 * k, base, 2 * r + 8 * k + 1, 2 * k, PIEDRA[1]); rect(L, cx - r - 4 * k, base + 2 * k, 2 * r + 8 * k + 1, k, PIEDRA[4]);
    // estantes altos a los lados, llenos de libros
    var mw = 30 * k, sh = 12 * k, m0 = cx - r - 7 * k, lado, n, m;
    for (lado = -1; lado <= 1; lado += 2) for (n = 0; ; n++) {
      var x0 = lado < 0 ? m0 - (n + 1) * mw : cx + r + 7 * k + n * mw; if (x0 > W || x0 + mw < 0) break;
      var dist = clamp((Math.abs(x0 + mw / 2 - cx) - r) / (W * 0.42), 0, 1);
      rect(L, x0, 2 * k, mw, piso - 2 * k, MADERA[5]); rect(L, x0 + k, 3 * k, mw - 2 * k, piso - 3 * k, MADERA[6]);
      rect(L, x0, 2 * k, mw, k, MADERA[3]); rect(L, x0 + (lado < 0 ? mw - k : 0), 2 * k, k, piso - 2 * k, MADERA[dist < 0.5 ? 2 : 4]);
      for (y = piso - 1; y > 6 * k; y -= sh) {
        rect(L, x0 + k, y - k + 1, mw - 2 * k, k, MADERA[dist < 0.4 ? 2 : 3]); rect(L, x0 + k, y - k + 1, mw - 2 * k, 1, MADERA[dist < 0.4 ? 1 : 2]);
        for (x = x0 + 2 * k; x < x0 + mw - 3 * k;) {
          var s1 = h2(x * 3.1 + n, y * 1.7 + lado), bw = k + ((h2(x, y) * 2 * k) | 0) + (k > 1 ? 0 : 1), bh = 6 * k + ((h2(y, x) * 4 * k) | 0), ci = (s1 * 97 | 0) % LOMOS.length;
          if (s1 > 0.93) { x += 2 * k + ((s1 * 30) | 0) % (3 * k); continue; }                          // hueco
          var pal = (1 - dist) * 0.9 + (h2(x >> 1, y) - 0.5) * 0.2;
          for (j = 0; j < bh; j++) for (i = 0; i < bw; i++) put(L, x + i, y - k - j, (pal > 0.62 && i === 0) || pal > 0.85 ? LOMO_LUZ[ci] : pal > 0.34 ? LOMO_MED[ci] : LOMO_SOM[ci]);
          if (bh > 7 * k && bw > 1) { rect(L, x, y - k - bh + 2 * k, bw, 1, pal > 0.34 ? ORO : C('#7A6238')); if (s1 < 0.4) rect(L, x, y - 3 * k, bw, 1, pal > 0.34 ? ORO : C('#7A6238')); }
          x += bw + (s1 < 0.05 ? 1 : 0);
        }
      }
    }
    // escalera recargada en el estante izquierdo
    var ex = m0 - mw * 0.55;
    for (j = 0; j < piso - 10 * k; j++) { var xx = Math.round(ex + j * 0.24); rect(L, xx, piso - j, k, 1, MADERA[1]); rect(L, xx + 7 * k, piso - j, k, 1, MADERA[2]); if (j % (5 * k) === 2 * k) rect(L, xx, piso - j, 8 * k, Math.max(1, k - 1), MADERA[1]); }
    // piso de duela con el charco de luz del ventanal
    for (y = piso; y < H; y++) for (x = 0; x < W; x++) {
      var tp = (y - piso) / (H - piso), u = (x - cx) / (1 + tp * 1.5), luz = Math.abs(x - cx - (y - piso) * 0.55) < r * (0.75 + tp * 0.9) ? -0.26 : 0;
      var vv = 0.42 + tp * 0.12 + Math.min(0.3, Math.abs(x - cx) / W * 0.5) + luz + (h2(x >> 3, y) - 0.5) * 0.08;
      if ((Math.round(u) % (10 * k) + 10 * k) % (10 * k) === 0) vv += 0.16;
      if (((y - piso) * (y - piso) / (7 * k) | 0) !== ((y - piso - 1) * (y - piso - 1) / (7 * k) | 0)) vv += 0.12;
      put(L, x, y, pick(MADERA, vv, x, y, 1.4));
    }
    rect(L, 0, piso, W, 1, MADERA[6]);
    // tapete
    for (y = piso + Math.round((H - piso) * 0.3); y < H; y++) { var ta = (y - piso) / (H - piso), half = Math.round(r * (0.7 + ta * 1.1)); for (x = -half; x <= half; x++) { var bd = half - Math.abs(x); put(L, cx + x + ((y - piso) * 0.25 | 0), y, bd < 2 * k ? ORO : bd < 3 * k ? TEJA[3] : ((x + y) % (6 * k) === 0 ? TEJA[1] : TEJA[2])); } }
    // mesa de lectura con libro abierto y vela
    var mx = Math.round(cx + r + 14 * k), mty = piso + Math.round((H - piso) * 0.22), ml = 34 * k;
    rect(L, mx + 2 * k, mty + 3 * k, 2 * k, H - mty, MADERA[4]); rect(L, mx + ml - 4 * k, mty + 3 * k, 2 * k, H - mty, MADERA[5]);
    rect(L, mx, mty, ml, 3 * k, MADERA[2]); rect(L, mx, mty, ml, 1, MADERA[0]); rect(L, mx, mty + 3 * k - 1, ml, 1, MADERA[4]);
    rect(L, mx + 6 * k, mty - 2 * k, 12 * k, 2 * k, HOJA); rect(L, mx + 6 * k, mty - 1, 12 * k, 1, C('#D8C394')); rect(L, mx + 12 * k - 1, mty - 2 * k, 1, 2 * k, C('#B08A3E')); rect(L, mx + 5 * k, mty - 1, 14 * k, 1, TEJA[2]);
    for (i = 0; i < 4; i++) { rect(L, mx + 7 * k + i * 0, mty - 2 * k + 0, 0, 0, 0); }
    var vx = mx + 25 * k, vy = mty - 6 * k; rect(L, vx, vy, 2 * k, 6 * k, HOJA); rect(L, vx + 2 * k - 1, vy, 1, 6 * k, C('#D8C394')); rect(L, vx - k, mty - 1, 4 * k, 1, ORO);
    rect(L, vx + (k > 1 ? 0 : 0), vy - 3 * k, 2 * k, 3 * k, C('#F6C65B')); rect(L, vx + (k >> 1), vy - 2 * k, k, 2 * k, VENTANA2);
    for (y = -9 * k; y <= 5 * k; y++) for (x = -9 * k; x <= 10 * k; x++) { var dd = Math.hypot(x, y); if (dd > 3 * k && dd < 9 * k && bay(vx + x, vy + y) < 0.3 - dd / (40 * k)) put(L, vx + k + x, vy - 2 * k + y, BRUMA[0]); }
    // rayos de luz que entran por el ventanal (tramado ralo)
    for (y = yc; y < H; y++) for (x = 0; x < W; x++) {
      if (dentro(x, y, -3 * k)) continue;
      var rel = x - cx - (y - yc) * 0.55, fz = 1 - (y - yc) / (H - yc) * 0.5;
      if (Math.abs(rel) < r * 0.95 && ((rel / (7 * k)) | 0) % 2 === 0 && bay(x, y) < 0.2 * fz) put(L, x, y, BRUMA[0]);
    }
    fin(L);
    return { cx: cx, yc: yc, r: r, vela: [vx, vy - 3 * k], k: k };
  }

  var salaEl = document.querySelector('.sala');
  if (salaEl) (function () {
    var lz = salaEl.querySelector('canvas[data-sala]'), fxc = salaEl.querySelector('canvas[data-sala-fx]'), est = null, ancho0 = 0;
    function pinta() {
      var vw = salaEl.clientWidth, vh = salaEl.clientHeight, px = vw >= 1500 ? 3 : 2, W = Math.ceil(vw / px), H = Math.ceil(vh / px);
      [lz, fxc].forEach(function (c) { c.style.width = W * px + 'px'; c.style.height = H * px + 'px'; });
      var L = lienzo(lz, W, H); est = sala(L, vw >= 800 ? 2 : 1); est.W = W; est.H = H; fxc.width = W; fxc.height = H; ancho0 = vw;
      salaEl.classList.add('sala--lista');
    }
    pinta();
    var espera; window.addEventListener('resize', function () { if (salaEl.clientWidth === ancho0) return; clearTimeout(espera); espera = setTimeout(pinta, 200); });
    if (quieto) return;
    // polvo flotando en la luz y llama de la vela, a ~10 cuadros por segundo
    var g = fxc.getContext('2d'), tic = 0, polvo = [], visible = true;
    for (var i = 0; i < 46; i++) polvo.push([hs(i * 2.3), hs(i * 5.9 + 3), hs(i * 9.1) * 6.28, 0.3 + hs(i * 1.1)]);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(salaEl);
    setInterval(function () {
      if (!visible || document.hidden || !est) return;
      tic++; g.clearRect(0, 0, est.W, est.H);
      for (var i = 0; i < polvo.length; i++) {
        var p = polvo[i], a = tic * 0.012 * p[3] + p[2], yy = est.yc + ((p[1] * (est.H - est.yc) - tic * 0.12 * p[3]) % (est.H - est.yc) + (est.H - est.yc)) % (est.H - est.yc);
        var xx = est.cx + (yy - est.yc) * 0.55 + (p[0] - 0.5) * est.r * 2.1 + Math.sin(a) * 5, b = Math.sin(tic * 0.07 * p[3] + p[2] * 4);
        if (b < -0.1) continue;
        g.fillStyle = b > 0.7 ? '#FFF6DA' : '#F6CF98'; g.fillRect(Math.round(xx), Math.round(yy), 1, 1);
      }
      var k = est.k, f = (tic >> 1) % 3; g.fillStyle = '#FFF6DA'; g.fillRect(est.vela[0] + (f === 1 ? k : 0), est.vela[1] - (f === 2 ? k : 0), k, k);
    }, 100);
  })();
})();
