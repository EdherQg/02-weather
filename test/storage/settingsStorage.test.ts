import { describe, expect, test } from "bun:test";
import { saveTemperatureUnit } from "../../src/storage/settingsStorage.ts";
import { savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("saveTemperatureUnit", () => {
  test.each(["celsius", "fahrenheit"] as const)("guarda %s conservando el resto de la configuración", async (unit) => {
    const { context, store } = createActionContext([], savedConfig());
    const previous = context.config;
    await saveTemperatureUnit(context, unit);
    expect(context.config).toEqual({ ...savedConfig(), temperatureUnit: unit });
    expect(context.config).not.toBe(previous);
    expect(previous).toEqual(savedConfig());
    expect(store.saves).toEqual([context.config]);
  });

  test("el estado no cambia hasta que la persistencia termina", async () => {
    const { context, store } = createActionContext([], savedConfig());
    const previous = context.config;
    const saved = Promise.withResolvers<void>();
    store.save = () => saved.promise;
    const pending = saveTemperatureUnit(context, "fahrenheit");
    const whileSaving = context.config;
    saved.resolve();
    await pending;
    expect(whileSaving).toBe(previous);
    expect(context.config.temperatureUnit).toBe("fahrenheit");
  });

  test("un fallo de persistencia conserva la configuración y el repositorio", async () => {
    const { context, store } = createActionContext([], savedConfig());
    const previous = context.config;
    store.save = async () => { throw new Error("Disco lleno"); };
    await expect(saveTemperatureUnit(context, "fahrenheit")).rejects.toThrow("Disco lleno");
    expect(context.config).toBe(previous);
    expect(store.config).toEqual(previous);
  });
});
