import { IParser, Node } from './parsers/Parser';
import { IConnector } from './connectors/Connector';
import { flattenDeep, uniqBy } from 'lodash';

type Args = {
  parser: IParser;
  connector: IConnector;
  migrationDir: string;
};

type RunOptions = {
  versions?: string[];
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

  public getNodes(versions?: string[]): Node[] {
    const nodes = this.parser.parse(this.migrationDir);

    return uniqBy<Node>(
      flattenDeep<Node>(this.getNodesToBeExecuted(nodes)),
      ({ version }) => version,
    )
      .filter(({ version }) => {
        if (!versions || !versions.length) {
          return true;
        }

        return versions.indexOf(version) !== -1;
      })
      .map(({ version, query }) => {
        return { version, query };
      });
  }

  public async run(options?: RunOptions) {
    const optionsWithDefaultValues: RunOptions = {
      versions: [],
      ...(options || {}),
    };

    const formattedNodes = this.getNodes(optionsWithDefaultValues.versions);

    await this.connector.init();
    const result = await this.connector.run(formattedNodes);
    await this.connector.end();
    return result;
  }
}
