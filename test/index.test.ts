import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { projectDirectory, runBun, withTestDirectory } from "./helpers.ts";

const { scripts } = await Bun.file(join(projectDirectory, "package.json")).json() as {
  scripts: Record<string, string>;
};
const build = scripts.build ?? "";
const compile = "bun build --compile --minify ./src/index.ts --outfile dist/weather";

describe("punto de entrada y estructura de las pruebas", () => {
  test("cada módulo de src tiene exactamente un archivo de pruebas en la misma ruta", () => {
    const sourceFiles = [...new Bun.Glob("**/*.ts").scanSync({ cwd: join(projectDirectory, "src") })];
    const testFiles = [...new Bun.Glob("**/*.test.ts").scanSync({ cwd: join(projectDirectory, "test") })];
    const expected = sourceFiles.map((path) => path.replaceAll("\\", "/").replace(/\.ts$/, ".test.ts")).sort();
    expect(sourceFiles.length).toBeGreaterThan(0);
    expect(testFiles.map((path) => path.replaceAll("\\", "/")).sort()).toEqual(expected);
  });

  test("importar index no inicia el menú ni accede a la configuración", async () => {
    await withTestDirectory("index", async (directory) => {
      const configPath = join(directory, "config.json");
      await Bun.write(configPath, "JSON corrupto que no debe leerse");
      const result = await runBun(["-e", 'await import("./src/index.ts"); console.log("importado");'], {
        env: { WEATHER_CLI_CONFIG: configPath },
      });
      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.trim()).toBe("importado");
      expect(await Bun.file(configPath).text()).toBe("JSON corrupto que no debe leerse");
    });
  });

  test("como programa principal conecta las dependencias y sale con código cero", async () => {
    await withTestDirectory("index", async (directory) => {
      const configPath = join(directory, "config.json");
      const result = await runBun(["src/index.ts"], { input: "9\n", env: { WEATHER_CLI_CONFIG: configPath } });
      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("WEATHER CLI");
      expect(result.stdout).toContain("¡Hasta pronto!");
      expect(await Bun.file(configPath).exists()).toBe(false);
    });
  });
});

describe("compilación condicionada a las comprobaciones", () => {
  test("el comando real exige tipos y pruebas antes de compilar", () => {
    expect(scripts.test).toBe("bun test ./test");
    expect(build).toBe(`bun run check && bun run test && ${compile}`);
  });

  test.each([
    ["tipos incorrectos", "1", "0", ["check"], false],
    ["pruebas fallidas", "0", "1", ["check", "test"], false],
    ["comprobaciones correctas", "0", "0", ["check", "test", "build"], true],
  ] as const)("respeta el orden y el bloqueo con %s", async (_name, checkFailure, testFailure, expectedSteps, success) => {
    await withTestDirectory("build", async (directory) => {
      // Preserve the real command chain; replace only the compiler to avoid creating a binary in tests.
      expect(build.endsWith(compile)).toBe(true);
      const sandboxBuild = `${build.slice(0, -compile.length)}bun run ./compile.ts`;
      const recordStep = 'const log = Bun.file("steps.json"); const steps = await log.exists() ? await log.json() : [];';
      const artifact = join(directory, "dist", "weather");

      await Bun.write(join(directory, "package.json"), JSON.stringify({
        type: "module",
        scripts: { check: "bun run ./check.ts", test: scripts.test, build: sandboxBuild },
      }));
      await Bun.write(join(directory, "check.ts"), `${recordStep}
        await Bun.write(log, JSON.stringify([...steps, "check"]));
        process.exit(Number(process.env.CHECK_FAILURE));
      `);
      await Bun.write(join(directory, "test", "gate.test.ts"), `
        import { expect, test } from "bun:test";
        test("fallo controlado", async () => {
          ${recordStep}
          await Bun.write(log, JSON.stringify([...steps, "test"]));
          expect(process.env.TEST_FAILURE).toBe("0");
        });
      `);
      await Bun.write(join(directory, "compile.ts"), `${recordStep}
        await Bun.write(log, JSON.stringify([...steps, "build"]));
        await Bun.write("dist/weather", "compilado");
      `);
      await Bun.write(artifact, "ejecutable anterior");

      const result = await runBun(["run", "build"], {
        cwd: directory, env: { CHECK_FAILURE: checkFailure, TEST_FAILURE: testFailure },
      });

      expect(result.code === 0).toBe(success);
      expect(await Bun.file(join(directory, "steps.json")).json()).toEqual([...expectedSteps]);
      expect(await Bun.file(artifact).text()).toBe(success ? "compilado" : "ejecutable anterior");
    });
  });
});
