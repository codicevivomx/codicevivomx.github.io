// Lámina «Caída libre · El salto» (taller, boceto 9 con modelos reales).
// Director del guion de cine (taller.cine: tomas, rampas de velocidad) + 2 pausas de causa. Los textos y números salen del JSON y de sus fórmulas.
// El 3D (three.js + modelos .glb) se importa solo al tocar «Ver la escena»; antes se ve la imagen fija.
import { cargarDatos } from "./datos.js";
import { bordePintado, instrumentos, regla, hojaLevantada, cotas } from "./mesa.js";
import { crearPaleta, avivarDOM } from "./paleta.js";

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches || q.has("reducido");
const RUTA_JSON = "../../../../contenido/fisica/caida-libre-interactivo.json";
const RUTA_MODELOS = "../../../modelos/caida-libre/";

const D = await cargarDatos(RUTA_JSON);
const X = D.T.textos, CI = D.cine, XC = CI.textos, DUR = D.DUR, N = D.N;
// Paleta predeterminada (OKLCH); ?paleta=neutra muestra los colores originales para comparar.
const P = crearPaleta(q.get("paleta") === "neutra" ? null : CI.paletas.predeterminada);
const vN = D.calc({ n: N });                                   // valores de la predicción (segundo n)

// ---------- textos fijos de la página ----------
const html = (id, s) => { $(id).innerHTML = s; };
const txt = (id, s) => { $(id).textContent = s; };
txt("etiqueta", X.etiqueta);
html("titulo", D.texto(X.titulo));
document.title = D.texto(X.titulo).replace(/<[^>]+>/g, "") + " · Códice Vivo";
$("esc").setAttribute("aria-label", D.texto(X.aria));
$("respaldo").alt = D.texto(X.respaldo);
html("tit3d", `${D.texto(X.altitudTitulo)}<small>${X.altitudSub}</small>`);
txt("carga", X.cargando);
txt("saltar", X.ver);
txt("irSalto", XC.irAlSalto);
txt("lentaT", D.texto(XC.lenta)); $("lenta").setAttribute("aria-label", XC.lentaAria);
$("tiempo").max = DUR; $("tiempo").setAttribute("aria-label", X.lineaTiempo);
txt("eCuaderno", X.cuaderno); txt("mCuadernoT", X.prediccionTitulo);
txt("ePausas", X.pausasTitulo); txt("mMiliT", X.pausasEspera);
txt("ePred", X.miPrediccion); txt("miPred", X.sinPrediccion);
txt("eDatos", X.datos); html("ficha", D.texto(X.ficha).split("|").join("<br>"));
txt("storyboard", D.texto(X.storyboard));
$("cerrar").setAttribute("aria-label", X.dejarHoja);
$("mesa3d").setAttribute("aria-label", X.mesa);
txt("pie", X.pie);
txt("tarjetaT", X.prediccionTitulo);
html("tarjetaQ", `<b>${D.texto(X.prediccionPregunta, { n: N })}</b>`);
txt("irEscena", X.saltar);
txt("eResultado", X.resultado);
regla(D, $("regla"));

// ---------- mesa ----------
P.alCambiar(bordePintado($("borde"), $("maqueta"), P));
const mueveInstrumentos = instrumentos(D, "../../../modelos/mesa/");
const mueveCotas = cotas(D, $("cotas"));
// La mesa solo se redibuja si se ve, y con t en pasos de 0.02 s (las agujas no necesitan más): sin costo cuando no se ve.
let mesaVisible = true;
new IntersectionObserver(([e]) => (mesaVisible = e.isIntersecting)).observe($("mesa3d"));
const paso = (t) => Math.round(t * 50) / 50;
mueveInstrumentos(0);
avivarDOM(P);
P.alCambiar(() => { if (pausa?.id === "grafica") $("grafica").querySelector("svg").innerHTML = graficaVT(); });
const hoja = hojaLevantada({ mesa: $("mesa3d"), lev: $("levantada"), reduce: reducido, origenDe: (id) => $(id) || $("mCuaderno") });

// ---------- estado ----------
let S = 0, corre = false, vel = 1, ult = 0, pred = null, hecho = false, libre = false, pausa = null;
let escena = null, cargando = false;
const pausas = D.pausas.map((p) => ({ ...p, hecha: false }));
const tomaDe = (s) => { const i = D.tomas.findIndex((x) => s >= x.de && s < x.a); return i === -1 ? D.tomas.length - 1 : i; };

