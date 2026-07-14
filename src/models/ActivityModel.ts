import { prisma } from '../config/database';
import { calcDurationMin, combineDateTime } from '../utils/time';

export interface ActivityData {
  nome: string;
  categoryId: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  descricao?: string;
  valor?: number | null; // regra 9 — só relevante se a categoria tiver possuiValor = true
}

export interface ActivityFilters {
  inicio?: string; // YYYY-MM-DD
  fim?: string; // YYYY-MM-DD
  categoryId?: string;
}

/** Model Activity — CRUD com cálculo automático de duração (regra 5). */
export const ActivityModel = {
  listByUser(userId: string, filters: ActivityFilters = {}) {
    return prisma.activity.findMany({
      where: {
        userId,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.inicio || filters.fim
          ? {
              data: {
                ...(filters.inicio ? { gte: new Date(`${filters.inicio}T00:00:00.000Z`) } : {}),
                ...(filters.fim ? { lte: new Date(`${filters.fim}T00:00:00.000Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ data: 'desc' }, { horaInicio: 'desc' }],
      include: { category: { select: { nome: true, cor: true, possuiValor: true, valorLabel: true } } },
    });
  },

  findById(id: string, userId: string) {
    return prisma.activity.findFirst({ where: { id, userId } });
  },

  create(userId: string, input: ActivityData) {
    const horaInicio = combineDateTime(input.data, input.horaInicio);
    const horaFim = combineDateTime(input.data, input.horaFim);
    const duracaoMin = calcDurationMin(horaInicio, horaFim); // valida fim > início (regra 4)

    return prisma.activity.create({
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
  },

  update(id: string, userId: string, input: ActivityData) {
    const horaInicio = combineDateTime(input.data, input.horaInicio);
    const horaFim = combineDateTime(input.data, input.horaFim);
    const duracaoMin = calcDurationMin(horaInicio, horaFim);

    return prisma.activity.updateMany({
      where: { id, userId },
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
  },

  destroy(id: string, userId: string) {
    return prisma.activity.deleteMany({ where: { id, userId } });
  },
};
