import { describe, it, expect } from 'vitest';
import { toSkipQuery } from './skip-utils';

describe('toSkipQuery', () => {
    it('should throw an error for non-integer skip count', () => {
        expect(() => toSkipQuery(5.5)).toThrowError('Invalid skip count');
        expect(() => toSkipQuery(NaN)).toThrowError('Invalid skip count');
        expect(() => toSkipQuery(Infinity)).toThrowError('Invalid skip count');
    });

    it('should handle very large positive skip counts', () => {
        const largeSkip = Number.MAX_SAFE_INTEGER;
        const expectedQuery = `$skip=${largeSkip}`;
        const result = toSkipQuery(largeSkip);
        expect(result).toBe(expectedQuery);
    });

    it('should return empty string for zero', () => {
        expect(toSkipQuery(0)).toBe('');
    });

    it('should throw for negative numbers', () => {
        expect(() => toSkipQuery(-1)).toThrowError('Invalid skip count');
        expect(() => toSkipQuery(-100)).toThrowError('Invalid skip count');
    });

    it('should handle positive integers correctly', () => {
        expect(toSkipQuery(1)).toBe('$skip=1');
        expect(toSkipQuery(10)).toBe('$skip=10');
        expect(toSkipQuery(100)).toBe('$skip=100');
    });
});
