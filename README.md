# odata-builder

Generate Typesafe OData Queries with Ease. odata-builder ensures your queries are correct as you write them, eliminating worries about incorrect query formats.

[![build and test](https://github.com/nbyx/odata-builder/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/nbyx/odata-builder/actions/workflows/ci-cd.yml)
[![npm version](https://badge.fury.io/js/odata-builder.svg)](https://www.npmjs.com/package/odata-builder)

> **What you get**
>
> - Fully type-safe OData v4.01 query generation
> - Compile-time validation for filters and search expressions
> - Fluent builder and serializable object syntax
>
> **What you need to know**
>
> - `in()` requires OData 4.01 (legacy fallback available)
> - `has()` requires a valid OData enum literal (raw passthrough)
> - Server support for `not` may vary

## Install

```bash
npm install --save odata-builder
```

or

```bash
yarn add odata-builder
```

## Quick Start

```typescript
import { OdataQueryBuilder } from 'odata-builder';

interface User {
    name: string;
    age: number;
}

new OdataQueryBuilder<User>()
    .filter(f => f.where(x => x.name.eq('John')))
    .select('name', 'age')
    .orderBy({ field: 'name', orderDirection: 'asc' })
    .top(10)
    .toQuery();
// ?$filter=name eq 'John'&$select=name,age&$orderby=name asc&$top=10
```

---

## Filter Syntax

odata-builder offers two equivalent ways to build filters - both with full IntelliSense and type safety:

| Approach          | Style                    |
| ----------------- | ------------------------ |
| **FilterBuilder** | Fluent, chainable        |
| **Object Syntax** | Declarative, data-driven |

Both produce identical OData queries. The FilterBuilder internally creates the same filter objects, making them fully interchangeable.

---

### FilterBuilder

```typescript
// Complex filter with AND/OR
new OdataQueryBuilder<User>()
    .filter(f =>
        f
            .where(x => x.name.contains('John'))
            .and(x => x.age.gt(18))
            .or(x => x.isActive.isTrue()),
    )
    .toQuery();
// ?$filter=((contains(name, 'John') and age gt 18) or isActive eq true)

// Array filtering with lambda expressions
new OdataQueryBuilder<User>()
    .filter(f => f.where(x => x.tags.any(t => t.s.eq('admin'))))
    .toQuery();
// ?$filter=tags/any(s: s eq 'admin')
```

### Object Syntax

```typescript
// Complex filter with AND/OR
new OdataQueryBuilder<User>()
    .filter({
        logic: 'or',
        filters: [
            {
                logic: 'and',
                filters: [
                    { field: 'name', operator: 'contains', value: 'John' },
                    { field: 'age', operator: 'gt', value: 18 },
                ],
            },
            { field: 'isActive', operator: 'eq', value: true },
        ],
    })
    .toQuery();
// ?$filter=((contains(name, 'John') and age gt 18) or isActive eq true)

// Array filtering with lambda expressions
new OdataQueryBuilder<User>()
    .filter({
        field: 'tags',
        lambdaOperator: 'any',
        expression: {
            field: 's',
            operator: 'eq',
            value: 'admin',
        },
    })
    .toQuery();
// ?$filter=tags/any(s: s eq 'admin')
```

---

## Key Features

### `in` Operator

Membership testing for values in a list (OData 4.01):

```typescript
new OdataQueryBuilder<User>()
    .filter(f => f.where(x => x.name.in(['John', 'Jane', 'Bob'])))
    .toQuery();
// ?$filter=name in ('John', 'Jane', 'Bob')

// For OData 4.0 servers: use legacyInOperator option
new OdataQueryBuilder<User>({ legacyInOperator: true })
    .filter(f => f.where(x => x.name.in(['John', 'Jane'])))
    .toQuery();
// ?$filter=(name eq 'John' or name eq 'Jane')
```

### `not` Operator

Negate any filter expression:

```typescript
new OdataQueryBuilder<User>()
    .filter(f => f.where(x => x.name.contains('test')).not())
    .toQuery();
// ?$filter=not (contains(name, 'test'))

new OdataQueryBuilder<User>()
    .filter(f =>
        f
            .where(x => x.name.eq('John'))
            .and(x => x.age.gt(18))
            .not(),
    )
    .toQuery();
// ?$filter=not ((name eq 'John' and age gt 18))
```

> **Note**: `not()` always negates the entire current filter expression, not just the last condition.

### `has` Operator

Check for enum flag values:

```typescript
new OdataQueryBuilder<Product>()
    .filter(f => f.where(x => x.style.has("Sales.Color'Yellow'")))
    .toQuery();
// ?$filter=style has Sales.Color'Yellow'
```

> **Important**: `has()` does not validate enum literals. You must provide a valid OData enum literal (e.g. `Namespace.EnumType'Value'`). The value is passed through unchanged.

---

## Advanced Filtering

### String Operations

```typescript
// Case-insensitive contains
f.where(x => x.name.ignoreCase().contains('john'));
// contains(tolower(name), 'john')

// String transforms
f.where(x => x.name.tolower().trim().eq('john'));
// trim(tolower(name)) eq 'john'

// String functions
f.where(x => x.name.length().gt(5));
// length(name) gt 5

f.where(x => x.name.substring(0, 3).eq('Joh'));
// substring(name, 0, 3) eq 'Joh'
```

### Number Operations

```typescript
// Arithmetic
f.where(x => x.price.mul(1.1).lt(100));
// price mul 1.1 lt 100

// Rounding
f.where(x => x.score.round().eq(5));
// round(score) eq 5
```

### Date Operations

```typescript
// Extract date parts
f.where(x => x.createdAt.year().eq(2024));
// year(createdAt) eq 2024

f.where(x => x.createdAt.month().ge(6));
// month(createdAt) ge 6
```

### Lambda Expressions

Filter array fields with `any` and `all`:

```typescript
// Simple array with contains
new OdataQueryBuilder<User>()
    .filter({
        field: 'tags',
        lambdaOperator: 'any',
        expression: {
            field: 's',
            operator: 'eq',
            value: true,
            ignoreCase: true,
            function: {
                type: 'contains',
                value: 'test',
            },
        },
    })
    .toQuery();
// ?$filter=tags/any(s: contains(tolower(s), 'test'))

// Array of objects
new OdataQueryBuilder<User>()
    .filter({
        field: 'addresses',
        lambdaOperator: 'any',
        expression: {
            field: 'city',
            operator: 'eq',
            value: 'Berlin',
        },
    })
    .toQuery();
// ?$filter=addresses/any(s: s/city eq 'Berlin')
```

---

## Search

### Simple Search

```typescript
new OdataQueryBuilder<User>().search('simple search term').toQuery();
// ?$search=simple%20search%20term
```

### SearchExpressionBuilder

For complex search requirements:

```typescript
import { SearchExpressionBuilder } from 'odata-builder';

new OdataQueryBuilder<User>()
    .search(
        new SearchExpressionBuilder()
            .term('red')
            .and()
            .term('blue')
            .or()
            .group(
                new SearchExpressionBuilder()
                    .term('green')
                    .not(new SearchExpressionBuilder().term('yellow')),
            ),
    )
    .toQuery();
// ?$search=(red%20AND%20blue%20OR%20(green%20AND%20(NOT%20yellow)))
```

**Methods**: `term()`, `phrase()`, `and()`, `or()`, `not()`, `group()`

---

## Query Options

### select

Choose which properties to return. Supports nested paths:

```typescript
new OdataQueryBuilder<User>()
    .select('name', 'address/city', 'address/zip')
    .toQuery();
// ?$select=name,address/city,address/zip
```

### expand

Include related entities. Supports nested paths and **subqueries** with `$select`, `$filter`, `$orderby`, `$top`, `$skip`, `$count`, `$search`, and nested `$expand`:

```typescript
// Simple expand
new OdataQueryBuilder<User>().expand('company', 'company/address').toQuery();
// ?$expand=company, company/address

// Expand with subquery options
new OdataQueryBuilder<User>()
    .expand({
        company: {
            select: ['name', 'location'],
            filter: f => f.where(x => x.name.contains('Corp')),
            orderBy: [{ field: 'name', orderDirection: 'asc' }],
            top: 5,
        },
    })
    .toQuery();
// ?$expand=company($select=name, location;$filter=contains(name, 'Corp');$orderby=name asc;$top=5)

// Nested expand with subqueries (deeply nested)
new OdataQueryBuilder<User>()
    .expand({
        company: {
            select: ['name'],
            expand: [
                {
                    address: {
                        select: ['city', 'zip'],
                    },
                },
            ],
        },
    })
    .toQuery();
// ?$expand=company($select=name;$expand=address($select=city, zip))

// Mix simple and subquery expands
new OdataQueryBuilder<User>()
    .expand('company/address', {
        orders: {
            top: 10,
            orderBy: [{ field: 'date', orderDirection: 'desc' }],
        },
    })
    .toQuery();
// ?$expand=company/address, orders($top=10;$orderby=date desc)
```

**Subquery options**: `select`, `filter`, `orderBy`, `top`, `skip`, `levels`, `count`, `search`, `expand`

### orderBy

Sort results:

```typescript
new OdataQueryBuilder<User>()
    .orderBy({ field: 'name', orderDirection: 'asc' })
    .orderBy({ field: 'age', orderDirection: 'desc' })
    .toQuery();
// ?$orderby=name asc,age desc
```

### top / skip

Pagination:

```typescript
new OdataQueryBuilder<User>().top(10).skip(20).toQuery();
// ?$top=10&$skip=20
```

### count

Include total count:

```typescript
new OdataQueryBuilder<User>().count().toQuery();
// ?$count=true

// Count endpoint only
new OdataQueryBuilder<User>().count(true).toQuery();
// /$count
```

---

## GUID Handling

Whether a GUID-formatted value must be sent quoted or unquoted depends on the backend property type: `Edm.Guid` literals are unquoted per spec ([URL Conventions, 5.1.1.14.1](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html)), while `Edm.String` properties that happen to contain GUID-formatted values need quotes. TypeScript types are erased at runtime, so the builder cannot detect this. Quoting is therefore always explicit:

```typescript
import { Guid, OdataQueryBuilder } from 'odata-builder';

interface Entity {
    id: Guid;
}

// Edm.Guid property: use removeQuotes()
new OdataQueryBuilder<Entity>()
    .filter(f =>
        f.where(x =>
            x.id
                .removeQuotes()
                .eq('f92477a9-5761-485a-b7cd-30561e2f888b' as Guid),
        ),
    )
    .toQuery();
// ?$filter=id eq f92477a9-5761-485a-b7cd-30561e2f888b

// Works for in() as well
new OdataQueryBuilder<Entity>()
    .filter(f => f.where(x => x.id.removeQuotes().in(['f92477a9-...' as Guid])))
    .toQuery();
// ?$filter=id in (f92477a9-...)
```

Without `removeQuotes` (or `removeQuotes: true` in object syntax), string values are always quoted, which is the safe default for `Edm.String` properties.

---

## OData v4.01 Spec Coverage

Coverage of [OData v4.01 Part 2: URL Conventions](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html), audited per chapter. "Spec" columns reference section numbers of that document.

### System query options

| Query option                          | Spec        | Status          | Notes                                                                                                                             |
| ------------------------------------- | ----------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `$filter`                             | 5.1.2       | ✅              | Fluent `FilterBuilder` + object syntax                                                                                            |
| `$expand`                             | 5.1.3       | ✅              | Nested paths and subqueries (`$select`, `$filter`, `$orderby`, `$top`, `$skip`, `$levels`, `$count`, `$search`, nested `$expand`) |
| `$select`                             | 5.1.4       | ✅              | Nested paths via `/`                                                                                                              |
| `$orderby`                            | 5.1.5       | ✅              | Multiple fields, `asc`/`desc`, nested paths                                                                                       |
| `$top` / `$skip`                      | 5.1.6       | ✅              | `$top=0` is emitted (returns no items)                                                                                            |
| `$count`                              | 5.1.7       | ✅              | Both `$count=true` and the `/$count` path segment (4.8)                                                                           |
| `$search`                             | 5.1.8       | ✅              | Terms, phrases, `AND`/`OR`/`NOT`, grouping via `SearchExpressionBuilder`                                                          |
| `$compute`                            | 5.1.10      | ❌ Out of scope |                                                                                                                                   |
| `$apply`                              | n/a         | ❌ Out of scope | Part of the separate OASIS Data Aggregation extension, not of the URL Conventions                                                 |
| `$format`, `$index`, `$schemaversion` | 5.1.9/11/12 | ❌ Out of scope | Server/transport concerns, set them on the URL yourself                                                                           |

### $filter operators

| Feature                   | Spec                  | Status | Notes                                                                  |
| ------------------------- | --------------------- | ------ | ---------------------------------------------------------------------- |
| `eq ne gt ge lt le`       | 5.1.1.1.1–6           | ✅     | Ordering operators also allowed on strings (v4.01)                     |
| `and` / `or` + precedence | 5.1.1.1.7–8, 5.1.1.17 | ✅     | `and` binds stronger than `or`; use `group()` for explicit grouping    |
| `not`                     | 5.1.1.1.9             | ✅     | Always parenthesized                                                   |
| `has`                     | 5.1.1.1.10            | ✅     | Enum literal passed through verbatim                                   |
| `in`                      | 5.1.1.1.11            | ✅     | v4.01 syntax; `legacyInOperator` renders an `or`-chain for 4.0 servers |
| `add sub mul div mod`     | 5.1.1.2               | ✅     | Via arithmetic chaining on number fields                               |
| `divby`                   | 5.1.1.2.5             | ❌     | v4.01 decimal division not exposed                                     |
| Unary negation (`-x`)     | 5.1.1.2.3             | ❌     | Negate the literal instead                                             |

### Canonical functions

| Feature                                                                     | Spec      | Status          | Notes                                                           |
| --------------------------------------------------------------------------- | --------- | --------------- | --------------------------------------------------------------- |
| `concat contains endswith indexof length startswith substring`              | 5.1.1.5   | ✅              | `concat` with multiple values nests binary calls                |
| `tolower toupper trim`                                                      | 5.1.1.7   | ✅              | Chainable transforms                                            |
| `matchesPattern`                                                            | 5.1.1.7.1 | ❌              |                                                                 |
| `year month day hour minute second date time now`                           | 5.1.1.8   | ✅              |                                                                 |
| `fractionalseconds totalseconds totaloffsetminutes mindatetime maxdatetime` | 5.1.1.8   | ❌              |                                                                 |
| `round floor ceiling`                                                       | 5.1.1.9   | ✅              |                                                                 |
| `cast` / `isof`                                                             | 5.1.1.10  | ❌ Out of scope |                                                                 |
| `hassubset` / `hassubsequence`                                              | 5.1.1.6   | ❌              |                                                                 |
| Geo functions                                                               | 5.1.1.11  | ❌ Out of scope |                                                                 |
| `case`                                                                      | 5.1.1.12  | ❌              |                                                                 |
| `any` / `all` lambdas                                                       | 5.1.1.13  | ✅              | Nested lambdas supported; parameters are auto-named `s`, `t`, … |

### Literals

| Feature                            | Spec         | Status     | Notes                                                                                                                     |
| ---------------------------------- | ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| Strings (`''` escaping)            | 5.1.1.14.1   | ✅         | `O'Reilly` → `'O''Reilly'`                                                                                                |
| GUIDs (unquoted)                   | 5.1.1.14.1   | ✅         | Explicit via `removeQuotes()`; default is quoted because `Edm.Guid` vs. GUID-in-`Edm.String` is not detectable at runtime |
| `Edm.DateTimeOffset`               | 5.1.1.14.1   | ✅         | ISO 8601 via `Date.toISOString()`                                                                                         |
| Numbers incl. `INF`, `-INF`, `NaN` | 5.1.1.14.1   | ✅         |                                                                                                                           |
| `null`                             | 5.1.1.14.3   | ✅         |                                                                                                                           |
| Enums                              | 5.1.1.14.1   | ⚠️ Partial | Via `has` or `removeQuotes`; no dedicated enum type                                                                       |
| Duration / binary literals         | 5.1.1.14.1   | ❌         |                                                                                                                           |
| Collections in `in (...)`          | 5.1.1.14.2   | ✅         |                                                                                                                           |
| `$it`, `$root`, `$this`            | 5.1.1.14.4–6 | ❌         | Lambda parameters are generated (`s`, `t`, …)                                                                             |
| Parameter aliases (`@p`)           | 5.1.1.15     | ❌         |                                                                                                                           |

### URL encoding boundary

The builder emits a **readable** query string: spaces and quotes inside expression values are not percent-encoded (`$search` is the one exception, it is fully encoded). Pass the result through `new URL(...)`, your HTTP client, or `encodeURI` before sending it raw over the wire. All common clients (fetch, axios, Angular HttpClient) handle this automatically.

---

## Server Compatibility

| Feature        | OData Version | Notes                             |
| -------------- | ------------- | --------------------------------- |
| `in` operator  | 4.01          | Use `legacyInOperator` for 4.0    |
| `not` operator | 4.0+          | Some servers have limited support |
| `has` operator | 4.0+          | Requires correct enum literal     |

Check your server's `$metadata` endpoint or try a feature probe query. If `in` returns 400, switch to legacy mode.

---

## Design Principles

- Type safety over runtime validation
- Explicit over implicit behavior
- Server compatibility over clever syntax
- No hidden query rewriting

---

## Contributing

Your contributions are welcome! If there's a feature you'd like to see in odata-builder, or if you encounter any issues, please feel free to open an issue or submit a pull request.
