import { BaseModel } from '../models/BaseModel';
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

export interface ValueSeriesPoint {
  atividadeId: string;
  nome: string;
  horaInicio: Date;
  valor: number;
}

export interface CategoryValueSeries {
  categoryId: string;
  categoria: string;
  cor: string;
  valorLabel: string;
  pontos: ValueSeriesPoint[];
}

export interface CategoryGoalProgress {
  categoryId: string;
  categoria: string;
  cor: string;
  metaMin: number;
  metaFormatada: string;
  diasComMeta: number;
  diasNoPeriodo: number;
  percentual: number;
}

/**
 * Service de relatórios (RF09/RF10) — mantém o ReportController fino.
 * Regra 9: "dia registrado" = dia com ao menos uma atividade.
 * Regra 8: apenas dados do usuário autenticado no período.
 */
class ReportServiceImpl extends BaseModel {
  /** Período padrão: mês corrente (regra 8). */
  defaultPeriod(now = new Date()): ReportPeriod {
    const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const fim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return { inicio, fim };
  }

  async build(userId: string, { inicio, fim }: ReportPeriod): Promise<EfficiencyReport> {
    // horaFim: { not: null } exclui atividades ainda em andamento — duração desconhecida até
    // finalizar, não deveriam contar nem pra "dia registrado" nem pros totais/distribuição.
    const atividades = await this.db.activity.findMany({
      where: this.scopeToUser(userId, { data: { gte: inicio, lte: fim }, horaFim: { not: null } }),
      select: { data: true, duracaoMin: true, category: { select: { nome: true, cor: true } } },
    });

    const diasComRegistro = new Set(atividades.map((a) => a.data.toISOString().slice(0, 10)));
    const diasNoPeriodo = Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
    // `?? 0` é só uma guarda de tipo — o filtro acima já garante duracaoMin não-nulo em runtime.
    const totalMin = atividades.reduce((acc, a) => acc + (a.duracaoMin ?? 0), 0);

    const porCategoria = new Map<string, { cor: string; totalMin: number }>();
    for (const a of atividades) {
      const atual = porCategoria.get(a.category.nome) ?? { cor: a.category.cor, totalMin: 0 };
      atual.totalMin += a.duracaoMin ?? 0;
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
  }

  /** Regra 9: uma série (valor x tempo) por categoria com possuiValor=true — um ponto por
   * atividade que tenha `valor` preenchido (valorPadrao é só sugestão de formulário, nunca é
   * gravado automaticamente pelo ActivityModel). */
  async buildValueSeries(userId: string, { inicio, fim }: ReportPeriod): Promise<CategoryValueSeries[]> {
    const atividades = await this.db.activity.findMany({
      where: this.scopeToUser(userId, {
        data: { gte: inicio, lte: fim },
        valor: { not: null },
        category: { possuiValor: true },
      }),
      select: {
        id: true,
        nome: true,
        horaInicio: true,
        valor: true,
        categoryId: true,
        category: { select: { nome: true, cor: true, valorLabel: true } },
      },
      orderBy: [{ categoryId: 'asc' }, { horaInicio: 'asc' }],
    });

    const porCategoria = new Map<string, CategoryValueSeries>();
    for (const a of atividades) {
      const atual = porCategoria.get(a.categoryId) ?? {
        categoryId: a.categoryId,
        categoria: a.category.nome,
        cor: a.category.cor,
        valorLabel: a.category.valorLabel || 'Valor',
        pontos: [],
      };
      // valor não é nulo aqui (filtrado no where acima); toNumber() é seguro.
      atual.pontos.push({ atividadeId: a.id, nome: a.nome, horaInicio: a.horaInicio, valor: a.valor!.toNumber() });
      porCategoria.set(a.categoryId, atual);
    }

    return [...porCategoria.values()].sort((a, b) => a.categoria.localeCompare(b.categoria));
  }

  /** Meta diária opcional (`tempoDesejadoMin`) — quantos dias do período tiveram, para a
   * categoria, duração total ≥ meta. Denominador é `diasNoPeriodo` (mesma base do card "dias
   * registrados" de `build`), não os dias em que a categoria teve atividade, pra manter a leitura
   * consistente com o resto da página. */
  async buildGoals(userId: string, { inicio, fim }: ReportPeriod): Promise<CategoryGoalProgress[]> {
    const categorias = await this.db.category.findMany({
      where: this.scopeToUser(userId, { tempoDesejadoMin: { not: null } }),
      select: { id: true, nome: true, cor: true, tempoDesejadoMin: true },
    });
    if (categorias.length === 0) return [];

    const diasNoPeriodo = Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;

    const atividades = await this.db.activity.findMany({
      where: this.scopeToUser(userId, {
        data: { gte: inicio, lte: fim },
        horaFim: { not: null },
        categoryId: { in: categorias.map((c) => c.id) },
      }),
      select: { data: true, duracaoMin: true, categoryId: true },
    });

    const progresso: CategoryGoalProgress[] = categorias.map((cat) => {
      const minPorDia = new Map<string, number>();
      for (const a of atividades) {
        if (a.categoryId !== cat.id) continue;
        const dia = a.data.toISOString().slice(0, 10);
        minPorDia.set(dia, (minPorDia.get(dia) ?? 0) + (a.duracaoMin ?? 0));
      }
      // tempoDesejadoMin não é nulo aqui (filtrado no where acima).
      const metaMin = cat.tempoDesejadoMin!;
      const diasComMeta = [...minPorDia.values()].filter((min) => min >= metaMin).length;
      return {
        categoryId: cat.id,
        categoria: cat.nome,
        cor: cat.cor,
        metaMin,
        metaFormatada: formatMinutes(metaMin),
        diasComMeta,
        diasNoPeriodo,
        percentual: diasNoPeriodo > 0 ? Math.round((diasComMeta / diasNoPeriodo) * 100) : 0,
      };
    });

    return progresso.sort((a, b) => b.percentual - a.percentual);
  }
}

export const ReportService = new ReportServiceImpl();
