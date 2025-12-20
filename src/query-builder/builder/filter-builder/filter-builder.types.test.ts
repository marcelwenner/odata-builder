/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
// Above rules disabled: This file tests compile-time type errors via @ts-expect-error
// ESLint sees these as "error" typed values, but that's intentional for type testing

import { describe, it, assertType } from 'vitest';
import { FilterBuilder } from './filter-builder';
import { Guid } from '../../types/utils/util.types';
import { QueryFilter } from '../../types/filter/query-filter.type';
import { CombinedFilter } from '../../types/filter/combined-filter.type';

// =============================================================================
// Test Types
// =============================================================================

type User = {
    name: string;
    age: number;
    isActive: boolean;
    createdAt: Date;
    id: Guid;
    tags: string[];
    orders: { price: number }[];
    address: { city: string };
    meta: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    anything: any;
};

type ItemWithOptional = {
    optionalName?: string;
    nullableName: string | null;
};

// =============================================================================
// 1. FieldProxy Mapping (via erlaubte/verbotene Ops)
// =============================================================================

describe('FieldProxy Mapping', () => {
    describe('String fields', () => {
        it('has string ops', () => {
            new FilterBuilder<User>().where(x => x.name.eq('test'));
            new FilterBuilder<User>().where(x => x.name.contains('t'));
            new FilterBuilder<User>().where(x => x.name.length().gt(1));
        });

        it('does NOT have number ops', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - gt is not on string
                return x.name.gt('test');
            });
        });
    });

    describe('Number fields', () => {
        it('has number ops', () => {
            new FilterBuilder<User>().where(x => x.age.eq(18));
            new FilterBuilder<User>().where(x => x.age.gt(18));
            new FilterBuilder<User>().where(x => x.age.add(1).lt(100));
        });

        it('does NOT have string ops', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - contains is not on number
                return x.age.contains('test');
            });
        });
    });

    describe('Boolean fields', () => {
        it('has boolean ops', () => {
            new FilterBuilder<User>().where(x => x.isActive.eq(true));
            new FilterBuilder<User>().where(x => x.isActive.isTrue());
        });

        it('does NOT have comparison ops', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - gt is not on boolean
                return x.isActive.gt(true);
            });
        });
    });

    describe('Date fields', () => {
        it('has date ops', () => {
            new FilterBuilder<User>().where(x => x.createdAt.eq(new Date()));
            new FilterBuilder<User>().where(x => x.createdAt.gt(new Date()));
            new FilterBuilder<User>().where(x => x.createdAt.year().eq(2024));
        });

        it('does NOT have string ops', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - contains is not on date
                return x.createdAt.contains('x');
            });
        });
    });

    describe('Guid fields', () => {
        it('has guid ops', () => {
            new FilterBuilder<User>().where(x => x.id.eq('abc' as Guid));
            new FilterBuilder<User>().where(x =>
                x.id.removeQuotes().eq('x' as Guid),
            );
        });

        it('does NOT have comparison ops', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - gt is not on guid
                return x.id.gt('x' as Guid);
            });
        });
    });
});

// =============================================================================
// 3. Forbidden Operations
// =============================================================================

describe('Forbidden Operations', () => {
    it('should NOT allow string ops on number', () => {
        new FilterBuilder<User>().where(x => {
            // @ts-expect-error - contains is not on NumberFieldOperations
            return x.age.contains('test');
        });
    });

    it('should NOT allow gt on string', () => {
        new FilterBuilder<User>().where(x => {
            // @ts-expect-error - gt is not on StringFieldOperations
            return x.name.gt('test');
        });
    });

    it('should NOT allow wrong value type', () => {
        new FilterBuilder<User>().where(x => {
            // @ts-expect-error - eq expects number
            return x.age.eq('hello');
        });
    });

    it('should NOT allow unknown field', () => {
        new FilterBuilder<User>().where(x => {
            // @ts-expect-error - 'unknownField' does not exist
            return x.unknownField.eq('test');
        });
    });
});

