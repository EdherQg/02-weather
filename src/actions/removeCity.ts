import { chooseSavedCity, hasSavedCities } from "../presentation/input.ts";
import { deleteCity, getCities } from "../storage/citiesStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import { cityLabel } from "../utils/format.ts";

export async function removeCity(context: ActionContext): Promise<void> {
  const { io, config, colors } = context;
  if (!hasSavedCities(io, getCities(context))) return;
  io.write(colors.cyan("\n  Selecciona la ciudad que quieres eliminar:"));
  const city = await chooseSavedCity(io, config, colors);
  if (!city) return;
  const confirmation = await io.ask(colors.cyan(`  ¿Eliminar ${cityLabel(city)}? (s/N): `));
  if (!confirmation || !["s", "si", "sí"].includes(confirmation.toLowerCase())) {
    io.write("\n  Eliminación cancelada.");
    return;
  }

  const defaultChanged = city.id === config.defaultCityId;
  await deleteCity(context, city.id);
  io.write(colors.green(`\n  Ciudad eliminada: ${cityLabel(city)}.`));
  const newDefault = getCities(context)[0];
  if (defaultChanged && newDefault) io.write(colors.green(`  Nueva ciudad default: ${cityLabel(newDefault)}.`));
}
