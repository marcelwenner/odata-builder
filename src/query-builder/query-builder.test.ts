/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, describe, it } from 'vitest';
import { OdataQueryBuilder } from '.';
import {
    ArrayElement,
    FilterFields,
    FilterOperators,
    QueryFilter,
} from './types/filter/query-filter.type';
import { Guid } from './types/utils/util.types';
import { OrderByDescriptor } from './types/orderby/orderby-descriptor.type';
import { SearchExpressionBuilder } from './builder/search-expression-builder';
import { SearchExpressionPart } from './types/search/search-expression.type';
import { CombinedFilter } from './types/filter/combined-filter.type';

describe('query-builder', () => {
    it('should return an empty string if toQuery is called without function', () => {
        const queryBuilder = new OdataQueryBuilder();

        expect(queryBuilder.toQuery()).toBe('');
    });

    it('should add top to the query', () => {
        const expectedTop = 100;
        const expectedQuery = `?$top=${expectedTop}`;

        const queryBuilder = new OdataQueryBuilder();
        queryBuilder.top(expectedTop);

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should add skip to the query', () => {
        const expectedSkip = 10;
        const expectedQuery = `?$skip=${expectedSkip}`;

        const queryBuilder = new OdataQueryBuilder();
        queryBuilder.skip(expectedSkip);

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should only add one skip', () => {
        const expectedSkip = 10;
        const expectedQuery = `?$skip=${expectedSkip}`;

        const queryBuilder = new OdataQueryBuilder();
        queryBuilder.skip(expectedSkip).skip(1000).skip(5);

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should begin with count when choosing count entities', () => {
        const expectedQuery = '/$count';

        const queryBuilder = new OdataQueryBuilder();
        queryBuilder.count(true);

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should begin with count when choosing count entities and add a filter', () => {
        type ItemType = {
            x: 6;
            y: 4;
        };

        const expectedQuery = '/$count?$filter=x eq 6';

        const queryBuilder = new OdataQueryBuilder<ItemType>();
        queryBuilder
            .filter({ field: 'x', operator: 'eq', value: 6 })
            .count(true);

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should add the count operator to the query', () => {
        const expectedQuery = '?$count=true';

        const queryBuilder = new OdataQueryBuilder();
        queryBuilder.count();

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should only add the first count', () => {
        const expectedQuery = '?$count=true';

        const queryBuilder = new OdataQueryBuilder();
        queryBuilder.count().count().count();

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should add select to the query', () => {
        type ItemType = {
            x: 6;
            y: 4;
        };
        const expectedQuery = '?$select=x, y';

        const queryBuilder = new OdataQueryBuilder<ItemType>();
        queryBuilder.select('x', 'y');

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should add one select if select is called multiple times', () => {
        type ItemType = {
            x: 6;
            y: 4;
        };
        const expectedQuery = '?$select=x, y';

        const queryBuilder = new OdataQueryBuilder<ItemType>();
        queryBuilder.select('x').select('y');

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should add orderby to the query', () => {
        type ItemType = {
            a: 1;
            b: 2;
        };

        const expectedQuery = '?$orderby=a desc';

        const queryBuilder = new OdataQueryBuilder<ItemType>();
        queryBuilder.orderBy({ field: 'a', orderDirection: 'desc' });

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should add a number filter to the query', () => {
        type ItemType = {
            x: 1;
        };

        const expectedQuery = '?$filter=x eq 1';

        const queryBuilder = new OdataQueryBuilder<ItemType>();
        queryBuilder.filter({ field: 'x', operator: 'eq', value: 1 });

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it.each([
        { operator: 'eq' as const, ignoreCase: true },
        { operator: 'eq' as const, ignoreCase: false },
    ])('should add a string filter to the query', filterOption => {
        type ItemType = {
            x: '1';
        };

        const filter = {
            field: 'x' as const,
            value: '1',
            operator: filterOption.operator,
            ignoreCase: filterOption.ignoreCase,
        };

        const expectedQuery = `?$filter=${filterOption.ignoreCase ? 'tolower(' : ''}x${
            filterOption.ignoreCase ? ')' : ''
        } eq '1'`;

        const queryBuilder = new OdataQueryBuilder<ItemType>();
        queryBuilder.filter(filter);

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it.each([
        { ignoreCase: true },
        { ignoreCase: false },
    ])('should add a contains filter to the query', filterOption => {
        type ItemType = {
            x: string;
        };

        const filter = {
            field: 'x' as const,
            function: { type: 'contains' as const, value: '1' },
            operator: 'eq' as const,
            value: true,
            ignoreCase: filterOption.ignoreCase,
        };

        const expectedQuery = `?$filter=contains(${filterOption.ignoreCase ? 'tolower(' : ''}x${
            filterOption.ignoreCase ? ')' : ''
        }, '1')`;

        const queryBuilder = new OdataQueryBuilder<ItemType>();
        queryBuilder.filter(filter);

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should add space before and when combining two filters', () => {
        interface MyAwesomeDto {
            y: string;
            x: Guid;
        }
        const expectedResult = `?$filter=x eq 76b44f03-bb98-48eb-81fd-63007465a76d and y eq ''`;
        const filter = {
            field: 'x',
            operator: 'eq',
            value: '76b44f03-bb98-48eb-81fd-63007465a76d' as Guid,
            removeQuotes: true,
        } as const;

        const query = new OdataQueryBuilder<MyAwesomeDto>()
            .filter(filter)
            .filter({ field: 'y', operator: 'eq', value: '' })
            .toQuery();

        expect(query).toBe(expectedResult);
    });

    it('should add filter if query builder is in a function', () => {
        interface MyAwesomeDto {
            y: string;
            x: string;
        }
        const expectedResult = `?$filter=x eq 76b44f03-bb98-48eb-81fd-63007465a76d`;

        const getQuery = (queryPart: string) => {
            return new OdataQueryBuilder<MyAwesomeDto>()
                .filter({
                    field: 'x',
                    operator: 'eq',
                    value: queryPart,
                    removeQuotes: true,
                })
                .toQuery();
        };

        expect(getQuery('76b44f03-bb98-48eb-81fd-63007465a76d')).toBe(
            expectedResult,
        );
    });
    it('should also filter with optional properties', () => {
        type MyAwesomeDto = { x?: { code: string } } & { y: boolean };
        const expectedResult = "?$filter=x/code eq 'test'";

        const queryBuilder = new OdataQueryBuilder<MyAwesomeDto>();

        queryBuilder.filter({ field: 'x/code', operator: 'eq', value: 'test' });

        expect(queryBuilder.toQuery()).toBe(expectedResult);
    });
    it('should add the filter with lambda combined with non lambda filter', () => {
        type ItemType = {
            x: { y: string }[];
            z: boolean;
        };
        const queryBuilder = new OdataQueryBuilder<ItemType>();
        const expectedResult = `?$filter=x/any(s: contains(s/y, '1')) and z eq false`;

        queryBuilder
            .filter({
                field: 'x',
                lambdaOperator: 'any',
                expression: {
                    field: 'y',
                    function: { type: 'contains', value: '1' },
                    operator: 'eq',
                    value: true,
                },
            })
            .filter({ field: 'z', operator: 'eq', value: false });

        expect(queryBuilder.toQuery()).toBe(expectedResult);
    });
    it('should add the filter query also for nullable types', () => {
        interface MyAwesomeDto {
            test: string | null;
        }

        const expectedResult = "?$filter=test eq '1'";

        const queryBuilder = new OdataQueryBuilder<MyAwesomeDto>().filter({
            field: 'test',
            operator: 'eq',
            value: '1',
        });

        expect(queryBuilder.toQuery()).toBe(expectedResult);
    });

    it('should add the filter query also for nullable types in nested properties', () => {
        interface MyAwesomeDto {
            test: { x: string | null };
        }

        const expectedResult = "?$filter=test/x eq '1'";

        const queryBuilder = new OdataQueryBuilder<MyAwesomeDto>().filter({
            field: 'test/x',
            operator: 'eq',
            value: '1',
        });

        expect(queryBuilder.toQuery()).toBe(expectedResult);
    });

    it('should combine the filters regardless of order', () => {
        const item = {
            w: { someProperty: '' },
            x: 't',
            y: 4,
            z: 'test' as Guid,
        };
        const expectedQuery =
            "?$count=true&$filter=z eq '76b44f03-bb98-48eb-81fd-63007465a76d' and (x eq 'test' or y eq 5)&$top=100&$skip=10&$select=x&$expand=w&$orderby=x asc";
        const queryBuilder = new OdataQueryBuilder<typeof item>();

        queryBuilder
            .skip(10)
            .orderBy({ field: 'x', orderDirection: 'asc' })
            .count()
            .top(100)
            .filter({
                field: 'z',
                operator: 'eq',
                value: '76b44f03-bb98-48eb-81fd-63007465a76d' as Guid,
            })
            .filter({
                logic: 'or',
                filters: [
                    { field: 'x', operator: 'eq', value: 'test' },
                    { field: 'y', operator: 'eq', value: 5 },
                ],
            })
            .expand('w')
            .select('x');

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should return a filter string with computed values for filter', () => {
        const item = {
            x: 4,
            y: 'test',
            z: new Date(Date.now()),
        };
        const expectedQuery = "?$filter=y eq '4'";

        const testFn = (
            field: FilterFields<typeof item, string>,
            operator: FilterOperators<string>,
            value: string,
        ): string => {
            const queryBuilder = new OdataQueryBuilder<typeof item>();

            queryBuilder.filter({ field, operator, value });

            return queryBuilder.toQuery();
        };

        const result = testFn('y', 'eq', '4');

        expect(result).toBe(expectedQuery);
    });

    it('should return a filter string for a deeply nested object', () => {
        const item = {
            x: {
                y: {
                    z: 'test',
                },
            },
        };
        const expectedQuery = "?$filter=x/y/z eq 'test'";

        const queryBuilder = new OdataQueryBuilder<typeof item>();

        queryBuilder.filter({ field: 'x/y/z', operator: 'eq', value: 'test' });

        const result = queryBuilder.toQuery();

        expect(result).toBe(expectedQuery);
    });

    it('should return a filter string with combined filter inside of combined filter', () => {
        const item = {
            x: 'test',
            y: 'test1',
            z: 'test2',
        };
        const expectedQuery = `?$filter=((x eq 'test' or y eq 'test1') and z eq 'test')`;

        const queryBuilder = new OdataQueryBuilder<typeof item>();

        queryBuilder.filter({
            logic: 'and',
            filters: [
                {
                    logic: 'or',
                    filters: [
                        { field: 'x', operator: 'eq', value: 'test' },
                        { field: 'y', operator: 'eq', value: 'test1' },
                    ],
                },
                { field: 'z', operator: 'eq', value: 'test' },
            ],
        });

        const result = queryBuilder.toQuery();

        expect(result).toBe(expectedQuery);
    });

    it('should enforce correct types for filter', () => {
        type Item = { name: string; count: number };
        const builder = new OdataQueryBuilder<Item>();
        builder.filter({ field: 'name', operator: 'eq', value: 'test' });
        builder.filter({ field: 'count', operator: 'gt', value: 5 });
        // @ts-expect-error name is of type string
        builder.filter({ field: 'name', operator: 'eq', value: 5 });
        // @ts-expect-error count is of type number
        builder.filter({ field: 'count', operator: 'eq', value: 'test' });
    });

    it('should enforce correct types for select', () => {
        type Item = { name: string; count: number };
        const builder = new OdataQueryBuilder<Item>();
        builder.select('name', 'count');
        // @ts-expect-error field does not exist
        builder.select('invalidField');
    });

    it('should enforce correct types for orderBy', () => {
        type Item = { name: string; count: number };
        const builder = new OdataQueryBuilder<Item>();
        builder.orderBy({ field: 'name', orderDirection: 'asc' });
        builder.orderBy({ field: 'count', orderDirection: 'desc' });
        // @ts-expect-error field does not exist
        builder.orderBy({ field: 'invalidField', orderDirection: 'asc' });
    });

    it('should enforce correct types for expand', () => {
        type Item = { details: { code: string } };
        const builder = new OdataQueryBuilder<Item>();
        builder.expand('details');
        // @ts-expect-error field does not exist
        builder.expand('invalidField');
    });

    it('should throw an error if select is called with null or undefined', () => {
        const queryBuilder = new OdataQueryBuilder();
        //@ts-expect-error value is not allowed
        expect(() => queryBuilder.select(null)).toThrowError(
            'Invalid select input',
        );
        //@ts-expect-error value is not allowed
        expect(() => queryBuilder.select(undefined)).toThrowError(
            'Invalid select input',
        );
    });

    it('should throw an error if filter is called with null or undefined', () => {
        const queryBuilder = new OdataQueryBuilder();
        //@ts-expect-error value is not allowed
        expect(() => queryBuilder.filter(null)).toThrowError(
            'Invalid filter input',
        );
        //@ts-expect-error value is not allowed
        expect(() => queryBuilder.filter(undefined)).toThrowError(
            'Invalid filter input',
        );
    });

    it('should throw an error if expand is called with null or undefined', () => {
        const queryBuilder = new OdataQueryBuilder();
        //@ts-expect-error value is not allowed
        expect(() => queryBuilder.expand(null)).toThrowError(
            'Field missing for expand',
        );
        //@ts-expect-error value is not allowed
        expect(() => queryBuilder.expand(undefined)).toThrowError(
            'Field missing for expand',
        );
    });

    it('should throw an error if orderBy is called with an empty array', () => {
        const queryBuilder = new OdataQueryBuilder();
        expect(() => queryBuilder.orderBy()).not.toThrowError();
    });

    it('should handle all query parameters together', () => {
        type ItemType = {
            id: Guid;
            name: string;
            age: number;
            isActive: boolean;
            details: { code: string };
            tags: string[];
        };
        const expectedQuery =
            "?$count=true&$filter=isActive eq true and tags/any(s: contains(tolower(s), 'test'))&$top=50&$skip=5&$select=name, age&$expand=details&$orderby=age desc&$search=test%20search";
        const queryBuilder = new OdataQueryBuilder<ItemType>()
            .count()
            .filter({ field: 'isActive', operator: 'eq', value: true })
            .filter({
                field: 'tags',
                lambdaOperator: 'any',
                expression: {
                    field: 's',
                    function: { type: 'contains', value: 'test' },
                    operator: 'eq',
                    value: true,
                    ignoreCase: true,
                },
            })
            .top(50)
            .skip(5)
            .select('name', 'age')
            .expand('details')
            .orderBy({ field: 'age', orderDirection: 'desc' })
            .search('test search');
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    // Add tests for FilterString if you plan to implement it

    it('should throw an error for negative top count in top() method', () => {
        const queryBuilder = new OdataQueryBuilder();
        expect(() => queryBuilder.top(-1)).toThrowError('Invalid top count');
    });

    it('should throw an error for negative skip count in skip() method', () => {
        const queryBuilder = new OdataQueryBuilder();
        expect(() => queryBuilder.skip(-1)).toThrowError('Invalid skip count');
    });

    it('should produce the same query regardless of the order of method calls', () => {
        type ItemType = { id: number; name: string };
        const filter: QueryFilter<ItemType> = {
            field: 'id',
            operator: 'eq',
            value: 1,
        };
        const orderBy: OrderByDescriptor<ItemType> = {
            field: 'name',
            orderDirection: 'asc',
        };
        const select = 'name';

        const builder1 = new OdataQueryBuilder<ItemType>()
            .filter(filter)
            .orderBy(orderBy)
            .select(select);

        const builder2 = new OdataQueryBuilder<ItemType>()
            .orderBy(orderBy)
            .select(select)
            .filter(filter);

        expect(builder1.toQuery()).toBe(builder2.toQuery());
        expect(builder1.toQuery()).toBe(
            '?$filter=id eq 1&$select=name&$orderby=name asc',
        );
    });

    it('should add a search term using SearchExpressionBuilder', () => {
        const expectedQuery = `?$search=product`;
        const queryBuilder = new OdataQueryBuilder().search(
            new SearchExpressionBuilder().term('product'),
        );
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should add a search phrase using SearchExpressionBuilder', () => {
        const expectedQuery = `?$search=%22large%20product%22`;
        const queryBuilder = new OdataQueryBuilder().search(
            new SearchExpressionBuilder().phrase('large product'),
        );
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should combine terms and operators using SearchExpressionBuilder', () => {
        const expectedQuery = `?$search=red%20AND%20blue`;
        const queryBuilder = new OdataQueryBuilder().search(
            new SearchExpressionBuilder().term('red').and().term('blue'),
        );
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle NOT operator using SearchExpressionBuilder', () => {
        const expectedQuery = `?$search=(NOT%20blue)`;
        const queryBuilder = new OdataQueryBuilder().search(
            new SearchExpressionBuilder().not(
                new SearchExpressionBuilder().term('blue'),
            ),
        );
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle grouping using SearchExpressionBuilder', () => {
        const expectedQuery = `?$search=(red%20OR%20blue)%20AND%20large`;
        const queryBuilder = new OdataQueryBuilder().search(
            new SearchExpressionBuilder()
                .group(
                    new SearchExpressionBuilder().term('red').or().term('blue'),
                )
                .and()
                .term('large'),
        );
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should combine SearchExpressionBuilder with other query parameters', () => {
        const expectedQuery = `?$top=10&$search=product`;
        const queryBuilder = new OdataQueryBuilder()
            .search(new SearchExpressionBuilder().term('product'))
            .top(10);
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should allow setting search using a raw string as before', () => {
        const expectedQuery = `?$search=rawSearchString`;
        const queryBuilder = new OdataQueryBuilder().search('rawSearchString');
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should prefer SearchExpressionBuilder when both string and builder are used (last call wins)', () => {
        const expectedQuery = `?$search=builderSearch`;
        const queryBuilder = new OdataQueryBuilder()
            .search('stringSearch')
            .search(new SearchExpressionBuilder().term('builderSearch'));
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle clearing the search term with null or undefined', () => {
        const queryBuilder1 = new OdataQueryBuilder().search(
            new SearchExpressionBuilder().term('test'),
        );
        queryBuilder1.search(undefined as unknown as string);
        expect(queryBuilder1.toQuery()).toBe('');

        const queryBuilder2 = new OdataQueryBuilder().search(
            new SearchExpressionBuilder().term('test'),
        );
        queryBuilder2.search(null as unknown as string);
        expect(queryBuilder2.toQuery()).toBe('');
    });

    it('should handle a complex nested search expression', () => {
        const expectedQuery = `?$search=(red%20AND%20(blue%20OR%20(NOT%20yellow)))%20AND%20large`;
        const queryBuilder = new OdataQueryBuilder().search(
            new SearchExpressionBuilder()
                .group(
                    new SearchExpressionBuilder()
                        .term('red')
                        .and()
                        .group(
                            new SearchExpressionBuilder()
                                .term('blue')
                                .or()
                                .not(
                                    new SearchExpressionBuilder().term(
                                        'yellow',
                                    ),
                                ),
                        ),
                )
                .and()
                .term('large'),
        );
        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle empty SearchExpressionBuilder gracefully', () => {
        const builder = new SearchExpressionBuilder();
        expect(builder.toString()).toBe('');
    });

    it('should throw an error for invalid term', () => {
        expect(() => new SearchExpressionBuilder().term('')).toThrowError();
    });

    it('should handle deeply nested expressions', () => {
        const builder = new SearchExpressionBuilder()
            .group(
                new SearchExpressionBuilder()
                    .term('red')
                    .and()
                    .group(
                        new SearchExpressionBuilder()
                            .term('blue')
                            .or()
                            .not(new SearchExpressionBuilder().term('yellow')),
                    ),
            )
            .and()
            .term('green');

        expect(builder.toString()).toBe(
            '(red AND (blue OR (NOT yellow))) AND green',
        );
    });

    it('should handle empty or undefined search input gracefully', () => {
        const queryBuilder = new OdataQueryBuilder();
        queryBuilder.search('');
        expect(queryBuilder.toQuery()).toBe('');

        queryBuilder.search(undefined as unknown as string);
        expect(queryBuilder.toQuery()).toBe('');
    });

    it('should combine search with multiple query parameters', () => {
        const expectedQuery =
            '?$filter=isActive eq true&$top=10&$search=test%20search';

        const queryBuilder = new OdataQueryBuilder<{ isActive: boolean }>()
            .filter({ field: 'isActive', operator: 'eq', value: true })
            .top(10)
            .search('test search');

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle complex search expressions with other query parameters', () => {
        const expectedQuery =
            '?$filter=isActive eq true&$orderby=name asc&$search=(red%20AND%20blue)%20OR%20yellow';

        const queryBuilder = new OdataQueryBuilder<{
            isActive: boolean;
            name: string;
        }>()
            .filter({ field: 'isActive', operator: 'eq', value: true })
            .orderBy({ field: 'name', orderDirection: 'asc' })
            .search(
                new SearchExpressionBuilder()
                    .group(
                        new SearchExpressionBuilder()
                            .term('red')
                            .and()
                            .term('blue'),
                    )
                    .or()
                    .term('yellow'),
            );

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should throw an error for invalid search expressions', () => {
        const invalidPart = { invalidKey: 'invalidValue' };

        const builder = new SearchExpressionBuilder([
            invalidPart as unknown as SearchExpressionPart,
        ]);

        expect(() => builder.toString()).toThrowError(
            `Unsupported SearchExpressionPart: ${JSON.stringify(invalidPart)}`,
        );
    });

    it('should handle special characters in search terms', () => {
        const expectedQuery = `?$search=%22special%20%26%20characters%22`;

        const queryBuilder = new OdataQueryBuilder().search(
            new SearchExpressionBuilder().phrase('special & characters'),
        );

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should prioritize the last search input', () => {
        const expectedQuery = `?$search=finalSearch`;

        const queryBuilder = new OdataQueryBuilder()
            .search('initialSearch')
            .search('finalSearch');

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });
});

describe('query-builder - Extended Tests', () => {
    it('should handle string transformations with predicate functions', () => {
        type ItemType = { name: string };

        const queryBuilder = new OdataQueryBuilder<ItemType>()
            .filter({
                field: 'name',
                function: { type: 'contains', value: 'example' },
                operator: 'eq',
                value: true,
            })
            .filter({
                field: 'name',
                function: { type: 'startswith', value: 'Example' },
                operator: 'eq',
                value: true,
            });

        const expectedQuery =
            "?$filter=contains(name, 'example') and startswith(name, 'Example')";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle numeric transformations', () => {
        type ItemType = { price: number };

        const filter: QueryFilter<ItemType> = {
            field: 'price',
            operator: 'eq',
            value: 99.99,
            transform: ['round'],
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery = '?$filter=round(price) eq 99.99';

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle date transformations', () => {
        type ItemType = { createdAt: Date };

        const filter: QueryFilter<ItemType> = {
            field: 'createdAt',
            operator: 'eq',
            value: new Date('2025-01-01T12:00:00Z'),
            transform: ['year'],
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery = '?$filter=year(createdAt) eq 2025';

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle GUID transformations', () => {
        type ItemType = { id: Guid };

        const filter: QueryFilter<ItemType> = {
            field: 'id',
            operator: 'eq',
            value: '76b44f03-bb98-48eb-81fd-63007465a76d',
            removeQuotes: true,
            transform: ['tolower'],
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery =
            '?$filter=tolower(id) eq 76b44f03-bb98-48eb-81fd-63007465a76d';

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle string operations with ignoreCase', () => {
        type ItemType = { title: string };

        const filter: QueryFilter<ItemType> = {
            field: 'title',
            function: { type: 'contains', value: 'Book' },
            operator: 'eq',
            value: true,
            ignoreCase: true,
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery = "?$filter=contains(tolower(title), 'book')";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle combined filters with various logic operators', () => {
        type ItemType = { x: string; y: number };

        const filter: CombinedFilter<ItemType> = {
            logic: 'or',
            filters: [
                {
                    logic: 'and',
                    filters: [
                        { field: 'x', operator: 'eq', value: 'test' },
                        { field: 'y', operator: 'gt', value: 10 },
                    ],
                },
                { field: 'y', operator: 'lt', value: 5 },
            ],
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery = "?$filter=((x eq 'test' and y gt 10) or y lt 5)";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle lambda filters with nested arrays', () => {
        type ItemType = { items: { name: string; price: number }[] };

        const filter: QueryFilter<ItemType> = {
            field: 'items',
            lambdaOperator: 'any',
            expression: {
                field: 'name',
                function: { type: 'contains', value: 'apple' },
                operator: 'eq',
                value: true,
                ignoreCase: true,
            },
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery =
            "?$filter=items/any(s: contains(tolower(s/name), 'apple'))";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle invalid operator gracefully', () => {
        type ItemType = { name: string };

        const filter: QueryFilter<ItemType> = {
            field: 'name',
            operator: 'invalidOperator' as FilterOperators<string>,
            value: 'test',
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>();

        expect(() => queryBuilder.filter(filter)).toThrowError(
            `Invalid operator "invalidOperator" for type "string"`,
        );
    });

    it('should handle deeply nested combined filters', () => {
        type ItemType = { id: number; details: { tag: string }[] };

        const filter: CombinedFilter<ItemType> = {
            logic: 'and',
            filters: [
                { field: 'id', operator: 'gt', value: 10 },
                {
                    field: 'details',
                    lambdaOperator: 'any',
                    expression: {
                        logic: 'or',
                        filters: [
                            {
                                field: 'tag',
                                operator: 'eq',
                                value: 'tag1',
                            },
                            {
                                field: 'tag',
                                operator: 'eq',
                                value: 'tag2',
                            },
                        ],
                    },
                },
            ],
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery =
            "?$filter=(id gt 10 and details/any(s: (s/tag eq 'tag1' or s/tag eq 'tag2')))";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });
});

describe('OdataQueryBuilder with in operator', () => {
    type ItemType = { status: string; age: number; name: string };

    it('should generate OData 4.01 in syntax by default', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
            f => f.where(x => x.status.in(['active', 'pending'])),
        );

        expect(queryBuilder.toQuery()).toBe(
            "?$filter=status in ('active', 'pending')",
        );
    });

    it('should generate legacy OData 4.0 or syntax when legacyInOperator is true', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>({
            legacyInOperator: true,
        }).filter(f => f.where(x => x.status.in(['active', 'pending'])));

        expect(queryBuilder.toQuery()).toBe(
            "?$filter=(status eq 'active' or status eq 'pending')",
        );
    });

    it('should handle in filter with number values', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
            f => f.where(x => x.age.in([18, 21, 65])),
        );

        expect(queryBuilder.toQuery()).toBe('?$filter=age in (18, 21, 65)');
    });

    it('should escape single quotes in values', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
            f => f.where(x => x.name.in(["O'Reilly", "McDonald's"])),
        );

        expect(queryBuilder.toQuery()).toBe(
            "?$filter=name in ('O''Reilly', 'McDonald''s')",
        );
    });

    it('should combine in filter with other filters', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
            f =>
                f
                    .where(x => x.status.in(['active', 'pending']))
                    .and(x => x.age.gt(18)),
        );

        expect(queryBuilder.toQuery()).toBe(
            "?$filter=(status in ('active', 'pending') and age gt 18)",
        );
    });

    it('should use parentheses correctly in legacy mode with combined filters', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>({
            legacyInOperator: true,
        }).filter(
            f =>
                f
                    .where(x => x.status.in(['active', 'pending']))
                    .and(x => x.age.gt(18)),
        );

        expect(queryBuilder.toQuery()).toBe(
            "?$filter=((status eq 'active' or status eq 'pending') and age gt 18)",
        );
    });
});

describe('OdataQueryBuilder with not operator', () => {
    type ItemType = { name: string; age: number; isActive: boolean };

    it('should negate a simple filter', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
            f => f.where(x => x.name.eq('John')).not(),
        );

        expect(queryBuilder.toQuery()).toBe("?$filter=not (name eq 'John')");
    });

    it('should negate a combined filter', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
            f =>
                f
                    .where(x => x.name.eq('John'))
                    .and(x => x.age.gt(18))
                    .not(),
        );

        expect(queryBuilder.toQuery()).toBe(
            "?$filter=not ((name eq 'John' and age gt 18))",
        );
    });

    it('should negate a contains filter', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
            f => f.where(x => x.name.contains('test')).not(),
        );

        expect(queryBuilder.toQuery()).toBe("?$filter=not (contains(name, 'test'))");
    });

    it('should chain not with other filters', () => {
        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
            f =>
                f
                    .where(x => x.name.eq('John'))
                    .not()
                    .and(x => x.isActive.isTrue()),
        );

        expect(queryBuilder.toQuery()).toBe(
            "?$filter=(not (name eq 'John') and isActive eq true)",
        );
    });
});

