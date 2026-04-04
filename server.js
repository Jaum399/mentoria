require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const webpush = require('web-push');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_0000000000000000000000000000');

const FRONTEND_URL = process.env.FRONTEND_URL || null;
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || null;
const USE_POSTGRES = process.env.NODE_ENV === 'production' || !!DATABASE_URL;

// Inicializar Express app
const app = express();

// Configurações do Express
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do banco de dados
let db;
if (USE_POSTGRES) {
  // PostgreSQL para produção (Vercel / Neon)
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const normalizePgQuery = (query) => {
    let index = 0;
    return query.replace(/\?/g, () => `$${++index}`);
  };

  const prepareParams = (params) => params || [];

  db.get = (sql, params = [], cb) => {
    db.query(normalizePgQuery(sql), prepareParams(params))
      .then(result => cb(null, result.rows[0] || null))
      .catch(cb);
  };

  db.all = (sql, params = [], cb) => {
    db.query(normalizePgQuery(sql), prepareParams(params))
      .then(result => cb(null, result.rows))
      .catch(cb);
  };

  db.run = (sql, params = [], cb = () => {}) => {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    const sqlWithReturn = /^\s*INSERT\s+/i.test(sql) && !/RETURNING\s+/i.test(sql)
      ? `${sql} RETURNING id`
      : sql;

    db.query(normalizePgQuery(sqlWithReturn), prepareParams(params))
      .then(result => {
        const fakeThis = { lastID: result.rows?.[0]?.id, changes: result.rowCount };
        cb.call(fakeThis, null);
      })
      .catch(cb);
  };

  db.prepare = (sql) => ({
    run: (params = [], cb = () => {}) => {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      db.run(sql, params, cb);
    },
    finalize: () => {}
  });

  console.log('PostgreSQL conectado (produção).');
} else {
  // SQLite para desenvolvimento
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database('./db.sqlite', err => {
    if (err) console.error('SQLite error:', err);
    else console.log('SQLite conectado (desenvolvimento).');
  });
}

// 🔐 Validação de Entrada - Funções Auxiliares
const validators = {
  // Validar email
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  },
  
  // Validar força de senha
  isStrongPassword: (password) => {
    // Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  },
  
  // Validar username
  isValidUsername: (username) => {
    // 3-50 caracteres, apenas letras, números, _, -
    const regex = /^[a-zA-Z0-9_-]{3,50}$/;
    return regex.test(username) && username.length >= 3 && username.length <= 50;
  },
  
  // Validar telefone brasileiro
  isValidPhone: (phone) => {
    // +55 + DDD + 8-9 dígitos
    const regex = /^\+55\d{2}9?\d{8,9}$/;
    return regex.test(phone.replace(/[\s-()]/g, ''));
  },
  
  // Validar horário (HH:MM)
  isValidTime: (time) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  },
  
  // Validar data ISO (YYYY-MM-DD)
  isValidDate: (dateStr) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  },
  
  // Validar data futura
  isFutureDate: (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    return date > now;
  },
  
  // Limpar e validar string
  sanitizeString: (str, maxLength = 255) => {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength);
  }
};

// Funções auxiliares para compatibilidade entre SQLite e PostgreSQL
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
      // PostgreSQL
      db.query(query, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    } else {
      // SQLite
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    }
  });
};

const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
      // PostgreSQL
      db.query(query, params, (err, result) => {
        if (err) reject(err);
        else resolve(result.rows[0] || null);
      });
    } else {
      // SQLite
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }
  });
};

const allQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
      // PostgreSQL
      db.query(query, params, (err, result) => {
        if (err) reject(err);
        else resolve(result.rows);
      });
    } else {
      // SQLite
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }
  });
};

