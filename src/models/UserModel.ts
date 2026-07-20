import bcrypt from 'bcryptjs';
import { BaseModel } from './BaseModel';

/**
 * Model User — regras de domínio de conta e credenciais.
 * RNF01: senhas armazenadas apenas como hash (bcrypt).
 * Não usa scopeToUser (herdado de BaseModel): User é a própria identidade de
 * escopo, não um dado subordinado a um userId — não há "dono" a validar aqui.
 */
class UserModelImpl extends BaseModel {
  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  async createLocal(nome: string, email: string, senha: string) {
    const senhaHash = await bcrypt.hash(senha, 10);
    return this.db.user.create({ data: { nome, email, senhaHash } });
  }

  /** Regra 3: conta Google — vincula ao usuário local se o e-mail já existir. */
  async findOrCreateFromGoogle(googleId: string, nome: string, email: string) {
    // Mesma normalização do cadastro/login local (registerSchema/loginSchema) — sem isso, uma conta
    // Google com e-mail em capitalização diferente da conta local não seria reconhecida como a mesma
    // (comparação de e-mail é case-sensitive no Postgres por padrão) e criaria uma conta duplicada.
    const normalizedEmail = email.toLowerCase();

    const byGoogle = await this.db.user.findUnique({ where: { googleId } });
    if (byGoogle) return byGoogle;

    const byEmail = await this.db.user.findUnique({ where: { email: normalizedEmail } });
    if (byEmail) {
      return this.db.user.update({ where: { id: byEmail.id }, data: { googleId } });
    }
    return this.db.user.create({ data: { nome, email: normalizedEmail, googleId } });
  }

  async verifyPassword(senha: string, senhaHash: string | null): Promise<boolean> {
    if (!senhaHash) return false; // conta Google sem senha local
    return bcrypt.compare(senha, senhaHash);
  }
}

export const UserModel = new UserModelImpl();
