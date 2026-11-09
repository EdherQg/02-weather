import type { ConfigState } from "../types/AppConfig.ts";
import type { TemperatureUnit } from "../types/Weather.ts";
import { persistConfig } from "./configStore.ts";

export async function saveTemperatureUnit(state: ConfigState, temperatureUnit: TemperatureUnit): Promise<void> {
  await persistConfig(state, { ...state.config, temperatureUnit });
}
