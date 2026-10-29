import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("la CLI procesa varias líneas por stdin y conserva ajustes al reiniciar", async () => {
  const directory = await mkdtemp(join(tmpdir(), "weather-cli-terminal-"));
  const configPath = join(directory, "config.json");

  async function run(input: string, env: Record<string, string> = {}) {
    const child = Bun.spawn({
      cmd: [process.execPath, "index.ts"],
      cwd: resolve(import.meta.dir, ".."),
      env: { ...process.env, ...env, WEATHER_CLI_CONFIG: configPath },
      stdin: new Blob([input]),
      stdout: "pipe",
      stderr: "pipe",
    });
    const timer = setTimeout(() => child.kill(), 5_000);
    try {
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect(stderr).toBe("");
      expect(code).toBe(0);
      expect(stdout).not.toContain("\x1b[");
      return stdout;
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    expect(await run("8\n2\n9\n")).toContain("Temperatura configurada en °F");
    expect((await Bun.file(configPath).json()).temperatureUnit).toBe("fahrenheit");
    const output = await run("1\n9\n");
    expect(output).toContain("Ajustes (°F)");
    expect(output).toContain("No hay ciudades guardadas");
    expect(output).toContain("¡Hasta pronto!");
    expect(await run("8\n1\n9\n", { NO_COLOR: "1" })).toContain("Temperatura configurada en °C");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 15_000);
