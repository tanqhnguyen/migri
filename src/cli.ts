#!/usr/bin/env node
import * as Vorpal from 'vorpal';

import { config as setupConfig } from 'dotenv';

import { PsqlConnector, IConnector } from './connectors';
import { YamlParser, IParser } from './parsers';

import { Migrator } from './Migrator';
import { JsonConfig, Config, IConfig } from './Config';

const configLoader: IConfig = new JsonConfig();

const connectors = {
  postgres: PsqlConnector,
};

const parsers = {
  yaml: YamlParser,
  yml: YamlParser,
};

function getConfigFilePath(args: Vorpal.Args): string {
  let configFile = args.options.config;
  if (!configFile) {
    console.warn('No config file specified, loading the default [migri.json]');
    configFile = 'migri.json';
  }

  return configFile.charAt(0) !== '/' ? `${cwd}/${configFile}` : configFile;
}

setupConfig();

const vorpal = new Vorpal();

const cwd = process.cwd();

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
      const config = configLoader.load(configFilePath);

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
