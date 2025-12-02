import { PrevDepth } from '../utils/util.types';

export interface OrderByDescriptor<T> {
    field: OrderByFields<T>;
    orderDirection: 'asc' | 'desc';
}

 
export type OrderByFields<T, Depth extends number = 5> = [Depth] extends [never]
    ? never
    : {
          [K in Extract<keyof T, string>]-?: T[K] extends Record<
              string,
              unknown
          >
              ?
                    | K
                    | (string extends OrderByFields<T[K], PrevDepth<Depth>>
                          ? never
                          : `${K}/${OrderByFields<T[K], PrevDepth<Depth>>}`)
              : K;
      }[Extract<keyof T, string>];
