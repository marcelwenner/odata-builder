# odata-builder

Generate Typesafe OData Queries with Ease. odata-builder ensures your queries are correct as you write them, eliminating worries about incorrect query formats.

[![build and test](https://github.com/nbyx/odata-builder/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/nbyx/odata-builder/actions/workflows/ci-cd.yml)
[![npm version](https://badge.fury.io/js/odata-builder.svg)](https://www.npmjs.com/package/odata-builder)

> **What you get**
>
> -   Fully type-safe OData v4.01 query generation
> -   Compile-time validation for filters and search expressions
> -   Fluent builder and serializable object syntax
>
> **What you need to know**
>
> -   `in()` requires OData 4.01 (legacy fallback available)
> -   `has()` requires a valid OData enum literal (raw passthrough)
> -   Server support for `not` may vary

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
        operator: 'eq',
        value: 'admin',
        lambdaOperator: 'any',
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
// Simple array
new OdataQueryBuilder<User>()
    .filter({
        field: 'tags',
        operator: 'contains',
        value: 'test',
        lambdaOperator: 'any',
        ignoreCase: true,
    })
    .toQuery();
// ?$filter=tags/any(s: contains(tolower(s), 'test'))

// Array of objects
new OdataQueryBuilder<User>()
    .filter({
        field: 'addresses',
        operator: 'eq',
        value: 'Berlin',
        lambdaOperator: 'any',
        innerProperty: 'city',
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

Include related entities. Supports nested paths:

```typescript
new OdataQueryBuilder<User>().expand('company', 'company/address').toQuery();
// ?$expand=company,company/address
```

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

```typescript
import { Guid, OdataQueryBuilder } from 'odata-builder';

interface Entity {
    id: Guid;
}

new OdataQueryBuilder<Entity>()
    .filter({
        field: 'id',
        operator: 'eq',
        value: 'f92477a9-5761-485a-b7cd-30561e2f888b',
        removeQuotes: true,
    })
    .toQuery();
// ?$filter=id eq f92477a9-5761-485a-b7cd-30561e2f888b
```

> Most OData servers accept GUIDs without quotes. If your server requires quoted GUIDs, omit `removeQuotes`.

---

## Server Compatibility

| Feature        | OData Version | Notes                          |
| -------------- | ------------- | ------------------------------ |
| `in` operator  | 4.01          | Use `legacyInOperator` for 4.0 |
| `not` operator | 4.0+          | Some servers have limited support |
| `has` operator | 4.0+          | Requires correct enum literal  |

Check your server's `$metadata` endpoint or try a feature probe query. If `in` returns 400, switch to legacy mode.

---

## Design Principles

-   Type safety over runtime validation
-   Explicit over implicit behavior
-   Server compatibility over clever syntax
-   No hidden query rewriting

---

## Contributing

Your contributions are welcome! If there's a feature you'd like to see in odata-builder, or if you encounter any issues, please feel free to open an issue or submit a pull request.
