import { Request, Response } from 'express';
import { ReportService } from '../services/ReportService';

export const ReportController = {
  async index(req: Request, res: Response) {
    const { inicio, fim } = req.query as Record<string, string | undefined>;

    const periodo =
      inicio && fim
        ? { inicio: new Date(`${inicio}T00:00:00.000Z`), fim: new Date(`${fim}T00:00:00.000Z`) }
        : ReportService.defaultPeriod(); // regra 8: padrão = mês corrente

    const relatorio = await ReportService.build(req.currentUser!.id, periodo);

    res.render('reports/index', {
      title: 'Relatórios',
      relatorio,
      filtros: {
        inicio: periodo.inicio.toISOString().slice(0, 10),
        fim: periodo.fim.toISOString().slice(0, 10),
      },
    });
  },
};
