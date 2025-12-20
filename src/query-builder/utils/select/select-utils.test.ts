import { describe, expect, it } from 'vitest';
import { toSelectQuery } from './select-utils';

describe('toSelectQuery', () => {
    it('should return the select query string with one select prop', () => {
        const selectProps = ['test'];
        const expectedResult = '$select=test';

        const result = toSelectQuery(selectProps);

        expect(result).toBe(expectedResult);
    });

    it('should return select query with more than one select prop', () => {
        const selectProps = ['test', 'test2', 'test3'];
        const expectedResult = '$select=test, test2, test3';

        const result = toSelectQuery(selectProps);

        expect(result).toBe(expectedResult);
    });

    it('should return an empty string for an empty array of select properties', () => {
        const result = toSelectQuery([]);
        expect(result).toBe('');
    });
    // TODO HANDLE THIS CASE! MAYBE '' as return
    it('should handle null in select properties (though the type should prevent this)', () => {
        // @ts-expect-error null is not allowed
        const result = toSelectQuery([null]);
        expect(result).toBe('$select='); // Or handle this case differently
    });

    it('should handle undefined in select properties (though the type should prevent this)', () => {
        // @ts-expect-error undefined is not allowed
        const result = toSelectQuery([undefined]);
        expect(result).toBe('$select='); // Or handle this case differently
    });

    it('should handle empty strings in select properties', () => {
        const result = toSelectQuery(['']);
        expect(result).toBe('$select=');
    });
});

describe('toSelectQuery - Input Array Edge Cases', () => {
    it('should handle array with duplicate select properties', () => {
        const selectProps = ['test', 'test', 'test2'];
        const result = toSelectQuery(selectProps);
        expect(result).toBe('$select=test, test, test2');
    });

    it('should handle array with empty strings', () => {
        const selectProps = ['test', '', 'test2'];
        const result = toSelectQuery(selectProps);
        expect(result).toBe('$select=test, , test2');
    });

    it('should handle array with null and undefined (though type should prevent)', () => {
        const selectPropsWithNull = ['test', null, 'test2'];
        const selectPropsWithUndefined = ['test', undefined, 'test2'];

        const resultWithNull = toSelectQuery(selectPropsWithNull as string[]);
        const resultWithUndefined = toSelectQuery(
            selectPropsWithUndefined as string[],
        ); // Explicit cast to any

        expect(resultWithNull).toBe('$select=test, , test2');
        expect(resultWithUndefined).toBe('$select=test, , test2');
    });
});
