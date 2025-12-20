import { toFilterQuery } from './filter-utils';
import {
    FilterOperators,
    QueryFilter,
} from 'src/query-builder/types/filter/query-filter.type';
import { CombinedFilter } from 'src/query-builder/types/filter/combined-filter.type';
import { Guid } from 'src/query-builder/types/utils/util.types';
import { describe, it, expect } from 'vitest';

describe('toFilterQuery', () => {
    type ItemType = {
        isActive: boolean;
        age: number;
        name: string;
        tags: string[];
        createdAt: Date;
        id: Guid;
    };

    it('should handle a single basic filter', () => {
        const filters: QueryFilter<ItemType>[] = [
            { field: 'isActive', operator: 'eq', value: true },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(`$filter=isActive eq true`);
    });

    it('should handle multiple basic filters combined with "and"', () => {
        const filters: QueryFilter<ItemType>[] = [
            { field: 'isActive', operator: 'eq', value: true },
            { field: 'age', operator: 'gt', value: 18 },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(`$filter=isActive eq true and age gt 18`);
    });

    it('should handle a combined filter with "and" logic', () => {
        const filters: CombinedFilter<ItemType>[] = [
            {
                logic: 'and',
                filters: [
                    { field: 'isActive', operator: 'eq', value: true },
                    { field: 'age', operator: 'gt', value: 18 },
                ],
            },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(`$filter=(isActive eq true and age gt 18)`);
    });

    it('should handle a combined filter with "or" logic', () => {
        const filters: CombinedFilter<ItemType>[] = [
            {
                logic: 'or',
                filters: [
                    { field: 'isActive', operator: 'eq', value: false },
                    { field: 'age', operator: 'le', value: 30 },
                ],
            },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(`$filter=(isActive eq false or age le 30)`);
    });

    it('should handle nested combined filters', () => {
        const filters: CombinedFilter<ItemType>[] = [
            {
                logic: 'and',
                filters: [
                    { field: 'isActive', operator: 'eq', value: true },
                    {
                        logic: 'or',
                        filters: [
                            { field: 'age', operator: 'gt', value: 18 },
                            { field: 'name', operator: 'eq', value: 'John' },
                        ],
                    },
                ],
            },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(
            `$filter=(isActive eq true and (age gt 18 or name eq 'John'))`,
        );
    });

    it('should handle lambda filters with primitive arrays', () => {
        const filters: QueryFilter<ItemType>[] = [
            {
                field: 'tags',
                lambdaOperator: 'any',
                expression: {
                    field: 's',
                    function: {
                        type: 'contains',
                        value: 'test',
                    },
                    operator: 'eq',
                    value: 'true',
                },
            },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(`$filter=tags/any(s: contains(s, 'test'))`);
    });

    it('should handle lambda filters with object arrays', () => {
        type ComplexItemType = {
            items: { name: string; quantity: number }[];
        };

        const filters: QueryFilter<ComplexItemType>[] = [
            {
                field: 'items',
                lambdaOperator: 'any',
                expression: {
                    field: 'name',
                    operator: 'eq',
                    value: 'Apple',
                },
            },
        ];

        const result = toFilterQuery<ComplexItemType>(filters);

        expect(result).toBe(`$filter=items/any(s: s/name eq 'Apple')`);
    });

    it('should handle ignoreCase for string filters', () => {
        const filters: QueryFilter<ItemType>[] = [
            {
                field: 'name',
                function: {
                    type: 'contains',
                    value: 'test',
                },
                ignoreCase: true,
                operator: 'eq',
                value: true,
            },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(`$filter=contains(tolower(name), 'test')`);
    });

    it('should handle removeQuotes for Guid filters', () => {
        const filters: QueryFilter<ItemType>[] = [
            {
                field: 'id',
                operator: 'eq',
                value: 'f92477a9-5761-485a-b7cd-30561e2f888b' as Guid,
                removeQuotes: true,
            },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(
            `$filter=id eq f92477a9-5761-485a-b7cd-30561e2f888b`,
        );
    });

    it('should handle null values in filters', () => {
        const filters: QueryFilter<ItemType>[] = [
            { field: 'name', operator: 'eq', value: null },
        ];

        const result = toFilterQuery(filters);

        expect(result).toBe(`$filter=name eq null`);
    });

    it('should handle a mix of basic, combined, and lambda filters', () => {
        const filters: Array<QueryFilter<ItemType> | CombinedFilter<ItemType>> =
            [
                { field: 'isActive', operator: 'eq', value: true },
                {
                    logic: 'or',
                    filters: [
                        { field: 'age', operator: 'gt', value: 18 },
                        { field: 'name', operator: 'eq', value: 'John' },
                    ],
                },
                {
                    field: 'tags',
                    lambdaOperator: 'any',
                    expression: {
                        field: 's',
                        function: {
                            type: 'contains',
                            value: 'test',
                        },
                        operator: 'eq',
                        value: true,
                    },
                },
            ];

        const result = toFilterQuery(filters);

        expect(result).toBe(
            `$filter=isActive eq true and (age gt 18 or name eq 'John') and tags/any(s: contains(s, 'test'))`,
        );
    });

    it('should return an empty string when no filters are provided', () => {
        const filters: QueryFilter<ItemType>[] = [];

        const result = toFilterQuery(filters);

        expect(result).toBe('');
    });

    it('should throw an error for invalid filters', () => {
        expect(() =>
            toFilterQuery([
                {
                    operator: 'eq',
                    value: true,
                } as unknown as QueryFilter<ItemType>, // Ungültiger Filter ohne `field`
            ]),
        ).toThrowError('Invalid filter');
    });
});

describe('toFilterQuery - Extended Operator and Edge Cases', () => {
    type ItemType = {
        name: string;
        age: number;
        isActive: boolean;
        createdAt: Date;
        id: Guid;
        value: number | null;
        tags: string[];
    };
    const testGuid = 'f92477a9-5761-485a-b7cd-30561e2f888b' as Guid;
    const testDate = new Date('2025-02-10T12:00:00Z');

    describe('String Operators', () => {
        it.each([
            ['eq', 'test', `$filter=name eq 'test'`],
            ['ne', 'test', `$filter=name ne 'test'`],
        ])(
            'should handle string operator "%s"',
            (operator, value, expectedQuery) => {
                const filters: QueryFilter<ItemType>[] = [
                    {
                        field: 'name',
                        operator: operator as FilterOperators<string>,
                        value,
                    },
                ];
                expect(toFilterQuery(filters)).toBe(expectedQuery);
            },
        );
    });

    describe('Number Operators', () => {
        it.each([
            ['eq', 10, `$filter=age eq 10`],
            ['ne', 10, `$filter=age ne 10`],
            ['lt', 10, `$filter=age lt 10`],
            ['le', 10, `$filter=age le 10`],
            ['gt', 10, `$filter=age gt 10`],
            ['ge', 10, `$filter=age ge 10`],
        ])(
            'should handle number operator "%s"',
            (operator, value, expectedQuery) => {
                const filters: QueryFilter<ItemType>[] = [
                    {
                        field: 'age',
                        operator: operator as FilterOperators<number>,
                        value,
                    },
                ];
                expect(toFilterQuery(filters)).toBe(expectedQuery);
            },
        );
    });

    describe('Boolean Operators', () => {
        it.each([
            ['eq', true, `$filter=isActive eq true`],
            ['ne', false, `$filter=isActive ne false`],
        ])(
            'should handle boolean operator "%s"',
            (operator, value, expectedQuery) => {
                const filters: QueryFilter<ItemType>[] = [
                    {
                        field: 'isActive',
                        operator: operator as FilterOperators<boolean>,
                        value,
                    },
                ];
                expect(toFilterQuery(filters)).toBe(expectedQuery);
            },
        );
    });

    describe('Date Operators', () => {
        it.each([
            ['eq', testDate, `$filter=createdAt eq ${testDate.toISOString()}`],
            ['ne', testDate, `$filter=createdAt ne ${testDate.toISOString()}`],
            ['lt', testDate, `$filter=createdAt lt ${testDate.toISOString()}`],
            ['le', testDate, `$filter=createdAt le ${testDate.toISOString()}`],
            ['gt', testDate, `$filter=createdAt gt ${testDate.toISOString()}`],
            ['ge', testDate, `$filter=createdAt ge ${testDate.toISOString()}`],
        ])(
            'should handle date operator "%s"',
            (operator, value, expectedQuery) => {
                const filters: QueryFilter<ItemType>[] = [
                    {
                        field: 'createdAt',
                        operator: operator as FilterOperators<Date>,
                        value,
                    },
                ];
                expect(toFilterQuery(filters)).toBe(expectedQuery);
            },
        );
    });

    describe('Guid Operators', () => {
        it.each([
            ['eq', testGuid, `$filter=id eq '${testGuid}'`],
            ['ne', testGuid, `$filter=id ne '${testGuid}'`],
        ])(
            'should handle guid operator "%s"',
            (operator, value, expectedQuery) => {
                const filters: QueryFilter<ItemType>[] = [
                    {
                        field: 'id',
                        operator: operator as FilterOperators<Guid>,
                        value,
                    },
                ];
                expect(toFilterQuery(filters)).toBe(expectedQuery);
            },
        );
    });

    describe('Null Value Filters', () => {
        it('should handle "ne null" filter', () => {
            const filters: QueryFilter<ItemType>[] = [
                { field: 'value', operator: 'ne', value: null },
            ];
            expect(toFilterQuery(filters)).toBe(`$filter=value ne null`);
        });
    });

    describe('Combined Filters at Root Level', () => {
        it('should combine multiple filters passed to toFilterQuery with "and"', () => {
            const filters: Array<
                QueryFilter<ItemType> | CombinedFilter<ItemType>
            > = [
                { field: 'isActive', operator: 'eq', value: true },
                {
                    logic: 'or',
                    filters: [{ field: 'age', operator: 'gt', value: 20 }],
                },
                { field: 'name', operator: 'eq', value: 'John' },
            ];
            const expectedQuery = `$filter=isActive eq true and (age gt 20) and name eq 'John'`;
            expect(toFilterQuery(filters)).toBe(expectedQuery);
        });
    });

    describe('Empty Filters Array in CombinedFilter', () => {
        it('should handle CombinedFilter with empty filters array gracefully', () => {
            const filters: CombinedFilter<ItemType>[] = [
                { logic: 'and', filters: [] },
            ];
            expect(toFilterQuery(filters)).toBe(`$filter=`);
        });
    });

    describe('Invalid Filter Input', () => {
        it('should throw an error for a filter with missing operator', () => {
            expect(() =>
                toFilterQuery([
                    { field: 'name', value: 'test' } as QueryFilter<{
                        name: string;
                    }>,
                ]),
            ).toThrowError('Invalid filter');
        });

        it('should throw an error for a filter with missing field', () => {
            expect(() =>
                toFilterQuery([
                    { operator: 'eq', value: 'test' } as QueryFilter<{
                        name: string;
                    }>,
                ]),
            ).toThrowError('Invalid filter');
        });

        it('should throw an error for a filter with missing value', () => {
            expect(() =>
                toFilterQuery([
                    { field: 'name', operator: 'eq' } as QueryFilter<{
                        name: string;
                    }>,
                ]),
            ).toThrowError('Invalid filter');
        });
    });
});
