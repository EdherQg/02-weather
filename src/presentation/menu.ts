import { addCity } from "../actions/addCity.ts";
import { changeSettings } from "../actions/changeSettings.ts";
import { getForecast } from "../actions/getForecast.ts";
import { getDefaultWeather } from "../actions/getWeather.ts";
import { listCities } from "../actions/listCities.ts";
import { removeCity } from "../actions/removeCity.ts";
import { setDefaultCity } from "../actions/setDefaultCity.ts";
import { createDefaultConfig } from "../storage/configStore.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import type { AppConfig, ConfigRepository } from "../types/AppConfig.ts";
import type { Colors } from "../types/Colors.ts";
import type { ConsoleIO } from "../types/ConsoleIO.ts";
import type { MenuOption } from "../types/MenuOption.ts";
import type { WeatherService } from "../types/WeatherService.ts";
import { plainColors } from "../utils/colors.ts";
import { FORECAST_DAYS, MENU_BORDER, MENU_OPTIONS } from "../utils/constants.ts";
import { unitLabel } from "../utils/format.ts";
import { isMenuOption } from "./input.ts";
import { writeError } from "./output.ts";

const actions: Record<Exclude<MenuOption, "9">, (context: ActionContext) => Promise<void>> = {
  "1": getDefaultWeather,
  "2": listCities,
  "3": addCity,
  "4": removeCity,
  "5": setDefaultCity,
  "6": getForecast,
  "8": changeSettings,
};

export function formatMenu(config: AppConfig): string {
  const labels: Record<MenuOption, string> = {
    "1": "Clima de ciudad default",
    "2": `Clima de todas las ciudades (${config.cities.length})`,
    "3": "Buscar y agregar ciudad",
    "4": "Eliminar ciudad",
    "5": "Establecer ciudad default",
    "6": `Pronóstico de ${FORECAST_DAYS} días`,
    "8": `Ajustes (${unitLabel(config.temperatureUnit)})`,
    "9": "Salir",
  };

  return [
    `\n${MENU_BORDER}`,
    "         WEATHER CLI",
    MENU_BORDER,
    ...MENU_OPTIONS.map((option) => `  ${option}. ${labels[option]}`),
    MENU_BORDER,
  ].join("\n");
}

export class WeatherApp {
  private readonly context: ActionContext;

  constructor(io: ConsoleIO, weather: WeatherService, store: ConfigRepository, colors: Colors = plainColors) {
    this.context = { config: createDefaultConfig(), io, weather, store, colors };
  }

  async run(): Promise<void> {
    const { io, store, colors } = this.context;
    this.context.config = await store.load();

    while (true) {
      io.write(colors.cyan(formatMenu(this.context.config)));
      const option = await io.ask(colors.cyan("  Selecciona una opción: "));
      if (option === null) break;
      if (!isMenuOption(option)) {
        writeError(io, "\n  Opción no válida. Selecciona 1, 2, 3, 4, 5, 6, 8 o 9.", colors);
        continue;
      }
      if (option === "9") break;

      try {
        await actions[option](this.context);
      } catch (error) {
        writeError(io, `\n  No se pudo completar la operación: ${error instanceof Error ? error.message : String(error)}`, colors);
      }
    }

    io.write("\n  ¡Hasta pronto!");
  }
}
