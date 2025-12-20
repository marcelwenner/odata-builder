import { describe, it, expect } from 'vitest';
import { FilterBuilder, filter } from './filter-builder';
import { createFieldProxy } from './field-proxy';
import { OdataQueryBuilder } from '../../index';
import { Guid } from '../../types/utils/util.types';

// ============================================================================
// Test Types
// ============================================================================

interface TestUser {
    name: string;
    middleName: string | null; // nullable field for eq(null) tests
    age: number;
    email: string;
    isActive: boolean;
    createdAt: Date;
    score: number;
    tags: string[];
    orders: TestOrder[];
    address: TestAddress;
    userId: Guid;
}

interface TestOrder {
    id: number;
    price: number;
    status: string;
    items: TestOrderItem[];
}

interface TestOrderItem {
    name: string;
    quantity: number;
}

interface TestAddress {
    city: string;
    country: string;
    zip: string;
}

// ============================================================================
// FilterBuilder Class Tests
// ============================================================================

describe('FilterBuilder', () => {
    describe('Basic Operations', () => {
        it('should build a simple equality filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'John',
            });
        });

        it('should build a null equality filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.middleName.eq(null))
                .build();

            expect(result).toEqual({
                field: 'middleName',
                operator: 'eq',
                value: null,
            });
        });

        it('should build a not-equal filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.ne('John'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'ne',
                value: 'John',
            });
        });

        it('should return null for empty builder', () => {
            const result = new FilterBuilder<TestUser>().build();
            expect(result).toBeNull();
        });

        it('should correctly report isEmpty()', () => {
            expect(new FilterBuilder<TestUser>().isEmpty()).toBe(true);
            expect(
                new FilterBuilder<TestUser>()
                    .where(x => x.name.eq('John'))
                    .isEmpty(),
            ).toBe(false);
        });
    });

    describe('Number Operations', () => {
        it('should build gt filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.age.gt(18))
                .build();

            expect(result).toEqual({
                field: 'age',
                operator: 'gt',
                value: 18,
            });
        });

        it('should build ge filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.age.ge(18))
                .build();

            expect(result).toEqual({
                field: 'age',
                operator: 'ge',
                value: 18,
            });
        });

        it('should build lt filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.age.lt(65))
                .build();

            expect(result).toEqual({
                field: 'age',
                operator: 'lt',
                value: 65,
            });
        });

        it('should build le filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.age.le(65))
                .build();

            expect(result).toEqual({
                field: 'age',
                operator: 'le',
                value: 65,
            });
        });

        it('should build arithmetic add operation', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.age.add(5).eq(25))
                .build();

            expect(result).toEqual({
                field: 'age',
                operator: 'eq',
                value: 25,
                function: { type: 'add', operand: 5 },
            });
        });

        it('should build arithmetic sub operation', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.age.sub(5).gt(18))
                .build();

            expect(result).toEqual({
                field: 'age',
                operator: 'gt',
                value: 18,
                function: { type: 'sub', operand: 5 },
            });
        });

        it('should build arithmetic mul operation', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.score.mul(2).ge(100))
                .build();

            expect(result).toEqual({
                field: 'score',
                operator: 'ge',
                value: 100,
                function: { type: 'mul', operand: 2 },
            });
        });

        it('should build arithmetic div operation', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.score.div(10).lt(5))
                .build();

            expect(result).toEqual({
                field: 'score',
                operator: 'lt',
                value: 5,
                function: { type: 'div', operand: 10 },
            });
        });

        it('should build arithmetic mod operation', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.age.mod(2).eq(0))
                .build();

            expect(result).toEqual({
                field: 'age',
                operator: 'eq',
                value: 0,
                function: { type: 'mod', operand: 2 },
            });
        });

        it('should build round transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.score.round().eq(10))
                .build();

            expect(result).toEqual({
                field: 'score',
                operator: 'eq',
                value: 10,
                transform: ['round'],
            });
        });

        it('should build floor transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.score.floor().eq(10))
                .build();

            expect(result).toEqual({
                field: 'score',
                operator: 'eq',
                value: 10,
                transform: ['floor'],
            });
        });

        it('should build ceiling transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.score.ceiling().eq(10))
                .build();

            expect(result).toEqual({
                field: 'score',
                operator: 'eq',
                value: 10,
                transform: ['ceiling'],
            });
        });
    });

    describe('String Operations', () => {
        it('should build contains predicate', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.contains('John'))
                .build();

            expect(result).toEqual({
                field: 'name',
                function: { type: 'contains', value: 'John' },
                operator: 'eq',
                value: true,
            });
        });

        it('should build startswith predicate', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.startswith('J'))
                .build();

            expect(result).toEqual({
                field: 'name',
                function: { type: 'startswith', value: 'J' },
                operator: 'eq',
                value: true,
            });
        });

        it('should build endswith predicate', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.email.endswith('.com'))
                .build();

            expect(result).toEqual({
                field: 'email',
                function: { type: 'endswith', value: '.com' },
                operator: 'eq',
                value: true,
            });
        });

        it('should build contains with ignoreCase', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.ignoreCase().contains('john'))
                .build();

            expect(result).toEqual({
                field: 'name',
                function: { type: 'contains', value: 'john' },
                operator: 'eq',
                value: true,
                ignoreCase: true,
            });
        });

        it('should build tolower transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.tolower().eq('john'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'john',
                transform: ['tolower'],
            });
        });

        it('should build toupper transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.toupper().eq('JOHN'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'JOHN',
                transform: ['toupper'],
            });
        });

        it('should build trim transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.trim().eq('John'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'John',
                transform: ['trim'],
            });
        });

        it('should chain multiple transforms', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.trim().tolower().eq('john'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'john',
                transform: ['trim', 'tolower'],
            });
        });

        it('should build length function', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.length().gt(5))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'gt',
                value: 5,
                function: { type: 'length' },
            });
        });

        it('should build indexof function', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.indexof('@').ge(0))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'ge',
                value: 0,
                function: { type: 'indexof', value: '@' },
            });
        });

        it('should build substring function', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.substring(0, 3).eq('Joh'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'Joh',
                function: { type: 'substring', start: 0, length: 3 },
            });
        });

        it('should build substring function without length', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.substring(3).eq('n'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'n',
                function: { type: 'substring', start: 3 },
            });
        });

        it('should build concat function', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.concat(' Doe').eq('John Doe'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'John Doe',
                function: { type: 'concat', values: [' Doe'] },
            });
        });
    });

    describe('Boolean Operations', () => {
        it('should build isTrue shortcut', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.isActive.isTrue())
                .build();

            expect(result).toEqual({
                field: 'isActive',
                operator: 'eq',
                value: true,
            });
        });

        it('should build isFalse shortcut', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.isActive.isFalse())
                .build();

            expect(result).toEqual({
                field: 'isActive',
                operator: 'eq',
                value: false,
            });
        });

        it('should build boolean eq filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.isActive.eq(true))
                .build();

            expect(result).toEqual({
                field: 'isActive',
                operator: 'eq',
                value: true,
            });
        });
    });

    describe('Date Operations', () => {
        it('should build date comparison filter', () => {
            const date = new Date('2024-01-01');
            const result = new FilterBuilder<TestUser>()
                .where(x => x.createdAt.gt(date))
                .build();

            expect(result).toEqual({
                field: 'createdAt',
                operator: 'gt',
                value: date,
            });
        });

        it('should build year transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.createdAt.year().eq(2024))
                .build();

            expect(result).toEqual({
                field: 'createdAt',
                operator: 'eq',
                value: 2024,
                transform: ['year'],
            });
        });

        it('should build month transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.createdAt.month().eq(1))
                .build();

            expect(result).toEqual({
                field: 'createdAt',
                operator: 'eq',
                value: 1,
                transform: ['month'],
            });
        });

        it('should build day transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.createdAt.day().eq(15))
                .build();

            expect(result).toEqual({
                field: 'createdAt',
                operator: 'eq',
                value: 15,
                transform: ['day'],
            });
        });

        it('should build hour transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.createdAt.hour().eq(10))
                .build();

            expect(result).toEqual({
                field: 'createdAt',
                operator: 'eq',
                value: 10,
                transform: ['hour'],
            });
        });

        it('should build minute transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.createdAt.minute().eq(30))
                .build();

            expect(result).toEqual({
                field: 'createdAt',
                operator: 'eq',
                value: 30,
                transform: ['minute'],
            });
        });

        it('should build second transform', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.createdAt.second().eq(0))
                .build();

            expect(result).toEqual({
                field: 'createdAt',
                operator: 'eq',
                value: 0,
                transform: ['second'],
            });
        });
    });

    describe('Guid Operations', () => {
        it('should build guid eq filter', () => {
            const guid = '550e8400-e29b-41d4-a716-446655440000' as Guid;
            const result = new FilterBuilder<TestUser>()
                .where(x => x.userId.eq(guid))
                .build();

            expect(result).toEqual({
                field: 'userId',
                operator: 'eq',
                value: guid,
            });
        });

        it('should build guid with removeQuotes', () => {
            const guid = '550e8400-e29b-41d4-a716-446655440000' as Guid;
            const result = new FilterBuilder<TestUser>()
                .where(x => x.userId.removeQuotes().eq(guid))
                .build();

            expect(result).toEqual({
                field: 'userId',
                operator: 'eq',
                value: guid,
                removeQuotes: true,
            });
        });
    });

    describe('Nested Object Access', () => {
        it('should build filter with nested property access', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.address.city.eq('Berlin'))
                .build();

            expect(result).toEqual({
                field: 'address/city',
                operator: 'eq',
                value: 'Berlin',
            });
        });

        it('should build filter with deeply nested property access', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.address.city.tolower().contains('berlin'))
                .build();

            expect(result).toEqual({
                field: 'address/city',
                function: { type: 'contains', value: 'berlin' },
                operator: 'eq',
                value: true,
            });
        });
    });

    describe('AND/OR Combinations', () => {
        it('should build AND combined filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .and(x => x.age.gt(18))
                .build();

            expect(result).toEqual({
                logic: 'and',
                filters: [
                    { field: 'name', operator: 'eq', value: 'John' },
                    { field: 'age', operator: 'gt', value: 18 },
                ],
            });
        });

        it('should build OR combined filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .or(x => x.name.eq('Jane'))
                .build();

            expect(result).toEqual({
                logic: 'or',
                filters: [
                    { field: 'name', operator: 'eq', value: 'John' },
                    { field: 'name', operator: 'eq', value: 'Jane' },
                ],
            });
        });

        it('should build complex AND/OR filter with correct precedence', () => {
            // a AND b OR c should be (a AND b) OR c
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .and(x => x.age.gt(18))
                .or(x => x.isActive.isTrue())
                .build();

            expect(result).toEqual({
                logic: 'or',
                filters: [
                    {
                        logic: 'and',
                        filters: [
                            { field: 'name', operator: 'eq', value: 'John' },
                            { field: 'age', operator: 'gt', value: 18 },
                        ],
                    },
                    { field: 'isActive', operator: 'eq', value: true },
                ],
            });
        });

        it('should build multiple AND operations', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .and(x => x.age.gt(18))
                .and(x => x.isActive.isTrue())
                .build();

            expect(result).toEqual({
                logic: 'and',
                filters: [
                    { field: 'name', operator: 'eq', value: 'John' },
                    { field: 'age', operator: 'gt', value: 18 },
                    { field: 'isActive', operator: 'eq', value: true },
                ],
            });
        });

        it('should build multiple OR operations', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .or(x => x.name.eq('Jane'))
                .or(x => x.name.eq('Bob'))
                .build();

            expect(result).toEqual({
                logic: 'or',
                filters: [
                    { field: 'name', operator: 'eq', value: 'John' },
                    { field: 'name', operator: 'eq', value: 'Jane' },
                    { field: 'name', operator: 'eq', value: 'Bob' },
                ],
            });
        });
    });

    describe('Lambda Array Operations', () => {
        it('should build any filter with primitive array', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.tags.any(t => t.s.eq('admin')))
                .build();

            expect(result).toEqual({
                field: 'tags',
                lambdaOperator: 'any',
                expression: { field: 's', operator: 'eq', value: 'admin' },
            });
        });

        it('should build all filter with primitive array', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.tags.all(t => t.s.contains('valid')))
                .build();

            expect(result).toEqual({
                field: 'tags',
                lambdaOperator: 'all',
                expression: {
                    field: 's',
                    function: { type: 'contains', value: 'valid' },
                    operator: 'eq',
                    value: true,
                },
            });
        });

        it('should build any filter with object array', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.orders.any(o => o.price.gt(100)))
                .build();

            expect(result).toEqual({
                field: 'orders',
                lambdaOperator: 'any',
                expression: { field: 'price', operator: 'gt', value: 100 },
            });
        });

        it('should build all filter with object array', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.orders.all(o => o.status.eq('completed')))
                .build();

            expect(result).toEqual({
                field: 'orders',
                lambdaOperator: 'all',
                expression: {
                    field: 'status',
                    operator: 'eq',
                    value: 'completed',
                },
            });
        });

        it('should build nested array filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.orders.any(o => o.items.any(i => i.quantity.gt(5))))
                .build();

            expect(result).toEqual({
                field: 'orders',
                lambdaOperator: 'any',
                expression: {
                    field: 'items',
                    lambdaOperator: 'any',
                    expression: {
                        field: 'quantity',
                        operator: 'gt',
                        value: 5,
                    },
                },
            });
        });
    });

    describe('Filter Composition', () => {
        it('should compose filters using FilterBuilder as input', () => {
            const activeFilter = new FilterBuilder<TestUser>().where(x =>
                x.isActive.isTrue(),
            );

            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .and(activeFilter)
                .build();

            expect(result).toEqual({
                logic: 'and',
                filters: [
                    { field: 'name', operator: 'eq', value: 'John' },
                    { field: 'isActive', operator: 'eq', value: true },
                ],
            });
        });

        it('should use group for explicit precedence', () => {
            const builder = new FilterBuilder<TestUser>();
            const innerGroup = builder
                .where(x => x.age.gt(18))
                .or(x => x.age.lt(10));

            const result = builder
                .where(x => x.name.eq('John'))
                .and(builder.group(innerGroup))
                .build();

            expect(result).toEqual({
                logic: 'and',
                filters: [
                    { field: 'name', operator: 'eq', value: 'John' },
                    {
                        logic: 'or',
                        filters: [
                            { field: 'age', operator: 'gt', value: 18 },
                            { field: 'age', operator: 'lt', value: 10 },
                        ],
                    },
                ],
            });
        });
    });

    describe('Error Handling', () => {
        it('should throw when using .and() on empty builder', () => {
            expect(() => {
                new FilterBuilder<TestUser>().and(x => x.name.eq('John'));
            }).toThrow(
                'FilterBuilder: Cannot use .and() on empty builder. Use .where() first.',
            );
        });

        it('should throw when using .or() on empty builder', () => {
            expect(() => {
                new FilterBuilder<TestUser>().or(x => x.name.eq('John'));
            }).toThrow(
                'FilterBuilder: Cannot use .or() on empty builder. Use .where() first.',
            );
        });

        it('should throw when grouping empty builder', () => {
            const builder = new FilterBuilder<TestUser>();
            expect(() => {
                builder.group(new FilterBuilder<TestUser>());
            }).toThrow(
                'FilterBuilder: Cannot group empty FilterBuilder. Add at least one condition.',
            );
        });

        it('should throw for invalid predicate return', () => {
            expect(() => {
                new FilterBuilder<TestUser>()
                    .where((() => 'invalid') as never)
                    .build();
            }).toThrow();
        });
    });

    describe('in() Operator', () => {
        it('should build in filter with string values', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.in(['John', 'Jane']))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'in',
                values: ['John', 'Jane'],
            });
        });

        it('should build in filter with number values', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.age.in([18, 21, 65]))
                .build();

            expect(result).toEqual({
                field: 'age',
                operator: 'in',
                values: [18, 21, 65],
            });
        });

        it('should throw error for empty values array', () => {
            expect(() => {
                new FilterBuilder<TestUser>()
                    .where(x => x.name.in([]))
                    .build();
            }).toThrow("FilterBuilder: in() requires at least one value");
        });

        it('should build in filter with null values for nullable fields', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.middleName.in(['John', null]))
                .build();

            expect(result).toEqual({
                field: 'middleName',
                operator: 'in',
                values: ['John', null],
            });
        });

        it('should combine in filter with other filters', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.in(['John', 'Jane']))
                .and(x => x.isActive.isTrue())
                .build();

            expect(result).toEqual({
                logic: 'and',
                filters: [
                    { field: 'name', operator: 'in', values: ['John', 'Jane'] },
                    { field: 'isActive', operator: 'eq', value: true },
                ],
            });
        });
    });

    describe('not() Operator', () => {
        it('should negate a simple filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .not()
                .build();

            expect(result).toEqual({
                type: 'not',
                filter: { field: 'name', operator: 'eq', value: 'John' },
            });
        });

        it('should negate a combined filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .and(x => x.age.gt(18))
                .not()
                .build();

            expect(result).toEqual({
                type: 'not',
                filter: {
                    logic: 'and',
                    filters: [
                        { field: 'name', operator: 'eq', value: 'John' },
                        { field: 'age', operator: 'gt', value: 18 },
                    ],
                },
            });
        });

        it('should throw error when using not() on empty builder', () => {
            expect(() => {
                new FilterBuilder<TestUser>().not();
            }).toThrow("FilterBuilder: Cannot use .not() on empty builder");
        });

        it('should allow chaining after not()', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .not()
                .and(x => x.isActive.isTrue())
                .build();

            expect(result).toEqual({
                logic: 'and',
                filters: [
                    {
                        type: 'not',
                        filter: { field: 'name', operator: 'eq', value: 'John' },
                    },
                    { field: 'isActive', operator: 'eq', value: true },
                ],
            });
        });
    });

    describe('has() Operator', () => {
        it('should build has filter with namespace-qualified enum literal', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.has("Sales.Color'Yellow'"))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'has',
                value: "Sales.Color'Yellow'",
            });
        });

        it('should build has filter with simple enum value', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.email.has('Read'))
                .build();

            expect(result).toEqual({
                field: 'email',
                operator: 'has',
                value: 'Read',
            });
        });

        it('should combine has filter with other filters', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.has("Namespace.Permission'Admin'"))
                .and(x => x.isActive.isTrue())
                .build();

            expect(result).toEqual({
                logic: 'and',
                filters: [
                    { field: 'name', operator: 'has', value: "Namespace.Permission'Admin'" },
                    { field: 'isActive', operator: 'eq', value: true },
                ],
            });
        });

        it('should work with nested property access', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.address.city.has("Geo.Region'Europe'"))
                .build();

            expect(result).toEqual({
                field: 'address/city',
                operator: 'has',
                value: "Geo.Region'Europe'",
            });
        });
    });

    describe('buildArray()', () => {
        it('should return array with single filter', () => {
            const result = new FilterBuilder<TestUser>()
                .where(x => x.name.eq('John'))
                .buildArray();

            expect(result).toEqual([
                { field: 'name', operator: 'eq', value: 'John' },
            ]);
        });

        it('should return empty array for empty builder', () => {
            const result = new FilterBuilder<TestUser>().buildArray();
            expect(result).toEqual([]);
        });
    });

    describe('Factory Function', () => {
        it('should create FilterBuilder using filter() factory', () => {
            const result = filter<TestUser>()
                .where(x => x.name.eq('John'))
                .build();

            expect(result).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'John',
            });
        });
    });
});

