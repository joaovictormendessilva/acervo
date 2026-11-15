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
| **hook** | cache, loading states, pagination | the screen's behavior changes | `features/<subject>/` |

The flow only goes one way: the screen doesn't know about axios or the API's shape, and `shared/` never imports from `features/`.

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

The response type is **faithful to what the API returns**: every field, with the original names and types. It works as API documentation inside the code.

```ts title="src/features/products/api/product-api-types.ts"
export type GetProductsParams = {
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
```

```ts title="src/features/products/api/product-api.ts"
import { apiClient } from "@/shared/api/api-client";

import { GetProductsParams, ProductResponse } from "./product-api-types";

async function getProducts(params: GetProductsParams) {
  const response = await apiClient.get<ProductResponse[]>("/products", { params });

  return {
    products: response.data,
    hasNextPage: String(response.headers.link).includes('rel="next"'),
  };
}

export const productApi = {
  getProducts,
};
```

- The `params` use the API's names (`per_page`), so they go straight to axios with no conversion.
- This API sends pagination in the `link` header (the same pattern GitHub uses). Reading a header is a transport detail, so it stays in the api layer, and the layers above only get `hasNextPage`.

### 4. Model and adapter: the app's shape

```ts title="src/features/products/product-types.ts"
export type ProductCategory = "clothing" | "electronics" | "books";

export type Product = {
  id: string;
  name: string;
  price: number;
  createdAt: string;
};
```

```ts title="src/features/products/product-adapter.ts"
import { ProductResponse } from "./api/product-api-types";
import { Product } from "./product-types";

function toProduct(response: ProductResponse): Product {
  return {
    id: response.id,
    name: response.name,
    price: response.price_in_cents / 100,
    createdAt: response.created_at,
  };
}

export const productAdapter = {
  toProduct,
};
```

The adapter is the only place that knows both shapes. If the API renames `price_in_cents`, only the adapter breaks: components, hooks and screens never find out.

:::note
`createdAt` stays an ISO string. If the React Query cache is saved to disk (see [Persisted React Query cache](/en/mobile/react-native/rede/react-query-cache-persistido/)), a `Date` becomes a string in JSON and the type would be lying. Convert to `Date` only when displaying.
:::

### 5. Service: what the app asks for

```ts title="src/features/products/product-service.ts"
import { productApi } from "./api/product-api";
import { productAdapter } from "./product-adapter";
import { ProductCategory } from "./product-types";

async function getProducts(category: ProductCategory, page: number) {
  const { products, hasNextPage } = await productApi.getProducts({ page, per_page: 20, category });

  return {
    products: products.map(productAdapter.toProduct),
    hasNextPage,
  };
}

export const productService = {
  getProducts,
};
```

The service decides what the screen shouldn't, like the page size, and returns the app's model already converted.

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

### 7. Hook: infinite pagination with `useInfiniteQuery`

```ts title="src/features/products/use-product-list.ts"
import { useInfiniteQuery } from "@tanstack/react-query";

import { productService } from "./product-service";
import { ProductCategory } from "./product-types";

export function useProductList(category: ProductCategory) {
  const { data, isLoading, isRefetching, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["products", category],
    queryFn: ({ pageParam }) => productService.getProducts(category, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => (lastPage.hasNextPage ? lastPageParam + 1 : undefined),
  });

  function loadNext() {
    if (hasNextPage) fetchNextPage();
  }

  return {
    products: data?.pages.flatMap((page) => page.products) ?? [],
    isLoading,
    isRefetching,
    refetch,
    loadNext,
    isFetchingNextPage,
  };
}
```

- **`queryKey`** identifies the cache. With the category in the key, each category gets its own cache.
- **`initialPageParam`** is the first page the `queryFn` receives in `pageParam`.
- **`getNextPageParam`** says which page comes next. Returning `undefined` signals the end, and `hasNextPage` becomes `false`.
- **`data.pages`** is an array with one entry per loaded page. `flatMap` merges them into a single list for the screen.
- **`isRefetching`** in an infinite query already **excludes** loading the next page. It's only `true` on pull-to-refresh and background updates.

## Full example

The screen only uses the hook and passes the states to the list:

```tsx title="src/app/products.tsx"
import { FlatList, Text, View } from "react-native";

import { useProductList } from "@/features/products/use-product-list";

export default function Products() {
  const { products, isLoading, isRefetching, refetch, loadNext, isFetchingNextPage } = useProductList("books");

  function handleEndReached() {
    if (isLoading || isFetchingNextPage || isRefetching) return;

    loadNext();
  }

  return (
    <View className="flex-1">
      <FlatList
        data={products}
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

## Variations / advanced examples

### Pagination in the response body

Many APIs send pagination in the body instead of a header. Only the api layer changes:

```ts title="src/features/products/api/product-api.ts"
import { apiClient } from "@/shared/api/api-client";

import { GetProductsParams, ProductResponse } from "./product-api-types";

type GetProductsResponse = {
  data: ProductResponse[];
  meta: { has_next_page: boolean };
};

async function getProducts(params: GetProductsParams) {
  const response = await apiClient.get<GetProductsResponse>("/products", { params });

  return {
    products: response.data.data,
    hasNextPage: response.data.meta.has_next_page,
  };
}

export const productApi = {
  getProducts,
};
```

The service, the hook and the screen stay the same, which is what the api layer is for.

## Common pitfalls

- **Using the response type in components**: the app starts depending on someone else's shape. If the API changes a field, every component breaks, not just the adapter.
- **Trimming fields from the response type "because they're unused"**: when you need a field, you'll have to check the API instead of reading the code. The adapter is what trims.
- **Calling `fetchNextPage` without checking `hasNextPage`**: no request goes out, but `isFetchingNextPage` turns `true` for a moment and the footer loading flickers at the end of the list.
- **Unguarded `onEndReached`**: `FlatList` calls it again while the next page is still loading, and also right on mount when the list is short. Ignore the call if something is already loading.
- **Container without `flex-1`**: the `FlatList` grows to its content size, scrolling breaks and `onEndReached` fires several times in a row.
- **`queryKey` without the search parameters**: two categories with the same key share the same cache, and one shows up in place of the other.
- **Lint warning on `axios.create`**: the `import/no-named-as-default-member` rule complains because axios also has a named `create` export. `axios.create` is how the axios docs do it and it works normally.

## What changed between versions

- **React Query v5**:
  - `initialPageParam` is now **required** in `useInfiniteQuery`. Before, `pageParam` started as `undefined`.
  - The `loading` status was renamed to `pending` (`isPending`). `isLoading` now means `isPending && isFetching`: no data yet and fetching, which is exactly the "first load".
  - The `maxPages` option was added, limiting how many pages an infinite query keeps in the cache.
