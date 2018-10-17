import { Node } from '../parsers/Parser';

type RunOptions = {};

export interface IConnector {
  init(): Promise<void>;
  run(nodes: Node[], options?: RunOptions): Promise<string[] | null>;
  end(): Promise<void>;
}
