// 🎯 Validadores Frontend - Espelham validações do servidor
const clientValidators = {
  isValidEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) && email.length <= 255;
  },

  isStrongPassword: (password) => {
    // Mínimo: 8 chars, 1 maiúscula, 1 número, 1 caractere especial
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /\d/.test(password) && 
           /[@$!%*?&]/.test(password);
  },

  getPasswordStrength: (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    return strength; // 0-4
  },

  isValidUsername: (username) => {
    const regex = /^[a-zA-Z0-9_-]{3,50}$/;
    return regex.test(username);
  },

  isValidTime: (time) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  },

  isValidDate: (dateStr) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  },

  isFutureDate: (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date >= now;
  },

  isValidPhone: (phone) => {
    const clean = phone.replace(/[\s-()]/g, '');
    const regex = /^\+55\d{2}9?\d{8,9}$/;
    return regex.test(clean);
  }
};

// ⏳ Utils para controlar estado de loading
const loadingStates = {
  setLoading: (button, isLoading) => {
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = '⏳ Aguarde...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }
};

// 📢 Sistema de Notificações Melhorado
const notify = {
  show: (message, type = 'info', duration = 4000) => {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close">✕</button>
    `;
    
    const colors = {
      'success': '#43c4a1',
      'error': '#ff5a66',
      'warning': '#ffa500',
      'info': '#47b5ff'
    };
    
    toast.style.backgroundColor = colors[type] || colors.info;
    container.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    if (duration) setTimeout(() => toast.remove(), duration);
  },

  success: (msg) => notify.show(msg, 'success'),
  error: (msg) => notify.show(msg, 'error', 5000),
  warning: (msg) => notify.show(msg, 'warning'),
  info: (msg) => notify.show(msg, 'info')
};

if (oauthToken) {
  token = oauthToken;
  localStorage.setItem('token', token);
  if (oauthUsername) {
    currentUsername = oauthUsername;
    localStorage.setItem('username', currentUsername);
  }
  notify.success(`Login realizado como ${currentUsername}.`);
  window.history.replaceState({}, document.title, window.location.pathname);
}

if (checkoutStatus === 'success') {
  notify.success('Pagamento concluído com sucesso!');
  window.history.replaceState({}, document.title, window.location.pathname);
}

if (checkoutStatus === 'cancel') {
  notify.error('Pagamento cancelado.');
  window.history.replaceState({}, document.title, window.location.pathname);
}

function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
  `;
  document.body.appendChild(container);
  return container;
}

// 🗑️ Confirmação antes de ações destrutivas
const confirm = (message) => {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
      <div class="confirm-content">
        <p>${message}</p>
        <div class="confirm-buttons">
          <button class="confirm-cancel">Cancelar</button>
          <button class="confirm-ok">Confirmar</button>
        </div>
      </div>
    `;
    
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const content = dialog.querySelector('.confirm-content');
    content.style.cssText = `
      background: #1a395f;
      border: 1px solid rgba(76,138,210,0.45);
      border-radius: 14px;
      padding: 24px;
      max-width: 400px;
      text-align: center;
    `;
    
    const buttons = dialog.querySelector('.confirm-buttons');
    buttons.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; justify-content: center;';
    
    dialog.querySelector('.confirm-cancel').addEventListener('click', () => {
      dialog.remove();
      resolve(false);
    });
    
    dialog.querySelector('.confirm-ok').addEventListener('click', () => {
      dialog.remove();
      resolve(true);
    });
    
    document.body.appendChild(dialog);
  });
};

// 📋 DOM Elements
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
const githubLoginBtn = document.getElementById('github-login');
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
const API_BASE_URL = (window.API_BASE_URL || '').replace(/\/$/, '');

const urlSearch = new URLSearchParams(window.location.search);
const oauthToken = urlSearch.get('token');
const oauthUsername = urlSearch.get('username');
const checkoutStatus = urlSearch.get('checkout');

// ✨ Enhanced setMessage com cores
function setMessage(el, text, color = '#47b5ff') {
  el.textContent = text;
  el.style.color = color;
  el.style.display = 'block';
}

// 📡 Enhanced API com tratamento de erro melhorado
async function api(path, method = 'GET', body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  try {
    const result = await fetch(url, opts);
    const data = await result.json();
    
    if (!result.ok) {
      // Tratamento específico de erros
      if (result.status === 401) {
        token = null;
        localStorage.removeItem('token');
        authSection.classList.remove('hide');
        appSection.classList.add('hide');
        notify.error('Sessão expirada. Faça login novamente.');
        throw { error: 'Sessão expirada' };
      }
      throw data;
    }
    return data;
  } catch (err) {
    if (err instanceof TypeError) {
      notify.error('Sem conexão. Verifique sua internet.');
      throw { error: 'Sem conexão' };
    }
    throw err;
  }
}

if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', () => {
    const redirectUrl = API_BASE_URL ? `${API_BASE_URL}/auth/google` : '/auth/google';
    window.location.href = redirectUrl;
  });
}

if (githubLoginBtn) {
  githubLoginBtn.addEventListener('click', () => {
    const redirectUrl = API_BASE_URL ? `${API_BASE_URL}/auth/github` : '/auth/github';
    window.location.href = redirectUrl;
  });
}

function showTab(name) {
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  tabContents.forEach(sec => sec.classList.toggle('active', sec.id === name));
}

showLoginBtn.addEventListener('click', () => {
  showLoginBtn.classList.add('active');
  showRegisterBtn.classList.remove('active');
  loginForm.classList.remove('hide');
  registerForm.classList.add('hide');
});

showRegisterBtn.addEventListener('click', () => {
  showRegisterBtn.classList.add('active');
  showLoginBtn.classList.remove('active');
  registerForm.classList.remove('hide');
  loginForm.classList.add('hide');
});

// ✅ LOGIN COM VALIDAÇÕES
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  // Validações
  if (!email || !password) {
    notify.error('Email e senha são obrigatórios.');
    return;
  }

  if (!clientValidators.isValidEmail(email)) {
    notify.error('Email inválido.');
    return;
  }

  loadingStates.setLoading(submitBtn, true);

  try {
    const resp = await api('/api/login', 'POST', { email, password });
    token = resp.token;
    currentUsername = resp.user.username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', currentUsername);
    notify.success('Login realizado com sucesso!');
    initializeApp();
  } catch (err) {
    if (err.error === 'Sem conexão') return;
    notify.error(err.error || 'Falha no login. Tente novamente.');
  } finally {
    loadingStates.setLoading(submitBtn, false);
  }
});

// ✅ REGISTRO COM VALIDAÇÕES COMPLETAS
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password')?.value || '';
  const submitBtn = registerForm.querySelector('button[type="submit"]');

  // Validações
  const errors = [];

  if (!username || !email || !password) errors.push('Todos os campos são obrigatórios.');
  
  if (username && !clientValidators.isValidUsername(username)) {
    errors.push('Username: 3-50 caracteres (letras, números, _, -)');
  }
  
  if (email && !clientValidators.isValidEmail(email)) {
    errors.push('Email inválido.');
  }
  
  if (password && !clientValidators.isStrongPassword(password)) {
    errors.push('Senha fraca. Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial.');
  }

  if (password !== confirmPassword) {
    errors.push('As senhas não coincidem.');
  }

  if (errors.length > 0) {
    notify.error(errors.join(' | '));
    return;
  }

  loadingStates.setLoading(submitBtn, true);

  try {
    const resp = await api('/api/register', 'POST', { username, email, password, confirmPassword });
    token = resp.token;
    currentUsername = resp.user.username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', currentUsername);
    notify.success('Cadastrado com sucesso!');
    registerForm.reset();
    initializeApp();
  } catch (err) {
    if (err.error === 'Sem conexão') return;
    notify.error(err.error || 'Falha no cadastro. Tente novamente.');
  } finally {
    loadingStates.setLoading(submitBtn, false);
  }
});

// ✅ LOGOUT COM CONFIRMAÇÃO
logoutButton.addEventListener('click', async () => {
  const confirmed = await confirm('Tem certeza que quer sair?');
  if (confirmed) {
    token = null;
    currentUsername = 'Usuário';
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    appSection.classList.add('hide');
    authSection.classList.remove('hide');
    notify.info('Você saiu da sua conta.');
  }
});

// ✅ LEMBRETES COM VALIDAÇÃO DE DATA FUTURA
if (reminderForm) {
  reminderForm.addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('reminder-title')?.value.trim() || '';
    const date_time = document.getElementById('reminder-datetime')?.value || '';
    const message = document.getElementById('reminder-message')?.value.trim() || '';
    const submitBtn = reminderForm.querySelector('button[type="submit"]');

    // Validações
    if (!title || !date_time) {
      notify.error('Título e data/hora são obrigatórios.');
      return;
    }

    if (!clientValidators.isFutureDate(date_time)) {
      notify.error('A data deve ser no futuro.');
      return;
    }

    loadingStates.setLoading(submitBtn, true);

    try {
      await api('/api/reminders', 'POST', { title, date_time, message });
      reminderForm.reset();
      notify.success('Lembrete criado com sucesso!');
      loadReminders();
    } catch (err) {
      if (err.error === 'Sem conexão') return;
      notify.error(err.error || 'Erro ao criar lembrete.');
    } finally {
      loadingStates.setLoading(submitBtn, false);
    }
  });
}

// ✅ MEDICAMENTOS COM VALIDAÇÃO DE HORÁRIO
if (medForm) {
  medForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('med-name')?.value.trim() || '';
    const dosage = document.getElementById('med-dosage')?.value.trim() || '';
    const schedule = document.getElementById('med-schedule')?.value.trim() || '';
    const notes = document.getElementById('med-notes')?.value.trim() || '';
    const submitBtn = medForm.querySelector('button[type="submit"]');

    // Validações
    if (!name || !dosage || !schedule) {
      notify.error('Nome, dosagem e horário são obrigatórios.');
      return;
    }

    // Validar cada horário (HH:MM,HH:MM,...)
    const times = schedule.split(',').map(t => t.trim()).filter(t => t);
    const invalidTimes = times.filter(t => !clientValidators.isValidTime(t));
    
    if (invalidTimes.length > 0) {
      notify.error(`Horários inválidos: ${invalidTimes.join(', ')}. Use formato: 08:00, 14:00, 20:00`);
      return;
    }

    loadingStates.setLoading(submitBtn, true);

    try {
      await api('/api/medications', 'POST', { name, dosage, schedule, notes });
      medForm.reset();
      notify.success('Medicamento adicionado!');
      loadMedications();
    } catch (err) {
      if (err.error === 'Sem conexão') return;
      notify.error(err.error || 'Erro ao adicionar medicamento.');
    } finally {
      loadingStates.setLoading(submitBtn, false);
    }
  });
}

// ✅ DELETAR MEDICAMENTO COM CONFIRMAÇÃO
async function deleteMedication(id) {
  const confirmed = await confirm('Tem certeza que quer deletar este medicamento? Todos os lembretes também serão apagados.');
  if (confirmed) {
    try {
      await api(`/api/medications/${id}`, 'DELETE');
      notify.success('Medicamento deletado.');
      loadMedications();
    } catch (err) {
      notify.error(err.error || 'Erro ao deletar medicamento.');
    }
  }
}

// ✅ CALENDARIO COM VALIDAÇÃO DE DATA
if (calendarForm) {
  calendarForm.addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('event-title')?.value.trim() || '';
    const date = document.getElementById('event-date')?.value || '';
    const description = document.getElementById('event-description')?.value.trim() || '';
    const submitBtn = calendarForm.querySelector('button[type="submit"]');

    if (!title || !date) {
      notify.error('Título e data são obrigatórios.');
      return;
    }

    if (!clientValidators.isValidDate(date)) {
      notify.error('Data inválida. Use formato: YYYY-MM-DD');
      return;
    }

    loadingStates.setLoading(submitBtn, true);

    try {
      await api('/api/calendar-event', 'POST', { title, date, description });
      calendarForm.reset();
      notify.success('Evento criado!');
      loadCalendarEvents();
    } catch (err) {
      if (err.error === 'Sem conexão') return;
      notify.error(err.error || 'Erro ao criar evento.');
    } finally {
      loadingStates.setLoading(submitBtn, false);
    }
  });
}

// ✅ PLANOS COM VALIDAÇÃO DE CONTEÚDO
if (planForm) {
  planForm.addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('plan-title')?.value.trim() || '';
    const content = document.getElementById('plan-content')?.value.trim() || '';
    const submitBtn = planForm.querySelector('button[type="submit"]');

    if (!title || !content) {
      notify.error('Título e conteúdo são obrigatórios.');
      return;
    }

    if (title.length < 3) {
      notify.error('Título deve ter no mínimo 3 caracteres.');
      return;
    }

    loadingStates.setLoading(submitBtn, true);

    try {
      await api('/api/save-plan', 'POST', { title, content });
      planForm.reset();
      notify.success('Plano salvo com sucesso!');
      loadPlans();
    } catch (err) {
      if (err.error === 'Sem conexão') return;
      notify.error(err.error || 'Erro ao salvar plano.');
    } finally {
      loadingStates.setLoading(submitBtn, false);
    }
  });
}

// ✅ CANCELAR ASSINATURA COM CONFIRMAÇÃO
if (cancelSubscriptionBtn) {
  cancelSubscriptionBtn.addEventListener('click', async () => {
    const confirmed = await confirm('Tem certeza que quer cancelar sua assinatura? Você perderá acesso aos recursos premium.');
    if (confirmed) {
      try {
        await api('/api/cancel-subscription', 'POST', {});
        notify.success('Assinatura cancelada.');
        loadSubscriptionStatus();
      } catch (err) {
        notify.error(err.error || 'Erro ao cancelar assinatura.');
      }
    }
  });
}

// Importar validações do servidor
function initializeApp() {
  authSection.classList.add('hide');
  appSection.classList.remove('hide');
  userWelcome.textContent = `Bem-vindo, ${currentUsername}!`;
  notify.success(`Bem-vindo de volta, ${currentUsername}!`);
}

// Inicializar
if (token) {
  initializeApp();
} else {
  authSection.classList.remove('hide');
  appSection.classList.add('hide');
}
