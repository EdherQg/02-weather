import { createInterface, type Interface } from "node:readline";

export interface ConsoleIO {
  write(message: string): void;
  ask(question: string): Promise<string | null>;
}

export class Terminal implements ConsoleIO {
  private readonly readline: Interface;
  private readonly lines: AsyncIterableIterator<string>;
  private inputClosed = false;
  private interrupted = false;
  private readonly interrupt = () => {
    this.interrupted = true;
    this.readline.close();
  };

  constructor() {
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: Boolean(process.stdin.isTTY && process.stdout.isTTY),
      crlfDelay: Infinity,
    });
    // Keep a single iterator so piped input is buffered even during HTTP requests.
    this.lines = this.readline[Symbol.asyncIterator]();
    this.readline.on("close", () => { this.inputClosed = true; });
    this.readline.on("SIGINT", this.interrupt);
    process.on("SIGINT", this.interrupt);
  }

  write(message: string): void {
    console.log(message);
  }

  async ask(question: string): Promise<string | null> {
    if (this.interrupted) return null;
    this.readline.setPrompt(question);
    // EOF can close readline while the iterator still has buffered answers.
    if (this.inputClosed) process.stdout.write(question);
    else this.readline.prompt();
    const line = await this.lines.next();
    if (!process.stdin.isTTY) process.stdout.write("\n");
    return line.done ? null : line.value.trim();
  }

  close(): void {
    process.off("SIGINT", this.interrupt);
    this.readline.close();
  }
}
