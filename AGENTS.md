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
- Las pruebas están en `test/`, con los mismos subdirectorios que `src/`; `fixtures.ts`, `helpers.ts` y `build.test.ts` permanecen en la raíz. Cubren APIs con mocks, validaciones, persistencia, rutas de configuración, presentación, colores, acciones a través de `test/presentation/menu.test.ts`, entrada de consola y bloqueo de compilación ante fallos. `test/actions/` y `test/types/` conservan un `.gitkeep` mientras no tengan pruebas independientes. No hay configuración de lint/format ni CI.
- Puedes usar `@bun-intructions.md` para obtener instrucciones de bun.
