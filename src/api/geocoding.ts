import type { City } from "../types/City.ts";
import { GEOCODING_URL } from "../utils/constants.ts";
import { isCity, isRecord } from "../utils/validation.ts";
import type { HttpClient } from "./http.ts";

export async function searchCities(http: HttpClient, name: string): Promise<City[]> {
  const query = name.trim();
  if (!query) throw new Error("Escribe el nombre de una ciudad.");

  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({ name: query, count: "5", language: "es", format: "json" }).toString();
  const data = await http.getJson(url);
  if (!isRecord(data)) throw new Error("La respuesta de coordenadas no es válida.");
  if (data.results === undefined) return [];
  if (!Array.isArray(data.results)) throw new Error("La respuesta de coordenadas no es válida.");

  return data.results.map((result: unknown) => {
    if (!isRecord(result)) throw new Error("Open-Meteo devolvió una ciudad no válida.");
    const city = {
      id: result.id,
      name: result.name,
      country: typeof result.country === "string" ? result.country
        : typeof result.country_code === "string" ? result.country_code : "",
      ...(typeof result.admin1 === "string" ? { region: result.admin1 } : {}),
      latitude: result.latitude,
      longitude: result.longitude,
    };
    if (!isCity(city)) throw new Error("Open-Meteo devolvió una ciudad con coordenadas no válidas.");
    return city;
  });
}
