import { SearchTerm } from 'src/query-builder/types/search/search-expression.type';
import { describe, it, expect } from 'vitest';
import { createSearchTerm } from './search.utils';

describe('createSearchTerm', () => {
    it('should return the input string as a SearchTerm', () => {
        const term = 'example';
        const searchTerm = createSearchTerm(term);

        expect(searchTerm).toBe(term);
    });

    it('should ensure the returned value is of type SearchTerm', () => {
        const term = 'example';
        const searchTerm: SearchTerm = createSearchTerm(term);

        expect(searchTerm).toBe(term);
    });

    it('should allow SearchTerm in other contexts', () => {
        const term = createSearchTerm('test');
        const expression: SearchTerm[] = [term];

        expect(expression).toContain('test');
    });

    it('should trim whitespace from input', () => {
        const searchTerm = createSearchTerm('  hello world  ');
        expect(searchTerm).toBe('hello world');
    });
});

describe('createSearchTerm validation', () => {
    it('throws on non-string input', () => {
        expect(() => createSearchTerm(123 as unknown as string)).toThrow(
            'Search term must be a string',
        );
    });

    it('throws on null input', () => {
        expect(() => createSearchTerm(null as unknown as string)).toThrow(
            'Search term must be a string',
        );
    });

    it('throws on undefined input', () => {
        expect(() => createSearchTerm(undefined as unknown as string)).toThrow(
            'Search term must be a string',
        );
    });

    it('throws on empty string', () => {
        expect(() => createSearchTerm('')).toThrow(
            'Search term cannot be empty or whitespace only',
        );
    });

    it('throws on whitespace-only string', () => {
        expect(() => createSearchTerm('   ')).toThrow(
            'Search term cannot be empty or whitespace only',
        );
    });

    it('throws on tab-only string', () => {
        expect(() => createSearchTerm('\t\t')).toThrow(
            'Search term cannot be empty or whitespace only',
        );
    });
});
