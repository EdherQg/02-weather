import { describe, expect, test } from "bun:test";
import { removeCity } from "../../src/actions/removeCity.ts";
import { madrid, ottawa, savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("removeCity", () => {
  test("sin ciudades no pregunta ni guarda", async () => {
    const { context, io, store } = createActionContext();
    await removeCity(context);
    expect(io.questions).toHaveLength(0);
    expect(io.text).toContain("No hay ciudades guardadas");
    expect(store.saves).toHaveLength(0);
  });

  test.each([[], ["0"], ["1"], ["1", ""], ["1", "n"]])("cancelar o no confirmar conserva los datos: %j", async (answers) => {
    const { context, store } = createActionContext(answers, savedConfig());
    const previous = context.config;
    await removeCity(context);
    expect(context.config).toBe(previous);
    expect(store.saves).toHaveLength(0);
  });

  test.each(["s", "si", "sí", "SÍ"])("la confirmación %s elimina la default y reasigna la primera restante", async (answer) => {
    const { context, io, store } = createActionContext(["1", answer], savedConfig());
    await removeCity(context);
    expect(context.config).toEqual(savedConfig([madrid]));
    expect(store.saves).toEqual([context.config]);
    expect(io.text).toContain("Ciudad eliminada: Ottawa");
    expect(io.text).toContain("Nueva ciudad default: Madrid");
  });

  test("eliminar una secundaria no cambia la default ni la unidad", async () => {
    const { context, io } = createActionContext(["2", "s"], { ...savedConfig(), temperatureUnit: "fahrenheit" });
    await removeCity(context);
    expect(context.config).toEqual({ ...savedConfig([ottawa]), temperatureUnit: "fahrenheit" });
    expect(io.text).not.toContain("Nueva ciudad default");
  });

  test("eliminar la última ciudad deja la default en null", async () => {
    const { context, io } = createActionContext(["1", "s"], savedConfig([ottawa]));
    await removeCity(context);
    expect(context.config).toEqual(savedConfig([]));
    expect(io.text).not.toContain("Nueva ciudad default");
  });

  test("un fallo de guardado conserva los datos y no confirma la eliminación", async () => {
    const { context, io, store } = createActionContext(["1", "s"], savedConfig());
    const previous = context.config;
    store.save = async () => { throw new Error("Sin permisos"); };
    await expect(removeCity(context)).rejects.toThrow("Sin permisos");
    expect(context.config).toBe(previous);
    expect(io.text).not.toContain("Ciudad eliminada:");
    expect(io.text).not.toContain("Nueva ciudad default:");
  });
});
