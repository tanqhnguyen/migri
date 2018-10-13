import { IConnector } from './Connector';
import { Pool } from 'pg';

type Args = {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  migrationTable?: string;
};

const GET_EXECUTED_NODES = `
  SELECT version FROM migrations;
`;

export class PsqlConnector implements IConnector {
  public client: Pool;

  private migrationTable: string;

  constructor(args: Args) {
    this.client = new Pool({
      user: args.username,
      database: args.database,
      password: args.password,
      port: args.port,
      host: args.host,
    });

    this.migrationTable = args.migrationTable || 'migrations';
  }

  public async init(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
        version TEXT PRIMARY KEY,
        created TIMESTAMPTZ DEFAULT NOW(),
        modified TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }

  private async getExecutedVersions(): Promise<string[]> {
    const { rows } = await this.client.query(GET_EXECUTED_NODES);
    return rows.map(({ version }) => version);
  }

  public async execute(nodes): Promise<boolean> {
    const executed = await this.getExecutedVersions();
    const client = await this.client.connect();
    await client.query('BEGIN');

    const missingNodes = nodes.filter(({ version }) => {
      return executed.indexOf(version) === -1;
    });

    if (!missingNodes.length) {
      return true;
    }

    for (const node of missingNodes) {
      const query = node.query
        .trim()
        .replace('\n', '')
        .trim()
        .replace(/\s+/g, ' ');

      try {
        await client.query(query);
        await client.query(
          `
          INSERT INTO ${this.migrationTable} (version) VALUES ($1)
        `,
          [node.version],
        );
      } catch (e) {
        console.error('Failed to run [%s]', node.query, e);
        await client.query('ROLLBACK');
        client.release();
        return false;
      }
    }

    try {
      await client.query('COMMIT');
      return true;
    } catch (e) {
      console.error('Failed to commit the migrations', e);
      return false;
    } finally {
      client.release();
    }
  }

  public async end(): Promise<void> {
    return this.client.end();
  }
}
