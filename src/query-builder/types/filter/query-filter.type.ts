import { Guid } from '../utils/util.types';
import { CombinedFilter } from './combined-filter.type';

type PrevDepth<T extends number> = [never, 0, 1, 2, 3, 4, 5][T];

// 1. Funktionsdefinitionen
export type StringFunctionDefinition<T> =
    | {
          readonly type: 'concat';
          readonly values: ReadonlyArray<string | FieldReference<T, string>>;
      }
    | {
          readonly type: 'contains';
          readonly value: string | FieldReference<T, string>;
      }
    | {
          readonly type: 'endswith';
          readonly value: string | FieldReference<T, string>;
      }
    | {
          readonly type: 'indexof';
          readonly value: string | FieldReference<T, string>;
      }
    | { readonly type: 'length' }
    | {
          readonly type: 'startswith';
          readonly value: string | FieldReference<T, string>;
      }
    | {
          readonly type: 'substring';
          readonly start: number | FieldReference<T, number>;
          readonly length?: number | FieldReference<T, number>;
      }
    | { readonly type: 'tolower' }
    | { readonly type: 'toupper' }
    | { readonly type: 'trim' };

export type ArithmeticOperator = 'add' | 'sub' | 'mul' | 'div' | 'mod';
export type ArithmeticFunctionDefinition<T> =
    | {
          readonly type: ArithmeticOperator;
          readonly operand: number | FieldReference<T, number>;
      }
    | { readonly type: 'round' | 'floor' | 'ceiling' };

export type DateFunctionDefinition<T> =
    | { readonly type: 'now' }
    | { readonly type: 'date'; readonly field: FieldReference<T, Date> }
    | { readonly type: 'time'; readonly field: FieldReference<T, Date> }
    | {
          readonly type:
              | 'year'
              | 'month'
              | 'day'
              | 'hour'
              | 'minute'
              | 'second';
      };

export type AnySupportedFunction<T> =
    | StringFunctionDefinition<T>
    | ArithmeticFunctionDefinition<T>
    | DateFunctionDefinition<T>;

type ODataDateStringLiteral = string & { __brand: 'ODataDateStringLiteral' };
type ODataTimeStringLiteral = string & { __brand: 'ODataTimeStringLiteral' };

// 2. Hilfstyp: FunctionReturnType
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionReturnType<F extends AnySupportedFunction<any>> =
    F extends { type: 'length' | 'indexof' }
        ? number
        : F extends { type: 'contains' | 'startswith' | 'endswith' }
          ? boolean
          : F extends {
                  type: 'tolower' | 'toupper' | 'trim' | 'substring' | 'concat';
              }
            ? string
            : F extends { type: 'round' | 'floor' | 'ceiling' }
              ? number
              : F extends { type: ArithmeticOperator }
                ? number
                : F extends {
                        type:
                            | 'year'
                            | 'month'
                            | 'day'
                            | 'hour'
                            | 'minute'
                            | 'second';
                    }
                  ? number
                  : F extends { type: 'now' }
                    ? Date
                    : F extends { type: 'date' }
                      ? ODataDateStringLiteral
                      : F extends { type: 'time' }
                        ? ODataTimeStringLiteral
                        : never;

// 3. FilterOperatoren
export type GeneralFilterOperators = 'eq' | 'ne';
export type ComparisonOperators = 'gt' | 'ge' | 'lt' | 'le';
export type StringAsFunctionOperators =
    | 'contains'
    | 'startswith'
    | 'endswith'
    | 'substringof'
    | 'indexof';

export type StandardStringFilterOperators =
    | GeneralFilterOperators
    | StringAsFunctionOperators;
export type ComparableFilterOperators =
    | GeneralFilterOperators
    | ComparisonOperators;
export type BooleanFilterOperators = GeneralFilterOperators;
export type GuidFilterOperators = GeneralFilterOperators;

export type FilterOperators<V> = V extends
    | ODataDateStringLiteral
    | ODataTimeStringLiteral
    ? ComparableFilterOperators
    : V extends Date
      ? ComparableFilterOperators
      : V extends number
        ? ComparableFilterOperators
        : V extends Guid
          ? GuidFilterOperators
          : V extends string
            ? StandardStringFilterOperators
            : V extends boolean
              ? BooleanFilterOperators
              : GeneralFilterOperators;

