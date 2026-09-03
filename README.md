# CRM Painéis Solares

Site estático (sem build) + banco Supabase. Funil de projetos, ficha de clientes,
reciclagem de leads perdidas e comissionamento de **5% sobre o valor do projeto**.

```
deploy/
├── index.html            # o CRM (interface)
├── support.js            # runtime necessário ao index.html
├── config.js             # URL + anon key do Supabase
├── api.js                # camada de dados (queries/RPC)
├── vercel.json           # config de deploy
└── supabase/
    ├── schema.sql        # tabelas, triggers, views, RLS
    └── seed.sql          # dados de exemplo
```

## 1. Supabase

1. Crie um projeto em supabase.com.
2. SQL Editor → cole `supabase/schema.sql` → **Run**.
3. Opcional: rode `supabase/seed.sql` para popular com os dados do protótipo.
4. Settings → API: copie **Project URL** e **anon public key** para `config.js`.
5. Cadastre cada vendedor em `public.consultants` com o `auth_user_id`
   correspondente ao usuário do Auth — a RLS usa isso: consultor vê só os
   projetos dele, `role = 'gerente'` vê tudo.

O que o banco faz sozinho (triggers):
- mover para **Fechado** → grava `closed_at`, consolida no cliente e cria a
  comissão de 5% do valor do projeto;
- mover para **Perdido** → grava `lost_at` + motivo e remove a comissão;
- sair de **Perdido** (reciclar) → limpa motivo/data e incrementa `recycled_count`.

Views prontas para relatórios: `v_funnel`, `v_client_portfolio`,
`v_commissions_by_consultant`, `v_recycling`.

## 2. Vercel

Pela interface: New Project → importe o repositório → **Root Directory = `deploy`**
→ Framework Preset **Other** → Deploy. Sem build command.

Pelo CLI:

```bash
npm i -g vercel
cd deploy
vercel        # preview
vercel --prod # produção
```

Local: `npx serve deploy` e abra http://localhost:3000.

## 3. Ligar a interface ao banco

Sem chaves em `config.js` o CRM roda com os dados de demonstração. Depois de
preencher, importe `api.js` no `index.html` e substitua o array de projetos
inicial por `await listProjects()`, chamando `moveStage()` / `recycle()` nas
ações dos cards do funil.

## Regra de comissionamento

5% do valor total do projeto para o responsável, liberados 50% na assinatura do
contrato e 50% na entrega/homologação; projeto cancelado no período fica retido.
Para mudar o percentual, insira uma nova linha em `public.commission_rules` —
as comissões já geradas mantêm a taxa histórica.
