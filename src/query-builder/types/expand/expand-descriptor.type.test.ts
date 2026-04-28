import { describe, it, expectTypeOf } from 'vitest';
import {
    TopLevelExpandFields,
    ExpandWithSubQuery,
    ExpandInput,
    ExpandSubQueryOptions,
} from './expand-descriptor.type';

// ============================================================================
// Test interfaces
// ============================================================================

interface Address {
    street: string;
    city: string;
}

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
        address: Address;
    };
}

interface Entity {
    name: string;
    age: number;
    orders: Order;
    details: { info: string };
}

describe('TopLevelExpandFields<T>', () => {
    it('should extract only top-level navigation properties', () => {
        expectTypeOf<TopLevelExpandFields<Entity>>().toEqualTypeOf<
            'orders' | 'details'
        >();
    });

    it('should not include primitive fields', () => {
        type OnlyPrimitives = { name: string; count: number };
        expectTypeOf<TopLevelExpandFields<OnlyPrimitives>>().toEqualTypeOf<never>();
    });

    it('should handle nested objects', () => {
        expectTypeOf<TopLevelExpandFields<Order>>().toEqualTypeOf<
            'items' | 'customer'
        >();
    });
});

describe('ExpandWithSubQuery<T>', () => {
    it('should allow subquery options for navigation properties', () => {
        type Result = ExpandWithSubQuery<Entity>;
        // Should accept valid subquery
        const valid: Result = {
            orders: { select: ['id', 'total'], top: 5 },
        };
        expectTypeOf(valid).toMatchTypeOf<Result>();
    });

    it('should allow partial navigation properties', () => {
        type Result = ExpandWithSubQuery<Entity>;
        const partial: Result = { orders: { top: 10 } };
        expectTypeOf(partial).toMatchTypeOf<Result>();
    });

    it('should allow nested expand in subquery options', () => {
        type OrderOptions = ExpandSubQueryOptions<Order>;
        const nested: OrderOptions = {
            select: ['id'],
            expand: [{ items: { select: ['name'] } }],
        };
        expectTypeOf(nested).toMatchTypeOf<OrderOptions>();
    });
});

describe('ExpandInput<T>', () => {
    it('should accept simple string paths', () => {
        const simple: ExpandInput<Entity> = 'orders';
        expectTypeOf(simple).toMatchTypeOf<ExpandInput<Entity>>();
    });

    it('should accept subquery objects', () => {
        const withSubQuery: ExpandInput<Entity> = {
            orders: { select: ['id'], top: 5 },
        };
        expectTypeOf(withSubQuery).toMatchTypeOf<ExpandInput<Entity>>();
    });

    it('should accept nested path strings', () => {
        const nested: ExpandInput<Entity> = 'orders/items';
        expectTypeOf(nested).toMatchTypeOf<ExpandInput<Entity>>();
    });
});
