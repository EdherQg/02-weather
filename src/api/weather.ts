import type { City } from "../types/City.ts";
import type { Forecast, ForecastDay, TemperatureUnit, Weather } from "../types/Weather.ts";
import { FORECAST_DAYS, WEATHER_URL } from "../utils/constants.ts";
import { isFiniteNumber, isRecord } from "../utils/validation.ts";
import type { HttpClient } from "./http.ts";

export async function getWeather(http: HttpClient, city: City, unit: TemperatureUnit): Promise<Weather> {
  const url = new URL(WEATHER_URL);
  url.search = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
    temperature_unit: unit,
    wind_speed_unit: "kmh",
    timezone: "auto",
  }).toString();

  const data = await http.getJson(url);
  if (!isRecord(data) || !isRecord(data.current) || typeof data.timezone !== "string") {
    throw new Error("La respuesta del clima no es válida.");
  }
  const current = data.current;
  if (!isFiniteNumber(current.temperature_2m) || !isFiniteNumber(current.apparent_temperature)
    || !isFiniteNumber(current.relative_humidity_2m) || current.relative_humidity_2m < 0 || current.relative_humidity_2m > 100
    || !isFiniteNumber(current.weather_code) || !Number.isInteger(current.weather_code)
    || !isFiniteNumber(current.wind_speed_10m) || current.wind_speed_10m < 0
    || typeof current.time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(current.time)) {
    throw new Error("Open-Meteo no devolvió todos los datos del clima esperados.");
  }

  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    weatherCode: current.weather_code,
    windSpeed: current.wind_speed_10m,
    time: current.time,
    timezone: data.timezone,
  };
}

export async function getForecast(http: HttpClient, city: City, unit: TemperatureUnit): Promise<Forecast> {
  const url = new URL(WEATHER_URL);
  url.search = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    daily: "weather_code,temperature_2m_min,temperature_2m_max",
    temperature_unit: unit,
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS + 1),
  }).toString();

  const data = await http.getJson(url);
  if (!isRecord(data) || !isRecord(data.daily) || typeof data.timezone !== "string" || !data.timezone.trim()) {
    throw new Error("La respuesta del pronóstico no es válida.");
  }
  const { time, temperature_2m_min: minimums, temperature_2m_max: maximums, weather_code: codes } = data.daily;
  if (!Array.isArray(time) || time.length !== FORECAST_DAYS + 1
    || !Array.isArray(minimums) || minimums.length !== time.length
    || !Array.isArray(maximums) || maximums.length !== time.length
    || !Array.isArray(codes) || codes.length !== time.length) {
    throw new Error("Open-Meteo no devolvió los 7 días de pronóstico esperados.");
  }

  const days = time.map((date: unknown, index): ForecastDay => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Open-Meteo devolvió una fecha de pronóstico no válida.");
    }
    const parsedDate = new Date(`${date}T00:00:00Z`);
    const temperatureMin: unknown = minimums[index];
    const temperatureMax: unknown = maximums[index];
    const weatherCode: unknown = codes[index];
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date
      || (index > 0 && parsedDate.getTime() - Date.parse(`${time[index - 1]}T00:00:00Z`) !== 86_400_000)
      || !isFiniteNumber(temperatureMin) || !isFiniteNumber(temperatureMax) || temperatureMin > temperatureMax
      || !isFiniteNumber(weatherCode) || !Number.isInteger(weatherCode)) {
      throw new Error("Open-Meteo devolvió datos de pronóstico no válidos.");
    }
    return { date, temperatureMin, temperatureMax, weatherCode };
  });

  // With timezone=auto, the first daily entry is today in the city's timezone.
  return { days: days.slice(1), timezone: data.timezone };
}
