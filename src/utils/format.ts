import type { City } from "../types/City.ts";
import type { TemperatureUnit } from "../types/Weather.ts";
import { WEATHER_CONDITIONS } from "./constants.ts";

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
  return WEATHER_CONDITIONS[code] ?? `Condición desconocida (código ${code})`;
}

export function formatNumber(value: number): string {
  return numbers.format(value);
}

export function formatDate(date: string): string {
  return dates.format(new Date(`${date}T00:00:00Z`));
}
