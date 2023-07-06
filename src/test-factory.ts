import { format as prettier } from 'prettier';
import {
  Enum,
  File,
  Interface,
  Method,
  Parameter,
  PrimitiveValue,
  Property,
  Service,
  Type,
  getEnumByName,
  getTypeByName,
  isRequired,
} from 'basketry';

import {
  buildInterfaceName,
  buildMethodName,
  buildParameterName,
} from '@basketry/typescript/lib/name-factory';

import { header } from '@basketry/typescript/lib/warning';

import { buildRouterFactoryName } from './name-factory';
import { NamespacedTypescriptTestsOptions } from './types';
import { camel, kebab, pascal } from 'case';
import {
  ArrayRules,
  BooleanRules,
  Factory,
  InvalidValue,
  NumberRules,
  StringRules,
} from './runtime';
import * as utils from './utils';

function format(contents: Iterable<string>): string {
  return prettier(Array.from(contents).join('\n'), {
    singleQuote: true,
    useTabs: false,
    tabWidth: 2,
    trailingComma: 'all',
    parser: 'typescript',
  });
}

type TestCase = {
  method: Method;
  param: Parameter;
  title: string;
  setup: string;
};

export class TestFactory {
  constructor(
    private readonly service: Service,
    private readonly options?: NamespacedTypescriptTestsOptions,
  ) {
    this.generate = new Factory(options?.typescriptTests?.seed);
  }
  private readonly generate: Factory;

  build(): File[] {
    return [...this.service.interfaces.map((int) => this.buildTestFile(int))];
  }

  private buildTestFile(int: Interface): File {
    return {
      path: [
        `v${this.service.majorVersion.value}`,
        `${kebab(int.name.value)}-service-test-harness.ts`,
      ],
      contents: format(this.buildTest(int)),
    };
  }

  private *buildTest(int: Interface): Iterable<string> {
    const serviceType = buildInterfaceName(int, 'types');

    const testCases = this.buildTestCases(int);

    const tree: Map<Method, Map<Parameter, Set<TestCase>>> = new Map();
    for (const testCase of testCases) {
      if (!tree.has(testCase.method)) tree.set(testCase.method, new Map());
      const methodNode = tree.get(testCase.method)!;

      if (!methodNode.has(testCase.param)) {
        methodNode.set(testCase.param, new Set());
      }
      const paramNode = methodNode.get(testCase.param)!;
      paramNode.add(testCase);
    }

    yield this.warning();
    yield '';
    yield `import * as types from "${
      this.options?.typescriptTests?.typesImportPath ?? './types'
    }";`;
    yield '';
    yield `export function ${camel(
      `test_${buildInterfaceName(int)}`,
    )}(service: ${serviceType}) {`;
    yield `describe('${buildInterfaceName(int)}', ()=>{`;

    for (const [method, params] of tree) {
      const methodName = buildMethodName(method);
      yield '';
      yield `describe('${methodName}', ()=>{`;
      yield* this.buildPreTest(int, method);
      yield '';
      for (const [param, paramTestCases] of params) {
        yield '';
        yield `describe("${buildParameterName(param)}", ()=>{`;
        for (const testCase of paramTestCases) {
          yield `it("${testCase.title}", async() => {`;
          yield testCase.setup;
          yield `const result = await service.${buildMethodName(
            method,
          )}(params);`;
          yield 'expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: "BAD_PARAMETER", status: 400 })]));';
          yield '});'; // close it
          yield '';
        }
        yield '})'; // close describe param
      }
      yield '})'; // close describe method
    }

    yield '})'; // close describe interface
    yield '}'; // close function
  }

  private *buildPreTest(int: Interface, method: Method): Iterable<string> {
    if (method.parameters.length) {
      const serviceType = buildInterfaceName(int, 'types');
      const methodName = buildMethodName(method);
      yield `let params: NonNullable<Parameters<${serviceType}['${methodName}']>[0]>;`;
      yield `beforeEach(()=>{`;
      yield `params = {`;
      yield* this.mock(method.parameters);
      yield '};';
      yield '});';
    }
  }

