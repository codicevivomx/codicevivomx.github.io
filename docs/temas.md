# Tablero de temas — Códice Vivo

Leyenda: ✓ hecho · … en curso · — no aplica · (vacío) pendiente

| Tema | Materia | Contenido | Figura | Interactivo | 3D | Video | PDF |
|---|---|---|---|---|---|---|---|
| prensa-hidraulica | física | ✓ | ✓ (Anatomy) | ✓ | — | ✓ (28 s) | |

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

## Pendiente para Claude Code
- [ ] Script de PDF carta reutilizable: lee `<tema>.md` + `img/<tema>.svg`; Gato lo corre por tema.
- [ ] Plantilla de video reutilizable a partir de `plantilla/videos/prensa-hidraulica/`; Gato renderiza por tema.
- [ ] Menor: renombrar `prensa-interactivo.json` → `prensa-hidraulica-interactivo.json` y actualizar sus referencias.
