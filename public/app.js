const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const showLoginBtn = document.getElementById('show-login');
const showRegisterBtn = document.getElementById('show-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authMessage = document.getElementById('auth-message');
const userWelcome = document.getElementById('user-welcome');
const logoutButton = document.getElementById('logout-button');
const tabs = document.querySelectorAll('.tabs button');
const tabContents = document.querySelectorAll('.tab-content');

const planForm = document.getElementById('plan-form');
const planList = document.getElementById('plan-list');
const calendarForm = document.getElementById('calendar-form');
const eventList = document.getElementById('event-list');
const reminderForm = document.getElementById('reminder-form');
const reminderList = document.getElementById('reminder-list');
const pomodoroHistory = document.getElementById('pomodoro-history');
const subscriptionMessage = document.getElementById('subscription-message');
const subscriptionStatus = document.getElementById('subscription-status');
const cancelSubscriptionBtn = document.getElementById('cancel-subscription');
const subscriptionHistory = document.getElementById('subscription-history');

const medForm = document.getElementById('med-form');
const medList = document.getElementById('med-list');
const importMedsBtn = document.getElementById('import-meds');
const medImportMsg = document.getElementById('med-import-msg');
const medLogList = document.getElementById('med-log-list');


const dashboardPlans = document.getElementById('dashboard-plans');
const dashboardEvents = document.getElementById('dashboard-events');
const dashboardReminders = document.getElementById('dashboard-reminders');
const dashboardMeds = document.getElementById('dashboard-meds');
const dashboardWelcome = document.getElementById('dashboard-welcome');
const aiSuggestion = document.getElementById('ai-suggestion');
const aiObjective = document.getElementById('ai-objective');
const aiTime = document.getElementById('ai-time');
const aiSlot = document.getElementById('ai-slot');
const aiButton = document.getElementById('ai-button');

const googleLoginBtn = document.getElementById('google-login');
const phoneLoginBtn = document.getElementById('phone-login');

const planButtons = document.querySelectorAll('.sub-plan');
const payStripe = document.getElementById('pay-stripe');
const pushSubscribeBtn = document.getElementById('subscribe-push');
const sendNotificationBtn = document.getElementById('send-notification');
const onboardingOverlay = document.getElementById('onboarding-overlay');
const onboardingClose = document.getElementById('onboarding-close');

let token = localStorage.getItem('token') || null;
let currentUsername = localStorage.getItem('username') || 'Usuário';
let activePlan = 'Basico';

function setMessage(el, text, color = '#9ed2ff') { el.textContent = text; el.style.color = color; }

async function api(path, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const result = await fetch(path, opts);
  const data = await result.json();
  if (!result.ok) throw data;
  return data;
}

function showTab(name) {
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  tabContents.forEach(sec => sec.classList.toggle('active', sec.id === name));
}

showLoginBtn.addEventListener('click', () => { showLoginBtn.classList.add('active'); showRegisterBtn.classList.remove('active'); loginForm.classList.remove('hide'); registerForm.classList.add('hide'); });
showRegisterBtn.addEventListener('click', () => { showRegisterBtn.classList.add('active'); showLoginBtn.classList.remove('active'); registerForm.classList.remove('hide'); loginForm.classList.add('hide'); });

const pathByTab = {
  dashboard: '/dashboard',
  features: '/features',
  plans: '/plans',
  calendar: '/calendar',
  reminders: '/reminders',
  pomodoro: '/pomodoro',
  medsimples: '/medsimples',
  assinatura: '/assinatura'
};

const tabByPath = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/features': 'features',
  '/plans': 'plans',
  '/calendar': 'calendar',
  '/reminders': 'reminders',
  '/pomodoro': 'pomodoro',
  '/medsimples': 'medsimples',
  '/assinatura': 'assinatura'
};

function setTabFromPath(path) {
  const chosen = tabByPath[path] || 'dashboard';
  showTab(chosen);
}

