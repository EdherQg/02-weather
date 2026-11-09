import { hasSavedCities } from "../presentation/input.ts";
import { formatWeather } from "../presentation/output.ts";
import { getCities, getDefaultCity } from "../storage/citiesStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import type { City } from "../types/City.ts";
import { cityLabel } from "../utils/format.ts";

export async function getWeather(context: ActionContext, city: City): Promise<void> {
  const { io, weather, config, colors } = context;
  io.write(`\n  Consultando el clima de ${cityLabel(city)}...`);
  const result = await weather.getWeather(city, config.temperatureUnit);
  io.write(formatWeather(city, result, config.temperatureUnit, city.id === config.defaultCityId, colors));
}

export async function getDefaultWeather(context: ActionContext): Promise<void> {
  if (!hasSavedCities(context.io, getCities(context))) return;
  const city = getDefaultCity(context);
  if (city) await getWeather(context, city);
}
