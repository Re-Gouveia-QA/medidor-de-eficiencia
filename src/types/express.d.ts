declare namespace Express {
  interface Request {
    /** Preenchido pelo middleware requireAuth */
    currentUser?: { id: string; nome: string; isAdmin: boolean };
    /** Mensagens flash (ver middlewares/flash.ts) — grava com (type, message), lê e limpa com (type) */
    flash(type: string, message: string): number;
    flash(type: string): string[];
  }
}
