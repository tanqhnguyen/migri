import * as fs from 'fs';
import { isObject, mapValues } from 'lodash';

const defaultConfig = {
  migrationDir: 'migrations',
  parser: {
    name: 'yaml',
  },
};

export interface IConfig {
  load(filePath: string): Config;
}

export type Config = {
  migrationDir: string;
  // can't have a fixed type here because each parser/connector requires different options
  parser: any;
  connector: any;
};

function processConfigValue(value: any) {
  if (!isObject(value)) {
    return value;
  }

  if (!(value as any).env) {
    throw new Error(
      `Config value [${JSON.stringify(
        value,
      )}] is not string or number but doesn't specify env variable to load from`,
    );
  }

  const valueFromEnv = process.env[(value as any).env];
  const valueAsInt = parseInt(valueFromEnv, 10);

  if (isNaN(valueAsInt)) {
    return valueFromEnv;
  }

  return valueAsInt;
}

export class JsonConfig implements IConfig {
  public load(path: string): Config {
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
}
