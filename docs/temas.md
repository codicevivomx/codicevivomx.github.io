# Tablero de temas — Códice Vivo

Leyenda: ✓ hecho · … en curso · — no aplica · (vacío) pendiente

| Tema | Materia | Contenido | Figura | Interactivo | 3D | Video | PDF |
|---|---|---|---|---|---|---|---|
| prensa-hidraulica | física | ✓ | ✓ (Anatomy) | ✓ | — | ✓ (28 s) | |
| principio-de-arquimedes | física | ✓ | ✓ (SVG) | ✓ (v1 2D · v2 2.5D) | — | | |

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
  en perfil celular; pendiente: auditoría 3D completa y 8 avisos de continuidad en la base 3D).
- **principio-de-arquimedes**: v1 (2D códice) en `plantilla/interactivos/principio-de-arquimedes/`;
  v2 (2.5D fusión códice + moderno) en `.../principio-de-arquimedes/v2/`. Encuesta IG (11 votos):
  fusión 6, 2D 4, moderna 1. La v2 trae el contenido dentro del index.html (aún no lee el JSON).

## Pendiente para Claude Code
- [ ] Script de PDF carta reutilizable: lee `<tema>.md` + `img/<tema>.svg`; Gato lo corre por tema.
- [ ] Plantilla de video reutilizable a partir de `plantilla/videos/prensa-hidraulica/`; Gato renderiza por tema.
- [ ] Menor: renombrar `prensa-interactivo.json` → `prensa-hidraulica-interactivo.json` y actualizar sus referencias.
- [ ] Pasar el estilo 2.5D fusión (v2 de Arquímedes) a piezas compartidas: paleta y tarjetas en
  `plantilla/codice/`, componentes SVG reutilizables (vaso, dinamómetro, flechas, agua animada)
  y que la v2 lea `<tema>-interactivo.json`. Medir el costo del siguiente tema con esas piezas.