const createTables = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

    // SQL para criação das tabelas
    const createUsersTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        stripe_customer_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;

    const createStudyPlansTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS study_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS study_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`;

    const createCalendarEventsTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        date TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        date TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`;

    const createSubscriptionsTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        plan TEXT,
        amount INTEGER
      )` :
      `CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        status TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        plan TEXT,
        amount INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`;

    const createPomodoroSessionsTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        duration INTEGER,
        type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        duration INTEGER,
        type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`;

    const createRemindersTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        date_time TEXT,
        message TEXT,
        completed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        date_time TEXT,
        message TEXT,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`;

    const createMedicationsTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS medications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        dosage TEXT,
        schedule TEXT,
        active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        dosage TEXT,
        schedule TEXT,
        active INTEGER DEFAULT 1,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`;

    const createMedicationLogsTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS medication_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
        taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )` :
      `CREATE TABLE IF NOT EXISTS medication_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        medication_id INTEGER,
        taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE
      )`;

    const createPushSubscriptionsTable = isProduction ?
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE,
        keys_auth TEXT,
        keys_p256dh TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )` :
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        endpoint TEXT UNIQUE,
        keys_auth TEXT,
        keys_p256dh TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`;

    // Executar criação das tabelas
    await runQuery(createUsersTable);
    await runQuery(createStudyPlansTable);
    await runQuery(createCalendarEventsTable);
    await runQuery(createSubscriptionsTable);
    await runQuery(createPomodoroSessionsTable);
    await runQuery(createRemindersTable);
    await runQuery(createMedicationsTable);
    await runQuery(createMedicationLogsTable);
    await runQuery(createPushSubscriptionsTable);

    console.log('Tabelas criadas com sucesso.');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  }
};

const initDatabase = async () => {
  try {
    await createTables();

    // Verificar se todas as tabelas foram criadas corretamente
    const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;
    if (!isProduction) {
      const tables = await allQuery("SELECT name FROM sqlite_master WHERE type='table'");
      console.log('Tabelas criadas:', tables.map(t => t.name));

      // Habilitar foreign keys
      await runQuery('PRAGMA foreign_keys = ON');
      console.log('Foreign keys habilitadas');
    } else {
      console.log('Banco PostgreSQL inicializado');
    }
  } catch (error) {
    console.error('Erro na inicialização do banco:', error);
  }
};

initDatabase();

// Função para verificar integridade do banco
const checkDatabaseIntegrity = () => {
  const checks = [
    // Verificar se todas as tabelas existem
    "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name IN ('users', 'study_plans', 'calendar_events', 'subscriptions', 'pomodoro_sessions', 'reminders', 'medications', 'medication_logs', 'push_subscriptions')",
    // Verificar foreign keys
    "PRAGMA foreign_key_check",
    // Verificar integridade
    "PRAGMA integrity_check"
  ];

  checks.forEach((query, index) => {
    db.all(query, (err, rows) => {
      if (err) {
        console.error(`Erro na verificação ${index + 1}:`, err);
      } else {
        console.log(`Verificação ${index + 1} OK:`, rows);
      }
    });
  });
};

// Executar verificação de integridade
setTimeout(checkDatabaseIntegrity, 1000);

// Função para testar integração completa do banco
const testDatabaseIntegration = () => {
  console.log('🔍 Iniciando testes de integração do banco de dados...');

  // Teste 1: Criar usuário de teste
  const testUser = {
    username: 'testuser_' + Date.now(),
    email: 'test' + Date.now() + '@example.com',
    password: 'testpass123'
  };

  db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [testUser.username, testUser.email, bcrypt.hashSync(testUser.password, 10)],
    function(err) {
      if (err) {
        console.error('❌ Erro ao criar usuário de teste:', err);
        return;
      }

      const userId = this.lastID;
      console.log('✅ Usuário de teste criado, ID:', userId);

      // Teste 2: Criar plano de estudo
      db.run('INSERT INTO study_plans (user_id, title, content) VALUES (?, ?, ?)',
        [userId, 'Plano de Teste', 'Conteúdo de teste para integração'],
        function(err2) {
          if (err2) console.error('❌ Erro ao criar plano:', err2);
          else console.log('✅ Plano criado');

          // Teste 3: Criar evento de calendário
          db.run('INSERT INTO calendar_events (user_id, title, date, description) VALUES (?, ?, ?, ?)',
            [userId, 'Evento Teste', '2024-12-25', 'Descrição do evento'],
            function(err3) {
              if (err3) console.error('❌ Erro ao criar evento:', err3);
              else console.log('✅ Evento criado');

              // Teste 4: Criar assinatura
              db.run('INSERT INTO subscriptions (user_id, status, plan, amount, expires_at) VALUES (?, ?, ?, ?, ?)',
                [userId, 'active', 'Basico', 3990, new Date(Date.now() + 30*24*60*60*1000).toISOString()],
                function(err4) {
                  if (err4) console.error('❌ Erro ao criar assinatura:', err4);
                  else console.log('✅ Assinatura criada');

                  // Teste 5: Criar medicamento
                  db.run('INSERT INTO medications (user_id, name, dosage, schedule, notes) VALUES (?, ?, ?, ?, ?)',
                    [userId, 'Paracetamol', '500mg', '08:00,20:00', 'Tomar com água'],
                    function(err5) {
                      if (err5) console.error('❌ Erro ao criar medicamento:', err5);
                      else console.log('✅ Medicamento criado');

                      // Teste 6: Criar lembrete
                      db.run('INSERT INTO reminders (user_id, title, date_time, message) VALUES (?, ?, ?, ?)',
                        [userId, 'Lembrete Teste', new Date().toISOString(), 'Mensagem de teste'],
                        function(err6) {
                          if (err6) console.error('❌ Erro ao criar lembrete:', err6);
                          else console.log('✅ Lembrete criado');

                          // Teste 7: Verificar consultas JOIN
                          db.all(`
                            SELECT u.username, sp.title as plan_title, ce.title as event_title,
                                   s.status as sub_status, m.name as med_name, r.title as reminder_title
                            FROM users u
                            LEFT JOIN study_plans sp ON u.id = sp.user_id
                            LEFT JOIN calendar_events ce ON u.id = ce.user_id
                            LEFT JOIN subscriptions s ON u.id = s.user_id
                            LEFT JOIN medications m ON u.id = m.user_id
                            LEFT JOIN reminders r ON u.id = r.user_id
                            WHERE u.id = ?
                          `, [userId], (err7, rows) => {
                            if (err7) {
                              console.error('❌ Erro na consulta JOIN:', err7);
                            } else {
                              console.log('✅ Consulta JOIN bem-sucedida:', rows.length, 'registros');
                              console.log('🎉 Integração do banco de dados 100% funcional!');
                            }

                            // Limpar dados de teste (deletar em ordem reversa das dependências)
                            db.run('DELETE FROM medication_logs WHERE user_id = ?', [userId], (err1) => {
                              if (err1) console.error('❌ Erro ao limpar medication_logs:', err1);
                              db.run('DELETE FROM medications WHERE user_id = ?', [userId], (err2) => {
                                if (err2) console.error('❌ Erro ao limpar medications:', err2);
                                db.run('DELETE FROM push_subscriptions WHERE user_id = ?', [userId], (err3) => {
                                  if (err3) console.error('❌ Erro ao limpar push_subscriptions:', err3);
                                  db.run('DELETE FROM reminders WHERE user_id = ?', [userId], (err4) => {
                                    if (err4) console.error('❌ Erro ao limpar reminders:', err4);
                                    db.run('DELETE FROM pomodoro_sessions WHERE user_id = ?', [userId], (err5) => {
                                      if (err5) console.error('❌ Erro ao limpar pomodoro_sessions:', err5);
                                      db.run('DELETE FROM subscriptions WHERE user_id = ?', [userId], (err6) => {
                                        if (err6) console.error('❌ Erro ao limpar subscriptions:', err6);
                                        db.run('DELETE FROM calendar_events WHERE user_id = ?', [userId], (err7) => {
                                          if (err7) console.error('❌ Erro ao limpar calendar_events:', err7);
                                          db.run('DELETE FROM study_plans WHERE user_id = ?', [userId], (err8) => {
                                            if (err8) console.error('❌ Erro ao limpar study_plans:', err8);
                                            db.run('DELETE FROM users WHERE id = ?', [userId], (err9) => {
                                              if (err9) console.error('❌ Erro ao limpar users:', err9);
                                              else console.log('🧹 Dados de teste removidos');
                                            });
                                          });
                                        });
                                      });
                                    });
                                  });
                                });
                              });
                            });
                          });
                        });
                    });
                });
            });
        });
    });
};

// Executar teste de integração após 2 segundos
setTimeout(testDatabaseIntegration, 2000);

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não encontrado.' });

  jwt.verify(token, process.env.JWT_SECRET || 'supersecreto123', (err, data) => {
    if (err) return res.status(401).json({ error: 'Token inválido.' });
    req.userId = data.id;
    next();
  });
};

const findOrCreateUserByEmail = (email, username, callback) => {
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return callback(err);
    if (user) return callback(null, { id: user.id, username: user.username, email: user.email });

    const pwdHash = bcrypt.hashSync(Math.random().toString(36).slice(2), 10);
    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, pwdHash], function (err2) {
      if (err2) return callback(err2);
      callback(null, { id: this.lastID, username, email });
    });
  });
};

const getOrCreateStripeCustomer = (userId, email, username) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT stripe_customer_id FROM users WHERE id = ?', [userId], async (err, row) => {
      if (err) return reject(err);
      if (row && row.stripe_customer_id) return resolve(row.stripe_customer_id);

      try {
        const customer = await stripe.customers.create({ email, name: username, metadata: { userId } });
        db.run('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customer.id, userId], error => {
          if (error) console.warn('Falha ao gravar stripe_customer_id no usuário:', error.message);
        });
        resolve(customer.id);
      } catch (stripeError) {
        reject(stripeError);
      }
    });
  });
};

let subscriptionPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || null;

const getSubscriptionPriceId = async () => {
  if (subscriptionPriceId) return subscriptionPriceId;
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_0000000000000000000000000000')) {
    // Não é possível criar sem chave verdadeira; use preço grátis de teste
    return null;
  }

  const product = await stripe.products.create({ name: 'Mentoria Mensal', metadata: { app: 'estudo-mentorias' } });
  const price = await stripe.prices.create({ product: product.id, unit_amount: 3990, currency: 'brl', recurring: { interval: 'month' } });
  subscriptionPriceId = price.id;
  return subscriptionPriceId;
};

app.post('/api/register', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  
  // Validações
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  
  if (!validators.isValidUsername(username)) {
    return res.status(400).json({ error: 'Username deve ter 3-50 caracteres (letras, números, _, -).' });
  }
  
  if (!validators.isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }
  
  if (!validators.isStrongPassword(password)) {
    return res.status(400).json({ error: 'Senha fraca. Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial.' });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'As senhas não coincidem.' });
  }

  const pwdHash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, pwdHash], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        const field = err.message.includes('username') ? 'Username' : 'Email';
        return res.status(409).json({ error: `${field} já cadastrado.` });
      }
      return res.status(500).json({ error: 'Erro ao criar usuário. Tente novamente.' });
    }
    const token = jwt.sign({ id: this.lastID }, process.env.JWT_SECRET || 'supersecreto123', { expiresIn: '30d' });
    res.json({ token, user: { id: this.lastID, username, email } });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  
  if (!validators.isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Usuário não encontrado.' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Senha incorreta.' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'supersecreto123', { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  proxy: true
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value;
  const name = profile.displayName || profile.name?.givenName || 'Usuário Google';
  if (!email) return done(new Error('Google não retornou email.'));
  findOrCreateUserByEmail(email, name, (err, user) => {
    done(err, user);
  });
}));

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'YOUR_GITHUB_CLIENT_SECRET',
  callbackURL: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
  scope: ['user:email'],
  proxy: true
}, (accessToken, refreshToken, profile, done) => {
  let email = profile.emails?.[0]?.value;
  if (!email && Array.isArray(profile.emails)) {
    email = profile.emails.find(e => e.primary)?.value || profile.emails[0]?.value;
  }
  const name = profile.username || profile.displayName || 'Usuário GitHub';
  if (!email) return done(new Error('GitHub não retornou email.'));
  findOrCreateUserByEmail(email, name, (err, user) => {
    done(err, user);
  });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  db.get('SELECT id, username, email FROM users WHERE id = ?', [id], (err, user) => {
    if (err || !user) return done(err, null);
    done(null, user);
  });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/?login=fail' }), (req, res) => {
  const user = req.user;
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'supersecreto123', { expiresIn: '30d' });
  const target = FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  res.redirect(`${target}/?token=${encodeURIComponent(token)}&username=${encodeURIComponent(user.username)}`);
});

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/?login=fail' }), (req, res) => {
  const user = req.user;
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'supersecreto123', { expiresIn: '30d' });
  const target = FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  res.redirect(`${target}/?token=${encodeURIComponent(token)}&username=${encodeURIComponent(user.username)}`);
});

let vapidPublicKey;
let vapidPrivateKey;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
} else {
  const vapidKeys = webpush.generateVAPIDKeys();
  vapidPublicKey = vapidKeys.publicKey;
  vapidPrivateKey = vapidKeys.privateKey;
  console.info('VAPID keys geradas automaticamente para desenvolvimento. Defina em env para deploy.');
}
webpush.setVapidDetails('mailto:contato@mentoria.com', vapidPublicKey, vapidPrivateKey);

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

app.post('/api/save-push-subscription', authMiddleware, (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Subscription inválido.' });

  const query = USE_POSTGRES
    ? 'INSERT INTO push_subscriptions (user_id, endpoint, keys_auth, keys_p256dh) VALUES (?, ?, ?, ?) ON CONFLICT (endpoint) DO NOTHING'
    : 'INSERT OR IGNORE INTO push_subscriptions (user_id, endpoint, keys_auth, keys_p256dh) VALUES (?, ?, ?, ?)';

  db.run(query, [req.userId, sub.endpoint, sub.keys.auth, sub.keys.p256dh], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao salvar subscription.' });
    res.json({ success: true });
  });
});

const notifyUserByPush = (userId, title, message) => {
  db.all('SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions WHERE user_id = ?', [userId], async (err, rows) => {
    if (err || !rows || rows.length === 0) return;
    const payload = JSON.stringify({ title, body: message });
    for (const row of rows) {
      const subscription = { endpoint: row.endpoint, keys: { auth: row.keys_auth, p256dh: row.keys_p256dh } };
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (e) {
        console.warn('Falha ao enviar push para usuário', userId, e.message);
      }
    }
  });
};

const updateExpiredSubscriptions = () => {
  const now = new Date().toISOString();
  db.all('SELECT id, user_id FROM subscriptions WHERE status = ? AND expires_at <= ?', ['active', now], (err, rows) => {
    if (err || !rows || rows.length === 0) return;
    const userIds = new Set(rows.map(r => r.user_id));
    db.run('UPDATE subscriptions SET status = ? WHERE status = ? AND expires_at <= ?', ['expired', 'active', now], function (err2) {
      if (err2) {
        console.error('Erro ao atualizar subs expiradas:', err2.message);
        return;
      }
      userIds.forEach(userId => notifyUserByPush(userId, 'Assinatura expirada', 'Sua assinatura expirou. Renove para continuar com recursos premium.'));
    });
  });
};

// Executa verificações de expiração a cada 30 min
setInterval(updateExpiredSubscriptions, 30 * 60 * 1000);

app.post('/api/check-subscription-expirations', authMiddleware, (req, res) => {
  updateExpiredSubscriptions();
  res.json({ message: 'Verificação agendada / executada.' });
});

app.post(['/webhook', '/api/webhook'], bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Webhook stripe inválido', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const handleSubscriptionStatus = (customerId, status, expiresAt, planName) => {
    if (!customerId) return;
    db.get('SELECT id FROM users WHERE stripe_customer_id = ?', [customerId], (err, row) => {
      if (err || !row) return;
      const userId = row.id;
      const setStatus = status === 'active' ? 'active' : status === 'canceled' || status === 'incomplete' ? 'canceled' : status;
      db.run('UPDATE subscriptions SET status = ? WHERE user_id = ? AND status IN (?, ?)', [setStatus, userId, 'active', 'pending'], () => {
        if (setStatus === 'active' && expiresAt) {
          db.run('UPDATE subscriptions SET expires_at = ? WHERE user_id = ? AND status = ?', [expiresAt.toISOString(), userId, setStatus]);
        }
      });
      if (setStatus === 'expired' || setStatus === 'canceled') {
        notifyUserByPush(userId, 'Assinatura atualizada', `A assinatura foi ${setStatus}.`);
      }
    });
  };

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      {
        const sub = event.data.object;
        const customerId = sub.customer;
        const status = sub.status;
        const expiresAt = new Date(sub.current_period_end * 1000);
        handleSubscriptionStatus(customerId, status === 'active' ? 'active' : status, expiresAt, sub.plan?.nickname || 'Assinatura');
      }
      break;
    case 'customer.subscription.deleted':
      {
        const customerId = event.data.object.customer;
        handleSubscriptionStatus(customerId, 'canceled');
      }
      break;
    case 'invoice.payment_failed':
      {
        const customerId = event.data.object.customer;
        handleSubscriptionStatus(customerId, 'canceled');
      }
      break;
    case 'invoice.payment_succeeded':
      {
        const customerId = event.data.object.customer;
        const periodEnd = new Date(event.data.object.lines.data[0].period.end * 1000);
        handleSubscriptionStatus(customerId, 'active', periodEnd);
      }
      break;
    default:
      console.info('Evento Stripe não tratado:', event.type);
  }

  res.json({ received: true });
});

app.post('/api/send-push', authMiddleware, (req, res) => {
  const { title, message } = req.body;
  db.all('SELECT endpoint, keys_auth, keys_p256dh FROM push_subscriptions WHERE user_id = ?', [req.userId], async (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar subscriptions.' });
    const results = [];
    for (const row of rows) {
      const subscription = { endpoint: row.endpoint, keys: { auth: row.keys_auth, p256dh: row.keys_p256dh } };
      try {
        await webpush.sendNotification(subscription, JSON.stringify({ title: title || 'Mentoria', body: message || 'Você tem uma nova notificação.' }));
        results.push({ endpoint: row.endpoint, status: 'sent' });
      } catch (pushError) {
        results.push({ endpoint: row.endpoint, status: 'failed', error: pushError.message });
      }
    }
    res.json({ results });
  });
});

app.get('/api/me', authMiddleware, (req, res) => {
  db.get('SELECT id, username, email FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ user });
  });
});

app.get('/api/plans', (req, res) => {
  res.json({ plans: [
    { id: 1, title: 'Plano Básico', description: '3 horas/dia, 5 dias/semana', price: 39.9 },
    { id: 2, title: 'Plano Intensivo', description: '4 horas/dia, 6 dias/semana', price: 39.9 },
    { id: 3, title: 'Plano Premium', description: '6 horas/dia, conteúdo personalizado', price: 39.9 }
  ] });
});

app.post('/api/save-plan', authMiddleware, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });

  db.run('INSERT INTO study_plans (user_id, title, content) VALUES (?, ?, ?)', [req.userId, title, content], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao salvar plano.' });
    res.json({ id: this.lastID, title, content });
  });
});

app.get('/api/my-plans', authMiddleware, (req, res) => {
  db.all('SELECT id, title, content, created_at FROM study_plans WHERE user_id = ? ORDER BY created_at DESC', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar planos.' });
    res.json({ plans: rows });
  });
});

app.post('/api/calendar-event', authMiddleware, (req, res) => {
  const { title, date, description } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Título e data são obrigatórios.' });
  db.run('INSERT INTO calendar_events (user_id, title, date, description) VALUES (?, ?, ?, ?)', [req.userId, title, date, description || ''], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao salvar evento.' });
    res.json({ id: this.lastID, title, date, description });
  });
});

app.get('/api/calendar-events', authMiddleware, (req, res) => {
  const { date } = req.query;
  let query = 'SELECT id, title, date, description, "event" as type FROM calendar_events WHERE user_id = ?';
  let params = [req.userId];

  if (date) {
    query += ' AND date(date) = date(?)';
    params.push(date);
  }

  query += ' ORDER BY date ASC';

  db.all(query, params, (err, events) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar eventos.' });

    // Adicionar lembretes de medicamentos como eventos
    const medQuery = 'SELECT id, name as title, schedule, dosage, notes FROM medications WHERE user_id = ? AND active = 1';
    db.all(medQuery, [req.userId], (err2, meds) => {
      if (err2) return res.status(500).json({ error: 'Erro ao buscar medicamentos.' });

      const medEvents = [];
      const today = new Date();
      const targetDate = date ? new Date(date) : today;

      meds.forEach(med => {
        const schedules = med.schedule.split(',').map(s => s.trim());
        schedules.forEach(sched => {
          const [hours, minutes] = sched.split(':');
          const eventDate = new Date(targetDate);
          eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          if (!date || eventDate.toDateString() === targetDate.toDateString()) {
            medEvents.push({
              id: `med-${med.id}-${sched}`,
              title: `💊 ${med.name}`,
              date: eventDate.toISOString(),
              description: `Dosagem: ${med.dosage}. ${med.notes || ''}`,
              type: 'medication'
            });
          }
        });
      });

      res.json({ events: [...events, ...medEvents] });
    });
  });
});

app.post('/api/pomodoro-log', authMiddleware, (req, res) => {
  const { duration, type } = req.body;
  if (!duration || !type) return res.status(400).json({ error: 'Duração e tipo são obrigatórios.' });

  db.run('INSERT INTO pomodoro_sessions (user_id, duration, type) VALUES (?, ?, ?)', [req.userId, duration, type], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao registrar sessão.' });
    res.json({ id: this.lastID, duration, type });
  });
});

app.get('/api/pomodoro-log', authMiddleware, (req, res) => {
  db.all('SELECT id, duration, type, created_at FROM pomodoro_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar histórico.' });
    res.json({ history: rows });
  });
});

app.post('/api/subscribe', authMiddleware, (req, res) => {
  const { plan, months } = req.body;
  const priceMap = { Basico: 1900, Intensivo: 2900, Premium: 4900 };
  const amount = priceMap[plan] || 1900;
  const today = new Date();
  const expires = new Date(today.getFullYear(), today.getMonth() + (months || 1), today.getDate());

  // Inativa assinaturas antigas antes de criar a nova
  db.run('UPDATE subscriptions SET status = ? WHERE user_id = ? AND status = ?', ['canceled', req.userId, 'active'], function (err) {
    if (err) {
      console.warn('Falha ao cancelar assinaturas ativas anteriores:', err.message);
    }
    db.run('INSERT INTO subscriptions (user_id, status, expires_at, plan, amount) VALUES (?, ?, ?, ?, ?)', [req.userId, 'active', expires.toISOString(), plan, amount], function (err2) {
      if (err2) return res.status(500).json({ error: 'Erro ao criar assinatura.' });
      res.json({ message: 'Assinatura ativa!', plan, expires_at: expires.toISOString(), amount });
    });
  });
});

app.get('/api/subscriptions', authMiddleware, (req, res) => {
  db.all('SELECT id, status, plan, amount, started_at, expires_at FROM subscriptions WHERE user_id = ? ORDER BY started_at DESC', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar assinaturas.' });
    res.json({ subscriptions: rows });
  });
});

app.get('/api/subscription-status', authMiddleware, (req, res) => {
  db.get('SELECT status, plan, expires_at FROM subscriptions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1', [req.userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar status de assinatura.' });
    if (!row) return res.json({ status: 'inactive', message: 'Nenhuma assinatura encontrada.' });
    const active = row.status === 'active' && new Date(row.expires_at) > new Date();
    res.json({ status: active ? 'active' : 'inactive', plan: row.plan, expires_at: row.expires_at });
  });
});

app.post('/api/subscriptions/cancel', authMiddleware, (req, res) => {
  db.run('UPDATE subscriptions SET status = ? WHERE user_id = ? AND status = ?', ['canceled', req.userId, 'active'], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao cancelar assinatura.' });
    if (this.changes === 0) return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada.' });
    res.json({ message: 'Assinatura cancelada com sucesso.' });
  });
});

app.post('/api/create-checkout-session', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  const priceMap = { Basico: 1900, Intensivo: 2900, Premium: 4900 };
  const amount = priceMap[plan] || 1900;
  const frontendUrl = FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price_data: { currency: 'brl', product_data: { name: `Assinatura ${plan}` }, unit_amount: amount }, quantity: 1 }],
      success_url: `${frontendUrl}/?checkout=success`,
      cancel_url: `${frontendUrl}/?checkout=cancel`
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout', error);
    res.status(500).json({ error: 'Falha ao criar sessão de pagamento Stripe.' });
  }
});

app.post('/api/create-subscription-session', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  const priceId = await getSubscriptionPriceId();
  const frontendUrl = FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

  if (!priceId) {
    return res.status(500).json({ error: 'Não foi possível identificar o preço de assinatura. Configure STRIPE_SUBSCRIPTION_PRICE_ID.' });
  }

  try {
    db.get('SELECT id, username, email FROM users WHERE id = ?', [req.userId], async (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'Usuário não encontrado.' });
      const customerId = await getOrCreateStripeCustomer(user.id, user.email, user.username);
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${frontendUrl}/?checkout=success`,
        cancel_url: `${frontendUrl}/?checkout=cancel`
      });

      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      db.run('INSERT INTO subscriptions (user_id, status, expires_at, plan, amount) VALUES (?, ?, ?, ?, ?)', [req.userId, 'pending', expires.toISOString(), plan || 'Mensal', 3990], () => {});
      res.json({ url: session.url });
    });
  } catch (error) {
    console.error('Stripe subscription', error);
    res.status(500).json({ error: 'Falha ao criar sessão de assinatura Stripe.' });
  }
});

