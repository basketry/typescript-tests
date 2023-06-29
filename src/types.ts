import { NamespacedTypescriptOptions } from '@basketry/typescript/lib/types';

export type TypescriptTestsOptions = {
  seed?: number;
};

export type NamespacedTypescriptTestsOptions = NamespacedTypescriptOptions & {
  typescriptTests?: TypescriptTestsOptions;
};
