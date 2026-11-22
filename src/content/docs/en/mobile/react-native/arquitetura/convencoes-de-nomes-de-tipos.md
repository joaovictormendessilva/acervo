---
title: Type naming conventions
description: How to name TypeScript types (domain model, summary, API response and parameters, props) and why to use type everywhere.
tecnologia: typescript
versao_testada: TypeScript 6.0
atualizado_em: 2026-11-22
fontes:
  - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces
sidebar:
  order: 2
---

## What it is

The pattern I use to name types. The main rule: **the domain model keeps the plain name, and anything that's a variation of it gets a suffix that says its role.**

| Role | Convention | Example |
| --- | --- | --- |
| Domain model (complete) | plain name | `Product` |
| Summarized version (for lists) | `Summary` suffix | `ProductSummary` |
| Raw API response | `Response` suffix | `ProductResponse` |
| Parameters sent to the API | `Request` suffix | `GetProductsRequest` |
| App function input | `Params` suffix | `GetProductsParams` |
| Function output | `Result` suffix | `GetProductsResult` |
| Component props | `Props` suffix | `ProductCardProps` |
| Union of possible values | name of the concept | `ProductCategory` |

And everything is declared with `type`, never with `interface`.

## When to use

- In any TypeScript project, from the start.
- When the same concept shows up in several shapes (what comes from the API, what the app uses, what the list shows, what the component receives) and you need to tell which shape you're looking at just from the name.

## Why the model has no suffix

The domain model is **the concept itself**: `Product` is the product, with the names and types your app uses. In DDD (Domain-Driven Design) this is called *ubiquitous language*, because the type uses the same word you'd use when talking about the app ("the product has a name, a price and a description").

The other shapes derive from it, and the suffix answers "derived from what?":

- `ProductSummary` is a **part** of the product, the one that fits in a list.
- `ProductResponse` and `GetProductsRequest` are the shape **someone else** defined (the API).
- `ProductCardProps` is what **a component** receives.

Context also comes from the import path, which says where the type is from:

```ts
import { Product } from "@/features/products/product-types";
```

## Step by step

### 1. The domain model, complete and summarized

```ts title="src/features/products/product-types.ts"
export type ProductCategory = "clothing" | "electronics" | "books";

export type ProductSummary = {
  id: string;
  name: string;
  price: number;
  createdAt: string;
};

export type Product = ProductSummary & {
  description: string;
  images: string[];
};
```

The **plain name goes to the complete version**, because it's the one that represents "the actual product". The summary is the variation, so it gets the suffix. The other way around (`Product` for the summary and `ProductDetail` for the complete one), a few months from now you'd read `Product` and think of the whole product.

The model uses camelCase and the app's types. Dates stay as ISO strings, so the type stays correct if the data goes through a cache saved as JSON.

### 2. The API types, faithful to what it uses

```ts title="src/features/products/api/product-api-types.ts"
export type GetProductsRequest = {
  page: number;
  per_page: number;
  category: "clothing" | "electronics" | "books";
};

export type ProductResponse = {
  id: string;
  name: string;
  price_in_cents: number;
  category: string;
  stock: number;
  created_at: string;
  updated_at: string;
};

export type ProductDetailResponse = ProductResponse & {
  description: string;
  images: string[];
};
```

These types have **every field** the API uses, even the ones the app ignores, with the original names (snake_case). That way they work as API documentation inside the code: to know what goes to and comes from the server, you look at the type instead of calling the API.

`Request` exists to keep the API's params apart from the app's params. The API takes `per_page`, and the app doesn't need to know that.

### 3. Converting between the two

```ts title="src/features/products/product-adapter.ts"
import { ProductDetailResponse, ProductResponse } from "./api/product-api-types";
import { Product, ProductSummary } from "./product-types";

const toProductSummary = (response: ProductResponse): ProductSummary => ({
  id: response.id,
  name: response.name,
  price: response.price_in_cents / 100,
  createdAt: response.created_at,
});

const toProduct = (response: ProductDetailResponse): Product => ({
  ...toProductSummary(response),
  description: response.description,
  images: response.images,
});

export const productAdapter = {
  toProductSummary,
  toProduct,
};
```

This is where the unused fields are left behind. The adapter trims, not the response type. `toProduct` reuses `toProductSummary` with a spread, so a shared field is mapped in a single place.

## Full example

`Params` and `Result` in an app function, and `Props` in a component:

```ts title="src/features/products/product-service.ts"
import { productApi } from "./api/product-api";
import { productAdapter } from "./product-adapter";
import { ProductCategory, ProductSummary } from "./product-types";

type GetProductsParams = {
  category: ProductCategory;
  page: number;
};

type GetProductsResult = {
  products: ProductSummary[];
  hasNextPage: boolean;
};

const getProducts = async ({ category, page }: GetProductsParams): Promise<GetProductsResult> => {
  const { products, hasNextPage } = await productApi.getProducts({ page, per_page: 20, category });

  return {
    products: products.map(productAdapter.toProductSummary),
    hasNextPage,
  };
};

export const productService = {
  getProducts,
};
```

