import { BaseParser } from './BaseParser';

export class JsModuleParser extends BaseParser {
  public readFile(path: string) {
    return require(path);
  }
}
