import { describe, it, expect } from 'vitest';
import { SearchExpressionBuilder } from './search-expression-builder';
import { SearchExpressionPart } from '../types/search/search-expression.type';

describe('SearchExpressionBuilder', () => {
    it('should add a term to the expression', () => {
        const builder = new SearchExpressionBuilder().term('example');
        expect(builder.toString()).toBe('example');
    });

    it('should add a phrase to the expression', () => {
        const builder = new SearchExpressionBuilder().phrase('example phrase');
        expect(builder.toString()).toBe('"example phrase"');
    });

    it('should combine terms with AND', () => {
        const builder = new SearchExpressionBuilder()
            .term('first')
            .and()
            .term('second');
        expect(builder.toString()).toBe('first AND second');
    });

    it('should combine terms with OR', () => {
        const builder = new SearchExpressionBuilder()
            .term('first')
            .or()
            .term('second');
        expect(builder.toString()).toBe('first OR second');
    });

    it('should handle NOT operator', () => {
        const builder = new SearchExpressionBuilder().not(
            new SearchExpressionBuilder().term('excluded'),
        );
        expect(builder.toString()).toBe('(NOT excluded)');
    });

    it('should handle grouped expressions', () => {
        const builder = new SearchExpressionBuilder().group(
            new SearchExpressionBuilder().term('red').and().term('blue'),
        );
        expect(builder.toString()).toBe('(red AND blue)');
    });

    it('should handle deeply nested expressions', () => {
        const builder = new SearchExpressionBuilder()
            .term('outer')
            .and()
            .group(
                new SearchExpressionBuilder()
                    .term('inner1')
                    .or()
                    .not(new SearchExpressionBuilder().term('inner2')),
            );
        expect(builder.toString()).toBe('outer AND (inner1 OR (NOT inner2))');
    });

    it('should handle empty builder gracefully', () => {
        const builder = new SearchExpressionBuilder();
        expect(builder.toString()).toBe('');
    });

    it('should validate empty term input', () => {
        expect(() => new SearchExpressionBuilder().term('')).toThrowError(
            'Term cannot be empty or whitespace only.',
        );
    });

    it('should validate empty phrase input', () => {
        expect(() => new SearchExpressionBuilder().phrase('')).toThrowError(
            'Phrase cannot be empty or whitespace only.',
        );
    });

    it('should compare equality of builders', () => {
        const builder1 = new SearchExpressionBuilder()
            .term('first')
            .and()
            .term('second');
        const builder2 = new SearchExpressionBuilder()
            .term('first')
            .and()
            .term('second');
        expect(builder1.equals(builder2)).toBe(true);
    });

    it('should detect inequality between builders', () => {
        const builder1 = new SearchExpressionBuilder().term('first');
        const builder2 = new SearchExpressionBuilder().term('second');
        expect(builder1.equals(builder2)).toBe(false);
    });

    it('should throw an error for unsupported SearchExpressionPart', () => {
        const invalidPart = { invalidKey: 'invalidValue' };
        const builder = new SearchExpressionBuilder([
            invalidPart as unknown as SearchExpressionPart,
        ]);

        expect(() => builder.toString()).toThrowError(
            `Unsupported SearchExpressionPart: ${JSON.stringify(invalidPart)}`,
        );
    });
});

describe('SearchExpressionBuilder - Extended Edge Cases', () => {
    describe('Special Characters in Terms and Phrases', () => {
        it.each([
            ['term with +', 'term+'],
            ['term with -', 'term-'],
            ['term with =', 'term='],
            ['term with !', 'term!'],
            ['term with (', 'term('],
            ['term with )', 'term)'],
            ['term with @', 'term@'],
            ['term with %', 'term%'],
            ['term with $', 'term$'],
            ['term with *', 'term*'],
            ['term with ?', 'term?'],
            ['term with _', 'term_'],
            ['term with .', 'term.'],
            ['term with /', 'term/'],
            ['term with \\', 'term\\'],
            ['phrase with special chars', 'phrase with +-=!@#$%^*?_./\\'],
        ])('should handle special characters in %s', (_description, input) => {
            const builder = new SearchExpressionBuilder().term(input);
            expect(builder.toString()).toBe(input); // Terms are not quoted, so special chars should be as is.
        });

        it('should handle special characters in phrases correctly quoted', () => {
            const phraseInput = 'phrase with +-=!@#$%^*?_./\\';
            const builder = new SearchExpressionBuilder().phrase(phraseInput);
            expect(builder.toString()).toBe(`"${phraseInput}"`);
        });
    });

    describe('Whitespace Handling', () => {
        it.each([
            ['leading whitespace in term', '  term', 'term'],
            ['trailing whitespace in term', 'term  ', 'term'],
            ['leading and trailing whitespace in term', '  term  ', 'term'],
            [
                'multiple spaces in term',
                'term   with   spaces',
                'term   with   spaces',
            ], // Terms keep spaces
            ['leading whitespace in phrase', '  phrase', '"phrase"'],
            ['trailing whitespace in phrase', 'phrase  ', '"phrase"'],
            [
                'leading and trailing whitespace in phrase',
                '  phrase  ',
                '"phrase"',
            ],
            [
                'multiple spaces in phrase',
                'phrase   with   spaces',
                '"phrase   with   spaces"',
            ], // Phrases keep spaces
            [
                'multiple spaces between parts',
                'term1   AND   term2',
                'term1 AND term2',
            ], // Operators are trimmed
        ])('should handle %s', (description, input, expectedOutput) => {
            if (description.includes('parts')) {
                const parts = input.split('   '); // Split by multiple spaces for this specific test case
                const builder = new SearchExpressionBuilder()
                    .term(parts[0] as string)
                    .and()
                    .term(parts[2] as string); // Assuming AND operator
                expect(builder.toString()).toBe(expectedOutput);
            } else if (description.includes('phrase')) {
                const builder = new SearchExpressionBuilder().phrase(input);
                expect(builder.toString()).toBe(expectedOutput);
            } else {
                // Term tests
                const builder = new SearchExpressionBuilder().term(input);
                expect(builder.toString()).toBe(expectedOutput);
            }
        });
    });

    describe('Very Long Search Expressions (Basic Test - More Robustness needed for real stress test)', () => {
        it('should handle a long, nested search expression without errors (basic)', () => {
            let builder = new SearchExpressionBuilder();
            for (let i = 0; i < 50; i++) {
                // Just a moderate length for a basic test
                builder = builder.and().term(`term${i}`);
            }
            expect(() => builder.toString()).not.toThrow(); // Check no error thrown
            expect(builder.toString().length).toBeGreaterThan(100); // Just verify it's a long string
        });
    });
});
