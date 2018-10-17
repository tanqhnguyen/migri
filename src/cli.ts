#!/usr/bin/env node
import * as Vorpal from 'vorpal';

import { config as setupConfig } from 'dotenv';

import { MigratorFactory } from './MigratorFactory';

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

vorpal
  .command('run [versions...]', 'Run migrations')
  .option('-c, --config <path>', 'Path to the config file')
  .action(async (args: Vorpal.Args) => {
    try {
      const migrator = MigratorFactory.fromConfigFile(getConfigFilePath(args));

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
