import { expectTypeOf, test } from "bun:test";
import type { ConsoleIO } from "../../src/types/ConsoleIO.ts";
import { Terminal } from "../../src/presentation/terminal.ts";

test("ConsoleIO escribe texto y devuelve una respuesta asíncrona o EOF", () => {
  expectTypeOf<ConsoleIO["write"]>().toEqualTypeOf<(message: string) => void>();
  expectTypeOf<ConsoleIO["ask"]>().toEqualTypeOf<(question: string) => Promise<string | null>>();
  expectTypeOf<Terminal>().toMatchTypeOf<ConsoleIO>();
  expectTypeOf<(question: string) => string>().not.toMatchTypeOf<ConsoleIO["ask"]>();
});
