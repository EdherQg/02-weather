import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { AppConfig } from "./types.ts";
import { isCity, isRecord } from "./validation.ts";

export interface ConfigRepository {
  load(): Promise<AppConfig>;
  save(config: AppConfig): Promise<void>;
}

export function createDefaultConfig(): AppConfig {
  return { version: 1, cities: [], defaultCityId: null, temperatureUnit: "celsius" };
}

export function getConfigPath(): string {
  if (process.env.WEATHER_CLI_CONFIG) return resolve(process.env.WEATHER_CLI_CONFIG);

  const home = homedir();
  const directory = process.platform === "win32"
    ? process.env.APPDATA || join(home, "AppData", "Roaming")
    : process.platform === "darwin"
      ? join(home, "Library", "Application Support")
      : process.env.XDG_CONFIG_HOME || join(home, ".config");

  return join(directory, "weather-cli", "config.json");
}

export function isConfig(value: unknown): value is AppConfig {
  if (!isRecord(value) || value.version !== 1
    || !Array.isArray(value.cities) || !value.cities.every(isCity)
    || (value.temperatureUnit !== "celsius" && value.temperatureUnit !== "fahrenheit")) {
    return false;
  }

  const ids = new Set(value.cities.map((city) => city.id));
  return ids.size === value.cities.length
    && (value.cities.length === 0
      ? value.defaultCityId === null
      : typeof value.defaultCityId === "number" && ids.has(value.defaultCityId));
}

export class ConfigStore implements ConfigRepository {
  constructor(readonly path: string = getConfigPath()) {}

  async load(): Promise<AppConfig> {
    let contents: string;
    try {
      contents = await Bun.file(this.path).text();
    } catch (error) {
      if (isRecord(error) && error.code === "ENOENT") return createDefaultConfig();
      throw new Error(`No se pudo leer la configuración en ${this.path}. Revisa los permisos.`, { cause: error });
    }

    let config: unknown;
    try {
      config = JSON.parse(contents);
    } catch {
      throw this.invalidConfigError();
    }
    if (!isConfig(config)) throw this.invalidConfigError();
    return config;
  }

  async save(config: AppConfig): Promise<void> {
    if (!isConfig(config)) throw new Error("La configuración que se intentó guardar no es válida.");

    const temporaryPath = `${this.path}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await Bun.write(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
      await rename(temporaryPath, this.path);
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw new Error(`No se pudo guardar la configuración en ${this.path}. Revisa los permisos y el espacio disponible.`, { cause: error });
    }
  }

  private invalidConfigError(): Error {
    return new Error(`La configuración en ${this.path} no es válida. No se ha sobrescrito. Corrige el archivo o usa WEATHER_CLI_CONFIG para elegir otro.`);
  }
}
