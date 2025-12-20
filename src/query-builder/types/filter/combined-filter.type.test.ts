import { describe, it, expectTypeOf, assertType } from 'vitest';
import { CombinedFilter } from './combined-filter.type';
import { QueryFilter } from './query-filter.type';

describe('CombinedFilter<T>', () => {
    it('should allow combining QueryFilter and CombinedFilter', () => {
        type Item = { id: number; name: string };
        const combinedFilter: CombinedFilter<Item> = {
            logic: 'and',
            filters: [
                { field: 'id', operator: 'eq', value: 1 },
                {
                    logic: 'or',
                    filters: [
                        { field: 'name', function: { type: 'contains', value: 'test' }, operator: 'eq', value: true },
                    ],
                },
            ],
        };
        expectTypeOf(combinedFilter).toEqualTypeOf<CombinedFilter<Item>>();
    });

    it('should enforce correct logic and filters structure', () => {
        type Item = { id: number };
        assertType(
            {} as Extract<
                CombinedFilter<Item>,
                { logic: 'and'; filters: [QueryFilter<Item>] }
            >,
        );
    });

    it('should allow deeply nested combined filters', () => {
        type Item = { id: number; name: string; isActive: boolean };
        const combinedFilter: CombinedFilter<Item> = {
            logic: 'and',
            filters: [
                { field: 'id', operator: 'eq', value: 1 },
                {
                    logic: 'or',
                    filters: [
                        { field: 'name', function: { type: 'contains', value: 'test' }, operator: 'eq', value: true },
                        {
                            logic: 'and',
                            filters: [
                                {
                                    field: 'isActive',
                                    operator: 'eq',
                                    value: true,
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expectTypeOf(combinedFilter).toEqualTypeOf<CombinedFilter<Item>>();
    });

    it('should allow a CombinedFilter with an empty filters array', () => {
        type Item = { id: number };
        const combinedFilter: CombinedFilter<Item> = {
            logic: 'and',
            filters: [],
        };
        expectTypeOf(combinedFilter).toEqualTypeOf<CombinedFilter<Item>>();
    });

    it('should enforce correct logic property', () => {
        type Item = { id: number };

        const invalidFilter: CombinedFilter<Item> = {
            // @ts-expect-error - logic should be 'and' or 'or'
            logic: 'invalid',
            filters: [{ field: 'id', operator: 'eq', value: 1 }],
        };
        void invalidFilter;
    });

    it('should allow a CombinedFilter with a single QueryFilter', () => {
        type Item = { id: number };
        const combinedFilter: CombinedFilter<Item> = {
            logic: 'and',
            filters: [{ field: 'id', operator: 'eq', value: 1 }],
        };
        expectTypeOf(combinedFilter).toEqualTypeOf<CombinedFilter<Item>>();
    });

    it('should allow deeply nested combined filters with mixed logic', () => {
        type Item = {
            id: number;
            name: string;
            isActive: boolean;
            value: number;
        };
        const combinedFilter: CombinedFilter<Item> = {
            logic: 'and',
            filters: [
                { field: 'id', operator: 'eq', value: 1 },
                {
                    logic: 'or',
                    filters: [
                        { field: 'name', function: { type: 'contains', value: 'test' }, operator: 'eq', value: true },
                        {
                            logic: 'and',
                            filters: [
                                {
                                    field: 'isActive',
                                    operator: 'eq',
                                    value: true,
                                },
                            ],
                        },
                    ],
                },
                {
                    logic: 'and',
                    filters: [{ field: 'value', operator: 'gt', value: 10 }],
                },
            ],
        };
        expectTypeOf(combinedFilter).toEqualTypeOf<CombinedFilter<Item>>();
    });
});
