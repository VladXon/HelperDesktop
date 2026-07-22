let _gracefulShutdown: (() => void) | null = null;

export function setGracefulShutdown(fn: () => void): void {
  _gracefulShutdown = fn;
}

export function getGracefulShutdown(): (() => void) | null {
  return _gracefulShutdown;
}