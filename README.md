# Diário Trader ASRV

Diário de trading com disciplina operacional: no máximo 6 operações e 3 stops por sessão
(dia/noite; break even não conta no limite), perda individual limitada a 25% do saldo inicial do
dia, break even técnico e ofensiva de dias.
Cada operação pode levar um **print** (foto ou captura de tela). Os dados ficam no Supabase
(fonte da verdade) e o cliente mantém uma fila offline.

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

O `@asrv/design-system` é consumido pelos dois apps e pelo `index.html` da raiz:

- **tokens compartilhados** (`colors`, `spacing`, `radii`, `typography`, `layout`);
- **componentes web** (`Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Card`,
  `StatCard`, `Badge`, `Alert`, `NavItem`, `SegmentedControl`, `ProgressBar`, `Modal`,
  `TradeCard`, `EmptyState`) em React DOM;
- **componentes native** com a mesma API, implementados com React Native;
- **CSS compartilhado** em `packages/design-system/src/web/styles.css`, gerado para a raiz
  como `design-system.css` e consumido pelo app estático;
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
npm run build:css                  # gera design-system.css a partir da fonte do DS

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

## Prints das operações

O print é opcional e vive em um bucket **privado** do Supabase Storage:

- bucket `trade-screenshots`, caminho `{user_id}/{trade_id}.webp` (ou `.jpg` em navegadores sem WebP);
- a coluna `trades.screenshot_path` guarda apenas o caminho, nunca uma URL pública;
- a leitura é feita por **URL assinada** (TTL de 24h), e a policy `trade_screenshots_own`
  restringe o acesso à pasta do próprio usuário (`foldername[1] = auth.uid()`);
- web (`frontend/`) e app atual (`index.html`) convertem a imagem para WebP (máx. 1280px,
  fallback JPEG) antes do upload; o mobile usa `expo-image-picker` + `expo-image-manipulator`;
- offline, o print entra na fila junto com a operação (`uploadScreenshot`) e sobe ao reconectar.

O schema e a seção de Storage ficam em [`backend/supabase/schema.sql`](backend/supabase/schema.sql).

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
3. gera `design-system.css` e publica a raiz (`index.html` + CSS compartilhado) + `app/` + `doc/`.

O `index.html` da raiz continua sendo o app estático, mas agora consome os tokens e
componentes visuais do design system. A migração do React acontece em paralelo em `/app/`.

A origem do Pages deve estar em **GitHub Actions**. Se estiver em “Deploy from a branch”,
o build automático da branch (`pages-build-deployment`) concorre com o `static.yml` e um
dos deployments falha com `due to in progress deployment`.

### Vercel (app React)

O app React também pode ser publicado na Vercel com **Root Directory = raiz do repositório**.
O `vercel.json` na raiz define o build:

- install: `npm ci` (instala as workspaces);
- build: `npm run build -w @asrv/frontend`;
- output: `frontend/dist`.

A Vercel serve o app na raiz (`/`), então o `VITE_BASE` é definido como `/` no `vercel.json`.
No GitHub Pages o default continua `/forex-asrv/app/`. Não é preciso mudar nada no dashboard
além de manter o Root Directory na raiz.

## Release manual

O workflow **Release** (`.github/workflows/release.yml`) é executado manualmente a partir
da `main` (`Actions → Release → Run workflow`).

Ele valida que a tag informada segue `vX.Y.Z`, que ela corresponde à `version` do
`package.json` e que ainda não existe. Depois roda typecheck/testes, builda o app web e o
Storybook, gera o APK Android (`expo prebuild` + Gradle), calcula checksums e publica uma
GitHub Release com:

- `asrv-web-vX.Y.Z.zip`;
- `asrv-storybook-vX.Y.Z.zip`;
- `asrv-mobile-vX.Y.Z.apk`;
- `SHA256SUMS`.

Releases nunca sobrescrevem uma tag existente. Para publicar uma nova versão, atualize a
`version` do `package.json` na `main` antes de disparar o workflow.

O APK é universal (todas as ABIs) e assinado com a debug keystore do Expo/RN, então serve
para instalação direta e testes em dispositivos/emuladores. Publicação na Play Store exige
um keystore de produção ou credenciais EAS. O código mobile e as configurações nativas
(geradas por `expo prebuild` durante o próprio workflow) entram no source archive
automático da release.
