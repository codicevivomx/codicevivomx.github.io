# Estilo premium · Códice Vivo

Guía para cualquier lámina premium: una figura interactiva que explica un objeto técnico real
pieza por pieza. Sale de lo aprendido en la maqueta del motor con empuje vectorial y en el gato
hidráulico de la prensa (premium-hero). Las reglas marcadas **«nuevo»** todavía no se probaron
completas: la primera lámina que las use debe confirmarlas o corregirlas aquí.

Premium es el nivel más alto (ver codice-vivo.md, «Niveles de lámina»): 2.5D fusión es el
estándar, 3D es especial y premium es para ocasiones muy especiales. Se hace en Claude Code con
la skill anatomy.

## 1. Enfoque

**El objeto está al centro y es la explicación.** La lámina no es una ilustración con texto al
lado. Es el objeto (una prensa, un motor, una bomba) dibujado con suficiente detalle para que
cada pieza se reconozca. Cada cosa que se mueve cuenta algo.

Una lámina premium explica más que una 2.5D normal:

- **Rótulos**: cada conjunto tiene nombre, número (01, 02…) y una ficha corta que dice qué hace,
  de qué está hecho y por qué tiene esa forma.
- **Textos**: un pie de figura que explica la idea en un párrafo, con los números reales del
  modelo, y una pista corta en la esquina («Toca para bombear»).
- **Qué enseña cada parte**: si una pieza no enseña nada, se simplifica. Si enseña algo, se puede
  seleccionar, resaltar y leer.

### Conexión con el tema (lo que la hace de Códice Vivo)
- La lámina pertenece a un tema y enseña lo que el examen pregunta. La lectura en vivo usa los
  mismos números del contenido (ej. la prensa: 50 N → 1 250 N, sube 2 cm).
- Si el tema tiene una trampa (paso 4), la lámina la hace visible (ej. el pistón grande sube
  25 veces menos: más fuerza no es más recorrido).
- Lo extra (válvulas, depósito, detalles reales) va después de lo que pide el examen, no en
  lugar de eso.

### Los números viven en el contenido
- Todo número en pantalla se calcula a partir de `contenido/<materia>/<tema>-interactivo.json`
  o de una fórmula escrita en el generador. Ningún número se escribe a mano en el texto.
- Si la lámina necesita un dato nuevo (un rango, un límite), se agrega como campo nuevo al JSON
  sin cambiar los existentes (ej. `rangos.F1` en la prensa).
- Las suposiciones van en el pie («válvula de alivio a 3.4 bar»).

### Nivel de detalle mínimo
- Al menos **80 piezas** con nombre propio en una lámina grande; una chica puede tener 40-80.
- Al menos **una vista hacia adentro**: corte, despiece o las dos. Con una sola vista exterior
  todavía no es premium. En el motor fue lo primero que hubo que pedir a mano.
- Detalles que solo tiene este objeto: tornillería, bridas, soldaduras, rótulos grabados,
  unidades reales. Nada genérico.
- Si el objeto funciona (bombea, arranca, fluye), su funcionamiento también se anima por fases.
  Que se encienda y se apague no basta (ver §3).

## 2. Estilo

### Página: siempre estilo fusión
Fondo, letra, botones y paneles usan los tokens de la fusión (referencia:
plantilla/interactivos/principio-de-arquimedes/v2/, mientras no estén en piezas compartidas).
Claro u oscuro según el sistema (`prefers-color-scheme`).

### Objeto: dos paletas, Papel y Metal
Un selector **Papel / Metal** junto a Corte / 3D cambia solo los materiales del objeto. Abre en
Papel. Abrir o cerrar el 3D no cambia la paleta.

| Paleta | Materiales | Claro | Oscuro |
|---|---|---|---|
| Papel | tonos de la fusión: papel, tinta café, verde agua, rúbrica, dorado | sobre `--bg #F6F1E6` | sobre `--bg #17120D` |
| Metal | gris de máquina + cobre | gris `#444A51`, cobre `#B3633E` | gris `#1D2125`, cobre `#3D1F13` (revisar: puede verse lodoso) |

