import { describe, expect, test } from "bun:test";
import { choose, chooseSavedCity, hasSavedCities, isMenuOption } from "../../src/presentation/input.ts";
import { createColors } from "../../src/utils/colors.ts";
import { madrid, ottawa, savedConfig } from "../fixtures.ts";
import { ScriptedIO } from "../helpers.ts";

describe("entrada y selección", () => {
  test.each(["1", "2", "3", "4", "5", "6", "8", "9"])("reconoce la opción %s", (option) => {
    expect(isMenuOption(option)).toBe(true);
  });

  test.each(["", "0", "7", "10", " 1 ", "1.0", "abc"])("rechaza la opción %j", (option) => {
    expect(isMenuOption(option)).toBe(false);
  });

  test("hasSavedCities avisa solo si no hay ciudades", () => {
    const io = new ScriptedIO();
    expect(hasSavedCities(io, [ottawa])).toBe(true);
    expect(io.output).toHaveLength(0);
    expect(hasSavedCities(io, [])).toBe(false);
    expect(io.text).toContain("Usa la opción 3");
  });

  test.each([["1", 0], ["2", 1]] as const)("choose convierte la opción %s a índice %s", async (answer, index) => {
    const io = new ScriptedIO([answer]);
    expect(await choose(io, ["Ottawa", "Madrid"])).toBe(index);
    expect(io.output).toEqual(["  1. Ottawa", "  2. Madrid", "  0. Cancelar"]);
  });

  test("choose rechaza negativos, decimales, texto, números inseguros y opciones fuera de rango", async () => {
    const invalid = ["-1", "1.5", "abc", "9007199254740992", "3", "", "1e0"];
    const io = new ScriptedIO([...invalid, "2"]);
    expect(await choose(io, ["Ottawa", "Madrid"])).toBe(1);
    expect(io.questions).toHaveLength(invalid.length + 1);
    expect(io.output.filter((message) => message.includes("Opción no válida"))).toHaveLength(invalid.length);
  });

  test.each([["0"], []].map((answers) => [answers] as const))("choose devuelve null al cancelar o terminar: %j", async (answers) => {
    expect(await choose(new ScriptedIO(answers), ["Ottawa"])).toBeNull();
  });

  test("chooseSavedCity devuelve la ciudad correcta y marca únicamente la default", async () => {
    const io = new ScriptedIO(["2"]);
    expect(await chooseSavedCity(io, savedConfig())).toEqual(madrid);
    expect(io.output[0]).toContain("Canadá [default]");
    expect(io.output[1]).not.toContain("[default]");
  });

  test("chooseSavedCity devuelve undefined al cancelar", async () => {
    expect(await chooseSavedCity(new ScriptedIO(["0"]), savedConfig())).toBeUndefined();
  });

  test("colorea las opciones, preguntas y validaciones sin modificar la selección", async () => {
    const io = new ScriptedIO(["abc", "1"]);
    expect(await choose(io, ["Ottawa"], createColors(true))).toBe(0);
    expect(io.output[0]).toBe("\x1b[36m  1. Ottawa\x1b[39m");
    expect(io.questions[0]).toStartWith("\x1b[36m");
    expect(io.output.at(-1)).toStartWith("\x1b[31m");
  });
});
