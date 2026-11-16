// Códice Vivo · escena 3D del libro (página de producto).
// Solo se carga en libros/fisica-unam/, después del primer pintado, y solo si hay WebGL
// y el usuario no pidió menos movimiento. Si algo falla, queda la imagen fija de respaldo.
import * as THREE from './vendor/three.min.js';

const PI = Math.PI;
const azar = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const textura = (c, pixel) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } else t.anisotropy = 4; return t; };

/* ---------- texturas hechas en canvas (sin archivos de imagen) ---------- */
function madera() {
  const [c, g] = lienzo(512, 512), r = azar(7);
  g.fillStyle = '#B27E50'; g.fillRect(0, 0, 512, 512);
  for (let p = 0; p < 6; p++) {                                   // tablones
    const y = p * 86, tono = 0.92 + r() * 0.16;
    g.fillStyle = `rgba(${150 * tono | 0},${100 * tono | 0},${60 * tono | 0},.55)`; g.fillRect(0, y, 512, 86);
    for (let i = 0; i < 70; i++) {                                 // vetas
      const yy = y + r() * 86, a = 0.05 + r() * 0.14;
      g.strokeStyle = r() < 0.5 ? `rgba(70,40,20,${a})` : `rgba(255,220,170,${a * 0.7})`; g.lineWidth = 0.6 + r() * 1.6;
      g.beginPath(); g.moveTo(0, yy);
      for (let x = 0; x <= 512; x += 64) g.lineTo(x, yy + Math.sin(x * 0.02 + i) * 3 + (r() - 0.5) * 3);
      g.stroke();
    }
    g.fillStyle = 'rgba(40,22,12,.5)'; g.fillRect(0, y, 512, 2);   // junta
  }
  for (let i = 0; i < 4; i++) { const x = r() * 512, y = r() * 512, rad = 6 + r() * 8; const gr = g.createRadialGradient(x, y, 1, x, y, rad); gr.addColorStop(0, 'rgba(60,32,16,.7)'); gr.addColorStop(1, 'rgba(60,32,16,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad * 1.6, rad, 0, 0, 7); g.fill(); }
  return textura(c);
}
function hojas(vertical) {
  const [c, g] = lienzo(64, 64); g.fillStyle = '#F4EAD0'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 2) { g.fillStyle = i % 4 ? 'rgba(170,140,90,.5)' : 'rgba(120,95,60,.28)'; vertical ? g.fillRect(i, 0, 1, 64) : g.fillRect(0, i, 64, 1); }
  return textura(c);
}
// Portada: color + relieve (el relieve es otro canvas en gris que se usa como bumpMap)
function portada(figura) {
  const W = 768, H = 1075, [c, g] = lienzo(W, H), [b, gb] = lienzo(W, H), r = azar(3);
  g.fillStyle = '#A5352A'; g.fillRect(0, 0, W, H); gb.fillStyle = '#808080'; gb.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,200,170' : '60,10,10'},${0.03 + r() * 0.05})`; g.fillRect(r() * W, r() * H, 2, 2); }   // tela
  g.fillStyle = 'rgba(60,12,10,.45)'; g.fillRect(0, 0, 54, H); gb.fillStyle = '#505050'; gb.fillRect(44, 0, 12, H);                                              // bisagra
  const marco = (cx, m, ancho, color, gris) => { cx.strokeStyle = cx === g ? color : gris; cx.lineWidth = ancho; cx.strokeRect(m + 30, m, W - 2 * m - 30, H - 2 * m); };
  marco(g, 44, 5, '#E6C27A'); marco(gb, 44, 7, 0, '#D0D0D0'); marco(g, 58, 1.5, '#E6C27A'); marco(gb, 58, 3, 0, '#B8B8B8');
  // ventana con la figura
  const vx = 118, vy = 108, vw = W - 2 * 88 - 30, vh = 520;
  g.fillStyle = '#F6F1E6'; g.beginPath(); g.roundRect(vx, vy, vw, vh, 10); g.fill(); g.strokeStyle = '#E6C27A'; g.lineWidth = 4; g.stroke();
  gb.fillStyle = '#585858'; gb.beginPath(); gb.roundRect(vx, vy, vw, vh, 10); gb.fill(); gb.strokeStyle = '#D0D0D0'; gb.lineWidth = 6; gb.stroke();
  if (figura) { const e = Math.max(vw / figura.width, vh / figura.height), fw = figura.width * e, fh = figura.height * e; g.save(); g.beginPath(); g.roundRect(vx + 4, vy + 4, vw - 8, vh - 8, 8); g.clip(); const fx = vx + (vw - fw) / 2, fy = vy - (fh - vh) * 0.3;
    if ('filter' in g) g.filter = 'contrast(1.9) saturate(1.5)';
    g.drawImage(figura, fx, fy, fw, fh);
    // dos pasadas en «multiplicar» engrosan y oscurecen los trazos (también donde no hay ctx.filter, como Safari)
    if ('filter' in g) g.filter = 'none';   // con filtro activo, «multiplicar» se sale del recorte y ennegrece la tapa
    g.globalCompositeOperation = 'multiply'; g.drawImage(figura, fx, fy, fw, fh); g.drawImage(figura, fx, fy, fw, fh);
    g.restore(); }
  // textos (en relieve)
  const texto = (t, y, fuente, color, esp) => { for (const cx of [g, gb]) { cx.font = fuente; cx.textAlign = 'center'; cx.fillStyle = cx === g ? color : '#E8E8E8'; if ('letterSpacing' in cx) cx.letterSpacing = esp || '0px'; cx.fillText(t, W / 2 + 15, y); } };
  texto('Física', 800, '500 168px "EB Garamond", Georgia, serif', '#FFFCF6');
  texto('UNAM', 880, '700 50px system-ui, sans-serif', '#FFFCF6', '14px');
  texto('15 láminas', 950, '400 40px system-ui, sans-serif', '#F2DFC0');
  return [textura(c), new THREE.CanvasTexture(b)];
}
function lomo() {
  const W = 128, H = 640, [c, g] = lienzo(W, H);
  const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#7A241C'); gr.addColorStop(0.5, '#A5352A'); gr.addColorStop(1, '#7A241C'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#E6C27A'; [36, 48, H - 52, H - 40].forEach(y => g.fillRect(0, y, W, 5));
  g.save(); g.translate(W / 2, H / 2); g.rotate(-PI / 2); g.font = '500 58px "EB Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#E6C27A'; g.fillText('Física · UNAM', 0, 4); g.restore();
  return textura(c);
}
// Sprites de pixel: flama y gatos
function pixel(filas, colores) {
  const [c, g] = lienzo(filas[0].length, filas.length);
  filas.forEach((f, y) => [...f].forEach((ch, x) => { if (colores[ch]) { g.fillStyle = colores[ch]; g.fillRect(x, y, 1, 1); } }));
  return textura(c, true);
}
const CABEZA = ['...g.........g..', '...gg.......gg..', '...gigggggggig..', '...gggsgsgsggg..', '...ggggggggggg..', '...ggoogggoogg..', '...ggopgggopgg..', '...gggggnggggg..', '....ggwwwwwgg...', '....ggggggggg...'];
const GRIS = { g: '#8F9099', s: '#70717B', w: '#F4F1EA', i: '#E3A6A0', n: '#D98880', o: '#B9D46C', p: '#1E1A1C' };
const NEGRA = { g: '#2A2429', s: '#2A2429', w: '#3A3238', i: '#6B4A52', n: '#B0707A', o: '#F2C94C', p: '#1E1A1C' };
const FLAMA = [['...y...', '..yyy..', '..ywy..', '.yywyy.', '.yywyy.', '..yoy..', '...o...'], ['..y....', '..yy...', '..ywy..', '.yywyy.', '.yywyy.', '..yoy..', '...o...']];

export async function monta(cont) {
  const ancho = () => cont.clientWidth, alto = () => cont.clientHeight;
  const rd = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  rd.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  rd.setSize(ancho(), alto(), false);
  rd.shadowMap.enabled = true; rd.shadowMap.type = THREE.PCFSoftShadowMap;
  rd.toneMapping = THREE.ACESFilmicToneMapping; rd.toneMappingExposure = 1.22;
  const lz = rd.domElement; lz.className = 'producto__lienzo'; lz.setAttribute('aria-hidden', 'true');

  const escena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(27, ancho() / alto(), 0.1, 40);
  const encuadra = () => { const a = ancho() / alto(); cam.aspect = a; cam.position.set(0, 2.7, a < 0.9 ? 11.6 : 10.3); cam.lookAt(0, 0.98, 0); cam.updateProjectionMatrix(); };
  encuadra();

  /* luz suave: cielo + luz principal con sombra + relleno frío */
  escena.add(new THREE.HemisphereLight(0xFFF3DC, 0x8A6A4A, 1.15));
  const sol = new THREE.DirectionalLight(0xFFEBD0, 2.6); sol.position.set(-3.6, 6.2, 4.6); sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024); sol.shadow.camera.left = -3.4; sol.shadow.camera.right = 3.4; sol.shadow.camera.top = 3.6; sol.shadow.camera.bottom = -3; sol.shadow.camera.near = 1; sol.shadow.camera.far = 16;
  sol.shadow.radius = 5; sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.02; escena.add(sol);
  const relleno = new THREE.DirectionalLight(0xCFE6E8, 0.55); relleno.position.set(4.5, 2.5, 3); escena.add(relleno);

  const giro = new THREE.Group(); escena.add(giro);
  const mat = o => new THREE.MeshStandardMaterial(o);
  const pieza = (geo, m, x, y, z, sombra = true) => { const p = new THREE.Mesh(geo, m); p.position.set(x, y, z); p.castShadow = sombra; p.receiveShadow = true; return p; };

  /* mesa de madera con vetas */
  const tMadera = madera(), canto = mat({ color: 0x7E5633, roughness: 0.75 });
  giro.add(pieza(new THREE.CylinderGeometry(2.2, 2.2, 0.16, 72), [canto, mat({ map: tMadera, roughness: 0.62 }), canto], 0, -0.08, 0, false));
  giro.add(pieza(new THREE.CylinderGeometry(2.08, 1.96, 0.1, 72), mat({ color: 0x5E3E24, roughness: 0.8 }), 0, -0.21, 0, false));

  /* libro: tapas con relieve, lomo y hojas con grosor */
  let figura = null;
  try {
    await Promise.race([document.fonts.load('500 168px "EB Garamond"'), new Promise(r => setTimeout(r, 1500))]);
    if (cont.dataset.figura) { figura = new Image(); figura.src = cont.dataset.figura; await Promise.race([figura.decode(), new Promise((_, n) => setTimeout(n, 4000))]); }
  } catch (e) { figura = null; }
  const bw = 1.62, bh = 2.27, bd = 0.44, tg = 0.04;
  const [tPortada, tRelieve] = portada(figura), tapa = mat({ color: 0x8E2C23, roughness: 0.7 });
  const libro = new THREE.Group(); libro.position.set(0.05, bh / 2, -0.1); libro.rotation.y = -0.32;
  libro.add(pieza(new THREE.BoxGeometry(bw, bh, tg), [tapa, tapa, tapa, tapa, mat({ map: tPortada, bumpMap: tRelieve, bumpScale: 2.2, roughness: 0.62 }), tapa], 0, 0, bd / 2 - tg / 2));
  libro.add(pieza(new THREE.BoxGeometry(bw, bh, tg), tapa, 0, 0, -bd / 2 + tg / 2));
  libro.add(pieza(new THREE.BoxGeometry(tg, bh, bd), [tapa, mat({ map: lomo(), roughness: 0.6 }), tapa, tapa, tapa, tapa], -bw / 2 + tg / 2, 0, 0));
  const hv = mat({ map: hojas(true), roughness: 0.9 }), hh = mat({ map: hojas(false), roughness: 0.9 }), papel = mat({ color: 0xF4EAD0, roughness: 0.9 });
  libro.add(pieza(new THREE.BoxGeometry(bw - 0.1, bh - 0.1, bd - 2 * tg), [hh, papel, hv, hv, papel, papel], 0.01, 0, 0));
  giro.add(libro);

  /* Griseldo y Chikis, diminutos, asomándose detrás del libro (sprites de pixel) */
  const gato = (pal, x, vol) => { const t = pixel(vol ? CABEZA.map(f => [...f].reverse().join('')) : CABEZA, pal), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, alphaTest: 0.5 })); s.scale.set(0.5, 0.3125, 1); s.position.set(x, -bh / 2 + 0.15, -bd / 2 - 0.12); libro.add(s); return s; };
  const gris = gato(GRIS, -bw / 2 - 0.13, false), negra = gato(NEGRA, bw / 2 + 0.13, true);

  /* planta */
  const planta = new THREE.Group(); planta.position.set(-1.38, 0, 0.6);
  const barro = mat({ color: 0xB8663F, roughness: 0.85 });
  planta.add(pieza(new THREE.CylinderGeometry(0.27, 0.19, 0.36, 28), barro, 0, 0.18, 0));
  planta.add(pieza(new THREE.CylinderGeometry(0.295, 0.295, 0.07, 28), barro, 0, 0.36, 0));
  planta.add(pieza(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 28), mat({ color: 0x3A2A1E, roughness: 1 }), 0, 0.395, 0, false));
  const hoja = new THREE.SphereGeometry(0.17, 14, 10), verdes = [0x3F6B58, 0x5F8558, 0x8FA455, 0x447058];
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * PI * 2 + 0.3, inc = i % 3 === 0 ? 0.15 : 0.55 + (i % 2) * 0.2, h = pieza(hoja, mat({ color: verdes[i % 4], roughness: 0.7 }), Math.sin(a) * 0.13 * inc * 2, 0.62 + (i % 3 === 0 ? 0.2 : 0), Math.cos(a) * 0.13 * inc * 2);
    h.scale.set(0.5, 1.75 + (i % 3 === 0 ? 0.5 : 0), 0.2); h.rotation.set(Math.cos(a) * inc, a, -Math.sin(a) * inc); planta.add(h);
  }
  giro.add(planta);

  /* vela: latón, cera y flama de pixel con su luz */
  const vela = new THREE.Group(); vela.position.set(1.36, 0, 0.62);
  const laton = mat({ color: 0xC9A85B, metalness: 0.85, roughness: 0.32 });
  vela.add(pieza(new THREE.CylinderGeometry(0.22, 0.25, 0.05, 28), laton, 0, 0.025, 0));
  vela.add(pieza(new THREE.CylinderGeometry(0.07, 0.1, 0.1, 20), laton, 0, 0.1, 0));
  vela.add(pieza(new THREE.CylinderGeometry(0.12, 0.09, 0.04, 20), laton, 0, 0.165, 0));
  vela.add(pieza(new THREE.CylinderGeometry(0.085, 0.085, 0.52, 20), mat({ color: 0xF6ECD4, roughness: 0.55, emissive: 0x5A3A10, emissiveIntensity: 0.35 }), 0, 0.44, 0));
  const flamas = FLAMA.map(f => pixel(f, { y: '#F6C65B', w: '#FFF3BE', o: '#E07A3F' }));
  const flama = new THREE.Sprite(new THREE.SpriteMaterial({ map: flamas[0], alphaTest: 0.5 })); flama.scale.set(0.17, 0.22, 1); flama.position.set(0, 0.82, 0); vela.add(flama);
  const [cg, gg] = lienzo(64, 64), grad = gg.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, 'rgba(255,205,120,.55)'); grad.addColorStop(1, 'rgba(255,205,120,0)'); gg.fillStyle = grad; gg.fillRect(0, 0, 64, 64);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura(cg), depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(1.1, 1.1, 1); halo.position.copy(flama.position); vela.add(halo);
  const luzVela = new THREE.PointLight(0xFFB45A, 3.2, 4.5, 2); luzVela.position.set(0, 0.86, 0); vela.add(luzVela);
  giro.add(vela);

  cont.appendChild(lz);

  /* giro: solo, despacio; o arrastrando, con límites */
  const LIM = 1.05, INC = 0.2;
  let yaw = 0.25, inc = 0, arrastra = false, x0 = 0, y0 = 0, yaw0 = 0, inc0 = 0, suelto = -1e9, visible = true, fijo = null;
  lz.addEventListener('pointerdown', e => { arrastra = true; x0 = e.clientX; y0 = e.clientY; yaw0 = yaw; inc0 = inc; lz.setPointerCapture(e.pointerId); cont.classList.add('es-arrastre'); });
  lz.addEventListener('pointermove', e => { if (!arrastra) return; yaw = THREE.MathUtils.clamp(yaw0 + (e.clientX - x0) * 0.009, -LIM, LIM); inc = THREE.MathUtils.clamp(inc0 + (e.clientY - y0) * 0.004, -INC * 0.4, INC); });
  const suelta = () => { if (!arrastra) return; arrastra = false; suelto = performance.now(); cont.classList.remove('es-arrastre'); };
  lz.addEventListener('pointerup', suelta); lz.addEventListener('pointercancel', suelta);
  if ('IntersectionObserver' in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(cont);
  if ('ResizeObserver' in window) new ResizeObserver(() => { rd.setSize(ancho(), alto(), false); encuadra(); }).observe(cont);

  let listo = false;
  const cuadro = t => {
    requestAnimationFrame(cuadro);
    if (!visible || document.hidden) return;
    const s = t / 1000;
    if (fijo !== null) { yaw = fijo; inc = 0.04; }
    else if (!arrastra && t - suelto > 2600) { yaw += (Math.sin(s * 0.28) * 0.62 - yaw) * 0.02; inc += (0.04 - inc) * 0.03; }
    giro.rotation.y = yaw; giro.rotation.x = inc;
    const f = (s * 6 | 0) % 2; flama.material.map = flamas[f]; flama.position.x = f ? 0.008 : -0.004;
    luzVela.intensity = 3 + Math.sin(s * 11) * 0.35 + Math.sin(s * 23.7) * 0.25; halo.scale.setScalar(1.05 + Math.sin(s * 9) * 0.06);
    gris.position.x = -bw / 2 - 0.1 - (Math.sin(s * 0.7) * 0.5 + 0.5) * 0.09; negra.position.x = bw / 2 + 0.1 + (Math.sin(s * 0.55 + 2) * 0.5 + 0.5) * 0.09;
    rd.render(escena, cam);
    if (!listo) { listo = true; cont.classList.add('es-3d'); }
  };
  requestAnimationFrame(cuadro);
  // gancho para sacar la imagen fija de respaldo (no se usa en la página)
  cont.__escena = { fija: v => { fijo = v; }, foto: q => { giro.rotation.y = fijo === null ? yaw : fijo; rd.render(escena, cam); return lz.toDataURL('image/webp', q); } };
}
