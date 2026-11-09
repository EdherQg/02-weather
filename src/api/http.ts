import { REQUEST_TIMEOUT_MS } from "../utils/constants.ts";
import { isRecord } from "../utils/validation.ts";

export type Fetcher = (url: URL, options: RequestInit) => Promise<Response>;

export class HttpClient {
  constructor(
    private readonly request: Fetcher = (url, options) => fetch(url, options),
    private readonly timeoutMs = REQUEST_TIMEOUT_MS,
  ) {}

  async getJson(url: URL): Promise<unknown> {
    let response: Response;
    try {
      response = await this.request(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error("Open-Meteo tardó demasiado en responder. Inténtalo de nuevo.", { cause: error });
      }
      throw new Error("No se pudo conectar con Open-Meteo. Revisa tu conexión a Internet.", { cause: error });
    }

    if (response.status === 429) throw new Error("Demasiadas consultas a Open-Meteo. Inténtalo más tarde.");
    if (!response.ok) throw new Error(`Open-Meteo respondió con HTTP ${response.status}. Inténtalo más tarde.`);

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error("Open-Meteo devolvió una respuesta JSON no válida.");
    }
    if (isRecord(data) && data.error === true) {
      throw new Error(`Open-Meteo: ${typeof data.reason === "string" ? data.reason : "consulta no válida"}`);
    }
    return data;
  }
}
