import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database', () => ({
  prisma: {
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/config/database';
import { PasswordResetTokenModel } from '../../src/models/PasswordResetTokenModel';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('PasswordResetTokenModel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('persiste apenas o hash SHA-256 do token, nunca o valor bruto', async () => {
      vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 } as never);
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({ id: 'token-1' } as never);

      const rawToken = await PasswordResetTokenModel.create('user-1');

      const call = vi.mocked(prisma.passwordResetToken.create).mock.calls[0][0] as {
        data: { userId: string; tokenHash: string; expiresAt: Date };
      };
      expect(call.data.userId).toBe('user-1');
      expect(call.data.tokenHash).toBe(sha256(rawToken));
      expect(call.data.tokenHash).not.toBe(rawToken);
      expect(call.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('invalida tokens anteriores não usados do mesmo usuário antes de criar um novo', async () => {
      vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({ id: 'token-2' } as never);

      await PasswordResetTokenModel.create('user-1');

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', usedAt: null },
      });
    });
  });

  describe('findValidByRawToken', () => {
    it('retorna null quando o token não existe', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null);
      expect(await PasswordResetTokenModel.findValidByRawToken('token-inexistente')).toBeNull();
    });

    it('retorna null quando o token já foi usado', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: 'token-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60),
      } as never);
      expect(await PasswordResetTokenModel.findValidByRawToken('token-usado')).toBeNull();
    });

    it('retorna null quando o token está expirado', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: 'token-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      } as never);
      expect(await PasswordResetTokenModel.findValidByRawToken('token-expirado')).toBeNull();
    });

    it('retorna o token quando válido (existe, não usado, não expirado)', async () => {
      const token = { id: 'token-1', usedAt: null, expiresAt: new Date(Date.now() + 1000 * 60) };
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(token as never);
      expect(await PasswordResetTokenModel.findValidByRawToken('token-valido')).toBe(token);
    });
  });

  describe('markUsed', () => {
    it('marca o token como usado', async () => {
      vi.mocked(prisma.passwordResetToken.update).mockResolvedValue({} as never);
      await PasswordResetTokenModel.markUsed('token-1');
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { usedAt: expect.any(Date) },
      });
    });
  });
});
