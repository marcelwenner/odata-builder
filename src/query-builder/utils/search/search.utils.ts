import { SearchTerm } from '../../types/search/search-expression.type';

export function createSearchTerm(term: string): SearchTerm {
    if (typeof term !== 'string') {
        throw new Error('Search term must be a string.');
    }
    const trimmedTerm = term.trim();
    if (trimmedTerm === '') {
        throw new Error('Search term cannot be empty or whitespace only.');
    }
    return trimmedTerm as SearchTerm;
}
