import type { AppConfig, City, Weather } from "../src/types.ts";

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

export function savedConfig(cities: City[] = [ottawa, madrid]): AppConfig {
  return { version: 1, cities, defaultCityId: cities[0]?.id ?? null, temperatureUnit: "celsius" };
}
