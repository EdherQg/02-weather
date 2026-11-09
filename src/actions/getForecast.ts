import { chooseSavedCity, hasSavedCities } from "../presentation/input.ts";
import { formatForecast } from "../presentation/output.ts";
import { getCities } from "../storage/citiesStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import { FORECAST_DAYS } from "../utils/constants.ts";
import { cityLabel } from "../utils/format.ts";

export async function getForecast(context: ActionContext): Promise<void> {
  const { io, weather, config, colors } = context;
  if (!hasSavedCities(io, getCities(context))) return;
  io.write(colors.cyan(`\n  Selecciona la ciudad para el pronóstico de ${FORECAST_DAYS} días:`));
  const city = await chooseSavedCity(io, config, colors);
  if (!city) return;

  io.write(`\n  Consultando el pronóstico de ${cityLabel(city)}...`);
  const result = await weather.getForecast(city, config.temperatureUnit);
  io.write(formatForecast(city, result, config.temperatureUnit, city.id === config.defaultCityId, colors));
}
