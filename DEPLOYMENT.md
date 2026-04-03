# Guia de Deployment - App Mentoria

## Deploy no Vercel

### Pré-requisitos
1. Conta no Vercel (https://vercel.com)
2. Conta PostgreSQL (Neon, Railway, ou seu provedor preferido)
3. Chaves da API Stripe
4. Vercel CLI instalado (opcional)

### Passo 1: Preparar o Banco de Dados PostgreSQL

1. Crie um novo banco de dados PostgreSQL em seu provedor de escolha (recomendado: Neon)
2. Copie a URL de conexão (DATABASE_URL)
3. Anote as credenciais para futura referência

### Passo 2: Criar o Projeto no Vercel

**Opção A: Via Dashboard Vercel (Recomendado)**

1. Acesse https://vercel.com/dashboard
2. Clique em "New Project"
3. Selecione o repositório GitHub "app-mentoria"
4. Configure as variáveis de ambiente:
   - `DATABASE_URL`: URL de conexão do PostgreSQL
   - `STRIPE_SECRET_KEY`: Chave secreta do Stripe
   - `JWT_SECRET`: Chave secreta para JWT
   - `SESSION_SECRET`: Chave secreta para sessão
   - `NODE_ENV`: production

5. Clique em "Deploy"

**Opção B: Via Vercel CLI**

```bash
# Login no Vercel
vercel login

# Deploy
vercel --prod

# Configurar variáveis de ambiente
vercel env add DATABASE_URL
vercel env add STRIPE_SECRET_KEY
vercel env add JWT_SECRET
vercel env add SESSION_SECRET
```

### Passo 3: Configurar Variáveis de Ambiente

No dashboard do Vercel, adicione as seguintes variáveis no projeto:

```
DATABASE_URL=postgresql://user:password@host:port/database
STRIPE_SECRET_KEY=sk_live_xxxxx (sua chave de produção)
JWT_SECRET=sua-chave-secreta
SESSION_SECRET=sua-chave-de-sessao
GOOGLE_CLIENT_ID=seu-google-client-id (opcional)
GOOGLE_CLIENT_SECRET=seu-google-client-secret (opcional)
NODE_ENV=production
```

### Passo 4: Testar o Deployment

Após o deployment:

1. Acesse a URL do seu projeto no Vercel
2. Teste o registro de usuário: `/api/register`
3. Teste o login: `/api/login`
4. Verifique se as notificações push funcionam
5. Verifique a integração com Stripe

### Passo 5: Configurar Webhooks do Stripe (Importante!)

1. Acesse https://dashboard.stripe.com/webhooks
2. Adicione um novo endpoint com a URL: `https://seu-dominio-vercel.vercel.app/api/webhook`
3. Selecione os eventos: `customer.subscription.updated`, `customer.subscription.deleted`, `payment_intent.succeeded`
4. Copie a chave de assinatura (Signing Secret) e adicione como variável de ambiente no Vercel

### Estrutura do Projeto para Vercel

```
app-mentoria/
├── server.js              # Arquivo principal (funciona com Node.js)
├── public/               # Arquivos estáticos
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── sw.js
├── package.json
├── vercel.json           # Configuração do Vercel
├── .env.example          # Exemplo de variáveis
└── .vercelignore         # Arquivos a ignorar
```

### Compatibilidade de Banco de Dados

O código foi atualizado para suportar:
- **Desenvolvimento**: SQLite (local)
- **Produção**: PostgreSQL (Vercel)

As mudanças são detectadas automaticamente pela variável `DATABASE_URL`:
- Se `DATABASE_URL` estiver definida → usa PostgreSQL
- Caso contrário → usa SQLite

### Troubleshooting

**Erro: "Function exceeded maximum execution time"**
- Aumentar o timeout ou otimizar queries no banco
- Vercel Pro permite funções mais longas

**Erro: "Database connection refused"**
- Verificar `DATABASE_URL`
- Confirmar IP está liberado no PostgreSQL
- Testar conexão manualmente

**Erro: "Module not found"**
- Verificar `package.json` tem todas as dependências
- Executar `npm install` localmente

### Monitoramento

Após o deployment, monitore em:
1. Dashboard Vercel: deployments, logs, performance
2. Stripe Dashboard: webhooks, subscriptions
3. Logs do servidor: Vercel → Project → Deployments → Logs

### Rollback

Se houver problemas, você pode reverter para a versão anterior:
1. Vercel Dashboard → Project → Deployments
2. Clique na versão anterior
3. Clique em "Redeploy"

### Próximos Passos

1. Configure um domínio customizado (opcional)
2. Ative HTTPS (automático)
3. Configure alertas de erro
4. Monitore performance e custos
