// Escena 3D de la lámina «El salto». Modelos .glb de plantilla/modelos/caida-libre/ con toon de 2 tonos
// y contorno; guion de cine de taller.cine (9 tomas, rampas de velocidad) y órbita (bullet time) en las
// pausas. Se carga solo al tocar «Ver la escena». Sin posprocesado: todo es geometría y color.
// Escala: en vertical 1 unidad = 1 m de caída (la cinta mide de verdad); los modelos van a escala
// de maqueta (escena3d.escalaMaqueta) para que se lean junto a 45 m de caída. La tierra es decorado lejano.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as clonar } from "three/addons/utils/SkeletonUtils.js";
import { estilizar, pieza, ajustarContorno, agregarContorno, contornoPropio } from "./toon.js";
import { crearEtiquetas } from "./etiquetas.js";
import { crearTierra } from "./tierra.js";

const C = { blanco: 0xf4f4f1, gris: 0xd6d7d5, grisO: 0x9fa3aa, menta: 0x8fd3b0, azul: 0x6f93c9,
  coral: 0xe39a84, coralO: 0xc77964, alumna: 0xe3b95a, tinta: 0x2a2a33, nube: 0xffffff };
// Estribo de la avioneta en ejes del .glb (avioneta.py: estribo menos centro de masa, +Y arriba).
const ESTRIBO = new THREE.Vector3(-0.98, -0.926, 0.472);
const CADERA = 0.95;                         // persona.Z0: de los pies al origen (centro de masa)
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const CAEN = new Set(["salto", "picado", "persecucion", "abrir"]);
const LEJOS = { travelling: .75, puerta: .7, salto: 1, picado: 1, persecucion: 1, abrir: 1 };   // retroceso en vertical

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
  const cielo = ["#BFDDEC", "#DCEEF5", "#EEF6F3"].map(P.css);
  esc.fog = new THREE.Fog(new THREE.Color().setStyle(cielo[2]), CI.tierra.nieblaDe, CI.tierra.nieblaA);
  esc.background = (() => {                    // cielo en degradado, dentro del lienzo (también para la imagen fija)
    const c = document.createElement("canvas"); c.width = 2; c.height = 256;
    const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, cielo[0]); g.addColorStop(.6, cielo[1]); g.addColorStop(1, cielo[2]);
    x.fillStyle = g; x.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  })();
  const cam = new THREE.PerspectiveCamera(34, 1, 0.5, 1600);
  esc.add(new THREE.HemisphereLight(0xffffff, 0xcfd8dc, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(-6, 10, 4); esc.add(sol);
  const et = crearEtiquetas(maqueta);

  // ---------- modelos ----------
  const cargador = new GLTFLoader();
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
    return { o, vela, mp, A, mv, abre };
  }
  const yo = persona(gP, 1, null);
  const tan = persona(gT, D.T.escalaVelaTandem, C.azul);
  const contornoYo = contornoPropio(yo.o);                                     // se tiñe con el color de cada segundo

  // «Fotos» de cada segundo: la paracaidista en arco, translúcida, donde estaba a los 1, 2, 3 s.
  const fotos = D.tramos.map((_, i) => {
    const k = i + 1, f = clonar(gP.scene); f.scale.setScalar(ESCP); esc.add(f);
    const m = new THREE.AnimationMixer(f); m.clipAction(clip(gP, "arco")).play(); m.update(0);
    estilizar(f, { opacidad: 0.3 });
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
  const nubes = [], geoNube = new THREE.IcosahedronGeometry(1, 1), matNube = new THREE.MeshLambertMaterial({ color: C.nube, flatShading: true });
  function nube(x, y, z, s) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); esc.add(g);
    [[0, 0, 0, 1.6], [1.6, .3, .2, 1.3], [-1.5, -.1, .1, 1.2], [.5, .9, -.3, 1.1], [2.8, -.2, 0, .9]].forEach(([a, b, c, r]) => {
      const m = new THREE.Mesh(geoNube, matNube); m.scale.setScalar(r);
      m.position.set(a, b, c); g.add(m); agregarContorno(m);
    });
    g.userData = { casa: x, desliza: 0 };
    nubes.push(g);
  }
  // junto a la cinta (como antes) · en la ruta de la avioneta · abajo, entre la caída y la tierra
  nube(-30, 30, -6, 1.3); nube(22, 36, -14, 1.1); nube(-22, 26, -8, 1.6); nube(24, 16, -10, 1.2);
  nube(-20, 8, -12, 1.2); nube(20, 2, -16, 1.4); nube(-10, -16, -24, 1.5);
  nube(-250, 64, -40, 2.2); nube(-185, 34, -60, 2.6); nube(-125, 72, -34, 1.8); nube(-75, 44, -75, 2.8); nube(-220, 30, 70, 2);
  nube(-30, -70, -50, 3.2); nube(40, -105, 20, 3.6); nube(-80, -140, 40, 4); nube(70, -160, -90, 4.4);
  const tierra = crearTierra({ y: YT, hex: P.css });
  esc.add(tierra);

  // ---------- paleta: una sola pasada por los materiales (sin filtros por cuadro) ----------
  if (P.activa) {
    const vistos = new Set();
    esc.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        if (vistos.has(m) || m.vertexColors || o.userData.propio) continue;
        vistos.add(m);
        const c = m.uniforms?.color?.value ?? m.color;
        if (c?.isColor) c.setStyle(P.hex("#" + c.getHexString()));
      }
    });
  }
  const tintaYo = contornoYo.uniforms.color.value.clone();
  const colSeg = colTramo.map((c) => new THREE.Color(P.num(c)));

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
    persecucion: (l, d) => [d.clone().add(V(5, 7, 8 - 1.5 * l)), d.clone().add(V(1, -2.5 - 2 * l, -2))],
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
    if (cam.aspect < 1 && LEJOS[x.cam]) {                // pantalla vertical: más lejos y, al caer, centrado entre la sola y el tándem
      const k = Math.min(2.2, LEJOS[x.cam] / cam.aspect), dx = CAEN.has(x.cam) && S >= SALTO ? (XT - X0) / 2 : 0;
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

  // ---------- un cuadro ----------
  const qAux = new THREE.Vector3(), dirCam = new THREE.Vector3();
  const TAU_ABRIR = SALTO + TC;
  function posar(p, S, conParada) {
    const tau = D.tauDe(S);                                                // poses en tiempo físico
    const k1 = conParada ? clamp((tau - SALTO) / E.mezclaPose) : 1;        // parada → arco al salir
    const tAbre = clamp(tau - TAU_ABRIR, 0, p.abre.getClip().duration);
    const k2 = clamp((tAbre - 0.5) / E.abrirCruce);                        // arco → vertical con la vela inflándose
    if (p.A.parada) p.A.parada.setEffectiveWeight(1 - k1);
    p.A.arco.setEffectiveWeight(k1 * (1 - k2));
    p.A.vertical.setEffectiveWeight(k2);
    p.mp.update(0);
    p.vela.visible = S > ABRIR;                                            // en la pausa de los 3 s aún no sale
    p.abre.time = tAbre; p.mv.update(0);
    // de frente en la puerta → de lado al caer (se ve el arco) → en diagonal colgando (vela de 3/4)
    p.o.rotation.y = (conParada ? Math.PI / 2 * ease(k1) : Math.PI / 2) * (1 - k2) + Math.PI / 4 * k2;
    return k2;
  }

  function dibuja(S, est) {
    libre = est.libre;
    const t = D.fisica(S), y = YP - h(t), r = D.ritmo(S), dtF = est.dt * r;  // dtF: tiempo físico del cuadro
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
      const { a, b: fin } = b.userData, k = clamp((h(t) - a) / (fin - a));
      b.visible = S >= SALTO && k > .02; b.scale.y = Math.max(k, .02);
      const activo = seg === i + 1; b.scale.x = b.scale.z = activo ? 1.7 : 1;
      b.userData.et.visible = t >= i + 1 - 1e-6;
    });
    contornoYo.uniforms.color.value.copy(seg ? colSeg[seg - 1] : tintaYo);
    contornoYo.uniforms.grosor.value = seg ? grosor * 2 : grosor;
    if (!reducido) nubes.forEach((nb, i) => { const u = nb.userData; u.desliza = (u.desliza + dtF * (0.6 + i % 3 * .3)) % 60; nb.position.x = u.casa - 30 + u.desliza; });
    const abierto = S >= ABRIR;
    etTan.visible = S >= SALTO && !abierto; etTan.pos.set(XT, y + 3.2, ZT);
    etSola.visible = S >= SALTO && !abierto; etSola.pos.set(X0, y + 2.6, Z0);
    const verP = est.pausa === "tandem";
    pesoSola.visible = pesoTan.visible = etP.visible = etKP.visible = verP;
    if (verP) {
      pesoSola.position.set(X0, y - .6, Z0); pesoTan.position.set(XT, y - .6, ZT);
      etP.pos.set(X0 + .5, y - .6 - LP * .6, Z0); etKP.pos.set(XT + .5, y - .6 - LP * K * .6, ZT);
    }
    camara(S, d, est, W, H);
    halo.visible = !!seg && !est.respaldo;
    if (seg) {                                                             // detrás de ella, visto desde la cámara
      halo.material.color.copy(colSeg[seg - 1]);
      cam.getWorldDirection(dirCam); halo.position.copy(d).addScaledVector(dirCam, 1.6);
    }
    ren.render(esc, cam);
    et.actualizar(cam, W, H, { techo: H - (est.tapado || 0) });
  }

  tris += tierra.userData.tris;
  return { dibuja, tam, tris: () => tris, renderer: ren };
}