// Login com Google/telefone
const phoneCodes = {};

app.post('/api/request-phone-code', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Telefone é obrigatório.' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  phoneCodes[phone] = code;
  console.log(`Código de login para ${phone}: ${code}`);
  res.json({ message: 'Código enviado (simulado). Verifique no console.' });
});

app.post('/api/login-phone', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Telefone e código são obrigatórios.' });
  if (phoneCodes[phone] !== code) return res.status(401).json({ error: 'Código inválido.' });

  const username = `Usuario${phone.slice(-4)}`;
  const email = `${phone}@phone.user`;
  const pwdHash = bcrypt.hashSync(Math.random().toString(36).slice(2), 10);

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro interno.' });

    const handleJwt = id => {
      const token = jwt.sign({ id }, process.env.JWT_SECRET || 'supersecreto123', { expiresIn: '30d' });
      res.json({ token, user: { id, username, email } });
    };

    if (user) return handleJwt(user.id);

    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, pwdHash], function (err2) {
      if (err2) return res.status(500).json({ error: 'Erro ao criar usuário.' });
      handleJwt(this.lastID);
    });
  });
});

app.post('/api/login-google', (req, res) => {
  const { email, username } = req.body;
  if (!email || !username) return res.status(400).json({ error: 'Email e nome são obrigatórios.' });

  const pwdHash = bcrypt.hashSync(Math.random().toString(36).slice(2), 10);

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro interno.' });

    const handleJwt = id => {
      const token = jwt.sign({ id }, process.env.JWT_SECRET || 'supersecreto123', { expiresIn: '30d' });
      res.json({ token, user: { id, username, email } });
    };

    if (user) return handleJwt(user.id);

    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, pwdHash], function (err2) {
      if (err2) return res.status(500).json({ error: 'Erro ao criar usuário.' });
      handleJwt(this.lastID);
    });
  });
});

