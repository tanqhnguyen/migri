import { getDb } from '../../src/connectors/ArangoConnector/ArangoConnection';
import { config } from './config';

export async function verifyMigrationCollection(collectionName = 'migrations') {
  const db = await getDb(config.arango);
  const exists = await db.collection(collectionName).exists();
  expect(exists).toEqual(true);
}

export async function dropCollection(name) {
  const db = await getDb(config.arango);
  const collection = db.collection(name);
  const exists = await collection.exists();
  if (exists) {
    await collection.drop();
  }
}

export async function truncateCollection(name) {
  const db = await getDb(config.arango);
  await db.collection(name).truncate();
}

export async function collectionExists(name) {
  const db = await getDb(config.arango);
  return db.collection(name).exists();
}

export async function selectAll(name, sort = '') {
  const db = await getDb(config.arango);

  const result = await db.query(`
    FOR entry IN ${name}
      ${sort}
      RETURN entry
  `);

  return result.all();
}

export async function selectAllMigrations() {
  return selectAll('migrations', 'SORT entry._created ASC');
}

export async function cleanUp() {
  await dropCollection('migrations');
}
