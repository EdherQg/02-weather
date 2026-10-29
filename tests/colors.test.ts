import { describe, expect, test } from "bun:test";
import { createColors, supportsColor } from "../src/colors.ts";

describe("colores de terminal", () => {
  test.each([
    ["cyan", 36],
    ["yellow", 33],
    ["green", 32],
    ["red", 31],
  ] as const)("aplica %s y restablece el color al terminar", (name, code) => {
    expect(createColors(true)[name]("texto")).toBe(`\x1b[${code}mtexto\x1b[39m`);
  });

  test("conserva el texto original cuando los colores están desactivados", () => {
    for (const color of Object.values(createColors(false))) {
      expect(color("\n  Texto sin colores: -7,4 °C")).toBe("\n  Texto sin colores: -7,4 °C");
    }
  });

  test("activa colores en terminales compatibles", () => {
    expect(supportsColor(true, {})).toBe(true);
    expect(supportsColor(true, { TERM: "xterm-256color" })).toBe(true);
  });

  test("desactiva colores al redirigir la salida, incluso con FORCE_COLOR", () => {
    expect(supportsColor(false, {})).toBe(false);
    expect(supportsColor(false, { FORCE_COLOR: "1" })).toBe(false);
  });

  test("respeta NO_COLOR en una terminal, incluso si está vacío", () => {
    expect(supportsColor(true, { NO_COLOR: "1" })).toBe(false);
    expect(supportsColor(true, { NO_COLOR: "" })).toBe(false);
    expect(supportsColor(true, { NO_COLOR: "1", FORCE_COLOR: "1" })).toBe(false);
  });

  test("no colorea terminales sin soporte", () => {
    expect(supportsColor(true, { TERM: "dumb" })).toBe(false);
  });
});
