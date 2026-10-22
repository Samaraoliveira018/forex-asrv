# Mobile — Expo

Status: **implementado** (login, diário, registro, exclusão, dia sem operar e logout),
consumindo o BFF compartilhado `@asrv/backend` e o design system `@asrv/design-system`.

## Comandos

```bash
npm run start -w @asrv/mobile      # Expo
npm run ios -w @asrv/mobile        # simulador iOS
npm run android -w @asrv/mobile    # emulador Android
npm test -w @asrv/mobile           # Jest + React Native Testing Library
npm run typecheck -w @asrv/mobile
npm run export:ios -w @asrv/mobile # valida o bundle Metro sem Xcode
```

## Build do APK Android

O workflow de release gera o APK. Para reproduzir localmente:

```bash
cd mobile
npx expo prebuild --platform android --no-install --clean
cd android && ./gradlew assembleRelease
# saída: android/app/build/outputs/apk/release/app-release.apk
```

Requer JDK 17+ e Android SDK (`platforms;android-37.0`, `build-tools;37.0.0`,
`ndk;27.1.12297006`, `cmake;3.22.1`). O APK é universal e assinado com a debug keystore do
Expo/RN — bom para instalação direta e testes, não para a Play Store.

## Integração com o BFF

A porta de storage aceita API síncrona (`localStorage`) ou assíncrona (`AsyncStorage`),
então o mesmo `createBff` serve para web e mobile:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBff } from '@asrv/backend';

export const bff = createBff({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://atlybzarulwijlepngci.supabase.co',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '<publishable-key>',
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  },
});
```

Regras que não mudam:

- `service_role` nunca vai para o app.
- O Supabase é a fonte da verdade; a fila offline é drenada com `bff.journal.flush()`.
- Datas sempre no fuso local (`YYYY-MM-DD`).

## Metro + monorepo

`metro.config.js` inclui a raiz em `watchFolders` e resolve `node_modules` do app e da
raiz. A condição `react-native` do pacote de design system faz o Metro carregar
`src/index.native.ts`, enquanto Vite/Storybook carregam `src/index.ts`.

## Testes

- `jest-expo` + React Native Testing Library (API assíncrona do RNTL 14).
- 19 testes cobrindo login, erros, diário, avisos, exclusão, dia sem operar, logout e
  roteamento por sessão.
- Regras de negócio continuam cobertas pelos 83 testes do backend; o mobile testa a
  integração de tela.

## Definição de pronto

- [x] Login e logout funcionando contra o mesmo Supabase.
- [x] Listar, criar e excluir operação.
- [x] Registrar dia sem operar.
- [x] `npm test` e `npm run typecheck` verdes na workspace `mobile`.
- [x] Bundle Metro validado com `expo export`.
- [x] APK Android universal gerado no workflow de release (debug-signed).
- [ ] Validar em dispositivo físico e assinatura de produção via EAS/keystore.
- [x] Nenhum segredo além da publishable key.
