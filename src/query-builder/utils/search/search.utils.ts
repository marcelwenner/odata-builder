import { SearchTerm } from '../../types/search/search-expression.type';

export function createSearchTerm(term: string): SearchTerm {
    return term as SearchTerm;
}