// 4. Basis-Interface für Kern-Eigenschaften
interface BaseFilterCore<T, VFieldType> {
    readonly field: FilterFields<T, VFieldType>;
    readonly transform?: ReadonlyArray<PropertyTransform<VFieldType>>;
}

export type StringFilterOperators =
    | GeneralFilterOperators
    | StringAsFunctionOperators
    | ComparisonOperators;

// 5. Diskriminierte Union für Basis-Filter

// Fall A: Filter ohne explizite OData-Funktion (function Eigenschaft)
export type StandardFilter<T, VFieldType> = BaseFilterCore<T, VFieldType> &
    (
        | {
              readonly function?: undefined;
              readonly operator: FilterOperators<VFieldType>;
              readonly value: VFieldType | null;
              readonly ignoreCase?: VFieldType extends string ? boolean : never;
              readonly removeQuotes?: VFieldType extends string | Guid
                  ? boolean
                  : never;
          }
        | (VFieldType extends string
              ? {
                    readonly function: StringFunctionDefinition<T>;
                    readonly operator: FilterOperators<
                        FunctionReturnType<StringFunctionDefinition<T>>
                    >;
                    readonly value: FunctionReturnType<
                        StringFunctionDefinition<T>
                    > | null;
                    readonly ignoreCase?: never;
                    readonly removeQuotes?: FunctionReturnType<
                        StringFunctionDefinition<T>
                    > extends string
                        ? boolean
                        : never;
                }
              : never)
        | (VFieldType extends number
              ? {
                    readonly function: ArithmeticFunctionDefinition<T>;
                    readonly operator: FilterOperators<
                        FunctionReturnType<ArithmeticFunctionDefinition<T>>
                    >;
                    readonly value: FunctionReturnType<
                        ArithmeticFunctionDefinition<T>
                    > | null;
                    readonly ignoreCase?: never;
                    readonly removeQuotes?: never;
                }
              : never)
        | (VFieldType extends Date
              ? {
                    readonly function: DateFunctionDefinition<T>;
                    readonly operator: FilterOperators<
                        FunctionReturnType<DateFunctionDefinition<T>>
                    >;
                    readonly value: FunctionReturnType<
                        DateFunctionDefinition<T>
                    > | null;
                    readonly ignoreCase?: never;
                    readonly removeQuotes?: FunctionReturnType<
                        DateFunctionDefinition<T>
                    > extends string
                        ? boolean
                        : never;
                }
              : never)
    );

// Fall B: Filter MIT expliziter OData-Funktion (function Eigenschaft)
// B.1: Funktionen, die direkt einen booleschen Ausdruck für OData $filter liefern
export type DirectBooleanODataFunctionFilter<
    T,
    VFieldType extends string,
> = BaseFilterCore<T, VFieldType> & {
    readonly function: Extract<
        StringFunctionDefinition<T>,
        { type: 'contains' | 'startswith' | 'endswith' }
    >;
    readonly operator?: BooleanFilterOperators;
    readonly value?: boolean | null;
    readonly ignoreCase?: never;
    readonly removeQuotes?: never;
};

// B.2: Funktionen, deren Ergebnis mit Operator und Wert verglichen wird
type ComparisonFunctionFilter_Internal<
    T,
    VFieldType,
    F extends AnySupportedFunction<T>,
    FRT,
> = BaseFilterCore<T, VFieldType> & {
    readonly function: F;
    readonly operator: FilterOperators<FRT>;
    readonly value:
        | (FRT extends ODataDateStringLiteral | ODataTimeStringLiteral
              ? string
              : FRT)
        | null;
    readonly ignoreCase?: never;
    readonly removeQuotes?: FRT extends
        | ODataDateStringLiteral
        | ODataTimeStringLiteral
        | string
        ? boolean
        : never;
};

type ComparisonFunctionFilterGenerator<T, VFieldType> = {
    [FuncKey in AnySupportedFunction<T>['type']]: FuncKey extends
        | 'contains'
        | 'startswith'
        | 'endswith'
        ? never
        : ComparisonFunctionFilter_Internal<
              T,
              VFieldType,
              Extract<AnySupportedFunction<T>, { type: FuncKey }>,
              FunctionReturnType<
                  Extract<AnySupportedFunction<T>, { type: FuncKey }>
              >
          >;
}[AnySupportedFunction<T>['type']];