tabs.forEach(btn => btn.addEventListener('click', () => {
  showTab(btn.dataset.tab);
  const path = pathByTab[btn.dataset.tab] || '/dashboard';
  window.history.pushState({ tab: btn.dataset.tab }, '', path);
}));

window.onpopstate = event => {
  const path = window.location.pathname;
  setTabFromPath(path);
};

logoutButton.addEventListener('click', () => {
  token = null; currentUsername = 'Usuário';
  localStorage.removeItem('token'); localStorage.removeItem('username');
  appSection.classList.add('hide'); authSection.classList.remove('hide');
});

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const resp = await api('/api/login', 'POST', { email, password });
    token = resp.token;
    currentUsername = resp.user.username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', currentUsername);
    initializeApp();
  } catch (err) {
    setMessage(authMessage, err.error || 'Falha no login', '#f87171');
  }
});

registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const resp = await api('/api/register', 'POST', { username, email, password });
    token = resp.token;
    currentUsername = resp.user.username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', currentUsername);
    initializeApp();
  } catch (err) {
    setMessage(authMessage, err.error || 'Falha no cadastro', '#f87171');
  }
});

googleLoginBtn.addEventListener('click', async () => {
  try {
    const email = prompt('Informe seu email Google (teste)');
    const username = prompt('Informe seu nome (Google)');
    if (!email || !username) return setMessage(authMessage, 'Dados Google obrigatórios.', '#f87171');
    const resp = await api('/api/login-google', 'POST', { email, username });
    token = resp.token;
    currentUsername = resp.user.username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', currentUsername);
    initializeApp();
  } catch (err) {
    setMessage(authMessage, err.error || 'Falha login Google', '#f87171');
  }
});

phoneLoginBtn.addEventListener('click', async () => {
  try {
    const phone = prompt('Informe seu telefone (formato +5511999999999)');
    if (!phone) return;
    await api('/api/request-phone-code', 'POST', { phone });
    const code = prompt('Digite o código SMS recebido (simulado)');
    if (!code) return;
    const resp = await api('/api/login-phone', 'POST', { phone, code });
    token = resp.token;
    currentUsername = resp.user.username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', currentUsername);
    initializeApp();
  } catch (err) {
    setMessage(authMessage, err.error || 'Falha login Telefone', '#f87171');
  }
});

aiButton.addEventListener('click', async () => {
  try {
    const objetivo = aiObjective.value.trim();
    const tempo = aiTime.value.trim();
    const horario = aiSlot.value.trim();
    if (!objetivo || !tempo || !horario) return setMessage(aiSuggestion, 'Preencha objetivo, tempo e horário.', '#f87171');
    const result = await api('/api/ai-plan', 'POST', { objetivo, tempo, horario });
    aiSuggestion.textContent = result.suggestion;
    aiSuggestion.style.color = '#8ade8f';
  } catch (err) {
    setMessage(aiSuggestion, err.error || 'Erro ao gerar plano IA', '#f87171');
  }
});

reminderForm.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const title = document.getElementById('reminder-title').value;
    const date_time = document.getElementById('reminder-datetime').value;
    const message = document.getElementById('reminder-message').value;
    await api('/api/reminders', 'POST', { title, date_time, message });
    setMessage(reminderForm, 'Lembrete criado com sucesso!', '#8ade8f');
    reminderForm.reset();
    loadReminders();
    loadDashboard();
    loadMeds();
  } catch (err) {
    setMessage(reminderForm, err.error || 'Erro ao criar lembrete', '#f87171');
  }
});

medForm.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const name = document.getElementById('med-name').value;
    const dosage = document.getElementById('med-dosage').value;
    const schedule = document.getElementById('med-schedule').value;
    const notes = document.getElementById('med-notes').value;
    await api('/api/medications', 'POST', { name, dosage, schedule, notes });
    setMessage(medImportMsg, 'Medicamento salvo e lembretes criados', '#8ade8f');
    medForm.reset();
    loadMeds();
    loadReminders();
    loadDashboard();
  } catch (err) {
    setMessage(medImportMsg, err.error || 'Erro ao salvar medicamento', '#f87171');
  }
});

