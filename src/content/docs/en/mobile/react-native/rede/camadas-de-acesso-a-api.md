---
title: API access layers
description: How to organize HTTP calls into client, api, adapter, service and a React Query hook, from axios to the screen.
tecnologia: axios · @tanstack/react-query
versao_testada: Expo SDK 58 · axios 1.21 · @tanstack/react-query 5.107
atualizado_em: 2026-11-15
fontes:
  - https://axios-http.com/docs/instance
  - https://axios-http.com/docs/req_config
  - https://axios-http.com/docs/res_schema
  - https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries
  - https://tanstack.com/query/v5/docs/framework/react/guides/query-keys
  - https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
  - https://tanstack.com/query/v5/docs/framework/react/guides/render-optimizations
  - https://tanstack.com/query/v5/docs/framework/react/react-native
sidebar:
  order: 1
---

## What it is

The pattern I use to fetch data from an API. Instead of calling axios straight from the screen, the call goes through layers, and each one changes for a different reason:

```
screen
  → hook         (React Query: cache, loading, pagination)
    → service    (what the app uses: calls the API and converts)
      → api      (URL, query params, headers)
        → client (configured axios: baseURL, timeout)
```

| Layer | What it knows | Changes when… | Where it lives |
| --- | --- | --- | --- |
| **client** | baseURL, timeout, interceptors | the server changes, auth comes in | `shared/api/` |
| **api** | endpoint, parameters and raw response shape | the API changes | `features/<subject>/api/` |
| **adapter** | how to convert the response into the app's model | the API or the model changes | `features/<subject>/` |
| **service** | what the app asks for ("give me page 2 of products") | the app's rules change | `features/<subject>/` |
| **hook** | the React Query query (key, pagination) | the screen's behavior changes | `features/<subject>/hooks/` |

The flow only goes one way. The screen doesn't know about axios or the API's shape, the api doesn't import the adapter, and `shared/` never imports from `features/`.

## When to use

- In any app that consumes an API, from the first call.
- Especially when the API uses a different vocabulary or shape than your app (snake_case, dates as strings, field names from another domain).

## When NOT to use

- In a throwaway prototype with a single call. A `fetch` straight in the hook is enough there. When the app grows, split the layers.

## Step by step

### 1. Install

```bash
npx expo install axios @tanstack/react-query
```

Both libraries are plain JavaScript and work in Expo Go.

### 2. Client: the configured axios

```ts title="src/shared/api/api-client.ts"
import axios from "axios";

export const apiClient = axios.create({
  baseURL: "https://api.example.com/v1",
  timeout: 10_000,
});
```

It lives in `shared/` because it knows nothing about the app's subject. Every feature that talks to this API uses the same client. If authentication comes in someday, the interceptor goes here and applies to every call.

### 3. Api: the raw call

The types in this layer speak **the API's language**: the parameters it accepts and the response it returns, with the original names and types. The response is **faithful to what arrives**, with every field, even the ones the app doesn't use. That way it works as API documentation inside the code.

```ts title="src/features/products/api/product-api-types.ts"
export type GetProductsRequest = {
  page: number;
  per_page: number;
  category: "clothing" | "electronics" | "books";
};

export type GetProductRequest = {
  id: string;
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

The list and the detail of an item often return different shapes: the detail brings extra fields, like the description. That's why each response has its own type, and the detail's extends the list's.

```ts title="src/features/products/api/product-api.ts"
import { apiClient } from "@/shared/api/api-client";

import { GetProductRequest, GetProductsRequest, ProductDetailResponse, ProductResponse } from "./product-api-types";

const getProducts = async (params: GetProductsRequest) => {
  const response = await apiClient.get<ProductResponse[]>("/products", { params });

  return {
    products: response.data,
    hasNextPage: String(response.headers.link).includes('rel="next"'),
  };
};

const getProduct = async (params: GetProductRequest) => {
  const response = await apiClient.get<ProductDetailResponse>(`/products/${params.id}`);

  return response.data;
};

