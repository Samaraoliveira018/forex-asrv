# Arquitetura — Diário Trader ASRV

> Atualizado em 22/10/2026. Complementa o [`ROADMAP.md`](./ROADMAP.md).

## 1. Contexto

O projeto nasceu como um `index.html` único com Tailwind/Chart.js via CDN. Ele continua
publicado na raiz do GitHub Pages enquanto a versão nova evolui em `/app/`.

A migração introduz um **monorepo** com quatro partes:

- `backend/` — pacote `@asrv/backend` (BFF + Supabase). É importado pelos apps.
- `frontend/` — app web em React + Vite.
- `mobile/` — app React Native/Expo.
- `packages/design-system/` — tokens e componentes compartilhados, com Storybook.

O BFF **não é um servidor HTTP**. É um pacote TypeScript com os casos de uso, as regras de
domínio e os adaptadores do Supabase. Isso elimina CORS, deploy de servidor e duplicação de
regra entre web e mobile. A chave usada no cliente é somente a **publishable/anon**; o RLS do
Supabase é a fronteira de segurança.

## 2. Estrutura

```
forex-asrv/
├── backend/
│   ├── src/
│   │   ├── domain/            # regras puras (sem Supabase, sem React)
│   │   ├── application/       # casos de uso + portas
│   │   ├── infrastructure/    # Supabase, storage, fila offline
│   │   ├── bff.ts             # composition root (createBff)
│   │   └── index.ts           # API pública do pacote
│   └── supabase/              # schema.sql, import_backup.sql, README
├── frontend/
│   └── src/
│       ├── features/          # auth, journal
│       ├── BffContext.tsx
│       ├── App.tsx
│       └── bff.ts             # instancia createBff com localStorage
├── mobile/
│   └── src/
│       ├── features/          # auth, journal (React Native)
│       ├── BffContext.tsx
│       ├── App.tsx
│       └── bff.ts             # createBff com AsyncStorage
├── packages/design-system/
│   ├── src/
│   │   ├── tokens.ts          # fonte única de cores/espaços/tipografia
│   │   ├── web/               # componentes DOM + styles.css compartilhado
│   │   ├── native/            # mesmos componentes em React Native
│   │   ├── index.ts           # entrada web
│   │   └── index.native.ts    # entrada native
│   ├── stories/               # Storybook (tokens + web)
│   └── .storybook/
├── doc/
├── index.html                 # app atual (raiz do Pages)
└── .github/workflows/         # static.yml (Pages) + release.yml (manual)
```

## 3. Camadas e regra de dependência

```
frontend / mobile
        │
        ├── @asrv/backend ──────────────┐
        │                               ▼
        │                        bff.ts (composition root)
        │                               │
        │                               ├── application ──► domain
        │                               └── infrastructure ──► application + domain
        │
        └── @asrv/design-system
                ├── tokens (web + native)
                └── componentes por plataforma
```

- **domain**: entidades (`Trade`), validações, break even, limite diário, perda máxima,
  ofensiva e estatísticas. Zero dependências externas.
- **application**: portas (`TradeRepository`, `AuthGateway`, `PendingJobStorage`, `Clock`) e
  serviços (`createJournalService`, `createAuthService`). Não conhece Supabase.
- **infrastructure**: implementações das portas com `@supabase/supabase-js`, fila em
  `localStorage`/`AsyncStorage` e tradução de erros.
- **bff**: único lugar que monta as peças (`createBff`) e exige sessão antes de acessar dados.

Regra prática: se um arquivo em `domain/` importar algo de fora do próprio domínio, está errado.

## 4. Fluxo de uma operação

```
JournalScreen
  └─ bff.journal.saveTrade(input)
       ├─ createTrade(input)                  # domínio valida
       ├─ lê trades + capital (para avisos)
       ├─ tradeRepository.upsert(trade)       # Supabase
       │    └─ falhou? enfileira PendingJob e devolve { synced: false }
       └─ devolve { trade, synced, warnings }
```

- **Online**: grava no Supabase e devolve `synced: true`.
- **Offline**: grava a intenção na fila (`asrv:pending`) e devolve `synced: false`.
  `bff.journal.flush()` reexecuta a fila em ordem; se um item falhar, os seguintes ficam
  preservados.
