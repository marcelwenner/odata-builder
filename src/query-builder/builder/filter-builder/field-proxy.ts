import { QueryFilter } from '../../types/filter/query-filter.type';
import {
    FilterExpression,
    FieldProxy,
    ProxyContext,
    FunctionDefinition,
} from './filter-builder.types';

// ============================================================================
// Known Operations - Used to distinguish field access from method calls
// ============================================================================

const COMPARISON_OPS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in', 'has'] as const;
const STRING_PREDICATES = ['contains', 'startswith', 'endswith'] as const;
const STRING_FUNCTIONS = ['length', 'indexof', 'substring', 'concat'] as const;
const STRING_TRANSFORMS = ['tolower', 'toupper', 'trim'] as const;
const NUMBER_TRANSFORMS = ['round', 'floor', 'ceiling'] as const;
const DATE_TRANSFORMS = [
    'year',
    'month',
    'day',
    'hour',
    'minute',
    'second',
] as const;
const ARITHMETIC_OPS = ['add', 'sub', 'mul', 'div', 'mod'] as const;
const MODIFIERS = ['ignoreCase', 'removeQuotes'] as const;
const ARRAY_OPS = ['any', 'all'] as const;
const BOOLEAN_SHORTCUTS = ['isTrue', 'isFalse'] as const;

const ALL_OPERATIONS = new Set<string>([
    ...COMPARISON_OPS,
    ...STRING_PREDICATES,
    ...STRING_FUNCTIONS,
    ...STRING_TRANSFORMS,
    ...NUMBER_TRANSFORMS,
    ...DATE_TRANSFORMS,
    ...ARITHMETIC_OPS,
    ...MODIFIERS,
    ...ARRAY_OPS,
    ...BOOLEAN_SHORTCUTS,
]);

// ============================================================================
// Proxy Factory
// ============================================================================

/**
 * Creates a FieldProxy for type-safe property access and operations
 *
 * @param context - The current proxy context (path, transforms, etc.)
 * @returns A Proxy object that captures property access and provides operations
 */
export function createFieldProxy<T>(
    context: ProxyContext = {
        path: [],
        transforms: [],
        ignoreCase: false,
        removeQuotes: false,
    },
): FieldProxy<T> {
    return new Proxy({} as FieldProxy<T>, {
        get(_target, prop: string | symbol): unknown {
            // Ignore symbol properties (used by JS internals)
            if (typeof prop === 'symbol') {
                return undefined;
            }

            // Check if this is an operation or a field access
            if (ALL_OPERATIONS.has(prop)) {
                return createOperation<T>(prop, context);
            }

            // It's a field access - return a new proxy with updated path
            return createFieldProxy<T>({
                ...context,
                path: [...context.path, prop],
            });
        },
    });
}

// ============================================================================
// Operation Factory
// ============================================================================

/**
 * Creates the appropriate operation function based on the operation name
 * Note: Using 'unknown' and casts because the actual types depend on the operation
 */
