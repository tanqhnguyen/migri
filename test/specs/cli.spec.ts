import { execSync } from 'child_process';
import * as fs from 'fs';
import { ncp } from 'ncp';
import { promisify } from 'util';

import * as psqlHelper from './PsqlConnectorHelpers';
import * as arangoHelper from './ArangoConnectorHelpers';

const ncpAsync = promisify(ncp);

const rootDir = `${__dirname}/../..`;

const pkg = JSON.parse(fs.readFileSync(`${rootDir}/package.json`).toString());

function run(cmd) {
  return execSync(cmd)
    .toString()
    .trim();
}

describe('cli', () => {
  afterAll(async () => {
    await psqlHelper.cleanUp();
  });

  describe('version', () => {
    it('should show the current version', () => {
      const result = run('migri version');
      expect(result).toEqual(pkg.version);
    });
  });

  describe('postgresql', () => {
    const tablesCreatedDuringThisTest = ['psql_test_table'];

    beforeAll(async () => {
      await ncpAsync(`${__dirname}/cli/psql`, rootDir);
    });

    afterAll(() => {
      run(`rm -rf ${rootDir}/migrations`);
      run(`rm -rf ${rootDir}/migri.json`);
    });

    afterEach(async () => {
      for (const table of tablesCreatedDuringThisTest) {
        await psqlHelper.dropTable(table);
      }
      await psqlHelper.truncateTable('migrations');
    });

    it('should work with postgresql', async () => {
      const stdout = run('migri run -c migri.json');
      expect(stdout).toContain('Migrated [psql_test_table_1]');

      await psqlHelper.verifyMigrationsTable();
      const migrations = await psqlHelper.selectAllMigrations();
      expect(migrations.map(({ version }) => version)).toEqual([
        'psql_test_table_1',
      ]);

      const columns = await psqlHelper.getTableStructure('psql_test_table');
      expect(columns).toEqual([
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'content', data_type: 'text' },
      ]);
    });

    it('should update versions only', async () => {
      const stdout = run('migri run -c migri.json --only-version');
      expect(stdout).toContain('Migrated [psql_test_table_1]');

      await psqlHelper.verifyMigrationsTable();
      const migrations = await psqlHelper.selectAllMigrations();
      expect(migrations.map(({ version }) => version)).toEqual([
        'psql_test_table_1',
      ]);

      const columns = await psqlHelper.getTableStructure('psql_test_table');
      expect(columns).toEqual([]);
    });
  });

  describe('arangodb', () => {
    const collectionsCreatedDuringThisTest = ['arango_test_collection'];

    beforeAll(async () => {
      await ncpAsync(`${__dirname}/cli/arango`, rootDir);
    });

    afterAll(() => {
      run(`rm -rf ${rootDir}/migrations`);
      run(`rm -rf ${rootDir}/migri.json`);
    });

    afterEach(async () => {
      for (const name of collectionsCreatedDuringThisTest) {
        await arangoHelper.dropCollection(name);
      }
      await arangoHelper.truncateCollection('migrations');
    });

    it('should work with arangodb', async () => {
      const stdout = run('migri run -c migri.json');
      expect(stdout).toContain('Migrated [arango_test_collection_1]');

      await arangoHelper.verifyMigrationCollection();
      const migrations = await arangoHelper.selectAllMigrations();
      expect(migrations.map(({ version }) => version)).toEqual([
        'arango_test_collection_1',
      ]);

      const exists = await arangoHelper.collectionExists(
        'arango_test_collection',
      );
      expect(exists).toEqual(true);
    });

    it('should update versions only', async () => {
      const stdout = run('migri run -c migri.json --only-version');
      expect(stdout).toContain('Migrated [arango_test_collection_1]');

      await arangoHelper.verifyMigrationCollection();
      const migrations = await arangoHelper.selectAllMigrations();
      expect(migrations.map(({ version }) => version)).toEqual([
        'arango_test_collection_1',
      ]);

      const exists = await arangoHelper.collectionExists(
        'arango_test_collection',
      );
      expect(exists).toEqual(false);
    });
  });
});
