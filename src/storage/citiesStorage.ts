import type { ConfigState } from "../types/AppConfig.ts";
import type { City } from "../types/City.ts";
import { persistConfig } from "./configStore.ts";

export function getCities(state: ConfigState): readonly City[] {
  return state.config.cities;
}

export function getDefaultCity(state: ConfigState): City | undefined {
  return state.config.cities.find((city) => city.id === state.config.defaultCityId);
}

export async function saveCity(state: ConfigState, city: City): Promise<void> {
  await persistConfig(state, {
    ...state.config,
    cities: [...state.config.cities, city],
    defaultCityId: state.config.defaultCityId ?? city.id,
  });
}

export async function deleteCity(state: ConfigState, cityId: number): Promise<void> {
  const cities = state.config.cities.filter((city) => city.id !== cityId);
  await persistConfig(state, {
    ...state.config,
    cities,
    defaultCityId: cityId === state.config.defaultCityId ? cities[0]?.id ?? null : state.config.defaultCityId,
  });
}

export async function saveDefaultCity(state: ConfigState, cityId: number): Promise<void> {
  await persistConfig(state, { ...state.config, defaultCityId: cityId });
}