// 6. Spezifische QueryFilter-Typen für jeden Feldtyp
export type StringQueryFilter<T> =
    | StandardFilter<T, string>
    | DirectBooleanODataFunctionFilter<T, string>
    | Extract<
          ComparisonFunctionFilterGenerator<T, string>,
          { function: StringFunctionDefinition<T> }
      >;

export type NumberQueryFilter<T> =
    | StandardFilter<T, number>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | Extract<
          ComparisonFunctionFilterGenerator<T, number>,
          { function: ArithmeticFunctionDefinition<T> }
      >;

export type DateQueryFilter<T> =
    | StandardFilter<T, Date>
    | Extract<
          ComparisonFunctionFilterGenerator<T, Date>,
          { function: DateFunctionDefinition<T> }
      >;

export type GuidQueryFilter<T> = StandardFilter<T, Guid>;
export type BooleanQueryFilter<T> = StandardFilter<T, boolean>;

// 7. Haupt-QueryFilter-Typ
export type QueryFilter<T> =
    | StringQueryFilter<T>
    | NumberQueryFilter<T>
    | DateQueryFilter<T>
    | GuidQueryFilter<T>
    | BooleanQueryFilter<T>
    | LambdaFilter<T>;

export type PropertyTransform<V> = V extends string
    ? StringTransform
    : V extends number
      ? NumberTransform
      : V extends Date
        ? DateTransform
        : V extends Guid
          ? GuidTransform
          : never;

export type LambdaFilter<T> = {
    readonly [K in ArrayFields<T>]: {
        readonly field: K;
        readonly lambdaOperator: 'any' | 'all';
        readonly expression:
            | QueryFilter<ArrayElement<T, K>>
            | CombinedFilter<ArrayElement<T, K>>;
    };
}[ArrayFields<T>];

export type FieldReference<T, V extends string | number | Date | boolean> = {
    readonly fieldReference: FilterFields<T, V>;
};

export type ArrayFields<T> = {
    [K in keyof T]-?: NonNullable<T[K]> extends ReadonlyArray<unknown>
        ? K
        : never;
}[keyof T];

export type ArrayElement<T, K extends ArrayFields<T>> =
    NonNullable<T[K]> extends ReadonlyArray<infer U> ? U : never;

// Korrigierter Join-Typ
type Join<K, P> = K extends string | number
    ? P extends string | number
        ? P extends ''
            ? `${K}` // Wenn P leer ist, nur K zurückgeben
            : K extends ''
              ? `${P}` // Wenn K leer ist, nur P zurückgeben
              : `${K}/${P}` // Normal case: K/P
        : never
    : never;

type Paths<T, VALUETYPE, D extends number = 5> = D extends 0
    ? never
    : {
          [K in keyof T]-?: K extends string
              ? NonNullable<T[K]> extends VALUETYPE
                  ? K
                  : NonNullable<T[K]> extends ReadonlyArray<VALUETYPE>
                    ? K
                    : NonNullable<T[K]> extends ReadonlyArray<infer U>
                      ? U extends object
                          ? VALUETYPE extends U
                              ? K
                              : never
                          : never
                      : NonNullable<T[K]> extends object
                        ? VALUETYPE extends NonNullable<T[K]>
                            ? K
                            : Join<
                                  K,
                                  Paths<
                                      NonNullable<T[K]>,
                                      VALUETYPE,
                                      PrevDepth<D>
                                  >
                              >
                        : never
              : never;
      }[keyof T];

export type FilterFields<T, VALUETYPE, Depth extends number = 5> = Paths<
    T,
    VALUETYPE,
    Depth
>;

export type LambdaFilterFields<T, VALUETYPE> = {
    [K in Extract<keyof T, string>]: NonNullable<T[K]> extends ReadonlyArray<
        infer U_ITEM
    >
        ? U_ITEM extends object
            ? FilterFields<U_ITEM, VALUETYPE>
            : never
        : never;
}[Extract<keyof T, string>];

export type StringTransform = 'tolower' | 'toupper' | 'trim';
export type DateTransform =
    | 'year'
    | 'month'
    | 'day'
    | 'hour'
    | 'minute'
    | 'second';
export type NumberTransform = 'round' | 'floor' | 'ceiling';
export type GuidTransform = 'tolower';

export interface FilterVisitor<T> {
    visitQueryFilter(filter: QueryFilter<T>): string;
    visitCombinedFilter(filter: CombinedFilter<T>): string;
}
