import { CombinedFilter } from '../filter/combined-filter.type';
import { QueryFilter } from '../filter/query-filter.type';
import { OrderByDescriptor } from '../orderby/orderby-descriptor.type';
import { ExpandInput } from '../expand/expand-descriptor.type';
import { SelectFields } from '../select/select-fields.type';

export type Guid = string & { _type: Guid };
export interface GuidFilter {
    value: Guid;
    removeQuotes?: boolean;
}

export interface QueryComponents<T> {
    count?: string;
    filter?: Set<CombinedFilter<Required<T>> | QueryFilter<Required<T>>>;
    top?: number;
    skip?: number;
    select?: Set<SelectFields<Required<T>>>;
    orderBy?: Set<OrderByDescriptor<T>>;
    expand?: Set<ExpandInput<Required<T>>>;
    search?: string;
}

export type HasKeys<T> = [keyof T] extends [never] ? false : true;

/**
 * Helper type to check if a type is an object (not array, not primitive, not function, not Date)
 * Works correctly with both interfaces and inline types
 */
export type IsObjectType<T> = T extends object
    ? T extends readonly unknown[]
        ? false
        : T extends (...args: unknown[]) => unknown
          ? false
          : T extends Date
            ? false
            : true
    : false;

export type PrevDepth<T extends number> = [
    never, // 0
    0, // 1
    1, // 2
    2, // 3
    3, // 4
    4, // 5
][T];

/**
 * Unwraps an array type to its element type.
 * If T is not an array, returns T unchanged.
 */
export type UnwrapArray<T> = T extends readonly (infer U)[] ? U : T;

/**
 * Checks if a type represents an expandable navigation property:
 * either a plain object or an array of objects.
 */
export type IsExpandableType<T> = IsObjectType<T> extends true
    ? true
    : T extends readonly (infer U)[]
      ? IsObjectType<NonNullable<U>> extends true
          ? true
          : false
      : false;
