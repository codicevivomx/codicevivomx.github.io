# Estilo códice — sistema de diseño

Sistema de diseño único para todo Códice Vivo. Se hace una sola vez en `plantilla/codice/`;
las infografías solo usan sus clases y no se rediseña por tema.

## Archivos
- `plantilla/codice/codice.css` — variables, fuentes y clases compartidas.
- `plantilla/codice/fuentes/` — woff2 autoalojados + licencias OFL.
- Cada interactivo tiene su `estilos.css` solo para acomodo (grid, posiciones).

## Paleta
| Variable | Claro | Oscuro (`prefers-color-scheme: dark`) |
|---|---|---|
| `--papel` | #EFE3C8 | #1F1811 |
| `--pagina` | #F5EBD4 | #2A2118 |
| `--tinta` | #3A2716 | #EADBB9 |
| `--tinta-suave` | #7A6248 | #B59E7C |
| `--rubrica` (acento) | #9B2C1F | #E07A5F |
| `--dorado` | #A8823A | #D9B26A |
| `--agua` | #3E6B6E | #7FB3B0 |
| `--neutro` | #8C7858 | #CDB88D |
| `--mesa` (fondo) | #2A1D13 | #110C07 |
| `--filete` | rgba(58,39,22,.28) | rgba(234,219,185,.22) |
| `--sombra` | rgba(58,39,22,.22) | rgba(0,0,0,.4) |

- Rúbrica: pasos, numerales y énfasis. **No** sirve para marcar correcto/incorrecto.
- Correcto/incorrecto: marca SVG dibujada (✓ en agua, ✗ en rúbrica) + texto + tipo de borde
  (continuo / punteado). Nunca solo color.
- Los SVG de las láminas toman los colores de las variables CSS (clases `g-*`), así
  también cambian en modo oscuro.

## Tipografía
- **IM Fell English** (normal e itálica): solo títulos, "Paso N.", numerales romanos
  y pies de lámina.
- **EB Garamond** (400, 500 e itálica): texto, botones y todos los números.
- Máximo 2 familias, subconjunto "latin" de Google Fonts, autoalojadas, `font-display: swap`.
- Resultados y fórmulas: `font-variant-numeric: lining-nums tabular-nums`.
- Subíndices y exponentes con `<sub>`/`<sup>` (el subconjunto latin no trae ₁ ₂).
  En el contenido se escriben `F<sub>1</sub>`; en SVG se convierten a `<tspan dy>`.

## Numeración
- "Paso N." se reserva para los 6 pasos de la metodología.
- Los cálculos dentro de una infografía se numeran I., II., III., IV., V. en rúbrica.
- Las láminas se numeran en romano: "Lámina I. Título. Instrucción."

## Clases
`.pagina`, `.encabezado`, `.titulo-seccion`, `.paso`, `.numeral`, `.enfasis`, `.suave`,
`.lamina` (doble marco) + `.lamina-marco` + `.pie-lamina` (cursiva), `.deslizador`,
`.boton` (+ `.correcta` / `.incorrecta` / `.marca`), `.marca-svg` (+ `.m-bien` / `.m-mal`),
`.filete`, `.numeros`, `.solo-pantalla`. Trazos SVG: `.g-tinta`, `.g-solido`,
`.g-fluido`, `.g-rayado-agua`, `.g-rayado-tinta`, `.g-enfasis`, `.g-hueco`, `.g-rotulo`.

## Reglas para celular
- Primero celular. Una columna en celular; en escritorio, texto y controles a la izquierda
  y la lámina a la derecha (fija al bajar).
- Cuero y guardas marmoleadas solo en portada/índice. Páginas de contenido: papel,
  encabezado y láminas.
- Texturas en CSS/SVG o mosaicos WebP pequeños; nunca fotos ni base64.
- Evitar sombras grandes, `filter` y `backdrop-filter`. Modo simple con pantallas chicas
  (≤ 480 px) y con `prefers-reduced-motion`.
- Presupuesto: menos de 300 KB al abrir la primera página (prensa: 211.8 KB).
- Hover igual en todas las opciones: nunca delata la respuesta.
- `touch-action: none` solo en la zona que se arrastra; `pan-y` en el resto de la lámina.

## Impresión (PDF carta)
- Sin cuero, mármol, mesa ni sombras; fondo blanco, tinta negra.
- Marcos dobles con `border: double` (sí se imprimen); controles ocultos (`.solo-pantalla`).

## Láminas
- Estilo grabado: líneas de tinta, fluido en color agua con rayado, rayado diagonal en
  sólidos, sin sombras pesadas; dentro del doble marco y con pie de lámina.
- Flechas de fuerza en escala lineal común; si una llega al tope se dibuja una rotura
  (ya no está a escala).
- Placas, flechas y etiquetas nunca cruzan paredes ni otros textos, en todo el rango
  de los controles.

## 3D
Opcional: solo donde enseña algo que una figura plana no puede. Se carga al tocar
"Abrir en 3D" y tiene imagen fija de respaldo (también para el PDF). No aplica a la prensa.

## Arquitectura futura
Biblioteca → libros → capítulos. Cada capítulo será una página generada por script desde
`contenido/` + plantilla, con CSS y fuentes compartidos. (Aún no construido.)
