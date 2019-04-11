import { Config } from './Config';
import { MigratorFactory } from './MigratorFactory';

export function createFromConfig(config: Config) {
  return MigratorFactory.fromConfig(config);
}
