# Pendientes fase 2 — Interactivo prensa hidráulica

## Hecho
- Interactivo v1 funcional (`plantilla/interactivos/prensa-hidraulica/` + `contenido/fisica/prensa-interactivo.json`).
- Cuentas verificadas (valores iniciales, caso extremo 1 cm / 20 cm: W₁ = W₂).
- Sistema de estilo códice en `plantilla/codice/` (decisiones en `docs/estilo-codice.md`).
- Ronda 1 (dentro del rediseño): flecha F₂ lineal con tope, ² en rúbrica, sin espacio
  vacío arriba del dibujo, `touch-action` solo en la columna del pistón chico, hover neutro.
- Ronda 2: placa del pistón chico siempre arriba del borde, numerales I.–V., marcas ✓/✗
  en SVG, ² más visible, subíndices con `<sub>`, recorrido < 1 cm sin "0 cm", etiqueta
  F₂ dentro de la lámina, trampa oculta con diámetros iguales, arrastre que se suelta bien.
- IM Fell itálica se queda (primera vista: 211.8 KB de 300).

## Pendiente
- Prueba en celular real (cuando esté en GitHub Pages).
- Opinión de 3–5 compañeros.

## Menores (vistos, sin corregir)
- La impresión (PDF carta) y el modo oscuro no se han revisado a ojo.
- Con d₂ = 20 cm, la etiqueta "x = 50 cm" queda casi pegada a la pared izquierda del
  cilindro grande; revisar en el celular.
- `aria-live` en las lecturas: al arrastrar, un lector de pantalla anunciaría cada cambio.
  Conviene anunciar solo al soltar.
- El texto `instruccion` del JSON solo se usa como `title` (tooltip) de la zona de arrastre;
  en celular no se ve (el pie de lámina ya lo dice).
- El arrastre ahora se siente un poco más sensible (1.6 unidades del dibujo por cm, antes 2).
- El ² también sale en rúbrica en la retroalimentación ("4² = 16").
- `docs/registro-tokens.md` tiene cambios previos sin commit (no entran en este commit).