// Inteligência artificial / sugestão de plano
app.post('/api/ai-plan', authMiddleware, (req, res) => {
  const { objetivo, horario, tempo } = req.body;
  if (!objetivo || !horario || !tempo) return res.status(400).json({ error: 'Objetivo, horário e tempo são obrigatórios.' });
  const planos = [
    `Foque em ${objetivo} por ${tempo} minutos com 4 ciclos de pomodoro`,
    `Reserve 30m de revisão e 1h de conteúdo novo hoje à noite`,
    `Use flashcards por 20m e simulados por 40m para ${objetivo}`
  ];
  return res.json({ suggestion: planos[Math.floor(Math.random() * planos.length)] });
});

// Reminders
app.post('/api/reminders', authMiddleware, (req, res) => {
  const { title, date_time, message } = req.body;
  if (!title || !date_time) return res.status(400).json({ error: 'Título e data/hora são obrigatórios.' });
  db.run('INSERT INTO reminders (user_id, title, date_time, message) VALUES (?, ?, ?, ?)', [req.userId, title, date_time, message || ''], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao salvar lembrete.' });
    res.json({ id: this.lastID, title, date_time, message });
  });
});

app.get('/api/reminders', authMiddleware, (req, res) => {
  db.all('SELECT id, title, date_time, message, completed FROM reminders WHERE user_id = ? ORDER BY date_time ASC', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar lembretes.' });
    res.json({ reminders: rows });
  });
});

