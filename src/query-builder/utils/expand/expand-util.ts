import {
    ExpandInput,
    ExpandSubQueryOptions,
    ExpandWithSubQuery,
} from '../../types/expand/expand-descriptor.type';
import { CombinedFilter } from '../../types/filter/combined-filter.type';
import { QueryFilter } from '../../types/filter/query-filter.type';
import { toSelectQuery } from '../select/select-utils';
import { toOrderByQuery } from '../orderby/orderby-utils';
import { toTopQuery } from '../top/top-utils';
import { toSkipQuery } from '../skip/skip-utils';
import {
    toFilterQuery,
    FilterRenderContext,
} from '../filter/filter-utils';
import { FilterBuilder } from '../../builder/filter-builder/filter-builder';
import { createSearchTerm } from '../search/search.utils';

/**
 * Checks if an expand input is a subquery object (not a simple string path).
 */
function isExpandWithSubQuery<T>(
    input: ExpandInput<T>,
): input is ExpandWithSubQuery<T> {
    return typeof input === 'object' && input !== null;
}

/**
 * Renders the subquery options for an expanded navigation property.
 *
 * @example
 * renderSubQuery({ select: ['id', 'name'], top: 5 })
 * // "($select=id, name;$top=5)"
 */
function renderSubQuery<T>(
    options: ExpandSubQueryOptions<T>,
    filterContext: FilterRenderContext = {},
): string {
    const parts: string[] = [];

    if (options.select && options.select.length > 0) {
        parts.push(toSelectQuery(options.select));
    }

    if (options.filter) {
        const builder = options.filter(new FilterBuilder<Required<T>>());
        const filterResult = builder.build();
        if (filterResult) {
            const filters: Array<QueryFilter<T> | CombinedFilter<T>> = [
                filterResult as QueryFilter<T> | CombinedFilter<T>,
            ];
            const filterStr = toFilterQuery(filters, filterContext);
            if (filterStr) parts.push(filterStr);
        }
    }

    if (options.orderBy && options.orderBy.length > 0) {
        const orderByStr = toOrderByQuery(options.orderBy);
        if (orderByStr) parts.push(orderByStr);
    }

    if (options.top !== undefined && options.top > 0) {
        parts.push(toTopQuery(options.top));
    }

    if (options.skip !== undefined && options.skip > 0) {
        parts.push(toSkipQuery(options.skip));
    }

    if (options.count === true) {
        parts.push('$count=true');
    }

    if (options.search) {
        const searchStr =
            typeof options.search === 'string'
                ? createSearchTerm(options.search)
                : options.search.toString();
        parts.push(`$search=${encodeURIComponent(searchStr)}`);
    }

    if (options.expand && options.expand.length > 0) {
        const nestedExpand = toExpandQueryInternal(
            options.expand,
            filterContext,
        );
        if (nestedExpand) parts.push(nestedExpand);
    }

    return parts.length > 0 ? `(${parts.join(';')})` : '';
}

/**
 * Renders a single expand input item to its OData string representation.
 */
function renderExpandItem<T>(
    input: ExpandInput<T>,
    filterContext: FilterRenderContext = {},
): string {
    if (typeof input === 'string') {
        return input;
    }

    if (isExpandWithSubQuery(input)) {
        const entries = Object.entries(input) as [
            string,
            ExpandSubQueryOptions<unknown>,
        ][];
        return entries
            .map(([field, options]) => {
                if (!options || Object.keys(options).length === 0) {
                    return field;
                }
                return `${field}${renderSubQuery(options, filterContext)}`;
            })
            .join(', ');
    }

    return String(input);
}

/**
 * Internal implementation that builds the full $expand=... string.
 */
function toExpandQueryInternal<T>(
    expandProps: ExpandInput<T>[],
    filterContext: FilterRenderContext = {},
): string {
    if (expandProps.length === 0) return '';

    const rendered = expandProps
        .map(item => renderExpandItem(item, filterContext))
        .filter(Boolean)
        .join(', ');

    return rendered ? `$expand=${rendered}` : '';
}

/**
 * Converts expand inputs to an OData $expand query string.
 *
 * Supports both simple field paths and nested subqueries.
 *
 * @example
 * // Simple expand
 * toExpandQuery(['orders'])  // "$expand=orders"
 *
 * @example
 * // Expand with subquery
 * toExpandQuery([{ orders: { select: ['id'], top: 5 } }])
 * // "$expand=orders($select=id;$top=5)"
 *
 * @example
 * // Nested expand with subqueries
 * toExpandQuery([{ orders: { expand: [{ items: { select: ['name'] } }] } }])
 * // "$expand=orders($expand=items($select=name))"
 */
export function toExpandQuery<T>(
    expandProps: ExpandInput<T>[],
    filterContext: FilterRenderContext = {},
): string {
    return toExpandQueryInternal(expandProps, filterContext);
}