function createOperation<T>(
    operation: string,
    context: ProxyContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (...args: any[]) => FilterExpression<T> | FieldProxy<T> {
    const fieldPath = context.path.join('/');

    // Validate that we have a field path for operations that need it
    if (context.path.length === 0 && !['any', 'all'].includes(operation)) {
        // For lambda expressions, 's' is used as the implicit field
        // This is handled specially in array operations
    }

    switch (operation) {
        // ====================================================================
        // Comparison Operators - Return FilterExpression
        // ====================================================================
        case 'eq':
        case 'ne':
        case 'gt':
        case 'ge':
        case 'lt':
        case 'le':
            return (value: unknown) =>
                createFilterExpression<T>(fieldPath, operation, value, context);

        case 'in':
            return (values: unknown[]) => {
                if (!Array.isArray(values) || values.length === 0) {
                    throw new Error(
                        `FilterBuilder: in() requires at least one value. ` +
                            `Field: '${fieldPath}'`,
                    );
                }
                return createInFilterExpression<T>(fieldPath, values);
            };

        case 'has':
            return (enumLiteral: string) => {
                return createHasFilterExpression<T>(fieldPath, enumLiteral);
            };

        // ====================================================================
        // String Predicates - Return FilterExpression (boolean predicate)
        // ====================================================================
        case 'contains':
        case 'startswith':
        case 'endswith':
            return (value: string) =>
                createBooleanPredicateExpression<T>(
                    fieldPath,
                    { type: operation, value } as FunctionDefinition,
                    context,
                );

        // ====================================================================
        // String Functions - Return new Proxy for further chaining
        // ====================================================================
        case 'length':
            return () =>
                createFieldProxy<T>({
                    ...context,
                    func: { type: 'length' },
                });

        case 'indexof':
            return (value: string) =>
                createFieldProxy<T>({
                    ...context,
                    func: { type: 'indexof', value },
                });

        case 'substring':
            return (start: number, length?: number) => {
                const func: FunctionDefinition = { type: 'substring', start };
                if (length !== undefined) {
                    (
                        func as {
                            type: 'substring';
                            start: number;
                            length?: number;
                        }
                    ).length = length;
                }
                return createFieldProxy<T>({
                    ...context,
                    func,
                });
            };

        case 'concat':
            return (...values: string[]) =>
                createFieldProxy<T>({
                    ...context,
                    func: { type: 'concat', values },
                });

        // ====================================================================
        // String Transforms - Return new Proxy with transform added
        // ====================================================================
        case 'tolower':
        case 'toupper':
        case 'trim':
            return () =>
                createFieldProxy<T>({
                    ...context,
                    transforms: [...context.transforms, operation],
                });

        // ====================================================================
        // Number Transforms - Return new Proxy with transform added
        // ====================================================================
        case 'round':
        case 'floor':
        case 'ceiling':
            return () =>
                createFieldProxy<T>({
                    ...context,
                    transforms: [...context.transforms, operation],
                });

        // ====================================================================
        // Date Transforms - Return new Proxy with transform added
        // ====================================================================
        case 'year':
        case 'month':
        case 'day':
        case 'hour':
        case 'minute':
        case 'second':
            return () =>
                createFieldProxy<T>({
                    ...context,
                    transforms: [...context.transforms, operation],
                });

        // ====================================================================
        // Arithmetic Operations - Return new Proxy with function
        // ====================================================================
        case 'add':
        case 'sub':
        case 'mul':
        case 'div':
        case 'mod':
            return (operand: number) =>
                createFieldProxy<T>({
                    ...context,
                    func: { type: operation, operand } as FunctionDefinition,
                });

        // ====================================================================
        // Modifiers - Return new Proxy with modifier enabled
        // ====================================================================
        case 'ignoreCase':
            return () =>
                createFieldProxy<T>({
                    ...context,
                    ignoreCase: true,
                });

        case 'removeQuotes':
            return () =>
                createFieldProxy<T>({
                    ...context,
                    removeQuotes: true,
                });

        // ====================================================================
        // Boolean Shortcuts - Return FilterExpression
        // ====================================================================
        case 'isTrue':
            return () =>
                createFilterExpression<T>(fieldPath, 'eq', true, context);

        case 'isFalse':
            return () =>
                createFilterExpression<T>(fieldPath, 'eq', false, context);

        // ====================================================================
        // Array Operations (Lambda) - Return FilterExpression
        // ====================================================================
        case 'any':
        case 'all':
            return (
                predicate: (
                    x: FieldProxy<unknown>,
                ) => FilterExpression<unknown>,
            ) => {
                // Create a proxy for the lambda parameter
                // For primitive arrays, properties are accessed via 's'
                const elementProxy = createFieldProxy<unknown>({
                    path: [],
                    transforms: [],
                    ignoreCase: false,
                    removeQuotes: false,
                });

                // Execute the predicate to get the inner expression
                const innerExpression = predicate(elementProxy);

                return createLambdaExpression<T>(
                    fieldPath,
                    operation,
                    innerExpression,
                );
            };

        default:
            throw new Error(
                `FilterBuilder: Unknown operation '${operation}'. ` +
                    `This might be a typo or the operation is not supported.`,
            );
    }
}

// ============================================================================
// Expression Builders
// ============================================================================

/**
 * Creates a FilterExpression for comparison operations
 */
function createFilterExpression<T>(
    field: string,
    operator: string,
    value: unknown,
    context: ProxyContext,
): FilterExpression<T> {
    const filter: Record<string, unknown> = {
        field: field, // Empty string for primitive array elements - visitor handles prefixing
        operator,
        value,
    };

    // Add transforms if present
    if (context.transforms.length > 0) {
        filter['transform'] = [...context.transforms];
    }

    // Add ignoreCase if enabled
    if (context.ignoreCase) {
        filter['ignoreCase'] = true;
    }

    // Add removeQuotes if enabled
    if (context.removeQuotes) {
        filter['removeQuotes'] = true;
    }

    // Add function if present
    if (context.func) {
        filter['function'] = context.func;
    }

    return {
        _type: 'expression',
        _filter: filter as QueryFilter<T>,
    };
}

/**
 * Creates a FilterExpression for boolean predicates (contains, startswith, endswith)
 * These don't need an operator/value pair - they ARE the predicate
 */
function createBooleanPredicateExpression<T>(
    field: string,
    func: FunctionDefinition,
    context: ProxyContext,
): FilterExpression<T> {
    const filter: Record<string, unknown> = {
        field: field, // Empty string for primitive array elements - visitor handles prefixing
        function: func,
        operator: 'eq',
        value: true,
    };

    // Add ignoreCase if enabled (applies tolower to the field)
    if (context.ignoreCase) {
        filter['ignoreCase'] = true;
    }

    return {
        _type: 'expression',
        _filter: filter as QueryFilter<T>,
    };
}

/**
 * Creates a FilterExpression for lambda operations (any/all)
 */
function createLambdaExpression<T>(
    field: string,
    lambdaOperator: 'any' | 'all',
    innerExpression: FilterExpression<unknown>,
): FilterExpression<T> {
    // Transform the inner filter to use the correct field reference
    const innerFilter = innerExpression._filter as QueryFilter<unknown>;

    return {
        _type: 'expression',
        _filter: {
            field,
            lambdaOperator,
            expression: innerFilter,
        } as unknown as QueryFilter<T>,
    };
}

/**
 * Creates a FilterExpression for 'in' operator (OData 4.01)
 */
function createInFilterExpression<T>(
    field: string,
    values: unknown[],
): FilterExpression<T> {
    return {
        _type: 'expression',
        _filter: {
            field,
            operator: 'in',
            values,
        } as unknown as QueryFilter<T>,
    };
}

/**
 * Creates a FilterExpression for 'has' operator (enum flag check)
 */
function createHasFilterExpression<T>(
    field: string,
    enumLiteral: string,
): FilterExpression<T> {
    return {
        _type: 'expression',
        _filter: {
            field,
            operator: 'has',
            value: enumLiteral,
        } as unknown as QueryFilter<T>,
    };
}
