/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from 'vitest';
import { toExpandQuery } from './expand-util';

describe('expand-util', () => {
    it('should return an expand query part with single expand field', () => {
        const item = {
            x: { someProperty: '' },
        };

        const expectedResult = '$expand=x';

        const result = toExpandQuery<typeof item>(['x']);

        expect(result).toBe(expectedResult);
    });

    it('should return expand query with inner field in navigation property', () => {
        const item = {
            x: { someProperty: { code: 's' } },
        };

        const expectedResult = '$expand=x/someProperty';

        const result = toExpandQuery<typeof item>(['x/someProperty']);

        expect(result).toBe(expectedResult);
    });

    it('should return an empty string for an empty array of expand properties', () => {
        const item = {
            x: { someProperty: '' },
        };
        const result = toExpandQuery<typeof item>([]);
        expect(result).toBe('');
    });

    describe('nested subqueries', () => {
        interface OrderItem {
            name: string;
            price: number;
            category: {
                id: number;
                label: string;
            };
        }

        interface Order {
            id: number;
            total: number;
            items: OrderItem;
            customer: {
                name: string;
                address: {
                    city: string;
                    zip: string;
                };
            };
        }

        interface Entity {
            name: string;
            orders: Order;
            details: { info: string };
        }

        it('should expand with $select subquery', () => {
            const result = toExpandQuery<Entity>([
                { orders: { select: ['id', 'total'] } },
            ]);
            expect(result).toBe('$expand=orders($select=id, total)');
        });

        it('should expand with $top subquery', () => {
            const result = toExpandQuery<Entity>([
                { orders: { top: 5 } },
            ]);
            expect(result).toBe('$expand=orders($top=5)');
        });

        it('should expand with $skip subquery', () => {
            const result = toExpandQuery<Entity>([
                { orders: { skip: 10 } },
            ]);
            expect(result).toBe('$expand=orders($skip=10)');
        });

        it('should expand with $count subquery', () => {
            const result = toExpandQuery<Entity>([
                { orders: { count: true } },
            ]);
            expect(result).toBe('$expand=orders($count=true)');
        });

        it('should expand with $orderby subquery', () => {
            const result = toExpandQuery<Entity>([
                {
                    orders: {
                        orderBy: [{ field: 'total', orderDirection: 'desc' }],
                    },
                },
            ]);
            expect(result).toBe('$expand=orders($orderby=total desc)');
        });

        it('should expand with $filter subquery using FilterBuilder', () => {
            const result = toExpandQuery<Entity>([
                {
                    orders: {
                        filter: f => f.where(x => x.total.gt(100)),
                    },
                },
            ]);
            expect(result).toBe('$expand=orders($filter=total gt 100)');
        });

        it('should expand with $search subquery', () => {
            const result = toExpandQuery<Entity>([
                { orders: { search: 'urgent' } },
            ]);
            expect(result).toBe('$expand=orders($search=urgent)');
        });

        it('should expand with multiple subquery options', () => {
            const result = toExpandQuery<Entity>([
                {
                    orders: {
                        select: ['id', 'total'],
                        filter: f => f.where(x => x.total.gt(50)),
                        orderBy: [{ field: 'total', orderDirection: 'desc' }],
                        top: 10,
                        skip: 5,
                        count: true,
                    },
                },
            ]);
            expect(result).toBe(
                '$expand=orders($select=id, total;$filter=total gt 50;$orderby=total desc;$top=10;$skip=5;$count=true)',
            );
        });

        it('should expand multiple navigation properties with subqueries', () => {
            const result = toExpandQuery<Entity>([
                { orders: { top: 5 } },
                { details: { select: ['info'] } },
            ]);
            expect(result).toBe(
                '$expand=orders($top=5), details($select=info)',
            );
        });

        it('should mix simple expand with subquery expand', () => {
            const result = toExpandQuery<Entity>([
                'details',
                { orders: { select: ['id'], top: 3 } },
            ]);
            expect(result).toBe(
                '$expand=details, orders($select=id;$top=3)',
            );
        });

        it('should support nested $expand subqueries', () => {
            const result = toExpandQuery<Entity>([
                {
                    orders: {
                        select: ['id'],
                        expand: [
                            {
                                items: {
                                    select: ['name', 'price'],
                                },
                            },
                        ],
                    },
                },
            ]);
            expect(result).toBe(
                '$expand=orders($select=id;$expand=items($select=name, price))',
            );
        });

        it('should support deeply nested $expand subqueries', () => {
            const result = toExpandQuery<Entity>([
                {
                    orders: {
                        expand: [
                            {
                                items: {
                                    expand: [
                                        {
                                            category: {
                                                select: ['label'],
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            ]);
            expect(result).toBe(
                '$expand=orders($expand=items($expand=category($select=label)))',
            );
        });

        it('should support nested $expand with filter', () => {
            const result = toExpandQuery<Entity>([
                {
                    orders: {
                        expand: [
                            {
                                customer: {
                                    expand: [
                                        {
                                            address: {
                                                select: ['city'],
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                        filter: f => f.where(x => x.total.gt(0)),
                    },
                },
            ]);
            expect(result).toBe(
                '$expand=orders($filter=total gt 0;$expand=customer($expand=address($select=city)))',
            );
        });

        it('should handle multiple properties in a single subquery object', () => {
            const result = toExpandQuery<Entity>([
                {
                    orders: { top: 5 },
                    details: { select: ['info'] },
                },
            ]);
            expect(result).toBe(
                '$expand=orders($top=5), details($select=info)',
            );
        });

        it('should handle subquery with empty options as simple expand', () => {
            const result = toExpandQuery<Entity>([{ orders: {} }]);
            expect(result).toBe('$expand=orders');
        });
    });
});
