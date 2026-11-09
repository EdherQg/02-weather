import type { City } from "../types/City.ts";
import type { Colors } from "../types/Colors.ts";
import type { ConsoleIO } from "../types/ConsoleIO.ts";
import type { Forecast, TemperatureUnit, Weather } from "../types/Weather.ts";
import { plainColors } from "../utils/colors.ts";
import { FORECAST_DAYS } from "../utils/constants.ts";
import { cityLabel, formatDate, formatNumber, unitLabel, weatherDescription } from "../utils/format.ts";

export function writeError(io: ConsoleIO, message: string, colors: Colors = plainColors): void {
  io.write(colors.red(message));
}

export function formatWeather(
  city: City,
  weather: Weather,
  unit: TemperatureUnit,
  isDefault: boolean,
  colors: Colors = plainColors,
): string {
  const symbol = unitLabel(unit);
  return [
    `\n  ${cityLabel(city)}${isDefault ? " [default]" : ""}`,
    `  ${weatherDescription(weather.weatherCode)}`,
    `  Temperatura: ${colors.yellow(`${formatNumber(weather.temperature)} ${symbol}`)}`,
    `  Sensación térmica: ${colors.yellow(`${formatNumber(weather.apparentTemperature)} ${symbol}`)}`,
    `  Humedad: ${weather.humidity} % | Viento: ${formatNumber(weather.windSpeed)} km/h`,
    `  Actualizado: ${weather.time.replace("T", " ")} (${weather.timezone})`,
    "  Fuente: Open-Meteo",
  ].join("\n");
}

export function formatForecast(
  city: City,
  forecast: Forecast,
  unit: TemperatureUnit,
  isDefault: boolean,
  colors: Colors = plainColors,
): string {
  const symbol = unitLabel(unit);
  return [
    `\n  ${cityLabel(city)}${isDefault ? " [default]" : ""}`,
    colors.cyan(`  Pronóstico de ${FORECAST_DAYS} días (desde mañana)`),
    `  Zona horaria: ${forecast.timezone}`,
    ...forecast.days.map((day) => [
      `  ${formatDate(day.date)}: ${weatherDescription(day.weatherCode)}`,
      `    Mínima: ${colors.yellow(`${formatNumber(day.temperatureMin)} ${symbol}`)} | Máxima: ${colors.yellow(`${formatNumber(day.temperatureMax)} ${symbol}`)}`,
    ].join("\n")),
    "  Fuente: Open-Meteo",
  ].join("\n");
}
