import { describe, expect, test } from "bun:test";
import { OpenMeteoClient } from "../src/api.ts";
import { currentWeather, ottawa } from "./fixtures.ts";

const forecast = {
  timezone: currentWeather.timezone,
  current: {
    temperature_2m: currentWeather.temperature,
    apparent_temperature: currentWeather.apparentTemperature,
    relative_humidity_2m: currentWeather.humidity,
    wind_speed_10m: currentWeather.windSpeed,
    weather_code: currentWeather.weatherCode,
    time: currentWeather.time,
  },
};

describe("Open-Meteo", () => {
  test("busca coordenadas en español y codifica el nombre de la ciudad", async () => {
    const client = new OpenMeteoClient(async (url, options) => {
      expect(url.origin + url.pathname).toBe("https://geocoding-api.open-meteo.com/v1/search");
      expect(url.searchParams.get("name")).toBe("San José");
      expect(url.searchParams.get("language")).toBe("es");
      expect(url.searchParams.get("count")).toBe("5");
      expect(options.signal).toBeInstanceOf(AbortSignal);
      return Response.json({ results: [{ ...ottawa, admin1: ottawa.region }] });
    });
    expect(await client.searchCities("  San José  ")).toEqual([ottawa]);
  });

  test("una búsqueda sin coincidencias devuelve una lista vacía", async () => {
    const client = new OpenMeteoClient(async () => Response.json({ generationtime_ms: 0.1 }));
    expect(await client.searchCities("ciudad-inexistente")).toEqual([]);
  });

  test("no acepta nombres vacíos ni coordenadas inválidas", async () => {
    const client = new OpenMeteoClient(async () => Response.json({ results: [{ ...ottawa, latitude: 999 }] }));
    await expect(client.searchCities(" ")).rejects.toThrow("nombre");
    await expect(client.searchCities("Ottawa")).rejects.toThrow("coordenadas no válidas");
  });

  test("permite ciudades sin región ni nombre de país", async () => {
    const client = new OpenMeteoClient(async () => Response.json({
      results: [{ id: 1, name: "Ciudad", latitude: 0, longitude: 0, country_code: "XX" }],
    }));
    expect(await client.searchCities("Ciudad")).toEqual([
      { id: 1, name: "Ciudad", latitude: 0, longitude: 0, country: "XX" },
    ]);
  });

  for (const unit of ["celsius", "fahrenheit"] as const) {
    test(`consulta el clima con las coordenadas guardadas y la unidad ${unit}`, async () => {
      const client = new OpenMeteoClient(async (url) => {
        expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
        expect(url.searchParams.get("latitude")).toBe(String(ottawa.latitude));
        expect(url.searchParams.get("longitude")).toBe(String(ottawa.longitude));
        expect(url.searchParams.get("temperature_unit")).toBe(unit);
        expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
        expect(url.searchParams.get("timezone")).toBe("auto");
        expect(url.searchParams.get("current")).toContain("temperature_2m");
        return Response.json(forecast);
      });
      expect(await client.getWeather(ottawa, unit)).toEqual(currentWeather);
    });
  }

  test("no confunde temperatura cero con datos ausentes", async () => {
    const client = new OpenMeteoClient(async () => Response.json({
      ...forecast,
      current: { ...forecast.current, temperature_2m: 0, apparent_temperature: -2, weather_code: 0 },
    }));
    expect((await client.getWeather(ottawa, "celsius")).temperature).toBe(0);
  });

  test("rechaza datos de clima incompletos", async () => {
    const client = new OpenMeteoClient(async () => Response.json({ ...forecast, current: { temperature_2m: 7 } }));
    await expect(client.getWeather(ottawa, "celsius")).rejects.toThrow("datos del clima");
  });

  test("informa de errores HTTP y límites de consultas", async () => {
    for (const status of [404, 429, 503]) {
      const client = new OpenMeteoClient(async () => new Response(null, { status }));
      await expect(client.searchCities("Ottawa")).rejects.toThrow(status === 429 ? "Demasiadas consultas" : `HTTP ${status}`);
    }
  });

  test("informa de fallos de conexión", async () => {
    const client = new OpenMeteoClient(async () => { throw new TypeError("fetch failed"); });
    await expect(client.searchCities("Ottawa")).rejects.toThrow("conexión a Internet");
  });

  test("cancela las peticiones que exceden el tiempo límite", async () => {
    const client = new OpenMeteoClient((_url, options) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    }), 10);
    await expect(client.searchCities("Ottawa")).rejects.toThrow("tardó demasiado");
  });

  test("informa de JSON y respuestas de API inválidas", async () => {
    const invalidJson = new OpenMeteoClient(async () => new Response("no es JSON"));
    await expect(invalidJson.searchCities("Ottawa")).rejects.toThrow("JSON no válida");
    const apiError = new OpenMeteoClient(async () => Response.json({ error: true, reason: "Consulta incorrecta" }));
    await expect(apiError.searchCities("Ottawa")).rejects.toThrow("Consulta incorrecta");
    const invalidResults = new OpenMeteoClient(async () => Response.json({ results: "incorrecto" }));
    await expect(invalidResults.searchCities("Ottawa")).rejects.toThrow("coordenadas no es válida");
  });
});
