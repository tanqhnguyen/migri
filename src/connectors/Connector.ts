import { Node } from '../parsers/Parser';

export interface IConnector {
  init(): Promise<void>;
  execute(nodes: Node[]): Promise<boolean>;
  end(): Promise<void>;
}
