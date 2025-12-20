import { CombinedFilter } from '../../types/filter/combined-filter.type';
import {
    HasFilter,
    InFilter,
    NegatedFilter,
    QueryFilter,
} from '../../types/filter/query-filter.type';
import { isCombinedFilter } from './combined-filter-util';
import { ODataFilterVisitor } from './filter-visitor';

export interface FilterRenderContext {
    /**
     * Use legacy 'or' fallback for 'in' operator (for OData 4.0 servers)
     * Default: false (uses OData 4.01 'in' syntax)
     */
    legacyInOperator?: boolean | undefined;
}

export const toFilterQuery = <T>(
    filters: Array<QueryFilter<T> | CombinedFilter<T>>,
    context: FilterRenderContext = {},
): string => {
    if (filters.length === 0) return '';

    const visitor = new ODataFilterVisitor<T>(context);

    return filters.reduce((prev, curr, index) => {
        if (
            !isCombinedFilter(curr) &&
            !isLambdaFilter(curr) &&
            !isBasicFilter(curr) &&
            !isInFilter(curr) &&
            !isNegatedFilter(curr) &&
            !isHasFilter(curr)
        ) {
            throw new Error(`Invalid filter: ${JSON.stringify(curr)}`);
        }

        let queryPart: string;
        if (isCombinedFilter(curr)) {
            queryPart = visitor.visitCombinedFilter(curr);
        } else if (isLambdaFilter(curr)) {
            queryPart = visitor.visitLambdaFilter(curr);
        } else if (isInFilter(curr)) {
            queryPart = visitor.visitInFilter(curr);
        } else if (isNegatedFilter(curr)) {
            queryPart = visitor.visitNegatedFilter(curr);
        } else if (isHasFilter(curr)) {
            queryPart = visitor.visitHasFilter(curr);
        } else {
            queryPart = visitor.visitBasicFilter(curr);
        }

        return prev + (index > 0 ? ' and ' : '') + queryPart;
    }, '$filter=');
};

export function isBasicFilter<T>(obj: unknown): obj is QueryFilter<T> {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'field' in obj &&
        'operator' in obj &&
        'value' in obj &&
        !('lambdaOperator' in obj)
    );
}

export function isLambdaFilter<T>(obj: unknown): obj is QueryFilter<T> {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'field' in obj &&
        'lambdaOperator' in obj &&
        'expression' in obj &&
        (isBasicFilter(obj.expression) ||
            isCombinedFilter(obj.expression) ||
            isLambdaFilter(obj.expression))
    );
}

export function isInFilter(obj: unknown): obj is InFilter {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'field' in obj &&
        'operator' in obj &&
        (obj as { operator: string }).operator === 'in' &&
        'values' in obj &&
        Array.isArray((obj as { values: unknown }).values)
    );
}

export function isNegatedFilter<T>(obj: unknown): obj is NegatedFilter<T> {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'type' in obj &&
        (obj as { type: string }).type === 'not' &&
        'filter' in obj
    );
}

export function isHasFilter<T>(obj: unknown): obj is HasFilter<T> {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'field' in obj &&
        'operator' in obj &&
        (obj as { operator: string }).operator === 'has' &&
        'value' in obj
    );
}
