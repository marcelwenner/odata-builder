import { IsObjectType, PrevDepth } from '../utils/util.types';

export interface OrderByDescriptor<T> {
    field: OrderByFields<T>;
    orderDirection: 'asc' | 'desc';
}

 
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
export type OrderByFields<T, Depth extends number = 5> = [Depth] extends [never]
    ? never
    : {
          [K in Extract<keyof T, string>]-?: IsObjectType<
              NonNullable<T[K]>
          > extends true
              ?
                    | K
                    | (string extends OrderByFields<
                          NonNullable<T[K]>,
                          PrevDepth<Depth>
                      >
                          ? never
                          : `${K}/${OrderByFields<NonNullable<T[K]>, PrevDepth<Depth>> & string}`)
              : K;
      }[Extract<keyof T, string>];
/* eslint-enable @typescript-eslint/no-redundant-type-constituents */
