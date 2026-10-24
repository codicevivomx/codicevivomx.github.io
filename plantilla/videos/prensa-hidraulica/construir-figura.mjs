// Genera compositions/figura.html a partir del SVG de la infografía (fuente única).
// Uso: node construir-figura.mjs
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";

const raiz = new URL("../../../", import.meta.url);
const origen = new URL("contenido/fisica/img/prensa-hidraulica.svg", raiz);
const aqui = new URL("./", import.meta.url);

mkdirSync(new URL("assets/", aqui), { recursive: true });
copyFileSync(origen, new URL("assets/prensa-hidraulica.svg", aqui));

let svg = readFileSync(origen, "utf8");

// Sólidos de las flechas, en orden de aparición: 17–18 = F₁, 32–33 = F₂.
const solidos = [...svg.matchAll(/<g class="iso-solid"[^>]*>[\s\S]*?<\/g>/g)];
const envolver = (desde, hasta, id) => {
  const ini = solidos[desde].index;
  const fin = solidos[hasta].index + solidos[hasta][0].length;
  return { ini, fin, id };
};
const grupos = [envolver(17, 18, "fig-f1"), envolver(32, 33, "fig-f2")];
for (const { ini, fin, id } of grupos.reverse()) {
  svg = svg.slice(0, ini) + `<g id="${id}">` + svg.slice(ini, fin) + "</g>" + svg.slice(fin);
}

svg = svg
  .replace('<svg ', '<svg id="fig-svg" ')
  .replace('y="70.7">F₁</text>', 'y="70.7" id="fig-f1-txt">F₁</text>')
  .replace('y="167.8">F₂</text>', 'y="167.8" id="fig-f2-txt">F₂</text>')
  // Sin animaciones CSS infinitas: todo depende del tiempo del video.
  .replace("</style>", ".iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}</style>");

// Los <style> internos del SVG no sobreviven dentro de la escena: se pasan a la
// hoja de la escena con las variables del tema claro ya resueltas.
let estilos = [...svg.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
svg = svg.replace(/<style>[\s\S]*?<\/style>/g, "");
const vars = {};
for (const bloque of [/\.iso\{([\s\S]*?)\}/, /\.iso\[data-theme="light"\]\{([\s\S]*?)\}/]) {
  for (const [, k, v] of estilos.match(bloque)[1].matchAll(/(--anatomy-[\w-]+):([^;]+);/g)) vars[k] = v.trim();
}
for (let i = 0; i < 3; i++) estilos = estilos.replace(/var\((--anatomy-[\w-]+)(?:,[^)]*)?\)/g, (m, k) => vars[k] ?? m);
estilos = estilos.replace(/@media[^{]*\{[^{}]*(\{[^}]*\}[^{}]*)*\}/g, "");

const html = `<template>
  <style>
    #root {
      position: absolute;
      inset: 0;
    }
    #fig-caja {
      position: absolute;
      left: 70px;
      top: 380px;
      width: 940px;
    }
    #fig-svg text {
      font-size: 19px;
    }
${estilos}
  </style>
  <div id="root" data-composition-id="figura" data-width="1080" data-height="1920">
    <div id="fig-marco" class="clip" data-start="0" data-duration="10" data-track-index="0" data-layout-allow-overflow>
      <div id="fig-caja" data-layout-ignore>${svg}</div>
    </div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    // Entrada de la figura
    tl.fromTo("#fig-caja", { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }, 0);
    // F₁ empuja dos veces el pistón chico
    tl.fromTo(["#fig-f1", "#fig-f1-txt"], { y: -24 }, { y: 0, duration: 0.45, ease: "power2.in" }, 0.9);
    tl.to(["#fig-f1", "#fig-f1-txt"], { y: -14, duration: 0.35, ease: "power2.out" }, 1.5);
    tl.to(["#fig-f1", "#fig-f1-txt"], { y: 0, duration: 0.35, ease: "power2.in" }, 1.85);
    // Ejemplo: F₂ se encoge y luego crece hasta 1 250 N (base fija en y = 210)
    tl.fromTo("#fig-f2", { scaleY: 1, svgOrigin: "371.7 210" }, { scaleY: 0.45, svgOrigin: "371.7 210", duration: 0.5, ease: "power2.inOut" }, 4.2);
    tl.fromTo("#fig-f2-txt", { y: 0 }, { y: 49.5, duration: 0.5, ease: "power2.inOut" }, 4.2);
    tl.to("#fig-f2", { scaleY: 1.6, svgOrigin: "371.7 210", duration: 0.9, ease: "back.out(1.6)" }, 7.0);
    tl.to("#fig-f2-txt", { y: -54, duration: 0.9, ease: "back.out(1.6)" }, 7.0);
    window.__timelines["figura"] = tl;
  </script>
</template>
`;

mkdirSync(new URL("compositions/", aqui), { recursive: true });
writeFileSync(new URL("compositions/figura.html", aqui), html);
console.log("figura.html:", html.length, "bytes");
