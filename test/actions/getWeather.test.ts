import { describe, expect, test } from "bun:test";
import { getDefaultWeather, getWeather } from "../../src/actions/getWeather.ts";
import { madrid, ottawa, savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("getWeather y getDefaultWeather", () => {
  test.each(["celsius", "fahrenheit"] as const)("consulta una ciudad concreta en %s sin cambiar el estado", async (unit) => {
    const { context, io, store, weather } = createActionContext([], { ...savedConfig(), temperatureUnit: unit });
    const previous = context.config;
    await getWeather(context, madrid);
    expect(weather.getWeather).toHaveBeenCalledExactlyOnceWith(madrid, unit);
    expect(io.text).toContain("Madrid, Comunidad de Madrid, España");
    expect(io.text).toContain(`Temperatura: 7,4 ${unit === "celsius" ? "°C" : "°F"}`);
    expect(io.text).not.toContain("[default]");
    expect(context.config).toBe(previous);
    expect(store.saves).toHaveLength(0);
  });

  test("consulta la default por su id, no por su posición en la lista", async () => {
    const { context, io, weather } = createActionContext([], { ...savedConfig(), defaultCityId: madrid.id });
    await getDefaultWeather(context);
    expect(weather.getWeather).toHaveBeenCalledExactlyOnceWith(madrid, "celsius");
    expect(io.text).toContain("España [default]");
  });

  test("sin ciudades no consulta el servicio", async () => {
    const { context, io, weather } = createActionContext();
    await getDefaultWeather(context);
    expect(io.text).toContain("No hay ciudades guardadas");
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test("propaga el error del servicio sin mostrar un resultado ni guardar", async () => {
    const { context, io, store } = createActionContext([], savedConfig(), {
      getWeather: async () => { throw new Error("Sin conexión"); },
    });
    await expect(getWeather(context, ottawa)).rejects.toThrow("Sin conexión");
    expect(io.text).not.toContain("Temperatura:");
    expect(store.saves).toHaveLength(0);
    expect(context.config).toEqual(savedConfig());
  });
});
