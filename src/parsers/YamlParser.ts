import { IParser, Node } from './Parser';

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { isArray, difference, groupBy } from 'lodash';
import { flow, map, flatten } from 'lodash/fp';

const extractNodes = flow(
  map(({ content }) => {
    const parsed = yaml.safeLoad(content).map(entry => {
      if (entry.depends) {
        entry.depends = isArray(entry.depends)
          ? entry.depends
          : [entry.depends];
      }

      return entry;
    });

    return parsed;
  }),
  flatten,
);

export class YamlParser implements IParser {
  public parse(dir: string): Node[] {
    const files = fs.readdirSync(dir).map(file => {
      const parts = file.split('.');
      const path = `${dir}/${file}`;
      const content = fs.readFileSync(path).toString();

      return {
        namespace: parts[0],
        content,
      };
    });

    const nodes = extractNodes(files);
    const formatedNodes = nodes.map(node => {
      if (!node.depends) {
        return node;
      }

      const deps = node.depends;
      node.depends = nodes.filter(({ version }) => {
        return node.depends.indexOf(version) !== -1;
      });

      const foundDeps = node.depends.map(({ version }) => version);
      const diff = difference(deps, foundDeps);
      if (diff.length > 0) {
        throw new Error(`Dependencies not found [${diff.join(', ')}]`);
      }

      return node;
    });

    // check for circular dependencies
    // TODO figure out a way to show the circular dependencies
    try {
      JSON.stringify(formatedNodes);
    } catch (e) {
      if (e.toString() === 'TypeError: Converting circular structure to JSON') {
        throw new Error('Circular dependencies detected');
      }
    }

    const nodesGroupedByVersion = groupBy(formatedNodes, 'version');

    const duplicate = Object.entries(nodesGroupedByVersion)
      .map(([version, groupedNodes]) => {
        if (groupedNodes.length === 1) {
          return null;
        }
        return version;
      })
      .filter(Boolean);

    if (duplicate.length) {
      throw new Error(`Versions must be unique: ${duplicate.join(', ')}`);
    }

    return formatedNodes;
  }
}
