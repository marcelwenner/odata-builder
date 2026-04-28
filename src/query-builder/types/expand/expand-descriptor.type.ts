import { SelectFields } from '../select/select-fields.type';
import { OrderByDescriptor } from '../orderby/orderby-descriptor.type';
import { HasKeys, IsExpandableType, UnwrapArray } from '../utils/util.types';
import { ExpandFields } from './expand-fields.type';
import { FilterBuilder } from '../../builder/filter-builder/filter-builder';
import { SearchExpressionBuilder } from '../../builder/search-expression-builder';

/**
 * Extracts only the top-level navigation property names from a type.
 * Unlike ExpandFields which generates slash-separated nested paths,
 * this only returns direct object-typed keys.
 */
export type TopLevelExpandFields<T> = {
    [K in Extract<keyof T, string>]: IsExpandableType<
        NonNullable<T[K]>
    > extends true
        ? HasKeys<NonNullable<UnwrapArray<T[K]>>> extends true
            ? K
            : never
        : never;
}[Extract<keyof T, string>];

/**
 * Subquery options for an expanded navigation property.
 *
 * Supports all OData system query options that can be applied
 * within an $expand clause.
 *
 * @typeParam T - The entity type of the navigation property being expanded
 *
 * @example
 * // $expand=orders($select=id, price;$top=5;$orderby=price desc)
 * {
 *     select: ['id', 'price'],
 *     top: 5,
 *     orderBy: [{ field: 'price', orderDirection: 'desc' }]
 * }
 */
export interface ExpandSubQueryOptions<T> {
    select?: SelectFields<Required<T>>[];
    filter?: (
        f: FilterBuilder<Required<T>>,
    ) => FilterBuilder<Required<T>>;
    orderBy?: OrderByDescriptor<Required<T>>[];
    top?: number;
    skip?: number;
    count?: boolean;
    search?: string | SearchExpressionBuilder;
    expand?: ExpandInput<T>[];
}

/**
 * An expand descriptor that maps navigation property names to their
 * subquery options. Each key must be a top-level navigation property.
 *
 * @typeParam T - The parent entity type
 *
 * @example
 * // For entity { orders: Order[]; details: Detail }
 * { orders: { select: ['id'], top: 10 } }
 */
export type ExpandWithSubQuery<T> = {
    [K in TopLevelExpandFields<Required<T>>]?: ExpandSubQueryOptions<
        NonNullable<UnwrapArray<Required<T>[K]>>
    >;
};

/**
 * Input type for the expand method. Accepts either:
 * - A simple string path (e.g., 'orders' or 'orders/items')
 * - An object mapping navigation properties to subquery options
 *
 * @typeParam T - The entity type
 */
export type ExpandInput<T> = ExpandFields<T> | ExpandWithSubQuery<T>;
