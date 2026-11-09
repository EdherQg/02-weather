import { expectTypeOf, test } from "bun:test";
import type { Forecast, ForecastDay, TemperatureUnit, Weather } from "../../src/types/Weather.ts";

test("TemperatureUnit solo admite Celsius y Fahrenheit", () => {
  expectTypeOf<TemperatureUnit>().toEqualTypeOf<"celsius" | "fahrenheit">();
  expectTypeOf<"kelvin">().not.toMatchTypeOf<TemperatureUnit>();
});

test("Weather exige todas las mediciones, hora local y zona horaria", () => {
  expectTypeOf<Weather>().toEqualTypeOf<{
    temperature: number; apparentTemperature: number; humidity: number; windSpeed: number;
    weatherCode: number; time: string; timezone: string;
  }>();
  expectTypeOf<Partial<Weather>>().not.toMatchTypeOf<Weather>();
});

test("Forecast contiene días completos y una zona horaria", () => {
  expectTypeOf<ForecastDay>().toEqualTypeOf<{ date: string; temperatureMin: number; temperatureMax: number; weatherCode: number }>();
  expectTypeOf<Forecast>().toEqualTypeOf<{ days: ForecastDay[]; timezone: string }>();
  expectTypeOf<Omit<ForecastDay, "temperatureMin">>().not.toMatchTypeOf<ForecastDay>();
});