importMedsBtn.addEventListener('click', async () => {
  try {
    const resp = await api('/api/medsimples-import', 'POST');
    setMessage(medImportMsg, `Importados ${resp.imported} medicamentos do MedSimples.`, '#8ade8f');
    loadMeds();
    loadReminders();
    loadDashboard();
  } catch (err) {
    setMessage(medImportMsg, err.error || 'Erro ao importar do MedSimples', '#f87171');
  }
});

async function loadMedLogs() {
  try {
    const data = await api('/api/medication-logs');
    medLogList.innerHTML = data.logs.length
      ? data.logs.map(log => `<div class="plan-card"><h3>${log.name}</h3><p>Tomado em: ${new Date(log.taken_at).toLocaleString()}</p><p>${log.notes || ''}</p></div>`).join('')
      : '<p>Nenhuma dose registrada ainda.</p>';
  } catch (err) {
    medLogList.innerHTML = '<p>Erro ao carregar histórico.</p>';
  }
}
  try {
    const data = await api('/api/medications');
    medList.innerHTML = data.medications.length
      ? data.medications.map(m => `<div class="plan-card"><h3>${m.name} ${m.active ? '' : '(inativo)'}</h3><p>${m.dosage} • ${m.schedule}</p><p>${m.notes || ''}</p><small>${new Date(m.created_at).toLocaleString()}</small><div style="margin-top:8px;"><button class="secondary" data-id="${m.id}" data-active="${m.active}">${m.active ? 'Desativar' : 'Ativar'}</button><button class="secondary" style="background:#4CAF50;border-color:#4CAF50;" data-take-id="${m.id}">Marcar como tomado</button><button class="secondary" style="background:#852525;border-color:#752020;" data-id-delete="${m.id}">Excluir</button></div></div>`).join('')
      : '<p>Nenhum medicamento cadastrado.</p>';
    medList.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const active = btn.getAttribute('data-active') === 'true' ? 0 : 1;
        await api(`/api/medications/${id}`, 'PUT', { active });
        loadMeds();
      });
    });
    medList.querySelectorAll('button[data-take-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-take-id');
        await api('/api/medication-log', 'POST', { medication_id: id });
        loadMedLogs();
        setMessage(medImportMsg, 'Dose registrada!', '#8ade8f');
      });
    });
    medList.querySelectorAll('button[data-id-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id-delete');
        await api(`/api/medications/${id}`, 'DELETE');
        loadMeds();
      });
    });
  } catch (err) {
    medList.innerHTML = '<p>Erro ao carregar medicamentos.</p>';
  }
}

planForm.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const title = document.getElementById('plan-title').value;
    const content = document.getElementById('plan-content').value;
    await api('/api/save-plan', 'POST', { title, content });
    setMessage(planForm, 'Plano salvo com sucesso!', '#8ade8f');
    planForm.reset();
    loadPlans();
  } catch (err) {
    setMessage(planForm, err.error || 'Erro ao salvar plano', '#f87171');
  }
});

calendarForm.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const title = document.getElementById('event-title').value;
    const date = document.getElementById('event-date').value;
    const description = document.getElementById('event-desc').value;
    await api('/api/calendar-event', 'POST', { title, date, description });
    setMessage(calendarForm, 'Evento adicionado!', '#8ade8f');
    calendarForm.reset();
    loadEvents();
  } catch (err) {
    setMessage(calendarForm, err.error || 'Erro ao adicionar evento', '#f87171');
  }
});

payStripe.addEventListener('click', async () => {
  try {
    const resp = await api('/api/create-subscription-session', 'POST', { plan: activePlan });
    window.location.href = resp.url;
  } catch (err) {
    setMessage(subscriptionMessage, err.error || 'Erro ao criar link de assinatura', '#f87171');
  }
});

