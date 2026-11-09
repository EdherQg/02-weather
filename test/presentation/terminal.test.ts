import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { runBun, withTestDirectory } from "../helpers.ts";

test("la CLI procesa varias líneas por stdin y conserva ajustes al reiniciar", async () => {
  await withTestDirectory("terminal", async (directory) => {
    const configPath = join(directory, "config.json");

    async function run(input: string, env: NodeJS.ProcessEnv = {}) {
      const { stdout, stderr, code } = await runBun(["src/index.ts"], {
        input, env: { ...env, WEATHER_CLI_CONFIG: configPath },
      });
      expect(stderr).toBe("");
      expect(code).toBe(0);
      expect(stdout).not.toContain("\x1b[");
      return stdout;
    }

    expect(await run("8\n2\n9\n")).toContain("Temperatura configurada en °F");
    expect((await Bun.file(configPath).json()).temperatureUnit).toBe("fahrenheit");
    const output = await run("1\n6\n9\n");
    expect(output).toContain("Ajustes (°F)");
    expect(output).toContain("No hay ciudades guardadas");
    expect(output).toContain("6. Pronóstico de 7 días");
    expect(output).toContain("¡Hasta pronto!");
    expect(await run("8\n1\n9\n", { NO_COLOR: "1" })).toContain("Temperatura configurada en °C");
  });
}, 15_000);

describe("fin de entrada de la CLI", () => {
  test.each([
    ["entrada vacía", ""],
    ["EOF dentro de los ajustes", "8\n"],
    ["espacios y líneas CRLF", " 8 \r\n 0 \r\n 9 \r\n"],
  ])("termina limpiamente con %s sin crear configuración", async (_name, input) => {
    await withTestDirectory("terminal", async (directory) => {
      const configPath = join(directory, "config.json");
      const result = await runBun(["src/index.ts"], { input, env: { WEATHER_CLI_CONFIG: configPath } });

      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("¡Hasta pronto!");
      expect(result.stdout).not.toContain("Opción no válida");
      expect(result.stdout).not.toContain("\x1b[");
      expect(await Bun.file(configPath).exists()).toBe(false);
    });
  });
});

describe("Terminal directamente con stdin aislado", () => {
  test("ask conserva las líneas pendientes, recorta espacios y devuelve null al terminar", async () => {
    const result = await runBun(["-e", `
      import { Terminal } from "./src/presentation/terminal.ts";
      const listeners = process.listenerCount("SIGINT");
      const terminal = new Terminal();
      try {
        const answers = [await terminal.ask("Primera: "), await terminal.ask("Segunda: "), await terminal.ask("Fin: ")];
        terminal.write("RESULT:" + JSON.stringify(answers));
      } finally { terminal.close(); }
      console.log("LISTENERS:" + (process.listenerCount("SIGINT") - listeners));
    `], { input: " primera \r\n segunda \r\n" });
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain('RESULT:["primera","segunda",null]');
    expect(result.stdout).toContain("LISTENERS:0");
  });

  test("SIGINT interrumpe las preguntas y close retira su listener incluso al repetirse", async () => {
    const result = await runBun(["-e", `
      import { Terminal } from "./src/presentation/terminal.ts";
      const listeners = process.listenerCount("SIGINT");
      const terminal = new Terminal();
      process.emit("SIGINT");
      const answer = await terminal.ask("No debe imprimirse");
      terminal.close();
      terminal.close();
      console.log(JSON.stringify({ answer, listeners: process.listenerCount("SIGINT") - listeners }));
    `]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe('{"answer":null,"listeners":0}');
  });
});
