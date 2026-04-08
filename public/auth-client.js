/**
 * auth-client.js
 * Cliente para better-auth — sem bundler (fetch-based)
 * Equivalente ao createAuthClient + sentinelClient(@better-auth/infra/client)
 */

const BASE = (window.API_BASE_URL || '').replace(/\/$/, '');
const AUTH = `${BASE}/api/auth`;

// sentinelClient: enriquece cada request com headers de segurança (fingerprint, IP hint)
function _sentinelHeaders() {
  return {
    'x-ba-fingerprint': btoa([navigator.userAgent, screen.width, screen.height, navigator.language].join('|')).slice(0, 64),
    'x-ba-tz': Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

async function _request(method, path, body) {
  const res = await fetch(`${AUTH}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ..._sentinelHeaders(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.headers.get('content-type')?.includes('json')
    ? await res.json()
    : await res.text();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

export const authClient = {
  /** Cadastro com e-mail e senha */
  signUp: (email, password, name) =>
    _request('POST', '/sign-up/email', { email, password, name }),

  /** Login com e-mail e senha */
  signIn: (email, password) =>
    _request('POST', '/sign-in/email', { email, password }),

  /** Logout */
  signOut: () => _request('POST', '/sign-out'),

  /** Sessão atual */
  getSession: () => _request('GET', '/get-session'),

  /** Login social — redireciona o browser */
  signInSocial: (provider) => {
    window.location.href = `${AUTH}/sign-in/social?provider=${provider}&callbackURL=${encodeURIComponent(window.location.origin)}`;
  },

  /** Alterar senha */
  changePassword: (currentPassword, newPassword) =>
    _request('POST', '/change-password', { currentPassword, newPassword }),

  /** Solicitar reset de senha */
  forgotPassword: (email) =>
    _request('POST', '/forget-password', { email, redirectTo: `${window.location.origin}/reset-password` }),

  /** Confirmar reset de senha */
  resetPassword: (token, newPassword) =>
    _request('POST', '/reset-password', { token, newPassword }),
};
