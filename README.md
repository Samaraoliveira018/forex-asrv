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
backend/                  @asrv/backend — BFF (DDD) + schema/migrações do Supabase
frontend/                 React + Vite + Tailwind (app web)
mobile/                   Expo + React Native (app mobile)
packages/design-system/   @asrv/design-system — tokens, componentes web/native e Storybook
doc/                      roadmap e arquitetura
index.html                app atual, mantido no ar durante a migração
```

O `backend/` é um pacote TypeScript importado por web e mobile. Não há servidor HTTP
próprio: as regras e os casos de uso são compartilhados, e o Supabase aplica RLS por
`user_id`.

O `@asrv/design-system` é consumido pelos dois apps:

- **tokens compartilhados** (`colors`, `spacing`, `radii`, `typography`);
- **componentes web** (`Button`, `Input`, `Card`, `Badge`, `StatCard`) em React DOM;
- **componentes native** com a mesma API, implementados com React Native;
- **Storybook** para explorar tokens e componentes web e native (native renderizado via `react-native-web`).

## Requisitos

- Node.js 24+
- npm 11+

## Comandos

```bash
npm install            # instala todas as workspaces
npm test               # testes de backend, frontend, design system e mobile
npm run typecheck      # TypeScript estrito em todas as workspaces

npm run dev -w @asrv/frontend      # app web em http://localhost:5173
npm run build -w @asrv/frontend    # build em frontend/dist

npm run storybook -w @asrv/design-system       # Storybook em http://localhost:6006
npm run build-storybook -w @asrv/design-system # build estático

npm run start -w @asrv/mobile      # Expo
npm run ios -w @asrv/mobile        # Expo no simulador iOS
npm run android -w @asrv/mobile    # Expo no emulador Android
npm run export:ios -w @asrv/mobile # valida o bundle Metro sem build nativo
```

## Configuração

O app web usa, nesta ordem:

1. `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`;
2. os valores públicos padrão em `frontend/src/bff.ts` (mesma publishable key do app atual).

O app mobile usa `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`, com o mesmo
fallback público em `mobile/src/bff.ts`.

**Nunca** use `service_role` no cliente. Ela ignora RLS e não pode ir para o bundle.

## TDD

Nenhuma correção ou feature entra sem teste que falhe antes. A suíte cobre domínio,
casos de uso, adaptadores Supabase (com cliente falso), componentes web/native e fluxo
de telas.

```bash
npm run test:watch -w @asrv/backend
npm run test:watch -w @asrv/frontend
npm run test:watch -w @asrv/design-system
npm run test:watch -w @asrv/mobile
```

## Deploy

Push em `main` dispara o workflow de Pages, que:

1. instala dependências, roda typecheck e testes;
2. builda o frontend com base `/forex-asrv/app/`;
3. publica a raiz (`index.html` atual) + `app/` + `doc/`.

Enquanto o app novo não atinge paridade, a raiz permanece intocada.

## Release manual

O workflow **Release** (`.github/workflows/release.yml`) é executado manualmente a partir
da `main` (`Actions → Release → Run workflow`).

Ele valida que a tag informada segue `vX.Y.Z`, que ela corresponde à `version` do
`package.json` e que ainda não existe. Depois roda typecheck/testes, builda o app web e o
Storybook, gera checksums e publica uma GitHub Release com:

- `asrv-web-vX.Y.Z.zip`;
- `asrv-storybook-vX.Y.Z.zip`;
- `SHA256SUMS`.

Releases nunca sobrescrevem uma tag existente. Para publicar uma nova versão, atualize a
`version` do `package.json` na `main` antes de disparar o workflow.

O binário nativo do mobile não é gerado por esse workflow; ele exige credenciais de
assinatura/EAS. O código mobile e suas configurações entram no source archive automático
da release.
