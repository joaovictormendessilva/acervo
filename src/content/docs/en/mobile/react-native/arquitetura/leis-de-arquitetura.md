---
title: Architecture laws
description: The organization, layer, type, function and duplication rules every React Native app follows, with the reason for each one.
tecnologia: react-native
versao_testada: Expo SDK 58 · TypeScript 6.0 · TanStack Query 5
atualizado_em: 2026-11-22
fontes:
  - https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
  - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-annotations-on-variables
  - https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator
  - https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
  - https://docs.expo.dev/guides/react-compiler/
sidebar:
  order: 0
---

## What it is

The architecture rules that apply to **every** React Native app, regardless of the project. Each rule has a code (`L2.3`) so it can be cited in a code review.

This note is the source of the rules. The detailed notes show the full examples:

- [Folder structure](/en/mobile/react-native/arquitetura/estrutura-de-pastas/)
- [Type naming conventions](/en/mobile/react-native/arquitetura/convencoes-de-nomes-de-tipos/)
- [API access layers](/en/mobile/react-native/rede/camadas-de-acesso-a-api/)

Code style (import order, formatting) is **not** covered here: tools enforce it. See [Setting up ESLint](/en/mobile/react-native/configuracao/configurando-eslint/).

## When to use

- When creating any new file in an app: to decide where it goes, what it's called and what it may import.
- When reviewing code, your own or AI-generated.

## When NOT to use

The laws have no automatic exceptions. When a rule seems to get in the way, the exception is a **conscious decision**: discuss it first, confirm the rule really doesn't fit that case and record the reason in the commit. If the same exception keeps showing up, the rule is the problem, and it should change here.

## Step by step

### Law 1: Organization

- **L1.1 `src/app/` only holds routes and layouts.** Every file there becomes a screen in Expo Router. Components, hooks and logic live elsewhere.
- **L1.2 Domain code goes in `src/features/<subject>/`, domain-free code goes in `src/shared/`.**
- **L1.3 Dependencies only flow down: `app → features → shared`.** `shared` never imports from `features`. If they went both ways, changing a feature could break code that should be generic.
- **L1.4 A feature doesn't import from another feature.** Features that import each other turn into a web, and you can't touch one without breaking the other. When two features need to talk:
  - the screen (`src/app/`) brings them together, since it can import from any feature;
  - or what they share moves down to `shared`;
  - or one of them isn't a feature, but part of the other. An entity that only exists inside another (a post's comments, an order's items) stays in the main entity's feature.
- **L1.5 The shared test is "does this code know what a domain entity is?".** If it does, it belongs to the feature. Shared code **may** depend on app infrastructure (theme, fonts, constants, HTTP client). Being shared doesn't mean it has to work in another app without taking anything along. Routes centralized in shared (a file of route constants and helpers) are navigation infrastructure, even when they build the path to an entity: the helper knows the shape of the URL, not the entity. That's why it takes simple values (`id`, `slug`), never the model.
- **L1.6 A subfolder only exists when it groups 2 or more files.** A folder with a single file only adds a navigation level.
- **L1.7 Files in kebab-case, prefixed with the feature:** `<feature>-types.ts`, `<feature>-adapter.ts`, `<feature>-service.ts`, `api/<feature>-api.ts`, `api/<feature>-api-types.ts`. The prefix follows the feature even when the API uses another vocabulary: the file says who it belongs to, and the types inside it say what the API speaks.

### Law 2: Data layers

The flow is `screen → hook → service → api → client`, always in that direction.

| Layer | Responsibility | Never does |
| --- | --- | --- |
| **client** (`shared/api/`) | HTTP instance: baseURL, timeout, interceptors | know an endpoint |
| **api** | endpoint, params and raw response | import the adapter or the model |
| **adapter** | convert the response into the model | call the API |
| **service** | translate app params into API params, call the api, convert with the adapter and decide app rules (page size, for example) | get called by the api or the screen |
| **hook** | the query: key, cache, pagination | call the api directly or change the query result |

