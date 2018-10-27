import { Database } from 'arangojs';

type Args = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

const databases: Map<string, { createdDb: boolean; db: Database }> = new Map();
export async function getDb(args: Args): Promise<Database> {
  const url = `http://${args.host}:${args.port}`;
  const key = `${args.username}@${url}`;

  if (!databases.has(key)) {
    databases.set(key, {
      createdDb: false,
      db: new Database({
        url: `http://${args.host}:${args.port}`,
      }).useBasicAuth(args.username, args.password),
    });
  }

  const db = databases.get(key);

  const dbName = args.database;
  if (!db.createdDb) {
    const names = await db.db.listDatabases();
    if (names.indexOf(dbName) === -1) {
      await db.db.createDatabase(dbName);
    }
    db.createdDb = !db.createdDb;
  }

  db.db.useDatabase(dbName);

  return db.db;
}
