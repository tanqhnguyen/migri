import { YamlParser } from '../YamlParser';

function getMigrationDir(name) {
  return `${__dirname}/migrations/${name}`;
}

describe('YamlParser', () => {
  let parser;

  beforeEach(() => {
    parser = new YamlParser();
  });

  it('should parse yaml files', () => {
    const result = parser.parse(getMigrationDir('normalFlow'));
    expect(result).toEqual([
      { depends: null, version: 'account_1', query: 'account_1\n' },
      {
        depends: [
          {
            depends: null,
            version: 'account_1',
            query: 'account_1\n',
          },
        ],
        version: 'account_2',
        query: 'account_2\n',
      },
      { depends: null, version: 'product_1', query: 'product_1\n' },
      {
        depends: [
          { depends: null, version: 'product_1', query: 'product_1\n' },
        ],
        version: 'product_2',
        query: 'product_2\n',
      },
      {
        depends: [
          {
            depends: [
              { depends: null, version: 'product_1', query: 'product_1\n' },
            ],
            version: 'product_2',
            query: 'product_2\n',
          },
        ],
        version: 'product_3',
        query: 'product_3\n',
      },
      {
        depends: [
          {
            depends: [
              { depends: null, version: 'product_1', query: 'product_1\n' },
            ],
            version: 'product_2',
            query: 'product_2\n',
          },
          {
            depends: [
              {
                depends: [
                  { depends: null, version: 'product_1', query: 'product_1\n' },
                ],
                version: 'product_2',
                query: 'product_2\n',
              },
            ],
            version: 'product_3',
            query: 'product_3\n',
          },
        ],
        version: 'product_4',
        query: 'product_4\n',
      },
    ]);
  });

  it('should handle duplicate versions', () => {
    function run() {
      parser.parse(getMigrationDir('duplicateVersions'));
    }

    expect(run).toThrow('Versions must be unique: account_1');
  });

  it('should handle circular dependencies', () => {
    function run() {
      parser.parse(getMigrationDir('circularDependencies'));
    }

    expect(run).toThrowError('Circular dependencies detected');
  });

  it('should handle missing dependencies', () => {
    function run() {
      parser.parse(getMigrationDir('missingDependencies'));
    }

    expect(run).toThrowError('Dependencies not found [account_3]');
  });
});
