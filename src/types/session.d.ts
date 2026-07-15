import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userName?: string;
    oauthState?: string; // CSRF do fluxo OAuth 2.0 com Google (RF03)
  }
}
