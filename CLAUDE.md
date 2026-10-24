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