- **L2.1 No layer skips another.** The screen doesn't call the service, and the hook doesn't call the api. Skipping a layer carries the API vocabulary all the way to the screen.
- **L2.2 The api returns the raw format.** The service converts it, with the adapter.
- **L2.3 The hook returns the query untouched.** Data transformation goes in `select`. Spreading the query (`{ ...query, items }`) turns off React Query's render optimization.
- **L2.4 The `queryKey` is hierarchical: `[feature, kind, params]`**, with the whole params object inside. Everything in the feature starts with the same prefix, child entities included (`["products", "list", params]`, `["products", "detail", params]`, `["products", "reviews", params]`), so `invalidateQueries({ queryKey: ["products"] })` refreshes all of it at once.
- **L2.5 In an app with a persisted cache, changing the model shape requires bumping the cache version.** The cache saved on the device holds what the `queryFn` returned, that is, the model coming out of the adapter. If the adapter starts returning another shape (a new field, a renamed one, a union like in L3.11) and the version stays the same, anyone already using the app gets the old cache, and the screen breaks on data the type says exists. Keep the version in a constant (`CACHE_VERSION`), pass it as `buster` in `persistOptions` and bump it together with the model change. Changing only `select` doesn’t need a new version, since it doesn’t change what is saved. Details in [React Query persisted cache](/en/mobile/react-native/rede/react-query-cache-persistido/).

### Law 3: Types

- **L3.1 Suffix by role:**

  | Role | Convention |
  | --- | --- |
  | Domain model, complete | plain name (`Product`) |
  | Summary version | `Summary` |
  | Raw API response | `Response` |
  | Sent to the API | `Request` |
  | App function input | `Params` |
  | Function output | `Result` |
  | Component props | `Props` |

- **L3.2 Always `type`, no `I` or `T` prefix.** One rule, which also covers unions.
- **L3.3 The API response type is faithful to it:** every field, with the original names. It documents the API inside the code. The adapter is what trims it.
- **L3.4 The model speaks the app's language:** camelCase and dates as ISO strings, so the type stays correct after going through a cache saved as JSON.
- **L3.5 The summary holds the fields every response brings.** The complete type extends the summary, and a field only the detail has lives only in the complete type.
- **L3.6 The same shape in different layers is not duplication.** `GetProductsRequest` (API) and `GetProductsParams` (app) stay separate even when they match, because they change for different reasons: one when the server changes, the other when the app changes.
- **L3.7 The same shape in the same layer, representing the same concept, is duplication.** It becomes a single type, named after the concept, not one type per function. If `getProduct` and `getReviews` both take "which product", both use `ProductParams`. On the API side, both endpoints use `ProductRequest`.
- **L3.8 A component never redeclares a model type.** It imports it from its own feature. A local copy decouples nothing: it just creates a second version that has to be kept in sync by hand.
- **L3.9 Type the boundaries and let TypeScript infer the inside.** If every function has typed input and output, the code inside it inherits the checking.

  | Where | Annotate? |
  | --- | --- |
  | Function parameters | always |
  | Adapter return | always: it's the model contract, and a missing or extra field errors right there |
  | Exported function return (service, api) | when the type isn't obvious |
  | HTTP response (`get<ProductResponse[]>`) | always: TypeScript doesn't know what the server returns |
  | Configuration constants | `as const satisfies Type`: checks against the type without losing the literal value |
  | Local variable with a literal value | never: besides being noise, it widens the type (`const s: string = "new"` is no longer accepted where `"new" \| "old"` is expected) |
  | Local variable holding a function's return | no: the function already has a typed return |

