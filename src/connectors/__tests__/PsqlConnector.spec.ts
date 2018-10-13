import { config } from './config';
import { PsqlConnector } from '../PsqlConnector';

describe('PsqlConnector', () => {
  let connector: PsqlConnector;

  beforeEach(() => {
    connector = new PsqlConnector(config.postgres);
  });

  afterAll(async () => {
    await connector.client.query(`
      DROP TABLE migrations IF EXISTS;
    `);
    await connector.client.end();
  });

  async function getTableStructure(name) {
    const { rows } = await connector.client.query(
      `
      SELECT column_name, data_type
      FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = $1;
    `,
      [name],
    );

    return rows;
  }

  async function expectTableStructure(tableName, structure) {
    const rows = await getTableStructure(tableName);
    expect(rows).toEqual(structure);
  }

  describe('#init', () => {
    async function verifyMigrationsTable(name = 'migrations') {
      return expectTableStructure(name, [
        { column_name: 'version', data_type: 'text' },
        {
          column_name: 'created',
          data_type: 'timestamp with time zone',
        },
        {
          column_name: 'modified',
          data_type: 'timestamp with time zone',
        },
      ]);
    }

    it('should create migrations table', async () => {
      await connector.init();
      await verifyMigrationsTable();
    });

    it('should create custom migrations table', async () => {
      const name = 'meh';
      connector = new PsqlConnector({
        ...config.postgres,
        migrationTable: name,
      });
      await connector.init();
      await verifyMigrationsTable(name);

      await connector.client.query(`
        DROP TABLE IF EXISTS ${name};
      `);
    });

    it('should be able to run multiple times', async () => {
      await connector.init();
      await connector.init();
      await verifyMigrationsTable();
    });
  });

  describe('#execute', () => {
    const nodes = [
      {
        version: '1',
        query: `
        CREATE TABLE IF NOT EXISTS table_1 (
          id SERIAL PRIMARY KEY,
          content TEXT
        );
      `,
      },
      {
        version: '2',
        query: `
        CREATE TABLE IF NOT EXISTS table_2 (
          id SERIAL PRIMARY KEY,
          table_1_id INT REFERENCES table_1(id)
        );
      `,
      },
    ];
    const tablesCreatedDuringThisTest = ['table_1', 'table_2'];

    beforeEach(async () => {
      await connector.init();
    });

    afterEach(async () => {
      for (const table of tablesCreatedDuringThisTest) {
        await connector.client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }
      await connector.client.query(`TRUNCATE TABLE migrations`);
    });

    it('should execute nodes in order', async () => {
      const result = await connector.execute(nodes);
      expect(result).toEqual(true);

      await expectTableStructure('table_1', [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'content', data_type: 'text' },
      ]);
      await expectTableStructure('table_2', [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'table_1_id', data_type: 'integer' },
      ]);

      const { rows: migrations } = await connector.client.query(`
        SELECT * FROM migrations
      `);

      expect(migrations.map(({ version }) => version)).toEqual(['1', '2']);
    });

    it('should not execute nodes that have been executed before', async () => {
      await connector.execute(nodes);
      const result = await connector.execute(
        nodes.concat([
          {
            version: '3',
            query: `
            ALTER TABLE table_2 ADD COLUMN content TEXT
          `,
          },
        ]),
      );
      expect(result).toEqual(true);

      await expectTableStructure('table_1', [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'content', data_type: 'text' },
      ]);
      await expectTableStructure('table_2', [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'table_1_id', data_type: 'integer' },
        { column_name: 'content', data_type: 'text' },
      ]);

      const { rows: migrations } = await connector.client.query(`
        SELECT * FROM migrations
      `);

      expect(migrations.map(({ version }) => version)).toEqual(['1', '2', '3']);
    });
  });
});
