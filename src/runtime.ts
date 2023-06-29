export type StringRules = {
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  constant?: string;
};

export type NumberRules = {
  multipleOf?: number;
  gt?: number;
  lt?: number;
  gte?: number;
  lte?: number;
  constant?: number;
};

export type BooleanRules = {
  constant?: boolean;
};

export type ArrayRules = {
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
};

export type InvalidValue = {
  value: any;
  description: string;
};

const characters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ~!@#$%^&*()-_=+[{]};:,<.>?';

export class Factory {
  constructor(readonly seed: number = Math.random() * 2 ** 16) {
    this.value = seed;
  }

  private value: number;

  /** Returns a pseudorandom number between 0 and 1 based on a given seed. */
  private random() {
    // LCG parameters
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32; // 2 to the power of 32

    this.value = (a * this.value + c) % m;

    return this.value / m;
  }

  validString(rules: StringRules = {}): string {
    if (rules.constant) {
      return rules.constant;
    }

    const minLength = rules.minLength ?? 1;
    const maxLength = rules.maxLength ?? minLength + 10;
    const length =
      Math.floor(this.random() * (maxLength - minLength + 1)) + minLength;

    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(this.random() * characters.length),
      );
    }

    return result;
  }

  invalidString(rules: StringRules = {}): InvalidValue[] {
    const invalidValues: InvalidValue[] = [];

    if (rules.constant) {
      const invalidConstant: InvalidValue = {
        value: rules.constant + '_invalid',
        description: 'does not match the specified constant.',
      };
      invalidValues.push(invalidConstant);
    }

    if (typeof rules.maxLength === 'number') {
      const invalidMaxLength: InvalidValue = {
        value: this.validString({
          minLength: rules.maxLength + 1,
          maxLength: rules.maxLength + 1,
        }),
        description: 'exceeds the maximum length.',
      };
      invalidValues.push(invalidMaxLength);
    }

    if (typeof rules.minLength === 'number') {
      const invalidMinLength: InvalidValue = {
        value: this.validString({
          minLength: rules.minLength - 1,
          maxLength: rules.minLength - 1,
        }),
        description: 'does not reach the minimum length.',
      };
      invalidValues.push(invalidMinLength);
    }

    invalidValues.push({
      value: this.validInteger({ gt: 0, lt: 10000 }),
      description: 'a number',
    });

    invalidValues.push({
      value: this.validBoolean(),
      description: 'a boolean',
    });

    return invalidValues;
  }

  validDecimal(rules: NumberRules = {}): number {
    if (rules.constant !== undefined) {
      return rules.constant;
    }

    const lowerBound = Math.max(
      rules.gt ?? Number.MIN_SAFE_INTEGER / 1000,
      rules.gte ?? Number.MIN_SAFE_INTEGER / 1000,
    );
    const upperBound = Math.min(
      rules.lt ?? Number.MAX_SAFE_INTEGER / 1000,
      rules.lte ?? Number.MAX_SAFE_INTEGER / 1000,
    );

    if (lowerBound > upperBound) {
      throw new Error(
        'The provided lower bound is greater than the upper bound.',
      );
    }

    let randomDecimal = lowerBound + this.random() * (upperBound - lowerBound);

    if (rules.multipleOf) {
      const quotient = Math.round(randomDecimal / rules.multipleOf);
      randomDecimal = quotient * rules.multipleOf;

      // Ensure we are within bounds after adjustment
      if (randomDecimal < lowerBound || randomDecimal > upperBound) {
        throw new Error(
          'Unable to generate a valid number within the provided constraints.',
        );
      }
    }

    return randomDecimal;
  }

  invalidDecimal(rules: NumberRules = {}): InvalidValue[] {
    const invalidValues: InvalidValue[] = [];

    if (rules.constant !== undefined) {
      const invalidConstant: InvalidValue = {
        value: rules.constant + 0.1,
        description: `not ${rules.constant}`,
      };
      invalidValues.push(invalidConstant);
    }

    if (rules.multipleOf) {
      const invalidMultipleOf: InvalidValue = {
        value: rules.multipleOf + 0.1, // TODO: ensure this meets gt(e) and lt(e) rules
        description: `not a multiple of ${rules.multipleOf}`,
      };
      invalidValues.push(invalidMultipleOf);
    }

    if (rules.gt !== undefined) {
      const invalidGt: InvalidValue = {
        value: rules.gt, // TODO: ensure this meets multipleOf rule
        description: `not greater than ${rules.gt}`,
      };
      invalidValues.push(invalidGt);
    }

    if (rules.lt !== undefined) {
      const invalidLt: InvalidValue = {
        value: rules.lt, // TODO: ensure this meets multipleOf rule
        description: `not less than ${rules.lt}`,
      };
      invalidValues.push(invalidLt);
    }

    if (rules.gte !== undefined) {
      const invalidGte: InvalidValue = {
        value: rules.gte - 0.1, // TODO: ensure this meets multipleOf rule
        description: `less than ${rules.gte}`,
      };
      invalidValues.push(invalidGte);
    }

    if (rules.lte !== undefined) {
      const invalidLte: InvalidValue = {
        value: rules.lte + 0.1, // TODO: ensure this meets multipleOf rule
        description: `greater than ${rules.lte}`,
      };
      invalidValues.push(invalidLte);
    }

    invalidValues.push({
      value: this.validString({ minLength: 10, maxLength: 10 }),
      description: 'a string',
    });

    invalidValues.push({
      value: this.validBoolean(),
      description: 'a boolean',
    });

    return invalidValues;
  }

  validInteger(rules: NumberRules = {}): number {
    if (rules.constant !== undefined) {
      return rules.constant;
    }

    const lowerBound = Math.max(
      rules.gt ?? Number.MIN_SAFE_INTEGER / 1000,
      rules.gte ?? Number.MIN_SAFE_INTEGER / 1000,
    );
    const upperBound = Math.min(
      rules.lt ?? Number.MAX_SAFE_INTEGER / 1000,
      rules.lte ?? Number.MAX_SAFE_INTEGER / 1000,
    );

    if (lowerBound > upperBound) {
      throw new Error(
        'The provided lower bound is greater than the upper bound.',
      );
    }

    let randomInt = Math.floor(
      lowerBound + this.random() * (upperBound - lowerBound),
    );

    if (rules.multipleOf) {
      const remainder = randomInt % rules.multipleOf;
      randomInt -= remainder;
      if (randomInt < lowerBound) {
        randomInt += rules.multipleOf;
      }
      if (randomInt > upperBound) {
        randomInt -= rules.multipleOf;
      }
    }

    if (randomInt < lowerBound || randomInt > upperBound) {
      throw new Error(
        'Unable to generate a valid integer within the provided constraints.',
      );
    }

    return randomInt;
  }

  invalidInteger(rules: NumberRules = {}): InvalidValue[] {
    const invalidValues: InvalidValue[] = [];

    if (rules.constant !== undefined) {
      const invalidConstant: InvalidValue = {
        value: rules.constant + 1,
        description: `does not equal ${rules.constant}`,
      };
      invalidValues.push(invalidConstant);
    }

    if (rules.multipleOf) {
      const invalidMultipleOf: InvalidValue = {
        value: rules.multipleOf + 1, // TODO: ensure this meets gt(e) and lt(e) rules
        description: `not a multiple of ${rules.multipleOf}`,
      };
      invalidValues.push(invalidMultipleOf);
    }

    if (rules.gt !== undefined) {
      const invalidGt: InvalidValue = {
        value: rules.gt, // TODO: ensure this meets multipleOf rule
        description: `not greater than ${rules.gt}`,
      };
      invalidValues.push(invalidGt);
    }

    if (rules.lt !== undefined) {
      const invalidLt: InvalidValue = {
        value: rules.lt, // TODO: ensure this meets multipleOf rule
        description: `not less than ${rules.lt}`,
      };
      invalidValues.push(invalidLt);
    }

    if (rules.gte !== undefined) {
      const invalidGte: InvalidValue = {
        value: rules.gte - 1, // TODO: ensure this meets multipleOf rule
        description: `less than ${rules.gte}`,
      };
      invalidValues.push(invalidGte);
    }

    if (rules.lte !== undefined) {
      const invalidLte: InvalidValue = {
        value: rules.lte + 1, // TODO: ensure this meets multipleOf rule
        description: `greater than ${rules.lte}`,
      };
      invalidValues.push(invalidLte);
    }

    invalidValues.push({
      value: this.validString({ minLength: 10, maxLength: 10 }),
      description: 'a string',
    });

    if (typeof rules.multipleOf !== 'number' || rules.multipleOf % 1) {
      invalidValues.push({
        value: this.validDecimal(rules),
        description: 'a decimal',
      });
    }

    invalidValues.push({
      value: this.validBoolean(),
      description: 'a boolean',
    });

    return invalidValues;
  }

  validBoolean(rules: BooleanRules = {}): boolean {
    if (rules.constant !== undefined) {
      return rules.constant;
    }
    return this.random() < 0.5;
  }

  invalidBoolean(rules: BooleanRules = {}): InvalidValue[] {
    const invalidValues: InvalidValue[] = [];

    if (rules.constant !== undefined) {
      const invalidConstant: InvalidValue = {
        value: !rules.constant,
        description: `does not equal ${rules.constant}`,
      };
      invalidValues.push(invalidConstant);
    }

    invalidValues.push({
      value: this.validString({ minLength: 10, maxLength: 10 }),
      description: 'a string',
    });

    invalidValues.push({
      value: this.validInteger({ gt: 0, lt: 10000 }),
      description: 'a number',
    });

    return invalidValues;
  }

  validArray<T>(validItem: () => T, rules: ArrayRules = {}): T[] {
    const minItems = rules.minItems ?? 1;
    const maxItems = rules.maxItems ?? minItems;
    const uniqueItems = rules.uniqueItems ?? false;

    const length =
      Math.floor(this.random() * (maxItems - minItems + 1)) + minItems;

    if (uniqueItems) {
      const items = new Set<T>();
      let tries = 0;
      while (items.size < length) {
        tries++;
        if (tries > length * 5) {
          throw new Error(
            'Unable to generate a valid array within the provided constraints.',
          );
        }
        const newItem = validItem();
        items.add(newItem);
      }

      return Array.from(items);
    } else {
      const items: T[] = [];
      for (let i = 0; i < length; i++) {
        const newItem = validItem();
        items.push(newItem);
      }
      return items;
    }
  }

  invalidArray<T>(
    validItem: () => T,
    invalidItem: () => T,
    rules: ArrayRules,
  ): InvalidValue[] {
    return [];
  }
}
