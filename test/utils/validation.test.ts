import { describe, expect, test } from "bun:test";
import { isCity, isFiniteNumber, isRecord } from "../../src/utils/validation.ts";
import { ottawa } from "../fixtures.ts";

describe("validación de valores", () => {
  test("reconoce objetos y rechaza valores primitivos y arrays", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord(ottawa)).toBe(true);
    for (const value of [null, undefined, [], "texto", 0, true]) {
      expect(isRecord(value)).toBe(false);
    }
  });

  test("solo acepta números finitos sin convertir cadenas ni valores vacíos", () => {
    for (const value of [0, -1, 1.5, Number.MAX_VALUE]) {
      expect(isFiniteNumber(value)).toBe(true);
    }
    for (const value of [NaN, Infinity, -Infinity, "1", null, undefined, true]) {
      expect(isFiniteNumber(value)).toBe(false);
    }
  });
});

describe("validación de ciudades", () => {
  test.each([
    ["coordenadas mínimas", { ...ottawa, latitude: -90, longitude: -180 }],
    ["coordenadas máximas", { ...ottawa, latitude: 90, longitude: 180 }],
    ["coordenadas cero", { ...ottawa, latitude: 0, longitude: 0 }],
    ["región opcional y país desconocido", { ...ottawa, region: undefined, country: "" }],
  ])("acepta %s", (_name, city) => {
    expect(isCity(city)).toBe(true);
  });

  test.each([
    ["valor nulo", null],
    ["array", []],
    ["objeto vacío", {}],
    ["id cero", { ...ottawa, id: 0 }],
    ["id negativo", { ...ottawa, id: -1 }],
    ["id decimal", { ...ottawa, id: 1.5 }],
    ["id inseguro", { ...ottawa, id: Number.MAX_SAFE_INTEGER + 1 }],
    ["id no numérico", { ...ottawa, id: "1" }],
    ["nombre vacío", { ...ottawa, name: "" }],
    ["nombre en blanco", { ...ottawa, name: "  " }],
    ["nombre no textual", { ...ottawa, name: 1 }],
    ["país ausente", { ...ottawa, country: undefined }],
    ["región no textual", { ...ottawa, region: null }],
    ["latitud fuera de rango", { ...ottawa, latitude: -91 }],
    ["longitud fuera de rango", { ...ottawa, longitude: 181 }],
    ["latitud infinita", { ...ottawa, latitude: Infinity }],
    ["longitud NaN", { ...ottawa, longitude: NaN }],
    ["latitud no numérica", { ...ottawa, latitude: "45" }],
  ])("rechaza %s", (_name, city) => {
    expect(isCity(city)).toBe(false);
  });
});
