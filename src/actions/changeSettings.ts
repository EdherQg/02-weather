import { choose } from "../presentation/input.ts";
import { saveTemperatureUnit } from "../storage/settingsStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import { unitLabel } from "../utils/format.ts";

export async function changeSettings(context: ActionContext): Promise<void> {
  const { io, colors } = context;
  io.write(colors.cyan("\n  Unidad de temperatura:"));
  const index = await choose(io, ["Celsius (°C)", "Fahrenheit (°F)"], colors);
  if (index === null) return;
  const temperatureUnit = index === 0 ? "celsius" : "fahrenheit";
  await saveTemperatureUnit(context, temperatureUnit);
  io.write(colors.green(`\n  Temperatura configurada en ${unitLabel(temperatureUnit)}.`));
}
