import { config } from './config';
import { ArangoConnector } from '../../src/connectors/ArangoConnector';
import { EmptyLogger } from '../../src/loggers';

import {
  verifyMigrationCollection,
  dropCollection,
  truncateCollection,
  collectionExists,
  selectAllMigrations,
  cleanUp,
} from './ArangoConnectorHelpers';

const logger = new EmptyLogger();
describe('ArangoConnector', () => {
  let connector: ArangoConnector;

  beforeEach(() => {
    connector = new ArangoConnector(config.arango, logger);
  });

  afterAll(async () => {
    await cleanUp();
    await connector.end();
  });

  describe('#init', () => {
    it('should create migration collection', async () => {
      await connector.init();
      await verifyMigrationCollection();
    });

    it('should be able to call init multiple times', async () => {
      await connector.init();
      await connector.init();
      await verifyMigrationCollection();
    });

    it('should create custom migration collection', async () => {
      const name = 'meh';
      connector = new ArangoConnector(
        {
          ...config.arango,
          migrationCollection: name,
        },
        logger,
      );
      await connector.init();
      await verifyMigrationCollection(name);

      await dropCollection(name);
    });
  });

  describe('#run', () => {
    const collectionsCreatedDuringThisTest = [
      'test_collection',
      'another_test_collection',
    ];

    const nodes: any[] = [
      {
        version: '1',
        query(db) {
          return db.collection('test_collection').create();
        },
      },
      {
        version: '2',
        query(db) {
          return db.collection('another_test_collection').create();
        },
      },
    ];

    beforeEach(async () => {
      await connector.init();
    });

    afterEach(async () => {
      for (const name of collectionsCreatedDuringThisTest) {
        await dropCollection(name);
      }
      await truncateCollection('migrations');
    });

    it('should run nodes in order', async () => {
      await verifyMigrationCollection();
      const result = await connector.run(nodes);

      expect(result).toEqual(['1', '2']);

      for (const name of collectionsCreatedDuringThisTest) {
        const exists = await collectionExists(name);
        expect(exists).toEqual(true);
      }

      const entries = await selectAllMigrations();
      expect(entries.map(({ version }) => version)).toEqual(['1', '2']);
    });

    it('should not run nodes that have been run before', async () => {
      await connector.run(nodes);
      const result = await connector.run(
        nodes.concat([
          {
            version: '3',
            query: `
              INSERT { value: 1 } IN test_collection
            `,
          },
        ]),
      );
      expect(result).toEqual(['3']);

      const entries = await selectAllMigrations();
      expect(entries.map(({ version }) => version)).toEqual(['1', '2', '3']);
    });

    it('should update versions only', async () => {
      const result = await connector.run(nodes, { onlyVersion: true });
      expect(result).toEqual(['1', '2']);

      const entries = await selectAllMigrations();
      expect(entries.map(({ version }) => version)).toEqual(['1', '2']);

      for (const name of collectionsCreatedDuringThisTest) {
        const exists = await collectionExists(name);
        expect(exists).toEqual(false);
      }
    });
  });
});
