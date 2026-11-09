import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deleteCity, saveCity, saveDefaultCity } from "../src/storage/citiesStorage.ts";
import { ConfigStore, createDefaultConfig, isConfig } from "../src/storage/configStore.ts";
import { saveTemperatureUnit } from "../src/storage/settingsStorage.ts";
import type { ConfigState } from "../src/types/AppConfig.ts";
import { madrid, ottawa, savedConfig } from "./fixtures.ts";

describe("configuración persistente", () => {
  let directory: string;
  let store: ConfigStore;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "weather-cli-test-"));
    store = new ConfigStore(join(directory, "settings", "config.json"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  test("comienza sin ciudades y en Celsius cuando no existe el archivo", async () => {
    expect(await store.load()).toEqual(createDefaultConfig());
    expect(await Bun.file(store.path).exists()).toBe(false);
  });

  test("crea el directorio y conserva ciudades, default y unidades al volver a abrir", async () => {
    const config = { ...savedConfig(), temperatureUnit: "fahrenheit" as const, defaultCityId: 3117735 };
    await store.save(config);
    expect(await new ConfigStore(store.path).load()).toEqual(config);
  });

  test("reemplaza una configuración existente", async () => {
    await store.save(savedConfig());
    await store.save(createDefaultConfig());
    expect(await store.load()).toEqual(createDefaultConfig());
  });

  test("no sobrescribe un archivo con JSON corrupto", async () => {
    await Bun.write(store.path, "{no es JSON");
    await expect(store.load()).rejects.toThrow("No se ha sobrescrito");
    expect(await Bun.file(store.path).text()).toBe("{no es JSON");
  });

  test("rechaza una configuración inválida sin modificar lo guardado", async () => {
    await store.save(savedConfig());
    await expect(store.save({ ...savedConfig(), defaultCityId: 999 })).rejects.toThrow("no es válida");
    expect(await store.load()).toEqual(savedConfig());
  });

  test("rechaza archivos con un esquema no válido", async () => {
    await Bun.write(store.path, JSON.stringify({ cities: [] }));
    await expect(store.load()).rejects.toThrow("no es válida");
  });

  test("ciudades y ajustes comparten el mismo archivo sin sobrescribir cambios anteriores", async () => {
    const state: ConfigState = { config: await store.load(), store };
    await saveCity(state, ottawa);
    await saveTemperatureUnit(state, "fahrenheit");
    await saveCity(state, madrid);
    await saveDefaultCity(state, madrid.id);

    expect(await new ConfigStore(store.path).load()).toEqual({
      ...savedConfig(), defaultCityId: madrid.id, temperatureUnit: "fahrenheit",
    });
    await deleteCity(state, madrid.id);
    expect(state.config).toEqual({ ...savedConfig([ottawa]), temperatureUnit: "fahrenheit" });
    expect(await Bun.file(store.path).json()).toEqual(state.config);

    await deleteCity(state, ottawa.id);
    expect(await store.load()).toEqual({ ...createDefaultConfig(), temperatureUnit: "fahrenheit" });
  });

  test("un cambio inválido no reemplaza el estado compartido ni los datos del archivo", async () => {
    await store.save(savedConfig());
    const state: ConfigState = { config: await store.load(), store };
    const previous = state.config;

    await expect(saveDefaultCity(state, 999)).rejects.toThrow("no es válida");
    await expect(saveCity(state, ottawa)).rejects.toThrow("no es válida");
    expect(state.config).toBe(previous);
    expect(await store.load()).toEqual(savedConfig());
  });
});

describe("validación de configuración", () => {
  test("acepta el estado inicial y ciudades válidas", () => {
    expect(isConfig(createDefaultConfig())).toBe(true);
    expect(isConfig(savedConfig())).toBe(true);
  });

  test("rechaza referencias default inexistentes, ciudades duplicadas y unidades desconocidas", () => {
    expect(isConfig({ ...savedConfig(), defaultCityId: null })).toBe(false);
    expect(isConfig({ ...savedConfig(), defaultCityId: 123 })).toBe(false);
    expect(isConfig(savedConfig([ottawa, ottawa]))).toBe(false);
    expect(isConfig({ ...savedConfig(), temperatureUnit: "kelvin" })).toBe(false);
    expect(isConfig({ ...createDefaultConfig(), defaultCityId: ottawa.id })).toBe(false);
  });

  test("rechaza coordenadas fuera de rango y versiones desconocidas", () => {
    expect(isConfig(savedConfig([{ ...ottawa, latitude: 91 }]))).toBe(false);
    expect(isConfig(savedConfig([{ ...ottawa, longitude: -181 }]))).toBe(false);
    expect(isConfig(savedConfig([{ ...ottawa, latitude: NaN }]))).toBe(false);
    expect(isConfig({ ...savedConfig(), version: 2 })).toBe(false);
    expect(isConfig(null)).toBe(false);
  });
});
