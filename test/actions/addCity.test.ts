import { describe, expect, test } from "bun:test";
import { addCity } from "../../src/actions/addCity.ts";
import { madrid, ottawa, savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("addCity", () => {
  test("guarda la primera ciudad como default antes de consultar su clima", async () => {
    const { context, io, store, weather } = createActionContext(["Ottawa", "1"]);
    await addCity(context);
    expect(weather.searchCities).toHaveBeenCalledWith("Ottawa");
    expect(context.config).toEqual(savedConfig([ottawa]));
    expect(store.saves).toEqual([context.config]);
    expect(weather.getWeather).toHaveBeenCalledWith(ottawa, "celsius");
    expect(io.text).toContain("Es tu ciudad default");
    expect(io.text).toContain("Temperatura: 7,4 °C");
  });

  test("permite elegir otra coincidencia sin reemplazar la default ni la unidad", async () => {
    const { context, store, weather } = createActionContext(
      ["Madrid", "abc", "3", "2"], { ...savedConfig([ottawa]), temperatureUnit: "fahrenheit" },
      { searchCities: async () => [ottawa, madrid] },
    );
    await addCity(context);
    expect(context.config).toEqual({ ...savedConfig(), temperatureUnit: "fahrenheit" });
    expect(store.saves).toHaveLength(1);
    expect(weather.getWeather).toHaveBeenCalledWith(madrid, "fahrenheit");
  });

  test.each([[], ["0"], [""], ["  "], ["Ottawa", "0"], ["Ottawa"]])(
    "cancelar, dejar vacío o terminar la entrada no guarda: %j", async (answers) => {
      const { context, store, weather } = createActionContext(answers);
      await addCity(context);
      expect(store.saves).toHaveLength(0);
      expect(context.config.cities).toEqual([]);
      expect(weather.getWeather).not.toHaveBeenCalled();
      if (answers[0] !== "Ottawa") expect(weather.searchCities).not.toHaveBeenCalled();
    },
  );

  test("una búsqueda sin coincidencias no modifica la configuración", async () => {
    const { context, io, store } = createActionContext(["desconocida"], savedConfig(), {
      searchCities: async () => [],
    });
    const previous = context.config;
    await addCity(context);
    expect(io.text).toContain("No se encontraron ciudades");
    expect(context.config).toBe(previous);
    expect(store.saves).toHaveLength(0);
  });

  test("marca las coincidencias guardadas y evita duplicarlas", async () => {
    const { context, io, store, weather } = createActionContext(["Ottawa", "1"], savedConfig([ottawa]));
    await addCity(context);
    expect(io.text).toContain("[guardada]");
    expect(io.text).toContain("Esa ciudad ya está guardada");
    expect(context.config).toEqual(savedConfig([ottawa]));
    expect(store.saves).toHaveLength(0);
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test("propaga el error de búsqueda sin guardar", async () => {
    const { context, store } = createActionContext(["Ottawa"], savedConfig(), {
      searchCities: async () => { throw new Error("Sin conexión"); },
    });
    await expect(addCity(context)).rejects.toThrow("Sin conexión");
    expect(store.saves).toHaveLength(0);
  });

  test("un fallo de guardado no cambia el estado ni consulta el clima", async () => {
    const { context, io, store, weather } = createActionContext(["Ottawa", "1"]);
    const previous = context.config;
    store.save = async () => { throw new Error("Sin permisos"); };
    await expect(addCity(context)).rejects.toThrow("Sin permisos");
    expect(context.config).toBe(previous);
    expect(io.text).not.toContain("Ciudad guardada:");
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test("un fallo posterior del clima no deshace el guardado", async () => {
    const { context, store } = createActionContext(["Ottawa", "1"], undefined, {
      getWeather: async () => { throw new Error("Clima no disponible"); },
    });
    await expect(addCity(context)).rejects.toThrow("Clima no disponible");
    expect(context.config).toEqual(savedConfig([ottawa]));
    expect(store.saves).toEqual([savedConfig([ottawa])]);
  });
});
