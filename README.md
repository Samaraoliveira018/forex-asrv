# Diário Trader ASRV

Diário de trading com disciplina operacional: no máximo 2 operações por dia, perda
individual limitada a 20% do capital inicial, break even técnico e ofensiva de dias.
Os dados ficam no Supabase (fonte da verdade) e o cliente mantém uma fila offline.

## Links

- **App atual:** https://samaraoliveira018.github.io/forex-asrv/
- **App novo (migração):** https://samaraoliveira018.github.io/forex-asrv/app/
- **Roadmap:** [doc/ROADMAP.md](doc/ROADMAP.md)
- **Arquitetura:** [doc/ARCHITECTURE.md](doc/ARCHITECTURE.md)
- **Supabase:** [backend/supabase/README.md](backend/supabase/README.md)

## Estrutura

```
backend/    @asrv/backend — BFF (DDD) + schema/migrações do Supabase
frontend/   React + Vite + Tailwind (app web)
mobile/     Expo (próximo incremento)
doc/        roadmap e arquitetura
index.html  app atual, mantido no ar durante a migração
```

O `backend/` é um pacote TypeScript importado por web e mobile. Não há servidor HTTP
próprio: as regras e os casos de uso são compartilhados, e o Supabase aplica RLS por
`user_id`.

## Requisitos

- Node.js 24+
- npm 11+

## Comandos

```bash
npm install            # instala todas as workspaces
npm test               # testes do backend e do frontend
npm run typecheck      # TypeScript estrito em todas as workspaces

npm run dev -w @asrv/frontend      # app web em http://localhost:5173
npm run build -w @asrv/frontend    # build em frontend/dist
```

## Configuração

O app web usa, nesta ordem:

1. `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`;
2. os valores públicos padrão em `frontend/src/bff.ts` (mesma publishable key do app atual).

**Nunca** use `service_role` no frontend. Ela ignora RLS e não pode ir para o bundle.

## TDD

Nenhuma correção ou feature entra sem teste que falhe antes. A suíte cobre domínio,
casos de uso, adaptadores Supabase (com cliente falso) e componentes React.

```bash
npm run test:watch -w @asrv/backend
npm run test:watch -w @asrv/frontend
```

## Deploy

Push em `main` dispara o workflow de Pages, que:

1. instala dependências e roda os testes;
2. builda o frontend com base `/forex-asrv/app/`;
3. publica a raiz (`index.html` atual) + `app/` + `doc/`.

Enquanto o app novo não atinge paridade, a raiz permanece intocada.
