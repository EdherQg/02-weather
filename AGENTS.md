# AGENTS.md

## Entorno / Herramientas
- Runtime: Bun (ver `package.json`, `@types/bun`). Punto de entrada: `src/index.ts` (módulo).
- TypeScript: configuración estricta en `tsconfig.json` (ESNext, resolución de módulos bundler, `noEmit`, `noUncheckedIndexedAccess`, `strict`).
- Comprobación de tipos: `bun check` (script en `package.json`).
- Pruebas: `bun run test` (o `bun test`). Cobertura: `bun run test:coverage`. `bun run build` comprueba tipos y pruebas antes de compilar; si fallan, no ejecuta el compilador.

## Arquitectura (verificado)
- Aplicación CLI de clima (README en español): ciudad por defecto, clima de todas las ciudades, añadir/eliminar/establecer por defecto, ajustes y pronóstico de 7 días desde mañana.
- Estructura según `references/file-system.md`: `src/actions/`, `src/presentation/`, `src/storage/`, `src/types/`, `src/api/` y `src/utils/`.
- `src/presentation/menu.ts` coordina acciones independientes con dependencias inyectadas mediante `ActionContext`; `src/index.ts` conecta la consola, la API y la persistencia.
- `src/storage/citiesStorage.ts` y `src/storage/settingsStorage.ts` comparten un único estado. `src/storage/configStore.ts` mantiene el formato, las rutas y las escrituras atómicas de `config.json`; el estado solo cambia si el guardado termina correctamente.
- APIs externas: Open-Meteo Geocoding + Forecast (`https://geocoding-api.open-meteo.com/v1/search`, `https://api.open-meteo.com/v1/forecast`).
- Las pruebas reflejan cada módulo: `src/ruta.ts` → `test/ruta.test.ts`. `test/index.test.ts` verifica esa correspondencia, el arranque y el bloqueo de compilación. Solo `test/fixtures.ts` y `test/helpers.ts` son auxiliares compartidos sin módulo equivalente. Las siete acciones tienen pruebas directas además de las de integración del menú. `test/types/` verifica contratos con `expectTypeOf` durante `bun check`; `bun test` por sí solo no comprueba tipos. También se cubren las APIs con mocks, persistencia, rutas de configuración, presentación y utilidades. No hay configuración de lint/format ni CI.
- Puedes usar `@bun-intructions.md` para obtener instrucciones de bun.
