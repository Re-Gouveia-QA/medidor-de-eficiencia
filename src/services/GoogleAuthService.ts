import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

/** Integração OAuth 2.0 com Google (RF03 — Fase 5 do roadmap). */

export interface GoogleProfile {
  googleId: string;
  nome: string;
  email: string;
}

function createClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_CALLBACK_URL,
  });
}

export const GoogleAuthService = {
  /** RF03: só é possível fazer login com Google quando as credenciais estão no ambiente. */
  isConfigured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL);
  },

  /** Monta a URL do consent screen do Google. `state` protege contra CSRF. */
  getAuthUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new Error('Login com Google não está configurado (GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL).');
    }
    return createClient().generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state,
    });
  },

  /** Troca o "code" do callback por tokens e extrai o perfil do usuário (regra 3). */
  async handleCallback(code: string): Promise<GoogleProfile> {
    if (!this.isConfigured()) {
      throw new Error('Login com Google não está configurado (GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL).');
    }
    const client = createClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) {
      throw new Error('Google não retornou um id_token válido.');
    }

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error('Perfil do Google incompleto (sub/e-mail ausentes).');
    }
    if (!payload.email_verified) {
      throw new Error('O e-mail da conta Google não está verificado.');
    }

    return {
      googleId: payload.sub,
      nome: payload.name ?? payload.email,
      email: payload.email,
    };
  },
};
