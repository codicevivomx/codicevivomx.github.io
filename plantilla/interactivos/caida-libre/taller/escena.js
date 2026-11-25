// Escena 3D de la lámina «El salto». Modelos .glb de plantilla/modelos/caida-libre/ con toon de 2 tonos
// y contorno; guion de cine de taller.cine (9 tomas, rampas de velocidad) y órbita (bullet time) en las
// pausas. Se carga solo al tocar «Ver la escena». Sin posprocesado: todo es geometría y color.
// Escala: en vertical 1 unidad = 1 m de caída (la cinta mide de verdad); los modelos van a escala
// de maqueta (escena3d.escalaMaqueta) para que se lean junto a 45 m de caída. La tierra es decorado lejano.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";   // .glb comprimidos (gltfpack -cc)
import { clone as clonar } from "three/addons/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { estilizar, pieza, ajustarContorno, agregarContorno, contornoPropio } from "./toon.js";
import { crearEtiquetas } from "./etiquetas.js";
import { crearTierra } from "./tierra.js";
import { crearPaleta } from "./paleta.js";

const C = { blanco: 0xf4f4f1, gris: 0xd6d7d5, grisO: 0x9fa3aa, menta: 0x8fd3b0, azul: 0x6f93c9,
  coral: 0xe39a84, coralO: 0xc77964, alumna: 0xe3b95a, tinta: 0x2a2a33, nube: 0xffffff };
// Punto del estribo donde se para, en ejes del .glb (avioneta.py: x −0.98, y = 2.66 delante del montante,
// z 0.955; menos el centro de masa (0, 3.468, 1.871); +Y arriba).
const ESTRIBO = new THREE.Vector3(-0.98, -0.916, 0.808);
// De las suelas a la cadera en la pose «parada» agachada (sonda de persona.py: tobillo a 0.369 m → suela ≈ 0.28).
const CADERA = 0.67;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const CAEN = new Set(["salto", "picado", "persecucion", "abrir"]);
const LEJOS = { travelling: .75, puerta: .7, salto: 1, picado: 1, persecucion: 1, abrir: 1 };   // retroceso en vertical

// Librea «Aerocódice» (calcas): canvas dibujados una vez con las fuentes de la página y el ícono del logo.
// Medidas en metros de avioneta.py (Blender: x a la izquierda del piloto, y hacia la cola, z arriba).
const CM_AV = [0, 3.468, 1.871];                                      // centro de masa de la avioneta (avioneta.py)
const deBlender = (x, y, z) => new THREE.Vector3(x - CM_AV[0], z - CM_AV[2], -(y - CM_AV[1]));
async function librea(avM, P, rutaLogo) {
  await Promise.all(['800 120px "Bricolage Grotesque"', '700 80px "Bricolage Grotesque"'].map((f) => document.fonts.load(f).catch(() => {})));
  const logo = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = rutaLogo; });
  const lienzo = (w, h, pinta) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; pinta(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const tinta = P.css("#2A2A33"), coral = P.css("#E39A84"), menta = P.css("#3FA581");
  const nombre = lienzo(1024, 192, (x, w, h) => {
    x.font = '800 132px "Bricolage Grotesque", sans-serif'; x.textBaseline = "middle"; x.textAlign = "center";
    x.fillStyle = tinta; x.fillText("AEROCÓDICE", w / 2, h / 2 + 6, w - 16);
  });
  const matricula = lienzo(512, 128, (x, w, h) => {
    x.font = '700 92px "Bricolage Grotesque", sans-serif'; x.textBaseline = "middle"; x.textAlign = "center";
    x.fillStyle = tinta; x.fillText("XB-CDV", w / 2, h / 2 + 4, w - 12);
  });
  const capitular = lienzo(256, 256, (x, w, h) => {
    if (logo) x.drawImage(logo, 100, 100, 318, 318, 6, 6, w - 12, h - 12);   // la loseta roja con la «C» del ícono
    else { x.fillStyle = coral; x.fillRect(0, 0, w, h); }
  });
  if (P.activa && logo) {                                     // el ícono también pasa por la paleta
    const c = capitular.image, x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height), cache = new Map();
    for (let i = 0; i < d.data.length; i += 4) {
      if (!d.data[i + 3]) continue;
      const k = (d.data[i] << 16) | (d.data[i + 1] << 8) | d.data[i + 2];
      let n = cache.get(k); if (n === undefined) { n = P.num(k); cache.set(k, n); }
      d.data[i] = n >> 16; d.data[i + 1] = (n >> 8) & 255; d.data[i + 2] = n & 255;
    }
    x.putImageData(d, 0, 0); capitular.needsUpdate = true;
  }
  const calca = (tex, w, h, pos, giro) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.position.copy(pos); m.rotation.y = giro; m.userData.propio = true; avM.add(m); return m;
  };
  const conicidad = Math.atan2(0.58 - 0.36, 6.5 - 4.6);         // el costado se estrecha hacia la cola
  for (const lado of [-1, 1]) {                                   // -1: derecho (la puerta, hacia la cámara); 1: izquierdo
    calca(nombre, 1.74, 0.36, deBlender(lado * 0.497, 5.60, 1.87), lado * Math.PI / 2 + lado * conicidad);
    calca(matricula, 0.96, 0.24, deBlender(lado * 0.288, 7.62, 1.88), lado * Math.PI / 2 + lado * Math.atan2(0.36 - 0.22, 8.5 - 6.5));
    calca(capitular, 0.56, 0.56, deBlender(lado * 0.06, 9.02, 2.48), lado * Math.PI / 2);
  }
}