- **L3.10 Singular and plural reflect what the name holds.** A list item has a singular name (`ChildResponse`, not `ChildrenResponse`), a list a plural one, and a `.map` parameter is the singular of the list, without reusing its name.
- **L3.11 When the API sends different shapes for the same entity, the DTO declares the union and the model becomes a union with a field that identifies the case.** Example: a deleted item that comes back with only its `id`. With the union, TypeScript won't let the screen read a field that may not exist without checking the case first, and the error shows up in the typecheck, not on the device. The adapter decides which shape arrived with a *type guard* (a function that returns `x is Type`).

  Each model case gets a name, like the DTOs, and the adapter takes the exception case out early (L4.6). The guard asks for the **complete** shape, not the reduced one: since the reduced one is a `Pick` of the complete one, a guard on the reduced shape turns the rest of the function into `never`. The full example is in [Type naming conventions](/en/mobile/react-native/arquitetura/convencoes-de-nomes-de-tipos/#different-shapes-of-the-same-entity).

- **L3.12 A concept has a single name across the model, in every entity.** If the post calls the author `authorName`, the comment does too, not `ownerUsername`. With the same names, a component that serves both entities takes a `Pick` of the model and accepts both, and whoever reads the code doesn't have to figure out whether two names mean the same thing. The API name doesn't matter here: the adapter translates (`owner_username` becomes `authorName` in both).

### Law 4: Functions

- **L4.1 Params always in an object with a named type.** A new parameter only changes the types, not the signature in every layer.
- **L4.2 Components are declared with `function` and exported by name.** Everything else (api, adapter, service, hooks, helpers) uses `const` with an arrow function. `export default` only exists in routes, because Expo Router requires it.
- **L4.3 A layer's functions are grouped in an object exported at the end of the file** (`productApi`, `productAdapter`, `productService`). Callers read `productService.getProducts`, and the name already tells the layer.
- **L4.4 The adapter has one `to<Model>` function per model.** The complete one reuses the summary with spread, so a shared field is mapped in one place. Nested structures (responses with children) call the function itself recursively.
- **L4.5 Each piece of logic has its place:**
  - formatting for display (relative date, currency) stays in the screen or component;
  - a value derived from the model (reading time, order total) may stay inline while it has a single use, and moves to the adapter when a second one shows up.

- **L4.6 Exception cases leave early with `return`, and what the function really returns stays in the final `return`.** Whoever reads the end of the function sees the main path, and the detours (deleted item, missing data, error) sit at the top, each one handled and out of the way. The L3.11 example follows this shape.

### Law 5: Components

- **L5.1 A feature component receives the model; a shared component receives plain props.**
  - In a feature, the component can know the type. Receiving `product: ProductSummary` is less code, and a new field in the UI only changes the component.
  - In shared, the component can't know the model (L1.3), so it receives simple values (`title`, `subtitle`).

  It's not personal taste: the component's location decides.

### Law 6: Duplication

- **L6.1 The test is "if one changes, does the other change too?".** If so, it's the same thing and lives in one place. If not, the similarity is a coincidence and both stay separate (as in L3.6). It applies to types, components and values.
- **L6.2 An abstraction only appears with the second use.** A helper or component extracted for a single use is anticipation.
- **L6.3 A value used by more than one consumer is built once.** If two hooks take the same params, the screen builds the object once and passes it to both.
- **L6.4 Small, side-by-side repetition inside the same function is accepted when it keeps the reading linear.** What L6.1 prevents is one copy changing while the other is left behind, and that happens when the copies are far apart. Two versions of an object, one right below the other in the same function (like the two `return`s in the L3.11 adapter), don't carry that risk: whoever touches one sees the other. Pulling the shared fields into a separate function just to avoid repeating them trades a low risk for a reading that forces you to jump between functions. Outside the same function, L6.1 applies as usual.

### Law 7: Performance

- **L7.1 React Compiler on by default.** It memoizes components and callbacks on its own, so manual `memo`, `useCallback` and `useMemo` only come in with a measured reason. The caveats are in [React Compiler in Expo](/en/mobile/react-native/performance/react-compiler/).

## Full example

A feature following the laws:

```
src/features/products/
├── api/
│   ├── product-api.ts          → productApi.getProducts(GetProductsRequest)
│   └── product-api-types.ts    → GetProductsRequest, ProductRequest, ProductResponse
├── components/
│   ├── product-card.tsx        → receives product: ProductSummary
│   └── product-list.tsx
├── hooks/
│   ├── use-product.ts          → ["products", "detail", params]
│   └── use-product-list.ts     → ["products", "list", params]
├── product-adapter.ts          → toProductSummary, toProduct
├── product-service.ts          → translates Params into Request
└── product-types.ts            → Product, ProductSummary, ProductParams, GetProductsParams
```

The code for each file is in the [layers](/en/mobile/react-native/rede/camadas-de-acesso-a-api/) and [type naming](/en/mobile/react-native/arquitetura/convencoes-de-nomes-de-tipos/) notes.

## Common pitfalls

- **Mixing up the two duplications**: equal types in different layers stay separate (L3.6), and equal types in the same layer become one (L3.7). To decide, use L6.1.
- **Typing everything "to be safe"**: `tsc` catches the error with or without the annotation. The annotation only changes **where** the error shows up, and inside a function it widens types and repeats contracts (L3.9).
- **Creating a feature for an entity that only exists inside another**: it will need to import from the main feature, which breaks L1.4.
- **Using "does it work in another app?" as the shared criterion**: almost nothing passes, because every component uses the theme. The criterion is whether it knows the domain (L1.5).

## What changed between versions

- **2026-11-22 (revision 4)**: added the early exit for exception cases (L4.6).
- **2026-11-22 (revision 3)**: added a single name per concept in the model (L3.12), and L1.5 now says routes centralized in shared are navigation infrastructure.
- **2026-11-22 (revision 2)**: added bumping the cache version when the model shape changes (L2.5).
- **2026-11-22 (revision)**: added the union for different shapes of the same entity (L3.11) and the accepted repetition inside the same function (L6.4).
- **2026-11-22**: first version. Added duplication within the same layer (L3.7), the type-the-boundaries rule (L3.9), the ban on imports between features (L1.4), the props-by-layer rule (L5.1) and the domain-based shared criterion (L1.5), which replaced the "does it work in another app?" test.
