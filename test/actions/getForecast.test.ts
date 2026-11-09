import { describe, expect, test } from "bun:test";
import { getForecast } from "../../src/actions/getForecast.ts";
import { madrid, savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("getForecast", () => {
  test.each(["celsius", "fahrenheit"] as const)("consulta la ciudad elegida en %s sin guardar", async (unit) => {
    const { context, io, store, weather } = createActionContext(["2"], { ...savedConfig(), temperatureUnit: unit });
    const previous = context.config;
    await getForecast(context);
    expect(weather.getForecast).toHaveBeenCalledExactlyOnceWith(madrid, unit);
    expect(weather.getWeather).not.toHaveBeenCalled();
    expect(context.config).toBe(previous);
    expect(store.saves).toHaveLength(0);
    expect(io.text).toContain("Pronóstico de 7 días (desde mañana)");
    expect(io.text).toContain("29/10/2026");
    expect(io.text).toContain("04/11/2026");
    expect(io.text).not.toContain("28/10/2026");
  });

  test("sin ciudades orienta al usuario sin preguntar ni consultar", async () => {
    const { context, io, weather } = createActionContext();
    await getForecast(context);
    expect(io.text).toContain("Usa la opción 3");
    expect(io.questions).toHaveLength(0);
    expect(weather.getForecast).not.toHaveBeenCalled();
  });

  test.each([[], ["0"], ["abc", "99", "0"]])("cancelar la selección no consulta: %j", async (answers) => {
    const { context, store, weather } = createActionContext(answers, savedConfig());
    await getForecast(context);
    expect(weather.getForecast).not.toHaveBeenCalled();
    expect(store.saves).toHaveLength(0);
  });

  test("propaga errores sin mostrar resultados parciales ni modificar la configuración", async () => {
    const { context, io, store } = createActionContext(["1"], savedConfig(), {
      getForecast: async () => { throw new Error("Sin pronóstico"); },
    });
    const previous = context.config;
    await expect(getForecast(context)).rejects.toThrow("Sin pronóstico");
    expect(io.text).not.toContain("Mínima:");
    expect(context.config).toBe(previous);
    expect(store.saves).toHaveLength(0);
  });
});
