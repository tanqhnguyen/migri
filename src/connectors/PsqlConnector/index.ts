import { IConnector, RunOptions } from '../Connector';
import { ILogger } from '../../loggers';
import { Pool } from 'pg';
import { getPool } from './PsqlConnection';

type Args = {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  migrationTable?: string;
};

export class PsqlConnector implements IConnector {
  private client: Pool;
  private logger: ILogger;

  private migrationTable: string;

  constructor(args: Args, logger: ILogger) {
    this.client = getPool(args);
    this.migrationTable = args.migrationTable || 'migrations';
    this.logger = logger;
  }

  public async init(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
        id SERIAL PRIMARY KEY,
        version TEXT UNIQUE,
        created TIMESTAMPTZ DEFAULT NOW(),
        updated TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }

  private async getExecutedVersions(): Promise<string[]> {
    const { rows } = await this.client.query(`
      SELECT version FROM ${this.migrationTable};
    `);
    return rows.map(({ version }) => version);
  }

  public async run(nodes, options: RunOptions = {}): Promise<string[] | null> {
    const executed = await this.getExecutedVersions();

    const missingNodes = nodes.filter(({ version }) => {
      return executed.indexOf(version) === -1;
    });

    if (!missingNodes.length) {
      return [];
    }

    const client = await this.client.connect();
    await client.query('BEGIN');

    const result = [];
    for (const node of missingNodes) {
      const query = node.query
        .trim()
        .replace('\n', '')
        .trim()
        .replace(/\s+/g, ' ');

      try {
        if (!options.onlyVersion) {
          await client.query(query);
        }
        await client.query(
          `
          INSERT INTO ${this.migrationTable} (version) VALUES ($1)
          ON CONFLICT ON CONSTRAINT ${this.migrationTable}_version_key
          DO UPDATE
            SET updated = NOW()
        `,
          [node.version],
        );
        result.push(node);
      } catch (e) {
        this.logger.error('Failed to run [%s]', node.query, e);
        await client.query('ROLLBACK');
        client.release();
        return null;
      }
    }

    try {
      await client.query('COMMIT');
      return result.map(({ version }) => version);
    } catch (e) {
      this.logger.error('Failed to commit the migrations', e);
      return null;
    } finally {
      client.release();
    }
  }

  public async end(): Promise<void> {
    return this.client.end();
  }
}
