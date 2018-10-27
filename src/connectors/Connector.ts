import { Node } from '../parsers/Parser';

export type RunOptions = {
  onlyVersion?: boolean; // default false
};

export interface IConnector {
  init(): Promise<void>;
  run(nodes: Node[], options?: RunOptions): Promise<string[] | null>;
  end(): Promise<void>;
}
