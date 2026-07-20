import { BaseModel } from './BaseModel';
import { calcDurationMin, combineDateTime } from '../utils/time';

export interface ActivityData {
  nome: string;
  categoryId: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm, horário local no fuso abaixo
  horaFim: string; // HH:mm, horário local no fuso abaixo
  descricao?: string;
  valor?: number | null; // regra 9 — só relevante se a categoria tiver possuiValor = true
  timezone: string; // RNF05 — fuso IANA em que horaInicio/horaFim foram digitados
}

export interface ActivityFilters {
  inicio?: string; // YYYY-MM-DD
  fim?: string; // YYYY-MM-DD
  categoryId?: string;
}

/** Model Activity — CRUD escopado por usuário (RF12), com cálculo automático de duração (regra 5). */
class ActivityModelImpl extends BaseModel {
  listByUser(userId: string, filters: ActivityFilters = {}) {
    return this.db.activity.findMany({
      where: this.scopeToUser(userId, {
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.inicio || filters.fim
          ? {
              data: {
                ...(filters.inicio ? { gte: new Date(`${filters.inicio}T00:00:00.000Z`) } : {}),
                ...(filters.fim ? { lte: new Date(`${filters.fim}T00:00:00.000Z`) } : {}),
              },
            }
          : {}),
      }),
      orderBy: [{ data: 'desc' }, { horaInicio: 'desc' }],
      include: { category: { select: { nome: true, cor: true, possuiValor: true, valorLabel: true } } },
    });
  }

  findById(id: string, userId: string) {
    return this.db.activity.findFirst({ where: this.scopeToUser(userId, { id }) });
  }

  create(userId: string, input: ActivityData) {
    const horaInicio = combineDateTime(input.data, input.horaInicio, input.timezone);
    const horaFim = combineDateTime(input.data, input.horaFim, input.timezone);
    const duracaoMin = calcDurationMin(horaInicio, horaFim); // valida fim > início (regra 4)

    return this.db.activity.create({
      data: {
        userId,
        categoryId: input.categoryId,
        nome: input.nome,
        data: new Date(`${input.data}T00:00:00.000Z`),
        horaInicio,
        horaFim,
        duracaoMin,
        descricao: input.descricao || null,
        valor: input.valor ?? null,
      },
    });
  }

  update(id: string, userId: string, input: ActivityData) {
    const horaInicio = combineDateTime(input.data, input.horaInicio, input.timezone);
    const horaFim = combineDateTime(input.data, input.horaFim, input.timezone);
    const duracaoMin = calcDurationMin(horaInicio, horaFim);

    return this.db.activity.updateMany({
      where: this.scopeToUser(userId, { id }),
      data: {
        categoryId: input.categoryId,
        nome: input.nome,
        data: new Date(`${input.data}T00:00:00.000Z`),
        horaInicio,
        horaFim,
        duracaoMin,
        descricao: input.descricao || null,
        valor: input.valor ?? null,
      },
    });
  }

  destroy(id: string, userId: string) {
    return this.db.activity.deleteMany({ where: this.scopeToUser(userId, { id }) });
  }
}

export const ActivityModel = new ActivityModelImpl();
