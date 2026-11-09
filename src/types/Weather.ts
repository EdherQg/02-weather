export type TemperatureUnit = "celsius" | "fahrenheit";

export interface Weather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  time: string;
  timezone: string;
}

export interface ForecastDay {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  weatherCode: number;
}

export interface Forecast {
  days: ForecastDay[];
  timezone: string;
}
