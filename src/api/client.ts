import type { City } from "../types/City.ts";
import type { Forecast, TemperatureUnit, Weather } from "../types/Weather.ts";
import type { WeatherService } from "../types/WeatherService.ts";
import { searchCities } from "./geocoding.ts";
import { HttpClient, type Fetcher } from "./http.ts";
import { getForecast, getWeather } from "./weather.ts";

export class OpenMeteoClient implements WeatherService {
  private readonly http: HttpClient;

  constructor(request?: Fetcher, timeoutMs?: number) {
    this.http = new HttpClient(request, timeoutMs);
  }

  searchCities(name: string): Promise<City[]> {
    return searchCities(this.http, name);
  }

  getWeather(city: City, unit: TemperatureUnit): Promise<Weather> {
    return getWeather(this.http, city, unit);
  }

  getForecast(city: City, unit: TemperatureUnit): Promise<Forecast> {
    return getForecast(this.http, city, unit);
  }
}