  private *mock(obj: Iterable<Property | Parameter>): Iterable<string> {
    for (const param of obj) {
      if (!isRequired(param)) continue;
      if (param.isPrimitive) {
        switch (param.typeName.value) {
          case 'boolean':
            if (param.isArray) {
              yield `${camel(param.name.value)}: [${this.generate
                .validArray(
                  () => this.generate.validBoolean(buildBooleanRules(param)),
                  buildArrayRules(param),
                )
                .join(',')}],`;
            } else {
              yield `${camel(param.name.value)}: ${this.generate.validBoolean(
                buildBooleanRules(param),
              )},`;
            }
            break;
          case 'date':
          case 'date-time':
            {
              if (param.isArray) {
                yield `${camel(param.name.value)}: [${this.generate
                  .validArray(() => `new Date()`, buildArrayRules(param))
                  .join(',')}],`;
              } else {
                yield `${camel(param.name.value)}: new Date(),`;
              }
            }
            break;
          case 'double':
          case 'float':
          case 'number':
            if (param.isArray) {
              yield `${camel(param.name.value)}: [${this.generate
                .validArray(
                  () => this.generate.validDecimal(buildNumberRules(param)),
                  buildArrayRules(param),
                )
                .join(',')}],`;
            } else {
              yield `${camel(param.name.value)}: ${this.generate.validDecimal(
                buildNumberRules(param),
              )},`;
            }
            break;
          case 'integer':
          case 'long':
            if (param.isArray) {
              yield `${camel(param.name.value)}: [${this.generate
                .validArray(
                  () => this.generate.validInteger(buildNumberRules(param)),
                  buildArrayRules(param),
                )
                .join(',')}],`;
            } else {
              yield `${camel(param.name.value)}: ${this.generate.validInteger(
                buildNumberRules(param),
              )},`;
            }
            break;
          case 'string':
            if (param.isArray) {
              yield `${camel(param.name.value)}: [${this.generate
                .validArray(
                  () =>
                    `"${this.generate.validString(buildStringRules(param))}"`,
                  buildArrayRules(param),
                )
                .join(',')}],`;
            } else {
              yield `${camel(param.name.value)}: "${this.generate.validString(
                buildStringRules(param),
              )}",`;
            }
            break;
        }
      } else {
        const type = getTypeByName(this.service, param.typeName.value);
        const e = getEnumByName(this.service, param.typeName.value);

        if (type) {
          yield `${camel(param.name.value)}: {`;
          yield* this.mock(type.properties);
          yield `},`;
        }
      }
    }
  }

  private *buildTestCases(int: Interface): Iterable<TestCase> {
    for (const method of int.methods)
      for (const param of method.parameters) {
        function* testCases(
          invalidValues: Iterable<InvalidValue>,
        ): Iterable<TestCase> {
          for (const invalidValue of invalidValues) {
            const value =
              typeof invalidValue.value === 'string'
                ? `'${invalidValue.value}'`
                : invalidValue.value;
            yield {
              method,
              param,
              title: `returns an error when ${invalidValue.description}`,
              setup: `params.${buildParameterName(param)} = ${value} as any;`,
            };
          }
        }

        if (isRequired(param)) {
          yield {
            method,
            param,
            title: 'returns an error when is not provided',
            setup: `params.${buildParameterName(param)} = undefined as any;`,
          };
        }

        if (param.isPrimitive) {
          switch (param.typeName.value) {
            case 'boolean': {
              yield* testCases(
                this.generate.invalidBoolean(buildBooleanRules(param)),
              );
              break;
            }
            case 'double':
            case 'float':
            case 'number': {
              yield* testCases(
                this.generate.invalidDecimal(buildNumberRules(param)),
              );
              break;
            }
            case 'integer':
            case 'long': {
              yield* testCases(
                this.generate.invalidInteger(buildNumberRules(param)),
              );
              break;
            }
            case 'string': {
              yield* testCases(
                this.generate.invalidString(buildStringRules(param)),
              );
              break;
            }
          }
        }
      }
  }

  private buildTestHelpersFile(): File {
    return {
      path: [`v${this.service.majorVersion.value}`, 'test-helpers.ts'],
      contents: format(this.buildTestHelpers()),
    };
  }

