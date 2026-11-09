import type { AppConfig } from "../src/types/AppConfig.ts";
import type { City } from "../src/types/City.ts";
import type { Forecast, Weather } from "../src/types/Weather.ts";

export const ottawa: City = {
  id: 6094817,
  name: "Ottawa",
  country: "Canadá",
  region: "Ontario",
  latitude: 45.41117,
  longitude: -75.69812,
};

export const madrid: City = {
  id: 3117735,
  name: "Madrid",
  country: "España",
  region: "Comunidad de Madrid",
  latitude: 40.4165,
  longitude: -3.70256,
};

export const currentWeather: Weather = {
  temperature: 7.4,
  apparentTemperature: 4.7,
  humidity: 74,
  windSpeed: 7.6,
  weatherCode: 2,
  time: "2026-10-28T15:00",
  timezone: "America/Toronto",
};

export const weeklyForecast: Forecast = {
  timezone: "America/Toronto",
  days: ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]
    .map((date, index) => ({ date, temperatureMin: index - 2, temperatureMax: index + 7, weatherCode: index === 0 ? 0 : 3 })),
};

export function savedConfig(cities: City[] = [ottawa, madrid]): AppConfig {
  return { version: 1, cities, defaultCityId: cities[0]?.id ?? null, temperatureUnit: "celsius" };
}
