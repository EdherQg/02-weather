# AGENTS.md

## Entorno / Herramientas
- Runtime: Bun (ver `package.json`, `@types/bun`). Punto de entrada: `index.ts` (módulo).
- TypeScript: configuración estricta en `tsconfig.json` (ESNext, resolución de módulos bundler, `noEmit`, `noUncheckedIndexedAccess`, `strict`).
- Comprobación de tipos: `bun check` (script en `package.json`).

## Arquitectura (verificado)
- Aplicación CLI de clima (README en español). Funcionalidades previstas: ciudad por defecto, lista de ciudades, añadir/eliminar/establecer por defecto, ajustes. Objetivo: generar un binario ejecutable (según README).
- APIs externas: Open-Meteo Geocoding + Forecast (`https://geocoding-api.open-meteo.com/v1/search`, `https://api.open-meteo.com/v1/forecast`).
- No hay tests, lint/format, CI ni configuraciones AGENTS/CLAUDE/cursor/opencode existentes.
- Puedes usar `@bun-intructions.md` para obtener instrucciones de bun.