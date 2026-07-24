import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { ReportService } from '../../src/services/ReportService';
import { loginAgent, TEST_USER } from '../helpers/auth';

vi.mock('../../src/models/UserModel');
vi.mock('../../src/services/ReportService');

const relatorioVazio = {
  diasRegistrados: 0,
  diasNoPeriodo: 31,
  totalMin: 0,
  totalFormatado: '0min',
  distribuicao: [],
};

describe('Rotas de relatórios', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(ReportService.buildValueSeries).mockResolvedValue([]);
  });

  it('GET /reports usa o período padrão (mês corrente) quando nenhum filtro é informado (regra 8)', async () => {
    const periodoPadrao = {
      inicio: new Date('2026-07-01T00:00:00.000Z'),
      fim: new Date('2026-07-31T00:00:00.000Z'),
    };
    vi.mocked(ReportService.defaultPeriod).mockReturnValue(periodoPadrao);
    vi.mocked(ReportService.build).mockResolvedValue(relatorioVazio);

    const agent = await loginAgent(app);
    const res = await agent.get('/reports');
    expect(res.status).toBe(200);
    expect(ReportService.defaultPeriod).toHaveBeenCalled();
    expect(ReportService.build).toHaveBeenCalledWith(TEST_USER.id, periodoPadrao);
  });

  it('GET /reports?inicio=&fim= usa o período informado pelo usuário', async () => {
    vi.mocked(ReportService.build).mockResolvedValue(relatorioVazio);

    const agent = await loginAgent(app);
    const res = await agent.get('/reports').query({ inicio: '2026-01-01', fim: '2026-01-31' });
    expect(res.status).toBe(200);
    expect(ReportService.defaultPeriod).not.toHaveBeenCalled();
    expect(ReportService.build).toHaveBeenCalledWith(TEST_USER.id, {
      inicio: new Date('2026-01-01T00:00:00.000Z'),
      fim: new Date('2026-01-31T00:00:00.000Z'),
    });
  });

  it('GET /reports exibe os totais retornados pelo serviço', async () => {
    vi.mocked(ReportService.defaultPeriod).mockReturnValue({
      inicio: new Date('2026-07-01T00:00:00.000Z'),
      fim: new Date('2026-07-31T00:00:00.000Z'),
    });
    vi.mocked(ReportService.build).mockResolvedValue({
      diasRegistrados: 5,
      diasNoPeriodo: 31,
      totalMin: 300,
      totalFormatado: '5h',
      distribuicao: [{ categoria: 'Trabalho', cor: '#2563EB', totalMin: 300, totalFormatado: '5h', percentual: 100 }],
    });

    const agent = await loginAgent(app);
    const res = await agent.get('/reports');
    expect(res.status).toBe(200);
    expect(res.text).toContain('5h');
    expect(res.text).toContain('Trabalho');
  });

  it('GET /reports exibe o gráfico de linha de valor por categoria quando há série (regra 9)', async () => {
    vi.mocked(ReportService.defaultPeriod).mockReturnValue({
      inicio: new Date('2026-07-01T00:00:00.000Z'),
      fim: new Date('2026-07-31T00:00:00.000Z'),
    });
    vi.mocked(ReportService.build).mockResolvedValue(relatorioVazio);
    vi.mocked(ReportService.buildValueSeries).mockResolvedValue([
      {
        categoryId: 'cat-1',
        categoria: 'Deslocamento',
        cor: '#2563EB',
        valorLabel: 'Custo (R$)',
        pontos: [
          { atividadeId: 'a1', nome: 'Ônibus', horaInicio: new Date('2026-07-01T12:00:00.000Z'), valor: 4.4 },
          { atividadeId: 'a2', nome: 'Metrô', horaInicio: new Date('2026-07-02T12:00:00.000Z'), valor: 5.5 },
        ],
      },
    ]);

    const agent = await loginAgent(app);
    const res = await agent.get('/reports');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Deslocamento');
    expect(res.text).toContain('Custo (R$)');
    expect(res.text).toContain('<polyline');
    expect(res.text).toContain('<circle');
  });

  it('GET /reports exibe mensagem vazia quando não há categoria com valor no período', async () => {
    vi.mocked(ReportService.defaultPeriod).mockReturnValue({
      inicio: new Date('2026-07-01T00:00:00.000Z'),
      fim: new Date('2026-07-31T00:00:00.000Z'),
    });
    vi.mocked(ReportService.build).mockResolvedValue(relatorioVazio);

    const agent = await loginAgent(app);
    const res = await agent.get('/reports');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Nenhuma categoria com valor registrado no período selecionado.');
  });
});