// =============================================================================
// 4. Nested Object Type Preservation
// =============================================================================

describe('Nested Object Type Preservation', () => {
    it('preserves root type through nested access', () => {
        type UserWithAddress = { address: { city: string } };
        const builder = new FilterBuilder<UserWithAddress>();
        const result = builder.where(x => x.address.city.eq('Berlin'));
        assertType<FilterBuilder<UserWithAddress>>(result);
    });

    it('handles deep nesting (3+ levels)', () => {
        type UserWithGeo = { address: { geo: { lat: number } } };
        const builder = new FilterBuilder<UserWithGeo>();
        const result = builder.where(x => x.address.geo.lat.gt(0));
        assertType<FilterBuilder<UserWithGeo>>(result);
    });
});

// =============================================================================
// 5. Array Lambda Type Safety
// =============================================================================

describe('Array Lambda Type Safety', () => {
    describe('Primitive arrays (wrapper { s: T })', () => {
        it('t.s exists for string[]', () => {
            type UserWithTags = { tags: string[] };
            new FilterBuilder<UserWithTags>().where(x =>
                x.tags.any(t => t.s.eq('tag1')),
            );
        });

        it('t.price should NOT exist', () => {
            type UserWithTags = { tags: string[] };
            new FilterBuilder<UserWithTags>().where(x =>
                x.tags.any(t => {
                    // @ts-expect-error - primitive wrapper hat nur 's'
                    return t.price.eq(1);
                }),
            );
        });
    });

    describe('Object arrays (direct access)', () => {
        it('o.price exists for { price: number }[]', () => {
            type UserWithOrders = { orders: { price: number }[] };
            new FilterBuilder<UserWithOrders>().where(x =>
                x.orders.any(o => o.price.gt(100)),
            );
        });

        it('o.s should NOT exist', () => {
            type UserWithOrders = { orders: { price: number }[] };
            new FilterBuilder<UserWithOrders>().where(x =>
                x.orders.any(o => {
                    // @ts-expect-error - object arrays haben kein 's' wrapper
                    return o.s.eq('x');
                }),
            );
        });

        it('should NOT allow wrong ops in lambda', () => {
            type UserWithOrders = { orders: { price: number }[] };
            new FilterBuilder<UserWithOrders>().where(x =>
                x.orders.any(o => {
                    // @ts-expect-error - contains not on number
                    return o.price.contains('x');
                }),
            );
        });
    });
});

// =============================================================================
// 6. Transform Chaining
// =============================================================================

describe('Transform Chaining', () => {
    describe('String transforms', () => {
        it('can be chained and end with string ops', () => {
            new FilterBuilder<User>().where(x =>
                x.name.tolower().trim().contains('test'),
            );
            new FilterBuilder<User>().where(x =>
                x.name.ignoreCase().toupper().eq('TEST'),
            );
        });
    });

    describe('Date transforms', () => {
        it('return number ops', () => {
            new FilterBuilder<User>().where(x => x.createdAt.year().gt(2020));
            new FilterBuilder<User>().where(x => x.createdAt.month().le(12));
        });

        it('year() should NOT have string ops', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - year() returns NumberFieldOperations
                return x.createdAt.year().contains('x');
            });
        });
    });

    describe('String length()', () => {
        it('returns number ops', () => {
            new FilterBuilder<User>().where(x => x.name.length().gt(5));
            new FilterBuilder<User>().where(x => x.name.length().le(100));
        });

        it('should NOT have string ops', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - length() returns NumberFieldOperations
                return x.name.length().contains('x');
            });
        });
    });
});

// =============================================================================
// 6b. Predicate Return Types (nach Transform Chaining)
// =============================================================================

