# Diseño del sitio: «Renacimiento»

Rama: `sitio/menu-venta`. Estilo en `assets/css/sitio.css`, sin frameworks.

## Estilo «vidrio líquido» (inspirado en Liquid Glass de Apple)

- **Vidrio claro**:
  - `backdrop-filter: blur(8px) saturate(1.9) brightness(1.08)`.
  - Fondo blanco translúcido con un degradado sutil de 0.5 a 0.22.
  - Borde de 1px blanco a 0.6.
  - Brillo interior arriba (`inset 0 1.5px 0` blanco a 0.9) y sombra suave.
  - Los paneles con texto van más opacos (~0.7).
- **Pastilla activa**: una gota de vidrio blanco a 0.72 con texto `#2B1F1A`.
- **Botón de compra**: vidrio dorado (`#E8C470` → `#C4963A`) con texto café.
- **Sin refracción con filtros SVG**: fallan en iPhone y en Instagram.
- **Respaldo**: si no hay `backdrop-filter`, o si es el navegador de Instagram o TikTok, el fondo es semitransparente sólido.
- **«Menos movimiento»** quita las animaciones.
- **Se conserva todo lo demás**: el paisaje pixel, el castillo, Griseldo y Chikis, los colores, EB Garamond y Roboto, y el logo.

## Menú

### Celular
- **Isla flotante abajo** con Inicio, Pruébalo, Biblioteca y Retos:
  - la sección activa muestra ícono y nombre;
  - las demás muestran solo el ícono, con `aria-label`.
- **Preventa**: botón circular dorado, aparte de la isla.
- **Al bajar**, la isla se encoge a la pastilla activa más el botón; **al subir**, se expande.
- **La gota** se desliza entre secciones.
- Respeta la zona segura del iPhone (`env(safe-area-inset-bottom)`).

### PC
- **Barra flotante arriba**: logo, Inicio, Pruébalo, Biblioteca ▾, Retos, Lo que viene y el botón dorado «Avísame cuando salga».
- **Biblioteca ▾** abre un panel de vidrio con temas y retos reales:
  - Newton, tiro parabólico, prensa, esquiador, catapulta y Para saber más;
  - al final, «Ver los 15 temas →».

### Scroll-spy
La sección visible se marca en el menú.

## Portada
Va en este orden; cada sección lleva un `id` para el menú.

1. **Inicio** (`#inicio`): «Aprende a resolver el examen, no solo fórmulas», con los botones «Pruébalo gratis» y «Avísame cuando salga», sobre el paisaje.
2. **Pruébalo** (`#pruebalo`): `tiro-parabolico/v2` incrustado, sin registro. No carga hasta que el usuario se acerca, para no frenar la portada.
3. **Cómo enseñamos** (`#metodo`): la sección existente.
4. **Qué incluye** (`#incluye`): el paquete Física UNAM, con láminas, retos, práctica, modo examen y PDF.
5. **Retos** (`#retos`).
6. **Preguntas frecuentes** (`#preguntas`).
7. **Preventa** (`#preventa`): «Lo que viene» y el botón final.

### Qué pasa con las secciones actuales
- **«Tres láminas para empezar»** se queda: va dentro de Pruébalo, debajo de la demo, con el título «Más láminas gratis».
- **«Qué es»** se reparte entre Inicio y Cómo enseñamos.
- **«En línea / En papel»** pasa a Qué incluye.
- **El reto del esquiador** es la base de Retos.
- **«Lo que viene» y el cierre** forman Preventa.
- **No se borran archivos.**

## Reglas
- Sin testimonios, cifras ni contadores inventados.
- El botón de preventa usa `ENLACES` y por ahora dice «Avísame cuando salga».
- Celular primero. Se prueba a 390 px, en escritorio y con «menos movimiento».
- Un commit por parte. Al final se entrega el link del PR.
