import { CombinedFilter } from '../../types/filter/combined-filter.type';
import { isQueryFilter } from './is-query-filter-util';

export const isCombinedFilter = <T>(
    filters: unknown,
): filters is CombinedFilter<T> => {
    return (
        ((filters as CombinedFilter<T>).logic === 'and' ||
            (filters as CombinedFilter<T>).logic === 'or') &&
        (filters as CombinedFilter<T>).filters.every(
            filter => isQueryFilter(filter) || isCombinedFilter(filter),
        )
    );
};
