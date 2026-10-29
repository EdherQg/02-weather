import { describe, expect, mock, test } from "bun:test";
import type { WeatherService } from "../src/api.ts";
import { WeatherApp } from "../src/cli.ts";
import { createDefaultConfig, type ConfigRepository } from "../src/config.ts";
import type { ConsoleIO } from "../src/terminal.ts";
import type { AppConfig, City, TemperatureUnit } from "../src/types.ts";
import { currentWeather, madrid, ottawa, savedConfig } from "./fixtures.ts";

class ScriptedIO implements ConsoleIO {
  readonly output: string[] = [];
  constructor(private readonly answers: string[]) {}
  write(message: string): void { this.output.push(message); }
  async ask(_question: string): Promise<string | null> { return this.answers.shift() ?? null; }
  get text(): string { return this.output.join("\n"); }
}

class MemoryStore implements ConfigRepository {
  readonly saves: AppConfig[] = [];
  constructor(public config: AppConfig) {}
  async load(): Promise<AppConfig> { return structuredClone(this.config); }
  async save(config: AppConfig): Promise<void> {
    this.config = structuredClone(config);
    this.saves.push(this.config);
  }
}

function setup(answers: string[], config = createDefaultConfig(), overrides: Partial<WeatherService> = {}) {
  const io = new ScriptedIO(answers);
  const store = new MemoryStore(config);
  const weather = {
    searchCities: mock(async (_name: string) => [ottawa]),
    getWeather: mock(async (_city: City, _unit: TemperatureUnit) => currentWeather),
    ...overrides,
  };
  return { io, store, weather, app: new WeatherApp(io, weather, store) };
}

describe("menú Weather CLI", () => {
  test("muestra el menú del README y orienta al usuario cuando no hay ciudades", async () => {
    const { app, io, weather } = setup(["1", "2", "4", "5", "9"]);
    await app.run();
    expect(io.text).toContain("WEATHER CLI");
    expect(io.text).toContain("Clima de todas las ciudades (0)");
    expect(io.text).toContain("Ajustes (°C)");
    expect(io.text).toContain("Usa la opción 3");
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test("busca, guarda y consulta una ciudad; la primera es default", async () => {
    const { app, io, store, weather } = setup(["3", "Ottawa", "1", "9"]);
    await app.run();
    expect(weather.searchCities).toHaveBeenCalledWith("Ottawa");
    expect(weather.getWeather).toHaveBeenCalledWith(ottawa, "celsius");
    expect(store.config.cities).toEqual([ottawa]);
    expect(store.config.defaultCityId).toBe(ottawa.id);
    expect(io.text).toContain("Clima de todas las ciudades (1)");
    expect(io.text).toContain("Temperatura: 7,4 °C");
  });

  test("permite elegir entre coincidencias sin duplicar ciudades guardadas", async () => {
    const { app, store } = setup(["3", "Madrid", "2", "3", "Ottawa", "1", "9"], savedConfig([ottawa]), {
      searchCities: async () => [ottawa, madrid],
    });
    await app.run();
    expect(store.config.cities).toEqual([ottawa, madrid]);
    expect(store.config.defaultCityId).toBe(ottawa.id);
    expect(store.saves).toHaveLength(1);
  });

  test("cambia default y unidades, consulta todas y reasigna default al eliminarla", async () => {
    const { app, io, store, weather } = setup(
      ["5", "2", "8", "2", "1", "2", "4", "2", "s", "9"], savedConfig(),
    );
    await app.run();
    expect(weather.getWeather).toHaveBeenCalledWith(madrid, "fahrenheit");
    expect(weather.getWeather).toHaveBeenCalledWith(ottawa, "fahrenheit");
    expect(store.config).toEqual({ ...savedConfig([ottawa]), temperatureUnit: "fahrenheit" });
    expect(store.saves).toHaveLength(3);
    expect(io.text).toContain("Ajustes (°F)");
    expect(io.text).toContain("Nueva ciudad default: Ottawa");
  });

  test("eliminar la última ciudad deja default en null", async () => {
    const { app, store } = setup(["4", "1", "sí", "9"], savedConfig([ottawa]));
    await app.run();
    expect(store.config).toEqual(createDefaultConfig());
  });

  test("cancelar selecciones o no confirmar la eliminación no modifica los datos", async () => {
    const { app, store } = setup(["3", "0", "5", "0", "8", "0", "4", "1", "n", "9"], savedConfig());
    await app.run();
    expect(store.saves).toHaveLength(0);
    expect(store.config).toEqual(savedConfig());
  });

  test("maneja búsquedas sin coincidencias", async () => {
    const { app, io, store } = setup(["3", "no-existe", "9"], createDefaultConfig(), { searchCities: async () => [] });
    await app.run();
    expect(io.text).toContain("No se encontraron ciudades");
    expect(store.saves).toHaveLength(0);
  });

  test("valida el menú, nombres vacíos y selecciones numéricas", async () => {
    const { app, io, store } = setup(["7", "3", "", "3", "Ottawa", "1.5", "abc", "99", "1", "9"]);
    await app.run();
    expect(io.text).toContain("Opción no válida");
    expect(io.text).toContain("Escribe el nombre");
    expect(store.config.cities).toEqual([ottawa]);
  });

  test("un fallo al guardar no cambia el estado ni consulta una ciudad no guardada", async () => {
    const { app, io, store, weather } = setup(["3", "Ottawa", "1", "9"]);
    store.save = async () => { throw new Error("Sin permisos para guardar"); };
    await app.run();
    expect(io.text).toContain("Sin permisos para guardar");
    expect(io.text).not.toContain("Ciudad guardada:");
    expect(store.config.cities).toEqual([]);
    expect(weather.getWeather).not.toHaveBeenCalled();
  });

  test("muestra los resultados disponibles aunque falle una ciudad", async () => {
    const { app, io } = setup(["2", "9"], savedConfig(), {
      getWeather: async (city) => {
        if (city.id === ottawa.id) throw new Error("Sin conexión para Ottawa");
        return currentWeather;
      },
    });
    await app.run();
    expect(io.text).toContain("Sin conexión para Ottawa");
    expect(io.text).toContain("Madrid, Comunidad de Madrid, España");
    expect(io.text).toContain("Temperatura:");
  });

  test("vuelve al menú tras un error de la API", async () => {
    const { app, io } = setup(["1", "9"], savedConfig(), {
      getWeather: async () => { throw new Error("Revisa tu conexión a Internet"); },
    });
    await app.run();
    expect(io.text).toContain("Revisa tu conexión a Internet");
    expect(io.text).toContain("¡Hasta pronto!");
  });

  test("sale limpiamente al terminar la entrada, incluso dentro de una selección", async () => {
    const { app, io, store } = setup(["3", "Ottawa"]);
    await app.run();
    expect(io.text).toContain("¡Hasta pronto!");
    expect(store.saves).toHaveLength(0);
  });
});
