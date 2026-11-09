import type { City } from "./City.ts";
import type { TemperatureUnit } from "./Weather.ts";

export interface AppConfig {
  version: 1;
  cities: City[];
  defaultCityId: number | null;
  temperatureUnit: TemperatureUnit;
}

export interface ConfigRepository {
  load(): Promise<AppConfig>;
  save(config: AppConfig): Promise<void>;
}

export interface ConfigState {
  config: AppConfig;
  store: ConfigRepository;
}
