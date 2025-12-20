import { describe, it, expectTypeOf } from 'vitest';
import { SelectFields } from './select-fields.type';

// ============================================================================
// Interface definitions for testing
// ============================================================================

interface Address {
    street: string;
    city: string;
    zip: number;
}

interface Company {
    name: string;
    address: Address;
}

interface User {
    id: number;
    name: string;
    email: string;
    address: Address;
    company: Company;
}

describe('SelectFields<T>', () => {
    describe('basic functionality', () => {
        it('should allow all top-level fields', () => {
            type Item = {
                name: string;
                age: number;
                active: boolean;
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                'name' | 'age' | 'active'
            >();
        });

        it('should allow nested paths with / separator', () => {
            type Item = {
                name: string;
                address: { city: string; zip: number };
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                'name' | 'address' | 'address/city' | 'address/zip'
            >();
        });

        it('should handle deeply nested structures', () => {
            type Item = {
                level1: {
                    level2: {
                        level3: { value: string };
                    };
                };
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                | 'level1'
                | 'level1/level2'
                | 'level1/level2/level3'
                | 'level1/level2/level3/value'
            >();
        });
    });

    describe('with interface types', () => {
        it('should work with interface properties', () => {
            expectTypeOf<SelectFields<User>>().toEqualTypeOf<
                | 'id'
                | 'name'
                | 'email'
                | 'address'
                | 'address/street'
                | 'address/city'
                | 'address/zip'
                | 'company'
                | 'company/name'
                | 'company/address'
                | 'company/address/street'
                | 'company/address/city'
                | 'company/address/zip'
            >();
        });

        it('should work with nested interface references', () => {
            expectTypeOf<SelectFields<Company>>().toEqualTypeOf<
                | 'name'
                | 'address'
                | 'address/street'
                | 'address/city'
                | 'address/zip'
            >();
        });

        it('should handle flat interfaces', () => {
            expectTypeOf<SelectFields<Address>>().toEqualTypeOf<
                'street' | 'city' | 'zip'
            >();
        });
    });

    describe('nullable and optional properties', () => {
        it('should handle null properties', () => {
            type Item = {
                navigation: { nested: { id: string } | null };
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                'navigation' | 'navigation/nested' | 'navigation/nested/id'
            >();
        });

        it('should handle optional properties', () => {
            type Item = {
                name: string;
                details?: { description: string };
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                'name' | 'details' | 'details/description'
            >();
        });

        it('should handle optional nested properties', () => {
            type Item = {
                id: number;
                details?: {
                    description: string;
                    metadata: { key: string };
                };
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                | 'id'
                | 'details'
                | 'details/description'
                | 'details/metadata'
                | 'details/metadata/key'
            >();
        });
    });

    describe('depth limiting', () => {
        it('should respect maximum depth of 5', () => {
            type Level5 = { value: string };
            type Level4 = { level5: Level5 };
            type Level3 = { level4: Level4 };
            type Level2 = { level3: Level3 };
            type Level1 = { level2: Level2 };
            type Item = { level1: Level1 };

            // Depth 5 means 5 levels of nesting
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                | 'level1'
                | 'level1/level2'
                | 'level1/level2/level3'
                | 'level1/level2/level3/level4'
                | 'level1/level2/level3/level4/level5'
                | 'level1/level2/level3/level4/level5/value'
            >();
        });

        it('should allow custom depth', () => {
            type Item = {
                a: { b: { c: { d: string } } };
            };

            // Depth 2 should only go 2 levels deep
            expectTypeOf<SelectFields<Item, 2>>().toEqualTypeOf<
                'a' | 'a/b' | 'a/b/c'
            >();
        });
    });

    describe('edge cases', () => {
        it('should return never for empty object', () => {
            type Item = object;
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<never>();
        });

        it('should handle arrays as primitives (not expandable)', () => {
            type Item = {
                name: string;
                tags: string[];
                scores: number[];
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                'name' | 'tags' | 'scores'
            >();
        });

        it('should handle Date as primitive', () => {
            type Item = {
                name: string;
                createdAt: Date;
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                'name' | 'createdAt'
            >();
        });

        it('should handle mixed primitive and object properties', () => {
            type Item = {
                id: number;
                name: string;
                active: boolean;
                metadata: { key: string; value: number };
            };
            expectTypeOf<SelectFields<Item>>().toEqualTypeOf<
                | 'id'
                | 'name'
                | 'active'
                | 'metadata'
                | 'metadata/key'
                | 'metadata/value'
            >();
        });
    });
});
