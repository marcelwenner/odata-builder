import { HasKeys, IsExpandableType, PrevDepth, UnwrapArray } from '../utils/util.types';

export type ExpandFields<T, Depth extends number = 5> = Depth extends 0
    ? never
    : {
          [K in Extract<keyof T, string>]: IsExpandableType<
              NonNullable<T[K]>
          > extends true
              ? // Check for empty object (unwrap arrays first)
                HasKeys<NonNullable<UnwrapArray<T[K]>>> extends true
                  ? // If there's at least one key, include `K` and deeper expansions
                        | K
                        | (Depth extends 1
                              ? never
                              : `${K}/${ExpandFields<NonNullable<UnwrapArray<T[K]>>, PrevDepth<Depth>>}`)
                  : never
              : never;
      }[Extract<keyof T, string>];
