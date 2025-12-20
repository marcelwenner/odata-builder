import { Guid } from 'src/query-builder/types/utils/util.types';
import { describe, expect, it } from 'vitest';
import { isQueryFilter } from './is-query-filter-util';

describe('isQueryFilter', () => {
    const testGuid = 'd94a3d4a-21b3-4d3e-8f1a-521a8072c211' as Guid;
    const testDate = new Date();

    describe('Basic Filters', () => {
        it.each([
            { field: 'isActive', operator: 'eq', value: true },
            { field: 'name', function: { type: 'contains', value: 'test' }, operator: 'eq', value: true },
            { field: 'createdAt', operator: 'gt', value: testDate },
            { field: 'id', operator: 'eq', value: testGuid },
            { field: 'age', operator: 'lt', value: 30 },
            { field: 'deletedAt', operator: 'eq', value: null },
        ])('should return true for valid basic filter %#', filter => {
            expect(isQueryFilter(filter)).toBe(true);
        });
    });

    describe('Lambda Filters', () => {
        it.each([
            {
                field: 'tags',
                lambdaOperator: 'any',
                expression: { field: '', operator: 'eq', value: 'urgent' },
            },
            {
                field: 'orders',
                lambdaOperator: 'all',
                expression: { field: 'total', operator: 'gt', value: 100 },
            },
            {
                field: 'departments',
                lambdaOperator: 'any',
                expression: {
                    field: 'employees',
                    lambdaOperator: 'all',
                    expression: {
                        field: 'isActive',
                        operator: 'eq',
                        value: true,
                    },
                },
            },
        ])('should return true for valid lambda filter %#', filter => {
            expect(isQueryFilter(filter)).toBe(true);
        });
    });

    describe('Edge Cases/Invalid Filters', () => {
        it.each([
            { field: 'name' },
            { operator: 'eq' },
            { value: 'test' },
            { field: 'age', operator: 'lt', value: 'thirty' },
            { field: 'tags', lambdaOperator: 'any' },
            { lambdaOperator: 'any', expression: {} },
            { field: 'tags', expression: {} },
            { field: 'tags', lambdaOperator: 'some', expression: {} },
            {
                field: 'name',
                operator: 'eq',
                value: 'test',
                lambdaOperator: 'any',
            },
            null,
            undefined,
            123,
            'string',
            [],
            {},
            {
                field: 'name',
                operator: 'eq',
                value: 'test',
                transform: ['year'],
            },
            {
                field: 'createdAt',
                operator: 'eq',
                value: testDate,
                transform: ['trim'],
            },
        ])('should return false for invalid filter %#', filter => {
            expect(isQueryFilter(filter)).toBe(false);
        });

        it('should handle complex nested filters', () => {
            const complexFilter = {
                logic: 'and',
                filters: [
                    { field: 'isActive', operator: 'eq', value: true },
                    {
                        field: 'tags',
                        lambdaOperator: 'any',
                        expression: {
                            field: '',
                            operator: 'eq',
                            value: 'test',
                        },
                    },
                    {
                        logic: 'or',
                        filters: [
                            { field: 'age', operator: 'gt', value: 18 },
                            { field: 'age', operator: 'lt', value: 65 },
                        ],
                    },
                ],
            };

            // Should return false since this is a CombinedFilter, not QueryFilter
            expect(isQueryFilter(complexFilter)).toBe(false);
        });
    });

    describe('Type Narrowing', () => {
        it('should properly narrow the type after validation', () => {
            const potentialFilter: unknown = {
                field: 'createdAt',
                operator: 'gt',
                value: new Date(),
            };

            if (isQueryFilter(potentialFilter)) {
                // Cast to basic filter type since we know this specific filter has a value property
                const basicFilter = potentialFilter as { value: unknown };
                expect(basicFilter.value instanceof Date).toBe(true);
                expect(
                    (basicFilter.value as Date).toISOString(),
                ).toBeDefined();
            } else {
                expect.fail(
                    'Filter should have been recognized as QueryFilter',
                );
            }
        });

        it('should narrow type for lambda filters', () => {
            const potentialLambda: unknown = {
                field: 'orders',
                lambdaOperator: 'any',
                expression: { field: 'total', operator: 'gt', value: 100 },
            };

            if (
                isQueryFilter<{ orders: Array<{ total: number }> }>(
                    potentialLambda,
                )
            ) {
                // TypeScript should know this is a lambda filter
                expect(
                    (potentialLambda as { lambdaOperator: string })
                        .lambdaOperator,
                ).toBe('any');
                expect(
                    typeof (potentialLambda as { expression: unknown })
                        .expression,
                ).toBe('object');
            } else {
                fail(
                    'Lambda filter should have been recognized as QueryFilter',
                );
            }
        });
    });
});
function fail(message: string) {
    throw new Error(message);
}
