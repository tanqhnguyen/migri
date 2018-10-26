import { ILogger } from './Logger';

// for testing
export class EmptyLogger implements ILogger {
  public error(message: string) {
    console.log('\x1b[36m%s\x1b[0m', 'This is an expected error: ', message);
  }
  public warn(message: string) {
    console.log('\x1b[36m%s\x1b[0m', 'This is an expected warning: ', message);
  }
  public info() {}
  public debug() {}
}
