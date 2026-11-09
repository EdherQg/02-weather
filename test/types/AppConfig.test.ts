import { expectTypeOf, test } from "bun:test";
import type { AppConfig, ConfigRepository, ConfigState } from "../../src/types/AppConfig.ts";
import type { City } from "../../src/types/City.ts";
import type { TemperatureUnit } from "../../src/types/Weather.ts";

test("AppConfig mantiene el esquema versionado y una referencia default anulable", () => {
  expectTypeOf<AppConfig>().toEqualTypeOf<{ version: 1; cities: City[]; defaultCityId: number | null; temperatureUnit: TemperatureUnit }>();
  expectTypeOf<Omit<AppConfig, "version"> & { version: 2 }>().not.toMatchTypeOf<AppConfig>();
});

test("ConfigRepository es asíncrono y ConfigState comparte la configuración y el repositorio", () => {
  expectTypeOf<ConfigRepository["load"]>().toEqualTypeOf<() => Promise<AppConfig>>();
  expectTypeOf<ConfigRepository["save"]>().toEqualTypeOf<(config: AppConfig) => Promise<void>>();
  expectTypeOf<ConfigState>().toEqualTypeOf<{ config: AppConfig; store: ConfigRepository }>();
});
