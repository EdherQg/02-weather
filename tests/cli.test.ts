import { describe, expect, mock, test } from "bun:test";
import type { WeatherService } from "../src/api.ts";
import { WeatherApp } from "../src/cli.ts";
import { createColors, plainColors, type Colors } from "../src/colors.ts";
import { createDefaultConfig, type ConfigRepository } from "../src/config.ts";
import type { ConsoleIO } from "../src/terminal.ts";
import type { AppConfig, City, TemperatureUnit } from "../src/types.ts";
import { currentWeather, madrid, ottawa, savedConfig, weeklyForecast } from "./fixtures.ts";

class ScriptedIO implements ConsoleIO {
  readonly output: string[] = [];
  readonly questions: string[] = [];
  constructor(private readonly answers: string[]) {}
  write(message: string): void { this.output.push(message); }
  async ask(question: string): Promise<string | null> {
    this.questions.push(question);
    return this.answers.shift() ?? null;
  }
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

function setup(
  answers: string[],
  config = createDefaultConfig(),
  overrides: Partial<WeatherService> = {},
  colors: Colors = plainColors,
) {
  const io = new ScriptedIO(answers);
  const store = new MemoryStore(config);
  const weather = {
    searchCities: mock(async (_name: string) => [ottawa]),
    getWeather: mock(async (_city: City, _unit: TemperatureUnit) => currentWeather),
    getForecast: mock(async (_city: City, _unit: TemperatureUnit) => weeklyForecast),
    ...overrides,
  };
  return { io, store, weather, app: new WeatherApp(io, weather, store, colors) };
}

describe("menú Weather CLI", () => {
  test("muestra el menú del README y orienta al usuario cuando no hay ciudades", async () => {
    const { app, io, weather } = setup(["1", "2", "4", "5", "6", "9"]);
    await app.run();
    expect(io.text).toContain("WEATHER CLI");
    expect(io.text).toContain("Clima de todas las ciudades (0)");
    expect(io.text).toContain("Ajustes (°C)");
    expect(io.text).toContain("6. Pronóstico de 7 días");
    expect(io.text).toContain("Usa la opción 3");
    expect(weather.getWeather).not.toHaveBeenCalled();
    expect(weather.getForecast).not.toHaveBeenCalled();
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

  test("colorea menús, preguntas, temperaturas y confirmaciones sin cambiar el texto", async () => {
    const answers = ["3", "Madrid", "1", "5", "2", "8", "2", "4", "2", "s", "9"];
    const overrides = { searchCities: async () => [madrid] };
    const colored = setup([...answers], savedConfig([ottawa]), overrides, createColors(true));
    const plain = setup([...answers], savedConfig([ottawa]), overrides);
    await colored.app.run();
    await plain.app.run();

    expect(colored.io.output[0]).toStartWith("\x1b[36m");
    expect(colored.io.text).toContain("\x1b[36m\n  Selecciona la ciudad que buscas:\x1b[39m");
    expect(colored.io.text).toContain("\x1b[36m  1. Madrid, Comunidad de Madrid, España\x1b[39m");
    expect(colored.io.text).toContain("\x1b[36m  0. Cancelar\x1b[39m");
    expect(colored.io.text).toContain("Temperatura: \x1b[33m7,4 °C\x1b[39m");
    expect(colored.io.text).toContain("\x1b[32m\n  Ciudad guardada: Madrid, Comunidad de Madrid, España.\x1b[39m");
    expect(colored.io.text).toContain("\x1b[32m\n  Ciudad default: Madrid, Comunidad de Madrid, España.\x1b[39m");
    expect(colored.io.text).toContain("\x1b[32m\n  Temperatura configurada en °F.\x1b[39m");
    expect(colored.io.text).toContain("\x1b[32m\n  Ciudad eliminada: Madrid, Comunidad de Madrid, España.\x1b[39m");
    expect(colored.io.text).toContain("\x1b[32m  Nueva ciudad default: Ottawa, Ontario, Canadá.\x1b[39m");
    for (const question of colored.io.questions) {
      expect(question).toStartWith("\x1b[36m");
      expect(question).toEndWith("\x1b[39m");
    }
    expect(colored.io.output).toContain("\n  Buscando ciudades...");
    expect(colored.io.output).toContain("\n  ¡Hasta pronto!");
    expect(Bun.stripANSI(colored.io.text)).toBe(plain.io.text);
    expect(colored.io.questions.map((question) => Bun.stripANSI(question))).toEqual(plain.io.questions);
    expect(colored.store.config).toEqual(plain.store.config);
    expect(plain.io.text).not.toContain("\x1b[");
  });

  test("resalta en rojo las validaciones y los errores de operaciones", async () => {
    const { app, io } = setup(["7", "3", "", "3", "Ottawa", "abc", "1", "1", "9"], savedConfig(), {
      getWeather: async () => { throw new Error("Sin conexión"); },
    }, createColors(true));
    await app.run();

    expect(io.text).toContain("\x1b[31m\n  Opción no válida. Selecciona 1, 2, 3, 4, 5, 6, 8 o 9.\x1b[39m");
    expect(io.text).toContain("\x1b[31m\n  Escribe el nombre de una ciudad.\x1b[39m");
    expect(io.text).toContain("\x1b[31m  Opción no válida. Elige entre 1 y 1, o 0 para cancelar.\x1b[39m");
    expect(io.text).toContain("\x1b[31m\n  No se pudo completar la operación: Sin conexión\x1b[39m");
  });

  test("resalta el fallo de una ciudad sin colorear de rojo los resultados disponibles", async () => {
    const { app, io } = setup(["2", "9"], savedConfig(), {
      getWeather: async (city) => {
        if (city.id === ottawa.id) throw new Error("Sin conexión");
        return currentWeather;
      },
    }, createColors(true));
    await app.run();

    expect(io.output).toContain("\x1b[31m\n  Ottawa, Ontario, Canadá: Sin conexión\x1b[39m");
    const result = io.output.find((message) => message.includes("  Temperatura:"));
    expect(result).toContain("Temperatura: \x1b[33m7,4 °C\x1b[39m");
    expect(result).not.toContain("\x1b[31m");
  });

  test("consulta el pronóstico de la ciudad seleccionada sin modificar la configuración", async () => {
    const { app, io, store, weather } = setup(["6", "2", "9"], savedConfig());
    await app.run();

    expect(weather.getForecast).toHaveBeenCalledTimes(1);
    expect(weather.getForecast).toHaveBeenCalledWith(madrid, "celsius");
    expect(weather.getWeather).not.toHaveBeenCalled();
    expect(io.text).toContain("Selecciona la ciudad para el pronóstico de 7 días");
    expect(io.text).toContain("Consultando el pronóstico de Madrid, Comunidad de Madrid, España...");
    expect(io.text).toContain("Pronóstico de 7 días (desde mañana)");
    expect(io.text).toContain("29/10/2026");
    expect(io.text).toContain("04/11/2026");
    expect(io.text).not.toContain("28/10/2026");
    expect(store.saves).toHaveLength(0);
    expect(store.config).toEqual(savedConfig());
  });

  test.each(["celsius", "fahrenheit"] as const)("el pronóstico respeta la unidad %s y marca la ciudad default", async (unit) => {
    const { app, io, weather } = setup(["6", "1", "9"], { ...savedConfig(), temperatureUnit: unit });
    await app.run();

    expect(weather.getForecast).toHaveBeenCalledWith(ottawa, unit);
    expect(io.text).toContain("Ottawa, Ontario, Canadá [default]");
    expect(io.text).toContain(`Mínima: -2,0 ${unit === "celsius" ? "°C" : "°F"}`);
  });

  test.each([
    ["cancelación", ["6", "0", "9"]],
    ["fin de entrada", ["6"]],
    ["selección inválida y cancelación", ["6", "abc", "99", "0", "9"]],
  ] as const)("no consulta ni guarda al abandonar el pronóstico: %s", async (_name, answers) => {
    const { app, io, store, weather } = setup([...answers], savedConfig());
    await app.run();

    expect(weather.getForecast).not.toHaveBeenCalled();
    expect(store.saves).toHaveLength(0);
    expect(io.text).toContain("¡Hasta pronto!");
  });

  test("un error de pronóstico vuelve al menú y permite consultar el clima actual", async () => {
    const { app, io, store, weather } = setup(["6", "1", "1", "9"], savedConfig(), {
      getForecast: async () => { throw new Error("No hay pronóstico disponible"); },
    }, createColors(true));
    await app.run();

    expect(io.text).toContain("\x1b[31m\n  No se pudo completar la operación: No hay pronóstico disponible\x1b[39m");
    expect(weather.getWeather).toHaveBeenCalledWith(ottawa, "celsius");
    expect(io.text).toContain("Temperatura: \x1b[33m7,4 °C\x1b[39m");
    expect(io.text).toContain("¡Hasta pronto!");
    expect(store.saves).toHaveLength(0);
  });

  test("mantiene los colores del pronóstico y las preguntas sin cambiar su contenido", async () => {
    const colored = setup(["6", "1", "9"], savedConfig(), {}, createColors(true));
    const plain = setup(["6", "1", "9"], savedConfig());
    await colored.app.run();
    await plain.app.run();

    expect(colored.io.text).toContain("\x1b[36m  Pronóstico de 7 días (desde mañana)\x1b[39m");
    expect(colored.io.text).toContain("Mínima: \x1b[33m-2,0 °C\x1b[39m");
    expect(colored.io.text).toContain("Máxima: \x1b[33m7,0 °C\x1b[39m");
    for (const question of colored.io.questions) expect(question).toStartWith("\x1b[36m");
    expect(Bun.stripANSI(colored.io.text)).toBe(plain.io.text);
    expect(plain.io.text).not.toContain("\x1b[");
  });
});
