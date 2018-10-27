import { PsqlConnector, IConnector } from './connectors';
import { YamlParser, JsModuleParser, IParser } from './parsers';
import { ConsoleLogger, ILogger } from './loggers';

import { Migrator } from './Migrator';
import { IConfig, Config, JsonConfig } from './Config';

const configLoaders = {
  json: JsonConfig,
  js: JsonConfig,
};

const connectors = {
  postgres: PsqlConnector,
  postgresql: PsqlConnector,
  psql: PsqlConnector,
};

const parsers = {
  yaml: YamlParser,
  yml: YamlParser,
  js: JsModuleParser,
  javascript: JsModuleParser,
  json: JsModuleParser,
};

const cwd = process.cwd();

function getConnector(config: Config, logger: ILogger): IConnector {
  const connectorName = config.connector.name;
  const Connector = connectors[connectorName];
  if (!Connector) {
    throw new Error(`Connector [${connectorName}] is not found`);
  }

  return new Connector(config.connector, logger);
}

function getParser(config: Config): IParser {
  const parserName = config.parser.name;
  const Parser = parsers[parserName];
  if (!Parser) {
    throw new Error(`Parser [${parserName}] is not found`);
  }

  return new Parser(config.parser);
}

function getConfigLoader(configPath): IConfig {
  const parts = configPath.split('.');
  const ext = parts[parts.length - 1];

  const ConfigLoader = configLoaders[ext];
  if (!ConfigLoader) {
    throw new Error(`Config loader not found for [${ext}]`);
  }

  return new ConfigLoader();
}

export class MigratorFactory {
  public static fromConfigFile(configPath: string): Migrator {
    const configLoader = getConfigLoader(configPath);
    const config = configLoader.load(configPath);

    const logger = new ConsoleLogger();

    const connector = getConnector(config, logger);
    const parser = getParser(config);

    const migrationDir =
      config.migrationDir.charAt(0) !== '/'
        ? `${cwd}/${config.migrationDir}`
        : config.migrationDir;

    return new Migrator({
      migrationDir,
      connector,
      parser,
      logger,
    });
  }
}
