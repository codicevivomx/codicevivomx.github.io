# Códice Vivo

Material de estudio interactivo para exámenes de admisión en México (EXANI-II, UNAM, IPN).
Prototipo en GitHub Pages (repo público) → después se migra a Shopify.

## Cómo trabajar
- Responde en español. Textos visibles al usuario en español de México.
- Respuestas concisas. Antes de cambios grandes: plan breve y espera confirmación.
- Lee solo los archivos que la tarea necesita. Los de `docs/` solo cuando se pidan.

## Estructura
- `contenido/` — datos de cada infografía (única fuente de verdad)
- `plantilla/` — HTML/CSS/JS que muestra el contenido
- `videos/` — videos para TikTok (HyperFrames)
- `docs/metodologia.md` — estructura obligatoria de cada infografía
- `docs/plan.md` — plan y estado del proyecto
- `docs/registro-tokens.md` — registro de consumo

## Reglas
- Primero celular; páginas ligeras. 3D solo al tocar, con imagen fija de respaldo (también para el PDF).
- Imágenes como archivos aparte, nunca en base64 dentro del HTML.
- Repo público: solo muestras, nunca paquetes completos.
- Nunca subir llaves, tokens ni contraseñas (`.env` está en `.gitignore`).

## Interactivos y figuras llegan de claude.ai

- Las figuras SVG, los interactivos 2D y los modelos 3D se diseñan en claude.ai y llegan al repo
  por ZIP (Gato los descomprime, prueba y hace commit).
- Tu trabajo es **integrar, no rediseñar**: scripts reutilizables (PDF, video), conectar rutas,
  arreglos puntuales. No cambies diseño, textos, ids del SVG ni `plantilla/codice/codice.css`
  sin preguntar.
- Al empezar, lee `docs/temas.md` (tablero y "Pendiente para Claude Code"). Lee solo los
  archivos necesarios para la tarea.
- Da el plan en máximo 5 líneas y espera OK antes de escribir código.
- Al terminar, marca la tarea en `docs/temas.md`. No hagas git push, PR ni merge (lo hace Gato).

### Convenciones de carpetas (modelo: prensa-hidraulica)
| Pieza | Ruta |
|---|---|
| Contenido | `contenido/<materia>/<tema>.md` |
| Datos del interactivo | `contenido/<materia>/<tema>-interactivo.json` |
| Figura SVG | `contenido/<materia>/img/<tema>.svg` |
| Interactivo 2D | `plantilla/interactivos/<tema>/` (index.html, estilos.css, <tema>.js) |
| 3D (opcional) | `plantilla/interactivos/<tema>/3d/` |
| Estilo | `plantilla/codice/codice.css`, `plantilla/codice/fuentes/`, `docs/estilo-codice.md` |
| Video | `plantilla/videos/<tema>/` (`construir-figura.mjs` copia el SVG a `assets/`) |
| MP4 | `contenido/<materia>/video/` (fuera del repo, `*.mp4` en .gitignore) |
| Figura Anatomy | `plantilla/figuras/<tema>.mjs` (solo temas estrella) |
| Registro de tokens | `docs/registro-tokens.md` |

Excepción: la prensa usa `contenido/fisica/prensa-interactivo.json`.