// ---------- pestañas de la mesa (celular): una estación completa a todo el ancho ----------
const pest = [...$("pestanas").children];
$("pestanas").setAttribute("aria-label", XC.pestanasAria);
pest.forEach((b, i) => { b.textContent = XC.pestanas[i]; b.onclick = () => pestana(b.dataset.tab); });
function pestana(t) { $("mesa3d").dataset.tab = t; pest.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t))); }

function actualizaHoja() {
  const enPausa = !$("pausa").hidden, tarjeta = !$("tarjeta").hidden, resultado = !$("resultado").hidden;
  const quiere = enPausa || tarjeta || resultado;
  $("hojaArriba").hidden = enPausa;
  $("cerrar").hidden = !resultado || enPausa;
  $("mCuaderno").classList.toggle("vacia", quiere && !enPausa);
  $("mMili").classList.toggle("vacia", enPausa);
  if (enPausa) txt("mMiliT", $("pausaT").textContent);
  if (resultado) txt("mCuadernoT", X.cuadernoAnotado); else if (!tarjeta) txt("mCuadernoT", X.cuadernoEspera);
  if (quiere && innerWidth <= 700) pestana("cuaderno");          // la hoja sale del cuaderno o del milimétrico
  hoja.poner(quiere, enPausa ? $("mMili") : $("mCuaderno"));
}

// ---------- predicción (bloque prediccion del JSON, segundo n) ----------
const ops = $("ops");
D.J.prediccion.opciones.forEach((o) => {
  const b = document.createElement("button");
  b.className = "op"; b.dataset.v = vN[o.formula];
  b.textContent = `${D.num(vN[o.formula], 0)} ${D.J.prediccion.unidad}`;
  b.onclick = () => elegir(+b.dataset.v);
  ops.appendChild(b);
});
function elegir(v) {
  pred = v;
  ops.querySelectorAll(".op").forEach((o) => o.setAttribute("aria-pressed", String(+o.dataset.v === v)));
  $("saltar").disabled = false; $("tiempo").disabled = false; $("irSalto").disabled = false; $("irEscena").hidden = false;
  txt("miPred", D.tpl(X.conPrediccion, { x: D.num(v, 0) }));
}
$("irEscena").onclick = () => $("saltar").click();

// ---------- storyboard ----------
D.tomas.forEach((x, i) => {
  const li = document.createElement("li");
  li.innerHTML = `<b>${i + 1}. ${x.t}</b><span>${x.n.split("· ")[1]} — ${D.texto(x.d)}</span>`;
  li.onclick = () => { if (!pred) return; libre = false; irA(x.de + .01); arrancar(); };
  $("lista").appendChild(li); x.li = li;
});

