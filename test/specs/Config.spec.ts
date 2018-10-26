import { JsonConfig } from '../../src/Config';

function getConfigFilePath(name) {
  return `${__dirname}/configFiles/${name}`;
}

describe('JsonConfig', () => {
  let jsonConfig: JsonConfig;

  beforeEach(() => {
    jsonConfig = new JsonConfig();
  });

  it('should load json config', () => {
    const config = jsonConfig.load(getConfigFilePath('jsonConfig.json'));
    expect(config).toEqual({
      migrationDir: 'migrations',
      parser: { name: 'yaml' },
      connector: { name: 'psql' },
    });
  });

  it('should check for connector name', () => {
    function run() {
      jsonConfig.load(getConfigFilePath('missingConnector.json'));
    }

    expect(run).toThrowError(
      'Invalid config file [Missing [connector] in config]',
    );
  });

  it('should load json config with env', () => {
    process.env.PASSWORD = 'meh';
    const config = jsonConfig.load(getConfigFilePath('envConfig.json'));
    expect(config).toEqual({
      migrationDir: 'migrations',
      parser: { name: 'yaml' },
      connector: { name: 'psql', password: 'meh' },
    });

    delete process.env.PASSWORD;
  });
});