export async function crearEscena({ lienzo, maqueta, D, P, rutaModelos, reducido = false, alCargar = () => {} }) {
  const E = D.esc, CI = D.cine, ESC = E.escalaMaqueta, TC = D.TC, K = D.v0.masaTandem;
  const ESCP = ESC * 0.92;                   // personas un poco menores: paradas en el estribo caben bajo el ala
  const h = (t) => D.calc({ t }).h;          // h = g·t²/2 (lecturas.formulas.h)
  const HT = h(TC), YP = HT + 3;             // la salida queda 3 m sobre el 0 de la cinta... y la cinta mide HT
  const X0 = 0, Z0 = 4.2, XT = X0 - E.separacionTandem, ZT = Z0 + 3, XC = X0 + 8.8, ZC = Z0;
  const SALTO = D.salto, ABRIR = D.abrir, TOMAS = D.tomas, YT = -CI.tierra.profundidad;

  // ---------- render ----------
  const ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  ren.setPixelRatio(Math.min(devicePixelRatio, 2));
  ren.outputColorSpace = THREE.SRGBColorSpace;
  const esc = new THREE.Scene();
  // Perspectiva atmosférica: lo lejano se aclara y azulea; la niebla y el pie del cielo son el mismo azul claro.
  const CIELO = ["#BFDDEC", "#D8EAF4", "#DDE9F0"];
  esc.fog = new THREE.Fog(0xffffff, CI.tierra.nieblaDe, CI.tierra.nieblaA);
  // Cielo pintado: degradado + pinceladas suaves (acuarela) en un canvas que se pinta UNA vez
  // (también para la imagen fija). La niebla toma el color de abajo para que el horizonte no se corte.
  function pintaCielo() {
    const cielo = CIELO.map(P.css);
    esc.fog.color.setStyle(cielo[2]);
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, cielo[0]); g.addColorStop(.6, cielo[1]); g.addColorStop(1, cielo[2]);
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    let sem = 21; const az = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) {                               // pinceladas largas y horizontales
      const yy = az() * 430, claro = az() < .62;
      x.globalAlpha = .05 + az() * .08;
      x.fillStyle = claro ? "#ffffff" : cielo[0];
      x.beginPath(); x.ellipse(az() * 512, yy, 40 + az() * 120, 4 + az() * 10, (az() - .5) * .12, 0, 6.283); x.fill();
    }
    x.globalAlpha = .07; x.strokeStyle = "#ffffff"; x.lineWidth = 1.2;     // pincel seco
    for (let i = 0; i < 60; i++) { const yy = az() * 400, x0 = az() * 512; x.beginPath(); x.moveTo(x0, yy); x.lineTo(x0 + 30 + az() * 90, yy + (az() - .5) * 4); x.stroke(); }
    x.globalAlpha = 1;
    esc.background?.dispose();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; esc.background = tex;
  }
  pintaCielo();
  const cam = new THREE.PerspectiveCamera(34, 1, 0.5, 2800);
  esc.add(new THREE.HemisphereLight(0xffffff, 0xcfd8dc, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(-6, 10, 4); esc.add(sol);
  const et = crearEtiquetas(maqueta);

  // ---------- modelos ----------
  const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let n = 0;
  const cargar = (nombre) => cargador.loadAsync(rutaModelos + nombre + ".glb").then((g) => { alCargar(++n, 4); return g; });
  const [gAv, gP, gT, gV] = await Promise.all(["avioneta", "paracaidista", "tandem", "paracaidas"].map(cargar));
  const clip = (g, nombre) => g.animations.find((c) => c.name === nombre);
  let tris = 0;

  // Avioneta: nariz hacia +X (vuela a la derecha), puerta hacia la cámara (+Z).
  const av = new THREE.Group(); esc.add(av);
  const avM = gAv.scene; avM.scale.setScalar(ESC); avM.rotation.y = Math.PI / 2; av.add(avM);
  tris += estilizar(avM);
  const helice = avM.getObjectByName("Helice");
  await librea(avM, P, rutaModelos + "../../../assets/logo/codice-vivo-icono.svg");
  const hojaPuerta = avM.getObjectByName("Puerta"); if (hojaPuerta) hojaPuerta.visible = false;   // vuela sin puerta, como los aviones de salto
  const enEstribo = ESTRIBO.clone().add(new THREE.Vector3(0, CADERA * ESCP / ESC, 0));   // origen de la persona parada
  av.updateMatrixWorld(true);
  const desdeAv = avM.localToWorld(enEstribo.clone());                        // con la avioneta en el origen
  const avBase = new THREE.Vector3(X0, YP, Z0).sub(desdeAv);                  // en el salto, la puerta queda en (X0, YP)
  // La avioneta avanza en tiempo físico (en cámara lenta también va lenta). velocidadAvioneta es dato visual.
  const avX = (S) => avBase.x + (D.tauDe(S) - SALTO) * E.velocidadAvioneta;

  // Personas: clon a escala de maqueta, con su paracaídas colgado del hueso «enganche».
  function persona(g, escalaVela, colorCelda) {
    const o = clonar(g.scene); o.scale.setScalar(ESCP); esc.add(o);
    o.updateMatrixWorld(true);                                                 // reposo: de pie
    const eng = o.getObjectByName("enganche");
    const vela = clonar(gV.scene);
    // la vela se alinea con el cuerpo (no con los ejes propios del hueso) y sigue al pecho
    vela.quaternion.copy(eng.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(o.getWorldQuaternion(new THREE.Quaternion())));
    vela.scale.setScalar(ESCP * escalaVela / eng.getWorldScale(new THREE.Vector3()).x);
    eng.add(vela);
    vela.visible = false;
    tris += estilizar(o);
    if (colorCelda) vela.traverse((m) => { if (m.isMesh) for (const x of [].concat(m.material)) if (x.name === "vela_1") x.uniforms.color.value.set(colorCelda); });
    const mp = new THREE.AnimationMixer(o), A = {};
    for (const c of g.animations) { const a = mp.clipAction(c); a.play(); a.paused = true; a.setEffectiveWeight(0); A[c.name] = a; }
    const mv = new THREE.AnimationMixer(vela), abre = mv.clipAction(clip(gV, "abrir"));
    abre.setLoop(THREE.LoopOnce); abre.clampWhenFinished = true; abre.play(); abre.paused = true;
    return { o, vela, mp, A, mv, abre, velaQ0: vela.quaternion.clone() };
  }
  const yo = persona(gP, 1, null);
  const tan = persona(gT, D.T.escalaVelaTandem, C.azul);
  // Luces de navegación: siempre del lado iluminado del toon (se leen encendidas).
  avM.traverse((m) => { if (m.isMesh) for (const x of [].concat(m.material)) if (/^luz_/.test(x.name)) x.uniforms.umbral.value = -2; });
  const contornoYo = contornoPropio(yo.o);                                     // se tiñe con el color de cada segundo
  // LOD de detalle: costuras, hebillas y reloj solo cuando la cámara está cerca (ahorra llamadas de dibujo).
  const DETALLE = /costura|hebilla|reloj_/;
  const detalleDe = (raiz) => { const l = []; raiz.traverse((m) => { if (m.isMesh && m.name !== "contorno" && [].concat(m.material).some((x) => DETALLE.test(x.name))) l.push(m); }); return l; };
  const detYo = detalleDe(yo.o), detTan = detalleDe(tan.o);
  const verDetalle = (lista, centro, cerca) => { const v = cam.position.distanceTo(centro) < cerca; lista.forEach((m) => (m.visible = v)); };

  // «Fotos» de cada segundo: la paracaidista en arco, translúcida, donde estaba a los 1, 2, 3 s.
  const fotos = D.tramos.map((_, i) => {
    const k = i + 1, f = clonar(gP.scene); f.scale.setScalar(ESCP); esc.add(f);
    const m = new THREE.AnimationMixer(f); m.clipAction(clip(gP, "arco")).play(); m.update(0);
    estilizar(f, { opacidad: 0.3 });
    f.traverse((m) => { if (m.isMesh && [].concat(m.material).some((x) => /costura|hebilla|reloj_/.test(x.name))) m.visible = false; });   // las fotos no llevan detalle
    f.rotation.y = Math.PI / 2; f.position.set(X0, YP - h(k), Z0); f.visible = false;
    f.userData.et = et.nueva(D.texto(D.T.textos.segundo, {}, { k }), { lado: "izq", prioridad: 2 });
    f.userData.et.pos.set(X0 - 2.2, YP - h(k), Z0);
    return f;
  });

  // ---------- cinta de medir y tramos ----------
  pieza(new THREE.BoxGeometry(0.3, HT + 1, 0.3), C.blanco, esc, { pos: [XC, YP - (HT + 1) / 2, ZC] });
  const claves = D.tramos.map((_, i) => D.porK("hk", i + 1));
  for (let m = 0; m <= Math.round(HT); m++) {
    const clave = m === 0 || claves.some((c) => Math.abs(c - m) < 1e-6), may = m % 5 === 0;
    pieza(new THREE.BoxGeometry(clave ? 1.1 : may ? .7 : .4, .08, .08), C.tinta, esc,
      { pos: [XC + (clave ? .55 : may ? .35 : .2), YP - m, ZC + .16], contorno: false });
  }
  [0, ...claves].forEach((c) => {
    const e = et.nueva(D.tpl(D.T.textos.marca, { x: D.num(c, 0) }), { lado: "der", prioridad: 3, clase: "marca" });
    e.pos.set(XC + 1.2, YP - c, ZC); e.visible = true;
  });
  // Cada tramo crece mientras pasa su segundo (color del segundo: 1 amarillo, 2 menta, 3 coral).
  const colTramo = [C.alumna, C.menta, C.coral];
  const tramos = D.tramos.map((s, i) => {
    const a = i ? claves[i - 1] : 0, b = claves[i], largo = b - a - .5;
    const geo = new THREE.BoxGeometry(.5, largo, .5); geo.translate(0, -largo / 2, 0);
    const barra = pieza(geo, colTramo[i % 3], esc, { pos: [XC - .75, YP - a - .25, ZC] });
    barra.visible = false;
    barra.userData = { a, b, et: et.nueva(D.tpl(D.T.textos.tramo, { x: D.num(s, 0) }), { lado: "izq", prioridad: 2, clase: "tramo" }) };
    barra.userData.et.pos.set(XC - 1.2, YP - (a + b) / 2, ZC);
    return barra;
  });
  const guia = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]),
    new THREE.LineDashedMaterial({ color: C.azul, dashSize: .5, gapSize: .4 }));
  esc.add(guia);

  // Halo plano detrás de la paracaidista (sprite con degradado radial; nada de bloom).
  const halo = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: .6 }));
    s.userData.propio = true; s.scale.setScalar(4.2); s.visible = false; s.renderOrder = -2; esc.add(s);
    return s;
  })();

  // ---------- peso P y kP (pausa del tándem) ----------
  function flecha() {
    const g = new THREE.Group(); esc.add(g); g.visible = false;
    const tallo = pieza(new THREE.CylinderGeometry(.22, .22, 1, 10), C.coral, g);
    const punta = pieza(new THREE.ConeGeometry(.6, 1.3, 14), C.coral, g, { rot: [Math.PI, 0, 0] });
    g.userData.largo = (L) => { tallo.scale.y = L; tallo.position.y = -L / 2; punta.position.y = -L - .6; };
    return g;
  }
  const pesoSola = flecha(), pesoTan = flecha();
  const LP = 2.6;
  pesoSola.userData.largo(LP); pesoTan.userData.largo(LP * K);
  const etP = et.nueva(D.T.textos.peso, { lado: "der", prioridad: 5, clase: "peso" });
  const etKP = et.nueva(D.texto(D.T.textos.pesoTandem), { lado: "der", prioridad: 5, clase: "peso" });
  const etTan = et.nueva(D.texto(D.T.textos.tandem), { prioridad: 4, clase: "chip" });
  const etSola = et.nueva(D.texto(D.T.textos.sola), { prioridad: 4, clase: "chip" });

  // ---------- nubes y tierra ----------
  // Una nube = 5 esferas low-poly unidas en UNA geometría compartida (1 malla + 1 contorno por nube).
  const geoNube = new THREE.IcosahedronGeometry(1, 1);
  const unir = (bolas) => mergeGeometries(bolas.map(([a, b, c, r]) => geoNube.clone().scale(r, r, r).translate(a, b, c)));
  const geoCumulo = unir([[0, 0, 0, 1.6], [1.6, .3, .2, 1.3], [-1.5, -.1, .1, 1.2], [.5, .9, -.3, 1.1], [2.8, -.2, 0, .9]]);
  const nubes = [], matNube = new THREE.MeshLambertMaterial({ color: C.nube, flatShading: true });
  function nube(x, y, z, s) {
    const g = new THREE.Mesh(geoCumulo, matNube); g.position.set(x, y, z); g.scale.setScalar(s); esc.add(g);
    agregarContorno(g);
    g.userData = { casa: x, desliza: 0 };
    nubes.push(g);
  }
  // junto a la cinta (como antes) · en la ruta de la avioneta · abajo, entre la caída y la tierra
  nube(-30, 30, -6, 1.3); nube(22, 36, -14, 1.1); nube(-30, 24, -20, 1.6); nube(24, 16, -10, 1.2);
  nube(-34, 8, -22, 1.2); nube(22, 2, -18, 1.4); nube(-32, -16, -34, 1.5);   // fuera de la línea de la toma 6
  nube(-250, 64, -40, 2.2); nube(-185, 34, -60, 2.6); nube(-125, 72, -34, 1.8); nube(-75, 44, -75, 2.8); nube(-220, 30, 70, 2);
  nube(-30, -70, -50, 3.2); nube(40, -105, 20, 3.6); nube(-80, -140, 40, 4); nube(70, -160, -90, 4.4);
  // Capa baja (entre la caída y la tierra) y capa alta: el cielo tiene profundidad.
  [[-60, -32, -40, 2.8], [-15, -38, -70, 3.2], [35, -30, -45, 2.6], [70, -42, -20, 3.4], [-90, -36, 10, 3], [10, -45, 30, 3.6],
   [-40, 88, -90, 3.4], [60, 96, -120, 4], [-150, 92, -60, 3.6]].forEach(([x, y, z, k]) => nube(x, y, z, k));
  // Velo que la cámara atraviesa al caer (toma 5): nube translúcida en su camino, sin contorno.
  const matVelo = new THREE.MeshLambertMaterial({ color: C.nube, flatShading: true, transparent: true, opacity: .28, depthWrite: false });
  const velo = new THREE.Mesh(unir([[0, 0, 0, 1.6], [1.5, .3, .2, 1.2], [-1.4, -.1, .1, 1.1], [.4, .8, -.3, 1]]), matVelo);
  velo.position.set(5.9, 41.7, 12.9); velo.scale.setScalar(.85); esc.add(velo);
  // La tierra usa la paleta con menos croma y sin empujón al verde: viva pero natural (no verde limón).
  const pT = P.activa ? crearPaleta({ ...D.cine.paletas.predeterminada, croma: 1.25, verde: 0 }) : P;
  const tierra = crearTierra({ y: YT, hex: pT.css });   // tierra.userData.recolorea(hex) la repinta
  esc.add(tierra);
  // Sombras de nubes sobre la tierra: manchas suaves que se deslizan despacio (textura de 64 px, 10 planos).
  const texMancha = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.6, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const matSombra = new THREE.MeshBasicMaterial({ map: texMancha, color: 0x1d3524, transparent: true, opacity: .2, depthWrite: false });
  const NS_ = 10, sombras = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), matSombra, NS_);
  sombras.userData.propio = true; sombras.frustumCulled = false; esc.add(sombras);
  const datoSombra = Array.from({ length: NS_ }, (_, k) => ({ x: -650 + (k * 431) % 1300, z: -700 + (k * 283) % 1000, sx: 160 + (k * 37) % 120, sz: 110 + (k * 53) % 90 }));
  const mSom = new THREE.Matrix4(), pSom = new THREE.Vector3(), qSom = new THREE.Quaternion(), eSom = new THREE.Vector3();
  function moverSombras(tau) {                  // se deslizan con el tiempo de la escena (reproducible)
    datoSombra.forEach((o, k) => {
      const x = o.x - 500 + ((tau * (3 + k % 3) * 4 + 500) % 1000);
      sombras.setMatrixAt(k, mSom.compose(pSom.set(x, YT + 1.5, o.z), qSom, eSom.set(o.sx, 1, o.sz)));
    });
    sombras.instanceMatrix.needsUpdate = true;
  }
  moverSombras(0);
  // Sol: resplandor suave con un sprite, arriba a la izquierda, siempre a la misma distancia de la cámara.
  const SOL = new THREE.Vector3(-0.62, 0.5, -0.6).normalize();
  const sol_ = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, "rgba(255,252,236,1)"); g.addColorStop(.12, "rgba(255,248,222,.95)"); g.addColorStop(.35, "rgba(255,240,205,.35)"); g.addColorStop(1, "rgba(255,240,205,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    sp.scale.setScalar(420); sp.userData.propio = true; esc.add(sp); return sp;
  })();

  // ---------- paleta: pasada por los materiales al cargar y al soltar un deslizador (nunca por cuadro) ----------
  const colores = [], vistos = new Set();                      // [color de three, original]
  esc.traverse((o) => {
    for (const m of [].concat(o.material || [])) {
      if (vistos.has(m) || m.vertexColors || o.userData.propio) continue;
      vistos.add(m);
      const c = m.uniforms?.color?.value ?? m.color;
      if (c?.isColor) colores.push([c, "#" + c.getHexString()]);
    }
  });
  const tintaYo = new THREE.Color(), colSeg = colTramo.map(() => new THREE.Color());
  function aplicaPaleta(inicio) {
    for (const [c, h0] of colores) c.setStyle(P.hex(h0));
    tintaYo.copy(contornoYo.uniforms.color.value);
    colTramo.forEach((c, i) => colSeg[i].setHex(P.num(c)));
    if (!inicio) { pintaCielo(); tierra.userData.recolorea(P.css); }
  }
  aplicaPaleta(true);
  P.alCambiar(() => aplicaPaleta(false));

  // ---------- cámara ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let giro = 0;
  const orbita = { az: 0.78, el: 0.18, r: 72 };
  let arrastre = null, libre = false;
  lienzo.addEventListener("pointerdown", (e) => { if (!libre) return; arrastre = [e.clientX, e.clientY, orbita.az, orbita.el]; lienzo.setPointerCapture(e.pointerId); });
  lienzo.addEventListener("pointermove", (e) => { if (!arrastre) return; orbita.az = arrastre[2] - (e.clientX - arrastre[0]) * .006; orbita.el = clamp(arrastre[3] + (e.clientY - arrastre[1]) * .005, -.6, 1.2); });
  lienzo.addEventListener("pointerup", () => (arrastre = null));
  lienzo.addEventListener("wheel", (e) => { if (!libre) return; e.preventDefault(); orbita.r = clamp(orbita.r + e.deltaY * .05, 25, 120); }, { passive: false });
  const centroOrbita = V(X0 + 3, YP - HT * .55, Z0);
  const poseOrbita = (o = orbita) => [centroOrbita.clone().add(V(o.r * Math.cos(o.el) * Math.sin(o.az), o.r * Math.sin(o.el), o.r * Math.cos(o.el) * Math.cos(o.az))), centroOrbita.clone()];

  // Revelación: la cinta, las 3 fotos y las dos velas llenan `llenadoRevelacion` de la altura del lienzo,
  // en PC y en celular (la distancia se calcula con el fov y el aspecto). En vertical deja libre la claqueta.
  function revelacion() {
    const y0 = YP - HT - 1.4, y1 = YP + .6, x0 = XT - 3.5, x1 = XC + 4.5;
    const c = V((x0 + x1) / 2, (y0 + y1) / 2, (Z0 + ZT) / 2), t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const lleno = E.llenadoRevelacion ?? .86, hueco = cam.aspect < 1 ? .8 : 1;
    const dist = Math.max((y1 - y0) / (lleno * hueco) / (2 * t), (x1 - x0) / .92 / (2 * t * cam.aspect));
    c.y -= (1 - hueco) / 2 * 2 * t * dist;
    return [c.clone().add(V(.62, .04, .78).normalize().multiplyScalar(dist)), c];
  }
  const lerp2 = ([p0, o0], [p1, o1], k) => [p0.clone().lerp(p1, k), o0.clone().lerp(o1, k)];
  // Guion de cámara (taller.cine.tomas[].cam). l = avance 0→1 dentro de la toma; d = la paracaidista; a = la avioneta.
  const X8 = avX(TOMAS[1].de);
  const TOMA = {
    // plano de establecimiento: mira la tierra y sube (tilt up + grúa) hasta la avioneta que llega
    establecimiento: (l, d, a) => {
      const p = V(X8 + 8, YP - 26 + 30 * ease(l), Z0 + 52 - 8 * l);
      const suelo = V(p.x + 30, YT, p.z - 150);
      return [p, suelo.lerp(a.clone().add(V(0, -1, 0)), ease(clamp((l - .2) / .65)))];
    },
    // travelling: la cámara viaja junto a la avioneta y recorre el fuselaje
    travelling: (l, d, a) => [a.clone().add(V(-18 + 22 * ease(l), 3 - 1.5 * l, 26 - 6 * l)), a.clone().add(V(-2 + 5 * l, -.5, 0))],
    // primer plano en la puerta: bajo el ala (si no, la punta del ala tapa la puerta)
    puerta: (l, d) => [d.clone().add(V(5.5 - 1.5 * l, -.2, 7.5 - 1.5 * l)), d.clone().add(V(-1.2, .1, -1))],
    // salto: arranca donde terminó la puerta y se abre a un seguimiento lateral
    salto: (l, d) => { const k = ease(clamp(l * 1.3)); return [d.clone().add(V(4, -.2 + 2.2 * k, 6 + 18 * k)), d.clone().add(V(-1.2 + 3.7 * k, .1 - 1.6 * k, -1 + k))]; },
    // tilt down: desde arriba, la mirada baja hasta tener la tierra de fondo
    picado: (l, d) => [d.clone().add(V(7, 6 + 3.5 * ease(l), 11)), d.clone().add(V(1, -1.5 - 2 * ease(l), -1))],
    // picado cercano: mira al punto medio entre ella y la cinta, para que el tramo coral entre completo
    persecucion: (l, d) => [d.clone().add(V(4.4, 9, 13 - 1.5 * l)), d.clone().add(V(4.4, -3 - 2 * l, -1))],
    // apertura: desde abajo, la vela se infla contra el cielo
    abrir: (l, d) => [d.clone().add(V(9, -8 + 2 * l, 14)), d.clone().add(V(-1.5, 2.5 + 1.5 * l, 0))],
    revelacion: () => revelacion(),
    // grúa: sube sobre el paisaje y baja a la pose de la órbita libre del final
    paisaje: (l) => {
      const r = revelacion(), c = r[1], alto = [c.clone().add(V(70, 75, 110)), c.clone().add(V(-10, -70, -60))];
      return l < .55 ? lerp2(r, alto, ease(l / .55)) : lerp2(alto, poseOrbita({ az: .78, el: .18, r: 72 }), ease((l - .55) / .45));
    },
  };
  const tomaDe = (S) => { const i = TOMAS.findIndex((x) => S >= x.de && S < x.a); return i === -1 ? TOMAS.length - 1 : i; };
  function plano(i, S, d, a) {
    const x = TOMAS[i], l = clamp((S - x.de) / (x.a - x.de));
    let [p, o] = TOMA[x.cam](l, d, a);
    if (cam.aspect < 1.9 && LEJOS[x.cam]) {
      // Las tomas se encuadraron para la lámina ancha (~2.4:1). Pantalla vertical: más lejos y, al caer, centrado
      // entre la sola y el tándem. PC lado a lado (~1.2:1): solo un retroceso suave.
      const vertical = cam.aspect < 1;
      const k = vertical ? Math.min(2.2, LEJOS[x.cam] / cam.aspect) : 1 + (1.9 - cam.aspect) * 0.62;
      const dx = vertical && CAEN.has(x.cam) && S >= SALTO ? (XT - X0) / 2 : 0;
      o = o.clone().add(V(dx, 0, 0)); p = o.clone().add(p.clone().sub(o).add(V(dx, 0, 0)).multiplyScalar(k));
    }
    return [p, o];
  }

  function camara(S, d, est, W, H) {
    cam.clearViewOffset();
    if (est.respaldo) {                                  // imagen fija: avioneta entera con la paracaidista en la puerta
      cam.position.copy(d.clone().add(V(9, -.8, 15))); cam.lookAt(d.clone().add(V(-1.8, .7, -1.2))); return;
    }
    if (est.pausa) {
      // Bullet time: el tiempo se congela y la cámara orbita. El centro incluye las flechas de peso; en
      // celular el encuadre se corre hacia arriba lo que tapa la hoja levantada.
      if (!reducido) giro += est.dt * .32;
      const tan_ = est.pausa === "tandem";
      const c = tan_ ? V((X0 + XT) / 2, d.y - (LP * K) / 2 - .5, (Z0 + ZT) / 2) : d.clone();
      const a = .6 + giro, r = tan_ ? 36 : 26;
      cam.position.set(c.x + r * Math.sin(a), c.y + 2, c.z + r * Math.cos(a)); cam.lookAt(c);
      if (est.tapado > 0) cam.setViewOffset(W, H, 0, Math.min(est.tapado, H * .6) / 2, W, H);
      return;
    }
    if (est.libre) { const [p, o] = poseOrbita(); cam.position.copy(p); cam.lookAt(o); return; }
    const i = tomaDe(S), a = av.position;
    let [p, o] = plano(i, S, d, a);
    const ent = S - TOMAS[i].de;                         // fundido de cámara de 0.9 s entre tomas (corte si hay movimiento reducido)
    if (!reducido && i > 0 && ent < 0.9) [p, o] = lerp2(plano(i - 1, S, d, a), [p, o], ease(ent / 0.9));
    cam.position.copy(p); cam.lookAt(o);
  }

  let W = 1, H = 1, grosor = 2;
  function tam() {
    const r = lienzo.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    ren.setSize(W, H, false); cam.aspect = W / H; cam.fov = cam.aspect < .8 ? 46 : 34; cam.updateProjectionMatrix();
    ajustarContorno(ren, 2); grosor = 2 * ren.getPixelRatio();
  }
  new ResizeObserver(tam).observe(lienzo); tam();

  // ---------- efectos baratos: vetas de viento y líneas de velocidad (44 tiras instanciadas, 1 llamada) ----------
  const NV = 44, vetas = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x343a52, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }), NV);   // tinta translúcida (como en el cómic): sobre cielo y tierra claros se lee
  vetas.frustumCulled = false; vetas.userData.propio = true; vetas.renderOrder = 2; esc.add(vetas);
  const semVeta = (() => { let s0 = 7; const az = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647; return Array.from({ length: NV }, () => [az(), az(), az(), az()]); })();
  const mVeta = new THREE.Matrix4(), qVeta = new THREE.Quaternion(), pVeta = new THREE.Vector3(), eVeta = new THREE.Vector3(), yEje = new THREE.Vector3(0, 1, 0);
  function vetasDe(S, lec, d) {
    const tau = D.tauDe(S), v = lec.v, hT = lec.h;
    const viento = S < SALTO + 0.4, caida = S >= SALTO && S < ABRIR + 0.3 && v > 2;
    vetas.visible = !reducido && (viento || caida);
    if (!vetas.visible) return;
    if (caida) {                                  // líneas de velocidad: blancas, cortas, solo alrededor de ella; suben lo que ella cae
      const H = 7, L = 0.25 + v * 0.035;
      vetas.material.color.setHex(0xffffff); vetas.material.opacity = clamp(v / 18) * 0.75;
      semVeta.forEach(([a, b, e], i) => {
        const ang = a * 6.283, rad = 1.3 + b * 2.4;
        pVeta.set(d.x + Math.cos(ang) * rad, d.y - H / 2 + ((e * H + hT) % H), d.z + Math.sin(ang) * rad);
        qVeta.setFromAxisAngle(yEje, Math.atan2(cam.position.x - pVeta.x, cam.position.z - pVeta.z));
        mVeta.compose(pVeta, qVeta, eVeta.set(0.035, L, 1)); vetas.setMatrixAt(i, mVeta);
      });
    } else {                                      // viento: vetas horizontales que pasan junto a la avioneta
      const a0 = av.position, rel = tau * E.velocidadAvioneta * 2.2;
      vetas.material.color.setHex(0x343a52); vetas.material.opacity = 0.22;
      semVeta.forEach(([a, b, e, f], i) => {
        pVeta.set(a0.x + 18 - ((a * 36 + rel) % 36), a0.y + (b - .5) * 8, a0.z - 8 + e * 12);
        qVeta.identity(); mVeta.compose(pVeta, qVeta, eVeta.set(1.2 + f * 2.6, 0.05, 1)); vetas.setMatrixAt(i, mVeta);
      });
    }
    vetas.instanceMatrix.needsUpdate = true;
  }
  // Aleteo leve (en tiempo físico): la vela se mece y el cuerpo vibra un poco al caer.
  const qAle = new THREE.Quaternion(), eAle = new THREE.Euler();
  function aleteo(p, S, fase) {
    const tau = D.tauDe(S), cae = S >= SALTO && !reducido;
    p.o.rotation.z = cae ? Math.sin(tau * 6.5 + fase) * 0.012 : 0;
    if (p.vela.visible && !reducido) { eAle.set(Math.sin(tau * 1.1 + fase) * 0.025, 0, Math.sin(tau * 0.8 + fase) * 0.02); p.vela.quaternion.copy(p.velaQ0).multiply(qAle.setFromEuler(eAle)); }
  }

  // ---------- un cuadro ----------
  const qAux = new THREE.Vector3(), dirCam = new THREE.Vector3();
  const TAU_ABRIR = SALTO + TC;
  function posar(p, S, conParada) {
    const tau = D.tauDe(S);                                                // poses en tiempo físico
    // parada → arco al salir; cine.mezclaPose (0.8 s): los brazos abren cuando la avioneta ya se alejó
    const k1 = conParada ? clamp((tau - SALTO) / (CI.mezclaPose ?? E.mezclaPose)) : 1;
    const tAbre = clamp(tau - TAU_ABRIR, 0, p.abre.getClip().duration);
    const k2 = clamp((tAbre - 0.5) / E.abrirCruce);                        // arco → vertical con la vela inflándose
    if (p.A.parada) p.A.parada.setEffectiveWeight(1 - k1);
    p.A.arco.setEffectiveWeight(k1 * (1 - k2));
    p.A.vertical.setEffectiveWeight(k2);
    p.mp.update(0);
    p.vela.visible = tAbre > 0.08;                                         // en la pausa de los 3 s aún no sale; tampoco el primer cuadro (la bolsa asoma en la espalda)
    p.abre.time = tAbre; p.mv.update(0);
    // de frente en la puerta → de lado al caer (se ve el arco) → en diagonal colgando (vela de 3/4)
    p.o.rotation.y = (conParada ? Math.PI / 2 * ease(k1) : Math.PI / 2) * (1 - k2) + Math.PI / 4 * k2;
    return k2;
  }

  function dibuja(S, est) {
    libre = est.libre;
    const t = D.fisica(S), lec = D.calc({ t }), hT = lec.h, y = YP - hT;   // fórmulas evaluadas UNA vez por cuadro
    const r = D.ritmo(S), dtF = est.dt * r;                                  // dtF: tiempo físico del cuadro
    av.position.set(avX(S), avBase.y, avBase.z);
    if (helice) helice.rotation.z += dtF * (reducido ? 10 : 40);
    av.updateMatrixWorld(true);
    const puerta = avM.localToWorld(qAux.copy(enEstribo));
    const d = S < SALTO ? puerta.clone() : V(X0, y, Z0);
    yo.o.position.copy(d);
    posar(yo, S, true);
    tan.o.visible = S >= SALTO; tan.o.position.set(XT, y, ZT);
    posar(tan, S, false);
    guia.geometry.setFromPoints([V(X0 + 1.6, y, Z0), V(XC - .2, y, ZC)]); guia.computeLineDistances(); guia.visible = S >= SALTO;
    fotos.forEach((f, i) => { f.visible = f.userData.et.visible = t >= i + 1 - 1e-6; });
    // segundo en curso (1, 2, 3) mientras cae; 0 en la puerta y desde que abre
    const seg = S >= SALTO && t < TC - 1e-6 ? Math.floor(t + 1e-6) + 1 : 0;
    tramos.forEach((b, i) => {
      const { a, b: fin } = b.userData, k = clamp((hT - a) / (fin - a));
      b.visible = S >= SALTO && k > .02; b.scale.y = Math.max(k, .02);
      const activo = seg === i + 1; b.scale.x = b.scale.z = activo ? 1.7 : 1;
      b.userData.et.visible = t >= i + 1 - 1e-6;
    });
    contornoYo.uniforms.color.value.copy(seg ? colSeg[seg - 1] : tintaYo);
    contornoYo.uniforms.grosor.value = seg ? grosor * 2 : grosor;
    // las nubes se desplazan con el tiempo físico de la escena (reproducible: mismo instante, mismo cielo)
    const tauN = D.tauDe(S);
    // las cercanas a la caída apenas se mueven (±6 m): nunca cruzan el pasillo entre ella y la cinta
    if (!reducido) nubes.forEach((nb, i) => {
      const u = nb.userData, amp = Math.abs(u.casa) < 45 && Math.abs(nb.position.y) < 45 ? 6 : 30;
      nb.position.x = u.casa + amp * (((tauN * (0.6 + i % 3 * .3) + i * 7.3) % 60) / 30 - 1);
    });
    const abierto = S >= ABRIR;
    etTan.visible = S >= SALTO && !abierto; etTan.pos.set(XT, y + 3.2, ZT);
    etSola.visible = S >= SALTO && !abierto; etSola.pos.set(X0, y + 2.6, Z0);
    const verP = est.pausa === "tandem";
    pesoSola.visible = pesoTan.visible = etP.visible = etKP.visible = verP;
    if (verP) {
      pesoSola.position.set(X0, y - .6, Z0); pesoTan.position.set(XT, y - .6, ZT);
      etP.pos.set(X0 + .5, y - .6 - LP * .6, Z0); etKP.pos.set(XT + .5, y - .6 - LP * K * .6, ZT);
    }
    aleteo(yo, S, 0); aleteo(tan, S, 1.7);
    camara(S, d, est, W, H);
    sol_.position.copy(cam.position).addScaledVector(SOL, 1500);
    if (!reducido) moverSombras(D.tauDe(S));
    vetasDe(S, lec, d); if (est.respaldo || est.pausa) vetas.visible = false;
    verDetalle(detYo, d, 16); verDetalle(detTan, tan.o.position, 16);   // en el bullet time no: con la órbita parecerían lluvia
    halo.visible = !!seg && !est.respaldo;
    if (seg) {                                                             // detrás de ella, visto desde la cámara
      halo.material.color.copy(colSeg[seg - 1]);
      cam.getWorldDirection(dirCam); halo.position.copy(d).addScaledVector(dirCam, 1.6);
    }
    ren.render(esc, cam);
    et.actualizar(cam, W, H, { techo: H - (est.tapado || 0) });
  }

  tris += tierra.userData.tris;
  return { dibuja, tam, tris: () => tris, renderer: ren, piezas: { av: avM, yo, tan } };
}
