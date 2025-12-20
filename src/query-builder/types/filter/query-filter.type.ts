import { Guid } from '../utils/util.types';
import { CombinedFilter } from './combined-filter.type';

export type QueryFilter<T> =
    | StringQueryFilter<T>
    | StringPredicateQueryFilter<T>
    | NumberQueryFilter<T>
    | DateQueryFilter<T>
    | GuidQueryFilter<T>
    | BooleanQueryFilter<T>
    | LambdaFilter<T>
    | InFilter
    | NegatedFilter<T>
    | HasFilter<T>;

interface StringQueryFilter<T> extends BaseFilter<T, string> {
    operator: StringFilterOperators;
    ignoreCase?: boolean;
    removeQuotes?: boolean;
    function?: StringFunctionDefinition<T>;
    transform?: StringTransform[];
}

/**
 * String filter with boolean predicate function (contains, startswith, endswith)
 * These functions return boolean, so value is boolean not string
 * Example: contains(name, 'test') eq true
 */
interface StringPredicateQueryFilter<T> {
    field: FilterFields<T, string>;
    operator: GeneralFilterOperators;
    value: boolean | null;
    ignoreCase?: boolean;
    function: {
        type: 'contains' | 'startswith' | 'endswith';
        value: string | FieldReference<T, string>;
    };
}

interface NumberQueryFilter<T> extends BaseFilter<T, number> {
    operator: NumberFilterOperators | GeneralFilterOperators;
    function?: ArithmeticFunctionDefinition<T>;
    transform?: NumberTransform[];
}

interface DateQueryFilter<T> extends BaseFilter<T, Date> {
    operator: DateFilterOperators | GeneralFilterOperators;
    function?: DateFunctionDefinition<T>;
    transform?: DateTransform[];
}

interface GuidQueryFilter<T> extends BaseFilter<T, Guid> {
    operator: GeneralFilterOperators;
    removeQuotes?: boolean;
    transform?: GuidTransform[];
}

interface BooleanQueryFilter<T> extends BaseFilter<T, boolean> {
    operator: GeneralFilterOperators;
}

/**
 * Filter for membership testing using 'in' operator (OData 4.01)
 * Example: Name in ('A', 'B', 'C')
 */
export interface InFilter {
    field: string;
    operator: 'in';
    values: InFilterValue[];
}

export type InFilterValue = string | number | boolean | Date | Guid | null;

/**
 * Negated filter using 'not' operator
 * Example: not (contains(Name, 'test'))
 * Example: not (Age gt 18)
 */
export interface NegatedFilter<T> {
    type: 'not';
    filter: QueryFilter<T> | CombinedFilter<T>;
}

