import { describe, it, expectTypeOf } from 'vitest';
import { ExpandFields } from './expand-fields.type';

// ============================================================================
// Interface definitions for testing
// This tests the colleague's issue with interface properties
// ============================================================================

interface Address {
    street: string;
    city: string;
}

interface Company {
    name: string;
    location: Address;
}

interface User {
    id: number;
    name: string;
    address: Address;
    company: Company;
}

describe('ExpandFields<T>', () => {
    describe('with interface types', () => {
        it('should work with interface properties', () => {
            expectTypeOf<ExpandFields<User>>().toEqualTypeOf<
                | 'address'
                | 'company'
                | 'company/location'
            >();
        });

        it('should handle nested interface references', () => {
            expectTypeOf<ExpandFields<Company>>().toEqualTypeOf<'location'>();
        });

        it('should not include primitive-only interfaces', () => {
            expectTypeOf<ExpandFields<Address>>().toEqualTypeOf<never>();
        });
    });

    it('should allow top-level expandable fields', () => {
        type Item = {
            navigation: { id: string };
            property: string;
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<'navigation'>();
    });

    it('should allow nested expandable fields', () => {
        type Item = {
            navigation: { nested: { id: string } };
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            'navigation/nested' | 'navigation'
        >();
    });

    it('should not allow non-expandable fields', () => {
        type Item = {
            property: string;
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<never>();
    });

    it('should allow only expandable fields when mixed with non-expandable', () => {
        type Item = {
            navigation: { id: string };
            property: string;
            nested: {
                innerNavigation: { name: string };
                innerProperty: number;
            };
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            'navigation' | 'nested' | 'nested/innerNavigation'
        >();
    });

    it('should handle multiple levels of nested expandable fields', () => {
        type Item = {
            level1: {
                level2: {
                    level3: { id: string };
                };
            };
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            'level1' | 'level1/level2' | 'level1/level2/level3'
        >();
    });

    it('should return never for an empty interface', () => {
        type Item = object;
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<never>();
    });

    it('should handle null navigation properties', () => {
        type Item = {
            navigation: { nested: { id: string } | null };
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            'navigation' | 'navigation/nested'
        >();
    });

    it('should handle undefined navigation properties', () => {
        type Item = {
            navigation: { nested?: { id: string } };
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            'navigation' | 'navigation/nested'
        >();
    });

    it('should handle a mix of valid and potentially invalid nested paths (type level)', () => {
        type Item = {
            navigation: {
                nested: { id: string };
                invalidNested: string;
            };
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            'navigation' | 'navigation/nested'
        >();
    });

    it('should handle reaching the maximum depth', () => {
        type Level5 = { id: string };
        type Level4 = { level5: Level5 };
        type Level3 = { level4: Level4 };
        type Level2 = { level3: Level3 };

        type Level1 = { level2: Level2 };

        type Item = { level1: Level1 };

        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            | 'level1'
            | 'level1/level2'
            | 'level1/level2/level3'
            | 'level1/level2/level3/level4'
            | 'level1/level2/level3/level4/level5'
        >();
    });

    it('should not allow expansion beyond the maximum depth', () => {
        type Level6 = { id: string };
        type Level5 = { level6: Level6 };
        type Level4 = { level5: Level5 };
        type Level3 = { level4: Level4 };
        type Level2 = { level3: Level3 };
        type Level1 = { level2: Level2 };
        type Item = { level1: Level1 };

        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            | 'level1'
            | 'level1/level2'
            | 'level1/level2/level3'
            | 'level1/level2/level3/level4'
            | 'level1/level2/level3/level4/level5'
        >();
    });

    it('should handle an empty object as an expandable property', () => {
        type Item = { navigation: object };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<never>();
    });

    it('should handle nested optionals and nullables', () => {
        type Item = {
            navigation?: {
                nested?: { id: string | null };
            } | null;
        };
        expectTypeOf<ExpandFields<Item>>().toEqualTypeOf<
            'navigation' | 'navigation/nested'
        >();
    });
});
