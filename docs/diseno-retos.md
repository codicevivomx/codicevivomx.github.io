# Diseño de retos interactivos — Códice Vivo

## Idea
- **TikTok** (gratis, marketing): video en cadena; termina con «¿Puedes lograrlo? Inténtalo en Códice Vivo».
- **Reto en el sitio** (producto): juego interactivo con niveles. No es el video con pausas.
- **Números aleatorios** en cada intento: las respuestas de los comentarios no sirven en el sitio.
- **Predice antes de ver**: el alumno responde primero y luego lo comprueba (error de predicción = se graba más).
- Nivel 1 gratis como muestra; niveles 2-4 dentro del libro (por ahora, abiertos: prototipo).
- Un reto por capítulo (6): catapulta y esquiador (mecánica), fluidos, calor, ondas/óptica, electricidad.

## Motor de retos (reutilizable)
- `retos/motor/`: niveles, generador de números, validación con tolerancia, pistas en 3 escalones
  (pista suave → fórmula → paso resuelto), estrellas por nivel, progreso guardado (localStorage con try/catch).
- Cada reto = un archivo de configuración (`retos/<id>/reto.js`) con escena, niveles y física.
- Toda la física se **calcula en código** desde los datos generados; nada escrito a mano.
- Estilo visual del reto: el del video (tinta tipo Stupy) para la escena; interfaz con sitio.css.
- Celular primero: controles grandes (sliders, botones), una mano, sin teclado salvo para números.
- Accesible: botones reales, etiquetas, prefers-reduced-motion (animación corta o sin animar).

## Reto 1: Catapulta (tiro parabólico)
Física: g = 10 m/s², sin aire. Ángulos de examen: 37° (sen 0.6, cos 0.8) y 53° (sen 0.8, cos 0.6); 45° solo en nivel 3-4.
Velocidades v ∈ {10, 15, 20, 25, 30} m/s → vx y vy enteros con 37°/53°.

### Nivel 1 · Descompón (gratis)
- Se dan v y ángulo (37° o 53°). El alumno escribe vx y vy.
- Error → pista: el triángulo de velocidades se dibuja sobre la catapulta con los lados por colorear.
- Acierto → la piedra sale con las dos flechas animadas.

### Nivel 2 · Predice antes de lanzar
- Muralla a x = vx·t con t ∈ {0.5, 1, 1.5} s, siempre menor que el tiempo de vuelo (2·vy/g) y con la piedra
  todavía arriba del suelo; altura de muralla = altura real de la piedra ± (1 a 3 m), nunca negativa.
- Pregunta: «¿Pasa la muralla?» (Sí / No) y luego «¿a qué altura va la piedra al llegar?».
- Después lanza: cámara lenta al pasar o chocar con la muralla; cota con la altura real.

### Nivel 3 · Apunta
- Puerta a distancia D (25-90 m). Controles: ángulo (15°-75°, de 1 en 1) y contrapeso (v: 10-30, de 1 en 1).
- D se genera a partir de una combinación entera (ángulo, v) que sí cae a ±1 m, para que siempre haya solución.
- 3 tiros. Cada fallo muestra la trayectoria punteada y «te faltaron / te pasaste X m».
- Acierto si cae a ±1 m de la puerta. Estrellas: 3 en el 1er tiro, 2 en el 2º, 1 en el 3º.
- Pista final: «el alcance máximo es a 45°: R = v²/g».

### Nivel 4 · Reto final
- Variantes aleatorias: castillo sobre una colina (blanco a altura h), o muralla alta cerca que obliga a ángulo alto.
- El alumno elige ángulo y v; se valida resolviendo la trayectoria real (que pase la muralla y llegue al blanco).
- Al terminar: resumen «lo que usaste» (descomponer v, usar el tiempo, alcance máximo) + enlace a la lámina de tiro parabólico.

## Reto 2 (después): Esquiador
- Nivel 1: velocidad al final de la rampa (energía). Nivel 2: elegir altura de rampa para caer dentro de la zona.
- Nivel 3: con fricción, corregir la altura. Nivel 4: zona en desnivel.
