import {
    NegatedFilter,
    QueryFilter,
} from '../../types/filter/query-filter.type';
import { CombinedFilter } from '../../types/filter/combined-filter.type';
import {
    FilterInput,
    FilterPart,
    FilterBuilderLike,
} from './filter-builder.types';
import { createFieldProxy } from './field-proxy';

// ============================================================================
// FilterBuilder - Fluent API for building type-safe OData filters
// ============================================================================

/**
 * FilterBuilder provides a fluent, type-safe API for building OData filters.
 *
 * @example
 * // Simple filter
 * new FilterBuilder<User>()
 *     .where(x => x.name.eq('John'))
 *     .build();
 *
 * @example
 * // Complex filter with AND/OR
 * new FilterBuilder<User>()
 *     .where(x => x.name.eq('John'))
 *     .and(x => x.age.gt(18))
 *     .or(x => x.isAdmin.isTrue())
 *     .build();
 *
 * @example
 * // Composing filters
 * const activeFilter = new FilterBuilder<User>().where(x => x.isActive.isTrue());
 * new FilterBuilder<User>()
 *     .where(x => x.name.eq('John'))
 *     .and(activeFilter)
 *     .build();
 */
export class FilterBuilder<T> implements FilterBuilderLike<T> {
    private readonly parts: ReadonlyArray<FilterPart<T>>;

