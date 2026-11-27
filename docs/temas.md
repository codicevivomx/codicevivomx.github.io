Leyenda: ✓ hecho · … en curso · — no aplica · (vacío) pendiente

| Tema | Materia | Contenido | Figura | Interactivo | 3D | Video | PDF |
|---|---|---|---|---|---|---|---|
| prensa-hidraulica | física | ✓ | ✓ (2.5D+ Anatomy, plus/) | ✓ | premium-hero (WebGL) | ✓ (28 s) | |
| principio-de-arquimedes | física | ✓ | ✓ (SVG 2.5D+) | ✓ (2.5D+ · antes v1 2D y v2 2.5D) | — | | |
| tiro-parabolico | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| leyes-de-newton-1 | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/, pantalla completa) | — | | |
| leyes-de-newton-2 | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/, pantalla completa) | — | | |
| leyes-de-newton-3 | física | ✓ | ✓ | ✓ plus | — | pendiente | pendiente |
| caida-libre | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| gravitacion-universal | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| conservacion-de-la-energia | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| cantidad-de-movimiento | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| calor-y-temperatura | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| ondas | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| ley-de-ohm | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| reflexion | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |
| refraccion | física | ✓ | ✓ (SVG del generador) | ✓ (2.5D+, plus/) | — | | |

## Rutas por tema (convención)
- Contenido: `contenido/<materia>/<tema>.md`
- Datos del interactivo: `contenido/<materia>/<tema>-interactivo.json`
- Figura SVG: `contenido/<materia>/img/<tema>.svg`
- Interactivo 2D: `plantilla/interactivos/<tema>/` (index.html, estilos.css, <tema>.js)
- 3D (opcional): `plantilla/interactivos/<tema>/3d/`
- Video (composición): `plantilla/videos/<tema>/` · MP4: `contenido/<materia>/video/` (fuera del repo)
- Script de figura Anatomy (solo temas estrella): `plantilla/figuras/<tema>.mjs`

## Notas por tema
- **prensa-hidraulica** (tema modelo): sus datos están en `contenido/fisica/prensa-interactivo.json`
  (excepción a la convención; no renombrar fuera de una tanda). Publicado en
  https://codicevivomx.github.io/plantilla/interactivos/prensa-hidraulica/
  Experimentos Anatomy: `premium/` (lámina 1) y `premium-hero/` (✓ 25-oct: gato hidráulico en corte
  + modo 3D que se carga al tocar; script `plantilla/figuras/prensa-hidraulica-hero.mjs`; 3D a ~20 fps
  en perfil celular). Vigilante de fps agregado 26-oct: 33 ms durante 2 s → (1) canvas 1.5 → 1,
  (2) `uLite` (ruido de 4 capas → 1 y se saltan los conductos apagados), (3) WebGL apagado y
  respaldo SVG; sin partículas en esta lámina; ganchos `window.__phFps`. Probado a 390 px y
  CPU 4× en claro y oscuro. Celular real probado 27-oct: todo bien salvo el 3D, que dejaba de
  responder al arrastre después de soltar (también en PC); arreglado en fix/premium-hero-3d
  (probado en PC y celular). Celular real: fluido, sin defectos. Sin comprobar: parpadeo al bajar al nivel 1 y pausa al
  salir de pantalla. Pendiente: auditoría 3D completa y 8 avisos de continuidad en la base 3D.
- **principio-de-arquimedes**: v1 (2D códice) en `plantilla/interactivos/principio-de-arquimedes/`;
  v2 (2.5D fusión códice + moderno) en `.../principio-de-arquimedes/v2/`. Encuesta IG (11 votos):
  fusión 6, 2D 4, moderna 1. La v2 trae el contenido dentro del index.html (aún no lee el JSON).
- **tiro-parabolico**: primer tema hecho con la 2.5D+ partiendo del generador de la prensa.
  Generador `plantilla/figuras/tiro-parabolico-2_5d.mjs` → `plantilla/interactivos/tiro-parabolico/plus/`
  (132 KB, 1 ronda). Costo: 4 % sesión (82 → 86 %), <1 % semana (9 → 9 %), Opus 5.5.
  37° y 53° usan los valores del examen (campo `aproximaciones`); los demás ángulos, la calculadora.
  El CSS de página va copiado de la prensa dentro del generador (pasará a piezas compartidas).
  Pendiente: salida `.svg` fija (6b).
