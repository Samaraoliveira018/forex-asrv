# Arquitetura — Diário Trader ASRV

> Atualizado em 22/10/2026. Complementa o [`ROADMAP.md`](./ROADMAP.md).

## 1. Contexto

O projeto nasceu como um `index.html` único com Tailwind/Chart.js via CDN. Ele continua
publicado na raiz do GitHub Pages enquanto a versão nova evolui em `/app/`.

A migração introduz um **monorepo** com três partes:

- `backend/` — pacote `@asrv/backend` (BFF + Supabase). É importado pelos apps.
- `frontend/` — app web em React + Vite.
- `mobile/` — app React Native/Expo (próximo incremento).

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
├── mobile/                    # Expo (próximo incremento)
├── doc/
├── index.html                 # app atual (raiz do Pages)
└── .github/workflows/static.yml
```

## 3. Camadas e regra de dependência

```
frontend / mobile
        │  importam apenas @asrv/backend
        ▼
   bff.ts (composition root)
        │
        ├── application (casos de uso) ──► domain
        └── infrastructure (Supabase) ──► application + domain
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
| UI | `frontend/src/**/*.test.tsx` | login, diário, avisos, exclusão, sessão |

- 83 testes no backend + 10 no frontend.
- Fakes em memória (`src/test/fakeSupabase.ts`, `frontend/src/test/fakeBff.ts`) evitam rede.
- `npm test` roda as duas workspaces; o CI bloqueia o deploy se algum falhar.

## 8. Mobile (próximo incremento)

Plano: Expo + TypeScript, com `@asrv/backend` como dependência de workspace.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBff } from '@asrv/backend';

const bff = createBff({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  storage: AsyncStorage, // a porta aceita storage sync ou assíncrono
});
```

O que falta no pacote para o mobile: nenhum adaptador novo — a fila e o storage já aceitam
API assíncrona desde o incremento atual. O trabalho é de UI e configuração do Metro
(monorepo).

## 9. Deploy

O workflow `.github/workflows/static.yml`:

1. `npm ci`
2. `npm test` (workspaces)
3. `npm run build -w @asrv/frontend` (base `/forex-asrv/app/`)
4. monta `_site/` com `index.html` na raiz, `frontend/dist` em `app/` e `doc/`
5. publica no GitHub Pages

Enquanto o app novo não atinge paridade, a raiz continua sendo o `index.html` atual.
Nenhum caminho absoluto deve ser usado no app novo: o Vite resolve o `base`.

## 10. Limitações atuais

- Sem cache local de leitura: offline, o app novo não lista operações antigas (a fila de
  escrita funciona). O app atual continua sendo a referência para uso diário.
- O React ainda não tem dashboard, gráficos, importação/exportação nem migração assistida.
- `service_role` nunca entra no repositório nem no bundle.
