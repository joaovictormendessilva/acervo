---
title: Convenções de nomes de tipos
description: Como nomear tipos no TypeScript (modelo do domínio, resumo, resposta e parâmetros da API, props) e por que usar type em tudo.
tecnologia: typescript
versao_testada: TypeScript 6.0
atualizado_em: 2026-11-22
fontes:
  - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces
sidebar:
  order: 2
---

## O que é

O padrão que uso para nomear tipos. A regra principal: **o modelo do domínio fica com o nome puro, e tudo que é uma variação dele ganha um sufixo que diz o papel.**

| Papel | Convenção | Exemplo |
| --- | --- | --- |
| Modelo do domínio (completo) | nome puro | `Product` |
| Versão resumida (para listas) | sufixo `Summary` | `ProductSummary` |
| Resposta crua da API | sufixo `Response` | `ProductResponse` |
| Parâmetros enviados à API | sufixo `Request` | `GetProductsRequest` |
| Entrada de função do app | sufixo `Params` | `GetProductsParams` |
| Saída de função | sufixo `Result` | `GetProductsResult` |
| Props de componente | sufixo `Props` | `ProductCardProps` |
| União de valores possíveis | nome do conceito | `ProductCategory` |

E tudo é declarado com `type`, nunca com `interface`.

## Quando usar

- Em qualquer projeto TypeScript, desde o começo.
- Quando o mesmo conceito aparece em vários formatos (o que vem da API, o que o app usa, o que a lista mostra, o que o componente recebe) e você precisa saber, só pelo nome, qual formato está na sua frente.

## Por que o modelo não tem sufixo

O modelo do domínio é **o conceito em si**: `Product` é o produto, com os nomes e os tipos que o seu app usa. Em DDD (Domain-Driven Design), isso se chama *linguagem ubíqua*, porque o tipo usa a mesma palavra que você usaria falando do app ("o produto tem nome, preço e descrição").

As outras formas são derivadas dele, e o sufixo responde "derivado de quê?":

- `ProductSummary` é uma **parte** do produto, a que cabe numa lista.
- `ProductResponse` e `GetProductsRequest` são o formato que **outra pessoa** definiu (a API).
- `ProductCardProps` é o que **um componente** recebe.

O contexto também vem do caminho do import, que diz de onde o tipo é:

```ts
import { Product } from "@/features/products/product-types";
```

## Passo a passo

### 1. O modelo do domínio, completo e resumido

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

O **nome puro vai para a versão completa**, porque é ela que representa "o produto de fato". O resumo é a variação, e por isso leva o sufixo. Se fosse o contrário (`Product` para o resumo e `ProductDetail` para o completo), daqui a uns meses você leria `Product` e pensaria no produto inteiro.

O modelo usa camelCase e os tipos do app. As datas ficam como string ISO, para o tipo continuar certo se o dado passar por um cache salvo em JSON.

### 2. Os tipos da API, fiéis ao que ela usa

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

Esses tipos têm **todos os campos** que a API usa, mesmo os que o app ignora, com os nomes originais (snake_case). Assim eles funcionam como documentação da API dentro do código: para saber o que vai e o que volta do servidor, você olha o tipo, sem precisar chamar a API.

O `Request` existe para separar os params da API dos params do app. A API recebe `per_page`, e o app não precisa saber disso.

### 3. A conversão entre os dois

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

É aqui que os campos não usados ficam para trás. Quem enxuga é o adapter, não o tipo da resposta. O `toProduct` reaproveita o `toProductSummary` com spread, para um campo comum ser mapeado num lugar só.

## Exemplo completo

`Params` e `Result` numa função do app, e `Props` num componente:

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
Se o TypeScript consegue inferir o retorno, você não precisa declarar o `Result`. Declare quando quiser que o tipo de saída fique explícito e documentado, por exemplo numa função que outras partes do app usam.
:::

## Resumo e completo: onde fica cada campo

O resumo não é "o que a lista mostra". Ele é **a parte do produto que as duas respostas da API trazem**. A tela escolhe o que exibir.