export const productApi = {
  getProducts,
  getProduct,
};
```

- The api returns **the raw shape**. The service is what converts, which is why this layer doesn't import the adapter.
- The `params` use the API's names (`per_page`), so they go straight to axios.
- Both functions receive `params` the same way, but use them differently, because they're different kinds of parameter:

  | | `getProducts` | `getProduct` |
  | --- | --- | --- |
  | Kind | **query params** | **path params** |
  | Where they go in the URL | after the `?` | inside the path |
  | Resulting URL | `/products?page=1&per_page=20` | `/products/42` |
  | Who builds it | axios, through the `params` option | you, in the template string |
- This API sends pagination in the `link` header (the same pattern GitHub uses). Reading a header is a transport detail, so it stays here, and the layers above only get `hasNextPage`.

### 4. Model and adapter: the app's shape

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

export type GetProductsParams = {
  category: ProductCategory;
  page: number;
};

export type GetProductParams = {
  id: string;
};
```

- **`ProductSummary`** is the summary shown in lists, and **`Product`** is the complete product. The plain name goes to the complete version, because it's the one that represents "the actual product".
- The **domain params** (`GetProductsParams`) are what the hook and the service receive. They speak the app's language, with no `per_page`.

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

The adapter is the only place that knows both shapes. If the API renames `price_in_cents`, only the adapter breaks. `toProduct` reuses `toProductSummary` with a spread and adds only what the detail has on top, so a change to a shared field applies to both.

:::note
`createdAt` stays an ISO string. If the React Query cache is saved to disk (see [Persisted React Query cache](/en/mobile/react-native/rede/react-query-cache-persistido/)), a `Date` becomes a string in JSON and the type would be lying. Convert to `Date` only when displaying.
:::

### 5. Service: translates the request and the response

```ts title="src/features/products/product-service.ts"
import { productApi } from "./api/product-api";
import { productAdapter } from "./product-adapter";
import { GetProductParams, GetProductsParams } from "./product-types";

const getProducts = async ({ category, page }: GetProductsParams) => {
  const { products, hasNextPage } = await productApi.getProducts({ page, per_page: 20, category });

  return {
    products: products.map(productAdapter.toProductSummary),
    hasNextPage,
  };
};

const getProduct = async (params: GetProductParams) => {
  const product = await productApi.getProduct(params);

  return productAdapter.toProduct(product);
};

export const productService = {
  getProducts,
  getProduct,
};
```

The service translates both ways: the **domain params** become the **API params**, and the **API response** becomes the **app's model**. It also decides what the screen shouldn't, like the page size.

In `getProduct`, the params have the same names in both languages, so the object is passed straight through: TypeScript accepts it because the shapes match.

:::tip
With params as objects, a new parameter changes **the two types and one translation line in the service**. The hook and the screen just pass the object along and don't change.
:::

### 6. React Query provider

```ts title="src/shared/api/query-client.ts"
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();
```

```tsx title="src/app/_layout.tsx"
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { queryClient } from "@/shared/api/query-client";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
```

The `queryClient` is created **outside the component**, so there's a single one for the app's whole lifetime. Created inside `RootLayout`, it would be recreated on every render and the cache would be lost.

### 7. Hooks: return the query as is

```ts title="src/features/products/hooks/use-product-list.ts"
import { useInfiniteQuery } from "@tanstack/react-query";

import { productService } from "../product-service";
import { GetProductsParams } from "../product-types";

export const useProductList = (params: Omit<GetProductsParams, "page">) =>
  useInfiniteQuery({
    queryKey: ["products", "list", params],
    queryFn: ({ pageParam }) => productService.getProducts({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => (lastPage.hasNextPage ? lastPageParam + 1 : undefined),
    select: (data) => data.pages.flatMap((page) => page.products),
  });
```

```ts title="src/features/products/hooks/use-product.ts"
import { useQuery } from "@tanstack/react-query";

import { productService } from "../product-service";
import { GetProductParams } from "../product-types";

export const useProduct = (params: GetProductParams) =>
  useQuery({
    queryKey: ["products", "detail", params],
    queryFn: () => productService.getProduct(params),
  });
```

- **The hook returns the React Query result untouched.** The screen gets access to everything (`data`, `isLoading`, `hasNextPage`, `fetchNextPage`...), and a new property doesn't require changing the hook.
- **Data transformation goes in `select`.** In an infinite query, the raw `data` is `{ pages: [...] }`. `select` merges the pages and the screen gets a `ProductSummary[]` directly. In v5, an infinite query's `select` can return any shape.
- **`Omit<GetProductsParams, "page">`**: React Query controls the page, through `pageParam`. A new parameter in `GetProductsParams` reaches the hook without changing it.
- **The `queryKey` follows a hierarchy**: `["products", "list", params]` and `["products", "detail", params]`. An `invalidateQueries({ queryKey: ["products"] })` refreshes lists and details at once, because invalidation applies to every key that starts with the prefix. The whole `params` object goes into the key, so a new parameter splits the cache by itself. The order of properties in the object doesn't matter for the key.
- **`initialPageParam`** is the first page the `queryFn` receives, and **`getNextPageParam`** returns `undefined` when there's nothing left, which sets `hasNextPage` to `false`.
- **`isRefetching`** in an infinite query already **excludes** loading the next page. It's only `true` on pull-to-refresh and background updates.

