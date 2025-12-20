import { OrderByDescriptor } from './types/orderby/orderby-descriptor.type';
import { QueryFilter } from './types/filter/query-filter.type';
import { toOrderByQuery } from './utils/orderby/orderby-utils';
import { toSelectQuery } from './utils/select/select-utils';
import {
    isBasicFilter,
    isLambdaFilter,
    isInFilter,
    isNegatedFilter,
    isHasFilter,
    toFilterQuery,
    FilterRenderContext,
} from './utils/filter/filter-utils';
import { CombinedFilter } from './types/filter/combined-filter.type';
import { ExpandFields } from './types/expand/expand-fields.type';
import { toExpandQuery } from './utils/expand/expand-util';
import { toTopQuery } from './utils/top/top-utils';
import { toSkipQuery } from './utils/skip/skip-utils';
import { QueryComponents } from './types/utils/util.types';
import { SearchExpressionBuilder } from './builder/search-expression-builder';
import { createSearchTerm } from './utils/search/search.utils';
import { isCombinedFilter } from './utils/filter/combined-filter-util';
import {
    getValueType,
    isValidOperator,
} from './utils/filter/filter-helper.util';
import { FilterBuilder } from './builder/filter-builder/filter-builder';
import { SelectFields } from './types/select/select-fields.type';

const countEntitiesQuery = '/$count';

/**
 * Options for OdataQueryBuilder
 */
export interface OdataQueryBuilderOptions {
    /**
     * Use legacy 'or' fallback for 'in' operator (for OData 4.0 servers)
     * Default: false (uses OData 4.01 'in' syntax)
     *
     * @example
     * // OData 4.01 (default): name in ('A', 'B')
     * // Legacy (4.0): (name eq 'A' or name eq 'B')
     */
    legacyInOperator?: boolean;
}

/**
 * Type-safe OData query builder for constructing OData v4.01 query strings.
 *
 * Supports all major OData query options: $filter, $select, $expand, $orderby,
 * $top, $skip, $count, and $search.
 *
 * @typeParam T - The entity type to build queries for
 *
 * @example
 * // Basic query with filter and select
 * const query = new OdataQueryBuilder<User>()
 *     .filter(f => f.where(x => x.isActive.isTrue()))
 *     .select('name', 'email')
 *     .top(10)
 *     .toQuery();
 * // "?$filter=isActive eq true&$top=10&$select=name, email"
 *
 * @example
 * // Complex filter with type-safe field access
 * new OdataQueryBuilder<User>()
 *     .filter(f => f
 *         .where(x => x.name.contains('John'))
 *         .and(x => x.age.gt(18))
 *         .or(x => x.tags.any(t => t.s.eq('admin')))
 *     )
 *     .toQuery();
 *
 * @example
 * // Using in() operator (OData 4.01)
 * new OdataQueryBuilder<User>()
 *     .filter(f => f.where(x => x.status.in(['active', 'pending'])))
 *     .toQuery();
 * // "?$filter=status in ('active', 'pending')"
 *
 * @example
 * // Legacy mode for OData 4.0 servers
 * new OdataQueryBuilder<User>({ legacyInOperator: true })
 *     .filter(f => f.where(x => x.status.in(['active', 'pending'])))
 *     .toQuery();
 * // "?$filter=(status eq 'active' or status eq 'pending')"
 *
 * @example
 * // Using has() for enum flags
 * new OdataQueryBuilder<Product>()
 *     .filter(f => f.where(x => x.color.has("Sales.Color'Yellow'")))
 *     .toQuery();
 * // "?$filter=color has Sales.Color'Yellow'"
 *
 * @example
 * // Negation with not()
 * new OdataQueryBuilder<User>()
 *     .filter(f => f.where(x => x.name.contains('test')).not())
 *     .toQuery();
 * // "?$filter=not (contains(name, 'test'))"
 */
export class OdataQueryBuilder<T> {
    private queryComponents: QueryComponents<T> = {};
    private readonly filterContext: FilterRenderContext;

    /**
     * Creates a new OdataQueryBuilder instance.
     *
     * @param options - Configuration options for query generation
     */
    constructor(options: OdataQueryBuilderOptions = {}) {
        this.filterContext = {
            legacyInOperator: options.legacyInOperator,
        };
    }

    /**
     * Limits the number of results returned.
     *
     * @param topCount - Maximum number of entities to return (must be positive)
     * @returns This builder for chaining
     * @throws Error if topCount is negative
     *
     * @example
     * builder.top(10)  // $top=10
     */
    top(topCount: number): this {
        if (!topCount || this.queryComponents.top) return this;
        if (topCount < 0) throw new Error('Invalid top count');

        this.queryComponents.top = topCount;

        return this;
    }