// ============================================================================
// Field Proxy Tests
// ============================================================================

describe('createFieldProxy', () => {
    it('should return undefined for symbol properties', () => {
        const proxy = createFieldProxy<TestUser>();
        expect((proxy as unknown as Record<symbol, unknown>)[Symbol('test')]).toBeUndefined();
    });

    it('should throw for unknown operations', () => {
        const proxy = createFieldProxy<TestUser>();
        expect(() => {
            (proxy.name as unknown as { unknownOp: () => void }).unknownOp();
        }).toThrow();
    });
});

// ============================================================================
// OdataQueryBuilder Integration Tests
// ============================================================================

describe('OdataQueryBuilder.filter() with FilterBuilder', () => {
    it('should accept callback syntax', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.eq('John')))
            .toQuery();

        expect(query).toBe("?$filter=name eq 'John'");
    });

    it('should work with complex filter', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f =>
                f
                    .where(x => x.name.eq('John'))
                    .and(x => x.age.gt(18)),
            )
            .toQuery();

        expect(query).toBe("?$filter=(name eq 'John' and age gt 18)");
    });

    it('should work with ignoreCase', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.ignoreCase().contains('john')))
            .toQuery();

        expect(query).toBe("?$filter=contains(tolower(name), 'john')");
    });

    it('should work with string transforms', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.tolower().trim().eq('john')))
            .toQuery();

        expect(query).toBe("?$filter=trim(tolower(name)) eq 'john'");
    });

    it('should work with date transforms', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.createdAt.year().eq(2024)))
            .toQuery();

        expect(query).toBe('?$filter=year(createdAt) eq 2024');
    });

    it('should work with lambda any filter', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.tags.any(t => t.s.eq('admin'))))
            .toQuery();

        expect(query).toBe("?$filter=tags/any(s: s eq 'admin')");
    });

    it('should work with lambda all filter on object array', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.orders.all(o => o.price.gt(100))))
            .toQuery();

        expect(query).toBe('?$filter=orders/all(s: s/price gt 100)');
    });

    it('should work with nested property access', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.address.city.eq('Berlin')))
            .toQuery();

        expect(query).toBe("?$filter=address/city eq 'Berlin'");
    });

    it('should work with arithmetic operations', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.age.add(5).eq(25)))
            .toQuery();

        expect(query).toBe('?$filter=age add 5 eq 25');
    });

    it('should work with OR combined filter', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f =>
                f
                    .where(x => x.name.eq('John'))
                    .or(x => x.name.eq('Jane')),
            )
            .toQuery();

        expect(query).toBe("?$filter=(name eq 'John' or name eq 'Jane')");
    });

    it('should return empty query when filter is empty', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f)
            .toQuery();

        expect(query).toBe('');
    });

    it('should work combined with other query methods', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.isActive.isTrue()))
            .select('name', 'age')
            .top(10)
            .toQuery();

        expect(query).toBe('?$filter=isActive eq true&$top=10&$select=name, age');
    });

    it('should still support object-based filter', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter({ field: 'name', operator: 'eq', value: 'John' })
            .toQuery();

        expect(query).toBe("?$filter=name eq 'John'");
    });

    it('should work with has operator', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.has("Sales.Color'Yellow'")))
            .toQuery();

        expect(query).toBe("?$filter=name has Sales.Color'Yellow'");
    });

    it('should work with has operator combined with other filters', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f =>
                f
                    .where(x => x.name.has("Permission'Read'"))
                    .and(x => x.isActive.isTrue()),
            )
            .toQuery();

        expect(query).toBe(
            "?$filter=(name has Permission'Read' and isActive eq true)",
        );
    });

    it('should work with not(has())', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.has("Permission'Admin'")).not())
            .toQuery();

        expect(query).toBe("?$filter=not (name has Permission'Admin')");
    });
});

