/**
 * Integração OAuth 2.0 com Google (RF03) — Fase 5 do roadmap.
 *
 * Implementação prevista:
 * 1. Redirecionar para o consent screen do Google (scope: openid email profile).
 * 2. Receber o callback em GET /auth/google/callback com o "code".
 * 3. Trocar o code por tokens e obter o perfil (google_id, nome, e-mail).
 * 4. UserModel.findOrCreateFromGoogle() — vincula à conta local se o e-mail já existir (regra 3).
 *
 * Sugestão de lib: passport + passport-google-oauth20, ou googleapis diretamente.
 */
export const GoogleAuthService = {
  getAuthUrl(): string {
    throw new Error('Google OAuth ainda não implementado (Fase 5 do roadmap).');
  },

  async handleCallback(_code: string): Promise<never> {
    throw new Error('Google OAuth ainda não implementado (Fase 5 do roadmap).');
  },
};
