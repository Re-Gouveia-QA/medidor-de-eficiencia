import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database', () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    activity: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/config/database';
import { CategoryModel } from '../../src/models/CategoryModel';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const CATEGORY_ID = 'cat-1';

describe('CategoryModel (BaseModel — escopo por usuário, RF12)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('listByUser inclui userId no where', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([]);
    await CategoryModel.listByUser(USER_ID);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
  });

  it('findById funde id e userId no where — nunca busca só por id', async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValue(null);
    await CategoryModel.findById(CATEGORY_ID, USER_ID);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
    });
  });

  it('update escopa o updateMany por userId — não permite atualizar categoria de outro usuário', async () => {
    vi.mocked(prisma.category.updateMany).mockResolvedValue({ count: 0 });
    await CategoryModel.update(CATEGORY_ID, USER_ID, { nome: 'Trabalho', cor: '#2563EB' });
    const call = vi.mocked(prisma.category.updateMany).mock.calls[0][0];
    expect(call.where).toEqual({ id: CATEGORY_ID, userId: USER_ID });
  });

  it('destroy verifica propriedade antes de excluir e não exclui se o dono for outro usuário', async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValue(null);
    const result = await CategoryModel.destroy(CATEGORY_ID, OTHER_USER_ID);
    expect(result).toBeNull();
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: OTHER_USER_ID },
      select: { id: true },
    });
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('destroy exclui quando a categoria pertence ao usuário', async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValue({ id: CATEGORY_ID } as never);
    vi.mocked(prisma.category.delete).mockResolvedValue({ id: CATEGORY_ID } as never);
    await CategoryModel.destroy(CATEGORY_ID, USER_ID);
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: CATEGORY_ID } });
  });
});