```tsx title="src/features/products/components/product-card.tsx"
import { Text, View } from "react-native";

import { ProductSummary } from "../product-types";

type ProductCardProps = {
  product: ProductSummary;
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

## Summary and complete: where each field goes

The summary isn't "what the list shows". It's **the part of the product that both API responses include**. The screen picks what to display.

| Change | What you touch |
| --- | --- |
| The list stops showing the price | only the list component. `ProductSummary` keeps `price`. |
| The API renames a shared field | only `toProductSummary`, and the complete one follows through the spread. |
| The list API stops sending a field, but the detail still sends it | move the field from the summary to the complete one (see below). |

### Moving a field when the API changes

If the list stops sending `created_at` but the detail keeps sending it, the field leaves the summary and goes into the complete one, in the API types, the model and the adapter. The examples only show the fields that matter for the change:

```ts title="src/features/products/api/product-api-types.ts"
export type ProductResponse = {
  id: string;
  name: string;
  price_in_cents: number;
};

export type ProductDetailResponse = ProductResponse & {
  description: string;
  created_at: string;
};
```

```ts title="src/features/products/product-adapter.ts"
import { ProductDetailResponse, ProductResponse } from "./api/product-api-types";
import { Product, ProductSummary } from "./product-types";

const toProductSummary = (response: ProductResponse): ProductSummary => ({
  id: response.id,
  name: response.name,
  price: response.price_in_cents / 100,
});

const toProduct = (response: ProductDetailResponse): Product => ({
  ...toProductSummary(response),
  description: response.description,
  createdAt: response.created_at,
});

export const productAdapter = {
  toProductSummary,
  toProduct,
};
```

The spread stays the same, and the field just moves below it. When you remove `createdAt` from `ProductSummary`, `tsc` points to every place still using that field on a summary, so you don't have to remember where it was displayed.

The rule becomes:

- **A field both responses have** lives in the summary and reaches the complete one through the spread.
- **A field only the detail has** lives only in the complete one, below the spread.

## Equal types: keep apart or merge?

Two types with the same fields aren't always duplication. What decides is the question: **"if one changes, does the other change too?"**

**In different layers, they stay separate.** `GetProductRequest` and `GetProductParams` may match today, but one changes when the API changes and the other when the app changes. If the API renames `id` to `product_id`, only the `Request` changes, and the service translates.

**In the same layer, representing the same concept, they become one type.** Imagine the app fetches a product and its reviews:

```ts title="src/features/products/product-types.ts" del={1-7} ins={9-11}
export type GetProductParams = {
  id: string;
};

export type GetReviewsParams = {
  id: string;
};

export type ProductParams = {
  id: string;
};
```

Both types say the same thing: **which product**. There's no situation where one changes and the other doesn't. If the product starts being identified by `slug`, both change together, always. So it's a single type, with the **name of the concept** (`ProductParams`), not one per function. The API side works the same way: if both endpoints use the same `/products/{id}` path, they take a single `ProductRequest`.

```ts title="src/features/products/product-service.ts"
import { productApi } from "./api/product-api";
import { productAdapter } from "./product-adapter";
import { ProductParams } from "./product-types";

const getProduct = async (params: ProductParams) => {
  const product = await productApi.getProduct(params);

  return productAdapter.toProduct(product);
};

const getReviews = async (params: ProductParams) => {
  const reviews = await productApi.getReviews(params);

  return reviews.map((review) => productAdapter.toReview(review));
};

export const productService = {
  getProduct,
  getReviews,
};
```

`ProductParams` is passed to the api, which expects a `ProductRequest`. TypeScript accepts it because the shapes match. It's exactly the "equal today, but each changes for its own reason" case.

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
- **Giving the plain name to the summary**: `Product` for the list and `ProductDetail` for the complete one works, but goes against the intuition that "the product" is the whole object.
- **Removing a field from the summary because a screen stopped showing it**: the summary describes what the API sends, not what a screen displays. The component is what picks what to show.
- **Using the same params type for the API and the app**: the API's vocabulary (`per_page`, snake_case) leaks up to the screen. Use `Request` for the API and `Params` for the app.
- **One params type per function when they all take the same thing** (`GetProductParams`, `GetReviewsParams`): that's duplication. If the concept changes, you have to remember to change all of them. Use one type named after the concept (`ProductParams`).
- **A component redeclaring the model type**: a local copy decouples nothing, it just creates a version that has to be kept in sync by hand. Import it from the feature.
- **Typing parameters inline in the signature** (`getProducts(params: { page: number; category: string })`): it works, but when a new parameter comes in you change the function signature. With a `GetProductsParams`, the contract lives in one named place, and callers can reuse the type.
- **Using the API type in components**: the app starts "thinking" in someone else's vocabulary. If the API renames a field, every component breaks, not just the adapter.
- **Trimming fields from the response type "because they're unused"**: the moment you need a field, you'll have to check the API instead of reading the code.
- **Mixing `type` and `interface` with no criterion**: either rule works. What gets in the way is having no rule.

## What changed between versions

- **TypeScript 4.2**: `type` names started showing up in error messages. Before that, errors sometimes showed the expanded type instead of the name, which was an old advantage of `interface`.