| Mudança | O que você mexe |
| --- | --- |
| A lista deixa de mostrar o preço | só o componente da lista. O `ProductSummary` continua com `price`. |
| A API renomeia um campo comum | só o `toProductSummary`, e o completo acompanha pelo spread. |
| A API da lista para de mandar um campo, mas o detalhe continua mandando | move o campo do resumo para o completo (veja abaixo). |

### Movendo um campo quando a API muda

Se a listagem parar de mandar `created_at`, mas o detalhe continuar mandando, o campo sai do resumo e entra no completo, nos tipos da API, no modelo e no adapter. Os exemplos mostram só os campos que importam para a mudança:

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

O spread continua igual, e o campo só muda de lugar, abaixo dele. Ao tirar o `createdAt` do `ProductSummary`, o `tsc` aponta todo lugar que ainda usa esse campo num resumo, então você não precisa lembrar onde ele era exibido.

A regra fica:

- **Um campo que as duas respostas têm** fica no resumo e chega ao completo pelo spread.
- **Um campo que só o detalhe tem** fica só no completo, abaixo do spread.

## Tipos iguais: separar ou juntar?

Dois tipos com os mesmos campos nem sempre são duplicação. O que decide é a pergunta: **"se um mudar, o outro muda junto?"**

**Em camadas diferentes, ficam separados.** `GetProductRequest` e `GetProductParams` podem ser iguais hoje, mas um muda quando a API muda e o outro quando o app muda. Se a API renomear `id` para `product_id`, só o `Request` muda, e o service traduz.

**Na mesma camada, representando o mesmo conceito, viram um tipo só.** Imagine que o app busca um produto e as avaliações dele:

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

Os dois tipos dizem a mesma coisa: **qual produto**. Não existe situação em que um mude e o outro não. Se o produto passar a ser identificado por `slug`, os dois mudam juntos, sempre. Então é um tipo só, com o **nome do conceito** (`ProductParams`), e não um por função. Na API acontece o mesmo: se os dois endpoints usam o mesmo caminho `/products/{id}`, eles recebem um `ProductRequest` só.

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

O `ProductParams` é passado para a api, que espera um `ProductRequest`. O TypeScript aceita porque os formatos são iguais. É exatamente o caso de "iguais hoje, mas cada um muda por um motivo".

## Formatos diferentes da mesma entidade

Às vezes a API manda a mesma entidade em mais de um formato. Por exemplo, uma avaliação removida que volta só com o `id`. O tipo da resposta declara os dois formatos, e o modelo vira uma união com um campo que diz qual é o caso. Assim o TypeScript não deixa a tela ler um campo que pode não existir sem antes checar o caso.

```ts title="src/features/products/api/product-api-types.ts"
export type PublishedReviewResponse = {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
};

export type RemovedReviewResponse = Pick<PublishedReviewResponse, "id">;

export type ReviewResponse = PublishedReviewResponse | RemovedReviewResponse;
```

```ts title="src/features/products/product-types.ts"
export type PublishedReview = {
  id: string;
  isRemoved: false;
  body: string;
  authorName: string;
  createdAt: string;
};

export type RemovedReview = {
  id: string;
  isRemoved: true;
};

export type Review = PublishedReview | RemovedReview;
```

```ts title="src/features/products/product-adapter.ts"
import { PublishedReviewResponse, ReviewResponse } from "./api/product-api-types";
import { Review } from "./product-types";

const isPublishedReview = (review: ReviewResponse): review is PublishedReviewResponse => "body" in review;

const toReview = (review: ReviewResponse): Review => {
  if (!isPublishedReview(review)) {
    return {
      id: review.id,
      isRemoved: true,
    };
  }

  return {
    id: review.id,
    isRemoved: false,
    body: review.body,
    authorName: review.author_name,
    createdAt: review.created_at,
  };
};
```

Cada caso do modelo ganha um nome (`PublishedReview`, `RemovedReview`), como os DTOs, e a união fica numa linha só no fim. No adapter, o caso de exceção sai cedo e o formato principal fica no `return` final.

O guard pergunta pelo formato **completo** (`isPublishedReview`), e não pelo reduzido. Como o reduzido é um `Pick` do completo, todo item completo também cabe no tipo reduzido. Um guard `review is RemovedReviewResponse` deixaria os dois formatos entrarem no `if`, e o que sobra embaixo viraria `never`.

