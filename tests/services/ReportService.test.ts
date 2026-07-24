import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database', () => ({
  prisma: {
    activity: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/config/database';
import { ReportService } from '../../src/services/ReportService';

const USER_ID = 'user-1';
const PERIODO = { inicio: new Date('2026-07-01T00:00:00.000Z'), fim: new Date('2026-07-31T00:00:00.000Z') };

describe('ReportService (BaseModel — escopo por usuário, RF12)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('build inclui userId no where junto com o filtro de período', async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
    await ReportService.build(USER_ID, PERIODO);
    const call = vi.mocked(prisma.activity.findMany).mock.calls[0][0];
    expect(call.where).toEqual({
      userId: USER_ID,
      data: { gte: PERIODO.inicio, lte: PERIODO.fim },
      horaFim: { not: null },
    });
  });

  describe('buildValueSeries (regra 9 — valor x tempo por categoria)', () => {
    it('inclui userId, filtro de período, valor não nulo e possuiValor no where, e ordena por categoria+horaInicio', async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      await ReportService.buildValueSeries(USER_ID, PERIODO);
      const call = vi.mocked(prisma.activity.findMany).mock.calls[0][0];
      expect(call.where).toEqual({
        userId: USER_ID,
        data: { gte: PERIODO.inicio, lte: PERIODO.fim },
        valor: { not: null },
        category: { possuiValor: true },
      });
      expect(call.orderBy).toEqual([{ categoryId: 'asc' }, { horaInicio: 'asc' }]);
    });

    it('agrupa pontos por categoria (na ordem em que o banco retorna) e ordena as categorias por nome', async () => {
      const decimal = (n: number) => ({ toNumber: () => n });
      // Já retornado na ordem que o orderBy do Prisma garantiria: categoryId asc, horaInicio asc.
      vi.mocked(prisma.activity.findMany).mockResolvedValue([
        {
          id: 'a3', nome: 'Depósito', horaInicio: new Date('2026-07-02T12:00:00.000Z'),
          valor: decimal(100), categoryId: 'cat-poupanca',
          category: { nome: 'Poupança', cor: '#22C55E', valorLabel: null },
        },
        {
          id: 'a1', nome: 'Metrô', horaInicio: new Date('2026-07-01T08:00:00.000Z'),
          valor: decimal(4.4), categoryId: 'cat-transporte',
          category: { nome: 'Transporte', cor: '#3B82F6', valorLabel: 'Custo (R$)' },
        },
        {
          id: 'a2', nome: 'Ônibus', horaInicio: new Date('2026-07-05T10:00:00.000Z'),
          valor: decimal(5.5), categoryId: 'cat-transporte',
          category: { nome: 'Transporte', cor: '#3B82F6', valorLabel: 'Custo (R$)' },
        },
      ] as never);

      const series = await ReportService.buildValueSeries(USER_ID, PERIODO);

      expect(series).toHaveLength(2);
      expect(series[0]).toMatchObject({ categoria: 'Poupança', valorLabel: 'Valor' });
      expect(series[0].pontos).toEqual([{ atividadeId: 'a3', nome: 'Depósito', horaInicio: new Date('2026-07-02T12:00:00.000Z'), valor: 100 }]);
      expect(series[1].categoria).toBe('Transporte');
      expect(series[1].pontos.map((p) => p.atividadeId)).toEqual(['a1', 'a2']);
    });
  });
});