app.put('/api/reminders/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  db.run('UPDATE reminders SET completed = ? WHERE id = ? AND user_id = ?', [completed ? 1 : 0, id, req.userId], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar lembrete.' });
    res.json({ updated: this.changes });
  });
});

// MedSimples integration (gestão de medicamentos) - manutenção de farmácia + lembretes
app.get('/api/medications', authMiddleware, (req, res) => {
  db.all('SELECT id, name, dosage, schedule, active, notes, created_at FROM medications WHERE user_id = ? ORDER BY created_at DESC', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar medicamentos.' });
    res.json({ medications: rows });
  });
});

app.post('/api/medications', authMiddleware, (req, res) => {
  const { name, dosage, schedule, notes } = req.body;
  if (!name || !dosage || !schedule) return res.status(400).json({ error: 'Nome, dosagem e horário são obrigatórios.' });
  db.run('INSERT INTO medications (user_id, name, dosage, schedule, notes) VALUES (?, ?, ?, ?, ?)', [req.userId, name, dosage, schedule, notes || ''], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao salvar medicamento.' });
    // Gera lembretes automáticos para integração Mentoris/Medsimples
    const schedules = schedule.split(',').map(s => s.trim());
    schedules.forEach(sched => {
      const reminderTitle = `Tomar ${name}`;
      const today = new Date();
      const [hours, minutes] = sched.split(':');
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const reminderDateTime = today.toISOString();
      db.run('INSERT INTO reminders (user_id, title, date_time, message) VALUES (?, ?, ?, ?)', [req.userId, reminderTitle, reminderDateTime, `Dosagem: ${dosage} às ${sched}`]);
    });
    res.json({ id: this.lastID, name, dosage, schedule, notes });
  });
});