describe('Predicate Return Types', () => {
    describe('String predicates are boolean-like', () => {
        it('predicates are allowed as filter expressions', () => {
            new FilterBuilder<User>().where(x => x.name.contains('a'));
            new FilterBuilder<User>().where(x => x.name.startswith('a'));
            new FilterBuilder<User>().where(x => x.name.endswith('a'));
            new FilterBuilder<User>().where(x => x.name.eq('a'));
        });

        it('predicate results cannot be chained with string transforms', () => {
            // Type-only check - function is never called, just type-checked
            const _typeCheck = () => {
                new FilterBuilder<User>().where(x => {
                    // @ts-expect-error - contains returns FilterExpression, not chainable
                    return x.name.contains('a').tolower();
                });
            };
            void _typeCheck;
        });

        it('predicate results cannot be compared to string', () => {
            // Type-only check - function is never called, just type-checked
            const _typeCheck = () => {
                new FilterBuilder<User>().where(x => {
                    // @ts-expect-error - contains returns FilterExpression, cannot chain eq()
                    return x.name.contains('a').eq('true');
                });
            };
            void _typeCheck;
        });
    });

    describe('Predicate parameters are typed', () => {
        it('contains expects string', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - contains expects string, not number
                return x.name.contains(123);
            });
        });

        it('startswith expects string', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - startswith expects string, not number
                return x.name.startswith(123);
            });
        });

        it('endswith expects string', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - endswith expects string, not number
                return x.name.endswith(123);
            });
        });

        it('eq on string expects string', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - string eq expects string, not number
                return x.name.eq(123);
            });
        });

        it('eq on number expects number', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - number eq expects number, not string
                return x.age.eq('x');
            });
        });
    });

    describe('Boolean fields only compare with boolean', () => {
        it('boolean eq expects boolean', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - boolean eq expects boolean, not string
                return x.isActive.eq('true');
            });
        });

        it('boolean eq expects boolean, not number', () => {
            new FilterBuilder<User>().where(x => {
                // @ts-expect-error - boolean eq expects boolean, not number
                return x.isActive.eq(1);
            });
        });
    });
});

// =============================================================================
// 7. Optional/Nullable
// =============================================================================

describe('Optional/Nullable', () => {
    describe('Optional field (?: string)', () => {
        it('has string ops', () => {
            new FilterBuilder<ItemWithOptional>().where(x =>
                x.optionalName.eq('test'),
            );
            new FilterBuilder<ItemWithOptional>().where(x =>
                x.optionalName.contains('t'),
            );
        });

        it('should NOT allow eq(null) - optional is not nullable', () => {
            new FilterBuilder<ItemWithOptional>().where(x => {
                // @ts-expect-error - optional (?: T) is not nullable, only T | null allows eq(null)
                return x.optionalName.eq(null);
            });
        });

        it('should NOT allow eq(undefined)', () => {
            new FilterBuilder<ItemWithOptional>().where(x => {
                // @ts-expect-error - undefined not allowed
                return x.optionalName.eq(undefined);
            });
        });
    });

    describe('Nullable field (string | null)', () => {
        it('allows eq(null)', () => {
            new FilterBuilder<ItemWithOptional>().where(x =>
                x.nullableName.eq(null),
            );
        });

        it('should NOT allow eq(undefined)', () => {
            new FilterBuilder<ItemWithOptional>().where(x => {
                // @ts-expect-error - undefined not allowed
                return x.nullableName.eq(undefined);
            });
        });
    });
});

// =============================================================================
// 8. Literal Union Types
// =============================================================================

describe('Literal Union Types', () => {
    it('restricts eq to valid values', () => {
        type Item = { status: 'open' | 'closed' };
        new FilterBuilder<Item>().where(x => x.status.eq('open'));
    });

    it('should NOT allow invalid literal', () => {
        type Item = { status: 'open' | 'closed' };
        new FilterBuilder<Item>().where(x => {
            // @ts-expect-error - 'invalid' is not in union 'open' | 'closed'
            return x.status.eq('invalid');
        });
    });

    it('allows contains on string-like unions', () => {
        type Item = { status: 'open' | 'closed' | 'pending' };
        new FilterBuilder<Item>().where(x => x.status.contains('pen'));
    });
});