- **Avisos de disciplina** não bloqueiam o salvamento (igual ao app atual): o usuário é
  avisado, mas o registro é dele.

## 5. API pública do BFF

```ts
const bff = createBff({ url, anonKey, storage });

await bff.ready();                        // carrega sessão persistida

bff.auth.signIn(email, password);
bff.auth.signOut();
bff.auth.onChange(callback);

await bff.journal.list();                 // trades + dias sem operar + stats + disciplina
await bff.journal.saveTrade(input);
await bff.journal.deleteTrade(id);
await bff.journal.registerNoTradeDay('2026-10-22');
await bff.journal.removeNoTradeDay('2026-10-22');
await bff.journal.saveInitialBalance(1500);
await bff.journal.pendingCount();
await bff.journal.flush();
```

O snapshot de `list()` já traz `stats` e `discipline` calculados no domínio — a UI não
reimplementa regra de negócio.

## 6. Modelo de dados

O schema canônico está em [`../backend/supabase/schema.sql`](../backend/supabase/schema.sql).

| Tabela | Chave | Observação |
|---|---|---|
| `trades` | `(user_id, id)` | `date` é `date`; `pnl` e `lots` numéricos |
| `no_trade_days` | `(user_id, day)` | um registro por dia sem operar |
| `settings` | `user_id` | capital inicial (padrão 150) |

RLS em todas as tabelas (`auth.uid() = user_id`), sem grants para `anon`.

## 7. Testes (TDD)

Todo comportamento novo começa por um teste que falha.

| Camada | Arquivo | Cobertura atual |
|---|---|---|
| Domínio | `backend/src/domain/*.test.ts` | validação, break even, limites, ofensiva, estatísticas |
| Aplicação | `backend/src/application/journal.test.ts` | CRUD, avisos, fila, flush, validação de capital |
| Infra | `backend/src/infrastructure/*.test.ts` | mapeamento Supabase, upsert/delete, storage sync/async |
| Composição | `backend/src/bff.test.ts` | login, snapshot, save, offline → flush |
| UI web | `frontend/src/**/*.test.tsx` | login, diário, avisos, exclusão, sessão |
| Design system | `packages/design-system/src/**/*.test.ts(x)` | tokens, CSS, Button, Input, Select, Textarea, Checkbox, Card, Badge, StatCard, Alert, NavItem, SegmentedControl, ProgressBar, Modal, TradeCard, EmptyState (web) |
| UI mobile | `mobile/src/**/*.test.tsx` | login, abas, diário, modal, edição, saldo, sync, backup/importação, sessão |

- 83 testes no backend + 14 no frontend + 31 no design system + 19 no mobile = 147.
- Fakes em memória (`src/test/fakeSupabase.ts`, `frontend/src/test/fakeBff.ts`,
  `mobile/src/test/fakeBff.ts`) evitam rede.
- `npm test` roda todas as workspaces; o CI bloqueia o deploy se algum falhar.
- Os componentes native são exercitados pelos testes de tela do mobile (integração real
  com `jest-expo` + React Native Testing Library).

## 8. Design system

`@asrv/design-system` é a fonte de verdade visual dos dois apps. Os **tokens** são
TypeScript puro e não dependem de plataforma. Cada componente tem duas implementações com
a mesma API:

| Componente | Web | Mobile |
|---|---|---|
| `Button` | `<button>` + CSS | `Pressable` + `Text` |
| `Input` | `<input>` + label/erro acessível | `TextInput` + `accessibilityLabel` |
| `Card` | `<section>` | `View` |
| `Badge` | `<span>` | `Text` |
| `StatCard` | `Card` + tipografia | `View` + tipografia |
| `Select` / `Textarea` / `Checkbox` | controles nativos + label | `Textarea` e `Checkbox` native; seleção por `SegmentedControl`/`Input` |
| `NavItem` / `SegmentedControl` | navegação web acessível | tab bar inferior + `SegmentedControl` native |
| `ProgressBar` / `Alert` / `EmptyState` | feedback visual e estados | equivalentes native com acessibilidade |
| `Modal` / `TradeCard` | diálogo e card de operação extraídos do `index.html` | `Modal` native + `TradeCard` native |

