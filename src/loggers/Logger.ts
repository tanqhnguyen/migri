export interface ILogger {
  debug(message: string, ...args: any[]);
  info(message: string, ...args: any[]);
  warn(message: string, ...args: any[]);
  error(message: string, ...args: any[]);
}
