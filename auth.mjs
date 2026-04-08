import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { dash } from '@better-auth/infra';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const auth = betterAuth({
  database: pool,

  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET,
  apiKey: {
    enabled: true,
    defaultPrefix: 'ba_',
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  trustedOrigins: [
    'http://localhost:8080',
    'https://mentoria-kohl.vercel.app',
    'https://mentoriasappa.netlify.app',
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24,       // atualiza a cada 1 dia
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  user: {
    additionalFields: {
      username: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },

  plugins: [
    dash()
  ],
});