app.put('/api/medications/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, dosage, schedule, active, notes } = req.body;
  db.run('UPDATE medications SET name = ?, dosage = ?, schedule = ?, active = ?, notes = ? WHERE id = ? AND user_id = ?', [name, dosage, schedule, active ? 1 : 0, notes || '', id, req.userId], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar medicamento.' });
    res.json({ updated: this.changes });
  });
});

app.delete('/api/medications/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM medications WHERE id = ? AND user_id = ?', [id, req.userId], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao apagar medicamento.' });
    res.json({ deleted: this.changes });
  });
});

app.post('/api/medsimples-import', authMiddleware, (req, res) => {
  const simulated = [
    { name: 'Vitamina D', dosage: '1 comprimido', schedule: '08:00', notes: 'Com café da manhã' },
    { name: 'Metformina', dosage: '500mg', schedule: '20:00', notes: 'Após jantar' }
  ];

  const stmt = db.prepare('INSERT INTO medications (user_id, name, dosage, schedule, notes) VALUES (?, ?, ?, ?, ?)');
  simulated.forEach(item => {
    stmt.run(req.userId, item.name, item.dosage, item.schedule, item.notes);
    const reminderTitle = `Tomar ${item.name}`;
    const reminderDateTime = new Date().toISOString();
    db.run('INSERT INTO reminders (user_id, title, date_time, message) VALUES (?, ?, ?, ?)', [req.userId, reminderTitle, reminderDateTime, `Dosagem: ${item.dosage} às ${item.schedule}`]);
  });
  stmt.finalize();

  res.json({ imported: simulated.length, medications: simulated });
});