Reglas:
- Los fluidos usan `--agua-*` (aceite, agua). La fuerza o acción principal usa `--rubrica`.
- **El efecto se diseña dos veces.** En oscuro, una luz o un brillo se **suma** (mezcla `screen`).
  En claro se **resta** como tinta: color saturado, núcleo pálido. Un brillo aditivo sobre papel
  desaparece o mancha.
- El resaltado de selección reasigna tokens; no pinta encima. Lo no seleccionado se apaga un tono.
- Ningún color literal fuera de los tokens.

### Letra
- **EB Garamond** en títulos y en el número grande en vivo (ej. F₂).
- **Sans del sistema** en fichas y pies de figura, a 13-15 px, interlineado 1.5, ~65 caracteres
  por línea.
- **Monoespaciada** (`ui-monospace, Consolas`) solo para lecturas pequeñas y telemetría
  (la esquina de la lámina). Cifras en `tabular-nums` para que no bailen.
- Las unidades van con el número y un espacio: «1 250 N», «1.6 bar», «±6°».

### Panel de lectura en vivo
1. **Esquina de la lámina** (`[data-readout]`): el estado en una línea
   (ej. «x = 8 cm · sube 0.32 cm · 1.6 bar»). En teléfono puede partirse en dos líneas y la
   pista de la otra esquina se oculta por debajo de 560 px.
2. **Panel** (al lado en escritorio, abajo en celular): el resultado principal grande (F₂), su
   fórmula (F₂ = F₁ × 25) y el control secundario (deslizador de F₁).
3. **Consola** (opcional), cuando el objeto tiene un proceso con fases: pasos con lámpara
   (hecho / ahora / pendiente) y telemetría.

Accesibilidad: la lectura se repite en `aria-valuetext`. Los anuncios van en un
`aria-live="polite"` con atributo propio (`data-say`). **No usar `data-live` ni `data-name`**:
el kit los usa (en el motor borró el contenido).

### Botones
- Píldoras de la fusión (`border-radius: 999px`), borde suave; el principal relleno en verde agua
  o rúbrica, los demás con borde.
- **La etiqueta dice lo que hará el botón ahora**: Bombear → Soltar; Despiezar ↔ Montar.
- Puede llevar una lámpara de estado (apagada / encendida / parpadeando mientras es transitorio).
- Los botones de conjunto llevan número: 01, 02…
- Todo botón tiene un `:focus-visible` que se ve. Área táctil mínima de 44 px.

## 3. Interacción

### Control principal
- **Una acción principal por lámina**, la que muestra para qué sirve el objeto (bombear, encender,
  abrir la válvula). Va primero en la fila de controles.
- Esa acción **corre el proceso real por fases**, no un interruptor (ej. el motor: purga →
  enfriamiento → ignición → régimen → corte; el gato: bombeo → válvulas → subida → alivio).
- Cada fase tiene una señal visible (color, partícula o luz).
- Un **parámetro regulable** cambia el efecto y las lecturas (potencia, F₁, caudal).
- El estado persiste: el aceite no regresa solo, el metal se enfría despacio. Nada se resetea de
  golpe. Hay un botón para volver al inicio.
- El **sonido** es opcional, empieza apagado y se genera con WebAudio, sin archivos.

### Puntero, dedo y teclado
- El puntero o el dedo **dirige el objeto** cuando eso enseña algo (arrastrar la palanca para
  fijar F₁).
- Todo lo que hace el puntero también se hace con teclado: flechas, la letra de la acción
  principal, D para despiezar, 1-9 para conjuntos, + y − para el parámetro, Esc para volver.
- **Recorrido automático**: si nadie toca, la lámina se muestra sola. Se detiene al primer contacto
  y **retoma a los 6 s desde el estado en que quedó**. Con `prefers-reduced-motion` no hay
  recorrido, ni vibración, ni partículas, y la lámina sigue siendo útil quieta.

