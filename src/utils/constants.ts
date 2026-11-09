import type { MenuOption } from "../types/MenuOption.ts";

export const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
export const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
export const REQUEST_TIMEOUT_MS = 10_000;
export const FORECAST_DAYS = 7;
export const MENU_BORDER = "════════════════════════════════════════";
export const MENU_OPTIONS = ["1", "2", "3", "4", "5", "6", "8", "9"] as const satisfies readonly MenuOption[];

export const WEATHER_CONDITIONS: Readonly<Record<number, string>> = {
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
