import { describe, expect, test } from "bun:test";
import { OpenMeteoClient } from "../src/api.ts";
import { currentWeather, ottawa, weeklyForecast } from "./fixtures.ts";

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

const weeklyResponse = {
  timezone: weeklyForecast.timezone,
  daily: {
    time: ["2026-10-28", ...weeklyForecast.days.map((day) => day.date)],
    temperature_2m_min: [-99, ...weeklyForecast.days.map((day) => day.temperatureMin)],
    temperature_2m_max: [99, ...weeklyForecast.days.map((day) => day.temperatureMax)],
    weather_code: [95, ...weeklyForecast.days.map((day) => day.weatherCode)],
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

  describe("pronóstico de 7 días desde mañana", () => {
    test.each(["celsius", "fahrenheit"] as const)("solicita ocho días diarios en %s y excluye hoy", async (unit) => {
      const client = new OpenMeteoClient(async (url, options) => {
        expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
        expect(url.searchParams.get("latitude")).toBe(String(ottawa.latitude));
        expect(url.searchParams.get("longitude")).toBe(String(ottawa.longitude));
        expect(url.searchParams.get("temperature_unit")).toBe(unit);
        expect(url.searchParams.get("timezone")).toBe("auto");
        expect(url.searchParams.get("forecast_days")).toBe("8");
        expect(url.searchParams.get("daily")).toBe("weather_code,temperature_2m_min,temperature_2m_max");
        expect(url.searchParams.has("current")).toBe(false);
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return Response.json(weeklyResponse);
      });
      const result = await client.getForecast(ottawa, unit);
      expect(result).toEqual(weeklyForecast);
      expect(result.days).toHaveLength(7);
      expect(result.days[0]?.date).toBe("2026-10-29");
      expect(result.days[6]?.date).toBe("2026-11-04");
    });

    test.each(["Pacific/Auckland", "Pacific/Honolulu"])("usa el calendario de la API en %s al cambiar de año", async (timezone) => {
      const time = ["2030-12-31", "2031-01-01", "2031-01-02", "2031-01-03", "2031-01-04", "2031-01-05", "2031-01-06", "2031-01-07"];
      const client = new OpenMeteoClient(async () => Response.json({
        ...weeklyResponse, timezone, daily: { ...weeklyResponse.daily, time },
      }));
      const result = await client.getForecast(ottawa, "celsius");
      expect(result.days.map((day) => day.date)).toEqual(time.slice(1));
      expect(result.timezone).toBe(timezone);
    });

    test("conserva temperaturas cero y negativas y condiciones despejadas", async () => {
      const client = new OpenMeteoClient(async () => Response.json(weeklyResponse));
      const { days } = await client.getForecast(ottawa, "celsius");
      expect(days[0]).toEqual({ date: "2026-10-29", temperatureMin: -2, temperatureMax: 7, weatherCode: 0 });
      expect(days[2]?.temperatureMin).toBe(0);
    });

    test.each([
      ["respuesta nula", null],
      ["sin datos diarios", forecast],
      ["sin zona horaria", { daily: weeklyResponse.daily }],
      ["zona horaria vacía", { ...weeklyResponse, timezone: " " }],
      ["daily no es un objeto", { ...weeklyResponse, daily: [] }],
      ["sin fechas", { ...weeklyResponse, daily: { ...weeklyResponse.daily, time: undefined } }],
      ["solo siete fechas", { ...weeklyResponse, daily: { ...weeklyResponse.daily, time: weeklyResponse.daily.time.slice(0, 7) } }],
      ["nueve fechas", { ...weeklyResponse, daily: { ...weeklyResponse.daily, time: [...weeklyResponse.daily.time, "2026-11-05"] } }],
      ["mínimas desalineadas", { ...weeklyResponse, daily: { ...weeklyResponse.daily, temperature_2m_min: [1] } }],
      ["máximas desalineadas", { ...weeklyResponse, daily: { ...weeklyResponse.daily, temperature_2m_max: [] } }],
      ["sin condiciones", { ...weeklyResponse, daily: { ...weeklyResponse.daily, weather_code: null } }],
    ] as const)("rechaza pronósticos incompletos: %s", async (_name, data) => {
      const client = new OpenMeteoClient(async () => Response.json(data));
      await expect(client.getForecast(ottawa, "celsius")).rejects.toThrow("pronóstico");
    });

    test.each([
      ["fecha imposible", { time: ["2026-02-30", ...weeklyResponse.daily.time.slice(1)] }],
      ["fecha sin formato ISO", { time: ["28/10/2026", ...weeklyResponse.daily.time.slice(1)] }],
      ["fecha fuera de rango", { time: ["2026-13-01", ...weeklyResponse.daily.time.slice(1)] }],
      ["fechas duplicadas", { time: ["2026-10-29", ...weeklyResponse.daily.time.slice(1)] }],
      ["fechas no consecutivas", { time: ["2026-10-27", ...weeklyResponse.daily.time.slice(1)] }],
      ["mínima nula", { temperature_2m_min: [-99, null, ...weeklyResponse.daily.temperature_2m_min.slice(2)] }],
      ["máxima no numérica", { temperature_2m_max: [99, "7", ...weeklyResponse.daily.temperature_2m_max.slice(2)] }],
      ["mínima mayor que máxima", { temperature_2m_min: [-99, 8, ...weeklyResponse.daily.temperature_2m_min.slice(2)] }],
      ["condición nula", { weather_code: [95, null, ...weeklyResponse.daily.weather_code.slice(2)] }],
      ["condición decimal", { weather_code: [95, 1.5, ...weeklyResponse.daily.weather_code.slice(2)] }],
    ] as const)("rechaza datos diarios inválidos: %s", async (_name, daily) => {
      const client = new OpenMeteoClient(async () => Response.json({
        ...weeklyResponse, daily: { ...weeklyResponse.daily, ...daily },
      }));
      await expect(client.getForecast(ottawa, "celsius")).rejects.toThrow("pronóstico");
    });

    test("reutiliza el manejo de errores HTTP, JSON, de API y de conexión", async () => {
      for (const status of [429, 503]) {
        const client = new OpenMeteoClient(async () => new Response(null, { status }));
        await expect(client.getForecast(ottawa, "celsius")).rejects.toThrow(status === 429 ? "Demasiadas consultas" : "HTTP 503");
      }
      const invalidJson = new OpenMeteoClient(async () => new Response("no es JSON"));
      await expect(invalidJson.getForecast(ottawa, "celsius")).rejects.toThrow("JSON no válida");
      const apiError = new OpenMeteoClient(async () => Response.json({ error: true, reason: "Consulta incorrecta" }));
      await expect(apiError.getForecast(ottawa, "celsius")).rejects.toThrow("Consulta incorrecta");
      const offline = new OpenMeteoClient(async () => { throw new TypeError("fetch failed"); });
      await expect(offline.getForecast(ottawa, "celsius")).rejects.toThrow("conexión a Internet");
    });

    test("cancela el pronóstico si se supera el tiempo límite", async () => {
      const client = new OpenMeteoClient((_url, options) => new Promise((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
      }), 10);
      await expect(client.getForecast(ottawa, "celsius")).rejects.toThrow("tardó demasiado");
    });
  });
});
