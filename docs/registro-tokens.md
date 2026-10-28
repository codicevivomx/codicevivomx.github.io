# Registro de tokens

Antes y después de cada tarea en Claude Code, corre `/usage` y anota los porcentajes.

| Fecha | Tarea | Modelo y esfuerzo | % sesión (antes→después) | % semana (antes→después) | ¿Salió bien? | Notas |
|---|---|---|---|---|---|---|
| 2026-10-24 | Línea base | Opus 5.5 Medium | 0% | 3% | Sí | Arranque: 42.8k tokens (CLAUDE.md 365, skills 3.2k) |
| 2026-10-24 | Fase 1: figura prensa (Anatomy) | Opus 5.5 Medium | 19% → ? | 5% | 2026-10-24 | Fase 1: figura prensa (Anatomy) | Opus 5.5 Medium | 19% → 28% | 5% → 6% | Sí | 5 iteraciones, 5m18s, 28.9k output, 95% caché, ~$2.25 equiv. API, auditoría de geometría no corrida |
Video HyperFrames — inicio: sesión 38 %, semana 7 % · final: sesión 46 %, semana 8 % · costo: 8 % sesión, 1 % semana · 1 ronda de ajustes · 558 líneas · ~33 min
Aprendizaje: guion cerrado + plan antes de código + 1 solo snapshot = mitad de costo que la figura.
Commit + chat claude.ai largo: sesión 46 → 60 %, semana 8 → 9 %.
Aprendizaje: hacer /clear también antes del commit y no alargar los chats de claude.ai.
| Fase 2 · interactivo prensa v1 | inicio: no registrado | fin: sesión 70 %, semana 10 % | 1 construcción, 0 rondas | pausado, diseño por decidir |
| 2026-10-24 | Fase 2: rediseño estilo códice (prensa) | Opus 5.5 Medium | 6% → 29% | 11% → 13% | Sí | 2 rondas, +673 −145 líneas, 63.5k output, 98% caché, ~$3.13 equiv. API, 10m48s API / 1h43m total. Incluye sistema de estilo (se hace una vez) |
- 25-oct-2026 · Tarea 1: flujo nuevo + docs/temas.md + CLAUDE.md (claude.ai, 1 chat): 8 % sesión (42 → 50 %).
| 25-oct-2026 | principio-de-arquimedes · figura SVG + interactivo 2D (v1) | claude.ai | 6 → 23 % | 17 % | 1 ronda la figura; incluye depuración de npx serve y celular |
| 25-oct-2026 | principio-de-arquimedes · experimento 2.5D (moderna y fusión) | claude.ai | 23 → 32 % | 9 % | 2 rondas; costo único de crear el estilo 2.5D; chat ya muy largo |
| 26-oct-2026 | prensa · lámina Hero completa (exp. 2 y 3) | Claude Code | — | ≈ 22 % sesión (aprox.) · ≈ 3-4 % semana | contador compartido con claude.ai; /anatomy = 28 % del uso |
2026-10-26 · vigilante fps premium-hero · Claude Code (Opus 5.5) · 2 rondas de verificación, 1 captura · sesión: ⟨antes⟩ → 38 %, semana: ⟨antes⟩ → 52 % · $1.41, 4 min de API (19 min en total), 114 líneas añadidas / 9 quitadas