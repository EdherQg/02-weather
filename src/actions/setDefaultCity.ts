import { chooseSavedCity, hasSavedCities } from "../presentation/input.ts";
import { getCities, saveDefaultCity } from "../storage/citiesStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import { cityLabel } from "../utils/format.ts";

export async function setDefaultCity(context: ActionContext): Promise<void> {
  const { io, config, colors } = context;
  if (!hasSavedCities(io, getCities(context))) return;
  io.write(colors.cyan("\n  Selecciona tu ciudad default:"));
  const city = await chooseSavedCity(io, config, colors);
  if (!city) return;
  if (city.id === config.defaultCityId) {
    io.write("\n  Esa ya es tu ciudad default.");
    return;
  }
  await saveDefaultCity(context, city.id);
  io.write(colors.green(`\n  Ciudad default: ${cityLabel(city)}.`));
}
