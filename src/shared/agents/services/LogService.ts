type LogLevel = "debug" | "info" | "warn" | "error";

class LogService {
  private level: LogLevel = "info";

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  info(message: any): void {
    if (this.level === "info") {
      console.log(message);
    }
  }

  warn(message: any): void {
    if (this.level === "info" || this.level === "warn") {
      console.warn(message);
    }
  }

  error(message: any): void {
    if (
      this.level === "info" ||
      this.level === "warn" ||
      this.level === "error"
    ) {
      console.error(message);
    }
  }

  debug(message: any): void {
    if (this.level === "debug") {
      console.log(message);
    }
  }
}

export default LogService;
export type { LogLevel };
