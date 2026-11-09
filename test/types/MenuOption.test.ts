import { expectTypeOf, test } from "bun:test";
import type { MenuOption } from "../../src/types/MenuOption.ts";
import { MENU_OPTIONS } from "../../src/utils/constants.ts";

test("MenuOption coincide con las opciones del menú y excluye valores no soportados", () => {
  expectTypeOf<MenuOption>().toEqualTypeOf<"1" | "2" | "3" | "4" | "5" | "6" | "8" | "9">();
  expectTypeOf<typeof MENU_OPTIONS[number]>().toEqualTypeOf<MenuOption>();
  expectTypeOf<"7" | "0">().not.toMatchTypeOf<MenuOption>();
  expectTypeOf<number>().not.toMatchTypeOf<MenuOption>();
});
