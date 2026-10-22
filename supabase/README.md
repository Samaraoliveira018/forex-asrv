# Supabase — Diário Trader ASRV

Ambiente preparado para guardar os dados na nuvem (Supabase) mantendo o `localStorage`
como cache local. O site é estático (GitHub Pages), então tudo roda no navegador.

## Arquitetura

```
index.html  ──(supabase-js via CDN)──►  Supabase (Postgres + Auth + RLS)
     │                                        │
     └── localStorage (cache + fila offline) ◄┘
```

- **Fonte da verdade:** Supabase.
- **Cache local:** `localStorage`, para o app abrir instantaneamente e continuar
  funcionando sem internet. Operações feitas offline entram numa fila e são
  enviadas quando a conexão volta.
- **Segurança:** RLS em todas as tabelas (`auth.uid() = user_id`). A `anon key`
  fica pública no HTML de propósito — sem login ela não acessa nenhuma linha.
- **Nunca** coloque a `service_role` key no `index.html` nem em nenhum arquivo do repositório.

## Status atual (projeto `atlybzarulwijlepngci`)

| Item | Situação |
|---|---|
| Schema (`trades`, `no_trade_days`, `settings`) | aplicado, com RLS |
| Policies (`user_id = (select auth.uid())`) | aplicadas |
| Trigger `updated_at` | aplicado (`search_path` fixo) |
| Usuário `samaraoliveira018@gmail.com` | criado e confirmado |
| `SUPABASE_URL` / chave publishable no `index.html` | configuradas |
| Leaked password protection | **pendente** (dashboard) |

Ainda falta apenas: **Authentication → Settings → Password Security → Enable leaked password protection**.

## Passo a passo (uma vez só)

### 1. Rodar o schema
1. Supabase Dashboard → **SQL Editor** → **New query**
2. Cole todo o conteúdo de [`schema.sql`](./schema.sql) e clique em **Run**
3. Confira no resultado final: `trades`, `no_trade_days` e `settings` com `rowsecurity = true`

### 2. Fechar o cadastro público
App é de uso individual, então ninguém além de você deve conseguir criar conta.

1. **Authentication** → **Sign In / Providers** → **Email**
2. Desligue **Allow new users to sign up**
3. **Authentication** → **Settings** → **Password Security** → ative **Leaked password protection**
4. (Opcional) Em **Authentication** → **Settings**, desligue confirmações que não usar

### 3. Criar o seu usuário
1. **Authentication** → **Users** → **Add user** → **Create new user**
2. Informe seu e-mail e uma senha forte
3. Se o usuário ficar como "unconfirmed", marque o e-mail como confirmado no menu do usuário

### 4. Configurar as URLs do Auth (GitHub Pages)
**Authentication** → **URL Configuration**:

- **Site URL:** `https://samaraoliveira018.github.io/forex-asrv/`
- **Redirect URLs:** adicione
  `https://samaraoliveira018.github.io/forex-asrv/`
  (necessário para o link de redefinição de senha)

### 5. Copiar URL e anon key
**Project Settings** → **API**:

- **Project URL** → ex.: `https://abcdefghijk.supabase.co`
- **anon public** → chave longa começando com `eyJ...`

Cole no `index.html`, no bloco marcado (procure por `SUPABASE_URL`):

```js
const SUPABASE_URL = 'https://abcdefghijk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

Enquanto essas duas constantes estiverem vazias, o app funciona **exatamente**
como hoje (somente `localStorage`) e nenhuma requisição é feita.

### 6. Publicar
```bash
git add index.html supabase
git commit -m "feat: integração com Supabase (online-first + cache local)"
git push origin main
```

## Migração dos dados que já estão no navegador

No primeiro login com a nuvem vazia, o app detecta os registros locais e pergunta:

> "Encontramos N registro(s) salvos neste navegador e a nuvem está vazia. Enviar para o Supabase agora?"

- **OK** → envia tudo (trades, dias sem operar e saldo inicial) e recarrega da nuvem
- **Cancelar** → mantém os dados locais intactos e não apaga nada

Se preferir migrar sem abrir o app, use [`import_backup.sql`](./import_backup.sql)
com o JSON gerado pelo botão **Exportar**.

> Recomendação: clique em **Exportar** antes de migrar. É o seu backup de segurança.

## Uso no dia a dia

| Ação | Comportamento |
|---|---|
| Abrir o app | mostra o cache local na hora e sincroniza com a nuvem em seguida |
| Salvar / editar / excluir operação | grava local + envia para o Supabase |
| Registrar dia sem operar | grava local + envia para o Supabase |
| Alterar saldo inicial | grava local + envia para o Supabase |
| Sem internet | tudo funciona local; ao voltar a conexão a fila é enviada |
| Botão **Sincronizar** | envia pendências e baixa o estado atual da nuvem |
| Botão **Sair** | encerra a sessão; os dados locais permanecem no navegador |

## Solução de problemas

| Sintoma | Causa provável | Correção |
|---|---|---|
| Modal de login não aparece | `SUPABASE_URL`/`ANON_KEY` vazias ou CDN bloqueado | preencha as constantes e recarregue |
| "E-mail ou senha incorretos" | usuário não criado ou senha errada | crie/redefina em Authentication → Users |
| Dados não aparecem em outro dispositivo | RLS ok, mas o app só puxa no login | use **Sincronizar** ou recarregue |
| "Pendências para enviar" persistente | sem internet, sessão expirada ou policy bloqueando | verifique a conexão, entre novamente e clique em **Sincronizar** |
| `new row violates row-level security policy` | schema antigo sem `default auth.uid()` | rode o `schema.sql` novamente |

## Rollback

Para voltar ao modo 100% local: apague os valores das duas constantes
(`SUPABASE_URL` e `SUPABASE_ANON_KEY`) e faça o deploy. O app volta ao
comportamento anterior, sem remover nada do Supabase.
