import { getLogger, Logger } from 'log4js';
import { ILogger } from './Logger';

type Args = {
  level?: 'debug' | 'info' | 'warn' | 'error';
};

export class ConsoleLogger implements ILogger {
  private logger: Logger;

  constructor(args?: Args) {
    args = args || {};
    this.logger = getLogger('migri');
    this.logger.level = args.level || 'info';
  }

  public error(message: string, ...args: any[]) {
    this.logger.error(message, ...args);
  }
  public warn(message: string, ...args: any[]) {
    this.logger.warn(message, ...args);
  }
  public info(message: string, ...args: any[]) {
    this.logger.info(message, ...args);
  }
  public debug(message: string, ...args: any[]) {
    this.logger.debug(message, ...args);
  }
}
