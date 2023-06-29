import * as basketry from 'basketry';

export function isStringMaxLengthRule(
  rule: basketry.ValidationRule,
): rule is basketry.StringMaxLengthRule {
  return rule.id === 'string-max-length';
}

export function isStringMinLengthRule(
  rule: basketry.ValidationRule,
): rule is basketry.StringMinLengthRule {
  return rule.id === 'string-min-length';
}

export function isStringPatternRule(
  rule: basketry.ValidationRule,
): rule is basketry.StringPatternRule {
  return rule.id === 'string-pattern';
}

export function isStringFormatRule(
  rule: basketry.ValidationRule,
): rule is basketry.StringFormatRule {
  return rule.id === 'string-format';
}

export function isStringEnumRule(
  rule: basketry.ValidationRule,
): rule is basketry.StringEnumRule {
  return rule.id === 'string-enum';
}

export function isNumberMultipleOfRule(
  rule: basketry.ValidationRule,
): rule is basketry.NumberMultipleOfRule {
  return rule.id === 'number-multiple-of';
}

export function isNumberGtRule(
  rule: basketry.ValidationRule,
): rule is basketry.NumberGtRule {
  return rule.id === 'number-gt';
}

export function isNumberGteRule(
  rule: basketry.ValidationRule,
): rule is basketry.NumberGteRule {
  return rule.id === 'number-gte';
}

export function isNumberLtRule(
  rule: basketry.ValidationRule,
): rule is basketry.NumberLtRule {
  return rule.id === 'number-lt';
}

export function isNumberLteRule(
  rule: basketry.ValidationRule,
): rule is basketry.NumberLteRule {
  return rule.id === 'number-lte';
}

export function isArrayMaxItemsRule(
  rule: basketry.ValidationRule,
): rule is basketry.ArrayMaxItemsRule {
  return rule.id === 'array-max-items';
}

export function isArrayMinItemsRule(
  rule: basketry.ValidationRule,
): rule is basketry.ArrayMinItemsRule {
  return rule.id === 'array-min-items';
}

export function isArrayUniqueItemsRule(
  rule: basketry.ValidationRule,
): rule is basketry.ArrayUniqueItemsRule {
  return rule.id === 'array-unique-items';
}