    constructor(parts: FilterPart<T>[] = []) {
        this.parts = parts;
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Starts a new filter condition.
     * This is typically the first method called when building a filter.
     *
     * @param input - Either a predicate function or another FilterBuilder
     * @returns A new FilterBuilder with the condition added
     *
     * @example
     * new FilterBuilder<User>().where(x => x.name.eq('John'))
     */
    where(input: FilterInput<T>): FilterBuilder<T> {
        const filter = this.resolveInput(input);
        if (!filter) {
            return this;
        }

        return new FilterBuilder<T>([
            ...this.parts,
            { filter },
        ]);
    }

    /**
     * Adds an AND condition to the filter.
     *
     * @param input - Either a predicate function or another FilterBuilder
     * @returns A new FilterBuilder with the AND condition added
     *
     * @example
     * builder.where(x => x.name.eq('John')).and(x => x.age.gt(18))
     */
    and(input: FilterInput<T>): FilterBuilder<T> {
        if (this.parts.length === 0) {
            throw new Error(
                'FilterBuilder: Cannot use .and() on empty builder. Use .where() first.',
            );
        }

        const filter = this.resolveInput(input);
        if (!filter) {
            return this;
        }

        return new FilterBuilder<T>([
            ...this.parts,
            { logic: 'and', filter },
        ]);
    }

    /**
     * Adds an OR condition to the filter.
     *
     * @param input - Either a predicate function or another FilterBuilder
     * @returns A new FilterBuilder with the OR condition added
     *
     * @example
     * builder.where(x => x.name.eq('John')).or(x => x.name.eq('Jane'))
     */
    or(input: FilterInput<T>): FilterBuilder<T> {
        if (this.parts.length === 0) {
            throw new Error(
                'FilterBuilder: Cannot use .or() on empty builder. Use .where() first.',
            );
        }

        const filter = this.resolveInput(input);
        if (!filter) {
            return this;
        }

        return new FilterBuilder<T>([
            ...this.parts,
            { logic: 'or', filter },
        ]);
    }

    /**
     * Negates the entire current filter expression.
     *
     * @returns A new FilterBuilder with the negated filter
     * @throws Error if called on an empty builder
     *
     * @example
     * // not (name eq 'John')
     * builder.where(x => x.name.eq('John')).not()
     *
     * @example
     * // not (name eq 'John' and age gt 18)
     * builder.where(x => x.name.eq('John')).and(x => x.age.gt(18)).not()
     */
    not(): FilterBuilder<T> {
        if (this.parts.length === 0) {
            throw new Error(
                'FilterBuilder: Cannot use .not() on empty builder. Use .where() first.',
            );
        }

        const currentFilter = this.build();
        if (!currentFilter) {
            throw new Error(
                'FilterBuilder: Cannot negate empty filter expression.',
            );
        }

        const negatedFilter: NegatedFilter<T> = {
            type: 'not',
            filter: currentFilter,
        };

        return new FilterBuilder<T>([{ filter: negatedFilter }]);
    }

    /**
     * Creates a grouped sub-expression.
     * Useful for controlling operator precedence.
     *
     * @param builder - A FilterBuilder to group
     * @returns A new FilterBuilder representing the grouped expression
     *
     * @example
     * // (name eq 'John' and age gt 18) or isAdmin eq true
     * builder
     *     .where(builder.group(
     *         new FilterBuilder<User>()
     *             .where(x => x.name.eq('John'))
     *             .and(x => x.age.gt(18))
     *     ))
     *     .or(x => x.isAdmin.isTrue())
     */
    group(builder: FilterBuilder<T>): FilterBuilder<T> {
        const result = builder.build();
        if (!result) {
            throw new Error(
                'FilterBuilder: Cannot group empty FilterBuilder. Add at least one condition.',
            );
        }

        // Return a new builder with just this grouped filter
        return new FilterBuilder<T>([{ filter: result }]);
    }

    /**
     * Builds the final filter object.
     * Returns null if no conditions have been added.
     *
     * @returns QueryFilter<T> | CombinedFilter<T> | null
     */
    build(): QueryFilter<T> | CombinedFilter<T> | null {
        if (this.parts.length === 0) {
            return null;
        }

        if (this.parts.length === 1) {
            const first = this.parts[0];
            if (first) return first.filter;
        }

        // Multiple parts - need to combine them respecting operator precedence
        // OData evaluates AND before OR, so we need to group AND operations together
        return this.buildWithPrecedence();
    }

    /**
     * Builds all filters as an array (useful for the existing filter() method).
     *
     * @returns Array of QueryFilter<T> | CombinedFilter<T>
     */
    buildArray(): Array<QueryFilter<T> | CombinedFilter<T>> {
        const result = this.build();
        return result ? [result] : [];
    }

    /**
     * Checks if the builder has any conditions.
     */
    isEmpty(): boolean {
        return this.parts.length === 0;
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    /**
     * Resolves a FilterInput to a QueryFilter or CombinedFilter.
     */
    private resolveInput(
        input: FilterInput<T>,
    ): QueryFilter<T> | CombinedFilter<T> | null {
        // Handle FilterBuilder-like objects
        if (this.isFilterBuilderLike(input)) {
            return input.build();
        }

        // Handle predicate functions
        if (typeof input !== 'function') {
            throw new Error(
                'FilterBuilder: Expected a predicate function (x => x.field.eq(value)) or a FilterBuilder instance.',
            );
        }

        const predicate = input;
        const proxy = createFieldProxy<T>();
        const result = predicate(proxy);

        if (!result || result._type !== 'expression') {
            throw new Error(
                'FilterBuilder: Predicate must return a filter expression. ' +
                    'Did you forget to call an operation like .eq(), .contains(), etc.?',
            );
        }

        return result._filter;
    }

    /**
     * Type guard for FilterBuilderLike objects.
     */
    private isFilterBuilderLike(
        input: FilterInput<T>,
    ): input is FilterBuilderLike<T> {
        return (
            typeof input === 'object' &&
            input !== null &&
            'build' in input &&
            typeof input.build === 'function'
        );
    }

    /**
     * Builds the filter tree respecting operator precedence.
     * AND has higher precedence than OR.
     */
    private buildWithPrecedence(): QueryFilter<T> | CombinedFilter<T> {
        // Group consecutive AND operations together
        const orGroups: Array<QueryFilter<T> | CombinedFilter<T>>[] = [];
        let currentAndGroup: Array<QueryFilter<T> | CombinedFilter<T>> = [];

        for (const part of this.parts) {
            if (part.logic === 'or') {
                // Save current AND group and start a new one
                if (currentAndGroup.length > 0) {
                    orGroups.push(currentAndGroup);
                }
                currentAndGroup = [part.filter];
            } else {
                // AND or first element - add to current group
                currentAndGroup.push(part.filter);
            }
        }

        // Don't forget the last group
        if (currentAndGroup.length > 0) {
            orGroups.push(currentAndGroup);
        }

        // Combine AND groups
        const combinedAndGroups: Array<QueryFilter<T> | CombinedFilter<T>> =
            orGroups.flatMap(group => {
                if (group.length === 1) {
                    const first = group[0];
                    return first ? [first] : [];
                }
                return [
                    {
                        logic: 'and' as const,
                        filters: group,
                    },
                ];
            });

        // Combine with OR
        if (combinedAndGroups.length === 1) {
            const first = combinedAndGroups[0];
            if (first) return first;
        }

        return {
            logic: 'or' as const,
            filters: combinedAndGroups,
        };
    }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new FilterBuilder instance.
 * This is a convenience function that can be used instead of `new FilterBuilder<T>()`.
 *
 * @example
 * import { filter } from './filter-builder';
 * const f = filter<User>().where(x => x.name.eq('John'));
 */
export function filter<T>(): FilterBuilder<T> {
    return new FilterBuilder<T>();
}