O `index.html` da raiz importa `design-system.css`, gerado por
`packages/design-system/scripts/build-css.mjs` a partir de `src/web/styles.css`. Assim os
tokens, superfícies, botões, inputs, badges, tabela, modal e cards de operação são os
mesmos do app React, sem exigir um bundler no app estático.

O `package.json` expõe a condição `react-native`; o Metro resolve
`src/index.native.ts`, enquanto Vite/Storybook resolvem `src/index.ts`. Assim o mesmo
`import { Button } from '@asrv/design-system'` funciona nos dois ambientes.

O Storybook (`packages/design-system/stories`) documenta tokens, componentes web e
componentes native. Os native são renderizados no navegador via `react-native-web`
(alias configurado em `.storybook/main.ts`), então o catálogo cobre as duas plataformas.
O build estático (`storybook-static/`) é gerado no workflow de release; os componentes
native também são exercitados pelos testes de tela do Expo.

## 9. Mobile

O app Expo usa o mesmo BFF e o mesmo design system:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBff } from '@asrv/backend';

const bff = createBff({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  storage: AsyncStorage, // a porta aceita storage sync ou assíncrono
});
```

- Metro configurado para o monorepo (`watchFolders` + `nodeModulesPaths`).
- `jest-expo` + React Native Testing Library, com API assíncrona do RNTL 14.
- Shell com topbar, saldo editável, sincronização e abas Dashboard/Diário/Plano/Estatísticas.
- Diário com modal de criação/edição, grid/lista, metas de ofensiva, gráficos native,
  dias sem operar, backup por compartilhamento e importação por JSON colado.
- `npm run export:ios -w @asrv/mobile` valida o bundle Metro sem exigir Xcode.
- O workflow de release gera um APK Android universal com `expo prebuild` + Gradle,
  assinado com a debug keystore (instalação direta/teste). Assinatura de produção para a
  Play Store continua fora do CI e exige EAS/credenciais próprias.

## 10. Deploy

### Pages (automático)

O workflow `.github/workflows/static.yml` roda em push para `main`:

1. `npm ci`
2. `npm run typecheck` (todas as workspaces)
3. `npm test` (todas as workspaces)
4. `npm run build -w @asrv/frontend` (base `/forex-asrv/app/`)
5. `npm run build:css` (gera `design-system.css`)
6. monta `_site/` com `index.html` + `design-system.css` na raiz, `frontend/dist` em `app/` e `doc/`
7. publica no GitHub Pages

O `index.html` da raiz continua ativo, mas compartilha a paleta e os componentes visuais
com o app React por meio do CSS do design system. Nenhum caminho absoluto deve ser usado
no app novo: o Vite resolve o `base`.

### Release (manual)

O workflow `.github/workflows/release.yml` é disparado manualmente **a partir da `main`**.
Ele valida a tag (`vX.Y.Z`), exige correspondência com a `version` do `package.json` e
recusa tags existentes. Em seguida roda typecheck/testes, builda web + Storybook, gera o
APK Android (`expo prebuild --platform android` + `./gradlew assembleRelease`) e
`SHA256SUMS`, e cria uma GitHub Release com os zips `asrv-web-*`/`asrv-storybook-*` e o
`asrv-mobile-*.apk`.

O APK é universal e assinado com a debug keystore do Expo/RN — adequado para instalação
direta e testes, não para a Play Store. O token do workflow tem apenas `contents: write`;
a chave publishable do Supabase não é alterada nem exposta pelo processo.

## 11. Limitações atuais

- Sem cache local de leitura: offline, o app novo não lista operações antigas (a fila de
  escrita funciona). O app atual continua sendo a referência para uso diário.
- No mobile, a importação de backup é feita colando o JSON; não há seletor de arquivos
  nativo. Existe APK debug-signed gerado no CI, mas ainda não há assinatura de produção.
- `service_role` nunca entra no repositório nem no bundle.
