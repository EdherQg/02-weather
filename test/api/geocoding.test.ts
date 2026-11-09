import { describe, expect, mock, test } from "bun:test";
import { searchCities } from "../../src/api/geocoding.ts";
import { HttpClient } from "../../src/api/http.ts";
import { madrid, ottawa } from "../fixtures.ts";

describe("searchCities", () => {
  test("construye la búsqueda y transforma las coincidencias sin perder el orden", async () => {
    const http = new HttpClient(async (url) => {
      expect(url.origin + url.pathname).toBe("https://geocoding-api.open-meteo.com/v1/search");
      expect(Object.fromEntries(url.searchParams)).toEqual({ name: "San José", count: "5", language: "es", format: "json" });
      return Response.json({ results: [ottawa, madrid].map((city) => ({ ...city, admin1: city.region })) });
    });
    expect(await searchCities(http, "  San José  ")).toEqual([ottawa, madrid]);
  });

  test("no consulta el transporte para un nombre en blanco", async () => {
    const request = mock(async () => Response.json({}));
    await expect(searchCities(new HttpClient(request), "\t \n")).rejects.toThrow("nombre");
    expect(request).not.toHaveBeenCalled();
  });

  test.each([{}, { results: [] }])("una respuesta sin coincidencias produce una lista vacía: %j", async (data) => {
    expect(await searchCities(new HttpClient(async () => Response.json(data)), "Ottawa")).toEqual([]);
  });

  test.each([
    ["nombre", { country: "Canadá", country_code: "CA" }, "Canadá"],
    ["código", { country_code: "CA" }, "CA"],
    ["país desconocido", {}, ""],
  ] as const)("utiliza %s como país y omite regiones no textuales", async (_name, country, expected) => {
    const { region: _region, country: _country, ...city } = ottawa;
    const http = new HttpClient(async () => Response.json({ results: [{ ...city, ...country, admin1: null }] }));
    expect(await searchCities(http, "Ottawa")).toEqual([{ ...city, country: expected }]);
  });

  test.each([null, [], { results: null }, { results: "ciudades" }, { results: [null] }, { results: [{ ...ottawa, latitude: 91 }] }].map((data) => [data] as const))(
    "rechaza respuestas mal formadas: %j", async (data) => {
      await expect(searchCities(new HttpClient(async () => Response.json(data)), "Ottawa")).rejects.toThrow();
    },
  );

  test("propaga los errores del cliente HTTP", async () => {
    const http = new HttpClient(async () => new Response(null, { status: 503 }));
    await expect(searchCities(http, "Ottawa")).rejects.toThrow("HTTP 503");
  });
});
