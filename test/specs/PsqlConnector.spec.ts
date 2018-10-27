import { config } from './config';
import { PsqlConnector } from '../../src/connectors/PsqlConnector';
import { EmptyLogger } from '../../src/loggers';

import {
  verifyMigrationsTable,
  expectTableStructure,
  cleanUp,
  dropTable,
  truncateTable,
  selectAllMigrations,
} from './PsqlConnectorHelpers';

const logger = new EmptyLogger();
describe('PsqlConnector', () => {
  let connector: PsqlConnector;

  beforeEach(() => {
    connector = new PsqlConnector(config.postgres, logger);
  });

  afterAll(async () => {
    await cleanUp();
  });

  describe('#init', () => {
    it('should create migrations table', async () => {
      await connector.init();
      await verifyMigrationsTable();
    });

    it('should create custom migrations table', async () => {
      const name = 'meh';
      connector = new PsqlConnector(
        {
          ...config.postgres,
          migrationTable: name,
        },
        logger,
      );
      await connector.init();
      await verifyMigrationsTable(name);

      await dropTable(name);
    });

    it('should be able to run multiple times', async () => {
      await connector.init();
      await connector.init();
      await verifyMigrationsTable();
    });
  });

  describe('#run', () => {
    const nodes = [
      {
        version: '1',
        query: `
        CREATE TABLE table_1 (
          id SERIAL PRIMARY KEY,
          content TEXT
        );
      `,
      },
      {
        version: '2',
        query: `
        CREATE TABLE table_2 (
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
        await dropTable(table);
      }
      await truncateTable('migrations');
    });

    it('should run nodes in order', async () => {
      const result = await connector.run(nodes);
      expect(result).toEqual(['1', '2']);

      await expectTableStructure('table_1', [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'content', data_type: 'text' },
      ]);
      await expectTableStructure('table_2', [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'table_1_id', data_type: 'integer' },
      ]);

      const migrations = await selectAllMigrations();

      expect(migrations.map(({ version }) => version)).toEqual(['1', '2']);
    });

    it('should not run nodes that have been run before', async () => {
      await connector.run(nodes);
      const result = await connector.run(
        nodes.concat([
          {
            version: '3',
            query: `
            ALTER TABLE table_2 ADD COLUMN content TEXT
          `,
          },
        ]),
      );
      expect(result).toEqual(['3']);

      await expectTableStructure('table_1', [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'content', data_type: 'text' },
      ]);
      await expectTableStructure('table_2', [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'table_1_id', data_type: 'integer' },
        { column_name: 'content', data_type: 'text' },
      ]);

      const migrations = await selectAllMigrations();

      expect(migrations.map(({ version }) => version)).toEqual(['1', '2', '3']);
    });

    it('should update versions only', async () => {
      const result = await connector.run(nodes, { onlyVersion: true });
      expect(result).toEqual(['1', '2']);

      await expectTableStructure('table_1', []);
      await expectTableStructure('table_2', []);

      const migrations = await selectAllMigrations();

      expect(migrations.map(({ version }) => version)).toEqual(['1', '2']);
    });
  });
});
