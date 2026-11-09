import { hasSavedCities } from "../presentation/input.ts";
import { formatWeather, writeError } from "../presentation/output.ts";
import { getCities } from "../storage/citiesStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import { cityLabel } from "../utils/format.ts";

// The existing list option shows every saved city together with its current weather.
export async function listCities(context: ActionContext): Promise<void> {
  const { io, weather, config, colors } = context;
  const cities = getCities(context);
  if (!hasSavedCities(io, cities)) return;
  io.write("\n  Consultando el clima de todas las ciudades...");
  const results = await Promise.allSettled(
    cities.map((city) => weather.getWeather(city, config.temperatureUnit)),
  );

  for (const [index, result] of results.entries()) {
    const city = cities[index];
    if (!city) continue;
    if (result.status === "fulfilled") {
      io.write(formatWeather(city, result.value, config.temperatureUnit, city.id === config.defaultCityId, colors));
    } else {
      const error: unknown = result.reason;
      writeError(io, `\n  ${cityLabel(city)}: ${error instanceof Error ? error.message : "No se pudo consultar el clima."}`, colors);
    }
  }
}