- **leyes-de-newton-1** (primera ley, inercia): 2.5D+ partiendo del generador de tiro, dibujo nuevo.
  Generador `plantilla/figuras/leyes-de-newton-1-2_5d.mjs` → `plantilla/interactivos/leyes-de-newton-1/plus/`
  (151 KB) y `contenido/fisica/img/leyes-de-newton-1.svg` (figura fija, del mismo generador). 2 rondas.
  Lámina: disco con lanzador de resorte, pista con tramo de fricción μ, regla y marcas estroboscópicas
  (cada 0.2 s de tiempo real); 9 rótulos. Interacciones: Empujar por fases (contacto → suelta →
  desliza → se detiene o sigue), deslizadores v₀ y μ, trampa con fantasma («si moverse necesitara
  fuerza»), predice con μ = 0, recorrido automático que no revela d.
  Escala: ventana de 14 m; la cámara sigue al disco y la regla se desplaza; barra 0 → d abajo;
  cámara rápida ×N (se indica) si el frenado dura más de 6 s. Campos nuevos en el JSON: `escena`,
  `prediccion` y textos de `figura`/`controles` (los existentes sin cambios).
  Primer tema con **pantalla completa** (modo lámina): ver tarea de piezas compartidas.
  Costo: inicio no anotado; Opus 5.5.
  Pendiente: probar pantalla completa en Android e iPhone reales.
- **leyes-de-newton-2** (segunda ley, F = m·a): 2.5D+ partiendo del generador de leyes-de-newton-1, dibujo nuevo.
  Generador `plantilla/figuras/leyes-de-newton-2-2_5d.mjs` → `plantilla/interactivos/leyes-de-newton-2/plus/`
  (188 KB) y `contenido/fisica/img/leyes-de-newton-2.svg` (figura fija, del mismo generador). 2 rondas (plan + ajustes).
  Lámina: caja con pesas de 1 kg sobre riel de aire (sin fricción), dos dinamómetros enganchados (F₁ derecha,
  F₂ izquierda), traba, soplador, regla con signo, cronómetro y velocímetro; 10 rótulos.
  Interacciones: Soltar por fases (listo con traba → suelta → acelera → pausa en t; la caja no frena),
  deslizadores F₁, F₂, m y t (con la toma en pausa, t recorre el movimiento), trampa con fantasma que
  acelera solo con la fuerza mayor, predice con las 4 opciones del paso 1, recorrido automático que mueve
  los dinamómetros sin soltar ni revelar a.
  Signos: F₂ > F₁ → flecha neta y caja a la izquierda; F₁ = F₂ → «F neta = 0 → a = 0 (1.ª ley)».
  Escala: ventana de 12 m; la cámara sigue a la caja hacia los dos lados y la regla se desplaza; barra 0 → x.
  Sin cámara rápida (t ≤ 3 s, tiempo real). Campos nuevos en el JSON: `escena`, `prediccion` y textos de
  `figura`/`controles` (los existentes sin cambios).
  Costo: inicio no anotado (≈ 10-15 % sesión, estimado); Opus 5.5.
  Pendiente: probar pantalla completa en Android e iPhone reales.

## Experimento lámina premium (rama experimento/anatomy-premium, cerrado 26-oct-2026)
Anatomy sí hace 3D interactivo (premium-hero de la prensa). Guía resultante: docs/estilo-premium.md.
Premium solo para ocasiones muy especiales, como máximo una cada 1-2 semanas.
Pendiente: confirmar con otra lámina las reglas marcadas «nuevo» en estilo-premium.md (zoom y arrastre).

