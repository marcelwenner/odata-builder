export type SearchTerm = string & { readonly __brand: 'SearchTerm' };

export interface SearchPhrase {
    readonly phrase: string;
}

export type SearchOperator = 'AND' | 'OR' | 'NOT';

export interface SearchGroup {
    readonly expression: SearchExpression;
}

export type SearchExpressionPart =
    | SearchTerm
    | SearchPhrase
    | SearchOperator
    | SearchGroup;

export type SearchExpression = readonly SearchExpressionPart[];
