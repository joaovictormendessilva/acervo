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
  - https://tanstack.com/query/v5/docs/framework/react/guides/query-keys
  - https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
  - https://tanstack.com/query/v5/docs/framework/react/guides/render-optimizations
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
| **hook** | a query do React Query (chave, paginação) | o comportamento da tela muda | `features/<assunto>/hooks/` |

O fluxo só anda numa direção. A tela não conhece o axios nem o formato da API, a api não importa o adapter, e o `shared/` nunca importa de `features/`.

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

Os tipos desta camada falam **a língua da API**: os parâmetros que ela aceita e a resposta que ela devolve, com os nomes e os tipos originais. A resposta é **fiel ao que chega**, com todos os campos, mesmo os que o app não usa. Assim ela funciona como documentação da API dentro do código.

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

A listagem e o detalhe de um item costumam devolver formatos diferentes: o detalhe traz campos a mais, como a descrição. Por isso cada resposta tem o seu tipo, e o do detalhe estende o da lista.

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

- A api devolve **o formato cru**. Quem converte é o service, e é por isso que esta camada não importa o adapter.
- Os `params` usam os nomes da API (`per_page`), então vão direto para o axios.
- As duas funções recebem `params` do mesmo jeito, mas usam de formas diferentes, porque são tipos diferentes de parâmetro:

  | | `getProducts` | `getProduct` |
  | --- | --- | --- |
  | Tipo | **query params** | **path params** |
  | Onde vão na URL | depois do `?` | dentro do caminho |
  | URL gerada | `/products?page=1&per_page=20` | `/products/42` |
  | Quem monta | o axios, pela opção `params` | você, no template string |
- Essa API manda a paginação no header `link` (o mesmo padrão do GitHub). Ler header é detalhe de transporte, então isso fica aqui, e quem está acima só recebe `hasNextPage`.

### 4. Modelo e adapter: o formato do app

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

- **`ProductSummary`** é o resumo que aparece em listas, e **`Product`** é o produto completo. O nome puro fica com a versão completa, porque é ela que representa "o produto de fato".
- Os **params do domínio** (`GetProductsParams`) são os que o hook e o service recebem. Eles falam a língua do app, sem `per_page`.

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

O adapter é o único lugar que conhece os dois formatos. Se a API renomear `price_in_cents`, só ele quebra. O `toProduct` reaproveita o `toProductSummary` com spread e adiciona só o que o detalhe tem a mais, então uma mudança num campo comum vale para os dois.

:::note
O `createdAt` continua como string ISO. Se o cache do React Query for salvo em disco (veja [Cache do React Query persistido](/mobile/react-native/rede/react-query-cache-persistido/)), um `Date` vira string no JSON e o tipo passaria a mentir. Converta para `Date` só na hora de exibir.
:::

### 5. Service: traduz o pedido e a resposta

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

O service traduz nos dois sentidos: os **params do domínio** viram os **params da API**, e a **resposta da API** vira o **modelo do app**. Ele também decide o que a tela não deveria decidir, como o tamanho da página.

No `getProduct`, os params têm os mesmos nomes nas duas línguas, então o objeto é repassado direto: o TypeScript aceita porque os formatos são iguais.

:::tip
Com params em objeto, um parâmetro novo muda **os dois tipos e uma linha de tradução no service**. Hook e tela só repassam o objeto e não mudam.
:::

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

### 7. Hooks: devolvem a query direto

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

- **O hook devolve o resultado do React Query sem mexer nele.** A tela tem acesso a tudo (`data`, `isLoading`, `hasNextPage`, `fetchNextPage`...), e uma propriedade nova não exige mudar o hook.
- **Transformação de dado vai no `select`.** No infinite query, o `data` cru é `{ pages: [...] }`. O `select` junta as páginas e a tela recebe direto um `ProductSummary[]`. Na v5, o `select` do infinite query pode devolver qualquer formato.
- **`Omit<GetProductsParams, "page">`**: quem controla a página é o React Query, pelo `pageParam`. Um parâmetro novo no `GetProductsParams` chega ao hook sem mexer nele.
- **A `queryKey` segue uma hierarquia**: `["products", "list", params]` e `["products", "detail", params]`. Um `invalidateQueries({ queryKey: ["products"] })` atualiza listas e detalhes de uma vez, porque a invalidação vale para toda chave que começa com o prefixo. Os `params` inteiros entram na chave, então um parâmetro novo já separa o cache sozinho. A ordem das propriedades no objeto não importa para a chave.
- **`initialPageParam`** é a primeira página que o `queryFn` recebe, e **`getNextPageParam`** devolve `undefined` quando acabou, o que deixa o `hasNextPage` como `false`.
- **`isRefetching`** no infinite query já **exclui** o carregamento da próxima página. Ele só fica `true` no pull-to-refresh e nas atualizações em segundo plano.

