import { describe, expect, test } from "bun:test";
import { HttpClient } from "../../src/api/http.ts";
import { getForecast, getWeather } from "../../src/api/weather.ts";
import { currentWeather, currentWeatherResponse, ottawa, weeklyForecast, weeklyForecastResponse } from "../fixtures.ts";

describe("getWeather", () => {
  test.each(["celsius", "fahrenheit"] as const)("solicita los campos actuales en %s y transforma su respuesta", async (unit) => {
    const http = new HttpClient(async (url) => {
      expect(Object.fromEntries(url.searchParams)).toEqual({
        latitude: String(ottawa.latitude), longitude: String(ottawa.longitude),
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
        temperature_unit: unit, wind_speed_unit: "kmh", timezone: "auto",
      });
      return Response.json(currentWeatherResponse);
    });
    expect(await getWeather(http, ottawa, unit)).toEqual(currentWeather);
  });

  test.each([null, {}, { ...currentWeatherResponse, current: [] }, { ...currentWeatherResponse, timezone: 1 }])(
    "rechaza una estructura actual inválida: %j", async (data) => {
      await expect(getWeather(new HttpClient(async () => Response.json(data)), ottawa, "celsius")).rejects.toThrow("respuesta del clima");
    },
  );

  test.each([
    { temperature_2m: null }, { apparent_temperature: "1" }, { relative_humidity_2m: -1 },
    { relative_humidity_2m: 101 }, { weather_code: 1.5 }, { wind_speed_10m: -1 }, { time: "sin fecha" },
  ])("rechaza campos actuales inválidos: %j", async (current) => {
    const http = new HttpClient(async () => Response.json({ ...currentWeatherResponse, current: { ...currentWeatherResponse.current, ...current } }));
    await expect(getWeather(http, ottawa, "celsius")).rejects.toThrow("datos del clima");
  });
});

describe("getForecast", () => {
  test.each(["celsius", "fahrenheit"] as const)("solicita ocho días en %s y devuelve los siete desde mañana", async (unit) => {
    const http = new HttpClient(async (url) => {
      expect(Object.fromEntries(url.searchParams)).toEqual({
        latitude: String(ottawa.latitude), longitude: String(ottawa.longitude),
        daily: "weather_code,temperature_2m_min,temperature_2m_max", temperature_unit: unit, timezone: "auto", forecast_days: "8",
      });
      return Response.json(weeklyForecastResponse);
    });
    expect(await getForecast(http, ottawa, unit)).toEqual(weeklyForecast);
  });

  test("no modifica la respuesta que entrega el transporte", async () => {
    const response = structuredClone(weeklyForecastResponse);
    const http = new HttpClient();
    http.getJson = async () => response;
    await getForecast(http, ottawa, "celsius");
    expect(response).toEqual(weeklyForecastResponse);
    expect(response.daily.time).toHaveLength(8);
  });

  test.each([getWeather, getForecast])("propaga fallos HTTP sin fabricar datos", async (query) => {
    const http = new HttpClient(async () => new Response(null, { status: 429 }));
    await expect(query(http, ottawa, "celsius")).rejects.toThrow("Demasiadas consultas");
  });
});
