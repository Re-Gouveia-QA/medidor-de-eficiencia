import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

/**
 * Model User — regras de domínio de conta e credenciais.
 * RNF01: senhas armazenadas apenas como hash (bcrypt).
 */
export const UserModel = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async createLocal(nome: string, email: string, senha: string) {
    const senhaHash = await bcrypt.hash(senha, 10);
    return prisma.user.create({ data: { nome, email, senhaHash } });
  },

  /** Regra 3: conta Google — vincula ao usuário local se o e-mail já existir. */
  async findOrCreateFromGoogle(googleId: string, nome: string, email: string) {
    const byGoogle = await prisma.user.findUnique({ where: { googleId } });
    if (byGoogle) return byGoogle;

    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return prisma.user.update({ where: { id: byEmail.id }, data: { googleId } });
    }
    return prisma.user.create({ data: { nome, email, googleId } });
  },

  async verifyPassword(senha: string, senhaHash: string | null): Promise<boolean> {
    if (!senhaHash) return false; // conta Google sem senha local
    return bcrypt.compare(senha, senhaHash);
  },
};
