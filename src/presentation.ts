import { plainColors, type Colors } from "./colors.ts";
import type { City, Forecast, TemperatureUnit, Weather } from "./types.ts";

const conditions: Record<number, string> = {
  0: "Cielo despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna intensa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia intensa",
  66: "Lluvia helada ligera",
  67: "Lluvia helada intensa",
  71: "Nieve ligera",
  73: "Nieve moderada",
  75: "Nieve intensa",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos intensos",
  85: "Chubascos de nieve ligeros",
  86: "Chubascos de nieve intensos",
  95: "Tormenta eléctrica",
  96: "Tormenta con granizo ligero",
  99: "Tormenta con granizo intenso",
};

const numbers = new Intl.NumberFormat("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
// API daily dates are already local calendar dates, not timestamps to convert.
const dates = new Intl.DateTimeFormat("es", {
  weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
});

export function cityLabel(city: City): string {
  return [...new Set([city.name, city.region, city.country].filter(Boolean))].join(", ");
}

export function unitLabel(unit: TemperatureUnit): string {
  return unit === "celsius" ? "°C" : "°F";
}

export function weatherDescription(code: number): string {
  return conditions[code] ?? `Condición desconocida (código ${code})`;
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
    `  Temperatura: ${colors.yellow(`${numbers.format(weather.temperature)} ${symbol}`)}`,
    `  Sensación térmica: ${colors.yellow(`${numbers.format(weather.apparentTemperature)} ${symbol}`)}`,
    `  Humedad: ${weather.humidity} % | Viento: ${numbers.format(weather.windSpeed)} km/h`,
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
    colors.cyan("  Pronóstico de 7 días (desde mañana)"),
    `  Zona horaria: ${forecast.timezone}`,
    ...forecast.days.map((day) => [
      `  ${dates.format(new Date(`${day.date}T00:00:00Z`))}: ${weatherDescription(day.weatherCode)}`,
      `    Mínima: ${colors.yellow(`${numbers.format(day.temperatureMin)} ${symbol}`)} | Máxima: ${colors.yellow(`${numbers.format(day.temperatureMax)} ${symbol}`)}`,
    ].join("\n")),
    "  Fuente: Open-Meteo",
  ].join("\n");
}
