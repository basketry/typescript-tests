import { NamespacedTypescriptOptions } from '@basketry/typescript/lib/types';

export type TypescriptTestsOptions = {
  seed?: number;
  typesImportPath?: string;
};

export type NamespacedTypescriptTestsOptions = NamespacedTypescriptOptions & {
  typescriptTests?: TypescriptTestsOptions;
};