### Corte / 3D
- Un conmutador **Corte / 3D** junto a la acción principal. Las dos vistas comparten conjuntos,
  rótulos y ficha seleccionada.
- El corte se dibuja a mano con el kit (caras cortadas, interior a la vista). No sirve recortar el
  3D con una máscara.
- El modo 3D del kit solo dibuja piezas convexas: en 3D el objeto se ve por fuera. Si el 3D no
  enseña nada que el corte no enseñe, puede omitirse.
- El 3D se descarga aparte, solo al tocar el botón.

### Zoom y arrastre **(nuevo)**
- **Rueda** con Ctrl/⌘ en escritorio o **pellizco** en pantalla táctil para acercar, hacia el punto
  bajo el puntero o el centro del pellizco. Necesario en PC: el zoom del navegador encoge la
  lámina en vez de acercarla.
- **Arrastre** para desplazar, solo con el zoom activo. Con zoom 1 el arrastre dirige el objeto.
- La rueda sin modificador y el arrastre de un dedo sin zoom **no se capturan**: en el teléfono la
  página tiene que poder desplazarse. `touch-action: none` solo en la zona que se arrastra.
- Límites de 1× a 4×. Doble toque o Esc vuelve a 1×. El zoom escala el escenario entero (SVG y
  canvas) con una sola transformación, sin redibujar.

## 4. Rendimiento

### Peso
- **Primera vista ligera: ≤ 300 KB al abrir** (figura fija SVG, textos y controles). Así cumple el
  presupuesto de Códice Vivo aunque la maqueta completa pese más.
- **La parte pesada se carga al pedirla** (3D, WebGL grande, maqueta completa), con el peso a la
  vista en el botón («Abrir maqueta completa · 1.9 MB») para que el usuario decida si la baja con
  datos o con Wi-Fi.
- **Peso completo hasta 2.5 MB** como regla. Más que eso solo como excepción justificada en
  docs/temas.md (qué necesita el tema que no se puede simplificar, ej. un cohete completo).
- El peso no es razón para descartar una lámina valiosa; sí lo es que no corra en un teléfono.

### Fluidez y ancho
| Medida | Mínimo |
|---|---|
| Fluidez | ≥ 30 fps en teléfono de gama media; ≥ 55 fps en escritorio |
| Ancho | funciona a **390 px** sin desplazamiento horizontal |
| Sin WebGL | hay respaldo SVG del efecto principal y la lámina sigue siendo útil |

### Vigilante
Mide el tiempo medio de fotograma en el propio equipo. Si pasa de 33 ms (menos de 30 fps) durante
2 s seguidos, degrada en este orden: baja la resolución del canvas (1.5 → 1), reduce partículas y
pasos del efecto y, por último, apaga el WebGL y deja el SVG. Nunca vuelve a subir de calidad
sola durante la misma visita.

Además:
- El bucle se detiene cuando no hay nada en movimiento y cuando la lámina sale de pantalla
  (`IntersectionObserver`).
- Las capas costosas solo se redibujan cuando algo cambia.
- Variables CSS que cambian en el tiempo se escriben solo si cambian más de un umbral (0.004).
- Las partículas tienen tope (~24) y se recicla la más vieja.

### Pruebas
- Captura a 390 × 900 en claro y en oscuro, y en Papel y en Metal.
- Verificar que `scrollWidth === innerWidth`.
- Medición de fps con Chrome sin ventana, 390 px y CPU 4× (en la carpeta temporal, no en el repo).
  Ojo: la CPU lenta no simula la tarjeta gráfica; por eso existe el vigilante.
- El navegador de pruebas no tiene GPU, así que cada lámina expone ganchos (`window.__xx`):
  `set(...)` fija un estado, `warp(s)` avanza sin dibujar, `fire()` hace la acción principal,
  `tour(t)` salta en el recorrido. Antes de capturar se anula `requestAnimationFrame`.
- Gato la prueba en su **celular real** (npx serve, misma red, incógnito) antes de darla por
  terminada.

## 5. Lista de revisión antes de entregar

