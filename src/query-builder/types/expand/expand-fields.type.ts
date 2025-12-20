import { HasKeys, IsObjectType, PrevDepth } from '../utils/util.types';

export type ExpandFields<T, Depth extends number = 5> = Depth extends 0
    ? never
    : {
          [K in Extract<keyof T, string>]: IsObjectType<
              NonNullable<T[K]>
          > extends true
              ? // Check for empty object
                HasKeys<NonNullable<T[K]>> extends true
                  ? // If there's at least one key, include `K` and deeper expansions
                    | K
                        | (Depth extends 1
                              ? never
                              : `${K}/${ExpandFields<NonNullable<T[K]>, PrevDepth<Depth>>}`)
                  : never
              : never;
      }[Extract<keyof T, string>];
