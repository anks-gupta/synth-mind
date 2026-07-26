export interface ILogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug?(message: string, ...args: unknown[]): void;
}

export class DefaultLogger implements ILogger {
  private prefix: string;

  constructor(prefix: string = 'Queue') {
    this.prefix = prefix;
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`${new Date().toISOString()} [${this.prefix}] [INFO]: ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`${new Date().toISOString()} [${this.prefix}] [WARN]: ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`${new Date().toISOString()} [${this.prefix}] [ERROR]: ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`${new Date().toISOString()} [${this.prefix}] [DEBUG]: ${message}`, ...args);
    }
  }
}
