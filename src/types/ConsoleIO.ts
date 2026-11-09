export interface ConsoleIO {
  write(message: string): void;
  ask(question: string): Promise<string | null>;
}
