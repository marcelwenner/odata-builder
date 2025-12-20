import { QueryFilter } from '../../types/filter/query-filter.type';
import { CombinedFilter } from '../../types/filter/combined-filter.type';
import { Guid } from '../../types/utils/util.types';

// ============================================================================
// FilterExpression - Internal wrapper for filter objects
// ============================================================================

export interface FilterExpression<T> {
    readonly _type: 'expression';
    readonly _filter: QueryFilter<T> | CombinedFilter<T>;
}

// ============================================================================
// Field Operations - Type-specific operations available on each field type
// ============================================================================

/**
 * Helper type: checks if null is part of T
 */
type IncludesNull<T> = null extends T ? true : false;

/**
 * Helper type: conditionally adds null to V if AllowNull is true
 */
type MaybeNull<V, AllowNull extends boolean> = AllowNull extends true
    ? V | null
    : V;

/**
 * Base operations available on all field types
 * AllowNull determines whether eq/ne accept null (based on original field type)
 */
interface BaseFieldOperations<T, V, AllowNull extends boolean = false> {
    eq(value: MaybeNull<V, AllowNull>): FilterExpression<T>;
    ne(value: MaybeNull<V, AllowNull>): FilterExpression<T>;
    /**
     * Membership test using 'in' operator (OData 4.01)
     * @throws Error if values array is empty
     */
    in(values: MaybeNull<V, AllowNull>[]): FilterExpression<T>;
}

/**
 * String-specific operations
 * V preserves literal string types (e.g., 'open' | 'closed')
 * AllowNull determines whether eq/ne accept null
 */
export interface StringFieldOperations<
    T,
    V extends string = string,
    AllowNull extends boolean = false,
> extends BaseFieldOperations<T, V, AllowNull> {
    // Case insensitivity modifier
    ignoreCase(): StringFieldOperations<T, V, AllowNull>;

    // String predicates (return boolean - no further comparison needed)
    contains(value: string): FilterExpression<T>;
    startswith(value: string): FilterExpression<T>;
    endswith(value: string): FilterExpression<T>;

    // String functions returning values (can be chained with comparison)
    length(): NumberFieldOperations<T>;
    indexof(value: string): NumberFieldOperations<T>;
    substring(start: number, length?: number): StringFieldOperations<T, string, AllowNull>;
    concat(...values: string[]): StringFieldOperations<T, string, AllowNull>;

    // String transforms
    tolower(): StringFieldOperations<T, V, AllowNull>;
    toupper(): StringFieldOperations<T, V, AllowNull>;
    trim(): StringFieldOperations<T, V, AllowNull>;

    /**
     * Enum flag check using 'has' operator
     * Value must be a valid OData enum literal (e.g., "Sales.Color'Yellow'")
     * The library passes the value through unchanged - caller is responsible for correct format.
     */
    has(enumLiteral: string): FilterExpression<T>;
}

/**
 * Number-specific operations
 * AllowNull determines whether eq/ne accept null
 */
export interface NumberFieldOperations<
    T,
    AllowNull extends boolean = false,
> extends BaseFieldOperations<T, number, AllowNull> {
    // Comparison operators
    gt(value: number): FilterExpression<T>;
    ge(value: number): FilterExpression<T>;
    lt(value: number): FilterExpression<T>;
    le(value: number): FilterExpression<T>;

    // Arithmetic functions
    add(operand: number): NumberFieldOperations<T, AllowNull>;
    sub(operand: number): NumberFieldOperations<T, AllowNull>;
    mul(operand: number): NumberFieldOperations<T, AllowNull>;
    div(operand: number): NumberFieldOperations<T, AllowNull>;
    mod(operand: number): NumberFieldOperations<T, AllowNull>;

    // Number transforms
    round(): NumberFieldOperations<T, AllowNull>;
    floor(): NumberFieldOperations<T, AllowNull>;
    ceiling(): NumberFieldOperations<T, AllowNull>;
}

/**
 * Date-specific operations
 * AllowNull determines whether eq/ne accept null
 */
export interface DateFieldOperations<
    T,
    AllowNull extends boolean = false,
> extends BaseFieldOperations<T, Date, AllowNull> {
    // Comparison operators
    gt(value: Date): FilterExpression<T>;
    ge(value: Date): FilterExpression<T>;
    lt(value: Date): FilterExpression<T>;
    le(value: Date): FilterExpression<T>;

    // Date extraction transforms (return number for comparison)
    // Note: extracted values are never null, so AllowNull=false
    year(): NumberFieldOperations<T>;
    month(): NumberFieldOperations<T>;
    day(): NumberFieldOperations<T>;
    hour(): NumberFieldOperations<T>;
    minute(): NumberFieldOperations<T>;
    second(): NumberFieldOperations<T>;
}

/**
 * Boolean-specific operations
 * AllowNull determines whether eq/ne accept null
 */
export interface BooleanFieldOperations<
    T,
    AllowNull extends boolean = false,
> extends BaseFieldOperations<T, boolean, AllowNull> {
    // Convenience methods
    isTrue(): FilterExpression<T>;
    isFalse(): FilterExpression<T>;
}

/**
 * Guid-specific operations
 * AllowNull determines whether eq/ne accept null
 */
export interface GuidFieldOperations<
    T,
    AllowNull extends boolean = false,