## Exemplo completo

A tela usa o hook e protege o `onEndReached`:

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
        ListFooterComponent={isLoading || isFetchingNextPage ? <Text>Carregando...</Text> : undefined}
      />
    </View>
  );
}
```

A `FlatList` aceita `data` como `undefined`, então não precisa de `?? []` antes do primeiro dado chegar.

## Variações / exemplos avançados

### Paginação no corpo da resposta

Muitas APIs mandam a paginação no corpo, e não no header. Só a camada api muda:

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

O service, o hook e a tela continuam iguais, e é para isso que serve a camada api.

## Armadilhas comuns

- **Converter na camada api**: a api passa a importar o domínio, a dependência inverte e cada função converte num lugar diferente. A api devolve o formato cru, e o service converte.
- **Hook chamando a api direto**: pula o service e leva os tipos da API até a tela. O fluxo é sempre hook → service → api.
- **Usar o tipo da API nos componentes ou nos params do hook**: o app passa a depender do vocabulário de outra pessoa (`per_page`, snake_case). Se a API mudar, a tela quebra junto.
- **Cortar campos do tipo da resposta "porque não usa"**: quando precisar de um campo, você vai ter que consultar a API em vez de olhar o código. Quem enxuga é o adapter.
- **Passar path params na opção `params` do axios**: o axios transforma o objeto em query string, e `/products/:id` vira `/products?id=42`. Essa é a rota da listagem com um filtro que ela não conhece, então a API devolve uma lista em vez do item, sem dar erro. Path params vão no template string.
- **Params soltos na assinatura** (`getProducts(category, page)`): um parâmetro novo muda a assinatura em todas as camadas. Com objeto, só os tipos mudam.
- **Devolver `{ ...query, products }` no hook**: o React Query só renderiza de novo quando muda uma propriedade que a tela usou, e ele descobre isso pelo acesso a cada propriedade. A doc avisa que *"if you use object rest destructuring, you will disable this optimization"*. O spread tem o mesmo efeito, porque lê todas as propriedades. Use o `select` e devolva a query sem mexer.
- **`fetchNextPage` sem checar `hasNextPage`**: não sai requisição, mas o `isFetchingNextPage` fica `true` por um instante e o loading do rodapé pisca no fim da lista.
- **`onEndReached` sem proteção**: a `FlatList` chama de novo enquanto a próxima página ainda carrega, e também logo ao montar quando a lista é curta.
- **Container sem `flex-1`**: a `FlatList` cresce até o tamanho do conteúdo, a rolagem quebra e o `onEndReached` dispara várias vezes seguidas.
- **`queryKey` sem os parâmetros da busca**: duas categorias com a mesma chave dividem o mesmo cache, e uma aparece no lugar da outra.
- **Aviso do lint no `axios.create`**: a regra `import/no-named-as-default-member` reclama porque o axios também exporta `create` com nome. `axios.create` é a forma da doc do axios e funciona normalmente.

## O que mudou entre versões

- **React Query v5**:
  - `initialPageParam` passou a ser **obrigatório** no `useInfiniteQuery`. Antes, o `pageParam` começava como `undefined`.
  - O estado `loading` foi renomeado para `pending` (`isPending`). O `isLoading` agora significa `isPending && isFetching`: não tem dado ainda e está buscando, que é exatamente o "primeiro carregamento".
  - Entrou a opção `maxPages`, que limita quantas páginas ficam guardadas no cache de um infinite query.
