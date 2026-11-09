import { expectTypeOf, test } from "bun:test";
import { OpenMeteoClient } from "../../src/api/client.ts";
import type { City } from "../../src/types/City.ts";
import type { Forecast, TemperatureUnit, Weather } from "../../src/types/Weather.ts";
import type { WeatherService } from "../../src/types/WeatherService.ts";

test("WeatherService declara búsquedas, clima y pronóstico asíncronos y OpenMeteoClient lo implementa", () => {
  expectTypeOf<WeatherService["searchCities"]>().toEqualTypeOf<(name: string) => Promise<City[]>>();
  expectTypeOf<WeatherService["getWeather"]>().toEqualTypeOf<(city: City, unit: TemperatureUnit) => Promise<Weather>>();
  expectTypeOf<WeatherService["getForecast"]>().toEqualTypeOf<(city: City, unit: TemperatureUnit) => Promise<Forecast>>();
  expectTypeOf<OpenMeteoClient>().toMatchTypeOf<WeatherService>();
  expectTypeOf<() => City[]>().not.toMatchTypeOf<WeatherService["searchCities"]>();
});
