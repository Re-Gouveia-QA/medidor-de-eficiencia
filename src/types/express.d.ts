declare namespace Express {
  interface Request {
    /** Preenchido pelo middleware requireAuth */
    currentUser?: { id: string; nome: string; isAdmin: boolean };
  }
}
