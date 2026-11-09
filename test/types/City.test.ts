import { expectTypeOf, test } from "bun:test";
import type { City } from "../../src/types/City.ts";

test("City exige identificador, nombre, país y coordenadas numéricas con región opcional", () => {
  expectTypeOf<City>().toEqualTypeOf<{ id: number; name: string; country: string; region?: string; latitude: number; longitude: number }>();
  expectTypeOf<Omit<City, "region">>().toMatchTypeOf<City>();
  expectTypeOf<Omit<City, "latitude">>().not.toMatchTypeOf<City>();
  expectTypeOf<Omit<City, "id"> & { id: string }>().not.toMatchTypeOf<City>();
});
