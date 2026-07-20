import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database', () => ({
  prisma: {
    activity: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/config/database';
import { ActivityModel } from '../../src/models/ActivityModel';

const USER_ID = 'user-1';
const ACTIVITY_ID = 'act-1';

const INPUT = {
  nome: 'Leitura',
  categoryId: 'cat-1',
  data: '2026-07-15',
  horaInicio: '08:00',
  horaFim: '09:00',
  timezone: 'UTC',
};

describe('ActivityModel (BaseModel — escopo por usuário, RF12)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('listByUser inclui userId no where mesmo sem filtros', async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
    await ActivityModel.listByUser(USER_ID);
    const call = vi.mocked(prisma.activity.findMany).mock.calls[0][0];
    expect(call.where).toMatchObject({ userId: USER_ID });
  });

  it('listByUser mantém userId no where junto com os filtros de categoria e período', async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
    await ActivityModel.listByUser(USER_ID, { categoryId: 'cat-1', inicio: '2026-07-01', fim: '2026-07-31' });
    const call = vi.mocked(prisma.activity.findMany).mock.calls[0][0];
    expect(call.where).toMatchObject({ userId: USER_ID, categoryId: 'cat-1' });
    expect(call.where.data).toBeDefined();
  });

  it('findById funde id e userId no where', async () => {
    vi.mocked(prisma.activity.findFirst).mockResolvedValue(null);
    await ActivityModel.findById(ACTIVITY_ID, USER_ID);
    expect(prisma.activity.findFirst).toHaveBeenCalledWith({
      where: { id: ACTIVITY_ID, userId: USER_ID },
    });
  });

  it('update escopa o updateMany por userId — não permite atualizar atividade de outro usuário', async () => {
    vi.mocked(prisma.activity.updateMany).mockResolvedValue({ count: 0 });
    await ActivityModel.update(ACTIVITY_ID, USER_ID, INPUT);
    const call = vi.mocked(prisma.activity.updateMany).mock.calls[0][0];
    expect(call.where).toEqual({ id: ACTIVITY_ID, userId: USER_ID });
  });

  it('destroy escopa o deleteMany por userId — não permite excluir atividade de outro usuário', async () => {
    vi.mocked(prisma.activity.deleteMany).mockResolvedValue({ count: 0 });
    await ActivityModel.destroy(ACTIVITY_ID, USER_ID);
    expect(prisma.activity.deleteMany).toHaveBeenCalledWith({
      where: { id: ACTIVITY_ID, userId: USER_ID },
    });
  });
});