// ============================================================================
// OData Compliance: Apostrophe Escaping
// ============================================================================

describe('FilterBuilder Apostrophe Escaping', () => {
    it('should escape apostrophes in eq()', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.eq("O'Brien")))
            .toQuery();

        expect(query).toBe("?$filter=name eq 'O''Brien'");
    });

    it('should escape apostrophes in contains()', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.contains("O'Reilly")))
            .toQuery();

        expect(query).toBe("?$filter=contains(name, 'O''Reilly')");
    });

    it('should escape apostrophes in startswith()', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.startswith("McDonald's")))
            .toQuery();

        expect(query).toBe("?$filter=startswith(name, 'McDonald''s')");
    });

    it('should escape multiple apostrophes', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f => f.where(x => x.name.eq("It's John's")))
            .toQuery();

        expect(query).toBe("?$filter=name eq 'It''s John''s'");
    });

    it('should escape apostrophes in lambda expressions', () => {
        const query = new OdataQueryBuilder<TestUser>()
            .filter(f =>
                f.where(x => x.tags.any(t => t.s.eq("dev's"))),
            )
            .toQuery();

        expect(query).toBe("?$filter=tags/any(s: s eq 'dev''s')");
    });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('FilterBuilder Edge Cases', () => {
    describe('empty FilterBuilder handling', () => {
        it('where() with empty FilterBuilder returns builder with no filter', () => {
            const emptyBuilder = new FilterBuilder<TestUser>();
            const result = new FilterBuilder<TestUser>().where(emptyBuilder);
            expect(result.build()).toBeNull();
        });

        it('and() with empty FilterBuilder ignores the empty builder', () => {
            const builder = new FilterBuilder<TestUser>().where(x =>
                x.name.eq('John'),
            );
            const emptyBuilder = new FilterBuilder<TestUser>();
            const result = builder.and(emptyBuilder);
            expect(result.build()).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'John',
            });
        });

        it('or() with empty FilterBuilder ignores the empty builder', () => {
            const builder = new FilterBuilder<TestUser>().where(x =>
                x.name.eq('John'),
            );
            const emptyBuilder = new FilterBuilder<TestUser>();
            const result = builder.or(emptyBuilder);
            expect(result.build()).toEqual({
                field: 'name',
                operator: 'eq',
                value: 'John',
            });
        });
    });

    describe('error handling', () => {
        it('throws when passing non-function non-builder to where()', () => {
            expect(() => {
                new FilterBuilder<TestUser>().where(
                    'invalid' as unknown as FilterBuilder<TestUser>,
                );
            }).toThrow('Expected a predicate function');
        });

        it('throws when passing non-function non-builder to and()', () => {
            const builder = new FilterBuilder<TestUser>().where(x =>
                x.name.eq('John'),
            );
            expect(() => {
                builder.and('invalid' as unknown as FilterBuilder<TestUser>);
            }).toThrow('Expected a predicate function');
        });

        it('throws when passing non-function non-builder to or()', () => {
            const builder = new FilterBuilder<TestUser>().where(x =>
                x.name.eq('John'),
            );
            expect(() => {
                builder.or('invalid' as unknown as FilterBuilder<TestUser>);
            }).toThrow('Expected a predicate function');
        });
    });
});
