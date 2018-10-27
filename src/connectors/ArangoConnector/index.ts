import { IConnector, RunOptions } from '../Connector';
import { ILogger } from '../../loggers';
import { Database } from 'arangojs';
import { getDb } from './ArangoConnection';

import { Node } from '../../parsers/Parser';

type Args = {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  migrationCollection?: string;
};

export class ArangoConnector implements IConnector {
  private db: Database;
  private logger: ILogger;
  private args: Args;

  private migrationCollection: string;

  constructor(args: Args, logger: ILogger) {
    this.migrationCollection = args.migrationCollection || 'migrations';
    this.logger = logger;
    this.args = args;

    this.logger.info(this.migrationCollection);
  }

  public async init(): Promise<void> {
    this.db = await getDb(this.args);
    const collection = this.db.collection(this.migrationCollection);
    const exists = await collection.exists();
    if (!exists) {
      await collection.create();
    }
  }

  private async getExecutedVersions(): Promise<string[]> {
    const result = await this.db.query(`
      FOR entry IN ${this.migrationCollection}
        RETURN {version: entry.version }
    `);
    const all = await result.all();
    return all.map(({ version }) => version);
  }

  // There are no easy ways to do transaction for Arangodb :(
  public async run(
    nodes: Node[],
    options: RunOptions = {},
  ): Promise<string[] | null> {
    const executed = await this.getExecutedVersions();

    const missingNodes = nodes.filter(({ version }) => {
      return executed.indexOf(version) === -1;
    });

    if (!missingNodes.length) {
      return [];
    }

    const result = [];
    for (const node of missingNodes) {
      const fn =
        typeof node.query === 'string'
          ? db => {
              const query = node.query
                .trim()
                .replace('\n', '')
                .trim()
                .replace(/\s+/g, ' ');
              return db.query(query);
            }
          : node.query;
      try {
        if (!options.onlyVersion) {
          await fn(this.db);
        }
        await this.db.query(
          `
            UPSERT {
              version: @version
            }
            INSERT {
              version: @version,
              _created: DATE_ISO8601(DATE_NOW()),
              _updated: DATE_ISO8601(DATE_NOW())
            }
            UPDATE {
              version: @version,
              _updated: DATE_ISO8601(DATE_NOW())
            } IN ${this.migrationCollection}
            RETURN MERGE({_new: !OLD}, NEW)
        `,
          {
            version: node.version,
          },
        );
        result.push(node);
      } catch (e) {
        this.logger.error('Failed to run [%s]', node.version, e);
        return null;
      }
    }

    return result.map(({ version }) => version);
  }

  public async end(): Promise<void> {
    await this.db.close();
  }
}
