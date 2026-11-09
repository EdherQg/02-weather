import { mock } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createDefaultConfig, isConfig } from "../src/storage/configStore.ts";
import type { ActionContext } from "../src/types/ActionContext.ts";
import type { AppConfig, ConfigRepository } from "../src/types/AppConfig.ts";
import type { City } from "../src/types/City.ts";
import type { ConsoleIO } from "../src/types/ConsoleIO.ts";
import type { TemperatureUnit } from "../src/types/Weather.ts";
import type { WeatherService } from "../src/types/WeatherService.ts";
import { plainColors } from "../src/utils/colors.ts";
import { currentWeather, ottawa, weeklyForecast } from "./fixtures.ts";

export const projectDirectory = resolve(import.meta.dir, "..");

export class ScriptedIO implements ConsoleIO {
  readonly output: string[] = [];
  readonly questions: string[] = [];
  private readonly answers: (string | null)[];
  constructor(answers: readonly (string | null)[] = []) { this.answers = [...answers]; }
  write(message: string): void { this.output.push(message); }
  async ask(question: string): Promise<string | null> {
    this.questions.push(question);
    return this.answers.shift() ?? null;
  }
  get text(): string { return this.output.join("\n"); }
}

export class MemoryStore implements ConfigRepository {
  readonly saves: AppConfig[] = [];
  public config: AppConfig;
  constructor(config: AppConfig) { this.config = structuredClone(config); }
  async load(): Promise<AppConfig> { return structuredClone(this.config); }
  async save(config: AppConfig): Promise<void> {
    if (!isConfig(config)) throw new Error("La configuración que se intentó guardar no es válida.");
    this.config = structuredClone(config);
    this.saves.push(structuredClone(config));
  }
}

export function createActionContext(
  answers: readonly (string | null)[] = [],
  config = createDefaultConfig(),
  overrides: Partial<WeatherService> = {},
) {
  const io = new ScriptedIO(answers);
  const store = new MemoryStore(config);
  const weather = {
    searchCities: mock(overrides.searchCities ?? (async (_name: string) => [ottawa])),
    getWeather: mock(overrides.getWeather ?? (async (_city: City, _unit: TemperatureUnit) => currentWeather)),
    getForecast: mock(overrides.getForecast ?? (async (_city: City, _unit: TemperatureUnit) => weeklyForecast)),
  };
  const context: ActionContext = { config: structuredClone(config), store, io, weather, colors: plainColors };
  return { context, io, store, weather };
}

export async function withTestDirectory<T>(prefix: string, run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), `weather-cli-${prefix}-`));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function runBun(
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string; timeoutMs?: number } = {},
) {
  const child = Bun.spawn({
    cmd: [process.execPath, ...args],
    cwd: options.cwd ?? projectDirectory,
    env: { ...process.env, ...options.env },
    stdin: new Blob([options.input ?? ""]),
    stdout: "pipe",
    stderr: "pipe",
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, options.timeoutMs ?? 5_000);

  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    if (timedOut) throw new Error(`El proceso de prueba superó el tiempo límite: bun ${args.join(" ")}`);
    return { stdout, stderr, code };
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null) {
      child.kill();
      await child.exited;
    }
  }
}
