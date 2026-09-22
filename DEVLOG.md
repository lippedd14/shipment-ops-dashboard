# Diário de desenvolvimento

Registro das decisões e do que ficou em aberto. O histórico do Git conta *o
que* mudou; aqui fica o *porquê*, que é o que se perde.

---

## Etapa 1 — base funcional

**Scaffold** (`efe01cb`) — Next.js 14, App Router, TypeScript strict, Tailwind,
ESLint. Sem dependências além do padrão.

**Schema no Supabase** (`088ff66`) — tabela `shipments` com RLS, quatro policies
restritas a `auth.uid() = user_id`, trigger de `updated_at`, unique
`(user_id, tracking_code)`, índice `(user_id, status)`, realtime habilitado.
Banco remoto; Docker e Supabase local não são usados no projeto.

**Autenticação** (`ff04faf`) — `@supabase/ssr` com clientes separados para
browser, server e middleware, todos tipados com `Database`.

- `getUser()` e não `getSession()` no middleware: `getSession()` lê o cookie sem
  validar assinatura, então a proteção seria só aparente.
- O redirect do middleware copia os cookies renovados da resposta do Supabase.
  Um `NextResponse.redirect` novo os descartaria e a sessão morreria em loop no
  primeiro refresh de token.
- `useFormState`/`useFormStatus` de `react-dom` — `useActionState` é React 19 e
  o projeto é React 18.

**CRUD** (`a0c549c`) — Server Actions, schema Zod compartilhado entre criação e
edição, Server Components por padrão.

- `user_id` sempre da sessão verificada; no editar, o `id` da linha é bindado no
  servidor. O cliente nunca escolhe o que escreve.
- Violação de unique (`23505`) vira mensagem no campo `tracking_code`, não erro
  genérico.

**Auth resiliente a falha de rede** (`69ba1ae`) — bug encontrado em teste
manual. `getUser()` devolve usuário nulo tanto para "sem sessão" quanto para
"não consegui falar com o servidor", e todos os chamadores tratavam igual. Uma
queda de rede parecia logout: a Server Action redirecionava para `/login` com o
cookie ainda válido, descartando o que o usuário tinha digitado.
`checkUser()` separa os casos com `isAuthRetryableFetchError`.

**Realtime** (`2285338`) — INSERT, UPDATE e DELETE filtrados por `user_id`.

- `realtime.setAuth()` antes de inscrever: o Realtime aplica RLS com esse token
  e, sem ele, o canal conecta e não recebe nada.
- Reconexão com backoff exponencial; a primeira reinscrição bem-sucedida depois
  de uma falha chama `router.refresh()`, porque eventos que chegam com o socket
  caído se perdem e a lista precisa ressincronizar pelo servidor.
- Cleanup com flag `disposed` além do `removeChannel`: o setup é assíncrono, e
  sem ela um unmount no meio deixaria canal órfão.

**Filtro e busca** (`515ab6e`) — estado na URL, filtragem na query.

- Busca varre `tracking_code`, `origin`, `destination` e `carrier` via `or()` do
  PostgREST. O pattern vai entre aspas duplas porque o grupo é separado por
  vírgula, e as barras invertidas do escape de LIKE precisam ser dobradas para
  sobreviver às aspas.
- O handler de realtime usa o mesmo predicado da query. Um UPDATE pode **tirar**
  uma linha do recorte atual, não só trazer uma nova.

**Métricas e seed** (`b89b4e9`) — contagens com `head: true`, ajustadas por
delta no realtime em vez de recontadas, porque quando entrar paginação o cliente
não terá mais todas as linhas.

---

## Etapa 2 — polimento visual e quadro

**Modelo: atraso deixou de ser etapa.** `delayed` era um valor do enum de
status, o que tornava impossível dizer que uma remessa atrasada ainda estava em
trânsito — a exceção sobrescrevia o estágio. A migration
`20260911215319_add_is_delayed_flag` adicionou `is_delayed boolean`, converteu
as linhas existentes para `in_transit + is_delayed`, e desabilitou o trigger
durante o backfill para não carimbar as linhas como alteradas naquele dia.
O rótulo `delayed` continua no enum porque o Postgres não remove valor de tipo
em uso; nada mais o escreve.

**Direção visual** — light-first, tokens fixos, família única (Archivo),
`tabular-nums` em toda coluna numérica, cabeçalhos em sentence case.

- A cor de status ficou só no ponto de 6px; o label é `--ink`. O verde de
  entregue (`#0E8A5F`) dá ~3,9:1 sobre branco, abaixo do AA para texto normal.
- A tabela rola nos dois eixos com altura própria: um container com overflow em
  um eixo vira contexto de scroll nos dois, e o header fixo grudaria nele em vez
  da viewport.
- O indicador "Ao vivo" é o único elemento animado, mais um flash de 200ms na
  linha que chega por realtime. Tudo respeita `prefers-reduced-motion`.

**Quadro por etapa** — três colunas, atraso como tag sobre o card, movimentação
por botão. Alternador Quadro/Tabela com a preferência na URL.

---

## Em aberto

**A pergunta de produto que decide o quadro.** O kanban por etapa de remessa
tem benefício discutível: as colunas espelham um status ditado pela realidade
externa (a carga chegou, a transportadora baixou o canhoto), então mover o card
é registrar, não decidir. Kanban se paga quando mover *é* a decisão.

A direção levantada foi organizar por fase — Comercial, Operacional,
Financeiro — onde existe handoff real entre pessoas. Isso sugere **duas
dimensões**: fase (dirigida por gente, merece as colunas) e etapa da remessa
(dirigida pelo mundo, vira campo). Depende de uma resposta: o app é de uma
pessoa só ou de um time com papéis separados? Se for de uma pessoa, a resposta
honesta é não ter quadro.

**Pendências técnicas conhecidas**

- Sem paginação. O dashboard carrega todas as remessas de uma vez.
- O retry do error boundary não recupera a página quando a rede volta; só
  navegar para fora e voltar funciona. Causa não identificada. Afeta apenas o
  caminho offline.
- Busca com vírgula (`São Paulo, SP`) nunca foi testada com dados reais — é o
  caso que motivou as aspas no `or()`.
- Arrastar card entre colunas não existe; a movimentação é por botão, por
  escolha (sem dependência nova, acessível por teclado, funciona em toque).

---

## Como retomar

Setup, migrations, seed e verificações estão no [README](README.md).
