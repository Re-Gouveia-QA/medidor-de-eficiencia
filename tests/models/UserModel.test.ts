import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/config/database';
import { UserModel } from '../../src/models/UserModel';

describe('UserModel — regras 1, 3 e 6 (credenciais e conta Google)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createLocal (regra 1: senha armazenada apenas como hash bcrypt)', () => {
    it('grava o hash bcrypt da senha, nunca o valor em texto puro', async () => {
      vi.mocked(prisma.user.create).mockResolvedValue({ id: 'user-1' } as never);

      await UserModel.createLocal('Ana', 'ana@example.com', 'senha12345');

      const call = vi.mocked(prisma.user.create).mock.calls[0][0] as { data: Record<string, unknown> };
      expect(call.data.senhaHash).toBeDefined();
      expect(call.data.senhaHash).not.toBe('senha12345');
      expect(call.data).not.toHaveProperty('senha');
      expect(await bcrypt.compare('senha12345', call.data.senhaHash as string)).toBe(true);
    });
  });

  describe('verifyPassword (regra 1)', () => {
    it('retorna false sem comparar quando a conta não tem senha local (conta Google)', async () => {
      expect(await UserModel.verifyPassword('qualquer', null)).toBe(false);
    });

    it('retorna true para a senha correta e false para a senha errada', async () => {
      const hash = await bcrypt.hash('senha-correta', 10);
      expect(await UserModel.verifyPassword('senha-correta', hash)).toBe(true);
      expect(await UserModel.verifyPassword('senha-errada', hash)).toBe(false);
    });
  });

  describe('findOrCreateFromGoogle (regra 3: vincula por e-mail; regra 6: google_id preenchido, senha_hash nulo)', () => {
    it('retorna o usuário direto quando já existe uma conta vinculada a esse googleId', async () => {
      const existing = { id: 'user-1', googleId: 'g-1' };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(existing as never);

      const result = await UserModel.findOrCreateFromGoogle('g-1', 'Ana', 'ana@example.com');

      expect(result).toBe(existing);
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('vincula (não duplica) a conta local existente pelo e-mail, normalizado para minúsculas', async () => {
      const localUser = { id: 'user-2', email: 'ana@example.com', googleId: null };
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null) // busca por googleId: não encontrou
        .mockResolvedValueOnce(localUser as never); // busca por email: encontrou a conta local

      // E-mail do Google vem em capitalização diferente da conta local já cadastrada —
      // sem a normalização, isso criaria uma conta duplicada em vez de vincular (regra 3).
      await UserModel.findOrCreateFromGoogle('g-2', 'Ana', 'Ana@Example.com');

      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, { where: { googleId: 'g-2' } });
      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, { where: { email: 'ana@example.com' } });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { googleId: 'g-2' },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('cria uma conta nova (google_id preenchido, sem senha local) quando não há conta por googleId nem por e-mail', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: 'user-3' } as never);

      await UserModel.findOrCreateFromGoogle('g-3', 'Bruno', 'Bruno@Example.com');

      const call = vi.mocked(prisma.user.create).mock.calls[0][0] as { data: Record<string, unknown> };
      expect(call.data).toEqual({ nome: 'Bruno', email: 'bruno@example.com', googleId: 'g-3' });
      expect(call.data).not.toHaveProperty('senhaHash');
    });
  });
});
