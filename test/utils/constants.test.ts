import { describe, expect, test } from "bun:test";
import { FORECAST_DAYS, GEOCODING_URL, MENU_BORDER, MENU_OPTIONS, REQUEST_TIMEOUT_MS, WEATHER_CONDITIONS, WEATHER_URL } from "../../src/utils/constants.ts";

describe("constantes", () => {
  test("utiliza los endpoints HTTPS de Open-Meteo", () => {
    expect(GEOCODING_URL).toBe("https://geocoding-api.open-meteo.com/v1/search");
    expect(WEATHER_URL).toBe("https://api.open-meteo.com/v1/forecast");
  });

  test("define siete días, diez segundos de espera y las opciones del menú en orden", () => {
    expect(FORECAST_DAYS).toBe(7);
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
    expect(MENU_OPTIONS).toEqual(["1", "2", "3", "4", "5", "6", "8", "9"]);
    expect(MENU_BORDER).toMatch(/^═+$/);
  });

  test("incluye los códigos WMO soportados con descripciones no vacías", () => {
    expect(Object.keys(WEATHER_CONDITIONS).map(Number)).toEqual([
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
    ]);
    for (const description of Object.values(WEATHER_CONDITIONS)) expect(description.trim().length).toBeGreaterThan(0);
  });
});
