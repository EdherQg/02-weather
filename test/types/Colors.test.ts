import { expectTypeOf, test } from "bun:test";
import type { Colors } from "../../src/types/Colors.ts";
import { createColors } from "../../src/utils/colors.ts";

test("Colors ofrece cuatro transformaciones de texto y createColors respeta el contrato", () => {
  expectTypeOf<keyof Colors>().toEqualTypeOf<"cyan" | "yellow" | "green" | "red">();
  expectTypeOf<Colors[keyof Colors]>().toEqualTypeOf<(text: string) => string>();
  expectTypeOf<typeof createColors>().returns.toEqualTypeOf<Colors>();
  expectTypeOf<Partial<Colors>>().not.toMatchTypeOf<Colors>();
});
