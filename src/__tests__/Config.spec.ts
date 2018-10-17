import { loadConfigFile } from '../Config';

function getConfigFilePath(name) {
  return `${__dirname}/configFiles/${name}`;
}

describe('loadConfigFile', () => {
  it('should load json config', () => {
    const config = loadConfigFile(getConfigFilePath('jsonConfig.json'));
    expect(config).toEqual({
      migrationDir: 'migrations',
      parser: { name: 'yaml' },
      connector: { name: 'psql' },
    });
  });

  it('should check for connector name', () => {
    function run() {
      loadConfigFile(getConfigFilePath('missingConnector.json'));
    }

    expect(run).toThrowError(
      'Invalid config file [Missing [connector] in config]',
    );
  });

  it('should load json config with env', () => {
    process.env.PASSWORD = 'meh';
    const config = loadConfigFile(getConfigFilePath('envConfig.json'));
    expect(config).toEqual({
      migrationDir: 'migrations',
      parser: { name: 'yaml' },
      connector: { name: 'psql', password: 'meh' },
    });
  });
});
