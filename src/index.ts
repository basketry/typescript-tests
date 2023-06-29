import { Generator } from 'basketry';
import { TestFactory } from './test-factory';

export const generateTests: Generator = (service, options) =>
  new TestFactory(service, options).build();

export default generateTests;
