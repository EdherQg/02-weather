import { expectTypeOf, test } from "bun:test";
import type { ActionContext } from "../../src/types/ActionContext.ts";
import type { AppConfig, ConfigRepository, ConfigState } from "../../src/types/AppConfig.ts";
import type { Colors } from "../../src/types/Colors.ts";
import type { ConsoleIO } from "../../src/types/ConsoleIO.ts";
import type { WeatherService } from "../../src/types/WeatherService.ts";

test("ActionContext exige estado compartido, consola, servicio y colores", () => {
  expectTypeOf<ActionContext>().toEqualTypeOf<{
    config: AppConfig; store: ConfigRepository; io: ConsoleIO; weather: WeatherService; colors: Colors;
  }>();
  expectTypeOf<ConfigState>().not.toMatchTypeOf<ActionContext>();
  expectTypeOf<Omit<ActionContext, "store">>().not.toMatchTypeOf<ActionContext>();
});
