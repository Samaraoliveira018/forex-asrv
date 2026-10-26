# Roadmap — Diário Trader ASRV

> Última atualização: **23/10/2026** · Referência: migração para monorepo
> App atual: https://samaraoliveira018.github.io/forex-asrv/
> Novo app (migração): https://samaraoliveira018.github.io/forex-asrv/app/
> Documentação técnica: [`../backend/supabase/README.md`](../backend/supabase/README.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## 1. Visão

Um diário de trading pessoal que força **disciplina operacional** (máximo 4 trades válidos/dia —
break even não conta —, perda individual ≤ 25% do saldo inicial do dia e ofensiva de dias) e que
**nunca perde um registro**, esteja você online, offline ou trocando de dispositivo.

### Objetivos

1. Registrar uma operação em menos de 30 segundos, inclusive no celular.
2. Garantir que o dado exista em dois lugares: cache local + Supabase.
3. Transformar o histórico em decisão: saber onde ganha e onde perde dinheiro.
4. Manter o deploy simples e sempre funcionando no GitHub Pages.

### Não objetivos

- Não é plataforma social, não publica operações e não dá sinais.
- Não custodia dinheiro nem conecta conta real de corretora (sem decisão explícita futura).
- Não vira multi-tenant complexo enquanto for uso individual.

---

## 2. Estado atual (Fase 0 — concluída)

| Área | Entregue |
|---|---|
| App | Diário, dashboard, plano operacional e estatísticas em página estática |
| Regras de disciplina | Limite de 4 trades/dia (break even não conta), perda máxima de 25% do saldo inicial do dia, break even, ofensiva com metas (3/7/14/30/60 dias) |
| Dados | Cache em `localStorage` com migração de chaves antigas e sanitização de dados |
| Nuvem | Supabase (Postgres + Auth + RLS) com login por e-mail/senha e Storage privado para os prints (`trade-screenshots`, URL assinada) |
| Sincronização | Online-first, fila offline, envio ao reconectar, sync manual e migração assistida do histórico local |
| Segurança | RLS por `user_id`, `anon` sem privilégios, policies otimizadas, trigger com `search_path` fixo |
| Deploy | GitHub Pages automático em `main` (workflow `static.yml`) |
| Robustez | Datas no fuso local, IDs seguros, gráficos só em abas visíveis, testes de fluxo local e nuvem |

### Pendências conhecidas da Fase 0

- [ ] Ativar **Leaked password protection** (Authentication → Settings)
- [ ] Configurar **Site URL / Redirect URLs** no Auth (necessário para "Esqueci a senha")
- [ ] Confirmar a migração do histórico local no primeiro login em produção

---

## 2.1 Em andamento — monorepo + BFF (M)

O app atual continua no ar em `/` enquanto o novo app React evolui em `/app/`.
O backend (`backend/`) passa a ser um pacote (`@asrv/backend`) importado por web e mobile.

| ID | Entrega | Status |
|---|---|---|
| M-01 | Mover `supabase/` para `backend/supabase/` | ✅ |
| M-02 | BFF `@asrv/backend` em DDD (domain/application/infrastructure) com TDD | ✅ 98 testes |
| M-03 | Frontend Vite + React + Tailwind consumindo o BFF | ✅ 15 testes |
| M-04 | Publicar o novo app em `/app/` sem quebrar a raiz | ✅ |
| M-05 | App mobile Expo importando `@asrv/backend` e design system | ✅ 20 testes |
| M-06 | Paridade: dashboard, estatísticas, cache offline, importação | ⏳ |
| M-07 | Aposentar `index.html` e publicar o React na raiz | ⏳ |
| M-08 | Design system web/native com tokens + Storybook | ✅ 31 testes |
| M-09 | Release manual no GitHub com web + Storybook + checksums | ✅ |
| M-10 | Print da operação (Storage privado + URL assinada) em web, mobile e `index.html` | ✅ |

**Critério para M-07:** M-06 concluído, uma semana de uso no `/app/` sem perda de dados
e conferência local × nuvem com contagens iguais.

---

## 3. Como priorizar

- **P0** — risco de perda de dados, segurança ou deploy quebrado. Entra na próxima semana.
- **P1** — dor real de uso diário. Entra no próximo ciclo.
- **P2** — ganho analítico ou de conforto. Planejado, sem prazo rígido.
- **P3** — exploração. Só começa com demanda concreta.

**Esforço:** `P` ≤ 1 dia · `M` 2–5 dias · `G` > 1 semana.

---

## 4. Fase 1 — Confiabilidade e segurança (P0)

Objetivo: eliminar qualquer chance de perder dados ou quebrar o deploy sem aviso.

| ID | Entrega | Por quê | Esforço | Critério de aceite |
|---|---|---|---|---|
| R-01 | Ativar leaked password protection e URLs do Auth | Fecha o aviso de segurança e habilita recuperação de senha | P | Advisor de segurança sem WARN e e-mail de reset abrindo a URL correta |
| R-02 | Rodar os testes no CI a cada push | Hoje a validação é manual; um erro de sintaxe iria ao ar | M | Job `test` roda `node --check` + smoke test e bloqueia deploy se falhar |
| R-03 | Remover dependência do Tailwind CDN | O CDN avisa "não use em produção" e é um ponto de falha externo | M | CSS gerado localmente, sem request para `cdn.tailwindcss.com`, visual idêntico |
| R-04 | Erros de sincronização visíveis | Falha silenciosa faz o usuário achar que salvou na nuvem | P | Toast/banner com estado e ação "tentar novamente"; nada em `console` apenas |
| R-05 | Trocar `alert`/`confirm` por modais e toasts | Bloqueiam a UI e não funcionam bem no celular | M | Nenhum `alert`/`confirm` nativo no fluxo de uso |
| R-06 | Snapshot automático diário do cache local | Protege contra limpeza de dados do navegador | P | Últimos 7 snapshots versionados em `localStorage` + botão restaurar |
| R-07 | Sessão expirada sem perder a fila | Token vence e o usuário pode achar que perdeu registros | P | Re-login preserva `pendingOps` e envia tudo ao reconectar |
| R-08 | README raiz + link para `doc/` | Onboarding e contexto do projeto em um lugar | P | `README.md` com visão, stack, deploy e links |

---

## 5. Fase 2 — Experiência diária (P1)

Objetivo: registrar rápido no celular e manter dois dispositivos coerentes.

| ID | Entrega | Por quê | Esforço | Critério de aceite |
|---|---|---|---|---|
| R-09 | PWA instalável + offline completo | App de rotina precisa abrir sem internet e com ícone na tela inicial | M | Service worker cacheia app/CDNs; instalável; abre offline |
| R-10 | Sincronização em tempo real | Evita divergência entre celular e desktop | G | `postgres_changes` atualiza a tela; conflito resolvido por `updated_at` com aviso |
| R-11 | Filtros e busca no diário | Histórico cresce e a lista fica longa | M | Filtro por período, ativo, direção e resultado; busca por observação |
| R-12 | Exportar/importar CSV | Levar dados para planilha e trazer de outra ferramenta | M | CSV com cabeçalho, datas ISO e valores numéricos; import valida e mostra prévia |
| R-13 | Acessibilidade do login e do modal | Foco preso, ESC, labels e contraste | P | Navegação por teclado completa; `aria-*` nos campos e botões |
| R-14 | Rotas por hash (`#dashboard`, `#stats`) | Link direto e botão voltar do navegador | P | Aba ativa reflete a URL e sobrevive a reload |
| R-15 | Ajustes de mobile | Registrar trade no celular é o caso mais comum | P | Formulário usável em 360px sem scroll horizontal |

---

## 6. Fase 3 — Inteligência de trading (P2)

Objetivo: usar o histórico para melhorar decisão, não só registrar.

| ID | Entrega | Por quê | Esforço | Critério de aceite |
|---|---|---|---|---|
| R-16 | Métricas avançadas | Win rate sozinho engana | M | Expectância, drawdown máximo, payoff médio, R múltiplo quando stop informado |
| R-17 | Análise por sessão/horário/dia | Revela quando o trader realmente tem vantagem | M | Gráficos e tabela com P/L e win rate por recorte |
| R-18 | Calendário heatmap | Mostra consistência e sequências de perda | P | Mês navegável com cor por resultado diário |
| R-19 | Relatório mensal | Fechamento do mês sem montar planilha | M | Página imprimível/PDF com resumo, gráficos e violações de regra |
| R-20 | Alertas de violação em tempo real | Disciplina no momento da decisão | P | Aviso imediato ao ultrapassar 4 trades válidos (break even não conta) ou a perda máxima, com registro no histórico |
| R-21 | Checklist e plano editáveis | O plano hoje é estático | P | Itens do checklist persistem e o plano aceita edição |

---

## 7. Fase 4 — Expansão (P3, somente com demanda)

| ID | Entrega | Observação |
|---|---|---|
| R-22 | Múltiplas contas/corretoras | Separação por conta com o mesmo usuário |
| R-23 | Compartilhamento read-only | Link assinado e expirável, apenas leitura |
| R-24 | Multi-usuário com convite | Só se outra pessoa for usar; exige revisão de RLS e onboarding |
| R-25 | Integração com corretora/MT5 | Alto risco e alto esforço; validar viabilidade antes |
| R-26 | Wrapper mobile (PWA → loja) | Depende de R-09 e de demanda real |

---

## 8. Dívida técnica registrada

| ID | Item | Impacto | Decisão |
|---|---|---|---|
| T-01 | `index.html` único com ~1.700 linhas | Dificulta revisão e testes | Aceitar por ora; modularizar só se passar de ~3.000 linhas |
| T-02 | Dependência de CDNs (Chart.js, Supabase, Tailwind) | Falha externa derruba a UI | Mitigar em R-03 e R-09 (cache local) |
| T-03 | Cache do GitHub Pages (~10 min) | Usuário pode ver versão antiga após deploy | Adicionar sufixo de versão no `index.html` ao publicar |
| T-04 | Sem telemetria de erros | Bug em produção demora a ser descoberto | Avaliar Sentry/equivalente com consentimento (P2) |
| T-05 | Conflito entre dispositivos é last-write-wins | Edição simultânea pode sobrescrever | Resolver junto com R-10 |
| T-06 | Sem testes end-to-end no navegador | Regressões visuais não são pegas | Adicionar Playwright em R-02/R-09 |
| T-07 | Backup só manual (Exportar) | Usuário pode esquecer | R-06 cobre o caso local |

---

## 9. Métricas de sucesso

| Métrica | Meta | Como medir |
|---|---|---|
| Registro de disciplina | ≥ 5 dias registrados por semana | Ofensiva + histórico |
| Perda de dados | 0 casos | Conferência mensal: contagem local × nuvem |
| Tempo de registro | < 30 s do toque ao salvar | Cronômetro manual em 3 tentativas |
| Carga inicial | < 2 s em 4G | Lighthouse / DevTools |
| Deploy | 100% dos pushes com workflow verde | GitHub Actions |
| Segurança | 0 WARN acionável nos advisors | Supabase advisors |

---

## 10. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Perder dados por limpar o navegador | Média | Alto | R-06 + Supabase como fonte da verdade |
| Esquecer a senha do Supabase | Baixa | Alto | R-01 (reset de senha) + senha no gerenciador |
| CDN fora do ar | Baixa | Médio | R-03 e R-09 |
| Complexidade do arquivo único gerar regressão | Média | Médio | R-02 (testes no CI) |
| Vazamento de chave indevida (`service_role`) | Baixa | Crítico | Nunca usar no front; só `anon`/publishable |
| Dependência de uma única conta GitHub | Baixa | Alto | Garantir acesso de recuperação à conta |

---

## 11. Definição de pronto (todas as entregas)

- [ ] Funciona em desktop e mobile (360px)
- [ ] Sem erros no console
- [ ] Testes locais verdes e workflow do Pages verde
- [ ] Nenhum caminho absoluto (`/...`) que quebre em `/forex-asrv/`
- [ ] Nada de segredo além da chave pública no front
- [ ] Documentação atualizada (`doc/` ou `supabase/README.md`)

---

## 12. Próxima ação sugerida

1. **M-06** — trazer dashboard/estatísticas e cache offline para web e mobile.
2. **M-05** — validar o app Expo em um dispositivo físico (login, criar, excluir, offline).
3. **Release v0.1.0** — disparar o workflow manual a partir da `main` e conferir os assets.
4. **R-01** (5 minutos, manual no dashboard) — fechar o único WARN de segurança.

Revisão do roadmap: **mensal**, junto com a conferência de dados local × nuvem.
