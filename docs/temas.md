Leyenda: ✓ hecho · … en curso · — no aplica · (vacío) pendiente

| Tema | Materia | Contenido | Figura | Interactivo | 3D | Video | PDF |
|---|---|---|---|---|---|---|---|
| prensa-hidraulica | física | ✓ | ✓ (2.5D+ Anatomy, plus/) | ✓ | premium-hero (WebGL) | ✓ (28 s) | |
| principio-de-arquimedes | física | ✓ | ✓ (SVG) | ✓ (v1 2D · v2 2.5D) | — | | |
| tiro-parabolico | física | ✓ | | ✓ (2.5D+, plus/) | — | | |

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
  CSS de página, lógica común) y que prensa y tiro-parabolico las importen. Arquímedes se rehace en 2.5D+ después.