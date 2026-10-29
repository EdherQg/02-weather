import { OpenMeteoClient } from "./src/api.ts";
import { WeatherApp } from "./src/cli.ts";
import { ConfigStore } from "./src/config.ts";
import { Terminal } from "./src/terminal.ts";

if (import.meta.main) {
  const terminal = new Terminal();

  try {
    await new WeatherApp(terminal, new OpenMeteoClient(), new ConfigStore()).run();
  } catch (error) {
    terminal.write(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    terminal.close();
  }
}
