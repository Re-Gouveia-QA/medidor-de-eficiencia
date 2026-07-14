import { prisma } from '../config/database';
import { formatMinutes } from '../utils/time';

export interface ReportPeriod {
  inicio: Date;
  fim: Date;
}

export interface CategoryDistribution {
  categoria: string;
  cor: string;
  totalMin: number;
  totalFormatado: string;
  percentual: number;
}

export interface EfficiencyReport {
  diasRegistrados: number;
  diasNoPeriodo: number;
  totalMin: number;
  totalFormatado: string;
  distribuicao: CategoryDistribution[];
}

/**
 * Service de relatórios (RF09/RF10) — mantém o ReportController fino.
 * Regra 9: "dia registrado" = dia com ao menos uma atividade.
 * Regra 8: apenas dados do usuário autenticado no período.
 */
export const ReportService = {
  /** Período padrão: mês corrente (regra 8). */
  defaultPeriod(now = new Date()): ReportPeriod {
    const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const fim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return { inicio, fim };
  },

  async build(userId: string, { inicio, fim }: ReportPeriod): Promise<EfficiencyReport> {
    const atividades = await prisma.activity.findMany({
      where: { userId, data: { gte: inicio, lte: fim } },
      select: { data: true, duracaoMin: true, category: { select: { nome: true, cor: true } } },
    });

    const diasComRegistro = new Set(atividades.map((a) => a.data.toISOString().slice(0, 10)));
    const diasNoPeriodo = Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
    const totalMin = atividades.reduce((acc, a) => acc + a.duracaoMin, 0);

    const porCategoria = new Map<string, { cor: string; totalMin: number }>();
    for (const a of atividades) {
      const atual = porCategoria.get(a.category.nome) ?? { cor: a.category.cor, totalMin: 0 };
      atual.totalMin += a.duracaoMin;
      porCategoria.set(a.category.nome, atual);
    }

    const distribuicao: CategoryDistribution[] = [...porCategoria.entries()]
      .map(([categoria, { cor, totalMin: catMin }]) => ({
        categoria,
        cor,
        totalMin: catMin,
        totalFormatado: formatMinutes(catMin),
        percentual: totalMin > 0 ? Math.round((catMin / totalMin) * 100) : 0,
      }))
      .sort((a, b) => b.totalMin - a.totalMin);

    return {
      diasRegistrados: diasComRegistro.size,
      diasNoPeriodo,
      totalMin,
      totalFormatado: formatMinutes(totalMin),
      distribuicao,
    };
  },
};
