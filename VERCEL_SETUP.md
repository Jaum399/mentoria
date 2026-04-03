# 🚀 Setup Rápido do Vercel - App Mentoria

## ✅ O que foi feito

Seu projeto foi preparado para deploy no Vercel com:
- ✅ Suporte a PostgreSQL para produção
- ✅ Suporte a SQLite para desenvolvimento
- ✅ Arquivo `vercel.json` configurado
- ✅ `.env.example` com todas as variáveis
- ✅ `.vercelignore` para otimizar uploads
- ✅ DEPLOYMENT.md com instruções completas

## 🎯 Próximos Passos (5 minutos)

### 1️⃣ Criar Banco de Dados PostgreSQL

**Opção A: Usar Neon (Recomendado - Gratuito)**
```
1. Acesse: https://console.neon.tech/
2. Sign Up com sua conta
3. Crie um novo projeto
4. Copie a URL de conexão (começa com postgresql://...)
```

**Opção B: Usar Railway**
```
1. Acesse: https://railway.app/
2. Sign Up
3. Create New Project → Provision PostgreSQL
4. Copie o DATABASE_URL
```

### 2️⃣ Criar Projeto no Vercel

```
1. Acesse: https://vercel.com/dashboard
2. New Project
3. Selecione seu repositório: mentoria
4. Clique em "Deploy"
```

### 3️⃣ Configurar Variáveis de Ambiente

No Dashboard do Vercel, vá em:
**Settings → Environment Variables**

Adicione estas variáveis:

```
Variável: DATABASE_URL
Valor: postgresql://user:password@host:port/database
(copiar do Neon ou Railway)

Variável: STRIPE_SECRET_KEY
Valor: sk_live_sua_chave_aqui

Variável: JWT_SECRET
Valor: uma_string_aleatoria_forte

Variável: SESSION_SECRET
Valor: outra_string_aleatoria_forte

Variável: NODE_ENV
Valor: production
```

### 4️⃣ Redeploy

Após adicionar as variáveis:
- Vá em **Deployments**
- Clique nos 3 pontos (...) do deploy atual
- Clique em **Redeploy**

### 5️⃣ Testar

Após o redeploy, acesse: `https://seu-projeto.vercel.app`

Teste em:
- `/api/register` - Criar conta
- `/api/login` - Fazer login
- Landing page principal

## 🔑 Valores para Variáveis de Ambiente

### DATABASE_URL
Exemplo do Neon:
```
postgresql://neondb_owner:password@ep-random-name.us-east-1.neon.tech/neondb
```

### STRIPE_SECRET_KEY
- Acesse: https://dashboard.stripe.com/apikeys
- Use a chave começando com `sk_live_` para produção

### JWT_SECRET & SESSION_SECRET
Use algo como:
```
openssl rand -hex 32
```

Ou gere em: https://www.uuidgenerator.net/

## 📋 Checklist Final

- [ ] PostgreSQL criado no Neon/Railway
- [ ] Projeto criado no Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy redeploy realizado
- [ ] Teste de registro funcionando
- [ ] Teste de login funcionando
- [ ] Webhooks do Stripe configurados (dentro de 24h)

## 🛠️ Webhooks do Stripe (Importante!)

**Faça isso após confirmar que o site está funcionando:**

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "Add Endpoint"
3. URL: `https://seu-projeto.vercel.app/api/webhook`
4. Eventos: Selecione:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
5. Copie o "Signing Secret" (começa com `whsec_`)
6. Adicione no Vercel como variável: `STRIPE_WEBHOOK_SECRET`
7. Redeploy novamente

## 🆘 Problemas Comuns

### "Database connection refused"
- Verificar DATABASE_URL está correto
- Confirmar IP está liberado no Neon/Railway
- Testar conexão manualmente

### "Function exceeded timeout"
- Otimizar queries SQL
- Verificar se há loops infinitos

### "Pages seem broken"
- Verificar logs em Vercel Dashboard → Deployments → Logs
- Confirmar todas as variáveis estão set

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs: Vercel Dashboard → Deployments → Runtime Logs
2. Teste localmente: `npm start`
3. Verifique variáveis: Settings → Environment Variables

## 🎉 Pronto!

Após concluir todos os passos, seu App Mentoria estará:
- Online globalmente
- Com banco de dados PostgreSQL
- Com pagamentos Stripe funcionando
- Com notificações e reminders
- Pronto para usuários reais!

Sucesso! 🚀
