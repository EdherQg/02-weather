import type { City, Forecast, ForecastDay, TemperatureUnit, Weather } from "./types.ts";
import { isCity, isFiniteNumber, isRecord } from "./validation.ts";

export interface WeatherService {
  searchCities(name: string): Promise<City[]>;
  getWeather(city: City, unit: TemperatureUnit): Promise<Weather>;
  getForecast(city: City, unit: TemperatureUnit): Promise<Forecast>;
}

export type Fetcher = (url: URL, options: RequestInit) => Promise<Response>;

export class OpenMeteoClient implements WeatherService {
  constructor(
    private readonly request: Fetcher = (url, options) => fetch(url, options),
    private readonly timeoutMs = 10_000,
  ) {}

  async searchCities(name: string): Promise<City[]> {
    const query = name.trim();
    if (!query) throw new Error("Escribe el nombre de una ciudad.");

    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({ name: query, count: "5", language: "es", format: "json" }).toString();
    const data = await this.getJson(url);
    if (!isRecord(data)) throw new Error("La respuesta de coordenadas no es válida.");
    if (data.results === undefined) return [];
    if (!Array.isArray(data.results)) throw new Error("La respuesta de coordenadas no es válida.");

    return data.results.map((result: unknown) => {
      if (!isRecord(result)) throw new Error("Open-Meteo devolvió una ciudad no válida.");
      const city = {
        id: result.id,
        name: result.name,
        country: typeof result.country === "string" ? result.country
          : typeof result.country_code === "string" ? result.country_code : "",
        ...(typeof result.admin1 === "string" ? { region: result.admin1 } : {}),
        latitude: result.latitude,
        longitude: result.longitude,
      };
      if (!isCity(city)) throw new Error("Open-Meteo devolvió una ciudad con coordenadas no válidas.");
      return city;
    });
  }

  async getWeather(city: City, unit: TemperatureUnit): Promise<Weather> {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
      temperature_unit: unit,
      wind_speed_unit: "kmh",
      timezone: "auto",
    }).toString();

    const data = await this.getJson(url);
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

  async getForecast(city: City, unit: TemperatureUnit): Promise<Forecast> {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      daily: "weather_code,temperature_2m_min,temperature_2m_max",
      temperature_unit: unit,
      timezone: "auto",
      forecast_days: "8",
    }).toString();

    const data = await this.getJson(url);
    if (!isRecord(data) || !isRecord(data.daily) || typeof data.timezone !== "string" || !data.timezone.trim()) {
      throw new Error("La respuesta del pronóstico no es válida.");
    }
    const { time, temperature_2m_min: minimums, temperature_2m_max: maximums, weather_code: codes } = data.daily;
    if (!Array.isArray(time) || time.length !== 8
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

  private async getJson(url: URL): Promise<unknown> {
    let response: Response;
    try {
      response = await this.request(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error("Open-Meteo tardó demasiado en responder. Inténtalo de nuevo.", { cause: error });
      }
      throw new Error("No se pudo conectar con Open-Meteo. Revisa tu conexión a Internet.", { cause: error });
    }

    if (response.status === 429) throw new Error("Demasiadas consultas a Open-Meteo. Inténtalo más tarde.");
    if (!response.ok) throw new Error(`Open-Meteo respondió con HTTP ${response.status}. Inténtalo más tarde.`);

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error("Open-Meteo devolvió una respuesta JSON no válida.");
    }
    if (isRecord(data) && data.error === true) {
      throw new Error(`Open-Meteo: ${typeof data.reason === "string" ? data.reason : "consulta no válida"}`);
    }
    return data;
  }
}
