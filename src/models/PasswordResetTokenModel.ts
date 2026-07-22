import crypto from 'node:crypto';
import { BaseModel } from './BaseModel';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Model PasswordResetToken — token de uso único para recuperação de senha.
 * Só o hash SHA-256 do token é persistido; o valor bruto só existe em memória
 * (devolvido pra quem chamou create(), pra ir no link do e-mail) e nunca no banco.
 * Não usa scopeToUser (herdado de BaseModel): não há listagem/exposição desses
 * tokens a um usuário, só validação pontual pelo próprio valor do token.
 */
class PasswordResetTokenModelImpl extends BaseModel {
  /** Gera um novo token, invalidando qualquer token anterior ainda não usado do mesmo usuário. */
  async create(userId: string): Promise<string> {
    await this.db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    await this.db.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    return rawToken;
  }

  /** Retorna o token válido (existe, não expirado, não usado) ou null. */
  async findValidByRawToken(rawToken: string) {
    const token = await this.db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!token || token.usedAt || token.expiresAt < new Date()) return null;
    return token;
  }

  markUsed(id: string) {
    return this.db.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  }
}

export const PasswordResetTokenModel = new PasswordResetTokenModelImpl();
