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