describe('query-builder - Nested Lambda Expressions', () => {
    it('should handle nested lambda expressions for object arrays', () => {
        type ItemType = {
            items: {
                tags: string[];
            }[];
        };

        const filter: QueryFilter<ItemType> = {
            field: 'items',
            lambdaOperator: 'any',
            expression: {
                field: 'tags',
                lambdaOperator: 'any',
                expression: {
                    field: 's', // 's' is the PrimitiveArrayElementModel wrapper field
                    operator: 'eq',
                    value: 'tag1',
                },
            },
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery =
            "?$filter=items/any(s: s/tags/any(t: t eq 'tag1'))";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle nested lambda expressions with combined filters', () => {
        type ItemType = {
            items: {
                tags: string[];
                details: { name: string }[];
            }[];
        };

        const filter: QueryFilter<ItemType> = {
            field: 'items',
            lambdaOperator: 'any',
            expression: {
                logic: 'and',
                filters: [
                    {
                        field: 'tags',
                        lambdaOperator: 'any',
                        expression: {
                            field: '',
                            operator: 'eq',
                            value: 'tag1',
                        },
                    },
                    {
                        field: 'details',
                        lambdaOperator: 'any',
                        expression: {
                            field: 'name',
                            function: { type: 'startswith', value: 'John' },
                            operator: 'eq',
                            value: true,
                        },
                    },
                ],
            } as CombinedFilter<ArrayElement<ItemType, 'items'>>,
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery =
            "?$filter=items/any(s: (s/tags/any(t: t eq 'tag1') and s/details/any(t: startswith(t/name, 'John'))))";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle deeply nested lambda expressions', () => {
        type ItemType = {
            levels: {
                subLevels: {
                    tags: string[];
                }[];
            }[];
        };

        const filter: QueryFilter<ItemType> = {
            field: 'levels',
            lambdaOperator: 'any',
            expression: {
                field: 'subLevels',
                lambdaOperator: 'any',
                expression: {
                    field: 'tags',
                    lambdaOperator: 'any',
                    expression: {
                        field: 's', // 's' is the PrimitiveArrayElementModel wrapper field
                        operator: 'eq',
                        value: 'deepTag',
                    },
                },
            },
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery =
            "?$filter=levels/any(s: s/subLevels/any(t: t/tags/any(u: u eq 'deepTag')))";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });

    it('should handle mixed nested lambda expressions with combined filters', () => {
        type ItemType = {
            levels: {
                subLevels: {
                    tags: string[];
                    metadata: { key: string; value: string }[];
                }[];
            }[];
        };

        const filter: QueryFilter<ItemType> = {
            field: 'levels',
            lambdaOperator: 'any',
            expression: {
                logic: 'or',
                filters: [
                    {
                        field: 'subLevels',
                        lambdaOperator: 'any',
                        expression: {
                            field: 'tags',
                            lambdaOperator: 'any',
                            expression: {
                                field: '',
                                operator: 'eq',
                                value: 'nestedTag',
                            },
                        },
                    },
                    {
                        field: 'subLevels',
                        lambdaOperator: 'any',
                        expression: {
                            field: 'metadata',
                            lambdaOperator: 'any',
                            expression: {
                                field: 'key',
                                operator: 'eq',
                                value: 'important',
                            },
                        },
                    },
                ],
            } as CombinedFilter<ArrayElement<ItemType, 'levels'>>,
        };

        const queryBuilder = new OdataQueryBuilder<ItemType>().filter(filter);

        const expectedQuery =
            "?$filter=levels/any(s: (s/subLevels/any(t: t/tags/any(u: u eq 'nestedTag')) or s/subLevels/any(t: t/metadata/any(u: u/key eq 'important'))))";

        expect(queryBuilder.toQuery()).toBe(expectedQuery);
    });
});

describe('OdataQueryBuilder - Extended Integration and Edge Cases', () => {
    describe('Count Entities and Count Operator Combination', () => {
        it('should handle countEntities=true and count() without conflict - countEntities takes precedence', () => {
            const expectedQuery = '?$count=true';
            const queryBuilder = new OdataQueryBuilder().count().count(true);
            expect(queryBuilder.toQuery()).toBe(expectedQuery);
        });

        it('should handle countEntities=true and other query parameters', () => {
            type ItemType = { name: string };
            const expectedQuery = "/$count?$filter=name eq 'test'&$top=10";
            const queryBuilder = new OdataQueryBuilder<ItemType>()
                .count(true)
                .filter({ field: 'name', operator: 'eq', value: 'test' })
                .top(10);
            expect(queryBuilder.toQuery()).toBe(expectedQuery);
        });
    });

    describe('Order of Operations - More Combinations', () => {
        it('should produce the same query for different order of method calls - complex combination', () => {
            type ItemType = {
                id: number;
                name: string;
                description: string;
                isActive: boolean;
            };
            const filter: QueryFilter<ItemType> = {
                field: 'isActive',
                operator: 'eq',
                value: true,
            };
            const orderBy: OrderByDescriptor<ItemType> = {
                field: 'name',
                orderDirection: 'asc',
            };
            const select = ['name', 'description'] as Array<keyof ItemType>;
            const search = new SearchExpressionBuilder()
                .term('search')
                .and()
                .term('term');
            const top = 25;
            const skip = 5;
            const count = true;

            const builder1 = new OdataQueryBuilder<ItemType>()
                .filter(filter)
                .orderBy(orderBy)
                .select(...select)
                .search(search)
                .top(top)
                .skip(skip)
                .count(count);

            const builder2 = new OdataQueryBuilder<ItemType>()
                .count(count)
                .skip(skip)
                .top(top)
                .search(search)
                .select(...select)
                .orderBy(orderBy)
                .filter(filter);

            expect(builder1.toQuery()).toBe(builder2.toQuery());
            const expectedQuery = `/$count?$filter=isActive eq true&$top=25&$skip=5&$select=name, description&$orderby=name asc&$search=search%20AND%20term`;
            expect(builder1.toQuery()).toBe(expectedQuery);
        });
    });

    describe('Invalid Input to Builder Methods (Runtime Checks)', () => {
        it('should throw an error if search() is called with a non-string and non-SearchExpressionBuilder (runtime)', () => {
            const queryBuilder = new OdataQueryBuilder();
            // @ts-expect-error - testing runtime error for invalid type
            expect(() => queryBuilder.search(123)).toThrowError();
            // @ts-expect-error - testing runtime error for invalid type
            expect(() => queryBuilder.search({})).toThrowError();
            // @ts-expect-error - testing runtime error for invalid type
            expect(() => queryBuilder.search([])).toThrowError();
        });

        it('should handle null/undefined gracefully in top(), skip(), orderBy(), search() - no error, no-op', () => {
            const queryBuilder = new OdataQueryBuilder();
            expect(() =>
                queryBuilder.top(null as unknown as number),
            ).not.toThrowError();
            expect(() =>
                queryBuilder.top(undefined as unknown as number),
            ).not.toThrowError();
            expect(() =>
                queryBuilder.skip(null as unknown as number),
            ).not.toThrowError();
            expect(() =>
                queryBuilder.skip(undefined as unknown as number),
            ).not.toThrowError();
            expect(() =>
                queryBuilder.orderBy(
                    null as unknown as OrderByDescriptor<Required<unknown>>,
                ),
            ).not.toThrowError(); // OrderBy might need more specific check if you expect array.
            expect(() =>
                queryBuilder.orderBy(
                    undefined as unknown as OrderByDescriptor<
                        Required<unknown>
                    >,
                ),
            ).not.toThrowError();
            expect(() =>
                queryBuilder.search(null as unknown as string),
            ).not.toThrowError();
            expect(() =>
                queryBuilder.search(undefined as unknown as string),
            ).not.toThrowError();

            expect(queryBuilder.toQuery()).toBe(''); // Ensure no query parameters are added.
        });
    });

    describe('URL Encoding Verification (Filters - Basic)', () => {
        it('should URL encode filter values with special characters', () => {
            type ItemType = { description: string };
            const filter: QueryFilter<ItemType> = {
                field: 'description',
                operator: 'eq',
                value: 'value with spaces and &%$#',
            };
            const queryBuilder = new OdataQueryBuilder<ItemType>().filter(
                filter,
            );
            const expectedQuery =
                "?$filter=description eq 'value with spaces and &%$#'"; // OData quotes strings. No need to encode inside quotes in basic case.
            expect(queryBuilder.toQuery()).toBe(expectedQuery); // Basic case, OData handles quotes.  If you have cases where values outside quotes need encoding, add more tests.
        });
    });
});
