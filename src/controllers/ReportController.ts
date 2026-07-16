import { Request, Response } from 'express';
import { ReportPeriod, ReportService } from '../services/ReportService';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string): Date | null {
  if (!dateRegex.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const ReportController = {
  async index(req: Request, res: Response) {
    const { inicio, fim } = req.query as Record<string, string | undefined>;

    let periodo: ReportPeriod;
    const inicioDate = inicio ? parseDateParam(inicio) : null;
    const fimDate = fim ? parseDateParam(fim) : null;

    if (inicio && fim && inicioDate && fimDate && inicioDate.getTime() <= fimDate.getTime()) {
      periodo = { inicio: inicioDate, fim: fimDate };
    } else if (inicio || fim) {
      req.flash('error', 'Período inválido: a data inicial deve ser anterior ou igual à final. Exibindo o mês corrente.');
      periodo = ReportService.defaultPeriod(); // regra 8: padrão = mês corrente
    } else {
      periodo = ReportService.defaultPeriod();
    }

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
