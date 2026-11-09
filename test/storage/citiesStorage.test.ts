import { describe, expect, test } from "bun:test";
import { deleteCity, getCities, getDefaultCity, saveCity, saveDefaultCity } from "../../src/storage/citiesStorage.ts";
import { madrid, ottawa, savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("citiesStorage", () => {
  test("consulta las ciudades y localiza la default por su id", () => {
    const { context } = createActionContext([], { ...savedConfig(), defaultCityId: madrid.id });
    expect(getCities(context)).toBe(context.config.cities);
    expect(getDefaultCity(context)).toEqual(madrid);
    expect(getDefaultCity(createActionContext().context)).toBeUndefined();
  });

  test("añade la primera ciudad y luego conserva la default y los ajustes", async () => {
    const { context, store } = createActionContext([], { ...savedConfig([]), temperatureUnit: "fahrenheit" });
    const initial = context.config;
    await saveCity(context, ottawa);
    expect(context.config.defaultCityId).toBe(ottawa.id);
    await saveCity(context, madrid);
    expect(context.config).toEqual({ ...savedConfig(), temperatureUnit: "fahrenheit" });
    expect(initial.cities).toEqual([]);
    expect(store.saves).toHaveLength(2);
  });

  test("rechaza duplicados y referencias default inexistentes sin cambiar el estado", async () => {
    const { context, store } = createActionContext([], savedConfig());
    const previous = context.config;
    await expect(saveCity(context, ottawa)).rejects.toThrow("no es válida");
    await expect(saveDefaultCity(context, 999)).rejects.toThrow("no es válida");
    expect(context.config).toBe(previous);
    expect(store.saves).toHaveLength(0);
  });

  test("establece una default válida sin reemplazar las ciudades", async () => {
    const { context, store } = createActionContext([], savedConfig());
    await saveDefaultCity(context, madrid.id);
    expect(context.config).toEqual({ ...savedConfig(), defaultCityId: madrid.id });
    expect(store.config).toEqual(context.config);
  });

  test.each([
    [ottawa.id, [madrid], madrid.id], [madrid.id, [ottawa], ottawa.id], [999, [ottawa, madrid], ottawa.id],
  ] as const)("eliminar el id %s mantiene una default válida", async (id, cities, defaultCityId) => {
    const { context, store } = createActionContext([], savedConfig());
    const previous = context.config;
    await deleteCity(context, id);
    expect(context.config).toEqual({ ...savedConfig([...cities]), defaultCityId });
    expect(previous).toEqual(savedConfig());
    expect(store.config).toEqual(context.config);
  });

  test("eliminar la última ciudad no pierde los ajustes", async () => {
    const { context } = createActionContext([], { ...savedConfig([ottawa]), temperatureUnit: "fahrenheit" });
    await deleteCity(context, ottawa.id);
    expect(context.config).toEqual({ ...savedConfig([]), temperatureUnit: "fahrenheit" });
  });

  test.each([
    (state: ReturnType<typeof createActionContext>["context"]) => saveCity(state, madrid),
    (state: ReturnType<typeof createActionContext>["context"]) => saveDefaultCity(state, ottawa.id),
    (state: ReturnType<typeof createActionContext>["context"]) => deleteCity(state, ottawa.id),
  ])("no reemplaza el estado si falla el guardado", async (change) => {
    const { context, store } = createActionContext([], savedConfig([ottawa]));
    const previous = context.config;
    store.save = async () => { throw new Error("Disco lleno"); };
    await expect(change(context)).rejects.toThrow("Disco lleno");
    expect(context.config).toBe(previous);
    expect(store.config).toEqual(previous);
  });
});