## `type` ou `interface`?

A doc oficial do TypeScript trata como **preferência pessoal**. No handbook, a seção *Differences Between Type Aliases and Interfaces* termina assim:

> *"For the most part, you can choose based on personal preference, and TypeScript will tell you if it needs something to be the other kind of declaration. If you would like a heuristic, use `interface` until you need to use features from `type`."*

Ou seja: na maioria dos casos, escolha por preferência. Se quiser uma regra, use `interface` até precisar de algo que só `type` faz.

As diferenças reais são poucas:

- Só `type` declara uniões (`"clothing" | "books"`), apelidos de tipos primitivos e tipos derivados (mapped e conditional types).
- Só `interface` faz **mesclagem de declarações**: declarar a mesma interface duas vezes soma os campos. Com `type`, isso dá erro de `Duplicate identifier`.
- `interface` com `extends` costuma ser mais rápido para o compilador do que `type` com interseção (`&`). Isso só pesa em projetos muito grandes.

Eu uso **`type` em tudo**: é uma regra só, ela cobre as uniões e eu nunca preciso parar para pensar "isso é interface ou type?". As diferenças acima não aparecem num app comum.

### E a regra "interface para contratos, type para o resto"?

É uma opinião comum em vídeos e posts, mas **não é um padrão oficial**, e o critério é subjetivo. Quase tudo é "contrato" de alguma coisa:

- `ProductResponse` é o contrato com a API.
- `ProductCardProps` é o contrato entre o componente e quem o usa.
- `Product` é o contrato do domínio com o resto do app.

Cada pessoa do time traçaria a linha num lugar diferente, e a discussão iria parar no code review. Se você quer dividir, use a regra do handbook, que pelo menos é objetiva.

## Armadilhas comuns

- **Prefixo `I` ou `T`** (`IProduct`, `TProduct`): vem do C# e da notação húngara. A comunidade TypeScript não usa, e o editor já mostra que é um tipo.
- **Sufixos que repetem a palavra-chave** (`ProductType`, `ProductInterface`, `ProductModel`): não estão errados, mas são ruído. O `type` na declaração já diz que é um tipo.
- **Dar o nome puro para o resumo**: `Product` para a lista e `ProductDetail` para o completo funciona, mas contraria a intuição de que "o produto" é o objeto inteiro.
- **Tirar um campo do resumo porque uma tela parou de mostrar**: o resumo descreve o que a API manda, não o que uma tela exibe. Quem escolhe o que mostrar é o componente.
- **Usar o mesmo tipo de params na API e no app**: o vocabulário da API (`per_page`, snake_case) vaza até a tela. Use `Request` na API e `Params` no app.
- **Um tipo de params por função quando todas recebem a mesma coisa** (`GetProductParams`, `GetReviewsParams`): é duplicação. Se o conceito mudar, você precisa lembrar de mudar todos. Use um tipo com o nome do conceito (`ProductParams`).
- **Componente redeclarando o tipo do modelo**: uma cópia local não desacopla nada, só cria uma versão que precisa ser mantida igual na mão. Importe da própria feature.
- **Tipar parâmetros direto na assinatura** (`getProducts(params: { page: number; category: string })`): funciona, mas quando entrar um parâmetro novo você mexe na assinatura da função. Com um `GetProductsParams`, o contrato fica num lugar só e com nome, e quem chama a função pode reaproveitar o tipo.
- **Usar o tipo da API nos componentes**: o app passa a "pensar" com o vocabulário de outra pessoa. Se a API renomear um campo, todos os componentes quebram, e não só o adapter.
- **Cortar campos do tipo da resposta "porque não usa"**: na hora que precisar de um campo, você vai ter que consultar a API em vez de olhar o código.
- **Misturar `type` e `interface` sem critério**: qualquer uma das duas regras funciona. O que atrapalha é não ter regra.

## O que mudou entre versões

- **TypeScript 4.2**: os nomes de `type` passaram a aparecer nas mensagens de erro. Antes, às vezes o erro mostrava o tipo expandido no lugar do nome, e essa era uma vantagem antiga de `interface`.
