import { describe, expect, test } from "bun:test";
import { listCities } from "../../src/actions/listCities.ts";
import type { Weather } from "../../src/types/Weather.ts";
import { currentWeather, ottawa, savedConfig } from "../fixtures.ts";
import { createActionContext } from "../helpers.ts";

describe("listCities", () => {
  test("sin ciudades no consulta el servicio", async () => {
    const { context, io, weather } = createActionContext();
    await listCities(context);
    expect(io.text).toContain("No hay ciudades guardadas");
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test("inicia las consultas en paralelo y conserva el orden aunque terminen al revés", async () => {
    const first = Promise.withResolvers<Weather>();
    const second = Promise.withResolvers<Weather>();
    const { context, io, store, weather } = createActionContext([], { ...savedConfig(), temperatureUnit: "fahrenheit" }, {
      getWeather: (city) => city.id === ottawa.id ? first.promise : second.promise,
    });
    const pending = listCities(context);
    const started = weather.getWeather.mock.calls.length;
    second.resolve(currentWeather);
    first.resolve(currentWeather);
    await pending;

    expect(started).toBe(2);
    expect(weather.getWeather.mock.calls).toEqual(savedConfig().cities.map((city) => [city, "fahrenheit"]));
    expect(io.text.indexOf("Ottawa")).toBeLessThan(io.text.indexOf("Madrid"));
    expect(io.text).toContain("Canadá [default]");
    expect(io.text).toContain("Temperatura: 7,4 °F");
    expect(store.saves).toHaveLength(0);
    expect(context.config).toEqual({ ...savedConfig(), temperatureUnit: "fahrenheit" });
  });

  test("muestra los resultados disponibles aunque una ciudad falle", async () => {
    const { context, io } = createActionContext([], savedConfig(), {
      getWeather: async (city) => {
        if (city.id === ottawa.id) throw new Error("Ottawa sin conexión");
        return currentWeather;
      },
    });
    await listCities(context);
    expect(io.text).toContain("Ottawa sin conexión");
    expect(io.text).toContain("Madrid, Comunidad de Madrid, España");
    expect(io.text.match(/Temperatura:/g)).toHaveLength(1);
  });

  test("rechazos que no son Error usan un mensaje seguro y no detienen el listado", async () => {
    const { context, io, store } = createActionContext([], savedConfig(), {
      getWeather: async () => { throw "detalle interno"; },
    });
    await listCities(context);
    expect(io.text.match(/No se pudo consultar el clima/g)).toHaveLength(2);
    expect(io.text).not.toContain("detalle interno");
    expect(store.saves).toHaveLength(0);
  });
});
