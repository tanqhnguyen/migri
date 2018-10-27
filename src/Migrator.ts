import { IParser, Node } from './parsers/Parser';
import { IConnector } from './connectors/Connector';
import { ILogger } from './loggers/Logger';
import { flattenDeep, uniqBy, get } from 'lodash';

type Args = {
  parser: IParser;
  connector: IConnector;
  logger: ILogger;
  migrationDir: string;
};

type RunOptions = {
  versions?: string[];
  onlyVersion?: boolean;
};

export class Migrator {
  private migrationDir: string;
  private parser: IParser;
  private connector: IConnector;
  private logger: ILogger;

  constructor(args: Args) {
    this.parser = args.parser;
    this.migrationDir = args.migrationDir;
    this.logger = args.logger;
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
    const nodesToBeExecuted = flattenDeep<Node>(
      this.getNodesToBeExecuted(nodes),
    ).filter(({ version }) => {
      if (!versions || !versions.length) {
        return true;
      }

      return versions.indexOf(version) !== -1;
    });

    return uniqBy<Node>(nodesToBeExecuted, ({ version }) => version).map(
      ({ version, query }) => {
        return { version, query };
      },
    );
  }

  public async run(options?: RunOptions) {
    const versions = get(options, 'versions', []);
    const onlyVersion = get(options, 'onlyVersion', false);

    const formattedNodes = this.getNodes(versions);

    await this.connector.init();
    const result = await this.connector.run(formattedNodes, { onlyVersion });
    for (const version of result) {
      this.logger.info(`Migrated [${version}]`);
    }
    if (!result.length) {
      this.logger.info('Nothing to run');
    }
    await this.connector.end();
    return result;
  }
}
