import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userName?: string;
    isAdmin?: boolean; // regra 11: acesso à documentação de rotas (/docs)
    oauthState?: string; // CSRF do fluxo OAuth 2.0 com Google (RF03)
  }
}