// ---------- pausas de causa ----------
function graficaVT() {                           // v-t con franjas de triangulitos (área = distancia)
  const TC = D.TC, vMax = D.calc({ t: TC }).v, X0 = 30, Y0 = 150, W = 180, Hh = 120;
  const px = (t) => X0 + t / TC * W, py = (v) => Y0 - v / vMax * Hh, col = ["#E3B95A", "#8FD3B0", "#E39A84"];
  let s = `<g font-family="Geist Mono,monospace" font-size="10" fill="#5D5B6B">`;
  for (let k = 0; k <= TC; k++) s += `<line x1="${px(k)}" y1="${Y0}" x2="${px(k)}" y2="${Y0 - Hh}" stroke="#e3e3e8"/><text x="${px(k) - 3}" y="${Y0 + 14}">${k}</text>`;
  for (let k = 1; k <= TC; k++) { const v = D.porK("vk", k); s += `<line x1="${X0}" y1="${py(v)}" x2="${X0 + W}" y2="${py(v)}" stroke="#e3e3e8"/><text x="4" y="${py(v) + 3}">${D.num(v, 0)}</text>`; }
  for (let k = 1; k <= TC; k++) {
    const v0 = D.porK("vk", k - 1), v1 = D.porK("vk", k), a = px(k - 1), b = px(k);
    s += `<polygon points="${a},${Y0} ${b},${Y0} ${b},${py(v1)} ${a},${py(v0)}" fill="${col[(k - 1) % 3]}" opacity=".85"/>`;
    for (let j = 1; j < k; j++) {                // divide la franja en triangulitos iguales
      const vj = D.porK("vk", j);
      s += `<line x1="${a}" y1="${py(vj - D.porK("vk", 1))}" x2="${b}" y2="${py(vj)}" stroke="#2A2A33" stroke-width=".8"/><line x1="${a}" y1="${py(vj)}" x2="${b}" y2="${py(vj)}" stroke="#2A2A33" stroke-width=".8"/>`;
    }
    s += `<text x="${(a + b) / 2 - 6}" y="${Y0 - 4}" fill="#2A2A33" font-weight="500">${D.num(D.porK("sk", k), 0)}</text>`;
  }
  s += `<line x1="${X0}" y1="${Y0}" x2="${X0 + W}" y2="${py(vMax)}" stroke="#3D6FCB" stroke-width="3"/>`;
  s += `<line x1="${X0}" y1="${Y0}" x2="${X0 + W + 8}" y2="${Y0}" stroke="#2A2A33" stroke-width="1.4"/><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0 - Hh - 8}" stroke="#2A2A33" stroke-width="1.4"/>`;
  s += `<text x="${X0 + W - 14}" y="${Y0 + 26}">t (s)</text><text x="${X0 + 4}" y="${Y0 - Hh - 10}">v (m/s)</text></g>`;
  return P.css(s);
}
function abrePausa(p) {
  pausa = p; corre = false;
  $("pausa").hidden = false;
  txt("pausaN", p.n); txt("pausaT", D.texto(p.t, { n: N })); txt("pausaQ", D.texto(p.q, { n: N }));
  $("pausaR").hidden = true; $("pausaSeguir").hidden = true;
  const caja = $("pausaOps"); caja.innerHTML = "";
  const v = D.calc({ n: N });
  p.opciones.forEach((o) => {
    const b = document.createElement("button"); b.className = "op";
    b.textContent = o.formula ? D.num(v[o.formula], 0) : o.texto;
    b.onclick = () => {
      [...caja.children].forEach((x) => (x.disabled = true)); b.setAttribute("aria-pressed", "true");
      const r = $("pausaR"); r.hidden = false; r.className = "retro" + (o.correcta ? " ok" : "");
      r.innerHTML = `<b>${o.correcta ? X.exacto : X.casi}</b> ${D.texto(o.retro, { n: N })}`;
      $("pausaSeguir").hidden = false; $("pausaSeguir").focus();
    };
    caja.appendChild(b);
  });
  const g = $("grafica"); g.hidden = p.id !== "grafica";
  if (p.id === "grafica") { g.querySelector("svg").innerHTML = graficaVT(); g.querySelector("svg").setAttribute("aria-label", D.texto(p.aria, { n: N })); }
  $("resultado").hidden = true;
  actualizaHoja();
  if (innerWidth <= 700) $("maqueta").scrollIntoView({ block: "start", behavior: reducido ? "auto" : "smooth" });
}
function cierraPausa() {
  if (!pausa) return; pausa.hecha = true; pausa = null;
  $("pausa").hidden = true; $("grafica").hidden = true; corre = true; actualizaHoja();
}
$("pausaSeguir").onclick = cierraPausa;
$("pausaSeguir").textContent = X.continuar;

// ---------- resultado ----------
function fin() {
  hecho = true; $("resultado").hidden = false; $("tarjeta").hidden = true;
  const sn = vN.sn, op = D.J.prediccion.opciones.find((o) => Math.abs(vN[o.formula] - pred) < 1e-9) || D.J.prediccion.opciones[0];
  const dif = D.num(Math.abs(pred - sn), 0), ok = Math.abs(pred - sn) < 1e-9;
  const cab = ok ? X.acierto : D.tpl(pred > sn ? X.pasaste : X.corto, { dif });
  const r = $("retro"); r.className = "retro" + (ok ? " ok" : "");
  r.innerHTML = `<b>${cab}</b> ${D.texto(op.retro, { n: N })}<br><small>${X.girar}</small>`;
  txt("c4", D.texto(X.comparacion, { n: N }, { x: D.num(pred, 0) })); $("c4").classList.remove("oculto");
  actualizaHoja();
}
$("cerrar").onclick = () => { $("resultado").hidden = true; actualizaHoja(); };
$("mCuaderno").onclick = () => { if (!hoja.visible && hecho) { $("resultado").hidden = false; actualizaHoja(); } };

