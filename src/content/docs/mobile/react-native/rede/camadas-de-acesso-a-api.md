---
title: Camadas de acesso à API
description: Como organizar chamadas HTTP em client, api, adapter, service e hook com React Query, do axios até a tela.
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

## O que é

O padrão que uso para buscar dados de uma API. Em vez de chamar o axios direto na tela, a chamada passa por camadas, e cada uma muda por um motivo diferente:

```
tela
  → hook         (React Query: cache, loading, paginação)
    → service    (o que o app usa: chama a API e converte)
      → api      (URL, query params, headers)
        → client (axios configurado: baseURL, timeout)
```

| Camada | O que sabe | Muda quando… | Onde fica |
| --- | --- | --- | --- |
| **client** | baseURL, timeout, interceptors | troca o servidor, entra autenticação | `shared/api/` |
| **api** | endpoint, parâmetros e formato cru da resposta | a API muda | `features/<assunto>/api/` |
| **adapter** | como converter a resposta no modelo do app | a API ou o modelo muda | `features/<assunto>/` |
| **service** | o que o app pede ("me dá os produtos da página 2") | a regra do app muda | `features/<assunto>/` |
| **hook** | cache, estados de loading, paginação | o comportamento da tela muda | `features/<assunto>/` |

O fluxo só anda numa direção: a tela não conhece o axios nem o formato da API, e o `shared/` nunca importa de `features/`.

## Quando usar

- Em qualquer app que consome uma API, desde a primeira chamada.
- Principalmente quando a API usa um vocabulário ou um formato diferente do seu app (snake_case, datas como string, nomes de campos de outro domínio).

## Quando NÃO usar

- Num protótipo descartável com uma chamada só. Aí um `fetch` direto no hook resolve. Quando o app crescer, separe as camadas.

## Passo a passo

### 1. Instalar

```bash
npx expo install axios @tanstack/react-query
```

As duas libs são JavaScript puro e funcionam no Expo Go.

### 2. Client: o axios configurado

```ts title="src/shared/api/api-client.ts"
import axios from "axios";

export const apiClient = axios.create({
  baseURL: "https://api.example.com/v1",
  timeout: 10_000,
});
```

Ele fica em `shared/` porque não sabe nada do assunto do app. Qualquer feature que fale com essa API usa o mesmo client. Se um dia entrar autenticação, o interceptor vem aqui e vale para todas as chamadas.

### 3. Api: a chamada crua

O tipo da resposta é **fiel ao que a API devolve**: todos os campos, com os nomes e os tipos originais. Ele funciona como documentação da API dentro do código.

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

- Os `params` usam os nomes da API (`per_page`), então são passados direto para o axios, sem conversão.
- Essa API manda a paginação no header `link` (o mesmo padrão do GitHub). Ler header é detalhe de transporte, então isso fica na camada api, e quem está acima só recebe `hasNextPage`.

### 4. Modelo e adapter: o formato do app

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

O adapter é o único lugar que conhece os dois formatos. Se a API renomear `price_in_cents`, só ele quebra: componentes, hooks e telas nem ficam sabendo.

:::note
O `createdAt` continua como string ISO. Se o cache do React Query for salvo em disco (veja [Cache do React Query persistido](/mobile/react-native/rede/react-query-cache-persistido/)), um `Date` vira string no JSON e o tipo passaria a mentir. Converta para `Date` só na hora de exibir.
:::

### 5. Service: o que o app pede

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

O service decide o que o app não deveria decidir na tela, como o tamanho da página, e devolve o modelo do app já convertido.

### 6. Provider do React Query

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

O `queryClient` é criado **fora do componente**, para existir um só durante toda a vida do app. Criado dentro do `RootLayout`, ele seria recriado a cada renderização e o cache se perderia.

### 7. Hook: paginação infinita com `useInfiniteQuery`

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

- **`queryKey`** identifica o cache. Com a categoria na chave, cada categoria tem seu próprio cache.
- **`initialPageParam`** é a primeira página que o `queryFn` recebe em `pageParam`.
- **`getNextPageParam`** diz qual é a próxima página. Devolver `undefined` avisa que acabou, e o `hasNextPage` vira `false`.
- **`data.pages`** é um array com uma entrada por página carregada. O `flatMap` junta tudo numa lista só para a tela.
- **`isRefetching`** no infinite query já **exclui** o carregamento da próxima página. Ele só fica `true` no pull-to-refresh e nas atualizações em segundo plano.

## Exemplo completo

A tela só usa o hook e passa os estados para a lista:

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
        ListFooterComponent={isLoading || isFetchingNextPage ? <Text>Carregando...</Text> : undefined}
      />
    </View>
  );
}
```

## Variações / exemplos avançados

### Paginação no corpo da resposta

Muitas APIs mandam a paginação no corpo, e não no header. Só a camada api muda:

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

O service, o hook e a tela continuam iguais, e é para isso que serve a camada api.

## Armadilhas comuns

- **Usar o tipo da resposta nos componentes**: o app passa a depender do formato de outra pessoa. Se a API mudar um campo, todos os componentes quebram, e não só o adapter.
- **Cortar campos do tipo da resposta "porque não usa"**: quando precisar de um campo, você vai ter que consultar a API em vez de olhar o código. Quem enxuga é o adapter.
- **Chamar `fetchNextPage` sem checar `hasNextPage`**: não sai requisição, mas o `isFetchingNextPage` fica `true` por um instante, e o loading do rodapé pisca no fim da lista.
- **`onEndReached` sem proteção**: a `FlatList` chama de novo enquanto a próxima página ainda carrega, e também logo ao montar quando a lista é curta. Ignore a chamada se algo já estiver carregando.
- **Container sem `flex-1`**: a `FlatList` cresce até o tamanho do conteúdo, a rolagem quebra e o `onEndReached` dispara várias vezes seguidas.
- **`queryKey` sem os parâmetros da busca**: duas categorias com a mesma chave dividem o mesmo cache, e uma aparece no lugar da outra.
- **Aviso do lint no `axios.create`**: a regra `import/no-named-as-default-member` reclama porque o axios também exporta `create` com nome. `axios.create` é a forma da doc do axios e funciona normalmente.

## O que mudou entre versões

- **React Query v5**:
  - `initialPageParam` passou a ser **obrigatório** no `useInfiniteQuery`. Antes, o `pageParam` começava como `undefined`.
  - O estado `loading` foi renomeado para `pending` (`isPending`). O `isLoading` agora significa `isPending && isFetching`: não tem dado ainda e está buscando, que é exatamente o "primeiro carregamento".
  - Entrou a opção `maxPages`, que limita quantas páginas ficam guardadas no cache de um infinite query.
