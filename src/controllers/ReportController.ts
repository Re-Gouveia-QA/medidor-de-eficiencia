import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ReportPeriod, ReportService } from '../services/ReportService';
import { formatNumber } from '../utils/format';
import { formatDateShortInZone, formatTimeInZone } from '../utils/time';
import { buildLineChartGeometry } from '../utils/chart';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string): Date | null {
  if (!dateRegex.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Estende BaseController por uniformidade de hierarquia com os demais
 * controllers, ainda que esta rota não use parseOrRedirect: os filtros de
 * período vêm de query string com parsing próprio (parseDateParam), não de
 * um schema Zod de body.
 */
class ReportControllerImpl extends BaseController {
  index = async (req: Request, res: Response) => {
    const { inicio, fim } = req.query as Record<string, string | undefined>;

    let periodo: ReportPeriod;
    const inicioDate = inicio ? parseDateParam(inicio) : null;
    const fimDate = fim ? parseDateParam(fim) : null;

    if (inicio && fim && inicioDate && fimDate && inicioDate.getTime() <= fimDate.getTime()) {
      periodo = { inicio: inicioDate, fim: fimDate };
    } else if (inicio || fim) {
      req.flash('error', res.locals.t('flash.report.invalidPeriod'));
      periodo = ReportService.defaultPeriod(); // regra 8: padrão = mês corrente
    } else {
      periodo = ReportService.defaultPeriod();
    }

    const [relatorio, seriesPorCategoria] = await Promise.all([
      ReportService.build(req.currentUser!.id, periodo),
      ReportService.buildValueSeries(req.currentUser!.id, periodo),
    ]);

    // Eixo X proporcional ao instante real (horaInicio), não ao índice do ponto — mais fiel ao
    // "Tempo" do título do gráfico do que um espaçamento uniforme por atividade.
    const seriesValor = seriesPorCategoria.map((serie) => ({
      ...serie,
      geometry: buildLineChartGeometry(serie.pontos.map((p) => ({ x: p.horaInicio.getTime(), y: p.valor }))),
    }));

    res.render('reports/index', {
      title: res.locals.t('reports.index.pageTitle'),
      relatorio,
      seriesValor,
      formatNumber,
      formatTime: (d: Date) => formatTimeInZone(d, req.userTimezone),
      formatDate: (d: Date) => formatDateShortInZone(d, req.userTimezone),
      filtros: {
        inicio: periodo.inicio.toISOString().slice(0, 10),
        fim: periodo.fim.toISOString().slice(0, 10),
      },
    });
  };
}

export const ReportController = new ReportControllerImpl();