// ---------- 3D bajo demanda ----------
async function cargar3D() {
  if (escena || cargando) return !!escena;
  cargando = true; $("carga").hidden = false;
  try {
    const { crearEscena } = await import("./escena.js");
    escena = await crearEscena({
      lienzo: $("esc"), maqueta: $("maqueta"), D, P, rutaModelos: RUTA_MODELOS, reducido,
      alCargar: (i, n) => txt("carga", `${X.cargando} ${i}/${n}`),
    });
    $("respaldo").hidden = true; $("esc").hidden = false;
  } catch (e) {
    console.error(e); txt("carga", X.sin3d);
    cargando = false; return false;
  }
  $("carga").hidden = true; cargando = false;
  return true;
}
function arrancar() {
  corre = true; $("tarjeta").hidden = true; libre = false; actualizaHoja();
  cargar3D();
}
function irA(s) { S = Math.max(0, Math.min(DUR, s)); }

$("saltar").onclick = () => {
  if (pausa) return;
  if (S >= DUR) { S = 0; libre = false; $("resultado").hidden = true; pausas.forEach((x) => (x.hecha = false)); actualizaHoja(); }
  if (corre) { corre = false; return; }
  arrancar();
};
// Ir al salto: se salta la intro (pone la escena justo antes de la cuenta regresiva).
$("irSalto").onclick = () => {
  if (pausa) return;
  libre = false; $("resultado").hidden = true;
  pausas.forEach((x) => (x.hecha = x.en < CI.irAlSalto)); irA(CI.irAlSalto); actualizaHoja(); arrancar();
};
const VELS = [1, 0.5, 0.25];
$("vel").textContent = "×" + VELS[0];
$("vel").onclick = () => { vel = VELS[(VELS.indexOf(vel) + 1) % VELS.length]; $("vel").textContent = "×" + D.num(vel, 2); };
$("tiempo").oninput = (e) => {
  if (pausa) { pausa = null; $("pausa").hidden = true; $("grafica").hidden = true; }
  corre = false; libre = false; irA(+e.target.value); $("tarjeta").hidden = true;
  if (S >= D.abrir && !hecho) fin(); else actualizaHoja();
  cargar3D();
};

// ---------- un cuadro ----------
let fps = { n: 0, t: 0, min: 1e9 };
function dibuja(dt) {
  const t = D.fisica(S), v = D.calc({ t }), f = D.fmt(v);
  const tapado = (() => {                       // cuánto del lienzo tapa la hoja levantada (px desde abajo)
    // solo en celular: ahí la hoja es fija sobre la escena; en PC sube sobre la mesa
    if (!pausa || $("levantada").hidden || !matchMedia("(max-width:700px)").matches) return 0;
    const a = $("maqueta").getBoundingClientRect(), b = $("levantada").getBoundingClientRect();
    return b.top >= a.bottom ? 0 : Math.max(0, a.bottom - Math.max(a.top, b.top));
  })();
  if (escena) escena.dibuja(S, { pausa: pausa?.id ?? null, libre, dt, tapado, respaldo: q.has("respaldo") });
  const tq = S < D.salto ? 0 : (t >= D.TC ? t : paso(t));
  if (mesaVisible) mueveInstrumentos(tq);
  mueveCotas(tq);
  const i = tomaDe(S), enEscena = !!pred && !!escena;
  $("toma").hidden = libre || !enEscena || !!pausa;
  txt("tomaN", D.tomas[i].n); txt("tomaT", D.tomas[i].t);
  D.tomas.forEach((x, k) => x.li.classList.toggle("on", !libre && k === i && !!pred));
  $("tit3d").hidden = !(enEscena && S > CI.tituloDe && S < CI.tituloA);
  // aviso de cámara lenta: la escena va lenta, pero el cronómetro sigue el tiempo físico (g no cambia)
  $("lenta").hidden = !enEscena || !!pausa || libre || D.ritmo(S) >= CI.ritmo.avisoBajo;
  const cta = S >= CI.cuentaInicio && S < D.salto ? CI.cuentaDesde - Math.floor((S - CI.cuentaInicio) / CI.cuentaPaso) : 0;
  $("cuenta").hidden = !cta || !enEscena; if (cta) txt("cuenta", Math.max(1, cta));
  $("tiempo").value = S;
  if (t > 0) {
    txt("c1", D.tpl(X.cuadernoH, f)); txt("c2", D.tpl(X.cuadernoV, f));
    const k = Math.min(D.tramos.length, Math.floor(t + 1e-6));
    txt("c3", k ? D.tpl(X.cuadernoTramos, { lista: D.tramos.slice(0, k).map((x) => D.num(x, 0)).join(" · ") }) : "—");
    ["c1", "c2", "c3"].forEach((x) => $(x).classList.remove("oculto"));
  }
}
function bucle(ahora) {
  const dt = Math.min(.05, (ahora - (ult || ahora)) / 1000); ult = ahora;
  if (corre && escena) {
    const S0 = S; S = Math.min(DUR, S + dt * vel);
    const p = pausas.find((x) => !x.hecha && S0 < x.en && S >= x.en);
    if (p) { S = p.en; abrePausa(p); }
    else if (S >= DUR) { corre = false; libre = true; if (!hecho) fin(); }
    if (dt > 0) { fps.n++; fps.t += dt; fps.min = Math.min(fps.min, 1 / dt); }
  }
  dibuja(dt);
  txt("saltar", corre ? X.pausar : S >= DUR ? X.otraVez : S > 0 ? X.seguir : X.ver);
  requestAnimationFrame(bucle);
}
actualizaHoja();
requestAnimationFrame(bucle);

