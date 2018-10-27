import { BaseParser } from './BaseParser';

import * as yaml from 'js-yaml';
import * as fs from 'fs';

export class YamlParser extends BaseParser {
  public readFile(path: string) {
    const content = fs.readFileSync(path).toString();
    return yaml.safeLoad(content);
  }
}
