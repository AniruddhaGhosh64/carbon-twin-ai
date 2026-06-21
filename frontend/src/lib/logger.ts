type LogLevel = "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: LogMeta) {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
  }

  info(message: string, meta?: LogMeta) {
    if (process.env.NODE_ENV !== "production") {
      console.log(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, meta?: LogMeta) {
    console.warn(this.formatMessage("warn", message, meta));
  }

  error(message: string, error?: unknown, meta?: LogMeta) {
    const errMeta = error instanceof Error 
      ? { ...meta, errorName: error.name, errorMessage: error.message, stack: error.stack } 
      : { ...meta, errorRaw: error };
    console.error(this.formatMessage("error", message, errMeta));
  }
}

export const logger = new Logger();
export default logger;
