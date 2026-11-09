import { describe, expect, test } from "bun:test";
import { HttpClient } from "../../src/api/http.ts";

const url = new URL("https://example.invalid/weather");

describe("HttpClient", () => {
  test("entrega la URL y una señal de cancelación al transporte inyectado", async () => {
    const http = new HttpClient(async (requested, options) => {
      expect(requested).toBe(url);
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(options.signal?.aborted).toBe(false);
      return Response.json({ temperature: 0 });
    });
    expect(await http.getJson(url)).toEqual({ temperature: 0 });
  });

  test("el transporte por defecto utiliza fetch sin necesitar Internet", async () => {
    expect(await new HttpClient().getJson(new URL('data:application/json,{"ok":true}'))).toEqual({ ok: true });
  });

  test.each([400, 404, 500, 503])("identifica el error HTTP %s", async (status) => {
    const http = new HttpClient(async () => new Response(null, { status }));
    await expect(http.getJson(url)).rejects.toThrow(`HTTP ${status}`);
  });

  test("distingue el límite de consultas de otros errores HTTP", async () => {
    const http = new HttpClient(async () => new Response(null, { status: 429 }));
    await expect(http.getJson(url)).rejects.toThrow("Demasiadas consultas");
  });

  test("informa de JSON mal formado", async () => {
    const http = new HttpClient(async () => new Response("{incompleto"));
    await expect(http.getJson(url)).rejects.toThrow("JSON no válida");
  });

  test.each([["detalle", "detalle"], [undefined, "consulta no válida"], [42, "consulta no válida"]] as const)(
    "interpreta el error de API con motivo %s", async (reason, message) => {
      const http = new HttpClient(async () => Response.json({ error: true, reason }));
      await expect(http.getJson(url)).rejects.toThrow(`Open-Meteo: ${message}`);
    },
  );

  test.each(["AbortError", "TimeoutError"])("traduce %s y conserva la causa original", async (name) => {
    const cause = new DOMException("interrumpido", name);
    const http = new HttpClient(async () => { throw cause; });
    await expect(http.getJson(url)).rejects.toMatchObject({ message: expect.stringContaining("tardó demasiado"), cause });
  });

  test("traduce errores de red y conserva la causa", async () => {
    const cause = new TypeError("fetch failed");
    const http = new HttpClient(async () => { throw cause; });
    await expect(http.getJson(url)).rejects.toMatchObject({ message: expect.stringContaining("conexión a Internet"), cause });
  });

  test("aborta una solicitud que no termina dentro del límite", async () => {
    const http = new HttpClient((_url, options) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    }), 10);
    await expect(http.getJson(url)).rejects.toThrow("tardó demasiado");
  });
});
