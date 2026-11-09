import { describe, expect, test } from "bun:test";
import { setDefaultCity } from "../../src/actions/setDefaultCity.ts";
import { madrid, savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("setDefaultCity", () => {
  test("sin ciudades no pregunta ni guarda", async () => {
    const { context, io, store } = createActionContext();
    await setDefaultCity(context);
    expect(io.text).toContain("No hay ciudades guardadas");
    expect(io.questions).toHaveLength(0);
    expect(store.saves).toHaveLength(0);
  });

  test("cambia solo la default y no consulta el clima", async () => {
    const { context, io, store, weather } = createActionContext(["2"], savedConfig());
    await setDefaultCity(context);
    expect(context.config).toEqual({ ...savedConfig(), defaultCityId: madrid.id });
    expect(store.saves).toEqual([context.config]);
    expect(io.text).toContain("Ciudad default: Madrid");
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test("elegir la default actual no vuelve a guardar", async () => {
    const { context, io, store } = createActionContext(["1"], savedConfig());
    const previous = context.config;
    await setDefaultCity(context);
    expect(io.text).toContain("Esa ya es tu ciudad default");
    expect(context.config).toBe(previous);
    expect(store.saves).toHaveLength(0);
  });

  test.each([[], ["0"], ["abc", "99", "0"]])("cancelar o terminar la entrada no guarda: %j", async (answers) => {
    const { context, store } = createActionContext(answers, savedConfig());
    await setDefaultCity(context);
    expect(context.config).toEqual(savedConfig());
    expect(store.saves).toHaveLength(0);
  });

  test("un fallo de guardado no cambia la default ni confirma el cambio", async () => {
    const { context, io, store } = createActionContext(["2"], savedConfig());
    const previous = context.config;
    store.save = async () => { throw new Error("Sin permisos"); };
    await expect(setDefaultCity(context)).rejects.toThrow("Sin permisos");
    expect(context.config).toBe(previous);
    expect(io.text).not.toContain("\n  Ciudad default:");
  });
});