    /**
     * Skips a number of results for pagination.
     *
     * @param skipCount - Number of entities to skip (must be positive)
     * @returns This builder for chaining
     * @throws Error if skipCount is negative
     *
     * @example
     * builder.skip(20).top(10)  // $skip=20&$top=10 (page 3)
     */
    skip(skipCount: number): this {
        if (!skipCount || this.queryComponents.skip) return this;
        if (skipCount < 0) throw new Error('Invalid skip count');

        this.queryComponents.skip = skipCount;

        return this;
    }

    /**
     * Selects specific properties to return (projection).
     *
     * Supports nested property paths using '/' separator for type-safe
     * selection of properties in complex types and navigation properties.
     *
     * @param selectProps - Property paths to include in the response
     * @returns This builder for chaining
     * @throws Error if any property name is invalid
     *
     * @example
     * // Simple properties
     * builder.select('name', 'email')  // $select=name, email
     *
     * @example
     * // Nested properties with IntelliSense support
     * builder.select('name', 'address/city', 'address/zip')
     * // $select=name, address/city, address/zip
     */
    select(...selectProps: SelectFields<Required<T>>[]): this {
        if (selectProps.length === 0) return this;
        if (selectProps.some(prop => !prop))
            throw new Error('Invalid select input');

        return this.addComponent('select', selectProps);
    }

    /**
     * Adds filter conditions to the query.
     *
     * Supports two syntaxes:
     * 1. Callback syntax with FilterBuilder (recommended for type safety)
     * 2. Object syntax with raw filter objects
     *
     * @param filters - Filter objects or callback function
     * @returns This builder for chaining
     * @throws Error if filter is invalid
     *
     * @example
     * // Callback syntax (recommended)
     * builder.filter(f => f.where(x => x.name.eq('John')))
     *
     * @example
     * // Object syntax
     * builder.filter({ field: 'name', operator: 'eq', value: 'John' })
     */
    filter(
        ...filters: (CombinedFilter<Required<T>> | QueryFilter<Required<T>>)[]
    ): this;
    /**
     * Adds filter conditions using FilterBuilder callback syntax.
     *
     * @param callback - Function that receives a FilterBuilder and returns it
     * @returns This builder for chaining
     */
    filter(
        callback: (f: FilterBuilder<Required<T>>) => FilterBuilder<Required<T>>,
    ): this;

    filter(
        ...args:
            | [(f: FilterBuilder<Required<T>>) => FilterBuilder<Required<T>>]
            | Array<CombinedFilter<Required<T>> | QueryFilter<Required<T>>>
    ): this {
        // Handle callback syntax: .filter(f => f.where(x => x.name.eq('John')))
        if (args.length === 1 && typeof args[0] === 'function') {
            const callback = args[0] as (
                f: FilterBuilder<Required<T>>,
            ) => FilterBuilder<Required<T>>;
            const builder = callback(new FilterBuilder<Required<T>>());
            const result = builder.build();
            if (result) {
                return this.addComponent('filter', [result]);
            }
            return this;
        }

        // Handle object syntax: .filter({ field: 'name', operator: 'eq', value: 'John' })
        const filters = args as Array<
            CombinedFilter<Required<T>> | QueryFilter<Required<T>>
        >;
        if (filters.length === 0) return this;

        for (const filter of filters) {
            if (!filter) {
                throw new Error('Invalid filter input');
            }

            if (isInFilter(filter)) {
                // InFilter is valid
            } else if (isNegatedFilter(filter)) {
                // NegatedFilter is valid
            } else if (isHasFilter(filter)) {
                // HasFilter is valid
            } else if (isBasicFilter(filter)) {
                const valueType = getValueType(filter.value);

                if (!isValidOperator(valueType, filter.operator)) {
                    throw new Error(
                        `Invalid operator "${filter.operator}" for type "${valueType}"`,
                    );
                }
            } else if (isLambdaFilter(filter)) {
                // check this?
            } else if (!isCombinedFilter(filter)) {
                throw new Error(
                    `Invalid filter input: ${JSON.stringify(filter)}`,
                );
            }
        }

        return this.addComponent('filter', filters);
    }

    /**
     * Expands navigation properties to include related entities.
     *
     * @param expandFields - Navigation properties to expand
     * @returns This builder for chaining
     * @throws Error if any expand field is invalid
     *
     * @example
     * builder.expand('orders')  // $expand=orders
     *
     * @example
     * // Nested expand with select
     * builder.expand({ orders: { select: ['id', 'price'] } })
     */
    expand(...expandFields: ExpandFields<T>[]): this {
        if (expandFields.length === 0) return this;
        if (expandFields.some(field => !field))
            throw new Error('Field missing for expand');

        return this.addComponent('expand', expandFields);
    }

    /**
     * Adds count to the query.
     *
     * @param countEntities - If true, returns only the count (/$count).
     *                        If false, includes count in response ($count=true).
     * @returns This builder for chaining
     *
     * @example
     * builder.count()  // $count=true (includes count with results)
     *
     * @example
     * builder.count(true)  // /$count (returns only the count number)
     */
    count(countEntities = false): this {
        if (this.queryComponents.count) return this;

        this.queryComponents.count = countEntities
            ? countEntitiesQuery
            : '$count=true';

        return this;
    }

