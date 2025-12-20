import { describe, it, assertType, expectTypeOf } from 'vitest';
import {
    QueryFilter,
    FilterFields,
    LambdaFilterFields,
    FilterOperators,
    ArithmeticFunctionDefinition,
    GeneralFilterOperators,
} from './query-filter.type';
import { Guid } from '../utils/util.types';

describe('QueryFilter<T>', () => {
    it('should allow boolean filter', () => {
        type Item = { isActive: boolean };
        const filter: QueryFilter<Item> = {
            field: 'isActive',
            operator: 'eq',
            value: true,
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should allow string filter', () => {
        type Item = { name: string };
        const filter: QueryFilter<Item> = {
            field: 'name',
            operator: 'eq',
            value: 'test',
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should allow date filter', () => {
        type Item = { createdDate: Date };
        const filter: QueryFilter<Item> = {
            field: 'createdDate',
            operator: 'gt',
            value: new Date(),
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should allow guid filter', () => {
        type Item = { id: Guid };
        const filter: QueryFilter<Item> = {
            field: 'id',
            operator: 'eq',
            value: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as Guid,
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should allow number filter', () => {
        type Item = { count: number };
        const filter: QueryFilter<Item> = {
            field: 'count',
            operator: 'lt',
            value: 10,
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should allow nested field filter', () => {
        type Item = { details: { code: string } };
        const filter: QueryFilter<Item> = {
            field: 'details/code',
            operator: 'eq',
            value: 'test',
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should allow lambda operator with inner field on array of objects', () => {
        type Item = { items: { name: string }[] };
        const filter: QueryFilter<Item> = {
            field: 'items',
            lambdaOperator: 'any',
            expression: { field: 'name', operator: 'eq', value: 'test' },
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should allow null value for string filter', () => {
        type Item = { name: string | null };
        const filter: QueryFilter<Item> = {
            field: 'name',
            operator: 'eq',
            value: null,
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should allow null value for number filter', () => {
        type Item = { count: number | null };
        const filter: QueryFilter<Item> = {
            field: 'count',
            operator: 'eq',
            value: null,
        };
        assertType<QueryFilter<Item>>(filter);
    });

    it('should only allow ignoreCase for string fields', () => {
        type Item = { name: string; count: number };
        const stringFilter: QueryFilter<Item> = {
            field: 'name',
            operator: 'eq',
            value: 'test',
            ignoreCase: true,
        };
        assertType<QueryFilter<Item>>(stringFilter);

        const numberFilter: QueryFilter<Item> = {
            field: 'count',
            operator: 'eq',
            value: 5,
            // @ts-expect-error - ignoreCase is not allowed for number fields
            ignoreCase: true,
        };
        void numberFilter;
    });

    it('should only allow removeQuotes for string and Guid fields', () => {
        type Item = { id: Guid; name: string; count: number };
        const guidFilter: QueryFilter<Item> = {
            field: 'id',
            operator: 'eq',
            value: '...' as Guid,
            removeQuotes: true,
        };
        assertType<QueryFilter<Item>>(guidFilter);
        const stringFilter: QueryFilter<Item> = {
            field: 'name',
            operator: 'eq',
            value: 'test',
            removeQuotes: true,
        };
        assertType<QueryFilter<Item>>(stringFilter);

        const numberFilter: QueryFilter<Item> = {
            field: 'count',
            operator: 'eq',
            value: 5,
            //@ts-expect-error should not be allowed for number
            removeQuotes: true,
        };
        void numberFilter;
    });

    it('should allow filter on optional property', () => {
        type Item = { name?: string };
        const filter: QueryFilter<Item> = {
            field: 'name',
            operator: 'eq',
            value: 'test',
        };
        assertType<QueryFilter<Item>>(filter);
    });
});

describe('FilterFields<T, VALUETYPE>', () => {
    it('should allow fields with matching value type', () => {
        type Item = { name: string; count: number };
        expectTypeOf<FilterFields<Item, string>>().toEqualTypeOf<'name'>();
    });

    it('should allow nested fields with matching value type', () => {
        type Item = { details: { code: string } };
        expectTypeOf<
            FilterFields<Item, string>
        >().toEqualTypeOf<'details/code'>();
    });

    it('should allow fields in array of primitives with matching value type', () => {
        type Item = { tags: string[] };
        expectTypeOf<FilterFields<Item, string>>().toEqualTypeOf<'tags'>();
    });

    it('should allow fields in array of objects with matching value type', () => {
        type Item = { items: { name: string }[] };
        expectTypeOf<FilterFields<Item, string>>().toEqualTypeOf<'items'>();
    });

    it('should not allow fields with non-matching value type', () => {
        type Item = { name: string; count: number };
        expectTypeOf<FilterFields<Item, number>>().not.toEqualTypeOf<'name'>();
    });

    it('should allow fields with matching value type (nullable)', () => {
        type Item = { name: string | null; count: number };
        expectTypeOf<FilterFields<Item, string>>().toEqualTypeOf<'name'>();
    });

    it('should allow nested fields with matching value type (complex)', () => {
        type Item = { details: { address: { street: string } } };
        expectTypeOf<
            FilterFields<Item, string>
        >().toEqualTypeOf<'details/address/street'>();
    });

    it('should not allow fields with non-matching value type (complex)', () => {
        type Item = { details: { code: string; value: number } };
        expectTypeOf<
            FilterFields<Item, number>
        >().not.toEqualTypeOf<'details/code'>();
    });

    it('should not allow filtering on object fields directly', () => {
        type Item = { details: { code: string } };
        // @ts-expect-error - Cannot filter on object field directly, invalid operator for object type
        const filter: QueryFilter<Item> = {
            field: 'details',
            operator: 'eq',
            value: { code: 'test' },
        };
        void filter;
    });

    it('should not allow ignoreCase for boolean fields', () => {
        type Item = { isActive: boolean };
        const filter: QueryFilter<Item> = {
            field: 'isActive',
            operator: 'eq',
            value: true,
            // @ts-expect-error - ignoreCase is not allowed for boolean fields
            ignoreCase: true,
        };
        void filter;
    });

    it('should not allow removeQuotes for boolean fields', () => {
        type Item = { isActive: boolean };
        const filter: QueryFilter<Item> = {
            field: 'isActive',
            operator: 'eq',
            value: true,
            // @ts-expect-error - removeQuotes is not allowed for boolean fields
            removeQuotes: true,
        };
        void filter;
    });
});

describe('LambdaFilterFields<T, VALUETYPE>', () => {
    it('should allow fields of array of objects', () => {
        type Item = { items: { name: string; value: number }[] };
        expectTypeOf<
            LambdaFilterFields<Item, string>
        >().toEqualTypeOf<'name'>();
    });

    it('should not allow fields of primitive types', () => {
        type Item = { tags: string[] };
        expectTypeOf<LambdaFilterFields<Item, string>>().toEqualTypeOf<never>();
    });
});

describe('FilterOperators<VALUETYPE>', () => {
    it('should allow string operators for string values', () => {
        expectTypeOf<
            FilterOperators<string>
        >().toEqualTypeOf<GeneralFilterOperators>();
    });

    it('should allow number operators for number values', () => {
        expectTypeOf<FilterOperators<number>>().toEqualTypeOf<
            'eq' | 'ne' | 'ge' | 'gt' | 'le' | 'lt'
        >();
    });

    it('should allow date operators for date values', () => {
        expectTypeOf<FilterOperators<Date>>().toEqualTypeOf<
            'eq' | 'ne' | 'ge' | 'gt' | 'le' | 'lt'
        >();
    });

    it('should allow fields of array of objects with different value types', () => {
        type Item = {
            items: { name: string; value: number; isActive: boolean }[];
        };
        expectTypeOf<
            LambdaFilterFields<Item, string>
        >().toEqualTypeOf<'name'>();
        expectTypeOf<
            LambdaFilterFields<Item, number>
        >().toEqualTypeOf<'value'>();
        expectTypeOf<
            LambdaFilterFields<Item, boolean>
        >().toEqualTypeOf<'isActive'>();
    });

    it('should not allow fields of non-array types', () => {
        type Item = { name: string };
        expectTypeOf<LambdaFilterFields<Item, string>>().toEqualTypeOf<never>();
    });
});

describe('QueryFilter<T> with functions', () => {
    it('should allow string concat function', () => {
        type ItemType = { name: string };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'concat',
                values: ['Hello', 'World'],
            },
            field: 'name',
            operator: 'eq',
            value: 'HelloWorld',
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should allow string contains function', () => {
        type ItemType = { name: string };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'contains',
                value: 'Hello',
            },
            field: 'name',
            operator: 'eq',
            value: 'true',
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should allow string endswith function', () => {
        type ItemType = { name: string };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'endswith',
                value: 'World',
            },
            field: 'name',
            operator: 'eq',
            value: 'true',
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should allow string indexof function', () => {
        type ItemType = { name: string };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'indexof',
                value: 'Hello',
            },
            field: 'name',
            operator: 'eq',
            value: '-1',
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should allow string length function', () => {
        type ItemType = { name: string };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'length',
            },
            field: 'name',
            operator: 'eq',
            value: '5',
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should allow string startswith function', () => {
        type ItemType = { name: string };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'startswith',
                value: 'Hello',
            },
            field: 'name',
            operator: 'eq',
            value: 'true',
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should allow string substring function (start only)', () => {
        type ItemType = { name: string };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'substring',
                start: 1,
            },
            field: 'name',
            operator: 'eq',
            value: 'ello',
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should allow string substring function (start and length)', () => {
        type ItemType = { name: string };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'substring',
                start: 1,
                length: 3,
            },
            field: 'name',
            operator: 'eq',
            value: 'ell',
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should enforce correct operator for string functions', () => {
        type ItemType = { name: string };
        const validFilter: QueryFilter<ItemType> = {
            function: {
                type: 'contains',
                value: 'Hello',
            },
            field: 'name',
            operator: 'eq',
            value: 'true',
        };
        assertType<QueryFilter<ItemType>>(validFilter);

        // @ts-expect-error - Invalid operator for string function return type
        const invalidFilter: QueryFilter<ItemType> = {
            function: {
                type: 'contains',
                value: 'Hello',
            },
            field: 'name',
            operator: 'gt',
            value: true,
        };
        void invalidFilter;
    });

    // Field and Function Matching
    it('should enforce matching field and function types for string functions', () => {
        type ItemType = { name: string; price: number };

        const validFilter: QueryFilter<ItemType> = {
            function: {
                type: 'startswith',
                value: 'Test',
            },
            field: 'name',
            operator: 'eq',
            value: 'true',
        };
        assertType<QueryFilter<ItemType>>(validFilter);

        const invalidFilter: QueryFilter<ItemType> = {
            function: {
                type: 'startswith',
                // @ts-expect-error - Field does not match function return type (price is number, startswith is for strings)
                value: 'Test',
            },
            field: 'price',
            operator: 'eq',
            value: 'true',
        };
        void invalidFilter;
    });

    // Edge Cases
    it('should handle empty function values gracefully', () => {
        type ItemType = { name: string };
        // @ts-expect-error - Missing required function properties (concat needs values array)
        const invalidFilter: QueryFilter<ItemType> = {
            function: {
                type: 'concat',
            },
            field: 'name',
            operator: 'eq',
            value: 'Hello',
        };
        void invalidFilter;
    });

    it('should not allow functions for unsupported field types', () => {
        type ItemType = { name: string; price: number };
        const invalidFilter: QueryFilter<ItemType> = {
            function: {
                type: 'concat',
                // @ts-expect-error - Field does not support string function (concat on number field)
                values: ['Hello', 'World'],
            },
            field: 'price',
            operator: 'eq',
            value: 'HelloWorld',
        };
        void invalidFilter;
    });

    // Date Functions
    it('should allow date function (now)', () => {
        type ItemType = { createdAt: Date };
        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'now',
            },
            field: 'createdAt',
            operator: 'gt',
            value: new Date(),
        };
        assertType<QueryFilter<ItemType>>(filter);
    });

    it('should enforce correct operator for date functions', () => {
        type ItemType = { createdAt: Date };
        const validFilter: QueryFilter<ItemType> = {
            function: {
                type: 'now',
            },
            field: 'createdAt',
            operator: 'gt',
            value: new Date(),
        };
        assertType<QueryFilter<ItemType>>(validFilter);

        // @ts-expect-error - Invalid operator for date function return type
        const invalidFilter: QueryFilter<ItemType> = {
            function: {
                type: 'now',
            },
            field: 'createdAt',
            operator: 'contains',
            value: new Date(),
        };
        void invalidFilter;
    });

    // Field and Function Matching
    it('should enforce matching field and function types', () => {
        type ItemType = { name: string; price: number; createdAt: Date };

        const validStringFilter: QueryFilter<ItemType> = {
            function: {
                type: 'concat',
                values: ['Hello', { fieldReference: 'name' }],
            },
            field: 'name',
            operator: 'eq',
            value: 'Hello World',
        };
        assertType<QueryFilter<ItemType>>(validStringFilter);

        const invalidStringFilter: QueryFilter<ItemType> = {
            function: {
                type: 'concat',
                // @ts-expect-error - Field does not match function return type (concat on number field)
                values: ['Hello', { fieldReference: 'name' }],
            },
            field: 'price',
            operator: 'eq',
            value: 'Hello World',
        };
        void invalidStringFilter;

        const validNumberFilter: QueryFilter<ItemType> = {
            function: {
                type: 'add',
                operand: 10,
            },
            field: 'price',
            operator: 'eq',
            value: 110,
        };
        assertType<QueryFilter<ItemType>>(validNumberFilter);

        // @ts-expect-error - Field does not match function return type (add on string field)
        const invalidNumberFilter: QueryFilter<ItemType> = {
            function: {
                type: 'add',
                operand: 10,
            },
            field: 'name',
            operator: 'eq',
            value: 110,
        };
        void invalidNumberFilter;
    });

    // Edge Cases
    it('should handle empty function values gracefully', () => {
        type ItemType = { name: string };
        // @ts-expect-error - Missing required function properties (empty function object)
        const invalidFilter: QueryFilter<ItemType> = {
            function: {},
            field: 'name',
            operator: 'eq',
            value: 'Hello',
        };
        void invalidFilter;
    });

    it('should not allow functions for fields without matching types', () => {
        type ItemType = { name: string; price: number };
        // @ts-expect-error - 'add' is not valid for string field
        const invalidFilter: QueryFilter<ItemType> = {
            function: {
                type: 'add',
                operand: 10,
            },
            field: 'name',
            operator: 'eq',
            value: 10,
        };
        void invalidFilter;
    });
});

describe('ArithmeticFunctionDefinition<number>', () => {
    type ItemType = { price: number };

    it('should allow basic arithmetic operations for numbers', () => {
        const validAdd: ArithmeticFunctionDefinition<ItemType> = {
            type: 'add',
            operand: 10,
        };
        const validDiv: ArithmeticFunctionDefinition<ItemType> = {
            type: 'div',
            operand: 20,
        };

        const invalidSub: ArithmeticFunctionDefinition<ItemType> = {
            type: 'sub',
            //@ts-expect-error Operand should be number
            operand: 'invalid',
        };

        assertType<ArithmeticFunctionDefinition<ItemType>>(validAdd);
        assertType<ArithmeticFunctionDefinition<ItemType>>(validDiv);
        void invalidSub;
    });
});

describe('OData Arithmetic Operators', () => {
    it('should allow arithmetic operations on numbers', () => {
        type ItemType = { price: number };

        const filter: QueryFilter<ItemType> = {
            function: {
                type: 'add',
                operand: 10,
            },
            field: 'price',
            operator: 'eq',
            value: 110,
        };
        assertType<QueryFilter<ItemType>>(filter);
    });
});