// =============================================================================
// 9. Edge Cases
// =============================================================================

describe('Edge Cases', () => {
    describe('Readonly', () => {
        it('readonly fields work normally', () => {
            type Item = { readonly name: string };
            const result = new FilterBuilder<Item>().where(x => x.name.eq('test'));
            assertType<FilterBuilder<Item>>(result);
        });

        it('nested readonly works', () => {
            type Item = { readonly address: { readonly city: string } };
            const result = new FilterBuilder<Item>().where(x =>
                x.address.city.eq('Berlin'),
            );
            assertType<FilterBuilder<Item>>(result);
        });
    });

    describe('Interface vs Type', () => {
        it('works with interface', () => {
            interface UserInterface {
                name: string;
                age: number;
            }
            const result = new FilterBuilder<UserInterface>().where(x =>
                x.name.eq('John'),
            );
            assertType<FilterBuilder<UserInterface>>(result);
        });
    });

    describe('unknown vs any', () => {
        it('unknown fields should NOT have operations', () => {
            type Item = { meta: unknown };
            new FilterBuilder<Item>().where(x => {
                // @ts-expect-error - unknown has no operations
                return x.meta.eq('test');
            });
        });

        it('any fields match first type check (Guid) due to any behavior', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type Item = { anything: any };
            // TypeScript: `any extends Guid` = true, so GuidFieldOperations is selected
            // Users with `any` fields need explicit casting
            new FilterBuilder<Item>().where(x =>
                x.anything.eq('test' as unknown as Guid),
            );
        });
    });
});

// =============================================================================
// 10. FilterBuilder Return Types
// =============================================================================

describe('FilterBuilder Return Types', () => {
    it('where() returns FilterBuilder<T>', () => {
        type SimpleUser = { name: string };
        const result = new FilterBuilder<SimpleUser>().where(x =>
            x.name.eq('John'),
        );
        assertType<FilterBuilder<SimpleUser>>(result);
    });

    it('and() returns FilterBuilder<T>', () => {
        type SimpleUser = { name: string; age: number };
        const result = new FilterBuilder<SimpleUser>()
            .where(x => x.name.eq('John'))
            .and(x => x.age.gt(18));
        assertType<FilterBuilder<SimpleUser>>(result);
    });

    it('or() returns FilterBuilder<T>', () => {
        type SimpleUser = { name: string; age: number };
        const result = new FilterBuilder<SimpleUser>()
            .where(x => x.name.eq('John'))
            .or(x => x.age.lt(10));
        assertType<FilterBuilder<SimpleUser>>(result);
    });

    it('build() returns QueryFilter | CombinedFilter | null', () => {
        type SimpleUser = { name: string };
        const result = new FilterBuilder<SimpleUser>()
            .where(x => x.name.eq('John'))
            .build();
        assertType<QueryFilter<SimpleUser> | CombinedFilter<SimpleUser> | null>(
            result,
        );
    });

    it('buildArray() returns array (no null)', () => {
        type SimpleUser = { name: string };
        const result = new FilterBuilder<SimpleUser>()
            .where(x => x.name.eq('John'))
            .buildArray();
        assertType<Array<QueryFilter<SimpleUser> | CombinedFilter<SimpleUser>>>(
            result,
        );
    });
});

// =============================================================================
// Full Coverage (Optional)
// =============================================================================

describe('String ops - full coverage', () => {
    type SimpleUser = { name: string };

    it('eq', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.eq('x'));
    });
    it('ne', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.ne('x'));
    });
    it('contains', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.contains('x'));
    });
    it('startswith', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.startswith('x'));
    });
    it('endswith', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.endswith('x'));
    });
    it('indexof', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.indexof('x').eq(0));
    });
    it('substring', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.substring(0, 5).eq('x'));
    });
    it('concat', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.concat('x').eq('x'));
    });
    it('length', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.length().gt(0));
    });
    it('tolower', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.tolower().eq('x'));
    });
    it('toupper', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.toupper().eq('X'));
    });
    it('trim', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.trim().eq('x'));
    });
    it('ignoreCase', () => {
        new FilterBuilder<SimpleUser>().where(x => x.name.ignoreCase().eq('X'));
    });
});

