import { QueryFilter } from '../../types/filter/query-filter.type';
import { isCombinedFilter } from './combined-filter-util';
import {
    getValueType,
    isValidOperator,
    isValidTransform,
} from './filter-helper.util';

export const isQueryFilter = <T>(filter: unknown): filter is QueryFilter<T> => {
    if (!filter || typeof filter !== 'object') return false;

    const f = filter as Record<string, unknown>;

    // Prüfung für Lambda-Filter
    if ('lambdaOperator' in f) {
        return (
            typeof f['lambdaOperator'] === 'string' &&
            (f['lambdaOperator'] === 'any' || f['lambdaOperator'] === 'all') &&
            typeof f['field'] === 'string' &&
            'expression' in f &&
            (isCombinedFilter(f['expression']) ||
                isQueryFilter(f['expression']))
        );
    }

    // Prüfung für In-Filter (has 'values' array instead of single 'value')
    if (
        'field' in f &&
        'operator' in f &&
        f['operator'] === 'in' &&
        'values' in f &&
        Array.isArray(f['values'])
    ) {
        return true;
    }

    // Prüfung für Negated-Filter
    if (
        'type' in f &&
        f['type'] === 'not' &&
        'filter' in f &&
        (isQueryFilter(f['filter']) || isCombinedFilter(f['filter']))
    ) {
        return true;
    }

    // Prüfung für Has-Filter
    if (
        'field' in f &&
        'operator' in f &&
        f['operator'] === 'has' &&
        'value' in f &&
        typeof f['value'] === 'string'
    ) {
        return true;
    }

    // Prüfung für Basic-Filter
    if ('field' in f && 'operator' in f && 'value' in f) {
        const valueType = getValueType(f['value']);
        if (valueType === 'unknown') return false;

        if (!isValidOperator(valueType, f['operator'] as string)) return false;

        if (
            'transform' in f &&
            !isValidTransform(valueType, f['transform'] as string[])
        ) {
            return false;
        }

        return true;
    }

    return false
};
