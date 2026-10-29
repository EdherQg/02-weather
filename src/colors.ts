export interface Colors {
  cyan(text: string): string;
  yellow(text: string): string;
  green(text: string): string;
  red(text: string): string;
}

export function supportsColor(
  isTTY: boolean | undefined = process.stdout.isTTY,
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return Boolean(isTTY) && env.NO_COLOR === undefined && env.TERM !== "dumb";
}

export function createColors(enabled = supportsColor()): Colors {
  const wrap = (code: number) => (text: string): string =>
    enabled ? `\x1b[${code}m${text}\x1b[39m` : text;

  return {
    cyan: wrap(36),
    yellow: wrap(33),
    green: wrap(32),
    red: wrap(31),
  };
}

export const plainColors = createColors(false);