describe('Number ops - full coverage', () => {
    type SimpleUser = { age: number };

    it('eq', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.eq(0));
    });
    it('ne', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.ne(0));
    });
    it('gt', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.gt(0));
    });
    it('ge', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.ge(0));
    });
    it('lt', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.lt(0));
    });
    it('le', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.le(0));
    });
    it('add', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.add(1).eq(0));
    });
    it('sub', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.sub(1).eq(0));
    });
    it('mul', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.mul(2).eq(0));
    });
    it('div', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.div(2).eq(0));
    });
    it('mod', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.mod(10).eq(0));
    });
    it('round', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.round().eq(0));
    });
    it('floor', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.floor().eq(0));
    });
    it('ceiling', () => {
        new FilterBuilder<SimpleUser>().where(x => x.age.ceiling().eq(0));
    });
});

describe('Date ops - full coverage', () => {
    type SimpleUser = { createdAt: Date };

    it('eq', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.eq(new Date()));
    });
    it('ne', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.ne(new Date()));
    });
    it('gt', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.gt(new Date()));
    });
    it('ge', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.ge(new Date()));
    });
    it('lt', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.lt(new Date()));
    });
    it('le', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.le(new Date()));
    });
    it('year', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.year().eq(0));
    });
    it('month', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.month().eq(0));
    });
    it('day', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.day().eq(0));
    });
    it('hour', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.hour().eq(0));
    });
    it('minute', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.minute().eq(0));
    });
    it('second', () => {
        new FilterBuilder<SimpleUser>().where(x => x.createdAt.second().eq(0));
    });
});

describe('Boolean ops - full coverage', () => {
    type SimpleUser = { isActive: boolean };

    it('eq', () => {
        new FilterBuilder<SimpleUser>().where(x => x.isActive.eq(true));
    });
    it('ne', () => {
        new FilterBuilder<SimpleUser>().where(x => x.isActive.ne(false));
    });
    it('isTrue', () => {
        new FilterBuilder<SimpleUser>().where(x => x.isActive.isTrue());
    });
    it('isFalse', () => {
        new FilterBuilder<SimpleUser>().where(x => x.isActive.isFalse());
    });
});

describe('Guid ops - full coverage', () => {
    type SimpleUser = { id: Guid };

    it('eq', () => {
        new FilterBuilder<SimpleUser>().where(x => x.id.eq('x' as Guid));
    });
    it('ne', () => {
        new FilterBuilder<SimpleUser>().where(x => x.id.ne('x' as Guid));
    });
    it('removeQuotes', () => {
        new FilterBuilder<SimpleUser>().where(x =>
            x.id.removeQuotes().eq('x' as Guid),
        );
    });
    it('tolower', () => {
        new FilterBuilder<SimpleUser>().where(x =>
            x.id.tolower().eq('x' as Guid),
        );
    });
});

describe('Array ops - full coverage', () => {
    type SimpleUser = { tags: string[]; orders: { price: number }[] };

    it('any on primitive array', () => {
        new FilterBuilder<SimpleUser>().where(x => x.tags.any(t => t.s.eq('x')));
    });
    it('all on primitive array', () => {
        new FilterBuilder<SimpleUser>().where(x => x.tags.all(t => t.s.eq('x')));
    });
    it('any on object array', () => {
        new FilterBuilder<SimpleUser>().where(x =>
            x.orders.any(o => o.price.gt(0)),
        );
    });
    it('all on object array', () => {
        new FilterBuilder<SimpleUser>().where(x =>
            x.orders.all(o => o.price.gt(0)),
        );
    });
});
