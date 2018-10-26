import { config } from './config';
import { getPool } from '../PsqlConnector/PsqlConnection';

const pgPool = getPool(config.postgres);

export async function getTableStructure(name) {
  const { rows } = await pgPool.query(
    `
    SELECT column_name, data_type
    FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = $1;
  `,
    [name],
  );

  return rows;
}

export async function expectTableStructure(tableName, structure) {
  const rows = await getTableStructure(tableName);
  expect(rows).toEqual(structure);
}

export async function verifyMigrationsTable(name = 'migrations') {
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

export async function dropTable(name) {
  await pgPool.query(`
    DROP TABLE IF EXISTS ${name} CASCADE;
  `);
}

export async function truncateTable(name) {
  await pgPool.query(`
    TRUNCATE TABLE ${name};
  `);
}

export async function selectAll(name) {
  const { rows } = await pgPool.query(`
    SELECT * FROM ${name}
  `);

  return rows;
}

export async function selectAllMigrations() {
  return selectAll('migrations');
}

export async function cleanUp() {
  await pgPool.query(`
    DROP TABLE migrations IF EXISTS;
  `);
  await pgPool.end();
}
