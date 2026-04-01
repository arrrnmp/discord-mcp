export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  if (!context || Object.keys(context).length === 0) {
    return base;
  }

  return `${base} ${JSON.stringify(context)}`;
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    process.stderr.write(`${formatMessage('debug', message, context)}\n`);
  },
  info(message: string, context?: LogContext): void {
    process.stderr.write(`${formatMessage('info', message, context)}\n`);
  },
  warn(message: string, context?: LogContext): void {
    process.stderr.write(`${formatMessage('warn', message, context)}\n`);
  },
  error(message: string, context?: LogContext): void {
    process.stderr.write(`${formatMessage('error', message, context)}\n`);
  },
};
