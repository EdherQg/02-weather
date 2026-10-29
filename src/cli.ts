import type { WeatherService } from "./api.ts";
import { plainColors, type Colors } from "./colors.ts";
import { createDefaultConfig, type ConfigRepository } from "./config.ts";
import { cityLabel, formatWeather, unitLabel } from "./presentation.ts";
import type { ConsoleIO } from "./terminal.ts";
import type { AppConfig, City } from "./types.ts";

const border = "════════════════════════════════════════";

export class WeatherApp {
  private config = createDefaultConfig();

  constructor(
    private readonly io: ConsoleIO,
    private readonly weather: WeatherService,
    private readonly store: ConfigRepository,
    private readonly colors: Colors = plainColors,
  ) {}

  async run(): Promise<void> {
    this.config = await this.store.load();

    while (true) {
      this.io.write(this.colors.cyan([
        `\n${border}`,
        "         WEATHER CLI",
        border,
        "  1. Clima de ciudad default",
        `  2. Clima de todas las ciudades (${this.config.cities.length})`,
        "  3. Buscar y agregar ciudad",
        "  4. Eliminar ciudad",
        "  5. Establecer ciudad default",
        `  8. Ajustes (${unitLabel(this.config.temperatureUnit)})`,
        "  9. Salir",
        border,
      ].join("\n")));

      const option = await this.io.ask(this.colors.cyan("  Selecciona una opción: "));
      if (option === null || option === "9") break;

      try {
        switch (option) {
          case "1": await this.showDefaultWeather(); break;
          case "2": await this.showAllWeather(); break;
          case "3": await this.addCity(); break;
          case "4": await this.removeCity(); break;
          case "5": await this.setDefaultCity(); break;
          case "8": await this.changeSettings(); break;
          default: this.io.write(this.colors.red("\n  Opción no válida. Selecciona 1, 2, 3, 4, 5, 8 o 9."));
        }
      } catch (error) {
        this.io.write(this.colors.red(`\n  No se pudo completar la operación: ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    this.io.write("\n  ¡Hasta pronto!");
  }

  private hasCities(): boolean {
    if (this.config.cities.length > 0) return true;
    this.io.write("\n  No hay ciudades guardadas. Usa la opción 3 para buscar y agregar una.");
    return false;
  }

  private async showDefaultWeather(): Promise<void> {
    if (!this.hasCities()) return;
    const city = this.config.cities.find((item) => item.id === this.config.defaultCityId);
    if (city) await this.showCityWeather(city);
  }

  private async showCityWeather(city: City): Promise<void> {
    this.io.write(`\n  Consultando el clima de ${cityLabel(city)}...`);
    const result = await this.weather.getWeather(city, this.config.temperatureUnit);
    this.io.write(formatWeather(city, result, this.config.temperatureUnit, city.id === this.config.defaultCityId, this.colors));
  }

  private async showAllWeather(): Promise<void> {
    if (!this.hasCities()) return;
    this.io.write("\n  Consultando el clima de todas las ciudades...");
    const results = await Promise.allSettled(
      this.config.cities.map((city) => this.weather.getWeather(city, this.config.temperatureUnit)),
    );

    for (const [index, result] of results.entries()) {
      const city = this.config.cities[index];
      if (!city) continue;
      if (result.status === "fulfilled") {
        this.io.write(formatWeather(city, result.value, this.config.temperatureUnit, city.id === this.config.defaultCityId, this.colors));
      } else {
        const error: unknown = result.reason;
        this.io.write(this.colors.red(`\n  ${cityLabel(city)}: ${error instanceof Error ? error.message : "No se pudo consultar el clima."}`));
      }
    }
  }

  private async addCity(): Promise<void> {
    const name = await this.io.ask(this.colors.cyan("  Nombre de la ciudad (0 para cancelar): "));
    if (name === null || name === "0") return;
    if (!name.trim()) {
      this.io.write(this.colors.red("\n  Escribe el nombre de una ciudad."));
      return;
    }

    this.io.write("\n  Buscando ciudades...");
    const cities = await this.weather.searchCities(name);
    if (cities.length === 0) {
      this.io.write("\n  No se encontraron ciudades con ese nombre. Prueba otra búsqueda.");
      return;
    }

    this.io.write(this.colors.cyan("\n  Selecciona la ciudad que buscas:"));
    const index = await this.choose(cities.map((city) =>
      `${cityLabel(city)}${this.config.cities.some((saved) => saved.id === city.id) ? " [guardada]" : ""}`,
    ));
    const city = index === null ? undefined : cities[index];
    if (!city) return;
    if (this.config.cities.some((saved) => saved.id === city.id)) {
      this.io.write("\n  Esa ciudad ya está guardada.");
      return;
    }

    const isFirst = this.config.cities.length === 0;
    await this.persist({
      ...this.config,
      cities: [...this.config.cities, city],
      defaultCityId: this.config.defaultCityId ?? city.id,
    });
    this.io.write(this.colors.green(`\n  Ciudad guardada: ${cityLabel(city)}.${isFirst ? " Es tu ciudad default." : ""}`));
    await this.showCityWeather(city);
  }

  private async removeCity(): Promise<void> {
    if (!this.hasCities()) return;
    this.io.write(this.colors.cyan("\n  Selecciona la ciudad que quieres eliminar:"));
    const city = await this.chooseSavedCity();
    if (!city) return;
    const confirmation = await this.io.ask(this.colors.cyan(`  ¿Eliminar ${cityLabel(city)}? (s/N): `));
    if (!confirmation || !["s", "si", "sí"].includes(confirmation.toLowerCase())) {
      this.io.write("\n  Eliminación cancelada.");
      return;
    }

    const cities = this.config.cities.filter((saved) => saved.id !== city.id);
    const defaultChanged = city.id === this.config.defaultCityId;
    await this.persist({
      ...this.config,
      cities,
      defaultCityId: defaultChanged ? cities[0]?.id ?? null : this.config.defaultCityId,
    });
    this.io.write(this.colors.green(`\n  Ciudad eliminada: ${cityLabel(city)}.`));
    if (defaultChanged && cities[0]) this.io.write(this.colors.green(`  Nueva ciudad default: ${cityLabel(cities[0])}.`));
  }

  private async setDefaultCity(): Promise<void> {
    if (!this.hasCities()) return;
    this.io.write(this.colors.cyan("\n  Selecciona tu ciudad default:"));
    const city = await this.chooseSavedCity();
    if (!city) return;
    if (city.id === this.config.defaultCityId) {
      this.io.write("\n  Esa ya es tu ciudad default.");
      return;
    }
    await this.persist({ ...this.config, defaultCityId: city.id });
    this.io.write(this.colors.green(`\n  Ciudad default: ${cityLabel(city)}.`));
  }

  private async changeSettings(): Promise<void> {
    this.io.write(this.colors.cyan("\n  Unidad de temperatura:"));
    const index = await this.choose(["Celsius (°C)", "Fahrenheit (°F)"]);
    if (index === null) return;
    const temperatureUnit = index === 0 ? "celsius" : "fahrenheit";
    await this.persist({ ...this.config, temperatureUnit });
    this.io.write(this.colors.green(`\n  Temperatura configurada en ${unitLabel(temperatureUnit)}.`));
  }

  private async chooseSavedCity(): Promise<City | undefined> {
    const index = await this.choose(this.config.cities.map((city) =>
      `${cityLabel(city)}${city.id === this.config.defaultCityId ? " [default]" : ""}`,
    ));
    return index === null ? undefined : this.config.cities[index];
  }

  private async choose(items: string[]): Promise<number | null> {
    items.forEach((item, index) => this.io.write(this.colors.cyan(`  ${index + 1}. ${item}`)));
    this.io.write(this.colors.cyan("  0. Cancelar"));

    while (true) {
      const answer = await this.io.ask(this.colors.cyan("  Selecciona una opción: "));
      if (answer === null || answer === "0") return null;
      const number = /^\d+$/.test(answer) ? Number(answer) : NaN;
      if (Number.isSafeInteger(number) && number >= 1 && number <= items.length) return number - 1;
      this.io.write(this.colors.red(`  Opción no válida. Elige entre 1 y ${items.length}, o 0 para cancelar.`));
    }
  }

  private async persist(config: AppConfig): Promise<void> {
    await this.store.save(config);
    this.config = config;
  }
}
