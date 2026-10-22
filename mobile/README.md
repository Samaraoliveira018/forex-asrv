# Mobile — Expo (próximo incremento)

Status: **planejado**. A migração começou pelo frontend web; o mobile entra depois da
paridade mínima, reaproveitando o mesmo pacote `@asrv/backend`.

## Objetivo

App React Native (Expo + TypeScript) com login, diário, registro de operação e fila offline,
consumindo o BFF compartilhado — sem duplicar regra de negócio.

## Setup previsto

```bash
# criar o app em uma pasta temporária e mover para mobile/ (a pasta já existe)
npx create-expo-app@latest mobile-tmp --template blank-typescript
```

Dependências relevantes:

```bash
npm install @react-native-async-storage/async-storage
```

O `@asrv/backend` será adicionado como dependência de workspace (`"@asrv/backend": "*"`).

## Integração com o BFF

A porta de storage aceita API síncrona (`localStorage`) ou assíncrona (`AsyncStorage`),
então o mesmo `createBff` serve para web e mobile:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBff } from '@asrv/backend';

export const bff = createBff({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://atlybzarulwijlepngci.supabase.co',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '<publishable-key>',
  storage: AsyncStorage,
});
```

Regras que não mudam:

- `service_role` nunca vai para o app.
- O Supabase é a fonte da verdade; a fila offline é drenada com `bff.journal.flush()`.
- Datas sempre no fuso local (`YYYY-MM-DD`).

## Metro + monorepo

Expo SDK recente detecta monorepos automaticamente. Se necessário, ajustar
`mobile/metro.config.js` com `watchFolders` para a raiz e `nodeModulesPaths` para
`mobile/node_modules` + `node_modules` da raiz.

## Testes planejados

- `jest-expo` + `@testing-library/react-native` para telas.
- Regras de negócio já cobertas pelos 83 testes do backend; o mobile testa apenas
  integração de tela e navegação.

## Definição de pronto

- [ ] Login e logout funcionando contra o mesmo Supabase.
- [ ] Listar, criar e excluir operação.
- [ ] Registrar dia sem operar.
- [ ] Fila offline drenando ao reconectar.
- [ ] `npm test` e `npm run typecheck` verdes na workspace `mobile`.
- [ ] Nenhum segredo além da publishable key.
