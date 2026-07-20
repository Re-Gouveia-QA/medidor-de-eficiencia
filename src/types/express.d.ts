declare namespace Express {
  interface Request {
    /** Preenchido pelo middleware requireAuth */
    currentUser?: { id: string; nome: string; isAdmin: boolean };
    /** Fuso IANA do usuário (RNF05) — lido do cookie "tz" em app.ts, sempre um valor válido (default 'UTC'). */
    userTimezone: string;
    /** Mensagens flash (ver middlewares/flash.ts) — grava com (type, message), lê e limpa com (type) */
    flash(type: string, message: string): number;
    flash(type: string): string[];
  }
}
