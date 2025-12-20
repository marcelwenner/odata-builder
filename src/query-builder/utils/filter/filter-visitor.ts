import { CombinedFilter } from '../../types/filter/combined-filter.type';

import { isCombinedFilter } from './combined-filter-util';
import {
    isBasicFilter,
    isInFilter,
    isNegatedFilter,
    isHasFilter,
    FilterRenderContext,
} from './filter-utils';
import { getValueType, isGuid, isValidOperator } from './filter-helper.util';
import {
    ArithmeticFunctionDefinition,
    ArrayElement,
    ArrayFields,
    DateTransform,
    FieldReference,
    HasFilter,
    InFilter,
    InFilterValue,
    NegatedFilter,
    QueryFilter,
    SupportedFunction,
} from '../../types/filter/query-filter.type';

interface FilterVisitor<T> {
    visitBasicFilter(filter: QueryFilter<T>): string;
    visitLambdaFilter(filter: QueryFilter<T>, prefix?: string): string;
    visitCombinedFilter(filter: CombinedFilter<T>, prefix?: string): string;
    visitInFilter(filter: InFilter): string;
    visitNegatedFilter(filter: NegatedFilter<T>): string;
    visitHasFilter(filter: HasFilter<T>): string;
}

export class ODataFilterVisitor<T> implements FilterVisitor<T> {
    constructor(private readonly context: FilterRenderContext = {}) {}
    visitBasicFilter<U>(filter: QueryFilter<U>): string {
        if (!('value' in filter)) {
            throw new Error('Invalid BasicFilter: missing "value" property');
        }

        if (filter.value === null) {
            const leftSide =
                'function' in filter && filter.function
                    ? this.processFunction(filter.function, filter.field)
                    : this.getTransformedField(filter);

            return `${leftSide} ${filter.operator} null`;
        }

        const valueType = getValueType(filter.value);

        if (valueType === 'unknown') {
            throw new Error(`Unsupported value type: ${typeof filter.value}`);
        }

        this.validateOperator(valueType, filter.operator);

        const transformedField = this.getTransformedField(filter);

        if (filter.value instanceof Date) {
            if ('transform' in filter && filter.transform.length) {
                const transformedValue = this.applyDateTransforms(
                    filter.value,
                    filter.transform as DateTransform[],
                );
                return `${transformedField} ${filter.operator} ${transformedValue}`;
            } else {
                const leftSide =
                    'function' in filter && filter.function
                        ? this.processFunction(filter.function, filter.field)
                        : transformedField;
                // Konvertiere Datum in ISO-String
                const isoDate = filter.value.toISOString();
                return `${leftSide} ${filter.operator} ${isoDate}`;
            }
        }

        if (typeof filter.value === 'string') {
            const transformedValue =
                'ignoreCase' in filter && filter.ignoreCase
                    ? filter.value.toLowerCase()
                    : filter.value;

            // Escape single quotes for OData (apostrophe -> double apostrophe)
            const escapedValue = transformedValue.replace(/'/g, "''");

            const value =
                'removeQuotes' in filter && filter.removeQuotes
                ? escapedValue
                : `'${escapedValue}'`;

            if ('function' in filter && filter.function) {
                const fieldForFunction =
                    'ignoreCase' in filter && filter.ignoreCase
                        ? `tolower(${String(filter.field)})`
                        : String(filter.field);

                const booleanPredicates = [
                    'contains',
                    'startswith',
                    'endswith',
                ];
                if (booleanPredicates.includes(filter.function.type)) {
                    return this.processFunction(
                        filter.function,
                        fieldForFunction,
                    );
                }
                const leftSide = this.processFunction(
                    filter.function,
                    fieldForFunction,
                );
                return `${leftSide} ${filter.operator} ${value}`;
            }

            return `${transformedField} ${filter.operator} ${value}`;
        }

        if (typeof filter.value === 'number') {
            const leftSide =
                'function' in filter && filter.function
                    ? this.processFunction(filter.function, filter.field)
                    : transformedField;
            return `${leftSide} ${filter.operator} ${filter.value}`;
        }

        if (typeof filter.value === 'boolean') {
            if ('function' in filter && filter.function) {
                const func = filter.function;
                const booleanPredicates = [
                    'contains',
                    'startswith',
                    'endswith',
                ];
                if ('type' in func && booleanPredicates.includes(func.type)) {
                    const fieldForFunction =
                        'ignoreCase' in filter && filter.ignoreCase
                            ? `tolower(${String(filter.field)})`
                            : String(filter.field);
                    const funcWithLowercasedValue =
                        'ignoreCase' in filter &&
                        filter.ignoreCase &&
                        'value' in func &&
                        typeof func.value === 'string'
                            ? { ...func, value: func.value.toLowerCase() }
                            : func;
                    return this.processFunction(
                        funcWithLowercasedValue,
                        fieldForFunction,
                    );
                }
            }
        }

        return `${transformedField} ${filter.operator} ${String(filter.value)}`;
    }

    visitLambdaFilter<U>(
        filter: QueryFilter<U>,
        parentPrefix?: string,
    ): string {
        if (
            !('lambdaOperator' in filter) ||
            !filter.lambdaOperator ||
            !('expression' in filter) ||
            !filter.expression
        ) {
            throw new Error(`Invalid LambdaFilter: ${JSON.stringify(filter)}`);
        }

        // Generate new parameter name based on parent
        const currentParam = parentPrefix
            ? String.fromCharCode(parentPrefix.charCodeAt(0) + 1)
            : 's'; // Start with 's' if no parent

        const expression = filter.expression;
        const field = this.getPrefixedField(filter.field, parentPrefix);

        if (isCombinedFilter(expression)) {
            const subQuery = this.visitCombinedFilter(expression, currentParam);
            return `${field}/${filter.lambdaOperator}(${currentParam}: ${subQuery})`;
        }

        if (
            isLambdaFilter(
                expression as QueryFilter<ArrayElement<U, ArrayFields<U>>>,
            )
        ) {
            const nestedQuery = this.visitLambdaFilter(
                expression as QueryFilter<ArrayElement<U, ArrayFields<U>>>,
                currentParam,
            );
            return `${field}/${filter.lambdaOperator}(${currentParam}: ${nestedQuery})`;
        }

        if (isBasicFilter(expression)) {
            const prefixedExpression = {
                ...expression,
                field: this.getPrefixedField(
                    expression.field || '',
                    currentParam,
                ),
                ignoreCase:
                    'ignoreCase' in expression
                        ? expression.ignoreCase
                        : undefined,
                removeQuotes:
                    'removeQuotes' in expression
                        ? expression.removeQuotes
                        : undefined,
                transform:
                    'transform' in expression
                        ? expression.transform
                        : undefined,
            } as QueryFilter<U>;
            const subQuery = this.visitBasicFilter(prefixedExpression);
            return `${field}/${filter.lambdaOperator}(${currentParam}: ${subQuery})`;
        }

        throw new Error(
            `Invalid expression in LambdaFilter: ${JSON.stringify(expression)}`,
        );
    }

    visitCombinedFilter<U>(
        filter: CombinedFilter<U>,
        currentPrefix?: string,
    ): string {
        const combinedQueries = filter.filters
            .map(subFilter => {
                if (isCombinedFilter(subFilter)) {
                    return this.visitCombinedFilter(subFilter, currentPrefix);
                }
                if (isLambdaFilter(subFilter as QueryFilter<U>)) {
                    return this.visitLambdaFilter(
                        subFilter as QueryFilter<U>,
                        currentPrefix,
                    );
                }
                if (isInFilter(subFilter)) {
                    const prefixedFilter = {
                        ...subFilter,
                        field: this.getPrefixedField(
                            subFilter.field,
                            currentPrefix,
                        ),
                    } as InFilter;
                    return this.visitInFilter(prefixedFilter);
                }
                if (isNegatedFilter(subFilter)) {
                    return this.visitNegatedFilter(subFilter as NegatedFilter<U>);
                }
                if (isHasFilter(subFilter)) {
                    const prefixedFilter = {
                        ...subFilter,
                        field: this.getPrefixedField(
                            subFilter.field,
                            currentPrefix,
                        ),
                    } as HasFilter<U>;
                    return this.visitHasFilter(prefixedFilter);
                }
                if (isBasicFilter(subFilter)) {
                    const prefixedFilter = {
                        ...subFilter,
                        field: this.getPrefixedField(
                            subFilter.field,
                            currentPrefix,
                        ),
                    } as QueryFilter<U>;
                    return this.visitBasicFilter(prefixedFilter);
                }
                throw new Error(
                    `Invalid sub-filter: ${JSON.stringify(subFilter)}`,
                );
            })
            .join(` ${filter.logic} `);

        return combinedQueries.includes(' ')
            ? `(${combinedQueries})`
            : combinedQueries;
    }

    visitInFilter(filter: InFilter): string {
        const field = String(filter.field);
        const formattedValues = filter.values.map(v =>
            this.formatInValue(v),
        );

        if (this.context.legacyInOperator) {
            // OData 4.0 fallback: (field eq v1 or field eq v2 or ...)
            const conditions = formattedValues.map(v => `${field} eq ${v}`);
            return `(${conditions.join(' or ')})`;
        }

        // OData 4.01: field in (v1, v2, ...)
        return `${field} in (${formattedValues.join(', ')})`;
    }

    visitNegatedFilter<U>(filter: NegatedFilter<U>): string {
        const innerFilter = filter.filter;

        let innerQuery: string;
        if (isCombinedFilter(innerFilter)) {
            innerQuery = this.visitCombinedFilter(innerFilter);
        } else if (isNegatedFilter(innerFilter)) {
            innerQuery = this.visitNegatedFilter(innerFilter);
        } else if (isInFilter(innerFilter)) {
            innerQuery = this.visitInFilter(innerFilter);
        } else if (isHasFilter(innerFilter)) {
            innerQuery = this.visitHasFilter(innerFilter);
        } else if (isLambdaFilter(innerFilter as QueryFilter<U>)) {
            innerQuery = this.visitLambdaFilter(innerFilter as QueryFilter<U>);
        } else if (isBasicFilter(innerFilter)) {
            innerQuery = this.visitBasicFilter(innerFilter as QueryFilter<U>);
        } else {
            throw new Error(
                `Invalid filter inside not(): ${JSON.stringify(innerFilter)}`,
            );
        }

        // Always use parentheses to ensure correct precedence
        return `not (${innerQuery})`;
    }

    visitHasFilter<U>(filter: HasFilter<U>): string {
        // Raw passthrough - the value is expected to be a valid OData enum literal
        // e.g., "Sales.Color'Yellow'" or just the enum value as per server requirements
        return `${filter.field} has ${filter.value}`;
    }

    private formatInValue(value: InFilterValue): string {
        if (value === null) {
            return 'null';
        }
        if (typeof value === 'string') {
            if (isGuid(value)) {
                return value;
            }
            // Escape single quotes: O'Reilly → 'O''Reilly'
            return `'${value.replace(/'/g, "''")}'`;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        throw new Error(`Unsupported value type in 'in' filter: ${typeof value}`);
    }

    private getTransformedField<U>(filter: Exclude<QueryFilter<U>, NegatedFilter<U>>): string {
        // Alle definierten Transformationen zusammenfassen
        const transforms = [
            ...('ignoreCase' in filter && filter.ignoreCase ? ['tolower'] : []),
            ...('transform' in filter && Array.isArray(filter.transform)
                ? filter.transform
                : []),
        ];

        // Transformationen auf das Feld anwenden
        return transforms.reduce(
            (acc, transform) => `${transform}(${acc})`,
            `${String(filter.field)}`,
        );
    }

    private applyDateTransforms(
        date: Date,
        transforms: DateTransform[],
    ): number {
        const dateTransforms: Record<DateTransform, (date: Date) => number> = {
            year: date => date.getUTCFullYear(),
            month: date => date.getUTCMonth() + 1,
            day: date => date.getUTCDate(),
            hour: date => date.getUTCHours(),
            minute: date => date.getUTCMinutes(),
            second: date => date.getUTCSeconds(),
        };

        return transforms.reduce((acc, transform) => {
            const transformFn = dateTransforms[transform];
            if (!transformFn) {
                throw new Error(`Unsupported DateTransform: ${transform}`);
            }
            return transformFn(new Date(acc)); // Transformierten Wert erneut anwenden
        }, +date); // Datum in Timestamp umwandeln
    }

    private processFunction<T>(
        func: SupportedFunction<T>,
        field: string,
    ): string {
        if (!func.type) {
            throw new Error(
                'Invalid function definition: missing "type" property',
            );
        }

        switch (func.type) {
            case 'concat': {
                const args = [
                    field,
                    ...func.values.map(v => this.formatValue(v)),
                ];
                return `concat(${args.join(', ')})`;
            }
            case 'contains':
                return `contains(${field}, ${this.formatValue(func.value)})`;

            case 'endswith':
                return `endswith(${field}, ${this.formatValue(func.value)})`;

            case 'indexof':
                return `indexof(${field}, ${this.formatValue(func.value)})`;

            case 'length':
                return `length(${field})`;

            case 'startswith':
                return `startswith(${field}, ${this.formatValue(func.value)})`;

            case 'substring': {
                const args = [func.start];
                if (func.length !== undefined) {
                    args.push(func.length);
                }
                return `substring(${field}, ${args.map(arg => this.formatValue(arg)).join(', ')})`;
            }

            case 'add':
            case 'sub':
            case 'mul':
            case 'div':
            case 'mod':
                return this.createArithmeticHandler<T>(func.type)(func, field);

            case 'now':
                return 'now()';

            case 'date':
                return `date(${this.resolveField(func.field)})`;

            case 'time':
                return `time(${this.resolveField(func.field)})`;

            default:
                throw new Error(
                    `Unsupported function type: ${(func as { type: string }).type}`,
                );
        }
    }

    private resolveField<T, V extends string | number | Date | boolean>(
        field: FieldReference<T, V> | string,
    ): string {
        if (typeof field === 'string') {
            return field;
        }

        if ('/' in field) {
            return field.fieldReference;
        }

        throw new Error('Unsupported FieldReference type');
    }

    private createArithmeticHandler<T>(
        operator: 'add' | 'sub' | 'mul' | 'div' | 'mod',
    ) {
        return (
            func: ArithmeticFunctionDefinition<T>,
            field: string,
        ): string => {
            if (!('operand' in func)) {
                throw new Error(
                    `Invalid function definition: missing "operand" property`,
                );
            }
            return `${field} ${operator} ${this.formatValue(func.operand)}`;
        };
    }

    private formatValue(value: unknown): string {
        if (typeof value === 'string') {
            // Escape single quotes for OData (apostrophe -> double apostrophe)
            return `'${value.replace(/'/g, "''")}'`;
        }
        if (value instanceof Date) {
            return `${value.toISOString()}`;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        throw new Error(`Unsupported value type: ${typeof value}`);
    }

    private getPrefixedField(
        field: string | number | symbol,
        prefix?: string,
    ): string {
        const fieldStr = String(field);
        if (!prefix) return fieldStr;
        if (fieldStr === 's') return prefix;
        if (fieldStr === prefix) return fieldStr;
        return fieldStr ? `${prefix}/${fieldStr}` : prefix;
    }

    private validateOperator(type: string, operator: string): void {
        if (!isValidOperator(type, operator)) {
            throw new Error(
                `Invalid operator "${operator}" for type "${type}"`,
            );
        }
    }
}

// Helper type guard for lambda filters
function isLambdaFilter<T>(filter: QueryFilter<T>): filter is QueryFilter<T> & {
    lambdaOperator: string;
    expression: unknown;
} {
    return (
        'lambdaOperator' in filter &&
        typeof filter.lambdaOperator === 'string' &&
        'expression' in filter
    );
}