## Full example

The screen uses the hook and guards `onEndReached`:

```tsx title="src/app/products.tsx"
import { FlatList, Text, View } from "react-native";

import { useProductList } from "@/features/products/hooks/use-product-list";

export default function Products() {
  const { data, isLoading, isRefetching, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useProductList({
    category: "books",
  });

  const handleEndReached = () => {
    if (!hasNextPage || isLoading || isFetchingNextPage || isRefetching) return;

    fetchNextPage();
  };

  return (
    <View className="flex-1">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.name}</Text>}
        refreshing={isRefetching}
        onRefresh={refetch}
        onEndReached={handleEndReached}
        onEndReachedThreshold={1}
        ListFooterComponent={isLoading || isFetchingNextPage ? <Text>Loading...</Text> : undefined}
      />
    </View>
  );
}
```

`FlatList` accepts `data` as `undefined`, so there's no need for `?? []` before the first data arrives.

## Variations / advanced examples

### Pagination in the response body

Many APIs send pagination in the body instead of a header. Only the api layer changes:

```ts title="src/features/products/api/product-api.ts"
import { apiClient } from "@/shared/api/api-client";

import { GetProductsRequest, ProductResponse } from "./product-api-types";

type GetProductsResponse = {
  data: ProductResponse[];
  meta: { has_next_page: boolean };
};

const getProducts = async (params: GetProductsRequest) => {
  const response = await apiClient.get<GetProductsResponse>("/products", { params });

  return {
    products: response.data.data,
    hasNextPage: response.data.meta.has_next_page,
  };
};

export const productApi = {
  getProducts,
};
```

The service, the hook and the screen stay the same, which is what the api layer is for.

## Common pitfalls

- **Converting in the api layer**: the api starts importing the domain, the dependency flips and each function converts in a different place. The api returns the raw shape, and the service converts.
- **Hook calling the api directly**: it skips the service and carries the API's types up to the screen. The flow is always hook → service → api.
- **Using the API type in components or in the hook's params**: the app starts depending on someone else's vocabulary (`per_page`, snake_case). If the API changes, the screen breaks with it.
- **Trimming fields from the response type "because they're unused"**: when you need a field, you'll have to check the API instead of reading the code. The adapter is what trims.
- **Passing path params in axios's `params` option**: axios turns the object into a query string, and `/products/:id` becomes `/products?id=42`. That's the list route with a filter it doesn't know, so the API returns a list instead of the item, with no error. Path params go in the template string.
- **Loose params in the signature** (`getProducts(category, page)`): a new parameter changes the signature in every layer. With an object, only the types change.
- **Returning `{ ...query, products }` from the hook**: React Query only re-renders when a property the screen used changes, and it finds that out from each property access. The docs warn that *"if you use object rest destructuring, you will disable this optimization"*. A spread has the same effect, because it reads every property. Use `select` and return the query untouched.
- **`fetchNextPage` without checking `hasNextPage`**: no request goes out, but `isFetchingNextPage` turns `true` for a moment and the footer loading flickers at the end of the list.
- **Unguarded `onEndReached`**: `FlatList` calls it again while the next page is still loading, and also right on mount when the list is short.
- **Container without `flex-1`**: the `FlatList` grows to its content size, scrolling breaks and `onEndReached` fires several times in a row.
- **`queryKey` without the search parameters**: two categories with the same key share the same cache, and one shows up in place of the other.
- **Lint warning on `axios.create`**: the `import/no-named-as-default-member` rule complains because axios also has a named `create` export. `axios.create` is how the axios docs do it and it works normally.

## What changed between versions

- **React Query v5**:
  - `initialPageParam` is now **required** in `useInfiniteQuery`. Before, `pageParam` started as `undefined`.
  - The `loading` status was renamed to `pending` (`isPending`). `isLoading` now means `isPending && isFetching`: no data yet and fetching, which is exactly the "first load".
  - The `maxPages` option was added, limiting how many pages an infinite query keeps in the cache.
