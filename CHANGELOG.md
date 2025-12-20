# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