## Pendiente para Claude Code
- [x] premium-hero (prensa): el 3D no respondía al arrastre tras soltar. Arreglado: el bucle se detenía y nada lo reactivaba; ahora pointerdown y el temporizador de 4 s llaman a run(). No lo causó el vigilante. Pendiente menor: cancelar el temporizador anterior en up().
- [ ] Script de PDF carta reutilizable: lee `<tema>.md` + `img/<tema>.svg`; Gato lo corre por tema.
- [ ] Plantilla de video reutilizable a partir de `plantilla/videos/prensa-hidraulica/`; Gato renderiza por tema.
- [ ] Menor: renombrar `prensa-interactivo.json` → `prensa-hidraulica-interactivo.json` y actualizar sus referencias.
- [ ] Sacar las piezas compartidas del generador de la prensa 2.5D+ (tokens fusión + grises cálidos,
  CSS de página, lógica común) y que prensa, tiro-parabolico, leyes-de-newton-1 y leyes-de-newton-2 las importen.
  Arquímedes se rehace en 2.5D+ después.
  Incluir la **pantalla completa** («modo lámina») como pieza compartida. Origen:
  `plantilla/figuras/leyes-de-newton-1-2_5d.mjs` (bloque «Pantalla completa», CSS `.modo-lamina`,
  HTML #pantalla / #completa / #cerrar / #compacto). Hace: botón ⛶ → lámina a toda la pantalla
  con controles compactos (los mueve y los regresa); requestFullscreen + orientation.lock("landscape")
  en Android; capa fija + aviso «gira el teléfono» en iPhone; zoom 1×–4× con pellizco o Ctrl+rueda,
  arrastre con zoom, doble toque/Esc vuelve a 1×; Esc o ✕ para salir. Cada lámina solo dice qué
  controles (ids) van al modo compacto. Aplicarla a prensa y tiro. Idea para vertical: zoom ~2×
  siguiendo la pieza que se mueve.
- [ ] Menor: salida `.svg` fija en el generador de tiro (6b), como ya la tiene leyes-de-newton-1.
- [ ] Modelos 3D «taller» de caída libre · El salto (`plantilla/modelos/caida-libre/`, un .glb por modelo, script bpy
  en `fuentes/` que lo regenera con `blender -b --factory-startup -P`, PNG de vista previa y `ver.html` con toon de
  2 tonos + contorno). `.blend` fuera del repo (`Documents\codice-blender\caida-libre\`).
  - [x] avioneta (22-nov-2026): 2 036 triángulos, hélice/puerta/interior aparte, origen en centro de masa.
  - [x] paracaidista (22-nov-2026): 2 264 triángulos, 18 huesos (con `enganche` sobre la mochila para el
    paracaídas), acciones «parada», «arco» (cactus) y «vertical» (solo rotación, LINEAR). Cuerpo, arnés,
    esqueleto y poses en `fuentes/persona.py` (lo hereda el tándem). `ver.html`: botones por pose,
    «Todas las poses» y vista «Debajo». `.blend` renombrado a `caida-libre.blend` (una escena por modelo).
  - [x] tándem (22-nov-2026): 4 480 triángulos, 36 huesos. Instructor (menta, casco gris, mochila grande,
    `enganche`) y alumna (`alu_*`, #E3B95A) en un esqueleto; raíz «centro» en el centro de masa de los dos.
    Acciones «arco» (piernas de la alumna entre las del instructor) y «vertical» (instructor en los
    mandos, alumna sujeta la pechera).
  - [x] paracaídas (22-nov-2026): 1 164 triángulos, vela de 9 celdas en arco (4.8 m), cuerdas A/B/C, bandas,
    frenos y mandos. Origen = punto de enganche (se cuelga del hueso «enganche»). Celdas en materiales
    `vela_1/2/3` (recolorear con `colorearVela()` de `ver.html`). Acción «abrir» 1.5 s con morph targets:
    bolsa (0 s) → haz largo con cuerdas estiradas (0.5 s) → vela inflada (1.5 s). `ver.html`: «Montaje»
    (paracaidista + tándem con sus paracaídas, el del tándem 1.3× y azul) y `?t=` para congelar un instante.
  - Nota para la lámina: la vela se alinea al cuerpo con la rotación de reposo de `enganche` (ver `montaje()`).
- [x] Lámina «Caída libre · El salto» (taller, boceto 9 con modelos reales, 22-nov-2026, aprobada por Gato con 3
  arreglos de encuadre hechos: toma 5 encuadrada por fórmula (`llenadoRevelacion`), compensación de la hoja en
  pausas solo en celular, título «3 500 m» arriba de la avioneta):
  `plantilla/interactivos/caida-libre/taller/` (`index.html`, `estilos.css`, `taller.js` director, `datos.js` evaluador
  de `plus/`, `mesa.js` mesa e instrumentos, `escena.js` 3D, `toon.js`, `etiquetas.js`, `respaldo.webp`). El 3D
  (three + .glb) se carga al tocar «Ver la escena»; antes, imagen fija de la escena inicial. Números: bloque nuevo
  `taller` del JSON + `lecturas.formulas` + `prediccion` (n = 3). Etiquetas en HTML que no se enciman; en las pausas (solo celular) la
  cámara sube lo que tapa la hoja. three r187 en `assets/js/vendor/three-r187/`; fuentes Geist, Geist Mono y Bricolage
  en `assets/fuentes/` (Caveat de `laminas2/`). Peso: 218 KB gzip al abrir + 380 KB al tocar. En la lámina la avioneta
  vuela sin la hoja de la puerta y las personas van al 92 % de la escala de la avioneta (caben en el estribo).
  Pendiente menor: aligerar fuentes (Bricolage 77 KB y Caveat 51 KB son casi todo el peso inicial).
- [x] Lámina «El salto» versión cine (rama `lamina/caida-libre-cine`, 25-nov-2026; **aprobada por Gato el 26-nov, lista para publicar**): guion de 9 tomas en el bloque nuevo `taller.cine` del JSON (~45 s sin pausas; establecimiento
  desde la tierra, travelling, rampas tiempo real → cámara lenta ×⅓ → real, tilt down con la tierra al fondo, grúa
  final y órbita libre). Reloj de cine en `datos.js` (tiempo de escena → tiempo físico; la física y el cronómetro
  van en tiempo físico). Aviso «Cámara lenta ×⅓», botón «Ir al salto», línea de tiempo de 45 s. `tierra.js`
  (paisaje low-poly en 1 malla), halo y contorno del color de cada segundo, tramos que crecen. `paleta.js`:
  `?paleta=a` (+20 %) y `?paleta=b` (+40 %) aplicadas una vez al cargar (sin filtros). Instrumentos nuevos con
  biseles, cristal y sombra de agujas. 179 fps escritorio / 127 fps con emulación de celular (GPU de escritorio).
  Pendiente: cuando Gato elija paleta, dejarla como predeterminada y regenerar `respaldo.webp`.
  Ronda 2 (25-nov): a y b no convencieron. `?paleta=c` (sat +70 %, contraste +25 %, verde 60 %, cielo y coral +40 %)
  y `?paleta=ajuste` (panel flotante con saturación 0–120 %, contraste 0–50 % y verde 0–100 %; arranca en la c,
  aplica al soltar ~4 ms, muestra la línea para dictar).
  Ronda 3 (25-nov): paleta predeterminada en OKLCH (croma +55 % sin subir L, contraste +20 % con pivote 0.8, verde
  +40 %, cielo +30 %, coral +40 %; recorte a la gama sRGB); `?paleta=neutra` = originales; panel quitado.
  `respaldo.webp` regenerado (29 KB). Pose «parada» agachada con la mano en el montante y estribo movido delante
  del montante (el casco ya no atraviesa el ala); tándem separado 42 cm. `colisiones.js` (`?colisiones=1`):
  300 muestras del guion, 0 choques persona↔avioneta, persona↔velas, sola↔tándem e instructor↔alumna.
  Librea «Aerocódice» (calcas de canvas: «C» del ícono en la cola, AEROCÓDICE, XB-CDV) + franja coral, líneas de
  paneles, remaches, antena y luces en `avioneta.py`. Personas: costuras, hebillas, dedos y altímetro de muñeca;
  vela: costuras y slider; tierra: más verdes, caminos, granjas, huertos. Efectos: tramado en la sombra del toon,
  cielo pintado, líneas de velocidad y viento (44 tiras instanciadas), aleteo leve. Triángulos: avioneta 2 670,
  paracaidista 2 536, tándem 5 024, vela 1 320; escena 19 196. Modelos con meshopt (`fuentes/comprimir.sh`,
  decodificador en `assets/js/vendor/three-r187/addons/libs/`): 657 → 175 KB (gzip 161 → 74 KB).
  fps: 178 escritorio / 128 emulación de celular. Pendiente: medir en celular real y decidir si suben los topes (LOD).
  Ronda 4 (25-nov): tierra natural (parcelas irregulares, bosque y olivo, paleta de la tierra con croma 1.25 y sin
  empujón al verde); volcán al horizonte con bruma horneada; líneas de velocidad blancas, cortas y solo alrededor de
  ella; toma 6 sin nubes encima y con la cinta coral completa a lo ancho (nubes cercanas se mueven ±6 m, en tiempo
  de escena). Clima: perspectiva atmosférica (niebla y pie del cielo azul claro, niebla a 2 300 m), capa de nubes
  baja y alta, velo translúcido que la cámara atraviesa en la toma 5, sombras de nubes (instanciadas) y sprite del
  sol. Nubes unidas en una geometría (2 llamadas por nube). Mesa: lámpara articulada SVG arriba a la izquierda (la
  luz y las sombras salen de ahí). PC ≥ 1000 px: lámina (58 %, sticky) y mesa (42 %, retícula de 6 columnas) lado a
  lado; hoja levantada del ancho de la mesa; celular apilado. `respaldo.webp` regenerado. 0 choques; 178 / 128 fps.
  - [ ] Pendiente: cambiar el ícono de la cola de la avioneta (la «C» del logo no convenció a Gato).
  Ronda 5 (25-nov): mesa recta (cenital) también en PC, por estaciones: tapete con canto, bandeja de papeles
  (cuaderno, milimétrico, post-it, ficha) y estuche de espuma con cronómetro, velocímetro y altímetro en sus huecos
  (SVG animados encima), regla y lápiz en sus ranuras. Lámpara y estuche pre-renderizados en Blender
  (`plantilla/modelos/mesa/fuentes/mesa.py`, Cycles + Freestyle, fondo transparente con sombra, al doble de
  resolución): `lampara.webp` 33 KB, `estuche.webp` 39 KB. Celular: pestañas Instrumentos · Cuaderno · Datos (al
  levantar una hoja se abre Cuaderno). Sin bucle de «cámara de la mesa». 178 fps escritorio / 142 emulación.
  Ronda 6 (25-nov): lámpara nueva de metal gris (reflejos con softbox), ~1.8× y base ancha con canto y bisel, apoyada
  en el tapete con el brazo sobre la bandeja; luz cálida (spot) dentro de la pantalla renderizada como capa aparte
  (`lampara-luz.webp`, alfa = intensidad) que en la página va sobre la bandeja con mezcla screen + multiply (fija).
  Estuche hondo (huecos de 50 cm de modelo, sol más rasante) con tapa abierta 110° y espuma de huevera; versión
  vertical `estuche-v.webp` para celular (instrumentos ~1.5× más grandes, etiquetas de 12 px junto a cada uno).
  Pesos: lampara 58 KB, lampara-luz 23 KB, estuche 50 KB, estuche-v 38 KB. 178 fps escritorio / 137 emulación.
  Ronda 7 (25-nov): herramientas con cuerpo pre-renderizado (`fuentes/instrumentos.py`: crono con corona moleteada y
  argolla, velocímetro, altímetro digital, altímetro analógico 0–4000 m y registrador de cinta; 3–17 KB cada uno) y
  capa SVG animada encima. Crono: aguja principal + aguja de vueltas (1, 2, 3 s) y corona que se hunde al arrancar.
  Altímetro analógico en la tapa del estuche con la nota «45 m ≈ 4° de aguja». Registrador: tira con un punto cada
  0.1 s de tiempo físico (1:3:5 por segundo), escalada para que los 45 m quepan siempre. Cotas 0·5·20·45 m junto al
  video (vertical en PC, franja en celular), cada tramo se llena con su color en su segundo. Todo del JSON
  (`taller.cine.instrumentos`). La mesa solo se redibuja si se ve y en pasos de 0.02 s. fps sin cambio (178 / ~124
  emulación; la versión anterior mide lo mismo hoy).
- [ ] Unificar three.js: las láminas anteriores usan `assets/js/vendor/three.min.js` (r187, sin módulos). La lámina del
  taller y la copia de `ver.html` pueden usar `assets/js/vendor/three-r187/` (módulos); `ver.html` sigue con CDN.
  Llevar `taller/toon.js` (toon de 2 tonos + contorno) a pieza compartida para las siguientes láminas 3D.
- [x] Láminas 2.0, piloto tiro parabólico (17-nov-2026, ronda 1, **en espera de OK de Gato**). Diseño: `docs/diseno-laminas-2.md`.
  Piezas compartidas en `plantilla/laminas2/` (módulos ES + `laminas2.css` + `fuentes/caveat-700.woff2`): `tiempo.js`,
  `prediccion.js`, `cuaderno.js`, `herramientas.js`, `escenas.js` (selector + ayudantes de tinta), `practica.js` (motor de retos
  + modo examen). Generador `plantilla/figuras/tiro-parabolico-v2.mjs` → `plantilla/interactivos/tiro-parabolico/v2/`
  (+ `cancha.js`, `practica-tiro.js`). JSON: bloque nuevo `laminas2` (plus no lo lee). `plus/` intacto.
  Ronda 2 (17-nov-2026, última del piloto): piezas nuevas `pantalla-completa.js` (API nativa o capa fija a 100dvh en
  iPhone/Instagram; aviso de girar; dentro: escena, tiempo, predicción compacta, herramientas y cuaderno encima) y
  `etiquetas.js` (ninguna etiqueta tapa a otra). Herramientas una a la vez y pegadas a la física (regla con imanes, cronómetro
  entre marcas, transportador en el balón, velocidad grande). Predicción vacía y obligatoria en una fila («Patear ▶» en 390 px).
  Escenas encuadradas a la trayectoria. Cancha: portería a 20 m, tiro libre 15 m/s a 37°, barrera de 5, portero, áreas,
  punto penal, red, sombra que sigue al balón (fondo estático, +5.2 KB). Cuaderno en celular a media altura y arrastrable.
  `plus/` y `tiro-parabolico-2_5d.mjs` conviven hasta probar con 3-5 alumnos; después v2 reemplaza a plus.
  La pantalla completa de leyes-de-newton-1 puede pasar a usar `pantalla-completa.js` (pendiente de arriba).
- [x] Sitio (prototipo, 15-nov-2026): `index.html`, `biblioteca/`, `libros/fisica-unam/`, un solo CSS
  `assets/css/sitio.css` y `assets/js/sitio.js` (mini reto). Logo B «Capitular» en `assets/logo/codice-vivo-*.svg`
  (texto en contornos; `-texto.svg` deja «ódice» editable). Mascotas Griseldo y Chikis en SVG + CSS dentro de la portada.
  Figura fija nueva `contenido/fisica/img/tiro-parabolico.svg` (sacada del interactivo, con estilos en línea).
  Logo final (16-nov-2026): B «Capitular» con «VIVO» pixel. Favicon = `codice-vivo-icono.svg`. PNG del ícono
  (1080 y 200) y video del esquiador con el logo claro renderizados en `C:\Users\Gato\Videos\codice-vivo\`.
  Borradas las propuestas A, C, la B anterior, el ícono oscuro y `muestra.html`; en `assets/logo/` quedan
  horizontal, horizontal-oscuro (clara), horizontal-texto e ícono. El PDF aparece como «Próximamente»
  en la portada hasta que exista.
  Ronda 1 (15-nov-2026, en espera de OK de Gato): portada como mundo en pixel art con parallax (sprites SVG en línea,
  gatos escondidos sin nombre), libros en CSS 3D sobre estante (portada y `biblioteca/`) y tarjetas con inclinación.
  Sin probar en celular real ni con giroscopio (solo Android; en iPhone pide permiso y se dejó fuera).
  Ronda 2 (15-nov-2026, última): la portada pasó a paisaje en pixel fino pintado en canvas por `assets/js/paisaje.js`
  (cielo, sierra, valle con río, castillo-biblioteca, primer plano; dragón, aves y los dos gatos como sprites SVG).
  Se quitaron torres de libros, islas y cascada. Placa como tarjeta de papel. Sin probar en celular real.
  Fase 3 (15-nov-2026): `libros/fisica-unam/` como página de venta (libro 3D, qué incluye, capítulos en acordeón,
  visor de lámina al tocar, espacio del video, preguntas, cierre); `biblioteca/` con sala interior en pixel
  (`assets/js/paisaje.js`) y mueble de madera; portada con grecas, capitular y viñetas; pie completo con gatos dormidos.
  Enlaces pendientes (preventa y TikTok) en un solo lugar: objeto `ENLACES` al inicio de `assets/js/sitio.js`.
  Precio, fecha, PDF y video siguen como «próximamente». Sin probar en celular real.
  Zona de compra (15-nov-2026): `libros/fisica-unam/` rediseñada como tienda moderna con escena 3D del libro
  (`assets/js/escena-libro.js` + three.js r187 vendorizado en `assets/js/vendor/`, 187 KB comprimido; se pide solo ahí,
  tras el primer pintado, con WebGL y sin «menos movimiento»; respaldo `assets/img/libro-fisica-unam.webp`).
  Panel de tienda, pestañas, barra fija en celular. `biblioteca/`: ficha lateral al tocar un libro.
  `ENLACES` suma `avisame`. Sin probar en celular real.
  Ritmo de la portada (15-nov-2026): títulos en Fraunces (`assets/fuentes/fraunces-es.woff2`, recortada al español, 42 KB)
  con palabra clave en itálica rúbrica, numerales romanos grandes, despliegue al bajar (`data-rev` + `html.anima`),
  reto animado (rampa que se traza, bola que baja), sección «Cómo enseñamos» (6 pasos) y «Lo que viene»
  (lista `LO_QUE_VIENE` al inicio de `assets/js/sitio.js`). Sin probar en celular real.
  Bandas de la portada (16-nov-2026): cada sección a todo lo ancho con su ambiente (claro, tostado, verde azulado,
  pergamino, rojo vino), divisores variados (papel rasgado, curva, friso de greca `assets/img/greca.svg`),
  «Cómo enseñamos» con íconos de línea que se dibujan y lámina en miniatura fija que resalta el paso activo
  (frases de `contenido/fisica/conservacion-de-la-energia.md`, solo lectura), cabeceras en dos columnas en PC,
  planta y vela vectoriales en el estante de la portada. Sin pixel fuera de portada, biblioteca y gatos.
  «Cómo enseñamos» elegible a mano (16-nov-2026): pasos como botones (pestañas con flechas del teclado y aria-selected),
  chips I-VI, deslizar la lámina en celular; la elección manda hasta desplazarse ~60 % de la pantalla.
  Tarjeta de prensa-hidraulica: usa `assets/img/tarjetas/prensa-hidraulica.svg` (figura 2.5D+ extraída de su
  interactivo); el SVG de `contenido/` no se tocó.
  Pie, dorado y profundidad (16-nov-2026): pie en banda verde azulado con friso de greca, 4 columnas
  («Próximamente» sale de `LO_QUE_VIENE`, «Comunidad» de `ENLACES`), gatos dormidos sobre libros que despiertan al tocarlos,
  páginas `aviso-de-privacidad/` y `terminos/` «en preparación». Palabras clave doradas (`em.oro`) con destello único,
  subrayado dorado en títulos, sombras en capas e inclinación 3D con reflejo en tarjetas y cajas de la portada.
  Carga (16-nov-2026): Fraunces y la itálica de EB Garamond ya no van en el CSS; las registra `assets/js/sitio.js`
  cuando la página terminó de cargar (respaldo `<noscript>` en el `<head>`), y cada página solo baja la que usa.
  La profundidad y el reflejo al pasar el cursor también están en `libros/fisica-unam/` (tarjetas, ventajas y «En camino»).
- [x] Reto «Aplica lo aprendido» de la catapulta (16-nov-2026): video `plantilla/videos/aplica-tiro-catapulta/`
  en estilo «tinta» (72 s, sin voz, 3 pausas de 4 s; falta el OK de la vista previa para renderizar el MP4) y
  reproductor de retos reutilizable `retos/reproductor.js` + `retos/reproductor.css`, usado en `retos/catapulta/`
  y `retos/esquiador/`. Sección «Retos» en `libros/fisica-unam/` y esquiador «listo» en `LO_QUE_VIENE`.
  `.waveform-cache/` fuera del índice de git. Pendiente: voz de la catapulta (`voz/NN.mp3` y `voz/pN.mp3`).
  Ronda 1 (16-nov-2026): cámara con movimiento (seguimiento de la piedra, acercamientos, temblor en los impactos),
  más detalle de tinta (vetas, amarres, cadena, achurado, sillares, flores, polvo), arco de 45° contra el de 37° tenue
  y captions con líneas equilibradas. Sigue pendiente el OK de la vista previa para renderizar.
  Ronda 2 (16-nov-2026): trabuquete con volumen (vigas de 3 caras, herrajes, ruedas, contrapeso de tablones con piedras,
  honda con bolsa de cuero), castillo como el de la portada (arenisca, techos cónicos de teja, antorchas, banderas),
  muralla con almenas que cae sólida, polvo de tinta y sombras achuradas. Falta: OK de la vista previa para renderizar
  y volver a probar retos/catapulta/ en el navegador con la escena nueva.
  Voz (16-nov-2026): terminado. Voz en `voz/01–15.mp3` y `voz/p1–p3.mp3`; cada toma = su audio + 0.6 s (mínimo 4 s),
  pausas = pregunta + 0.3 s + cuenta de 3 s; total 88 s. Animaciones y cámara ajustadas (en la toma 7 las notas se
  escriben mientras habla). Mezcla: SFX a `data-volume="0.55"` cuando coinciden con la voz. `retos/catapulta/` y
  `retos/esquiador/` probados en navegador (3 pausas, pista, acierto, pregunta grabada, silenciar). MP4 fuera del repo:
  `C:\Users\Gato\Videos\codice-vivo\aplica-tiro-catapulta-voz.mp4` (alta) y `-tiktok.mp4` (39 MB).
- [x] Parpadeo de los retos en celular (16-nov-2026, sin commit). El primer intento (`will-change` en la capa del mundo
  de 2600×3200) lo empeoró en celular real e Instagram: reservaba demasiada memoria gráfica; quitado.
  Solución: en celular el reproductor NO usa la composición en vivo sino un MP4 ligero con pausas por tiempo.
  · `retos/reproductor.js`: con `data-video="../../assets/video/<id>"` usa `<id>.mp4` + `<id>.json` si el puntero es táctil,
    el lado corto de la pantalla mide ≤ 600 px o es navegador interno (Instagram, Facebook, TikTok…). Mismas preguntas y
    pistas de `storyboard.json`; se detiene en t0 y al acertar salta a t1. `?video=mp4` / `?video=vivo` lo fuerza.
    Si el MP4 no carga, cae a la composición. En PC sigue la composición en vivo.
  · `retos/video-ligero.mjs <id> <mp4 de origen> [MB]`: genera `assets/video/<id>.mp4` (720×1280, faststart, cuadro clave
    al final de cada pausa) y `<id>.json` (tiempos leídos de la composición). Hechos: esquiador 8.4 MB, catapulta 8.5 MB,
    desde los `-voz.mp4` de `C:UsersGatoVideoscodice-vivo`. Si cambia un video, hay que volver a correrlo.
  · `.gitignore`: excepción `!assets/video/*.mp4` (los demás MP4 siguen fuera del repo).
  · Se quedan de la ronda anterior: nieve del esquiador con transform y `horneaTexturas` (solo cuentan en PC).
  Memoria del sitio en celular: el paisaje de la portada suelta sus capas al salir de la vista (`.mundo.es-fuera`) y ya no
  usa translate3d/will-change en táctil; en la tienda three.js solo se pide al tocar («Toca para ver en 3D») y se libera
  (contexto WebGL incluido) al salir de la vista; con mouse se pide al entrar a la vista. En táctil, tarjetas sin 3D y
  barras sin desenfoque de fondo. Memoria gráfica medida (Chrome emulado 390 px, volcado memory-infra, mosaicos + texturas):
  esquiador 57+60 MB → 4+26 MB (+12 de video); tienda abajo 19+38 → 10+12; portada abajo 28+34 → 20+26; juego 4+6.
  Falta: confirmar en celular real y en Instagram/TikTok. Scripts de medición no guardados en el repo.
  Pausas del modo MP4 (16-nov-2026): el audio aparte de la pregunta lo bloqueaban los celulares y el video se detenía
  antes de la pregunta grabada. Ahora en t0 sale la tarjeta interactiva (tapa la que el video trae dibujada) y el video
  sigue hasta `tq` = fin de la pregunta grabada (+0.3 s, sin pisar el primer tic de la cuenta); al acertar salta a t1.
  `<id>.json` lleva `{ t0, tq, t1 }`; se regenera sin recodificar con `node retos/video-ligero.mjs <id> --mapa`.
  En vivo (PC) el audio se desbloquea con un sonido mudo dentro del toque de «Empezar». Probado: las 6 pausas en
  celular emulado (se detiene en tq ± 0.01 s, salta a t1, 0 audios pedidos aparte) y la pregunta sonando en PC.
- [x] Reto interactivo de la catapulta + motor de retos (16-nov-2026, sin commit). Especificación: `docs/diseno-retos.md`.
  Motor reutilizable `retos/motor/motor.js` + `motor.css` (niveles, azar con semilla, tolerancia, pistas en 3 escalones,
  estrellas, progreso en localStorage `cv-reto-<id>`, «menos movimiento»; pasos tipo numeros / opciones / tiros / accion).
  Reto `retos/catapulta/reto.js` (física y los 4 niveles), `escena.js` (dibujo copiado de la composición del video y
  parametrizado; el video no se tocó: un retoque al dibujo hay que traerlo a mano) y `estilos.css`.
  `retos/catapulta/index.html`: el juego es lo principal y el reproductor queda plegado en «Ver el video del reto».
  Prueba: `node retos/catapulta/prueba.mjs` (20 semillas por nivel + barrido; 0 fallas). Probado en Chrome sin ventana a
  390 px, 1200 px y con «menos movimiento». Sin probar en celular real.
  Decisiones: nivel 2 con altura en opción múltiple (3 distractores con su explicación) y muralla de altura entera a
  1-3 m de la altura real; nivel 4 con 5 tiros (3★ en 1-2, 2★ en 3-4, 1★ en el 5.º); niveles 2-4 abiertos con etiqueta
  «En el libro». Pendiente: `libros/fisica-unam/` todavía describe el reto como «una puerta a 40 metros».
- [x] Reto interactivo del esquiador (17-nov-2026, sin commit), con el motor de retos. `retos/esquiador/reto.js` (física
  y 4 niveles: v = √(2gh) con h ∈ {5, 20, 45, 80}; predice la altura en opción múltiple con 3 errores típicos —olvidar
  el 2, quitar el borde, sin raíz en t o en v— y la pista final «Truco de examen: x = 2√(h·b), no depende de g»; fricción
  19/36/51 % con control de altura y 3 intentos; reto final con escalón o desnivel de 2-4 m y a veces fricción, 5 intentos).
  En 2-4, h·c es cuadrado perfecto y x sale entera; h ≤ 60 m. `escena.js`: dibujo copiado de la composición del video
  (terreno, plataforma, rampa escalada con k = h/20, pinos, rocas, esquiador con sus 4 poses); sin texturas de ruido ni
  nieve que cae, para el celular. `index.html`: juego arriba y «Ver el video del reto» plegado (MP4 ligero en táctil).
  Prueba: `node retos/esquiador/prueba.mjs` (20 semillas por nivel + barrido de 2000; 0 fallas). Probado en Chrome sin
  ventana a 420 px y 1280 px: los 4 niveles completos, pistas, desnivel hacia abajo y choque con la orilla del escalón.
  Sin probar en celular real ni con «menos movimiento».
