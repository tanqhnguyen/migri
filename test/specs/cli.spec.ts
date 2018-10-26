import { execSync } from 'child_process';
import * as fs from 'fs';
import { ncp } from 'ncp';
import { promisify } from 'util';

import {
  verifyMigrationsTable,
  selectAllMigrations,
  getTableStructure,
  cleanUp,
  dropTable,
  truncateTable,
} from './PsqlConnectorHelpers';

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
    await cleanUp();
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
        await dropTable(table);
      }
      await truncateTable('migrations');
    });

    it('should work with postgresql', async () => {
      const stdout = run('migri run -c migri.json');
      expect(stdout).toContain('Migrated [psql_test_table_1]');

      await verifyMigrationsTable();
      const migrations = await selectAllMigrations();
      expect(migrations.map(({ version }) => version)).toEqual([
        'psql_test_table_1',
      ]);

      const columns = await getTableStructure('psql_test_table');
      expect(columns).toEqual([
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'content', data_type: 'text' },
      ]);
    });
  });
});