// ---------- capturas y medición ----------
// ?paleta=neutra (colores originales) · ?pred=25 (elige la predicción) · ?S=8.6 (congela un instante) · ?pausa=tandem|grafica · ?fin=1 (resultado)
// ?respaldo=1 (encuadre de la imagen fija, a pantalla completa) · ?medir=15000 (corre sin pausas y escribe FPS en consola)
// ?reducido=1 (como prefers-reduced-motion) · ?anchos=1 (lista en consola lo que se sale de la pantalla)
window.taller = {
  fps: () => ({ promedio: fps.t ? +(fps.n / fps.t).toFixed(1) : 0, minimo: fps.min < 1e9 ? +fps.min.toFixed(1) : 0, cuadros: fps.n }),
  tris: () => escena?.tris() ?? 0,
};
if (q.has("anchos")) setTimeout(() => {            // diagnóstico: qué se sale de la pantalla
  const fuera = [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
    .slice(0, 12).map((e) => `${e.tagName}#${e.id}.${e.className?.baseVal ?? e.className} ${Math.round(e.getBoundingClientRect().width)}px`);
  console.log("ANCHOS", innerWidth, document.documentElement.scrollWidth, JSON.stringify(fuera));
}, 3000);
if (q.has("pestana")) pestana(q.get("pestana"));                // capturas: ?pestana=instrumentos|cuaderno|datos
if (q.has("pred") || q.has("S") || q.has("respaldo")) {
  elegir(+(q.get("pred") || vN.sn));
  $("tarjeta").hidden = true; actualizaHoja();
  if (q.has("respaldo")) document.body.classList.add("captura-respaldo");
  if (await cargar3D()) {
    irA(+(q.get("S") || 0));
    const p = pausas.find((x) => x.id === q.get("pausa"));
    if (p) { irA(p.en); abrePausa(p); }
    if (q.has("fin")) { irA(DUR); libre = true; fin(); }
    if (q.has("corre") || q.has("medir")) arrancar();
    if (q.has("colisiones")) {                    // recorre el guion y reporta piezas que se atraviesan
      const { revisar } = await import("./colisiones.js");
      const muestras = [];
      for (let s = 0; s < D.salto; s += 0.5) muestras.push([s, {}]);
      for (let s = D.salto; s <= DUR; s += 0.1) muestras.push([s, {}]);
      pausas.forEach((p) => muestras.push([p.en, { pausa: p.id }]));
      const t0 = performance.now(), r = revisar(escena, D, muestras);
      r.ms = Math.round(performance.now() - t0);
      console.log("COLISIONES", JSON.stringify(r));
      const m = $("medida"); m.hidden = false; m.textContent = JSON.stringify(r.pares) + " · " + r.muestras + " muestras · " + r.ms + " ms";
    }
    if (q.has("medir")) {                         // corre la escena sin detenerse en las pausas y reporta fps
      pausas.forEach((x) => (x.hecha = true));
      setTimeout(() => {
        const r = { ...window.taller.fps(), tris: window.taller.tris(), llamadas: escena.renderer.info.render.calls, ancho: innerWidth, dpr: devicePixelRatio,
          gpu: (() => { const g = $("esc").getContext("webgl2"); const e = g?.getExtension("WEBGL_debug_renderer_info"); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "?"; })() };
        console.log("FPS", JSON.stringify(r));
        const m = $("medida"); m.hidden = false;                // también en pantalla, para leerlo en el celular
        m.textContent = `fps ${r.promedio} · mín ${r.minimo} · ${r.cuadros} cuadros
${r.tris} triángulos · ${r.ancho}px ×${r.dpr}
${r.gpu}`;
      }, +(q.get("medir") || 15000));
    }
  }
}