**Contenido**
- [ ] Tiene una vista hacia adentro y cada conjunto tiene número, nombre y ficha.
- [ ] Enseña lo que pide el tema y hace visible su trampa.
- [ ] Todo número sale del JSON del tema o de una fórmula; las suposiciones están en el pie.
- [ ] El pie explica la idea y dice qué hace cada control y cada tecla.

**Acción principal**
- [ ] Recorre fases reales, con señal visible en cada una.
- [ ] Tiene un parámetro regulable que cambia el efecto y las lecturas.
- [ ] El estado persiste y hay botón para volver al inicio.
- [ ] El sonido (si hay) empieza apagado y no da errores sin `AudioContext`.

**Estilo**
- [ ] Página en fusión; objeto con Papel / Metal, revisado en claro y en oscuro.
- [ ] Los efectos están diseñados para cada modo (tinta en claro, luz en oscuro).
- [ ] Ningún color literal fuera de los tokens.
- [ ] Las etiquetas de los botones cambian con el estado.

**Interacción**
- [ ] Funciona con puntero, teclado y dedo, y tiene zoom con arrastre.
- [ ] La página se desplaza en el teléfono sin quedar atrapada en la lámina.
- [ ] El recorrido se detiene al tocar y retoma desde el estado actual.
- [ ] Con `prefers-reduced-motion` es estática y sigue siendo útil.

**Técnica**
- [ ] La auditoría del kit está en verde o los avisos están explicados en docs/temas.md.
- [ ] El respaldo sin WebGL funciona y el vigilante está activo.
- [ ] Primera vista ≤ 300 KB; peso completo dentro de la regla (o excepción justificada).
- [ ] 390 px sin desplazamiento horizontal y fps mínimos cumplidos.
- [ ] No hay errores en consola ni atributos que choquen con el kit.

**Entrega**
- [ ] Generador en `plantilla/figuras/<tema>-<nombre>.mjs`; página regenerada en
      `plantilla/interactivos/<tema>/premium/` (o `premium-<nombre>/`). No editar el HTML a mano.
- [ ] Datos nuevos agregados al JSON del tema sin cambiar los existentes.
- [ ] Claude Code avisa al terminar cada punto para que Gato haga el commit.
- [ ] Claude Code dice qué anotar en docs/temas.md y docs/registro-tokens.md; Gato lo anota.
- [ ] El push, PR y merge los hace Gato a mano. La publicación es por GitHub Pages; un artefacto
      de claude.ai solo sirve como vista previa.

## 6. Cuándo usar premium

**Sí**, cuando:
- Es un tema estrella o una portada de paquete, y el funcionamiento del objeto es lo que hay que
  entender.
- El objeto tiene un interior que vale la pena abrir y un proceso que vale la pena correr.
- La lámina se va a reutilizar o presentar: portada, TikTok, exposición, piloto escolar.

**No**, cuando:
- Basta una lámina 2.5D con rótulos: una idea, sin interior ni proceso.
- El objeto es secundario en el tema.
- Hay fecha de entrega cercana: una premium grande no se termina en una tarde.

### Costo de referencia
| Lámina | Tamaño | Costo |
|---|---|---|
| Prensa (premium/) | chica, sin 3D | ~5 % de sesión, 5 min |
| Gato hidráulico (premium-hero/) | Hero: corte + 3D + WebGL + panel | ≈ 22 % de sesión (aprox.), ≈ 3-4 % de semana, ~1.5 h en 2 sesiones |
| Motor con empuje vectorial | grande (Epic) | > 1 sesión, ~15 % de la semana, ~3 h con cambios |

Una premium grande se planea como el trabajo de un día: como máximo una cada semana o dos. Se
trabaja por puntos con plan de 5 líneas, máximo 2 rondas por punto y commit al terminar cada uno.
Probar /anatomy con un modelo más barato (Sonnet): en el gato la skill fue el 28 % del uso.
Pedir desde el inicio todo lo de esta guía evita las rondas de «faltan detalles».}