  private *buildTestHelpers(): Iterable<string> {
    yield this.warning();
    yield '';
    yield 'import * as types from "./types"';
    yield '';

    const types = new Set<Type>();
    const enums = new Set<Enum>();

    // Find all types and enums that can be traversed from method parameters
    for (const int of this.service.interfaces) {
      for (const method of int.methods) {
        for (const param of method.parameters) {
          if (!param.isPrimitive) {
            const type = getTypeByName(this.service, param.typeName.value);
            const e = getEnumByName(this.service, param.typeName.value);

            if (type) {
              types.add(type);
              for (const prop of type.properties) {
                const propEnum = getEnumByName(
                  this.service,
                  prop.typeName.value,
                );
                if (propEnum) enums.add(propEnum);
              }
              for (const subtype of traverseType(this.service, type)) {
                types.add(subtype);

                for (const prop of subtype.properties) {
                  const subpropEnum = getEnumByName(
                    this.service,
                    prop.typeName.value,
                  );
                  if (subpropEnum) enums.add(subpropEnum);
                }
              }
            } else if (e) {
              enums.add(e);
            }
          }
        }
      }
    }

    for (const type of Array.from(types).sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    )) {
      yield `export function ${camel(
        `build_${type.name.value}`,
      )}(): types.${pascal(type.name.value)}{`;
      yield 'return {';
      yield* this.mock(type.properties);
      yield '}';
      yield '}';
      yield '';
    }

    for (const e of Array.from(enums).sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    )) {
      yield `// ${e.name.value}`;
      yield `export function ${camel(`build_${e.name.value}`)}(){}`;
      yield '';
    }
  }

  private warning(): string {
    return header(this.service, require('../package.json'), this.options);
  }
}

function buildBooleanRules(param: PrimitiveValue): BooleanRules {
  if (!param.isPrimitive || param.typeName.value !== 'boolean') return {};

  return {
    constant:
      typeof param.constant?.value === 'boolean'
        ? param.constant?.value
        : undefined,
  };
}

function buildNumberRules(param: PrimitiveValue): NumberRules {
  if (
    param.isPrimitive &&
    (param.typeName.value === 'double' ||
      param.typeName.value === 'float' ||
      param.typeName.value === 'integer' ||
      param.typeName.value === 'long' ||
      param.typeName.value === 'number')
  ) {
    return {
      constant:
        typeof param.constant?.value === 'number'
          ? param.constant?.value
          : undefined,
      multipleOf: param.rules.find(utils.isNumberMultipleOfRule)?.value.value,
      gt: param.rules.find(utils.isNumberGtRule)?.value.value,
      gte: param.rules.find(utils.isNumberGteRule)?.value.value,
      lt: param.rules.find(utils.isNumberLtRule)?.value.value,
      lte: param.rules.find(utils.isNumberLteRule)?.value.value,
    };
  } else return {};
}

function buildStringRules(param: PrimitiveValue): StringRules {
  if (param.isPrimitive && param.typeName.value === 'string') {
    return {
      constant:
        typeof param.constant?.value === 'string'
          ? param.constant?.value
          : undefined,
      maxLength: param.rules.find(utils.isStringMaxLengthRule)?.length.value,
      minLength: param.rules.find(utils.isStringMinLengthRule)?.length.value,
    };
  } else return {};
}

function buildArrayRules(param: Property | Parameter): ArrayRules {
  if (param.isArray) {
    return {
      uniqueItems: param.rules.find(utils.isArrayUniqueItemsRule)?.required,
      maxItems: param.rules.find(utils.isArrayMaxItemsRule)?.max.value,
      minItems: param.rules.find(utils.isArrayMinItemsRule)?.min.value,
    };
  } else return {};
}

function* traverseType(service: Service, type: Type): Iterable<Type> {
  yield type;

  for (const prop of type.properties) {
    if (!prop.isPrimitive) {
      const subtype = getTypeByName(service, prop.typeName.value);
      if (subtype) yield* traverseType(service, subtype);
      // TODO: traverse unions
    }
  }
}
