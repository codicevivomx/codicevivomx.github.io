// Escena 3D de la lámina «El salto» (dirección de diseño: boceto 9). Modelos .glb de
// plantilla/modelos/caida-libre/ con toon de 2 tonos y contorno; cámara de cine de 5 tomas y
// órbita (bullet time) en las pausas. Se carga solo al tocar «Ver la escena».
// Escala: en vertical 1 unidad = 1 m de caída (la cinta mide de verdad); los modelos van a escala
// de maqueta (escena3d.escalaMaqueta) para que se lean junto a 45 m de caída.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as clonar } from "three/addons/utils/SkeletonUtils.js";
import { estilizar, pieza, ajustarContorno, agregarContorno } from "./toon.js";
import { crearEtiquetas } from "./etiquetas.js";

const C = { blanco: 0xf4f4f1, gris: 0xd6d7d5, grisO: 0x9fa3aa, menta: 0x8fd3b0, azul: 0x6f93c9,
  coral: 0xe39a84, coralO: 0xc77964, alumna: 0xe3b95a, tinta: 0x2a2a33, nube: 0xffffff };
// Estribo de la avioneta en ejes del .glb (avioneta.py: estribo menos centro de masa, +Y arriba).
const ESTRIBO = new THREE.Vector3(-0.98, -0.926, 0.472);
const CADERA = 0.95;                         // persona.Z0: de los pies al origen (centro de masa)
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export async function crearEscena({ lienzo, maqueta, D, rutaModelos, reducido = false, alCargar = () => {} }) {
  const E = D.esc, ESC = E.escalaMaqueta, TC = D.TC, K = D.v0.masaTandem;
  const ESCP = ESC * 0.92;                   // personas un poco menores: paradas en el estribo caben bajo el ala
  const h = (t) => D.calc({ t }).h;          // h = g·t²/2 (lecturas.formulas.h)
  const HT = h(TC), YP = HT + 3;             // la salida queda 3 m sobre el 0 de la cinta... y la cinta mide HT
  const X0 = 0, Z0 = 4.2, XT = X0 - E.separacionTandem, ZT = Z0 + 3, XC = X0 + 8.8, ZC = Z0;
  const SALTO = D.salto, ABRIR = D.abrir, TOMAS = D.tomas;

  // ---------- render ----------
  const ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  ren.setPixelRatio(Math.min(devicePixelRatio, 2));
  ren.outputColorSpace = THREE.SRGBColorSpace;
  const esc = new THREE.Scene();
  esc.fog = new THREE.Fog(0xdcecf3, 90, 330);
  esc.background = (() => {                    // cielo en degradado, dentro del lienzo (también para la imagen fija)
    const c = document.createElement("canvas"); c.width = 2; c.height = 256;
    const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#BFDDEC"); g.addColorStop(.6, "#DCEEF5"); g.addColorStop(1, "#EEF6F3");
    x.fillStyle = g; x.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  })();
  const cam = new THREE.PerspectiveCamera(34, 1, 0.5, 900);
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
  const avX = (S) => avBase.x + (S - SALTO) * E.velocidadAvioneta;

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
  const colTramo = [C.alumna, C.menta, C.coral];
  const tramos = D.tramos.map((s, i) => {
    const a = i ? claves[i - 1] : 0, b = claves[i], g = new THREE.Group(); esc.add(g); g.visible = false;
    pieza(new THREE.BoxGeometry(.5, b - a - .5, .5), colTramo[i % 3], g, { pos: [XC - .75, YP - (a + b) / 2, ZC] });
    g.userData.et = et.nueva(D.tpl(D.T.textos.tramo, { x: D.num(s, 0) }), { lado: "izq", prioridad: 2, clase: "tramo" });
    g.userData.et.pos.set(XC - 1.2, YP - (a + b) / 2, ZC);
    return g;
  });
  const guia = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]),
    new THREE.LineDashedMaterial({ color: C.azul, dashSize: .5, gapSize: .4 }));
  esc.add(guia);

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

  // ---------- nubes y campos ----------
  const nubes = [];
  function nube(x, y, z, s) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); esc.add(g);
    [[0, 0, 0, 1.6], [1.6, .3, .2, 1.3], [-1.5, -.1, .1, 1.2], [.5, .9, -.3, 1.1], [2.8, -.2, 0, .9]].forEach(([a, b, c, r]) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshLambertMaterial({ color: C.nube, flatShading: true }));
      m.position.set(a, b, c); g.add(m); agregarContorno(m);
    });
    nubes.push(g);
  }
  nube(-30, 30, -6, 1.3); nube(22, 36, -14, 1.1); nube(-22, 26, -8, 1.6); nube(24, 16, -10, 1.2);
  nube(-20, 8, -12, 1.2); nube(20, 2, -16, 1.4); nube(-10, -16, -24, 1.5);
  const suelo = new THREE.Group(); suelo.position.y = -140; esc.add(suelo);
  const colCampo = [0xa9d77a, 0xc9dd8f, 0x93c96e, 0xe2d39a, 0xb6dc87], plano = new THREE.PlaneGeometry(38, 38);
  const matCampo = colCampo.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
    const m = new THREE.Mesh(plano, matCampo[(i * 7 + j * 3 + 49) % 5]);
    m.rotation.x = -Math.PI / 2; m.position.set(i * 40, 0, j * 40); suelo.add(m);
  }

  // ---------- cámara ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function tomaCam(i, S, d) {
    const loc = clamp((S - TOMAS[i].de) / (TOMAS[i].a - TOMAS[i].de));
    switch (i) {
      case 0: { const a = av.position.clone().add(V(0, -1, 0)); return [V(a.x + 20 - loc * 9, YP + 9 - loc * 3, a.z + 40), a]; }
      // primer plano en la puerta: bajo el ala (si no, la punta del ala tapa la puerta)
      case 1: return [V(d.x + 5.5 - loc * 1.5, d.y - .2, d.z + 7.5 - loc * 1.5), d.clone().add(V(-1.2, .1, -1))];
      case 2: return [V(d.x + 4, d.y + 2, d.z + 25), d.clone().add(V(2.5, -1.5, 0))];
      case 3: return [V(d.x + 13, d.y - 17 + loc * 4, d.z + 13), d.clone().add(V(2, 4, 0))];
      default: return [V(X0 + 62, YP - HT * .55, Z0 + 78), V(X0 + 1, YP - HT * .5 - 3, Z0)];   // la cinta completa y las velas
    }
  }
  const tomaDe = (S) => { const i = TOMAS.findIndex((x) => S >= x.de && S < x.a); return i === -1 ? TOMAS.length - 1 : i; };
  let giro = 0;
  const orbita = { az: 0.78, el: 0.18, r: 72 };
  let arrastre = null, libre = false;
  lienzo.addEventListener("pointerdown", (e) => { if (!libre) return; arrastre = [e.clientX, e.clientY, orbita.az, orbita.el]; lienzo.setPointerCapture(e.pointerId); });
  lienzo.addEventListener("pointermove", (e) => { if (!arrastre) return; orbita.az = arrastre[2] - (e.clientX - arrastre[0]) * .006; orbita.el = clamp(arrastre[3] + (e.clientY - arrastre[1]) * .005, -.6, 1.2); });
  lienzo.addEventListener("pointerup", () => (arrastre = null));
  lienzo.addEventListener("wheel", (e) => { if (!libre) return; e.preventDefault(); orbita.r = clamp(orbita.r + e.deltaY * .05, 25, 120); }, { passive: false });

  // Toma 5: la cinta, las 3 fotos y las dos velas llenan `llenadoRevelacion` de la altura del lienzo,
  // en PC y en celular (la distancia se calcula con el fov y el aspecto, no con un número fijo).
  // En pantalla vertical la claqueta ocupa la franja de abajo: el encuadre usa solo el resto.
  function revelacion() {
    const y0 = YP - HT - 1.4, y1 = YP + .6, x0 = XT - 3.5, x1 = XC + 4.5;
    const c = V((x0 + x1) / 2, (y0 + y1) / 2, (Z0 + ZT) / 2), t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const lleno = E.llenadoRevelacion ?? .86, libre = cam.aspect < 1 ? .8 : 1;
    const dist = Math.max((y1 - y0) / (lleno * libre) / (2 * t), (x1 - x0) / .92 / (2 * t * cam.aspect));
    c.y -= (1 - libre) / 2 * 2 * t * dist;             // sube el contenido sobre la franja de la claqueta
    return [c.clone().add(V(.62, .04, .78).normalize().multiplyScalar(dist)), c];
  }

  function camara(S, d, est, W, H) {
    cam.clearViewOffset();
    if (est.respaldo) {                                  // imagen fija: avioneta entera con la paracaidista en la puerta
      cam.position.copy(d.clone().add(V(9, -.8, 15))); cam.lookAt(d.clone().add(V(-1.8, .7, -1.2))); return;
    }
    if (est.pausa) {
      // Bullet time: el tiempo se congela y la cámara orbita. El centro incluye las flechas de peso y
      // el encuadre se corre hacia arriba lo que tapa la hoja levantada, para que nada quede debajo.
      if (!reducido) giro += est.dt * .32;
      const tan_ = est.pausa === "tandem";
      const c = tan_ ? V((X0 + XT) / 2, d.y - (LP * K) / 2 - .5, (Z0 + ZT) / 2) : d.clone();
      const a = .6 + giro, r = tan_ ? 36 : 26;
      cam.position.set(c.x + r * Math.sin(a), c.y + 2, c.z + r * Math.cos(a)); cam.lookAt(c);
      if (est.tapado > 0) cam.setViewOffset(W, H, 0, Math.min(est.tapado, H * .6) / 2, W, H);
      return;
    }
    if (est.libre) {
      const c = V(X0 + 3, YP - HT * .55, Z0);
      cam.position.set(c.x + orbita.r * Math.cos(orbita.el) * Math.sin(orbita.az), c.y + orbita.r * Math.sin(orbita.el),
        c.z + orbita.r * Math.cos(orbita.el) * Math.cos(orbita.az));
      cam.lookAt(c); return;
    }
    const vertical = (j, s) => {                         // pantalla vertical: más lejos y centrado entre la sola y el tándem
      let [p, o] = tomaCam(j, s, d);
      if (cam.aspect < 1) {
        const k = Math.min(2.2, (j >= 2 ? 1 : .7) / cam.aspect), cae = j >= 2 && j < 4 && s >= SALTO;
        const dx = cae ? (XT - X0) / 2 : 0;
        o = o.clone().add(V(dx, 0, 0)); p = o.clone().add(p.clone().sub(o).add(V(dx, 0, 0)).multiplyScalar(k));
      }
      return [p, o];
    };
    const i = tomaDe(S); let [p, o] = i === TOMAS.length - 1 ? revelacion() : vertical(i, S);
    const ent = S - TOMAS[i].de;                         // fundido de cámara de 0.9 s entre tomas (corte si hay movimiento reducido)
    if (!reducido && i > 0 && ent < 0.9) { const [p0, o0] = vertical(i - 1, TOMAS[i].de - 0.001), k = ease(ent / 0.9); p = p0.lerp(p, k); o = o0.lerp(o, k); }
    cam.position.copy(p); cam.lookAt(o);
  }

  let W = 1, H = 1;
  function tam() {
    const r = lienzo.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    ren.setSize(W, H, false); cam.aspect = W / H; cam.fov = cam.aspect < .8 ? 46 : 34; cam.updateProjectionMatrix();
    ajustarContorno(ren, 2);
  }
  new ResizeObserver(tam).observe(lienzo); tam();

  // ---------- un cuadro ----------
  const qAux = new THREE.Vector3();
  function posar(p, S, conParada) {
    const k1 = conParada ? clamp((S - SALTO) / E.mezclaPose) : 1;          // parada → arco al salir
    const tAbre = clamp(S - ABRIR, 0, p.abre.getClip().duration);
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
    const t = D.fisica(S), y = YP - h(t);
    av.position.set(avX(S), avBase.y, avBase.z);
    if (helice) helice.rotation.z += est.dt * (reducido ? 10 : 40);
    av.updateMatrixWorld(true);
    const puerta = avM.localToWorld(qAux.copy(enEstribo));
    const d = S < SALTO ? puerta.clone() : V(X0, y, Z0);
    yo.o.position.copy(d);
    posar(yo, S, true);
    tan.o.visible = S >= SALTO; tan.o.position.set(XT, y, ZT);
    posar(tan, S, false);
    guia.geometry.setFromPoints([V(X0 + 1.6, y, Z0), V(XC - .2, y, ZC)]); guia.computeLineDistances(); guia.visible = S >= SALTO;
    fotos.forEach((f, i) => { f.visible = f.userData.et.visible = t >= i + 1 - 1e-6; });
    tramos.forEach((g, i) => { g.visible = g.userData.et.visible = t >= i + 1 - 1e-6; });
    if (!reducido) nubes.forEach((nb, i) => { nb.position.x += est.dt * (0.6 + i % 3 * .3); if (nb.position.x > 30) nb.position.x = -30; });
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
    ren.render(esc, cam);
    et.actualizar(cam, W, H, { techo: H - (est.tapado || 0) });
  }

  return { dibuja, tam, tris: () => tris, renderer: ren };
}
