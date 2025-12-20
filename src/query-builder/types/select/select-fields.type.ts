import { IsObjectType, PrevDepth } from '../utils/util.types';

/**
 * Generates type-safe field paths for $select queries.
 *
 * Supports nested property paths using '/' separator (e.g., 'address/city').
 * Recursively generates all valid paths up to the specified depth.
 * Works with both interfaces and inline types.
 *
 * @typeParam T - The entity type
 * @typeParam Depth - Maximum recursion depth (default: 5)
 *
 * @example
 * interface User {
 *     name: string;
 *     address: { city: string; zip: number };
 * }
 *
 * type Fields = SelectFields<User>;
 * // 'name' | 'address' | 'address/city' | 'address/zip'
 */
 
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
export type SelectFields<T, Depth extends number = 5> = [Depth] extends [never]
    ? never
    : {
          [K in Extract<keyof T, string>]-?: IsObjectType<
              NonNullable<T[K]>
          > extends true
              ?
                    | K
                    | (string extends SelectFields<
                          NonNullable<T[K]>,
                          PrevDepth<Depth>
                      >
                          ? never
                          : `${K}/${SelectFields<NonNullable<T[K]>, PrevDepth<Depth>> & string}`)
              : K;
      }[Extract<keyof T, string>];
/* eslint-enable @typescript-eslint/no-redundant-type-constituents */