/**
 * Filter for enum flag checking using 'has' operator
 * Example: Style has Sales.Color'Yellow'
 *
 * Note: The value must be a valid OData enum literal,
 * typically in format Namespace.EnumType'Value'
 * The library does not validate or modify the enum literal.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface HasFilter<_T> {
    field: string;
    operator: 'has';
    value: string;
}

interface BaseFilter<T, V> {
    field: FilterFields<T, V>;
    operator: FilterOperators<V>;
    value: V | null;
}
type PrimitiveArrayElementModel<V> = {
    s: V;
};

type LambdaFilter<T> = {
    [K in ArrayFields<T>]: {
        field: K;
        lambdaOperator: 'any' | 'all';
        expression: ArrayElement<T, K> extends object
            ?
                  | QueryExpression<ArrayElement<T, K>>
                  | CombinedQueryExpression<ArrayElement<T, K>>
            :
                  | QueryExpression<
                        PrimitiveArrayElementModel<ArrayElement<T, K>>
                    >
                  | CombinedQueryExpression<
                        PrimitiveArrayElementModel<ArrayElement<T, K>>
                    >;
    };
}[ArrayFields<T>];

export type QueryExpression<
    T,
    F extends SupportedFunction<T> | undefined = undefined,
> = F extends { type: 'now' }
    ? {
          field: FilterFields<T, Date>;
          function: F;
          operator?: never;
          value?: never;
      }
    : F extends { type: 'length' }
      ? {
            field: FilterFields<T, string>;
            function: F;
            operator: FilterOperators<number>;
            value: number | null;
        }
      : F extends { type: 'indexof' }
        ? {
              field: FilterFields<T, string>;
              function: F;
              operator: FilterOperators<number>;
              value: number | null;
          }
        : F extends { type: 'substring' }
          ? {
                field: FilterFields<T, string>;
                function: F;
                operator: FilterOperators<string>;
                value: string | null;
            }
          : F extends { type: 'contains' }
            ? {
                  field: FilterFields<T, string>;
                  function: F;
                  operator?: FilterOperators<boolean> | undefined;
                  value?: boolean | null | undefined;
              }
            : QueryFilter<T>;

export type CombinedQueryExpression<T> = {
    logic: 'and' | 'or';
    filters: Array<QueryExpression<T> | CombinedQueryExpression<T>>;
};

export type SpecificFunctionDefinition<T, V> = V extends string
    ? StringFunctionDefinition<T>
    : V extends number
      ? ArithmeticFunctionDefinition<T>
      : V extends Date
        ? DateFunctionDefinition<T>
        : never;

export type StringFunctionDefinition<T> =
    | {
          type: 'concat';
          values: (string | FieldReference<T, string>)[];
      }
    | {
          type: 'contains';
          value: string | FieldReference<T, string>;
      }
    | {
          type: 'endswith';
          value: string | FieldReference<T, string>;
      }
    | {
          type: 'indexof';
          value: string | FieldReference<T, string>;
      }
    | {
          type: 'length';
      }
    | {
          type: 'startswith';
          value: string | FieldReference<T, string>;
      }
    | {
          type: 'substring';
          start: number | FieldReference<T, number>;
          length?: number | FieldReference<T, number>;
      };

type ArithmeticOperator = 'add' | 'sub' | 'mul' | 'div' | 'mod';

export type ArithmeticFunctionDefinition<T> = {
    type: ArithmeticOperator;
    operand: number | FieldReference<T, number>;
};

export type DateFunctionDefinition<T> =
    | {
          type: 'now';
      }
    | {
          type: 'date';
          field: FieldReference<T, Date>;
      }
    | {
          type: 'time';
          field: FieldReference<T, Date>;
      };

export type FieldReference<T, V extends string | number | Date | boolean> = {
    fieldReference: FilterFields<T, V>;
};

export type SupportedFunction<T> =
    | StringFunctionDefinition<T>
    | ArithmeticFunctionDefinition<T>
    | DateFunctionDefinition<T>;

export type ArrayFields<T> = {
    [K in keyof T]: T[K] extends Array<unknown> ? K : never;
}[keyof T];

export type ArrayElement<T, K extends ArrayFields<T>> = T[K] extends (infer U)[]
    ? U
    : T[K] extends readonly (infer U)[]
      ? U
      : never;

export type FilterFields<T, VALUETYPE> = {
    [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown>
        ? T[K] extends VALUETYPE
            ? K
            : `${K}/${NestedFilterFields<T[K], VALUETYPE>}`
        : T[K] extends VALUETYPE | null | undefined
          ? K
          : T[K] extends readonly VALUETYPE[]
            ? K
            : T[K] extends readonly Record<string, infer INNERVALUE>[]
              ? INNERVALUE extends VALUETYPE
                  ? K
                  : never
              : never;
}[Extract<keyof T, string>];

type NestedFilterFieldsHelper<T, VALUETYPE> =
    T extends Record<string, unknown>
        ? {
              [K in keyof T & string]: T[K] extends VALUETYPE | null | undefined
                  ? K
                  : T[K] extends Record<string, unknown>
                    ? `${K}/${NestedFilterFieldsHelper<Exclude<T[K], undefined>, VALUETYPE>}` extends `${infer P}`
                        ? P
                        : never
                    : never;
          }[keyof T & string]
        : never;

export type NestedFilterFields<T, VALUETYPE> = NestedFilterFieldsHelper<
    T,
    VALUETYPE
>;
export type LambdaFilterFields<T, VALUETYPE> = {
    [K in Extract<keyof T, string>]: T[K] extends readonly (infer TYPE)[]
        ? TYPE extends object // Nur Arrays von Objekten
            ? {
                  [Key in keyof TYPE]: TYPE[Key] extends VALUETYPE
                      ? Key
                      : never;
              }[keyof TYPE] // Extrahiere nur Felder mit VALUETYPE
            : never
        : never;
}[Extract<keyof T, string>];

export type GeneralFilterOperators = 'eq' | 'ne';

export type StringFilterOperators = GeneralFilterOperators;

export type StringTransform = 'tolower' | 'toupper' | 'trim' | 'length';
export type DateTransform =
    | 'year'
    | 'month'
    | 'day'
    | 'hour'
    | 'minute'
    | 'second';
export type NumberTransform = 'round' | 'floor' | 'ceiling';
export type GuidTransform = 'tolower';

export type NumberFilterOperators = 'ge' | 'gt' | 'le' | 'lt';

type DateFilterOperators = NumberFilterOperators;

export type DependentFilterOperators<VALUETYPE> = VALUETYPE extends string
    ? StringFilterOperators
    : VALUETYPE extends number
      ? NumberFilterOperators
      : VALUETYPE extends Date
        ? DateFilterOperators
        : never;

export type FilterOperators<VALUETYPE> =
    | GeneralFilterOperators
    | DependentFilterOperators<VALUETYPE>;

export interface FilterVisitor<T> {
    visitQueryFilter(filter: QueryFilter<T>): string;
    visitCombinedFilter(filter: CombinedFilter<T>): string;
}
