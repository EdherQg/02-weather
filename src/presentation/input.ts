import type { AppConfig } from "../types/AppConfig.ts";
import type { City } from "../types/City.ts";
import type { Colors } from "../types/Colors.ts";
import type { ConsoleIO } from "../types/ConsoleIO.ts";
import type { MenuOption } from "../types/MenuOption.ts";
import { plainColors } from "../utils/colors.ts";
import { MENU_OPTIONS } from "../utils/constants.ts";
import { cityLabel } from "../utils/format.ts";
import { writeError } from "./output.ts";

export function isMenuOption(value: string): value is MenuOption {
  return MENU_OPTIONS.some((option) => option === value);
}

export function hasSavedCities(io: ConsoleIO, cities: readonly City[]): boolean {
  if (cities.length > 0) return true;
  io.write("\n  No hay ciudades guardadas. Usa la opción 3 para buscar y agregar una.");
  return false;
}

export async function choose(
  io: ConsoleIO,
  items: readonly string[],
  colors: Colors = plainColors,
): Promise<number | null> {
  items.forEach((item, index) => io.write(colors.cyan(`  ${index + 1}. ${item}`)));
  io.write(colors.cyan("  0. Cancelar"));

  while (true) {
    const answer = await io.ask(colors.cyan("  Selecciona una opción: "));
    if (answer === null || answer === "0") return null;
    const number = /^\d+$/.test(answer) ? Number(answer) : NaN;
    if (Number.isSafeInteger(number) && number >= 1 && number <= items.length) return number - 1;
    writeError(io, `  Opción no válida. Elige entre 1 y ${items.length}, o 0 para cancelar.`, colors);
  }
}

export async function chooseSavedCity(
  io: ConsoleIO,
  config: AppConfig,
  colors: Colors = plainColors,
): Promise<City | undefined> {
  const index = await choose(io, config.cities.map((city) =>
    `${cityLabel(city)}${city.id === config.defaultCityId ? " [default]" : ""}`,
  ), colors);
  return index === null ? undefined : config.cities[index];
}
