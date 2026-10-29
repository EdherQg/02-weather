import { describe, expect, test } from "bun:test";
import { createColors } from "../src/colors.ts";
import { cityLabel, formatWeather, weatherDescription } from "../src/presentation.ts";
import { currentWeather, ottawa } from "./fixtures.ts";

describe("presentación", () => {
  test("muestra el clima en español y conserva la hora local de la ciudad", () => {
    const output = formatWeather(ottawa, currentWeather, "celsius", true);
    expect(output).toContain("Ottawa, Ontario, Canadá [default]");
    expect(output).toContain("Parcialmente nublado");
    expect(output).toContain("Sensación térmica: 4,7 °C");
    expect(output).toContain("Humedad: 74 %");
    expect(output).toContain("2026-10-28 15:00 (America/Toronto)");
  });

  test("no repite nombres de región ni muestra valores ausentes", () => {
    expect(cityLabel({ ...ottawa, region: "Ottawa", country: "" })).toBe("Ottawa");
  });

  test("muestra temperaturas negativas, Fahrenheit y códigos WMO desconocidos", () => {
    expect(formatWeather(ottawa, { ...currentWeather, temperature: -1 }, "fahrenheit", false)).toContain("-1,0 °F");
    expect(weatherDescription(0)).toBe("Cielo despejado");
    expect(weatherDescription(95)).toBe("Tormenta eléctrica");
    expect(weatherDescription(999)).toContain("código 999");
  });

  test.each(["celsius", "fahrenheit"] as const)("resalta solo los valores de temperatura en %s", (unit) => {
    const weather = { ...currentWeather, temperature: -1 };
    const plain = formatWeather(ottawa, weather, unit, true);
    const colored = formatWeather(ottawa, weather, unit, true, createColors(true));
    const symbol = unit === "celsius" ? "°C" : "°F";

    expect(colored).toContain(`Temperatura: \x1b[33m-1,0 ${symbol}\x1b[39m`);
    expect(colored).toContain(`Sensación térmica: \x1b[33m4,7 ${symbol}\x1b[39m`);
    expect(colored).toContain("  Humedad: 74 % | Viento: 7,6 km/h");
    expect(Bun.stripANSI(colored)).toBe(plain);
    expect(formatWeather(ottawa, weather, unit, true, createColors(false))).toBe(plain);
  });
});
