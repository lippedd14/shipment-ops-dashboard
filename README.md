# Shipment Ops Dashboard

Painel de acompanhamento de remessas, em Next.js 14 (App Router) com Supabase.

## Requisitos

- Node.js 22 ou superior (o script de seed usa o type stripping nativo para `.ts`)
- Uma conta e um projeto no [Supabase](https://supabase.com)

Docker não é necessário: o banco é remoto e o Supabase local não é usado.

## Configuração

Copie o exemplo de variáveis de ambiente e preencha com os dados do seu projeto:

```bash
cp .env.example .env.local
```

| Variável | Onde encontrar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard do Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Mesma tela, a chave publishable/anon |

A `anon key` pode ir para o browser: ela é limitada por Row Level Security. A
`service_role` **nunca** deve entrar em `.env.example` nem em qualquer variável
`NEXT_PUBLIC_`.

`.env.local` é ignorado pelo Git.

## Desenvolvimento

```bash
npm install
npm run dev
```

A aplicação sobe em http://localhost:3000. Sem sessão, `/dashboard` redireciona
para `/login`.

## Banco de dados

O schema vive em `supabase/migrations`. Para aplicar num projeto remoto:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Para regerar os tipos depois de mudar o schema:

```bash
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

## Seed

`supabase/seed.ts` insere 30 remessas fictícias com rotas, transportadoras e
códigos de rastreio plausíveis, distribuídas entre os quatro status (10 em
trânsito, 11 entregues, 6 pendentes, 3 atrasadas).

O `user_id` nunca é fixo no código. Há duas formas de indicar o dono das
remessas.

### Opção 1 — autenticando com um usuário (recomendada)

As linhas são inseridas pelo próprio usuário, respeitando o RLS. Não exige
nenhuma chave privilegiada. Acrescente ao `.env.local`:

```
SEED_EMAIL=voce@exemplo.com
SEED_PASSWORD=sua-senha
```

O usuário precisa já existir — crie a conta em `/signup` antes. Então:

```bash
npm run seed
```

### Opção 2 — com a service role key

Insere em nome de qualquer usuário, ignorando o RLS. Use apenas localmente, e
nunca comite a chave:

```
SUPABASE_SERVICE_ROLE_KEY=...
SEED_USER_ID=<uuid do usuário>
```

```bash
npm run seed
```

O id também pode vir por argumento, sem passar pelo arquivo:

```bash
npm run seed -- --user-id <uuid>
```

### Rodando de novo

Os códigos de rastreio são únicos por usuário, então uma segunda execução falha
com violação de unicidade. Para recomeçar do zero, apagando as remessas
daquele usuário antes de inserir:

```bash
npm run seed -- --reset
```

## Verificação

```bash
npx tsc --noEmit      # tipos
npm run lint          # ESLint
npm run build         # build de produção
```
