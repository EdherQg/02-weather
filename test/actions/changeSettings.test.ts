import { describe, expect, test } from "bun:test";
import { changeSettings } from "../../src/actions/changeSettings.ts";
import { savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("changeSettings", () => {
  test.each([["1", "celsius", "°C"], ["2", "fahrenheit", "°F"]] as const)(
    "guarda la selección %s sin alterar las ciudades", async (answer, unit, symbol) => {
      const { context, io, store, weather } = createActionContext([answer], savedConfig());
      await changeSettings(context);
      expect(context.config).toEqual({ ...savedConfig(), temperatureUnit: unit });
      expect(store.saves).toEqual([context.config]);
      expect(io.text).toContain(`Temperatura configurada en ${symbol}`);
      expect(weather.getWeather).not.toHaveBeenCalled();
      expect(weather.getForecast).not.toHaveBeenCalled();
    },
  );

  test.each([[], ["0"], ["3", "abc", "0"]].map((answers) => [answers] as const))("cancelar o terminar la entrada no guarda: %j", async (answers) => {
    const { context, store } = createActionContext(answers, savedConfig());
    const previous = context.config;
    await changeSettings(context);
    expect(context.config).toBe(previous);
    expect(store.saves).toHaveLength(0);
  });

  test("repite una selección inválida y acepta la siguiente", async () => {
    const { context, io, store } = createActionContext(["-1", "2"], savedConfig());
    await changeSettings(context);
    expect(io.text).toContain("Opción no válida");
    expect(context.config.temperatureUnit).toBe("fahrenheit");
    expect(store.saves).toHaveLength(1);
  });

  test("un error de persistencia conserva la unidad y no confirma el cambio", async () => {
    const { context, io, store } = createActionContext(["2"], savedConfig());
    const previous = context.config;
    store.save = async () => { throw new Error("Sin permisos"); };
    await expect(changeSettings(context)).rejects.toThrow("Sin permisos");
    expect(context.config).toBe(previous);
    expect(io.text).not.toContain("Temperatura configurada en");
  });
});
