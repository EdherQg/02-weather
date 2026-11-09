import { choose } from "../presentation/input.ts";
import { writeError } from "../presentation/output.ts";
import { getCities, saveCity } from "../storage/citiesStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import { cityLabel } from "../utils/format.ts";
import { getWeather } from "./getWeather.ts";

export async function addCity(context: ActionContext): Promise<void> {
  const { io, weather, colors } = context;
  const name = await io.ask(colors.cyan("  Nombre de la ciudad (0 para cancelar): "));
  if (name === null || name === "0") return;
  if (!name.trim()) {
    writeError(io, "\n  Escribe el nombre de una ciudad.", colors);
    return;
  }

  io.write("\n  Buscando ciudades...");
  const cities = await weather.searchCities(name);
  if (cities.length === 0) {
    io.write("\n  No se encontraron ciudades con ese nombre. Prueba otra búsqueda.");
    return;
  }

  const savedCities = getCities(context);
  io.write(colors.cyan("\n  Selecciona la ciudad que buscas:"));
  const index = await choose(io, cities.map((city) =>
    `${cityLabel(city)}${savedCities.some((saved) => saved.id === city.id) ? " [guardada]" : ""}`,
  ), colors);
  const city = index === null ? undefined : cities[index];
  if (!city) return;
  if (savedCities.some((saved) => saved.id === city.id)) {
    io.write("\n  Esa ciudad ya está guardada.");
    return;
  }

  const isFirst = savedCities.length === 0;
  await saveCity(context, city);
  io.write(colors.green(`\n  Ciudad guardada: ${cityLabel(city)}.${isFirst ? " Es tu ciudad default." : ""}`));
  await getWeather(context, city);
}
