/* Códice Vivo · escena del reto del esquiador (isométrico del video).
   El dibujo es el de la composición del video (plantilla/videos/aplica-mecanica-esquiador/compositions/escena.html):
   misma paleta de 4 tonos, mismo terreno, plataforma, rampa de madera con nieve, pinos, rocas, bultos, zona
   y el mismo esquiador con sus 4 poses (pie, aga, aire, ate), con las mismas semillas.
   Lo que cambia para el juego: la rampa se arma con la altura h y el borde b del nivel (la curva del video se
   escala con k = h/20 alrededor del borde), el terreno puede tener un desnivel, la cámara es el viewBox y el
   movimiento usa ctx.anima del motor (sin GSAP). Sin las texturas de ruido (feTurbulence) ni la nieve que cae,
   para que el celular no cargue capas enormes. Si se retoca el dibujo en el video, hay que traer aquí el cambio a mano.

   Coordenadas como en el video: plano de perfil (X, Y; 1 m = 40 px; Y hacia abajo), proyectado por el grupo
   iso con matrix(.866,.5,0,1); la profundidad z se suma como (X − z, Y + z). El borde de la rampa está en X = 1000
   y el piso del borde en Y = 1500. En metros: x desde el borde, y sobre el piso del borde. */
(function () {
  'use strict';
  const NS = "http://www.w3.org/2000/svg";
  const CS = "matrix(1.1547,-0.5774,0,1,0,0)"; // deshace la proyección: objetos de frente a la cámara
  const PX = 40, XB = 1000, YS = 1500;
  const pX = (x) => XB + PX * x, pY = (y) => YS - PX * y;
  const proy = (X, Y, z = 0) => { const a = X - z; return [0.866 * a, 0.5 * a + Y + z]; };
  const n1 = (v) => Math.round(v * 10) / 10, n2 = (v) => Math.round(v * 100) / 100;
  const q = (p) => n1(p[0]) + "," + n1(p[1]);
  const el = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; };
  const TINTA = "#2E2117", CORAL = "#e4572e", VERDE = "#2f7d5b";
  let cuenta = 0;

  /* ---------- Dibujo del video (sin cambios) ---------- */
  let semilla = 11;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  const pino = () => {
    let s = '<ellipse class="f-n2" cx="0" cy="2" rx="56" ry="11"/><rect class="f-tronco" x="-10" y="-34" width="20" height="36"/><rect class="f-t4" x="1" y="-34" width="9" height="36"/>';
    [[-28,-120,90],[-88,-172,72],[-142,-220,54],[-192,-262,36]].forEach(([b, t, w]) => {
      const h = b - t, y = (f) => (t + h * f).toFixed(1);
      s += `<path class="f-p2" d="M0,${t} L${-w},${b} Q${-w*.62},${b-9} ${-w*.45},${b-2} Q${-w*.22},${b-11} 0,${b-4} Z"/>`;
      s += `<path class="f-p3" d="M0,${t} L${w},${b} Q${w*.62},${b-9} ${w*.45},${b-2} Q${w*.22},${b-11} 0,${b-4} Z"/>`;
      s += `<path class="k k-p4" stroke-width="3" d="M${-w},${b} Q${-w*.62},${b-9} ${-w*.45},${b-2} Q${-w*.22},${b-11} 0,${b-4} Q${w*.22},${b-11} ${w*.45},${b-2} Q${w*.62},${b-9} ${w},${b}"/>`;
      s += `<path class="k k-p1" stroke-width="3" d="M${-w*.18},${y(.25)} L${-w*.7},${y(.85)} M${-w*.05},${y(.5)} L${-w*.35},${y(.92)}"/>`;
      s += `<path class="f-n1" d="M0,${t} L${-w*.64},${y(.64)} Q${-w*.48},${y(.52)} ${-w*.34},${y(.6)} Q${-w*.18},${y(.44)} 0,${y(.52)} Z"/>`;
      s += `<path class="f-n3" d="M0,${t} L${w*.42},${y(.42)} Q${w*.22},${y(.38)} 0,${y(.46)} Z"/>`;
    });
    return s;
  };
  const roca = (id) =>
    `<ellipse cx="18" cy="2" rx="70" ry="14" fill="url(#${id}-sombra)"/>` +
    '<path class="f-r2" d="M-50,0 L-40,-38 L4,-30 L0,0 Z"/><path class="f-r3" d="M4,-30 L30,-50 L52,-18 L46,0 L0,0 Z"/>' +
    '<path class="f-r1" d="M-40,-38 L-8,-62 L4,-30 Z"/><path class="f-r1" d="M-8,-62 L30,-50 L4,-30 Z" opacity=".85"/>' +
    '<path class="k k-r4" stroke-width="2.5" d="M4,-30 L0,0 M4,-30 L-40,-38 M4,-30 L30,-50 M-50,0 L46,0"/>' +
    '<path class="f-n1" d="M-36,-40 L-8,-61 L22,-51 L6,-41 L-14,-46 Z"/>';
  const P2 = (a) => a.map((p) => p.join(",")).join(" ");
  const linea = (c, w, pts) => `<polyline class="k ${c}" stroke-width="${w}" points="${P2(pts)}"/>`;
  const corr = (pts) => pts.map(([x, y]) => [x - 2.4, y - 2.8]);
  const figura = (j) => {
    const { an, kn, hp, sh, hd, brazos, ski } = j;
    let s = "";
    s += `<path class="k k-esquis" stroke-width="7.5" d="${ski}"/>`;
    s += `<path class="k k-brillo" stroke-width="1.8" opacity=".8" d="${ski}" transform="translate(0,-2.6)"/>`;
    s += `<rect class="f-bota" x="-8" y="-9" width="22" height="5" rx="2"/>`;
    const brazo = (b, atras) => {
      const [h0, e, m, p] = b;
      const r = [m[0] + (p[0] - m[0]) * .86, m[1] + (p[1] - m[1]) * .86];
      return {
        baston: `<line class="k k-baston" stroke-width="3.5" x1="${m[0]}" y1="${m[1]}" x2="${p[0]}" y2="${p[1]}"/><circle class="k k-baston" stroke-width="2.5" cx="${r[0].toFixed(1)}" cy="${r[1].toFixed(1)}" r="5.5"/>`,
        rim: linea("k-rim", 15, corr([h0, e, m])),
        brazo: linea(atras ? "k-chaq-o" : "k-chaq", 11, [h0, e, m]),
        guante: `<circle class="f-guante" cx="${m[0]}" cy="${m[1]}" r="7"/><circle class="f-brillo" cx="${m[0] - 2}" cy="${m[1] - 2.5}" r="1.8" opacity=".6"/>`,
      };
    };
    if (brazos.length > 1) { const a = brazo(brazos[0], true); s += a.baston + a.brazo + a.guante; }
    s += linea("k-rim", 21, corr([an, kn, hp])) + `<line class="k k-rim" stroke-width="31" x1="${hp[0] - 2.4}" y1="${hp[1] - 2.8}" x2="${sh[0] - 2.4}" y2="${sh[1] - 2.8}"/>`;
    s += linea("k-pant", 17, [an, kn, hp]);
    s += `<rect class="f-bota" x="${an[0] - 9}" y="${an[1] - 7}" width="22" height="13" rx="4"/>`;
    s += `<line class="k k-chaq" stroke-width="27" x1="${hp[0]}" y1="${hp[1]}" x2="${sh[0]}" y2="${sh[1]}"/>`;
    const vx = sh[0] - hp[0], vy = sh[1] - hp[1], L = Math.hypot(vx, vy), nx = -vy / L, ny = vx / L;
    [.32, .58].forEach((f) => {
      const cx = hp[0] + vx * f, cy = hp[1] + vy * f;
      s += `<path class="k k-chaq-o" stroke-width="2.6" d="M${(cx + nx * 10).toFixed(1)},${(cy + ny * 10).toFixed(1)} Q${(cx + vx * .06).toFixed(1)},${(cy + vy * .06).toFixed(1)} ${(cx - nx * 7 + vx * .1).toFixed(1)},${(cy - ny * 7 + vy * .1).toFixed(1)}"/>`;
    });
    s += `<line class="k k-chaq-o" stroke-width="5" x1="${(hp[0] + nx * 12).toFixed(1)}" y1="${(hp[1] + ny * 12).toFixed(1)}" x2="${(hp[0] - nx * 12).toFixed(1)}" y2="${(hp[1] - ny * 12).toFixed(1)}"/>`;
    const f = brazo(brazos[brazos.length - 1], false);
    s += f.rim + f.brazo + f.baston + f.guante;
    const [hx, hy] = hd;
    s += `<circle class="f-rim" cx="${hx - 2.4}" cy="${hy - 2.8}" r="15"/><circle class="f-piel" cx="${hx}" cy="${hy}" r="13"/>`;
    s += `<path class="f-casco" d="M${hx - 14.5},${hy - 1} A14.5,14.5 0 0 1 ${hx + 14.5},${hy - 1} Z"/>`;
    s += `<path class="k k-brillo" stroke-width="2.5" opacity=".55" d="M${hx - 9},${hy - 8} A10,10 0 0 1 ${hx + 2},${hy - 12}"/>`;
    s += `<line class="k k-goggle" stroke-width="3" x1="${hx - 12}" y1="${hy - 1}" x2="${hx + 4}" y2="${hy - 1}"/>`;
    s += `<rect class="f-goggle" x="${hx + 3}" y="${hy - 5}" width="13" height="8" rx="3"/><rect class="f-brillo" x="${hx + 6}" y="${hy - 4}" width="5" height="2.2" rx="1" opacity=".85"/>`;
    return s;
  };
  const ESQUI = "M-58,-3 L60,-3 Q72,-3 77,-14";
  const POSE_DEF = {
    pie: { an: [0, -10], kn: [2, -38], hp: [0, -64], sh: [2, -98], hd: [4, -118], brazos: [[[4, -94], [14, -80], [20, -68], [36, -3]]], ski: ESQUI },
    aga: { an: [0, -10], kn: [18, -33], hp: [-10, -47], sh: [18, -66], hd: [33, -80], brazos: [[[16, -64], [24, -49], [34, -52], [-44, -38]]], ski: ESQUI },
    aire: { an: [0, -10], kn: [8, -36], hp: [-4, -62], sh: [12, -96], hd: [19, -116], brazos: [[[6, -92], [-14, -102], [-34, -108], [-58, -78]], [[10, -92], [30, -104], [50, -112], [70, -82]]], ski: "M-58,-4 L60,-1 Q72,0 78,-12" },
    ate: { an: [0, -10], kn: [20, -30], hp: [-8, -43], sh: [12, -74], hd: [21, -90], brazos: [[[8, -70], [-10, -62], [-24, -66], [-42, -3]], [[12, -70], [28, -62], [42, -66], [60, -3]]], ski: ESQUI },
  };
  const SALP = [[-70,-60],[-40,-95],[-10,-70],[30,-105],[60,-60],[95,-80],[120,-40],[-100,-30],[10,-120],[-60,-110]];
  /* Rampa del video (centro de la pista, z = 0): 20 m de caída, borde en (1000, 1300) */
  const CURVA = [[200,500],[330,510],[470,700],[600,950],[720,1180],[850,1300],[1000,1300]];
  /* Pinos y rocas del video (X, z, escala); el patrón se repite cada 2700 px a lo largo del terreno */
  const PINOS_ATRAS = [[-250,-320,1.1],[-80,-330,.85],[420,-360,.8],[1150,-320,.95],[1300,-330,1.25],[1480,-320,.9],[1680,-340,1.2],[1880,-320,.95],[2080,-330,1.3],[2280,-320,1.0],[2420,-250,.85],[1250,-230,.7],[1600,-240,.75],[2000,-230,.8]];
  const ROCAS_ATRAS = [[-300,-120,1.1],[2380,-90,.8],[1180,-300,.7]];

  /* ---------- La escena ---------- */
  function crea(cont, ctx) {
    const id = "esq" + (++cuenta);
    const svg = el("svg", { class: "esq", role: "img", "aria-label": "Una rampa de madera con nieve, el esquiador arriba y, después del borde, la zona de aterrizaje." }, cont);
    const defs = el("defs", {}, svg);
    defs.innerHTML =
      `<radialGradient id="${id}-sombra"><stop offset="0" stop-color="#1b140e" stop-opacity=".42"/><stop offset=".6" stop-color="#1b140e" stop-opacity=".18"/><stop offset="1" stop-color="#1b140e" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="${id}-ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b140e" stop-opacity="0"/><stop offset="1" stop-color="#1b140e" stop-opacity=".32"/></linearGradient>` +
      `<linearGradient id="${id}-ao-z" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b140e" stop-opacity=".34"/><stop offset="1" stop-color="#1b140e" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="${id}-calor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd23f"/><stop offset=".55" stop-color="#ff7a1f"/><stop offset="1" stop-color="#ff2a12"/></linearGradient>`;
    const clipPanel = el("path", {}, el("clipPath", { id: id + "-panel" }, defs));
    const clipTorre = el("rect", {}, el("clipPath", { id: id + "-torre" }, defs));

    /* montañas (parallax: se acomodan a la vista en ponVista) */
    const gLejos = el("g", {}, svg), gMedio = el("g", {}, svg);
    gLejos.innerHTML = '<path class="f-monte-l" d="M0,420 L180,300 L330,360 L520,180 L700,330 L860,250 L1050,90 L1260,300 L1420,220 L1600,330 L1780,150 L1980,310 L2150,240 L2400,360 L2400,1800 L0,1800 Z"/>' +
      '<path class="f-monte-l-n" d="M520,180 L470,225 L500,220 L520,240 L545,215 L575,222 Z"/><path class="f-monte-l-n" d="M1050,90 L985,150 L1020,140 L1045,165 L1075,140 L1115,150 Z"/><path class="f-monte-l-n" d="M1780,150 L1725,200 L1755,193 L1778,212 L1805,190 L1840,198 Z"/>';
    gMedio.innerHTML = '<path class="f-monte-m" d="M0,520 L220,360 L400,460 L640,300 L860,470 L1080,380 L1300,480 L1540,320 L1760,460 L1980,360 L2400,520 L2400,1800 L0,1800 Z"/>' +
      '<path class="f-monte-m-n" d="M640,300 L590,337 L620,332 L642,352 L668,330 L700,345 Z"/><path class="f-monte-m-n" d="M1540,320 L1490,357 L1520,350 L1542,370 L1566,348 L1598,360 Z"/><path class="f-monte-m-n" d="M220,360 L180,390 L205,386 L222,402 L240,384 L265,392 Z"/>';
    [[520,640,.38],[575,650,.3],[980,620,.34],[1040,632,.42],[1420,650,.36],[1860,630,.4],[1910,640,.3]].forEach(([x, y, s]) => { const g = el("g", { transform: `translate(${x},${y}) scale(${s})` }, gMedio); g.innerHTML = pino(); });

    const mundo = el("g", {}, svg), iso = el("g", { transform: "matrix(0.866,0.5,0,1,0,0)" }, mundo);
    const capa = () => el("g", {}, iso);
    const gTerr = capa(), gSuelo = capa(), gSombra = capa(), gAtras = capa(), gPlat = capa(), gRampa = capa(), gHuella = capa(), gCotas = capa(), gCotaH = capa(),
      gRastros = capa(), gEsq = capa(), gSalpica = capa(), gMarcas = capa(), gFrente = capa(), gNotas = capa();
    const gBase = el("g", {}, gTerr), gPaso = el("g", {}, gTerr);

    /* Esquiador con sus 4 poses y las rayas de velocidad */
    const esq = el("g", {}, gEsq);
    esq.innerHTML = `<ellipse class="esq-sombra-pies" cx="6" cy="0" rx="72" ry="9" fill="url(#${id}-sombra)"/>` +
      '<g class="esq-vel"><path class="k k-vel" stroke-width="5" d="M-190,-28 L-100,-28 M-220,-58 L-110,-58 M-180,-88 L-100,-88 M-160,-112 L-100,-112"/></g>';
    const POSES = {};
    Object.keys(POSE_DEF).forEach((n) => { POSES[n] = el("g", {}, esq); POSES[n].innerHTML = figura(POSE_DEF[n]); });
    const sombraPies = esq.querySelector(".esq-sombra-pies"), vel = esq.querySelector(".esq-vel");
    const pose = (n) => Object.keys(POSES).forEach((k) => POSES[k].setAttribute("display", k === n ? "inline" : "none"));
    const sombraG = el("g", {}, gSombra), sombra = el("ellipse", { rx: 80, ry: 40, fill: `url(#${id}-sombra)`, opacity: 0 }, sombraG);
    const rastro = el("path", { class: "par", fill: "none" }, gRastros), viejos = el("g", { opacity: 0.35 }, gRastros);
    const huella = el("path", { fill: "none", stroke: `url(#${id}-calor)`, "stroke-linecap": "round", "stroke-width": 12, opacity: 0 }, gHuella);

    /* ---------- Estado ---------- */
    let lugar = { b: 5, zona: null, paso: null }, hR = 20, curva = [], muestras = [], textoH = null;
    let vista = { x: 0, y: 0, w: 1600, h: 1280 }, cajaActual = { x0: -25, x1: 25, y0: -1, y1: 28 }, escalables = [];
    const e = { X: 0, Y: 0, a: 0 };
    const u = () => vista.w / 100;
    const piso = (x) => (lugar.paso && x >= lugar.paso.xs ? lugar.paso.d : 0);

    /* ---------- Terreno: bloque isométrico (z −400…160, espesor 200 px) ---------- */
    function bloque(par, Xa, Xb, Yt, fondo, derecha) {
      let labio = `M${Xa - 160},${Yt + 160} L${Xb - 160},${Yt + 160} L${Xb - 160},${Yt + 188}`;
      for (let x = Xb - 160, i = 0; x > Xa - 160; x -= 80, i++) labio += ` Q${x - 40},${Yt + (i % 2 ? 212 : 200)} ${Math.max(Xa - 160, x - 80)},${Yt + 190}`;
      let s = `<path class="f-n1" d="M${Xa + 400},${Yt - 400} L${Xb + 400},${Yt - 400} L${Xb - 160},${Yt + 160} L${Xa - 160},${Yt + 160} Z"/>` +
        `<rect class="f-t2" x="${Xa - 160}" y="${Yt + 160}" width="${Xb - Xa}" height="${fondo - Yt - 160}"/>` +
        `<path class="k k-t4" stroke-width="3" stroke-dasharray="60 24 14 24" d="M${Xa - 160},${Yt + 240} L${Xb - 160},${Yt + 240} M${Xa - 160},${Yt + 300} L${Xb - 160},${Yt + 300}"/>` +
        `<path class="f-n2" d="${labio} Z"/><rect x="${Xa - 160}" y="${Yt + 190}" width="${Xb - Xa}" height="60" fill="url(#${id}-ao-z)"/>`;
      if (derecha) s += `<path class="f-t3" d="M${Xb - 160},${Yt + 160} L${Xb + 400},${Yt - 400} L${Xb + 400},${fondo - 560} L${Xb - 160},${fondo} Z"/>` +
        `<path class="f-n3" d="M${Xb - 160},${Yt + 160} L${Xb + 400},${Yt - 400} L${Xb + 400},${Yt - 370} L${Xb - 160},${Yt + 190} Z"/>` +
        `<line class="k k-linea" stroke-width="3" x1="${Xb - 160}" y1="${Yt + 160}" x2="${Xb - 160}" y2="${fondo}"/>`;
      s += `<line class="k k-n2" stroke-width="3" x1="${Xa - 160}" y1="${Yt + 160}" x2="${Xb - 160}" y2="${Yt + 160}"/>`;
      par.innerHTML = s;
    }
    /* Suelo local (X, z) → (X − z, Yt + z) */
    const suelo = (par, Yt, html) => { const g = el("g", { transform: `matrix(1,0,-1,1,0,${Yt})` }, par); g.innerHTML = html; return g; };
    function haceTerreno(x1) {
      const p = lugar.paso, Xa = pX(-75), Xb = pX(x1), fondo = YS + 1400 + (p && p.d < 0 ? -p.d * PX : 0);
      gSuelo.textContent = "";
      if (p) {
        const Xs = pX(p.xs), Yp = pY(p.d);
        bloque(gBase, Xa, Xs, YS, fondo, p.d < 0);
        bloque(gPaso, Xs, Xb, Yp, fondo, true);
      } else { bloque(gBase, Xa, Xb, YS, fondo, true); gPaso.textContent = ""; }
      /* zona de aterrizaje y nieve sin preparar después de la zona */
      const z = lugar.zona, Yz = pY(piso(z ? z.X : 0));
      if (z) {
        semilla = 23; let bultos = "";
        for (let i = 0; i < 34; i++) {
          const X = pX(z.X + z.W + 1.5) + azar() * 820, zz = -330 + azar() * 460, rx = 18 + azar() * 16;
          bultos += `<ellipse class="f-n3" cx="${X.toFixed(0)}" cy="${zz.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${(rx * .6).toFixed(0)}"/><ellipse class="f-n1" cx="${(X - 5).toFixed(0)}" cy="${(zz - 4).toFixed(0)}" rx="${(rx * .6).toFixed(0)}" ry="${(rx * .35).toFixed(0)}"/>`;
        }
        const x0 = pX(z.X - z.W), w = PX * 2 * z.W;
        suelo(gSuelo, Yz, bultos + `<rect class="f-zona" x="${x0}" y="-150" width="${w}" height="210"/><rect class="esq-zona-brillo" x="${x0}" y="-150" width="${w}" height="210" fill="rgba(255,255,255,.18)" stroke="#ffffff" stroke-width="7" opacity="0"/>`);
      }
      /* pinos y rocas de atrás (sobre el escalón si lo hay) y del frente, lejos de la pista */
      gAtras.textContent = ""; gFrente.textContent = "";
      const poner = (par, html, X, zz, s) => {
        const Y = pY(piso((X - XB) / PX)), g = el("g", { transform: `translate(${X - zz},${Y + zz}) ${CS} scale(${s})` }, par); g.innerHTML = html;
        if (par === gAtras) suelo(gSuelo, Y, `<ellipse cx="${X + 50}" cy="${zz + 36}" rx="${110 * s}" ry="${46 * s}" fill="url(#${id}-sombra)"/>`);
      };
      for (let o = -2700 * 2; o < Xb; o += 2700) {
        PINOS_ATRAS.forEach(([X, zz, s]) => { const XX = X + o + 600; if (XX > Xa + 200 && XX < Xb + 200) poner(gAtras, pino(), XX, zz, s); });
        ROCAS_ATRAS.forEach(([X, zz, s]) => { const XX = X + o + 600; if (XX > Xa + 200 && XX < Xb + 200) poner(gAtras, roca(id), XX, zz, s); });
      }
      const xf = pX(z ? z.X + z.W + 4 : 26);
      [[xf + 300, 110, 1.35], [xf + 1100, 120, 1.5]].forEach(([X, zz, s]) => { if (X < Xb) poner(gFrente, pino(), X, zz, s); });
      [[xf, 140, 1.0], [xf + 700, 140, .9]].forEach(([X, zz, s]) => { if (X < Xb) poner(gFrente, roca(id), X, zz, s); });
    }

    /* ---------- Rampa y plataforma (la curva del video escalada con k = h/20 alrededor del borde) ---------- */
    const mueve = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
    const dC = (p) => `M${q(p[0])} C${q(p[1])} ${q(p[2])} ${q(p[3])} C${q(p[4])} ${q(p[5])} ${q(p[6])}`;
    const bez = (a, b, c, d, t) => { const s = 1 - t; return [s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0], s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1]]; };
    function muestrea(p) {
      const pts = [];
      [[0, 1, 2, 3], [3, 4, 5, 6]].forEach((ix, k) => { for (let i = k ? 1 : 0; i <= 40; i++) pts.push(bez(p[ix[0]], p[ix[1]], p[ix[2]], p[ix[3]], i / 40)); });
      let L = 0; const out = pts.map((pt, i) => { if (i) L += Math.hypot(pt[0] - pts[i - 1][0], pt[1] - pts[i - 1][1]); return { X: pt[0], Y: pt[1], s: L }; });
      out.forEach((o, i) => { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)]; o.s /= L; o.a = Math.atan2(b.Y - a.Y, b.X - a.X) * 57.2958; });
      return out;
    }
    const yEn = (m, X) => { for (let i = 1; i < m.length; i++) if (m[i].X >= X) { const a = m[i - 1], b = m[i], t = (X - a.X) / ((b.X - a.X) || 1); return a.Y + (b.Y - a.Y) * t; } return m[m.length - 1].Y; };
    function haceRampa(h) {
      hR = h;
      const k = h / 20, YE = pY(lugar.b);
      curva = CURVA.map(([x, y]) => [XB + (x - XB) * k, YE + (y - 1300) * k]);
      muestras = muestrea(curva);
      const F = mueve(curva, -60, 60), B = mueve(curva, 150, -150), [X0, Yt] = curva[0], E = F[6], fondo = YS + 60;
      /* plataforma de salida */
      const a = X0 - 220, top = Yt + 60, alto = fondo - top;
      clipTorre.setAttribute("x", a); clipTorre.setAttribute("y", top); clipTorre.setAttribute("width", 160); clipTorre.setAttribute("height", alto);
      let tablas = "", cruces = "", luz = "";
      for (let y = top + 32; y < fondo; y += 32) tablas += `M${a},${y} L${a + 160},${y} `;
      for (let y = top + 60; y + 240 <= fondo + 1; y += 280) { cruces += `M${a},${y} L${a + 160},${y + 240} M${a + 160},${y} L${a},${y + 240} `; luz += `M${a + 2},${y - 4} L${a + 162},${y + 236} `; }
      let tabD = ""; for (let i = 0; i < 6; i++) tabD += `M${X0 + 10 + 25 * i},${Yt - 150} L${X0 - 200 + 25 * i},${Yt + 60} `;
      gPlat.innerHTML =
        `<rect class="f-m2" x="${a}" y="${top}" width="160" height="${alto}"/>` +
        `<g clip-path="url(#${id}-torre)"><path class="k k-m3" stroke-width="2.5" d="${tablas}"/><path class="k k-m4" stroke-width="9" d="${cruces}"/><path class="k k-m1" stroke-width="3" opacity=".6" d="${luz}"/>` +
        `<rect x="${a}" y="${fondo - 100}" width="160" height="100" fill="url(#${id}-ao)"/><rect class="f-m3" x="${a}" y="${top}" width="16" height="${alto}"/><rect class="f-m3" x="${a + 144}" y="${top}" width="16" height="${alto}"/></g>` +
        `<path class="f-m1 borde" d="M${X0 - 10},${Yt - 150} L${X0 + 150},${Yt - 150} L${X0 - 60},${Yt + 60} L${X0 - 220},${Yt + 60} Z"/>` +
        `<path class="k k-m3" stroke-width="2" d="${tabD}"/>` +
        `<path class="k k-m4" stroke-width="5" d="M${X0 - 10},${Yt - 150} L${X0 - 10},${Yt - 200} M${X0 + 150},${Yt - 150} L${X0 + 150},${Yt - 200} M${X0 + 70},${Yt - 150} L${X0 + 70},${Yt - 200} M${X0 - 10},${Yt - 200} L${X0 + 150},${Yt - 200}"/>` +
        `<line class="k k-tinta" stroke-width="6" x1="${X0}" y1="${Yt - 160}" x2="${X0}" y2="${Yt - 310}"/><path class="f-chaq" d="M${X0 + 3},${Yt - 308} L${X0 + 62},${Yt - 292} L${X0 + 3},${Yt - 274} Z"/>`;
      /* rampa: panel de madera, cara del borde y superficie nevada */
      const panel = `${dC(F)} L${n1(E[0])},${fondo} L${n1(F[0][0])},${fondo} Z`;
      clipPanel.setAttribute("d", panel);
      const mF = muestrea(F), W = E[0] - F[0][0];
      let tR = "";
      for (let y = Math.ceil((Yt + 60) / 32) * 32; y < fondo; y += 32) tR += `M${n1(F[0][0])},${y} L${n1(E[0] + 20)},${y} `;
      semilla = 31;
      for (let i = 0; i < 40; i++) { const x = F[0][0] + 20 + azar() * (W - 20), y = Math.ceil((Yt + 60) / 32) * 32 + Math.floor(azar() * ((fondo - Yt - 60) / 32)) * 32; tR += `M${x.toFixed(0)},${y} L${x.toFixed(0)},${y + 32} `; }
      const zig = [0, .2, .4, .6, .8, .95].map((f, i) => { const x = F[0][0] + W * f, yc = yEn(mF, x); return [x, i % 2 ? yc + (fondo - yc) * 0.25 : fondo]; });
      let postes = "";
      [.1625, .3875, .6125, .8375].forEach((f) => { const x = n1(F[0][0] + W * f); postes += `<rect class="f-m1" x="${x}" y="${n1(Yt - 20)}" width="9" height="${n1(fondo - Yt + 40)}"/><rect class="f-m3" x="${n1(x + 9)}" y="${n1(Yt - 20)}" width="12" height="${n1(fondo - Yt + 40)}"/>`; });
      const caraY = (i) => n1(E[1] + (fondo - E[1]) * i / 6);
      let caraL = ""; for (let i = 1; i <= 5; i++) caraL += `M${n1(E[0])},${caraY(i)} L${n1(E[0] + 210)},${caraY(i) - 210} `;
      gRampa.innerHTML =
        `<path class="f-m2" d="${panel}"/>` +
        `<g clip-path="url(#${id}-panel)"><path class="k k-m3" stroke-width="2.5" d="${tR}"/><path class="k k-m4" stroke-width="7" d="M${zig.map(q).join(" L")}"/>${postes}` +
        `<rect x="${n1(F[0][0])}" y="${fondo - 90}" width="${n1(W + 20)}" height="90" fill="url(#${id}-ao)"/></g>` +
        `<path class="f-m3" d="M${q(E)} L${n1(E[0] + 210)},${n1(E[1] - 210)} L${n1(E[0] + 210)},${fondo - 210} L${n1(E[0])},${fondo} Z"/>` +
        `<path class="k k-m4" stroke-width="2.5" d="${caraL}"/><path d="M${q(E)} L${n1(E[0])},${fondo}" class="k k-linea" stroke-width="3"/>` +
        `<path class="f-n1" d="${dC(F)} L${q(B[6])} C${q(B[5])} ${q(B[4])} ${q(B[3])} C${q(B[2])} ${q(B[1])} ${q(B[0])} Z"/>` +
        `<path class="k k-n3" stroke-width="3" d="${dC(mueve(curva, -14, 14))}"/><path class="k k-n3" stroke-width="3" d="${dC(mueve(curva, 14, -14))}"/>` +
        `<path class="k k-n2" stroke-width="12" d="${dC(mueve(F, 0, 6))}"/><path class="k k-m4" stroke-width="3" d="${dC(mueve(F, 0, 14))}"/>` +
        `<path class="k k-n3" stroke-width="3" d="M${q(E)} L${n1(E[0] + 210)},${n1(E[1] - 210)}"/>`;
      huella.setAttribute("d", dC(curva));
      cotaRampa();
    }

    /* ---------- Cámara: el viewBox encuadra una caja en metros { x0, x1, y0, y1 } ---------- */
    function cajaDe(c) {
      const pts = [proy(pX(c.x0), pY(c.y1), -150), proy(pX(c.x1), pY(c.y1), -150), proy(pX(c.x0), pY(c.y0) + 200, 160), proy(pX(c.x1), pY(c.y0) + 200, 160), proy(pX(c.x0), pY(c.y1), 160), proy(pX(c.x1), pY(c.y0), -150)];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pts.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      let w = (x1 - x0) * 1.06, h = (y1 - y0) * 1.06; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const asp = cont.clientWidth && cont.clientHeight ? cont.clientWidth / cont.clientHeight : 1.25;
      if (w / h < asp) w = h * asp; else h = w / asp;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    }
    function mide(qq) {
      const uu = u();
      if (qq.letra) { qq.el.setAttribute("font-size", n2(qq.letra * uu)); qq.el.setAttribute("stroke-width", n2(qq.letra * uu * 0.22)); }
      if (qq.raya) qq.el.setAttribute("stroke-width", n2(qq.raya * uu));
      if (qq.puntos) qq.el.setAttribute("stroke-dasharray", qq.puntos.map((p) => n2(p * uu)).join(" "));
    }
    function ponVista(v) {
      vista = v;
      svg.setAttribute("viewBox", `${n1(v.x)} ${n1(v.y)} ${n1(v.w)} ${n1(v.h)}`);
      /* montañas de fondo pegadas a la vista, con un poco de parallax */
      const s = v.w / 1080, cx = (v.x + v.w / 2) / s, lim = (a) => Math.max(-1300, Math.min(0, a));
      gLejos.setAttribute("transform", `translate(${n1(v.x + s * lim(-660 - (cx - 870) * 0.1))} ${n1(v.y + v.h * 0.14 - s * 90)}) scale(${n2(s)})`);
      gMedio.setAttribute("transform", `translate(${n1(v.x + s * lim(-660 - (cx - 870) * 0.25))} ${n1(v.y + v.h * 0.3 - s * 300)}) scale(${n2(s)})`);
      escalables = escalables.filter((r) => r.fijo || r.el.isConnected);
      escalables.forEach(mide);
      dibuja();
    }
    const escala = (elem, r) => { const o = { el: elem, ...r }; escalables.push(o); mide(o); return elem; };
    escala(rastro, { raya: 0.55, puntos: [1.4, 1.1], fijo: true });
    function encuadra(c, dur = 0.6) {
      cajaActual = c;
      const a = vista, b = cajaDe(c);
      return ctx.anima(dur, (k) => ponVista({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k }), "suave");
    }
    const mira = (c) => { cajaActual = c; ponVista(cajaDe(c)); };
    /* sigue al esquiador: vista de ancho fijo centrada un poco adelante de él */
    const ANCHO_SIGUE = 1900;
    function vistaSigue(X, Y) {
      const asp = cont.clientWidth && cont.clientHeight ? cont.clientWidth / cont.clientHeight : 1.25, w = ANCHO_SIGUE, h = w / asp, p = proy(X, Y - 60);
      return { x: p[0] - w * 0.4, y: p[1] - h * 0.5, w, h };
    }
    if ("ResizeObserver" in window) new ResizeObserver(() => ponVista(cajaDe(cajaActual))).observe(cont);

    /* ---------- Esquiador ---------- */
    function dibuja() {
      const k = Math.max(1, vista.w / 2600);
      esq.setAttribute("transform", `translate(${n1(e.X)} ${n1(e.Y)}) rotate(${n1(e.a)}) scale(${n2(k)})`);
      /* si choca con la orilla de un escalón, queda detrás de él */
      const atras = !!lugar.paso && lugar.paso.d > 0 && e.X < pX(lugar.paso.xs) + 1 && e.Y > pY(lugar.paso.d) - 2;
      if (atras !== (gEsq.parentNode === gTerr)) { if (atras) gTerr.insertBefore(gEsq, gPaso); else iso.insertBefore(gEsq, gSalpica); }
    }
    function arriba() { const m0 = muestras[0]; e.X = m0.X; e.Y = m0.Y; e.a = 0; pose("pie"); sombraPies.setAttribute("opacity", 1); vel.setAttribute("opacity", 0); dibuja(); }
    function enRampa(s) {
      for (let i = 1; i < muestras.length; i++) if (muestras[i].s >= s) { const a = muestras[i - 1], b = muestras[i], t = (s - a.s) / ((b.s - a.s) || 1); return { X: a.X + (b.X - a.X) * t, Y: a.Y + (b.Y - a.Y) * t, a: a.a + (b.a - a.a) * t }; }
      const z = muestras[muestras.length - 1]; return { X: z.X, Y: z.Y, a: 0 };
    }

    /* ---------- Notas, rayas y cotas ---------- */
    /* texto de frente a la cámara en el punto (X, Y) del perfil; dx y dy en «em» */
    function texto(par, X, Y, str, o = {}) {
      const g = el("g", { transform: `translate(${n1(X)},${n1(Y)}) ${CS}` }, par);
      const t = el("text", { x: 0, y: 0, dx: (o.dx || 0) + "em", dy: (o.dy || 0) + "em", "text-anchor": o.anc || "start", class: "esq-nota", fill: o.color || TINTA }, g);
      t.textContent = str;
      escala(t, { letra: o.f || 4.2 });
      return g;
    }
    const raya = (par, d, color, w = 0.45, puntos) => escala(el("path", { d, fill: "none", stroke: color || TINTA, "stroke-linecap": "round" }, par), { raya: w, puntos });
    const L = (a, b) => `M${n1(a[0])},${n1(a[1])} L${n1(b[0])},${n1(b[1])}`;
    const cotaV = (par, X, Y0, Y1) => raya(par, L([X, Y0], [X, Y1]) + L([X - 20, Y0], [X + 20, Y0]) + L([X - 20, Y1], [X + 20, Y1]));
    /* cota de la altura de la rampa, a la derecha del borde, con guías punteadas */
    function cotaRampa() {
      gCotaH.textContent = "";
      if (!textoH) return;
      const Xc = pX(4.5), Yt = curva[0][1], YE = pY(lugar.b);
      raya(gCotaH, L([curva[0][0] + 40, Yt], [Xc + 30, Yt]) + L([XB + 40, YE], [Xc + 30, YE]), TINTA, 0.3, [0.8, 0.8]);
      cotaV(gCotaH, Xc, Yt, YE);
      texto(gCotaH, Xc, (Yt + YE) / 2, textoH, { dx: 0.35, dy: 0.35, f: 4.6 });
    }
    /* cota vertical en x (m), de y0 a y1 (m) */
    function cotaAlto(x, y0, y1, str, o = {}) { const X = pX(x); cotaV(gCotas, X, pY(y0), pY(y1)); texto(gCotas, X, o.arriba ? pY(y1) : (pY(y0) + pY(y1)) / 2, str, { dx: o.anc === "end" ? -0.35 : 0.35, dy: o.arriba ? -0.5 : 0.35, anc: o.anc, f: o.f }); }
    /* cota en el suelo (por delante de la pista, z = 110), de x0 a x1 */
    function cotaSuelo(x0, x1, str, o = {}) {
      const Y = pY(o.y || 0), z = 110, a = [pX(x0) - z, Y + z], b = [pX(x1) - z, Y + z];
      raya(gCotas, L([pX(x1), Y], b), TINTA, 0.3, [0.8, 0.8]);
      raya(gCotas, L(a, b) + L([a[0], a[1] - 20], [a[0], a[1] + 20]) + L([b[0], b[1] - 20], [b[0], b[1] + 20]), o.color);
      texto(gCotas, (a[0] + b[0]) / 2, a[1], str, { anc: "middle", dy: 1.15, color: o.color, f: o.f });
    }
    function tache(x, y, str) {
      const g = el("g", { transform: `translate(${n1(pX(x))},${n1(pY(y) - 130)}) ${CS}` }, gMarcas);
      raya(g, "M-36,-36 L36,36 M36,-36 L-36,36", "#f0745e", 1.1);
      if (str) texto(gMarcas, pX(x), pY(y) - 130, str, { anc: "middle", dy: -1.3, color: CORAL, f: 3.8 });
    }
    function bien(x, y) { const g = el("g", { transform: `translate(${n1(pX(x))},${n1(pY(y) - 150)}) ${CS}` }, gMarcas); raya(g, "M-42,0 L-12,30 L42,-36", VERDE, 1.2); }
    const brilla = () => { const z = gSuelo.querySelector(".esq-zona-brillo"); if (z) z.setAttribute("opacity", 1); };
    /* pista del nivel 1: la energía arriba y abajo */
    function energia() {
      gNotas.textContent = "";
      texto(gNotas, curva[0][0] - 60, curva[0][1] - 200, "arriba: Ep = mgh", { anc: "start", color: "#1f8f5f", f: 4.4 });
      texto(gNotas, XB, pY(lugar.b) - 140, "en el borde: Ec = ½mv²", { anc: "middle", color: CORAL, f: 4.4 });
    }

    /* ---------- Movimiento ---------- */
    function guardaRastro() {
      const d = rastro.getAttribute("d");
      if (d) { const p = el("path", { d, class: "par", fill: "none" }, viejos); escala(p, { raya: 0.45, puntos: [1.4, 1.1] }); }
      rastro.setAttribute("d", "");
    }
    function salpica(X, Y) {
      const g = el("g", { transform: `translate(${n1(X)},${n1(Y)})` }, gSalpica), cs = SALP.map((_, i) => el("circle", { r: [9, 7, 11, 6, 8, 10, 6, 8, 5, 7][i], class: "f-n1" }, g));
      return ctx.anima(0.8, (k) => cs.forEach((c, i) => { const s = 1 - 0.6 * k; c.setAttribute("transform", `translate(${n1(SALP[i][0] * k)},${n1(SALP[i][1] * k)}) scale(${n2(s)})`); c.setAttribute("opacity", n2(1 - k)); }), "sale").then(() => g.remove());
    }
    function tiembla(amp = 1) {
      return ctx.anima(0.45, (k) => { const a = amp * 0.9 * u() * (1 - k); mundo.setAttribute("transform", `translate(${n1(a * Math.sin(k * 41))} ${n1(a * Math.cos(k * 33))})`); }).then(() => mundo.removeAttribute("transform"));
    }
    /* Suelta al esquiador: baja la rampa (de arriba al borde) y vuela por la parábola real hasta donde diga sim.
       o = { h, b, k (energía que queda; < 1 = fricción: huella caliente), sim: { tipo, x, y, t, v }, caja, etiquetaV } */
    function suelta(o) {
      const s = o.sim, b = o.b, v = s.v, friccion = o.k < 1;
      guardaRastro(); gNotas.textContent = ""; arriba();
      [].forEach.call(gMarcas.children, (m) => m.setAttribute("opacity", 0.3));
      const durR = 1 + Math.sqrt(o.h) / 5;
      const Lh = huella.getTotalLength ? huella.getTotalLength() : 1000;
      huella.setAttribute("stroke-dasharray", n1(Lh)); huella.setAttribute("stroke-dashoffset", n1(Lh)); huella.setAttribute("opacity", friccion ? 0.9 : 0);
      const a = vista, ini = vistaSigue(e.X, e.Y);
      return ctx.anima(0.5, (k) => ponVista({ x: a.x + (ini.x - a.x) * k, y: a.y + (ini.y - a.y) * k, w: a.w + (ini.w - a.w) * k, h: a.h + (ini.h - a.h) * k }), "suave")
        .then(() => {
          pose("aga");
          return ctx.anima(durR, (kk) => {
            const r = enRampa(kk * kk); e.X = r.X; e.Y = r.Y; e.a = r.a;
            vel.setAttribute("opacity", kk > 0.35 ? 1 : 0);
            if (friccion) huella.setAttribute("stroke-dashoffset", n1(Lh * (1 - kk * kk)));
            ponVista(vistaSigue(e.X, e.Y));
          });
        })
        .then(() => {
          if (o.etiquetaV) texto(gNotas, XB + 30, pY(b) - 30, o.etiquetaV, { dy: -0.4, color: "#1f3fa6", f: 4.4 });
          pose("aire"); e.a = 0; sombraPies.setAttribute("opacity", 0); vel.setAttribute("opacity", 0); sombra.setAttribute("opacity", 1);
          const T = s.t, durV = Math.max(1.1, T * 1.3);
          return ctx.anima(durV, (kk) => {
            const t = kk * T, x = v * t, y = b - 5 * t * t, gy = piso(x);
            e.X = pX(x); e.Y = pY(y);
            let d = ""; for (let i = 0; i <= 24; i++) { const ti = t * i / 24; d += (i ? " L" : "M") + n1(pX(v * ti)) + "," + n1(pY(b - 5 * ti * ti)); }
            rastro.setAttribute("d", d);
            const alto = Math.max(0, y - gy), sc = Math.max(0.45, 1 - alto / 14);
            sombraG.setAttribute("transform", `matrix(1,0,-1,1,0,${n1(pY(gy))})`);
            sombra.setAttribute("cx", n1(e.X)); sombra.setAttribute("cy", 0); sombra.setAttribute("rx", n1(80 * sc)); sombra.setAttribute("ry", n1(40 * sc)); sombra.setAttribute("opacity", n2(0.3 + 0.7 * sc));
            ponVista(vistaSigue(e.X, e.Y));
          });
        })
        .then(() => {
          sombra.setAttribute("opacity", 0);
          if (s.tipo === "orilla") {
            pose("ate"); tiembla(0.8);
            const y0 = s.y; return ctx.anima(0.35, (k) => { e.Y = pY(y0 - (y0 - 0) * k); e.X = pX(s.x) - 30 * k; dibuja(); }, "entra").then(() => { sombraPies.setAttribute("opacity", 1); return salpica(e.X, e.Y); });
          }
          pose("ate"); sombraPies.setAttribute("opacity", 1); dibuja();
          if (s.tipo === "acierto") tiembla(0.5);
          return salpica(e.X, e.Y);
        })
        .then(() => (o.caja ? encuadra(o.caja, 0.6) : null));
    }
    /* Cambia la altura de la rampa (animada si dur > 0); el esquiador se queda arriba. */
    function rampa(h, dur = 0, texto2) {
      if (texto2 !== undefined) textoH = texto2;
      const h0 = hR;
      if (!(dur > 0) || h0 === h) { haceRampa(h); arriba(); return Promise.resolve(); }
      return ctx.anima(dur, (k) => { haceRampa(h0 + (h - h0) * k); arriba(); }, "suave");
    }

    /* Deja la escena lista para un nivel.
       o = { h, b, zona: { X, W }, paso: { xs, d }, textoH, textoB, cotaZona, vista } */
    function prepara(o) {
      lugar = { b: o.b, zona: o.zona || null, paso: o.paso || null };
      textoH = o.textoH || null;
      [gCotas, gMarcas, gNotas, viejos, gSalpica].forEach((g) => { g.textContent = ""; });
      rastro.setAttribute("d", ""); huella.setAttribute("opacity", 0); sombra.setAttribute("opacity", 0); mundo.removeAttribute("transform");
      const z = lugar.zona, x1 = (z ? z.X + z.W : 40) + 40;
      haceTerreno(x1);
      haceRampa(o.h); arriba();
      if (o.textoB) cotaAlto(1.4, 0, o.b, o.textoB);
      if (z && o.cotaZona) cotaSuelo(0, z.X, z.X + " m", { y: piso(z.X) });
      const p = lugar.paso;
      if (p) cotaAlto(p.xs - 0.3, 0, p.d, Math.abs(p.d) + " m", { anc: "end", arriba: p.d > 0 });
      mira(o.vista);
    }

    return { prepara, rampa, suelta, encuadra, mira, cotaSuelo, cotaAlto, tache, bien, brilla, energia };
  }

  window.EscenaEsquiador = { crea };
})();