planButtons.forEach(btn => btn.addEventListener('click', () => {
  activePlan = btn.dataset.plan;
  setMessage(subscriptionMessage, `Plano selecionado: ${activePlan} (R$ 39,90/mês)`, '#8ade8f');
}));

let countdown = null;
let isPaused = false;
let currentMode = 'work';
let remaining = 0;

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  document.getElementById('timer-display').textContent = formatTime(remaining);
}

function startTimer() {
  if (countdown) return;
  if (remaining <= 0) {
    const min = currentMode === 'work' ? parseInt(document.getElementById('work-minutes').value, 10) : parseInt(document.getElementById('break-minutes').value, 10);
    remaining = min * 60;
    updateTimerDisplay();
  }
  isPaused = false;
  countdown = setInterval(async () => {
    if (isPaused) return;
    if (remaining > 0) {
      remaining -= 1;
      updateTimerDisplay();
    } else {
      clearInterval(countdown);
      countdown = null;
      const type = currentMode === 'work' ? 'work' : 'break';
      await api('/api/pomodoro-log', 'POST', { duration: currentMode === 'work' ? parseInt(document.getElementById('work-minutes').value,10) : parseInt(document.getElementById('break-minutes').value,10), type });
      loadPomodoroHistory();
      currentMode = currentMode === 'work' ? 'break' : 'work';
      remaining = (currentMode === 'work' ? parseInt(document.getElementById('work-minutes').value,10) : parseInt(document.getElementById('break-minutes').value,10)) * 60;
      updateTimerDisplay();
      startTimer();
    }
  }, 1000);
}

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('pause-btn').addEventListener('click', () => { isPaused = true; });
document.getElementById('reset-btn').addEventListener('click', () => { clearInterval(countdown); countdown = null; currentMode = 'work'; remaining = parseInt(document.getElementById('work-minutes').value, 10) * 60; updateTimerDisplay(); });

async function loadPlans() {
  try {
    const data = await api('/api/my-plans');
    planList.innerHTML = data.plans.length ? data.plans.map(p => `<div class="plan-card"><h3>${p.title}</h3><p>${p.content}</p><small>${new Date(p.created_at).toLocaleString()}</small></div>`).join('') : '<p>Nenhum plano ainda.</p>';
  } catch (err) {
    planList.innerHTML = '<p>Erro ao carregar planos.</p>';
  }
}

async function loadEvents() {
  try {
    const data = await api('/api/calendar-events');
    eventList.innerHTML = data.events.length ? data.events.map(e => `<div class="plan-card"><h3>${e.title}</h3><p>${e.description || 'Sem descrição'}</p><small>${new Date(e.date).toLocaleDateString()}</small></div>`).join('') : '<p>Nenhum evento.</p>';
  } catch (err) {
    eventList.innerHTML = '<p>Erro ao carregar eventos.</p>';
  }
}

async function loadPomodoroHistory() {
  try {
    const data = await api('/api/pomodoro-log');
    pomodoroHistory.innerHTML = data.history.length ? data.history.map(row => `<li>${row.type} de ${row.duration} min - ${new Date(row.created_at).toLocaleString()}</li>`).join('') : '<li>Nenhuma sessão registrada.</li>';
  } catch (err) {
    pomodoroHistory.innerHTML = '<li>Erro ao carregar histórico.</li>';
  }
}

