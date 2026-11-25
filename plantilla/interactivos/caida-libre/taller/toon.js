// Toon de 2 tonos + contorno de tinta (de plantilla/modelos/caida-libre/ver.html), con niebla,
// esqueleto, morphs y transparencia. Candidata a pieza compartida de las láminas 3D.
import * as THREE from "three";

export const TINTA = 0x2a2a33;
// Sombra fría: blanco #F4F4F1 → #C9CCD3 en la cara sin luz; el mismo tinte para toda la paleta.
const tinte = (() => {
  const a = new THREE.Color(0xc9ccd3), b = new THREE.Color(0xf4f4f1);
  return new THREE.Vector3(a.r / b.r, a.g / b.g, a.b / b.b);
})();
const LUZ = new THREE.Vector3(-0.6, 1, 0.45).normalize();   // lámpara arriba-izquierda, como la mesa
const UMBRAL = 0.12;
// Tramado de grabado en la cara de sombra: líneas diagonales en espacio de pantalla (px de dispositivo).
// Un uniforme compartido por todos los materiales: ajustarContorno lo escala con el devicePixelRatio.
export const TRAMA = { paso: { value: 6 }, fuerza: { value: 0.16 } };

const vert = /* glsl */`
  #include <common>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  #include <fog_pars_vertex>
  varying vec3 vNormal;
  void main() {
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    vNormal = normalize(mat3(modelMatrix) * objectNormal);
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const frag = /* glsl */`
  uniform vec3 color; uniform vec3 tinte; uniform vec3 luz; uniform float umbral; uniform float opacidad;
  uniform float pasoTrama; uniform float fuerzaTrama;
  varying vec3 vNormal;
  #include <fog_pars_fragment>
  void main() {
    float l = step(umbral, dot(normalize(vNormal), luz));
    float raya = 1.0 - step(0.22, fract((gl_FragCoord.x + gl_FragCoord.y) / pasoTrama));
    vec3 sombra = color * tinte * (1.0 - fuerzaTrama * raya);
    gl_FragColor = vec4(mix(sombra, color, l), opacidad);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export function materialToon(color, { opacidad = 1, lado = THREE.FrontSide, nombre = "" } = {}) {
  const m = new THREE.ShaderMaterial({
    name: nombre, side: lado, vertexShader: vert, fragmentShader: frag, fog: true,
    transparent: opacidad < 1, depthWrite: opacidad >= 1,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      color: { value: new THREE.Color(color) }, tinte: { value: tinte }, luz: { value: LUZ },
      umbral: { value: UMBRAL }, opacidad: { value: opacidad } }]),
  });
  m.uniforms.pasoTrama = TRAMA.paso; m.uniforms.fuerzaTrama = TRAMA.fuerza;   // compartidos (después del merge)
  return m;
}

// Contorno: casco invertido empujado en pantalla (grosor parejo en px) con normales suavizadas.
const resolucion = new THREE.Vector2(1, 1);
const contornos = new Set();
function materialContorno(opacidad) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: true, transparent: opacidad < 1, depthWrite: opacidad >= 1,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      grosor: { value: 2 }, resolucion: { value: resolucion }, color: { value: new THREE.Color(TINTA) },
      opacidad: { value: opacidad } }]),
    vertexShader: /* glsl */`
      #include <common>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <fog_pars_vertex>
      attribute vec3 normalContorno;
      uniform float grosor; uniform vec2 resolucion;
      void main() {
        vec3 objectNormal = normalContorno;
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vec4 clip = projectionMatrix * mvPosition;
        vec3 n = normalize(normalMatrix * objectNormal);
        vec2 d = (projectionMatrix * vec4(n, 0.0)).xy;
        float l = length(d);
        if (l > 1e-5) clip.xy += (d / l) * grosor * 2.0 / resolucion * clip.w;
        gl_Position = clip;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 color; uniform float opacidad;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(color, opacidad);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  contornos.add(m);
  return m;
}
const CONTORNO = { 1: null };
const contornoDe = (op) => CONTORNO[op] || (CONTORNO[op] = materialContorno(op));

// Llamar al cambiar de tamaño: grosor en px de dispositivo.
export function ajustarContorno(renderer, grosorCss = 2) {
  renderer.getDrawingBufferSize(resolucion);
  // UniformsUtils.merge clona los valores: cada material tiene su copia de la resolución.
  for (const m of contornos) { m.uniforms.grosor.value = grosorCss * renderer.getPixelRatio(); m.uniforms.resolucion.value.copy(resolucion); }
  TRAMA.paso.value = 6 * renderer.getPixelRatio();                // ~6 px de pantalla entre rayas
}

function normalesSuaves(geo) {
  if (geo.attributes.normalContorno) return;
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const suma = new Map(), v = new THREE.Vector3();
  const clave = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = clave(i), s = suma.get(k) || new THREE.Vector3();
    s.add(v.fromBufferAttribute(nor, i)); suma.set(k, s);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { v.copy(suma.get(clave(i))).normalize(); out.set([v.x, v.y, v.z], i * 3); }
  geo.setAttribute("normalContorno", new THREE.BufferAttribute(out, 3));
}

// Convierte todas las mallas de un objeto: toon con su color glTF + contorno.
// sinContorno: regex sobre nombre de malla, padre o material (cuerdas, interior de la cabina).
// Sin contorno: interior de la cabina, cuerdas y el detalle fino (costuras, hebillas, reloj, paneles, remaches, luces).
export function estilizar(raiz, { opacidad = 1, sinContorno = /interior|cuerda|costura|hebilla|reloj_|slider_borde|panel|remache|luz_|franja_coral/i } = {}) {
  const mallas = [];
  raiz.traverse((o) => { if (o.isMesh && o.name !== "contorno") mallas.push(o); });
  let tris = 0;
  for (const m of mallas) {
    const g = m.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    const conv = (old) => materialToon(old.color ?? old.uniforms?.color?.value ?? 0xffffff,
      { opacidad, lado: old.side, nombre: old.name });
    m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
    const nombre = [m.name, m.parent?.name || "", ...[].concat(m.material).map((x) => x.name)].join(" ");
    if (sinContorno.test(nombre)) continue;
    agregarContorno(m, opacidad);
  }
  return Math.round(tris);
}

export function agregarContorno(m, opacidad = 1) {
  normalesSuaves(m.geometry);
  const mat = contornoDe(opacidad < 1 ? Math.min(1, opacidad * 0.8) : 1);
  const c = m.isSkinnedMesh ? new THREE.SkinnedMesh(m.geometry, mat) : new THREE.Mesh(m.geometry, mat);
  if (m.isSkinnedMesh) c.bind(m.skeleton, m.bindMatrix);
  if (m.morphTargetInfluences) { c.morphTargetInfluences = m.morphTargetInfluences; c.morphTargetDictionary = m.morphTargetDictionary; }
  c.name = "contorno"; c.renderOrder = -1;
  m.add(c);
  return c;
}

// Contorno propio de un objeto (opaco): para cambiarle color y grosor sin tocar a los demás.
export function contornoPropio(raiz) {
  const m = materialContorno(1);
  raiz.traverse((o) => { if (o.name === "contorno" && !o.material.transparent) o.material = m; });
  return m;
}

// Pieza simple (geometría de three) con toon y contorno: cinta de medir, flechas, tramos.
export function pieza(geo, color, padre, { pos, rot, contorno = true, opacidad = 1 } = {}) {
  const m = new THREE.Mesh(geo, materialToon(color, { opacidad }));
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  padre.add(m);
  if (contorno) agregarContorno(m, opacidad);
  return m;
}
