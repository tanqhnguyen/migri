import { IParser, Node } from './parsers/Parser';
import { IConnector } from './connectors/Connector';
import { flattenDeep, uniqBy } from 'lodash';

type Args = {
  parser: IParser;
  connector: IConnector;
  migrationDir: string;
};

export class Migrator {
  private migrationDir: string;
  private parser: IParser;
  private connector: IConnector;

  constructor(args: Args) {
    this.parser = args.parser;
    this.migrationDir = args.migrationDir;
    this.connector = args.connector;
  }

  private getNodesToBeExecuted(nodes: Node[]) {
    return nodes.map(node => {
      if (node.depends) {
        const results = this.getNodesToBeExecuted(node.depends);
        return results.concat(node);
      }
      return node;
    });
  }

  public async run() {
    const nodes = this.parser.parse(this.migrationDir);

    const formatedNodes = flattenDeep(
      uniqBy<Node>(this.getNodesToBeExecuted(nodes), ({ version }) => version),
    );

    return this.connector.execute(formatedNodes);
  }
}