async function loadReminders() {
  try {
    const data = await api('/api/reminders');
    reminderList.innerHTML = data.reminders.length ? data.reminders.map(r => `<div class="plan-card"><h3>${r.title}</h3><p>${r.message || 'Sem descrição'}</p><small>${new Date(r.date_time).toLocaleString()} - ${r.completed ? 'Concluído' : 'Pendente'}</small><div style="margin-top:8px;"><button class="secondary" data-id="${r.id}" data-complete="${r.completed}" style="margin-right:6px;">${r.completed ? 'Reabrir' : 'Concluir'}</button><button class="secondary" data-id="${r.id}" style="background:#852525;border-color:#752020;">Excluir</button></div></div>`).join('') : '<p>Nenhum lembrete planejado.</p>';

    reminderList.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (btn.textContent === 'Excluir') {
          await api(`/api/reminders/${id}`, 'DELETE');
          loadReminders();
          loadDashboard();
          return;
        }
        const completed = btn.getAttribute('data-complete') === 'true' ? 0 : 1;
        await api(`/api/reminders/${id}`, 'PUT', { completed });
        loadReminders();
        loadDashboard();
      });
    });
  } catch (err) {
    reminderList.innerHTML = '<p>Erro ao carregar lembretes.</p>';
  }
}

async function loadSubscriptionStatus() {
  try {
    const data = await api('/api/subscription-status');
    if (data.status === 'active') {
      subscriptionStatus.textContent = `Assinatura ativa (${data.plan}) até ${new Date(data.expires_at).toLocaleDateString()}.`;
      subscriptionStatus.style.color = '#8ade8f';
    } else {
      subscriptionStatus.textContent = 'Assinatura inativa. Faça o pagamento para ativar.';
      subscriptionStatus.style.color = '#f8d080';
    }
  } catch (err) {
    subscriptionStatus.textContent = err.error || 'Não foi possível obter status de assinatura.';
    subscriptionStatus.style.color = '#f87171';
  }
}

async function loadSubscriptions() {
  try {
    const data = await api('/api/subscriptions');
    if (!data.subscriptions || data.subscriptions.length === 0) {
      subscriptionHistory.innerHTML = '<p>Nenhuma assinatura registrada.</p>';
      return;
    }

    subscriptionHistory.innerHTML = data.subscriptions.map((item) => {
      const expires = item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'Indefinido';
      return `
        <div class="plan-card">
          <h3>${item.plan || 'Plano'} - ${item.status}</h3>
          <p>Valor: R$ ${(item.amount/100).toFixed(2)}</p>
          <small>Início: ${new Date(item.started_at).toLocaleDateString()} | Expira: ${expires}</small>
        </div>
      `;
    }).join('');
  } catch (err) {
    subscriptionHistory.innerHTML = '<p>Erro ao carregar histórico de assinaturas.</p>';
  }
}

async function loadSubscriptionStatus() {
  try {
    const data = await api('/api/subscription-status');
    if (data.status === 'active') {
      subscriptionStatus.textContent = `Assinatura ativa (${data.plan}) até ${new Date(data.expires_at).toLocaleDateString()}.`;
      subscriptionStatus.style.color = '#8ade8f';
      if (cancelSubscriptionBtn) cancelSubscriptionBtn.disabled = false;
    } else {
      subscriptionStatus.textContent = 'Assinatura inativa. Faça o pagamento para ativar.';
      subscriptionStatus.style.color = '#f8d080';
      if (cancelSubscriptionBtn) cancelSubscriptionBtn.disabled = true;
    }
  } catch (err) {
    subscriptionStatus.textContent = err.error || 'Não foi possível obter status de assinatura.';
    subscriptionStatus.style.color = '#f87171';
    if (cancelSubscriptionBtn) cancelSubscriptionBtn.disabled = true;
  }
}

async function loadDashboard() {
  try {
    const plans = await api('/api/my-plans');
    const events = await api('/api/calendar-events');
    const reminders = await api('/api/reminders');
    const meds = await api('/api/medications');
    dashboardPlans.textContent = plans.plans.length;
    dashboardEvents.textContent = events.events.length;
    dashboardReminders.textContent = reminders.reminders.length;
    dashboardWelcome.textContent = `Bem-vindo, ${currentUsername}! Você tem ${meds.medications.filter(m => m.active).length} medicamentos ativos.`;
    loadSubscriptionStatus();
    loadSubscriptions();
  } catch (err) {
    dashboardWelcome.textContent = 'Não foi possível carregar dashboard';
  }
}

function extractTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('token') && params.has('username')) {
    token = params.get('token');
    currentUsername = params.get('username');
    localStorage.setItem('token', token);
    localStorage.setItem('username', currentUsername);
    window.history.replaceState({}, document.title, window.location.pathname);
    initializeApp();
  }
}

function showOnboarding() {
  if (localStorage.getItem('seenOnboarding')) return;
  onboardingOverlay.classList.remove('hide');
}

onboardingClose.addEventListener('click', () => {
  onboardingOverlay.classList.add('hide');
  localStorage.setItem('seenOnboarding', 'true');
});

async function getVapidPublicKey() {
  const payload = await api('/api/vapid-public-key');
  return payload.publicKey;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    setMessage(subscriptionMessage, 'Push não suportado neste navegador.', '#f87171');
    return;
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey = await getVapidPublicKey();
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    try {
      await api('/api/save-push-subscription', 'POST', newSubscription);
      setMessage(subscriptionMessage, 'Inscrição de push concluída!', '#8ade8f');
    } catch (err) {
      setMessage(subscriptionMessage, err.error || 'Erro ao salvar inscrição push', '#f87171');
    }
  } else {
    setMessage(subscriptionMessage, 'Push já está ativo.', '#8ade8f');
  }
}

pushSubscribeBtn.addEventListener('click', async () => {
  try {
    const status = await Notification.requestPermission();
    if (status !== 'granted') return setMessage(subscriptionMessage, 'Permissão de notificação negada.', '#f87171');
    await registerServiceWorker();
  } catch (err) {
    setMessage(subscriptionMessage, 'Erro ao ativar push.', '#f87171');
  }
});

sendNotificationBtn.addEventListener('click', async () => {
  try {
    await api('/api/send-push', 'POST', { title: 'Lembrete Mentoria', message: 'Teste de notificação push do app.' });
    setMessage(subscriptionMessage, 'Notificação de teste enviada (se você autorizou).', '#8ade8f');
  } catch (err) {
    setMessage(subscriptionMessage, err.error || 'Erro ao enviar notificação', '#f87171');
  }
});

if (cancelSubscriptionBtn) {
  cancelSubscriptionBtn.addEventListener('click', async () => {
    try {
      await api('/api/subscriptions/cancel', 'POST');
      setMessage(subscriptionMessage, 'Assinatura cancelada com sucesso.', '#8ade8f');
      loadSubscriptionStatus();
      loadSubscriptions();
    } catch (err) {
      setMessage(subscriptionMessage, err.error || 'Erro ao cancelar assinatura', '#f87171');
    }
  });
}

async function initializeApp() {
  if (!token) return;
  authSection.classList.add('hide');
  appSection.classList.remove('hide');
  userWelcome.textContent = `Olá, ${currentUsername}!`;
  showOnboarding();

  showTab('dashboard');
  loadDashboard();
  loadPlans();
  loadEvents();
  loadReminders();
  loadMeds();
  loadMedLogs();
  loadPomodoroHistory();
  remaining = parseInt(document.getElementById('work-minutes').value, 10) * 60;
  updateTimerDisplay();
}

extractTokenFromUrl();
document.getElementById('open-modal').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('hide');
  document.getElementById('quick-modal').classList.remove('hide');
});

document.getElementById('close-modal').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.add('hide');
  document.getElementById('quick-modal').classList.add('hide');
});

document.getElementById('modal-overlay').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.add('hide');
  document.getElementById('quick-modal').classList.add('hide');
});

document.getElementById('goto-plans').addEventListener('click', () => { showTab('plans'); document.getElementById('close-modal').click(); });
document.getElementById('goto-calendar').addEventListener('click', () => { showTab('calendar'); document.getElementById('close-modal').click(); });
document.getElementById('goto-reminders').addEventListener('click', () => { showTab('reminders'); document.getElementById('close-modal').click(); });

setTabFromPath(window.location.pathname);
if (token) initializeApp();
