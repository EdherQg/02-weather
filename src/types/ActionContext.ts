import type { ConfigState } from "./AppConfig.ts";
import type { Colors } from "./Colors.ts";
import type { ConsoleIO } from "./ConsoleIO.ts";
import type { WeatherService } from "./WeatherService.ts";

export interface ActionContext extends ConfigState {
  io: ConsoleIO;
  weather: WeatherService;
  colors: Colors;
}
