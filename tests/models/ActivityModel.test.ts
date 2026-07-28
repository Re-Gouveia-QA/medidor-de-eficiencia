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

  it('findInProgress busca por userId + horaFim nulo', async () => {
    vi.mocked(prisma.activity.findFirst).mockResolvedValue(null);
    await ActivityModel.findInProgress(USER_ID);
    const call = vi.mocked(prisma.activity.findFirst).mock.calls[0][0];
    expect(call.where).toEqual({ horaFim: null, userId: USER_ID });
  });

  it('startInProgress cria a atividade sem horaFim/duracaoMin quando não há uma em andamento', async () => {
    vi.mocked(prisma.activity.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.activity.create).mockResolvedValue({} as never);

    await ActivityModel.startInProgress(USER_ID, { nome: 'Reunião', categoryId: 'cat-1' });

    const call = vi.mocked(prisma.activity.create).mock.calls[0][0];
    expect(call.data).toMatchObject({ userId: USER_ID, categoryId: 'cat-1', nome: 'Reunião', horaFim: null, duracaoMin: null });
    expect(call.data.horaInicio).toBeInstanceOf(Date);
  });

  it('startInProgress lança erro e não cria quando já existe uma atividade em andamento', async () => {
    vi.mocked(prisma.activity.findFirst).mockResolvedValue({ id: 'existente' } as never);

    await expect(ActivityModel.startInProgress(USER_ID, { nome: 'Reunião', categoryId: 'cat-1' })).rejects.toThrow(
      /já tem uma atividade em andamento/,
    );
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it('finish calcula duracaoMin e atualiza horaFim quando a atividade está em andamento', async () => {
    const horaInicio = new Date(Date.now() - 30 * 60_000); // 30min atrás
    vi.mocked(prisma.activity.findFirst).mockResolvedValue({
      id: ACTIVITY_ID,
      horaInicio,
      category: { possuiValor: false, valorPadrao: null },
    } as never);
    vi.mocked(prisma.activity.updateMany).mockResolvedValue({ count: 1 });

    const result = await ActivityModel.finish(ACTIVITY_ID, USER_ID);

    const findCall = vi.mocked(prisma.activity.findFirst).mock.calls[0][0];
    expect(findCall.where).toEqual({ id: ACTIVITY_ID, horaFim: null, userId: USER_ID });
    const updateCall = vi.mocked(prisma.activity.updateMany).mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: ACTIVITY_ID, horaFim: null, userId: USER_ID });
    expect(updateCall.data.duracaoMin).toBeGreaterThanOrEqual(29);
    expect(updateCall.data.horaFim).toBeInstanceOf(Date);
    // sem "extra" (finalizar rápido) — descricao/valor continuam nulos, comportamento inalterado
    expect(updateCall.data.descricao).toBeNull();
    expect(updateCall.data.valor).toBeNull();
    expect(result).toEqual({ count: 1 });
  });

  it('finish retorna count 0 sem chamar updateMany quando a atividade não existe ou já foi finalizada', async () => {
    vi.mocked(prisma.activity.findFirst).mockResolvedValue(null);

    const result = await ActivityModel.finish(ACTIVITY_ID, USER_ID);

    expect(result).toEqual({ count: 0 });
    expect(prisma.activity.updateMany).not.toHaveBeenCalled();
  });

  it('finish (com detalhes) grava descricao/valor quando informados', async () => {
    const horaInicio = new Date(Date.now() - 30 * 60_000);
    vi.mocked(prisma.activity.findFirst).mockResolvedValue({
      id: ACTIVITY_ID,
      horaInicio,
      category: { possuiValor: true, valorPadrao: { toNumber: () => 10 } },
    } as never);
    vi.mocked(prisma.activity.updateMany).mockResolvedValue({ count: 1 });

    await ActivityModel.finish(ACTIVITY_ID, USER_ID, { descricao: 'Reunião de alinhamento', valor: 50 });

    const updateCall = vi.mocked(prisma.activity.updateMany).mock.calls[0][0];
    expect(updateCall.data.descricao).toBe('Reunião de alinhamento');
    expect(updateCall.data.valor).toBe(50);
  });

  it('finish (com detalhes) aplica o valorPadrao da categoria quando valor não é informado (regra 9)', async () => {
    const horaInicio = new Date(Date.now() - 30 * 60_000);
    vi.mocked(prisma.activity.findFirst).mockResolvedValue({
      id: ACTIVITY_ID,
      horaInicio,
      category: { possuiValor: true, valorPadrao: { toNumber: () => 30 } },
    } as never);
    vi.mocked(prisma.activity.updateMany).mockResolvedValue({ count: 1 });

    await ActivityModel.finish(ACTIVITY_ID, USER_ID, { descricao: 'Sem valor informado' });

    const updateCall = vi.mocked(prisma.activity.updateMany).mock.calls[0][0];
    expect(updateCall.data.valor).toBe(30);
  });

  it('finish (com detalhes) não aplica valorPadrao quando a categoria não possui valor', async () => {
    const horaInicio = new Date(Date.now() - 30 * 60_000);
    vi.mocked(prisma.activity.findFirst).mockResolvedValue({
      id: ACTIVITY_ID,
      horaInicio,
      category: { possuiValor: false, valorPadrao: { toNumber: () => 30 } },
    } as never);
    vi.mocked(prisma.activity.updateMany).mockResolvedValue({ count: 1 });

    await ActivityModel.finish(ACTIVITY_ID, USER_ID, {});

    const updateCall = vi.mocked(prisma.activity.updateMany).mock.calls[0][0];
    expect(updateCall.data.valor).toBeNull();
  });
});
