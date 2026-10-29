import { OpenMeteoClient } from "./src/api.ts";
import { WeatherApp } from "./src/cli.ts";
import { createColors } from "./src/colors.ts";
import { ConfigStore } from "./src/config.ts";
import { Terminal } from "./src/terminal.ts";

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
