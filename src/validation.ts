import type { City } from "./types.ts";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isCity(value: unknown): value is City {
  return isRecord(value)
    && isFiniteNumber(value.id) && Number.isSafeInteger(value.id) && value.id > 0
    && typeof value.name === "string" && value.name.trim().length > 0
    && typeof value.country === "string"
    && (value.region === undefined || typeof value.region === "string")
    && isFiniteNumber(value.latitude) && Math.abs(value.latitude) <= 90
    && isFiniteNumber(value.longitude) && Math.abs(value.longitude) <= 180;
}
