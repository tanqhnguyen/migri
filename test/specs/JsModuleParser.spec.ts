import { JsModuleParser } from '../../src/parsers/JsModuleParser';

function getMigrationDir(name) {
  return `${__dirname}/migrations/${name}`;
}

describe('JsModuleParser', () => {
  let parser;

  beforeEach(() => {
    parser = new JsModuleParser();
  });

  it('should parse yaml files', () => {
    const result = parser.parse(getMigrationDir('jsModule'));

    for (const node of result) {
      expect(node.query()).toEqual(node.version);
      delete node.query;
    }

    expect(result).toEqual([
      { depends: null, version: 'account_1' },
      {
        depends: [{ depends: null, version: 'account_1' }],

        version: 'account_2',
      },
      { depends: null, version: 'product_1' },
      {
        depends: [{ depends: null, version: 'product_1' }],

        version: 'product_2',
      },
      {
        depends: [
          {
            depends: [{ depends: null, version: 'product_1' }],

            version: 'product_2',
          },
        ],

        version: 'product_3',
      },
      {
        depends: [
          {
            depends: [{ depends: null, version: 'product_1' }],

            version: 'product_2',
          },
          {
            depends: [
              {
                depends: [{ depends: null, version: 'product_1' }],

                version: 'product_2',
              },
            ],

            version: 'product_3',
          },
        ],

        version: 'product_4',
      },
    ]);
  });
});
