import { IParser, Node } from './Parser';

import * as fs from 'fs';
import { isArray, difference, groupBy } from 'lodash';
import { flatten } from 'lodash/fp';

export abstract class BaseParser implements IParser {
  public abstract readFile(path: string): any;

  public parse(dir: string): Node[] {
    if (!fs.existsSync(dir)) {
      throw new Error(`[${dir}] does not exist`);
    }

    const nodes = flatten(
      fs.readdirSync(dir).map(file => {
        const path = `${dir}/${file}`;
        const parsedNodes = this.readFile(path).map(entry => {
          if (entry.depends) {
            entry.depends = isArray(entry.depends)
              ? entry.depends
              : [entry.depends];
          }

          return entry;
        });

        return parsedNodes;
      }),
    );

    const formattedNodes = nodes.map(node => {
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
      JSON.stringify(formattedNodes);
    } catch (e) {
      if (e.toString() === 'TypeError: Converting circular structure to JSON') {
        throw new Error('Circular dependencies detected');
      }
    }

    const nodesGroupedByVersion = groupBy(formattedNodes, 'version');

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

    return formattedNodes;
  }
}
