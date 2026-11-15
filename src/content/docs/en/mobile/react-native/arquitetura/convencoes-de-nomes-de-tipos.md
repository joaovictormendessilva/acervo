---
title: Type naming conventions
description: How to name TypeScript types (domain model, API response, props, parameters) and why to use type everywhere.
tecnologia: typescript
versao_testada: TypeScript 6.0
atualizado_em: 2026-11-14
fontes:
  - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces
sidebar:
  order: 2
---

## What it is

The pattern I use to name types. The main rule: **the domain model keeps the plain name, and anything that's a variation of it gets a suffix that says its role.**

| Role | Convention | Example |
| --- | --- | --- |
| Domain model | plain name | `Product` |
| Raw API response | `Response` suffix | `ProductResponse` |
| Component props | `Props` suffix | `ProductCardProps` |
| Function input | `Params` suffix | `GetProductsParams` |
| Function output | `Result` suffix | `GetProductsResult` |
| Union of possible values | name of the concept | `ProductCategory` |

And everything is declared with `type`, never with `interface`.

## When to use

- In any TypeScript project, from the start.
- When the same concept shows up in several shapes (what comes from the API, what the app uses, what the component receives) and you need to tell which shape you're looking at just from the name.

## Why the model has no suffix

The domain model is **the concept itself**: `Product` is the product, with the names and types your app uses. In DDD (Domain-Driven Design) this is called *ubiquitous language*, because the type uses the same word you'd use when talking about the app ("the product has a name and a price").

The other shapes derive from it, and the suffix answers "derived from what?":

- `ProductResponse` is the shape **someone else** defined (the API).
- `ProductCardProps` is what **a component** receives.

Context also comes from the import path, which says where the type is from:

```ts
import { Product } from "@/features/products/product-types";
```

## Step by step

### 1. The domain model, with the plain name

```ts title="src/features/products/product-types.ts"
export type ProductCategory = "clothing" | "electronics" | "books";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  createdAt: Date;
};
```

It uses camelCase and real types (`Date`, not string), because it's the shape the app works with.

### 2. The API response, faithful to what arrives

```ts title="src/features/products/api/product-api-types.ts"
export type ProductResponse = {
  id: string;
  name: string;
  price_in_cents: number;
  category: string;
  stock: number;
  created_at: string;
  updated_at: string;
};
```

This type has **every field** the API returns, even the ones the app doesn't use, with the original names (snake_case) and original types (dates as strings). That way it works as API documentation inside the code: to know what comes from the server, you look at the type instead of calling the API.

### 3. Converting between the two

```ts title="src/features/products/product-adapter.ts"
import { ProductResponse } from "./api/product-api-types";
import { Product, ProductCategory } from "./product-types";

function toProduct(response: ProductResponse): Product {
  return {
    id: response.id,
    name: response.name,
    price: response.price_in_cents / 100,
    category: response.category as ProductCategory,
    createdAt: new Date(response.created_at),
  };
}

export const productAdapter = {
  toProduct,
};
```

This is where the unused fields are left behind. The adapter trims, not the response type.

## Full example

`Params` and `Result` in a function, and `Props` in a component:

```ts title="src/features/products/product-service.ts"
import { productApi } from "./api/product-api";
import { productAdapter } from "./product-adapter";
import { Product, ProductCategory } from "./product-types";

type GetProductsParams = {
  category: ProductCategory;
  page: number;
};

type GetProductsResult = {
  products: Product[];
  hasNextPage: boolean;
};

async function getProducts({ category, page }: GetProductsParams): Promise<GetProductsResult> {
  const { items, hasNextPage } = await productApi.getProducts({ category, page });

  return {
    products: items.map(productAdapter.toProduct),
    hasNextPage,
  };
}

export const productService = {
  getProducts,
};
```

```tsx title="src/features/products/components/product-card.tsx"
import { Text, View } from "react-native";

import { Product } from "../product-types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <View>
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
    </View>
  );
}
```

:::tip
If TypeScript can infer the return type, you don't need to declare the `Result`. Declare it when you want the output type explicit and documented, for example in a function other parts of the app use.
:::

## `type` or `interface`?

The official TypeScript docs treat it as **personal preference**. In the handbook, the *Differences Between Type Aliases and Interfaces* section ends like this:

> *"For the most part, you can choose based on personal preference, and TypeScript will tell you if it needs something to be the other kind of declaration. If you would like a heuristic, use `interface` until you need to use features from `type`."*

In other words: in most cases, pick by preference. If you want a rule, use `interface` until you need something only `type` does.

The real differences are few:

- Only `type` declares unions (`"clothing" | "books"`), aliases for primitive types and derived types (mapped and conditional types).
- Only `interface` does **declaration merging**: declaring the same interface twice adds the fields together. With `type`, that's a `Duplicate identifier` error.
- `interface` with `extends` is often faster for the compiler than `type` with intersection (`&`). This only matters in very large projects.

I use **`type` everywhere**: it's a single rule, it covers unions and I never have to stop and think "is this an interface or a type?". The differences above don't show up in a typical app.

### What about "interface for contracts, type for the rest"?

It's a common opinion in videos and posts, but **it's not an official standard**, and the criterion is subjective. Almost everything is a "contract" for something:

- `ProductResponse` is the contract with the API.
- `ProductCardProps` is the contract between the component and whoever uses it.
- `Product` is the domain's contract with the rest of the app.

Each person on the team would draw the line somewhere else, and the discussion would end up in code review. If you want to split them, use the handbook's rule, which is at least objective.

## Common pitfalls

- **`I` or `T` prefix** (`IProduct`, `TProduct`): comes from C# and Hungarian notation. The TypeScript community doesn't use it, and the editor already shows it's a type.
- **Suffixes that repeat the keyword** (`ProductType`, `ProductInterface`, `ProductModel`): not wrong, but noise. The `type` in the declaration already says it's a type.
- **Typing parameters inline in the signature** (`getProducts(params: { page: number; category: string })`): it works, but when a new parameter comes in you change the function signature. With a `GetProductsParams`, the contract lives in one named place, and callers can reuse the type.
- **Using the API type in components**: the app starts "thinking" in someone else's vocabulary. If the API renames a field, every component breaks, not just the adapter.
- **Trimming fields from the response type "because they're unused"**: the moment you need a field, you'll have to check the API instead of reading the code.
- **Mixing `type` and `interface` with no criterion**: either rule works. What gets in the way is having no rule.

## What changed between versions

- **TypeScript 4.2**: `type` names started showing up in error messages. Before that, errors sometimes showed the expanded type instead of the name, which was an old advantage of `interface`.
