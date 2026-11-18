# Láminas 2.0 — «Renacimiento»

## Idea
Las láminas actuales no se tiran: cada una conserva su contenido (`contenido/<materia>/<tema>.md` y su JSON)
y se regenera con **piezas compartidas** nuevas. Se construyen una vez y todas las láminas las ganan.
Problemas que resuelve: demasiados números a la vista, no da tiempo de predecir, poca práctica, poco gancho
para alumnos mayores.

## Piezas compartidas (plantilla/laminas2/)
1. **Predecir primero** (`prediccion.js`): antes de correr la simulación, el alumno marca su predicción
   (arrastra un marcador, elige una opción o escribe un valor). Al correr, la predicción queda como
   «fantasma» y se compara: «te faltaron / te pasaste X». Cada predicción se anota en el cuaderno.
2. **Control del tiempo** (`tiempo.js`): reproducir, pausa, cámara lenta (×0.25, ×0.5, ×1) y línea de tiempo
   arrastrable; rastro con marcas cada 0.5 s (o el paso que defina el tema).
3. **Cuaderno** (`cuaderno.js`): libreta de papel rayado con cinta (estilo de las notas del video de la
   catapulta) que se abre con un botón. Ahí viven los números:
   - Datos del problema (v₀, ángulo, g…).
   - Medidas que el alumno toma con las herramientas.
   - Fórmula y sustitución paso a paso, escritas a mano con animación.
   - Tu predicción vs resultado.
   - El truco de examen del tema.
   En escritorio es un panel lateral; en celular, una hoja que sube desde abajo. La escena queda limpia:
   solo los números indispensables, grandes y legibles (mínimo 14 px reales en celular).
4. **Herramientas** (`herramientas.js`): regla (distancias), cronómetro, transportador y medidor de
   velocidad (vectores vx/vy). El alumno las saca cuando las necesita; lo que mide se anota en el cuaderno.
5. **Modo situación real** (`escenas`): botón para cambiar la escena de laboratorio por una situación real
   con la misma física (definida por tema). Estilo de la situación: tinta tipo Stupy, como los retos.
6. **Práctica** (`practica.js`): 5-10 problemas por tema generados con el motor de retos (`retos/motor/`):
   números aleatorios, opción múltiple con errores típicos, pistas en 3 escalones. Al final de cada capítulo,
   **modo examen** cronometrado (10 reactivos mezclados).

## Reglas
- Mantener la metodología de 6 pasos; las piezas nuevas se integran en los pasos 3 (ejemplo), 4 (trampa),
  5 (truco) y 6 (ponte a prueba).
- Física solo en código, desde los datos del tema. Números de examen (g = 10; 37°/53°).
- Celular primero: sin capas enormes ni filtros pesados; probar en Chrome y dentro de Instagram.
- Pantalla completa y modo oscuro como en las láminas actuales.
- El generador de cada tema importa las piezas; no se copia código entre láminas.

## Piloto: Tiro parabólico 2.0
- Laboratorio: el riel actual. Situación real: cancha de fútbol (balón pateado sobre una barrera hacia la portería).
- Predicción: marcar dónde cae el balón y qué altura máxima alcanza.
- Tiempo: cámara lenta con rastro cada 0.5 s; con vectores vx (constante) y vy (cambia) visibles en pausa.
- Cuaderno: datos, descomposición v₀ → vx, vy (truco 37°/53°), tiempo de subida y de vuelo, alcance y altura
  máxima escritos paso a paso.
- Herramientas: regla, cronómetro, transportador, medidor de velocidad.
- Práctica: 8 problemas (descomponer, tiempo de vuelo, altura máxima, alcance, «¿pasa la barrera?»,
  ángulo de alcance máximo, ángulos complementarios con mismo alcance, problema inverso).
- Después del piloto: revisar con 3-5 alumnos reales antes de aplicar a las demás láminas.
