# App Mentoria + MedSimples - Plataforma Unificada

Site de estudos e gestão de medicamentos com:
- Login/registro com JWT
- Plano de estudos (salvar, consultar)
- Calendário de eventos + lembretes de medicamentos
- Pomodoro embutido
- Gestão completa de medicamentos (MedSimples integrado)
- Histórico de doses tomadas
- Assinatura mensal (simulação + Stripe checkout opcional)
- Layout escuro responsivo (azul, cinza e preto)

## Funcionalidades Integradas

### Mentoris (Mentoria de Estudos)
- Planos de estudo personalizados
- Calendário com eventos e lembretes
- Técnica Pomodoro para foco
- Sugestões de plano com IA
- Sistema de lembretes

### MedSimples (Gestão de Medicamentos)
- Cadastro de medicamentos com dosagem e horários
- Lembretes automáticos de doses
- Histórico de doses tomadas
- Importação simulada de dados
- Integração com calendário e lembretes

### Integração Unificada
- Todas as funcionalidades em um único espaço
- Lembretes compartilhados entre estudos e medicamentos
- Dashboard unificado com estatísticas
- Calendário mostra eventos de estudo e doses de medicamentos
- Notificações push para lembretes de ambas as plataformas

## Instalação

1. `npm install`
2. Configure `.env` com chaves Stripe (opcional) e JWT
3. `npm start`
4. Acesse `http://localhost:8080`

## API

### Autenticação
- `POST /api/register`
- `POST /api/login`
- `GET /api/me`

### Mentoris (Estudos)
- `GET /api/plans`
- `POST /api/save-plan`
- `GET /api/my-plans`
- `POST /api/calendar-event`
- `GET /api/calendar-events`
- `POST /api/pomodoro-log`
- `GET /api/pomodoro-log`
- `POST /api/reminders`
- `GET /api/reminders`
- `PUT /api/reminders/:id`
- `DELETE /api/reminders/:id`
- `POST /api/ai-plan`

### MedSimples (Medicamentos)
- `GET /api/medications`
- `POST /api/medications`
- `PUT /api/medications/:id`
- `DELETE /api/medications/:id`
- `POST /api/medication-log`
- `GET /api/medication-logs`
- `POST /api/medsimples-import`

### Assinatura e Notificações
- `POST /api/subscribe`
- `POST /api/create-checkout-session`
- `POST /api/create-subscription-session`
- `GET /api/vapid-public-key`
- `POST /api/save-push-subscription`
- `POST /api/send-push`
