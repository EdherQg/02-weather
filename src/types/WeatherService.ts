import type { City } from "./City.ts";
import type { Forecast, TemperatureUnit, Weather } from "./Weather.ts";

export interface WeatherService {
  searchCities(name: string): Promise<City[]>;
  getWeather(city: City, unit: TemperatureUnit): Promise<Weather>;
  getForecast(city: City, unit: TemperatureUnit): Promise<Forecast>;
}