> extends BaseFieldOperations<T, Guid, AllowNull> {
    // Guid modifiers
    removeQuotes(): GuidFieldOperations<T, AllowNull>;
    tolower(): GuidFieldOperations<T, AllowNull>;
}

/**
 * Array-specific operations (for lambda filters)
 */
export interface ArrayFieldOperations<T, E> {
    any(predicate: (element: FieldProxy<E>) => FilterExpression<E>): FilterExpression<T>;
    all(predicate: (element: FieldProxy<E>) => FilterExpression<E>): FilterExpression<T>;
}

// ============================================================================
// FieldProxy - Maps object properties to their type-specific operations
// ============================================================================

/**
 * Internal type for primitive array element wrapper
 * When array is string[], number[], etc., we wrap it as { s: T }
 */
export type PrimitiveArrayWrapper<V> = { s: V };

/**
 * Determines the appropriate field operations type based on the field's value type
 * Note: Guid must be checked before string since Guid extends string
 * TRoot is the root entity type (for FilterExpression return type)
 * V is the current field value type (after NonNullable)
 * AllowNull indicates if the original field type included null
 *
 * Uses [V] extends [...] pattern to prevent distributive conditional types
 * This ensures literal unions like 'open' | 'closed' are preserved as-is
 */
type FieldOperationsFor<
    TRoot,
    V,
    AllowNull extends boolean = false,
> = [V] extends [Guid]
    ? GuidFieldOperations<TRoot, AllowNull>
    : [V] extends [string]
      ? StringFieldOperations<TRoot, V & string, AllowNull>
      : [V] extends [number]
        ? NumberFieldOperations<TRoot, AllowNull>
        : [V] extends [boolean]
          ? BooleanFieldOperations<TRoot, AllowNull>
          : [V] extends [Date]
            ? DateFieldOperations<TRoot, AllowNull>
            : [V] extends [Array<infer E>]
              ? E extends object
                  ? ArrayFieldOperations<TRoot, E>
                  : ArrayFieldOperations<TRoot, PrimitiveArrayWrapper<E>>
              : [V] extends [object]
                ? NestedFieldProxy<TRoot, V>
                : never;

/**
 * NestedFieldProxy for accessing nested object properties while preserving the root type
 * TRoot is the root entity type (for FilterExpression return type)
 * T is the current nested object type (for property access)
 */
export type NestedFieldProxy<TRoot, T> = {
    [K in keyof T]-?: FieldOperationsFor<TRoot, NonNullable<T[K]>, IncludesNull<T[K]>>;
};

/**
 * The main FieldProxy type - provides type-safe property access with operations
 *
 * @example
 * // For type User = { name: string; age: number; tags: string[]; address: { city: string } }
 * // FieldProxy<User> provides:
 * // - x.name -> StringFieldOperations<User, string, false>
 * // - x.age -> NumberFieldOperations<User, false>
 * // - x.tags -> ArrayFieldOperations<User, { s: string }>
 * // - x.address.city -> StringFieldOperations<User, string, false>  (Root type preserved!)
 * // - x.nullableName (string | null) -> StringFieldOperations<User, string, true>  (allows eq(null))
 */
export type FieldProxy<T> = {
    [K in keyof T]-?: FieldOperationsFor<T, NonNullable<T[K]>, IncludesNull<T[K]>>;
};

// ============================================================================
// FilterBuilder Input Types
// ============================================================================

/**
 * Predicate function type for where/and/or methods
 */
export type FilterPredicate<T> = (x: FieldProxy<T>) => FilterExpression<T>;

/**
 * Input type that accepts either a predicate function or another FilterBuilder
 */
export type FilterInput<T> = FilterPredicate<T> | FilterBuilderLike<T>;

/**
 * Interface for FilterBuilder-like objects (allows type-safe composition)
 */
export interface FilterBuilderLike<T> {
    build(): QueryFilter<T> | CombinedFilter<T> | null;
}

// ============================================================================
// Internal Types for Proxy Context
// ============================================================================

/**
 * Context maintained during proxy traversal
 */
export interface ProxyContext {
    /** Field path segments, e.g., ['details', 'name'] -> 'details/name' */
    path: string[];
    /** Applied transforms, e.g., ['tolower', 'trim'] */
    transforms: string[];
    /** Whether ignoreCase is enabled */
    ignoreCase: boolean;
    /** Whether to remove quotes (for Guid) */
    removeQuotes: boolean;
    /** Applied function definition */
    func?: FunctionDefinition;
}

/**
 * Function definition types
 */
export type FunctionDefinition =
    | { type: 'contains'; value: string }
    | { type: 'startswith'; value: string }
    | { type: 'endswith'; value: string }
    | { type: 'length' }
    | { type: 'indexof'; value: string }
    | { type: 'substring'; start: number; length?: number }
    | { type: 'concat'; values: string[] }
    | { type: 'add'; operand: number }
    | { type: 'sub'; operand: number }
    | { type: 'mul'; operand: number }
    | { type: 'div'; operand: number }
    | { type: 'mod'; operand: number };

// ============================================================================
// Internal Types for FilterBuilder
// ============================================================================

/**
 * Internal representation of a filter part in the builder
 */
export interface FilterPart<T> {
    /** Logic operator connecting this part to the previous one */
    logic?: 'and' | 'or';
    /** The actual filter */
    filter: QueryFilter<T> | CombinedFilter<T>;
}