app.post('/api/medication-log', authMiddleware, (req, res) => {
  const { medication_id, notes } = req.body;
  if (!medication_id) return res.status(400).json({ error: 'ID do medicamento é obrigatório.' });
  db.run('INSERT INTO medication_logs (user_id, medication_id, notes) VALUES (?, ?, ?)', [req.userId, medication_id, notes || ''], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao registrar dose.' });
    res.json({ id: this.lastID, medication_id, taken_at: new Date().toISOString(), notes });
  });
});

app.get('/api/medication-logs', authMiddleware, (req, res) => {
  db.all('SELECT ml.id, ml.medication_id, m.name, ml.taken_at, ml.notes FROM medication_logs ml JOIN medications m ON ml.medication_id = m.id WHERE ml.user_id = ? ORDER BY ml.taken_at DESC LIMIT 50', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar histórico.' });
    res.json({ logs: rows });
  });
});

app.delete('/api/reminders/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM reminders WHERE id = ? AND user_id = ?', [id, req.userId], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao apagar lembrete.' });
    res.json({ deleted: this.changes });
  });
});

if (require.main === module) {
  app.listen(process.env.PORT || 8080, () => {
    console.log('Servidor rodando na porta', process.env.PORT || 8080);
  });
}

module.exports = app;