    /**
     * Orders the results by one or more properties.
     *
     * @param orderBy - Order descriptors with field and direction
     * @returns This builder for chaining
     *
     * @example
     * builder.orderBy({ field: 'name', order: 'asc' })
     *
     * @example
     * // Multiple sort criteria
     * builder.orderBy(
     *     { field: 'lastName', order: 'asc' },
     *     { field: 'firstName', order: 'asc' }
     * )
     */
    orderBy(...orderBy: OrderByDescriptor<Required<T>>[]): this {
        if (orderBy.length === 0) return this;

        return this.addComponent('orderBy', orderBy);
    }

    /**
     * Adds a free-text search to the query.
     *
     * Accepts either a simple string or a SearchExpressionBuilder for
     * complex search expressions with AND, OR, NOT operators.
     *
     * @param searchExpression - Search string or SearchExpressionBuilder
     * @returns This builder for chaining
     * @throws Error if searchExpression is not a string or SearchExpressionBuilder
     *
     * @example
     * builder.search('coffee')  // $search=coffee
     *
     * @example
     * // Complex search with SearchExpressionBuilder
     * builder.search(
     *     new SearchExpressionBuilder()
     *         .term('coffee')
     *         .and()
     *         .term('organic')
     * )  // $search=coffee%20AND%20organic
     */
    search(searchExpression: string | SearchExpressionBuilder): this {
        if (!searchExpression) {
            delete this.queryComponents.search;
            return this;
        }

        // Runtime validation for invalid types
        if (
            typeof searchExpression !== 'string' &&
            !(searchExpression instanceof SearchExpressionBuilder)
        ) {
            throw new Error(
                'search() expects a string or SearchExpressionBuilder',
            );
        }

        this.queryComponents.search =
            typeof searchExpression === 'string'
                ? createSearchTerm(searchExpression)
                : searchExpression.toString();
        return this;
    }

    /**
     * Builds and returns the OData query string.
     *
     * Combines all configured query options into a properly formatted
     * OData query string ready to append to an endpoint URL.
     *
     * @returns The complete OData query string (e.g., "?$filter=...&$top=10")
     *          Returns empty string if no query options are set.
     *          Returns "/$count..." format if count(true) was used.
     *
     * @example
     * new OdataQueryBuilder<User>()
     *     .filter(f => f.where(x => x.isActive.isTrue()))
     *     .top(10)
     *     .toQuery();
     * // "?$filter=isActive eq true&$top=10"
     */
    toQuery(): string {
        const queryGeneratorMap: Record<
            keyof QueryComponents<T>,
            (component: QueryComponents<T>[keyof QueryComponents<T>]) => string
        > = {
            count: component => component as string,
            filter: component =>
                toFilterQuery(
                    Array.from(component as Set<QueryFilter<T>>),
                    this.filterContext,
                ),
            top: component => toTopQuery(component as number),
            skip: component => toSkipQuery(component as number),
            select: component =>
                toSelectQuery(
                    Array.from(component as Set<Extract<keyof T, string>>),
                ),
            expand: component =>
                toExpandQuery<T>(Array.from(component as Set<ExpandFields<T>>)),
            orderBy: component =>
                toOrderByQuery(
                    Array.from(component as Set<OrderByDescriptor<T>>),
                ),
            search: component =>
                `$search=${encodeURIComponent(component as string)}`,
        };

        const sortedEntries = Object.entries(this.queryComponents).sort(
            ([a], [b]) => {
                const orderA = Object.keys(queryGeneratorMap).indexOf(a);
                const orderB = Object.keys(queryGeneratorMap).indexOf(b);
                return orderA - orderB;
            },
        );

        const queryStringParts: string[] = [];

        for (const [operator, component] of sortedEntries) {
            if (!component) continue;

            const queryPart = queryGeneratorMap[
                operator as keyof QueryComponents<T>
            ](component as QueryComponents<T>[keyof QueryComponents<T>]);
            if (!queryPart) continue;

            queryStringParts.push(queryPart);
        }

        const queryString = queryStringParts.join('&');

        if (queryString.startsWith('/$count')) {
            const remainingQueryString = queryString.slice('/$count'.length);

            if (remainingQueryString.length > 0)
                return `/$count?${remainingQueryString.substring(1)}`;

            return '/$count';
        }

        return queryString.length > 0 ? `?${queryString}` : '';
    }

    private addComponent<
        K extends keyof QueryComponents<T>,
        U = NonNullable<QueryComponents<T>[K]> extends Set<infer V> ? V : never,
    >(type: K, values: U[]): this {
        if (values.length === 0) return this;

        if (!this.queryComponents[type]) {
            this.queryComponents[type] = new Set() as QueryComponents<T>[K];
        }

        const componentSet = this.queryComponents[type] as unknown as Set<U>;
        for (const value of values) {
            componentSet.add(value);
        }

        return this;
    }
}
