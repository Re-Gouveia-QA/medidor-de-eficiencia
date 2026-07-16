import { prisma } from '../config/database';

/** Model Category — CRUD escopado por usuário (RF12). */
export const CategoryModel = {
  listByUser(userId: string) {
    return prisma.category.findMany({
      where: { userId },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { atividades: true } } },
    });
  },

  findById(id: string, userId: string) {
    return prisma.category.findFirst({ where: { id, userId } });
  },

  create(
    userId: string,
    data: {
      nome: string;
      descricao?: string;
      cor: string;
      tempoDesejadoMin?: number;
      possuiValor?: boolean;
      valorLabel?: string;
      valorPadrao?: number;
      duracaoPadraoMin?: number;
    },
  ) {
    return prisma.category.create({ data: { ...data, userId } });
  },

  update(
    id: string,
    userId: string,
    data: {
      nome: string;
      descricao?: string | null;
      cor: string;
      tempoDesejadoMin?: number | null;
      possuiValor?: boolean;
      valorLabel?: string | null;
      valorPadrao?: number | null;
      duracaoPadraoMin?: number | null;
    },
  ) {
    return prisma.category.updateMany({ where: { id, userId }, data });
  },

  /** Regra 7: lança P2003 (FK restrict) se houver atividades vinculadas — o controller trata e bloqueia. */
  async destroy(id: string, userId: string) {
    const owned = await prisma.category.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) return null;
    return prisma.category.delete({ where: { id } });
  },

  countActivities(id: string) {
    return prisma.activity.count({ where: { categoryId: id } });
  },
};
