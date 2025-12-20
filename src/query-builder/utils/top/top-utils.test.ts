import { describe, it, expect } from 'vitest';
import { toTopQuery } from './top-utils';

describe('toTopQuery', () => {
    it('should throw an error for non-integer top count', () => {
        expect(() => toTopQuery(5.5)).toThrowError('Invalid top count');
        expect(() => toTopQuery(NaN)).toThrowError('Invalid top count');
        expect(() => toTopQuery(Infinity)).toThrowError('Invalid top count');
    });

    it('should handle very large positive top counts', () => {
        const largeTop = Number.MAX_SAFE_INTEGER;
        const expectedQuery = `$top=${largeTop}`;
        const result = toTopQuery(largeTop);
        expect(result).toEqual(expectedQuery);
    });

    it('should return empty string for zero', () => {
        expect(toTopQuery(0)).toBe('');
    });

    it('should throw for negative numbers', () => {
        expect(() => toTopQuery(-1)).toThrowError('Invalid top count');
        expect(() => toTopQuery(-100)).toThrowError('Invalid top count');
    });

    it('should handle positive integers correctly', () => {
        expect(toTopQuery(1)).toBe('$top=1');
        expect(toTopQuery(10)).toBe('$top=10');
        expect(toTopQuery(100)).toBe('$top=100');
    });
});
