import { YamlParser } from '../parsers/YamlParser';
import { IConnector } from '../connectors/Connector';
import { Migrator } from '../Migrator';

class MockConnector implements IConnector {
  public async init(): Promise<void> {}
  public async execute(): Promise<boolean> {
    return true;
  }
}

function getMigrationDir(name) {
  return `${__dirname}/migrations/${name}`;
}

describe('Migrator', () => {
  let migrator: Migrator;

  it('should generate correct execution plan', async () => {
    migrator = new Migrator({
      parser: new YamlParser(),
      connector: new MockConnector(),
      migrationDir: getMigrationDir('normalFlow'),
    });

    const result = await migrator.run();
    expect(result).toEqual([
      { version: 'account_1', query: 'account_1\n' },
      { version: 'account_2', query: 'account_2\n' },
      { version: 'product_1', query: 'product_1\n' },
      { version: 'product_2', query: 'product_2\n' },
      { version: 'product_3', query: 'product_3\n' },
      { version: 'product_4', query: 'product_4\n' },
    ]);
  });

  it('should handle dependencies between different files', async () => {
    migrator = new Migrator({
      parser: new YamlParser(),
      connector: new MockConnector(),
      migrationDir: getMigrationDir('interDependencies'),
    });

    const result = await migrator.run();

    expect(result).toEqual([
      { version: 'account_1', query: 'account_1\n' },
      { version: 'account_2', query: 'account_2\n' },
      { version: 'product_1', query: 'product_1\n' },
      { version: 'product_2', query: 'product_2\n' },
      { version: 'product_3', query: 'product_3\n' },
      { version: 'account_3', query: 'account_3\n' },
      { version: 'product_4', query: 'product_4\n' },
    ]);
  });
});
