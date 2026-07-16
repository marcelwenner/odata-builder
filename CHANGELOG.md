# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-16

### Added

- **Subquery support for `expand()`** with full OData system query options
    - Supports `$select`, `$filter`, `$orderby`, `$top`, `$skip`, `$count`, `$search`, and nested `$expand`
    - Mix simple string paths and subquery objects in a single call
    - Deeply nested expand with recursive subquery options
    - New exported types: `ExpandInput`, `ExpandSubQueryOptions`, `ExpandWithSubQuery`, `TopLevelExpandFields`

    ```typescript
    builder.expand({
        orders: {
            select: ['id', 'total'],
            filter: f => f.where(x => x.total.gt(100)),
            top: 5,
            expand: [{ items: { select: ['name', 'price'] } }],
        },
    });
    // $expand=orders($select=id, total;$filter=total gt 100;$top=5;$expand=items($select=name, price))
    ```

- `$levels` subquery option for `expand()` (`levels: 3` or `levels: 'max'`)
- `INF`, `-INF` and `NaN` literals for non-finite numbers (OData v4.01 URL Conventions 5.1.1.14.1)
- Field references (`{ fieldReference: '...' }`) render as property paths in function arguments, enabling field-to-field comparisons like `contains(name, id)`

### Changed

- **GUID quoting is now always explicit**: `in()` no longer auto-unquotes GUID-formatted strings (values are quoted by default, like everywhere else). Use `removeQuotes()` (fluent) or `removeQuotes: true` (object syntax) for `Edm.Guid` properties; this now works for `in` filters too. Rationale: `Edm.Guid` properties need unquoted literals (URL Conventions 5.1.1.14.1), but `Edm.String` properties containing GUID-formatted values need quotes, and the runtime cannot tell them apart.
- Ordering operators (`gt`/`ge`/`lt`/`le`) are now accepted for GUID values (URL Conventions 5.1.1.1.3 allows them for all primitives except binary/stream/geo)
- `concat()` with multiple values now nests binary calls (`concat(concat(name, ' '), 'x')`), because the OData `concat` function takes exactly two arguments (5.1.1.5.1)
- `top(0)` / `skip(0)` are now emitted as `$top=0` / `$skip=0` instead of being dropped; `$top=0` is a valid query that returns no items (5.1.6)

### Fixed

- Legacy OData v2 operator `substringof` (and function names) no longer accepted as infix operators in object-syntax filters; they rendered invalid queries like `name substringof 'x'`
- Empty `in` filters via object syntax now throw instead of rendering invalid `field in ()`
- Chained date transforms on a `Date` value (e.g. `transform: ['year', 'month']`) now throw instead of silently producing wrong values
- Negative `top`/`skip` in expand subqueries now throw (consistent with top-level behavior)

## [1.0.0] - 2025-12-20

### Added

- **Nested property paths for `select()`** with full IntelliSense support
    - Type-safe selection of nested properties using `/` separator
    - Consistent with `orderBy()` and `expand()` APIs

    ```typescript
    builder.select('name', 'address/city', 'address/zip');
    // Output: $select=name, address/city, address/zip
    ```

- **`in` operator** for membership testing (OData 4.01)
    - Supports strings, numbers, booleans, dates, and GUIDs
    - Proper escaping for special characters (e.g., `O'Reilly` → `'O''Reilly'`)
    - Legacy mode for OData 4.0 servers via `legacyInOperator` option

    ```typescript
    // OData 4.01 (default)
    builder.filter(f => f.where(x => x.status.in(['active', 'pending'])));
    // Output: status in ('active', 'pending')

    // Legacy mode for OData 4.0
    new OdataQueryBuilder<User>({ legacyInOperator: true }).filter(f =>
        f.where(x => x.status.in(['active', 'pending'])),
    );
    // Output: (status eq 'active' or status eq 'pending')
    ```

- **`not` operator** for filter negation
    - Negates any filter expression with correct precedence
    - Chainable for complex filter compositions

    ```typescript
    builder.filter(f => f.where(x => x.name.contains('test')).not());
    // Output: not (contains(name, 'test'))
    ```

- **`has` operator** for enum flag checking
    - Raw passthrough of enum literals for maximum server compatibility
    - Works with namespace-qualified enum values

    ```typescript
    builder.filter(f => f.where(x => x.style.has("Sales.Color'Yellow'")));
    // Output: style has Sales.Color'Yellow'
    ```

- **Fluent FilterBuilder API** with type-safe field access
    - Full IntelliSense support for all field operations
    - String operations: `contains`, `startswith`, `endswith`, `tolower`, `toupper`, `trim`
    - Number operations: `add`, `sub`, `mul`, `div`, `mod`, `round`, `floor`, `ceiling`
    - Date operations: `year`, `month`, `day`, `hour`, `minute`, `second`
    - Boolean shortcuts: `isTrue()`, `isFalse()`
    - Comparison: `eq`, `ne`, `gt`, `ge`, `lt`, `le`
    - Lambda expressions: `any`, `all` for array filtering

- **Comprehensive JSDoc documentation** for all public APIs
    - `OdataQueryBuilder` with usage examples
    - `SearchExpressionBuilder` with all methods documented
    - `FilterBuilder` with type-safe examples

### Fixed

- **UUID validation** now accepts UUIDv7 (RFC 9562)
    - Previously only accepted UUID v1-5
    - Now accepts all valid UUID formats including .NET `Guid.CreateVersion7()`

### Changed

- Improved type inference for nullable fields
    - `eq(null)` only available on `T | null` fields
    - Literal string unions preserved for better autocomplete

## [0.x.x] - Previous Releases

See commit history for earlier changes.
