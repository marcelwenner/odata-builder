import { ODataFilterVisitor } from './filter-visitor';
import {
    HasFilter,
    InFilter,
    NegatedFilter,
    QueryFilter,
} from 'src/query-builder/types/filter/query-filter.type';
import { CombinedFilter } from 'src/query-builder/types/filter/combined-filter.type';
import { describe, beforeEach, it, expect } from 'vitest';

describe('ODataFilterVisitor', () => {
    type ItemType = {
        id: string;
        isActive: boolean;
        age: number;
        tags: string[];
        details: { name: string; value: number };
    };

    let visitor: ODataFilterVisitor<ItemType>;

    beforeEach(() => {
        visitor = new ODataFilterVisitor<ItemType>();
    });

    describe('visitBasicFilter', () => {
        it('should handle a basic filter with a string value', () => {
            const filter: QueryFilter<ItemType> = {
                field: 'id',
                operator: 'eq',
                value: '123',
            };

            const result = visitor.visitBasicFilter(filter);

            expect(result).toBe("id eq '123'");
        });

        it('should handle a basic filter with ignoreCase set to true', () => {
            const filter: QueryFilter<ItemType> = {
                field: 'id',
                operator: 'eq',
                value: '123',
                ignoreCase: true,
            };

            const result = visitor.visitBasicFilter(filter);

            expect(result).toBe("tolower(id) eq '123'");
        });

        it('should handle a basic filter with transformations', () => {
            const filter: QueryFilter<ItemType> = {
                field: 'id',
                operator: 'eq',
                value: '123',
                transform: ['trim', 'tolower'],
            };

            const result = visitor.visitBasicFilter(filter);

            expect(result).toBe("tolower(trim(id)) eq '123'");
        });

        it('should handle a basic filter with a numeric value', () => {
            const filter: QueryFilter<ItemType> = {
                field: 'age',
                operator: 'gt',
                value: 18,
            };

            const result = visitor.visitBasicFilter(filter);

            expect(result).toBe('age gt 18');
        });

        it('should handle a basic filter with a boolean value', () => {
            const filter: QueryFilter<ItemType> = {
                field: 'isActive',
                operator: 'eq',
                value: true,
            };

            const result = visitor.visitBasicFilter(filter);

            expect(result).toBe('isActive eq true');
        });

        it('should throw an error for a filter missing the "value" property', () => {
            const filter = {
                field: 'id',
                operator: 'eq',
            } as unknown as QueryFilter<ItemType>;

            expect(() => visitor.visitBasicFilter(filter)).toThrow(
                'Invalid BasicFilter: missing "value" property',
            );
        });
    });

    describe('visitLambdaFilter', () => {
        it('should handle a lambda filter with a basic filter as expression', () => {
            const filter: QueryFilter<ItemType> = {
                field: 'tags',
                lambdaOperator: 'any',
                expression: { field: 's', operator: 'eq', value: '123' },
            };

            const result = visitor.visitLambdaFilter<ItemType>(filter);

            expect(result).toBe("tags/any(s: s eq '123')");
        });

        it('should handle a lambda filter with a field in the expression', () => {
            type ItemWithObjectArray = {
                items: { id: string; name: string }[];
            };
            const objectVisitor = new ODataFilterVisitor<ItemWithObjectArray>();
            const filter: QueryFilter<ItemWithObjectArray> = {
                field: 'items',
                lambdaOperator: 'any',
                expression: { field: 'id', operator: 'eq', value: '123' },
            };

            const result =
                objectVisitor.visitLambdaFilter<ItemWithObjectArray>(filter);

            expect(result).toBe("items/any(s: s/id eq '123')");
        });

        it('should throw an error for an invalid lambda filter', () => {
            const filter = {
                field: 'tags',
                lambdaOperator: 'any',
            } as unknown as QueryFilter<ItemType>;

            expect(() => visitor.visitLambdaFilter(filter)).toThrow(
                /Invalid LambdaFilter/,
            );
        });
    });

    describe('visitCombinedFilter', () => {
        it('should handle combined filters with "and" logic', () => {
            const filter: CombinedFilter<ItemType> = {
                logic: 'and',
                filters: [
                    { field: 'isActive', operator: 'eq', value: true },
                    { field: 'age', operator: 'gt', value: 18 },
                ],
            };

            const result = visitor.visitCombinedFilter(filter);

            expect(result).toBe('(isActive eq true and age gt 18)');
        });

        it('should handle nested combined filters', () => {
            const filter: CombinedFilter<ItemType> = {
                logic: 'and',
                filters: [
                    { field: 'isActive', operator: 'eq', value: true },
                    {
                        logic: 'or',
                        filters: [
                            { field: 'age', operator: 'gt', value: 18 },
                            { field: 'age', operator: 'lt', value: 65 },
                        ],
                    },
                ],
            };

            const result = visitor.visitCombinedFilter(filter);

            expect(result).toBe(
                '(isActive eq true and (age gt 18 or age lt 65))',
            );
        });

        it('should throw an error for an invalid combined filter', () => {
            const filter = {
                logic: 'and',
                filters: [{}],
            } as unknown as CombinedFilter<ItemType>;

            expect(() => visitor.visitCombinedFilter(filter)).toThrow(
                /Invalid sub-filter/,
            );
        });
    });

    describe('Integration Tests', () => {
        it('should handle a filter query with mixed filters', () => {
            const filter: CombinedFilter<ItemType> = {
                logic: 'and',
                filters: [
                    { field: 'isActive', operator: 'eq', value: true },
                    {
                        field: 'tags',
                        lambdaOperator: 'any',
                        expression: {
                            operator: 'eq',
                            value: '123',
                            field: 's',
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

            const result = visitor.visitCombinedFilter(filter);

            expect(result).toBe(
                "(isActive eq true and tags/any(s: s eq '123') and (age gt 18 or age lt 65))",
            );
        });
    });
});

describe('ODataFilterVisitor with Functions', () => {
    type ItemType = {
        id: string;
        isActive: boolean;
        age: number;
        tags: string[];
        details: { name: string; value: number };
        createdAt: Date;
    };

    let visitor: ODataFilterVisitor<ItemType>;

    beforeEach(() => {
        visitor = new ODataFilterVisitor<ItemType>();
    });

    describe('visitBasicFilter with functions', () => {
        it('should handle a string concat function', () => {
            const filter: QueryFilter<ItemType> = {
                function: {
                    type: 'concat',
                    values: ['Hello'],
                },
                field: 'details/name',
                operator: 'eq',
                value: 'Hello John',
            };

            const result = visitor.visitBasicFilter(filter);

            expect(result).toBe(
                "concat(details/name, 'Hello') eq 'Hello John'",
            );
        });

        it('should handle an arithmetic add function for numbers', () => {
            const filter: QueryFilter<ItemType> = {
                function: {
                    type: 'add',
                    operand: 10,
                },
                field: 'age',
                operator: 'eq',
                value: 30,
            };

            const result = visitor.visitBasicFilter(filter);

            expect(result).toBe('age add 10 eq 30');
        });

        it('should handle a now function for dates', () => {
            const filter: QueryFilter<ItemType> = {
                function: {
                    type: 'now',
                },
                field: 'createdAt',
                operator: 'gt',
                value: new Date('2023-01-01'),
            };

            const result = visitor.visitBasicFilter(filter);

            expect(result).toBe('now() gt 2023-01-01T00:00:00.000Z');
        });

        it('should throw an error for an invalid function definition', () => {
            const filter = {
                function: {
                    type: 'add',
                },
                field: 'age',
                operator: 'eq',
                value: 30,
            } as unknown as QueryFilter<ItemType>;

            expect(() => visitor.visitBasicFilter(filter)).toThrow(
                /Invalid function definition/,
            );
        });
    });

    describe('visitCombinedFilter with functions', () => {
        it('should handle combined filters with functions', () => {
            const filter: CombinedFilter<ItemType> = {
                logic: 'and',
                filters: [
                    {
                        function: {
                            type: 'add',
                            operand: 10,
                        },
                        field: 'age',
                        operator: 'eq',
                        value: 30,
                    },
                    {
                        function: {
                            type: 'concat',
                            values: ['Hello'],
                        },
                        field: 'details/name',
                        operator: 'eq',
                        value: 'Hello John',
                    },
                ],
            };

            const result = visitor.visitCombinedFilter(filter);

            expect(result).toBe(
                "(age add 10 eq 30 and concat(details/name, 'Hello') eq 'Hello John')",
            );
        });

        it('should handle nested combined filters with functions', () => {
            const filter: CombinedFilter<ItemType> = {
                logic: 'or',
                filters: [
                    {
                        function: {
                            type: 'mul',
                            operand: 2,
                        },
                        field: 'age',
                        operator: 'gt',
                        value: 40,
                    },
                    {
                        logic: 'and',
                        filters: [
                            {
                                field: 'createdAt',
                                operator: 'lt',
                                value: new Date('2023-01-01'),
                            },
                            {
                                field: 'isActive',
                                operator: 'eq',
                                value: true,
                            },
                        ],
                    },
                ],
            };

            const result = visitor.visitCombinedFilter(filter);

            expect(result).toBe(
                '(age mul 2 gt 40 or (createdAt lt 2023-01-01T00:00:00.000Z and isActive eq true))',
            );
        });
    });

    describe('Integration Tests', () => {
        it('should handle mixed filters with functions and basic filters', () => {
            const filter: CombinedFilter<ItemType> = {
                logic: 'and',
                filters: [
                    {
                        function: {
                            type: 'add',
                            operand: 10,
                        },
                        field: 'age',
                        operator: 'eq',
                        value: 30,
                    },
                    { field: 'isActive', operator: 'eq', value: true },
                    {
                        function: {
                            type: 'concat',
                            values: ['Hello'],
                        },
                        field: 'details/name',
                        operator: 'eq',
                        value: 'Hello John',
                    },
                ],
            };

            const result = visitor.visitCombinedFilter(filter);

            expect(result).toBe(
                "(age add 10 eq 30 and isActive eq true and concat(details/name, 'Hello') eq 'Hello John')",
            );
        });
    });
});

describe('ODataFilterVisitor with in operator', () => {
    type ItemType = {
        status: string;
        age: number;
        name: string;
    };

    describe('visitInFilter - OData 4.01 syntax', () => {
        let visitor: ODataFilterVisitor<ItemType>;

        beforeEach(() => {
            visitor = new ODataFilterVisitor<ItemType>();
        });

        it('should handle in filter with string values', () => {
            const filter: InFilter = {
                field: 'status',
                operator: 'in',
                values: ['active', 'pending'],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe("status in ('active', 'pending')");
        });

        it('should handle in filter with number values', () => {
            const filter: InFilter = {
                field: 'age',
                operator: 'in',
                values: [18, 21, 65],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe('age in (18, 21, 65)');
        });

        it('should escape single quotes in string values', () => {
            const filter: InFilter = {
                field: 'name',
                operator: 'in',
                values: ["O'Reilly", "McDonald's"],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe("name in ('O''Reilly', 'McDonald''s')");
        });

        it('should handle null values', () => {
            const filter: InFilter = {
                field: 'status',
                operator: 'in',
                values: ['active', null],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe("status in ('active', null)");
        });

        it('should handle negative numbers', () => {
            const filter: InFilter = {
                field: 'age',
                operator: 'in',
                values: [-1, 0, 1],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe('age in (-1, 0, 1)');
        });
    });

    describe('visitInFilter - Legacy OData 4.0 syntax', () => {
        let visitor: ODataFilterVisitor<ItemType>;

        beforeEach(() => {
            visitor = new ODataFilterVisitor<ItemType>({ legacyInOperator: true });
        });

        it('should use or fallback for string values', () => {
            const filter: InFilter = {
                field: 'status',
                operator: 'in',
                values: ['active', 'pending'],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe("(status eq 'active' or status eq 'pending')");
        });

        it('should use or fallback for number values', () => {
            const filter: InFilter = {
                field: 'age',
                operator: 'in',
                values: [18, 21],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe('(age eq 18 or age eq 21)');
        });

        it('should escape single quotes in legacy mode', () => {
            const filter: InFilter = {
                field: 'name',
                operator: 'in',
                values: ["O'Reilly"],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe("(name eq 'O''Reilly')");
        });

        it('should handle null in legacy mode', () => {
            const filter: InFilter = {
                field: 'status',
                operator: 'in',
                values: ['active', null],
            };

            const result = visitor.visitInFilter(filter);

            expect(result).toBe("(status eq 'active' or status eq null)");
        });
    });
});

describe('ODataFilterVisitor with not operator', () => {
    type ItemType = {
        name: string;
        age: number;
        isActive: boolean;
    };

    let visitor: ODataFilterVisitor<ItemType>;

    beforeEach(() => {
        visitor = new ODataFilterVisitor<ItemType>();
    });

    it('should negate a simple filter', () => {
        const filter: NegatedFilter<ItemType> = {
            type: 'not',
            filter: { field: 'name', operator: 'eq', value: 'John' },
        };

        const result = visitor.visitNegatedFilter(filter);

        expect(result).toBe("not (name eq 'John')");
    });

    it('should negate a combined filter', () => {
        const filter: NegatedFilter<ItemType> = {
            type: 'not',
            filter: {
                logic: 'and',
                filters: [
                    { field: 'name', operator: 'eq', value: 'John' },
                    { field: 'age', operator: 'gt', value: 18 },
                ],
            },
        };

        const result = visitor.visitNegatedFilter(filter);

        expect(result).toBe("not ((name eq 'John' and age gt 18))");
    });

    it('should negate an in filter', () => {
        const filter: NegatedFilter<ItemType> = {
            type: 'not',
            filter: {
                field: 'name',
                operator: 'in',
                values: ['John', 'Jane'],
            },
        };

        const result = visitor.visitNegatedFilter(filter);

        expect(result).toBe("not (name in ('John', 'Jane'))");
    });

    it('should negate a contains filter', () => {
        const filter: NegatedFilter<ItemType> = {
            type: 'not',
            filter: {
                field: 'name',
                function: { type: 'contains', value: 'test' },
                operator: 'eq',
                value: true,
            },
        };

        const result = visitor.visitNegatedFilter(filter);

        expect(result).toBe("not (contains(name, 'test'))");
    });

    it('should handle double negation', () => {
        const filter: NegatedFilter<ItemType> = {
            type: 'not',
            filter: {
                type: 'not',
                filter: { field: 'isActive', operator: 'eq', value: true },
            },
        };

        const result = visitor.visitNegatedFilter(filter);

        expect(result).toBe('not (not (isActive eq true))');
    });

    it('should negate a has filter', () => {
        const filter: NegatedFilter<ItemType> = {
            type: 'not',
            filter: {
                field: 'name',
                operator: 'has',
                value: "Sales.Color'Yellow'",
            },
        };

        const result = visitor.visitNegatedFilter(filter);

        expect(result).toBe("not (name has Sales.Color'Yellow')");
    });
});

describe('ODataFilterVisitor with has operator', () => {
    type ItemType = {
        style: string;
        color: string;
        permissions: string;
    };

    let visitor: ODataFilterVisitor<ItemType>;

    beforeEach(() => {
        visitor = new ODataFilterVisitor<ItemType>();
    });

    it('should handle has filter with namespace-qualified enum literal', () => {
        const filter: HasFilter<ItemType> = {
            field: 'style',
            operator: 'has',
            value: "Sales.Color'Yellow'",
        };

        const result = visitor.visitHasFilter(filter);

        expect(result).toBe("style has Sales.Color'Yellow'");
    });

    it('should pass value through unchanged (raw passthrough)', () => {
        const filter: HasFilter<ItemType> = {
            field: 'permissions',
            operator: 'has',
            value: "Namespace.Permission'Read,Write'",
        };

        const result = visitor.visitHasFilter(filter);

        expect(result).toBe("permissions has Namespace.Permission'Read,Write'");
    });

    it('should handle simple enum values', () => {
        const filter: HasFilter<ItemType> = {
            field: 'color',
            operator: 'has',
            value: 'Red',
        };

        const result = visitor.visitHasFilter(filter);

        expect(result).toBe('color has Red');
    });

    it('should handle has filter in combined filter', () => {
        const filter: CombinedFilter<ItemType> = {
            logic: 'and',
            filters: [
                {
                    field: 'style',
                    operator: 'has',
                    value: "Sales.Color'Yellow'",
                },
                {
                    field: 'permissions',
                    operator: 'has',
                    value: "Namespace.Permission'Read'",
                },
            ],
        };

        const result = visitor.visitCombinedFilter(filter);

        expect(result).toBe(
            "(style has Sales.Color'Yellow' and permissions has Namespace.Permission'Read')",
        );
    });

    it('should handle has filter combined with basic filter', () => {
        const filter: CombinedFilter<ItemType> = {
            logic: 'or',
            filters: [
                {
                    field: 'color',
                    operator: 'eq',
                    value: 'Blue',
                },
                {
                    field: 'style',
                    operator: 'has',
                    value: "Sales.Color'Yellow'",
                },
            ],
        };

        const result = visitor.visitCombinedFilter(filter);

        expect(result).toBe("(color eq 'Blue' or style has Sales.Color'Yellow')");
    });
});

describe('ODataFilterVisitor Apostrophe Escaping', () => {
    type TestType = {
        name: string;
        description: string;
    };

    let visitor: ODataFilterVisitor<TestType>;

    beforeEach(() => {
        visitor = new ODataFilterVisitor<TestType>();
    });

    it('should escape single quotes in basic string filter', () => {
        const filter: QueryFilter<TestType> = {
            field: 'name',
            operator: 'eq',
            value: "O'Brien",
        };

        const result = visitor.visitBasicFilter(filter);
        expect(result).toBe("name eq 'O''Brien'");
    });

    it('should escape multiple apostrophes', () => {
        const filter: QueryFilter<TestType> = {
            field: 'name',
            operator: 'eq',
            value: "It's John's book",
        };

        const result = visitor.visitBasicFilter(filter);
        expect(result).toBe("name eq 'It''s John''s book'");
    });

    it('should escape apostrophes in contains() function', () => {
        const filter: QueryFilter<TestType> = {
            field: 'name',
            operator: 'eq',
            value: true,
            function: { type: 'contains', value: "O'Reilly" },
        };

        const result = visitor.visitBasicFilter(filter);
        expect(result).toBe("contains(name, 'O''Reilly')");
    });

    it('should escape apostrophes in startswith() function', () => {
        const filter: QueryFilter<TestType> = {
            field: 'name',
            operator: 'eq',
            value: true,
            function: { type: 'startswith', value: "McDonald's" },
        };

        const result = visitor.visitBasicFilter(filter);
        expect(result).toBe("startswith(name, 'McDonald''s')");
    });

    it('should escape apostrophes in endswith() function', () => {
        const filter: QueryFilter<TestType> = {
            field: 'name',
            operator: 'eq',
            value: true,
            function: { type: 'endswith', value: "test's" },
        };

        const result = visitor.visitBasicFilter(filter);
        expect(result).toBe("endswith(name, 'test''s')");
    });

    it('should escape apostrophes in concat() function', () => {
        const filter: QueryFilter<TestType> = {
            field: 'name',
            operator: 'eq',
            value: 'result',
            function: { type: 'concat', values: ["John's", "book"] },
        };

        const result = visitor.visitBasicFilter(filter);
        expect(result).toBe("concat(name, 'John''s', 'book') eq 'result'");
    });

    it('should escape apostrophes in combined filter', () => {
        const filter: CombinedFilter<TestType> = {
            logic: 'or',
            filters: [
                { field: 'name', operator: 'eq', value: "O'Brien" },
                { field: 'name', operator: 'eq', value: "O'Reilly" },
            ],
        };

        const result = visitor.visitCombinedFilter(filter);
        expect(result).toBe("(name eq 'O''Brien' or name eq 'O''Reilly')");
    });
});

describe('ODataFilterVisitor Error Handling', () => {
    type TestType = {
        name: string;
        count: number;
        createdAt: Date;
        isActive: boolean;
    };

    let visitor: ODataFilterVisitor<TestType>;

    beforeEach(() => {
        visitor = new ODataFilterVisitor<TestType>();
    });

    it('should throw on unsupported value type', () => {
        const filter = {
            field: 'name',
            operator: 'eq',
            value: { invalid: 'object' },
        } as unknown as QueryFilter<TestType>;

        expect(() => visitor.visitBasicFilter(filter)).toThrow(
            'Unsupported value type',
        );
    });

    it('should throw on invalid operator for type', () => {
        const filter = {
            field: 'name',
            operator: 'invalidOp',
            value: 'test',
        } as unknown as QueryFilter<TestType>;

        expect(() => visitor.visitBasicFilter(filter)).toThrow(
            'Invalid operator',
        );
    });

    it('should format Date values correctly', () => {
        const date = new Date('2024-01-15T10:30:00.000Z');
        const filter: QueryFilter<TestType> = {
            field: 'createdAt',
            operator: 'eq',
            value: date,
        };

        const result = visitor.visitBasicFilter(filter);
        expect(result).toBe('createdAt eq 2024-01-15T10:30:00.000Z');
    });

    it('should handle Date in combined filter', () => {
        const date = new Date('2024-06-01T00:00:00.000Z');
        const filter: CombinedFilter<TestType> = {
            logic: 'and',
            filters: [
                {
                    field: 'createdAt',
                    operator: 'gt',
                    value: date,
                },
                {
                    field: 'isActive',
                    operator: 'eq',
                    value: true,
                },
            ],
        };

        const result = visitor.visitCombinedFilter(filter);
        expect(result).toBe(
            '(createdAt gt 2024-06-01T00:00:00.000Z and isActive eq true)',
        );
    });
});
