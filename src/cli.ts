#!/usr/bin/env node
import * as Vorpal from 'vorpal';

import { isObject, mapValues } from 'lodash';

import { config as setupConfig } from 'dotenv';

import { PsqlConnector, IConnector } from './connectors';
import { YamlParser, IParser } from './parsers';

import { Migrator } from './Migrator';

const connectors = {
  postgres: PsqlConnector,
};

const parsers = {
  yaml: YamlParser,
  yml: YamlParser,
};

import * as fs from 'fs';

setupConfig();

const vorpal = new Vorpal();

const cwd = process.cwd();

type Config = {
  migrationDir: string;
  // can't have a fixed type here because each parser/connector requires different options
  parser: any;
  connector: any;
};

const defaultConfig = {
  migrationDir: 'migrations',
  parser: {
    name: 'yaml',
  },
};

function getConfigFilePath(args: Vorpal.Args): string {
  let configFile = args.options.config;
  if (!configFile) {
    console.warn('No config file specified, loading the default [migri.json]');
    configFile = 'migri.json';
  }

  return configFile.charAt(0) !== '/' ? `${cwd}/${configFile}` : configFile;
}

function processConfigValue(value) {
  if (!isObject(value)) {
    return value;
  }

  if (!value.env) {
    throw new Error(
      `Config value [${JSON.stringify(
        value,
      )}] is not string or number but doesn't specify env variable to load from`,
    );
  }

  const valueFromEnv = process.env[value.env];
  const valueAsInt = parseInt(valueFromEnv, 10);

  if (isNaN(valueAsInt)) {
    return valueFromEnv;
  }

  return valueAsInt;
}

function loadConfig(path: string): Config {
  if (!fs.existsSync(path)) {
    throw new Error(`[${path}] does not exist`);
  }

  try {
    const parsedConfig = require(path);

    const config = {
      ...defaultConfig,
      ...parsedConfig,
    };

    if (!config.connector) {
      throw new Error('Missing [connector] in config');
    }

    if (!config.connector.name) {
      throw new Error('Missing [connector.name] in config');
    }

    config.connector = mapValues(config.connector, processConfigValue);
    config.parser = mapValues(config.parser, processConfigValue);

    return config;
  } catch (e) {
    throw new Error(`Invalid config file [${e.message}]`);
  }
}

function getConnector(config: Config): IConnector {
  const connectorName = config.connector.name;
  const Connector = connectors[connectorName];
  if (!Connector) {
    throw new Error(`Connector [${connectorName}] is not found`);
  }

  return new Connector(config.connector);
}

function getParser(config: Config): IParser {
  const parserName = config.parser.name;
  const Parser = parsers[parserName];
  if (!Parser) {
    throw new Error(`Parser [${parserName}] is not found`);
  }

  return new Parser(config.parser);
}

function getMigrator(config: Config): Migrator {
  const connector = getConnector(config);
  const parser = getParser(config);

  const migrationDir =
    config.migrationDir.charAt(0) !== '/'
      ? `${cwd}/${config.migrationDir}`
      : config.migrationDir;

  return new Migrator({
    migrationDir,
    connector,
    parser,
  });
}

vorpal
  .command('run [versions...]', 'Run migrations')
  .option('-c, --config <path>', 'Path to the config file')
  .action(async (args: Vorpal.Args) => {
    try {
      const configFilePath = getConfigFilePath(args);
      const config = loadConfig(configFilePath);

      const migrator = getMigrator(config);

      await migrator.run();
    } catch (e) {
      console.error(e.message);
    }

    return null;
  });

vorpal.find('exit').remove();

const argv = process.argv;
if (argv.length === 2) {
  argv.push('help');
}

vorpal.parse(argv);
