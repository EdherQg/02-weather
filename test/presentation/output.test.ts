import { describe, expect, test } from "bun:test";
import { formatForecast, formatWeather } from "../../src/presentation/output.ts";
import { createColors } from "../../src/utils/colors.ts";
import { cityLabel, weatherDescription } from "../../src/utils/format.ts";
import { currentWeather, ottawa, weeklyForecast } from "../fixtures.ts";

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

  test("muestra siete fechas en español, condiciones y temperaturas mínimas y máximas", () => {
    const output = formatForecast(ottawa, weeklyForecast, "celsius", true);
    expect(output).toContain("Ottawa, Ontario, Canadá [default]");
    expect(output).toContain("Pronóstico de 7 días (desde mañana)");
    expect(output).toContain("Zona horaria: America/Toronto");
    expect(output).toContain("jueves, 29/10/2026: Cielo despejado");
    expect(output).toContain("miércoles, 04/11/2026: Nublado");
    expect(output.match(/Mínima:/g)).toHaveLength(7);
    expect(output.match(/Máxima:/g)).toHaveLength(7);
    expect(output).toContain("Mínima: -2,0 °C | Máxima: 7,0 °C");
    expect(output).toContain("Mínima: 0,0 °C");
    expect(output).toContain("Fuente: Open-Meteo");
    expect(output).not.toContain("\x1b[");
  });

  test.each(["celsius", "fahrenheit"] as const)("aplica la paleta a las temperaturas del pronóstico en %s", (unit) => {
    const plain = formatForecast(ottawa, weeklyForecast, unit, false);
    const colored = formatForecast(ottawa, weeklyForecast, unit, false, createColors(true));
    const symbol = unit === "celsius" ? "°C" : "°F";

    expect(colored).toContain(`Mínima: \x1b[33m-2,0 ${symbol}\x1b[39m`);
    expect(colored).toContain(`Máxima: \x1b[33m7,0 ${symbol}\x1b[39m`);
    expect(colored).toContain("\x1b[36m  Pronóstico de 7 días (desde mañana)\x1b[39m");
    expect(Bun.stripANSI(colored)).toBe(plain);
    expect(formatForecast(ottawa, weeklyForecast, unit, false, createColors(false))).toBe(plain);
    expect(plain).not.toContain("[default]");
  });

  test("no desplaza las fechas diarias al mostrar zonas horarias lejanas", () => {
    for (const timezone of ["Pacific/Auckland", "Pacific/Honolulu"]) {
      const output = formatForecast(ottawa, { ...weeklyForecast, timezone }, "celsius", false);
      expect(output).toContain("jueves, 29/10/2026");
      expect(output).toContain("miércoles, 04/11/2026");
      expect(output).toContain(`Zona horaria: ${timezone}`);
    }
  });

  test("conserva el fallback de condiciones desconocidas en el pronóstico", () => {
    const forecast = { ...weeklyForecast, days: weeklyForecast.days.map((day) => ({ ...day, weatherCode: 999 })) };
    expect(formatForecast(ottawa, forecast, "celsius", false)).toContain("Condición desconocida (código 999)");
  });
});
