import { readFileSync } from 'fs';
import { join } from 'path';
import generateTypes from '@basketry/typescript';
import { TestFactory } from './test-factory';

const pkg = require('../package.json');
const withVersion = `${pkg.name}@${pkg.version}`;
const withoutVersion = `${pkg.name}@{{version}}`;

describe('InterfaceFactory', () => {
  it('recreates a valid snapshot', () => {
    // ARRANGE
    const service = require('basketry/lib/example-ir.json');

    // ACT
    const snapshotFiles = [
      ...generateTypes(service),
      ...new TestFactory(service).build(),
    ];

    // ASSERT
    for (const file of snapshotFiles) {
      const path = join('src', 'snapshot', ...file.path);
      const snapshot = readFileSync(path)
        .toString()
        .replace(withoutVersion, withVersion);
      expect(file.contents).toStrictEqual(snapshot);
    }
  });
});
