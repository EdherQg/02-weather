import { describe, expect, test } from "bun:test";
import { cityLabel, formatDate, formatNumber, unitLabel, weatherDescription } from "../../src/utils/format.ts";
import { WEATHER_CONDITIONS } from "../../src/utils/constants.ts";
import { ottawa } from "../fixtures.ts";

describe("formatos", () => {
  test("cityLabel conserva el orden, elimina duplicados y omite datos ausentes", () => {
    expect(cityLabel(ottawa)).toBe("Ottawa, Ontario, Canadá");
    expect(cityLabel({ ...ottawa, region: "Ottawa", country: "Ottawa" })).toBe("Ottawa");
    expect(cityLabel({ ...ottawa, region: undefined, country: "" })).toBe("Ottawa");
  });

  test.each([["celsius", "°C"], ["fahrenheit", "°F"]] as const)("unitLabel convierte %s a %s", (unit, label) => {
    expect(unitLabel(unit)).toBe(label);
  });

  test.each([[0, "0,0"], [-2, "-2,0"], [7.44, "7,4"], [7.46, "7,5"]] as const)(
    "formatNumber presenta %s como %s", (value, expected) => {
      expect(formatNumber(value)).toBe(expected);
    },
  );

  test.each([["2026-10-29", "jueves, 29/10/2026"], ["2031-01-01", "miércoles, 01/01/2031"], ["2028-02-29", "martes, 29/02/2028"]])(
    "formatDate presenta la fecha local %s sin desplazar el día", (date, expected) => {
      expect(formatDate(date)).toBe(expected);
    },
  );

  test("weatherDescription resuelve todos los códigos soportados y mantiene el fallback", () => {
    for (const [code, label] of Object.entries(WEATHER_CONDITIONS)) {
      expect(weatherDescription(Number(code))).toBe(label);
    }
    expect(weatherDescription(999)).toBe("Condición desconocida (código 999)");
  });
});
