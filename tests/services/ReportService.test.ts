import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database', () => ({
  prisma: {
    activity: {
      findMany: vi.fn(),
    },
    category: {
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

  it('build usa atividades pré-buscadas quando fornecidas, sem consultar activity.findMany de novo', async () => {
    const atividadesPreBuscadas = [
      { data: new Date('2026-07-01T00:00:00.000Z'), duracaoMin: 60, categoryId: 'cat-1', category: { nome: 'Trabalho', cor: '#2563EB' } },
    ] as never;

    const relatorio = await ReportService.build(USER_ID, PERIODO, atividadesPreBuscadas);

    expect(prisma.activity.findMany).not.toHaveBeenCalled();
    expect(relatorio.totalMin).toBe(60);
    expect(relatorio.distribuicao).toEqual([
      { categoria: 'Trabalho', cor: '#2563EB', totalMin: 60, totalFormatado: '1h', percentual: 100 },
    ]);
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

  describe('buildGoals (meta diária por categoria)', () => {
    describe('Dado que nenhuma categoria do usuário tem meta diária definida', () => {
      it('Quando buildGoals é chamado, então retorna lista vazia sem consultar atividades', async () => {
        vi.mocked(prisma.category.findMany).mockResolvedValue([]);

        const progresso = await ReportService.buildGoals(USER_ID, PERIODO);

        expect(progresso).toEqual([]);
        expect(prisma.category.findMany).toHaveBeenCalledWith({
          where: { userId: USER_ID, tempoDesejadoMin: { not: null } },
          select: { id: true, nome: true, cor: true, tempoDesejadoMin: true },
          orderBy: { nome: 'asc' },
        });
        expect(prisma.activity.findMany).not.toHaveBeenCalled();
      });
    });

    describe('Dado categorias do usuário com meta diária definida', () => {
      it('Quando buildGoals é chamado sem atividades pré-buscadas, então busca as atividades do período (mesma consulta usada por build) e filtra por categoria em memória', async () => {
        vi.mocked(prisma.category.findMany).mockResolvedValue([
          { id: 'cat-estudo', nome: 'Estudo', cor: '#0D9488', tempoDesejadoMin: 60 },
        ] as never);
        vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

        await ReportService.buildGoals(USER_ID, PERIODO);

        expect(prisma.activity.findMany).toHaveBeenCalledWith({
          where: {
            userId: USER_ID,
            data: { gte: PERIODO.inicio, lte: PERIODO.fim },
            horaFim: { not: null },
          },
          select: { data: true, duracaoMin: true, categoryId: true, category: { select: { nome: true, cor: true } } },
        });
      });

      it('Quando atividades já buscadas são passadas, então não consulta activity.findMany de novo', async () => {
        vi.mocked(prisma.category.findMany).mockResolvedValue([
          { id: 'cat-estudo', nome: 'Estudo', cor: '#0D9488', tempoDesejadoMin: 60 },
        ] as never);
        const atividadesPreBuscadas = [
          { data: new Date('2026-07-01T00:00:00.000Z'), duracaoMin: 90, categoryId: 'cat-estudo', category: { nome: 'Estudo', cor: '#0D9488' } },
          // Atividade de outra categoria (sem meta) — não deve contar pro progresso de "Estudo".
          { data: new Date('2026-07-01T00:00:00.000Z'), duracaoMin: 200, categoryId: 'cat-sem-meta', category: { nome: 'Outra', cor: '#000' } },
        ] as never;

        const progresso = await ReportService.buildGoals(USER_ID, PERIODO, atividadesPreBuscadas);

        expect(prisma.activity.findMany).not.toHaveBeenCalled();
        expect(progresso).toEqual([
          {
            categoryId: 'cat-estudo',
            categoria: 'Estudo',
            cor: '#0D9488',
            metaMin: 60,
            metaFormatada: '1h',
            diasComMeta: 1,
            diasNoPeriodo: 31,
            percentual: Math.round((1 / 31) * 100),
          },
        ]);
      });

      it('Quando a duração diária somada atinge a meta em alguns dias e não em outros, então conta só os dias que bateram a meta', async () => {
        vi.mocked(prisma.category.findMany).mockResolvedValue([
          { id: 'cat-estudo', nome: 'Estudo', cor: '#0D9488', tempoDesejadoMin: 60 },
        ] as never);
        vi.mocked(prisma.activity.findMany).mockResolvedValue([
          // 01/07: 40 + 50 = 90min, bate a meta de 60min.
          { data: new Date('2026-07-01T00:00:00.000Z'), duracaoMin: 40, categoryId: 'cat-estudo' },
          { data: new Date('2026-07-01T00:00:00.000Z'), duracaoMin: 50, categoryId: 'cat-estudo' },
          // 02/07: 30min, não bate a meta de 60min.
          { data: new Date('2026-07-02T00:00:00.000Z'), duracaoMin: 30, categoryId: 'cat-estudo' },
        ] as never);

        const progresso = await ReportService.buildGoals(USER_ID, PERIODO);

        expect(progresso).toEqual([
          {
            categoryId: 'cat-estudo',
            categoria: 'Estudo',
            cor: '#0D9488',
            metaMin: 60,
            metaFormatada: '1h',
            diasComMeta: 1,
            diasNoPeriodo: 31,
            percentual: Math.round((1 / 31) * 100),
          },
        ]);
      });

      it('Quando a categoria não tem nenhuma atividade no período, então aparece com diasComMeta 0 (não some da lista)', async () => {
        vi.mocked(prisma.category.findMany).mockResolvedValue([
          { id: 'cat-leitura', nome: 'Leitura', cor: '#16A34A', tempoDesejadoMin: 120 },
        ] as never);
        vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

        const progresso = await ReportService.buildGoals(USER_ID, PERIODO);

        expect(progresso).toEqual([
          {
            categoryId: 'cat-leitura',
            categoria: 'Leitura',
            cor: '#16A34A',
            metaMin: 120,
            metaFormatada: '2h',
            diasComMeta: 0,
            diasNoPeriodo: 31,
            percentual: 0,
          },
        ]);
      });

      it('Quando há mais de uma categoria com meta, então ordena o resultado por percentual decrescente', async () => {
        vi.mocked(prisma.category.findMany).mockResolvedValue([
          { id: 'cat-baixo', nome: 'Baixo cumprimento', cor: '#DC2626', tempoDesejadoMin: 60 },
          { id: 'cat-alto', nome: 'Alto cumprimento', cor: '#16A34A', tempoDesejadoMin: 60 },
        ] as never);
        vi.mocked(prisma.activity.findMany).mockResolvedValue([
          { data: new Date('2026-07-01T00:00:00.000Z'), duracaoMin: 60, categoryId: 'cat-baixo' },
          { data: new Date('2026-07-01T00:00:00.000Z'), duracaoMin: 60, categoryId: 'cat-alto' },
          { data: new Date('2026-07-02T00:00:00.000Z'), duracaoMin: 60, categoryId: 'cat-alto' },
        ] as never);

        const progresso = await ReportService.buildGoals(USER_ID, PERIODO);

        expect(progresso.map((p) => p.categoryId)).toEqual(['cat-alto', 'cat-baixo']);
      });
    });
  });
});
