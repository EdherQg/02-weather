export type TemperatureUnit = "celsius" | "fahrenheit";

export interface City {
  id: number;
  name: string;
  country: string;
  region?: string;
  latitude: number;
  longitude: number;
}

export interface AppConfig {
  version: 1;
  cities: City[];
  defaultCityId: number | null;
  temperatureUnit: TemperatureUnit;
}

export interface Weather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  time: string;
  timezone: string;
}
