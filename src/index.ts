import { OpenMeteoClient } from "./api/client.ts";
import { WeatherApp } from "./presentation/menu.ts";
import { Terminal } from "./presentation/terminal.ts";
import { ConfigStore } from "./storage/configStore.ts";
import { createColors } from "./utils/colors.ts";

if (import.meta.main) {
  const terminal = new Terminal();
  const colors = createColors();

  try {
    await new WeatherApp(terminal, new OpenMeteoClient(), new ConfigStore(), colors).run();
  } catch (error) {
    terminal.write(colors.red(`\nError: ${error instanceof Error ? error.message : String(error)}`));
    process.exitCode = 1;
  } finally {
    terminal.close();
  }
}
