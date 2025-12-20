import {
    SearchExpression,
    SearchExpressionPart,
} from '../types/search/search-expression.type';
import { createSearchTerm } from '../utils/search/search.utils';

/**
 * Builder for constructing OData $search query expressions.
 *
 * Supports terms, phrases, boolean operators (AND, OR, NOT), and grouping.
 * The builder is immutable - each method returns a new instance.
 *
 * @example
 * // Simple term search
 * new SearchExpressionBuilder()
 *     .term('coffee')
 *     .toString()  // "coffee"
 *
 * @example
 * // Multiple terms with AND
 * new SearchExpressionBuilder()
 *     .term('coffee')
 *     .and()
 *     .term('shop')
 *     .toString()  // "coffee AND shop"
 *
 * @example
 * // Phrase search (exact match)
 * new SearchExpressionBuilder()
 *     .phrase('coffee shop')
 *     .toString()  // "\"coffee shop\""
 *
 * @example
 * // Complex expression with grouping
 * const inner = new SearchExpressionBuilder().term('latte').or().term('espresso');
 * new SearchExpressionBuilder()
 *     .term('coffee')
 *     .and()
 *     .group(inner)
 *     .toString()  // "coffee AND (latte OR espresso)"
 *
 * @example
 * // Using with OdataQueryBuilder
 * new OdataQueryBuilder<Product>()
 *     .search(new SearchExpressionBuilder().term('coffee').and().term('organic'))
 *     .toQuery()  // "?$search=coffee%20AND%20organic"
 */
export class SearchExpressionBuilder {
    private readonly parts: ReadonlyArray<SearchExpressionPart>;

    constructor(parts: SearchExpression = []) {
        this.parts = parts;
    }

    /**
     * Adds a search term to the expression.
     *
     * Terms are single words that will be searched for in the data.
     * Multiple terms can be combined with and() or or().
     *
     * @param term - The search term (must not be empty or whitespace only)
     * @returns A new SearchExpressionBuilder with the term added
     * @throws Error if term is empty or whitespace only
     *
     * @example
     * builder.term('coffee')  // Adds "coffee" to search
     */
    term(term: string): SearchExpressionBuilder {
        const trimmedTerm = term.trim();
        if (!trimmedTerm) {
            throw new Error('Term cannot be empty or whitespace only.');
        }
        return new SearchExpressionBuilder([
            ...this.parts,
            createSearchTerm(trimmedTerm),
        ]);
    }

    /**
     * Adds an exact phrase to the expression.
     *
     * Phrases are enclosed in double quotes and search for exact matches.
     * Use this when you need to match multiple words in sequence.
     *
     * @param phrase - The exact phrase to search for (must not be empty)
     * @returns A new SearchExpressionBuilder with the phrase added
     * @throws Error if phrase is empty or whitespace only
     *
     * @example
     * builder.phrase('coffee shop')  // Adds "\"coffee shop\"" to search
     */
    phrase(phrase: string): SearchExpressionBuilder {
        const trimmedPhrase = phrase.trim();
        if (!trimmedPhrase) {
            throw new Error('Phrase cannot be empty or whitespace only.');
        }
        return new SearchExpressionBuilder([
            ...this.parts,
            { phrase: trimmedPhrase },
        ]);
    }

    /**
     * Adds an AND operator between search terms.
     *
     * Both terms on either side of AND must match for results to be returned.
     *
     * @returns A new SearchExpressionBuilder with AND added
     *
     * @example
     * builder.term('coffee').and().term('organic')  // "coffee AND organic"
     */
    and(): SearchExpressionBuilder {
        return new SearchExpressionBuilder([...this.parts, 'AND']);
    }

    /**
     * Adds an OR operator between search terms.
     *
     * Either term on either side of OR can match for results to be returned.
     *
     * @returns A new SearchExpressionBuilder with OR added
     *
     * @example
     * builder.term('coffee').or().term('tea')  // "coffee OR tea"
     */
    or(): SearchExpressionBuilder {
        return new SearchExpressionBuilder([...this.parts, 'OR']);
    }

    /**
     * Negates a search expression.
     *
     * Results matching the negated expression will be excluded.
     *
     * @param expressionBuilder - The expression to negate
     * @returns A new SearchExpressionBuilder with the negated expression
     *
     * @example
     * const decaf = new SearchExpressionBuilder().term('decaf');
     * builder.term('coffee').and().not(decaf)  // "coffee AND (NOT decaf)"
     */
    not(expressionBuilder: SearchExpressionBuilder): SearchExpressionBuilder {
        return new SearchExpressionBuilder([
            ...this.parts,
            { expression: [`NOT`, ...expressionBuilder.build()] },
        ]);
    }

    /**
     * Groups an expression with parentheses for precedence control.
     *
     * Use this to ensure correct evaluation order in complex expressions.
     *
     * @param builder - The expression to group
     * @returns A new SearchExpressionBuilder with the grouped expression
     *
     * @example
     * const options = new SearchExpressionBuilder().term('latte').or().term('espresso');
     * builder.term('coffee').and().group(options)  // "coffee AND (latte OR espresso)"
     */
    group(builder: SearchExpressionBuilder): SearchExpressionBuilder {
        return new SearchExpressionBuilder([
            ...this.parts,
            { expression: builder.build() },
        ]);
    }

    /**
     * Builds and returns the raw search expression array.
     *
     * @returns The internal search expression representation
     */
    build(): SearchExpression {
        return this.parts;
    }

    /**
     * Converts the search expression to its OData string representation.
     *
     * This is the format used in the $search query parameter.
     *
     * @returns The OData search expression string
     *
     * @example
     * new SearchExpressionBuilder()
     *     .term('coffee')
     *     .and()
     *     .phrase('fair trade')
     *     .toString()  // 'coffee AND "fair trade"'
     */
    toString(): string {
        return this.parts.map(this.stringifyPart.bind(this)).join(' ');
    }

    /**
     * Compares this expression with another for equality.
     *
     * @param other - The other SearchExpressionBuilder to compare with
     * @returns true if both expressions are structurally equal
     */
    equals(other: SearchExpressionBuilder): boolean {
        return JSON.stringify(this.build()) === JSON.stringify(other.build());
    }

    private stringifyPart(part: SearchExpressionPart): string {
        if (typeof part === 'string') {
            return part;
        }
        if ('phrase' in part) {
            return `"${part.phrase}"`;
        }
        if ('expression' in part) {
            const expression = part.expression
                .map(this.stringifyPart.bind(this))
                .join(' ');
            return `(${expression})`;
        }
        throw new Error(
            `Unsupported SearchExpressionPart: ${JSON.stringify(part)}`,
        );
    }
}
