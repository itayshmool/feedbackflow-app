// backend/src/shared/utils/logger.ts

export class Logger {
  info(message: string, meta?: any): void {
    console.log(message, meta ?? '');
  }

  error(message: string, meta?: any): void {
    console.error(message, meta ?? '');
  }

  warn(message: string, meta?: any): void {
    console.warn(message, meta ?? '');
  }

  debug(message: string, meta?: any): void {
    console.debug(message, meta ?? '');
  }
}


