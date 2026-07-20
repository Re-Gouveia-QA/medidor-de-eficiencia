import { BaseModel } from './BaseModel';

interface CategoryCreateInput {
  nome: string;
  descricao?: string;
  cor: string;
  tempoDesejadoMin?: number;
  possuiValor?: boolean;
  valorLabel?: string;
  valorPadrao?: number;
  duracaoPadraoMin?: number;
}

interface CategoryUpdateInput {
  nome: string;
  descricao?: string | null;
  cor: string;
  tempoDesejadoMin?: number | null;
  possuiValor?: boolean;
  valorLabel?: string | null;
  valorPadrao?: number | null;
  duracaoPadraoMin?: number | null;
}

/** Model Category — CRUD escopado por usuário (RF12), via BaseModel. */
class CategoryModelImpl extends BaseModel {
  listByUser(userId: string) {
    return this.db.category.findMany({
      where: this.scopeToUser(userId),
      orderBy: { nome: 'asc' },
      include: { _count: { select: { atividades: true } } },
    });
  }

  findById(id: string, userId: string) {
    return this.db.category.findFirst({ where: this.scopeToUser(userId, { id }) });
  }

  create(userId: string, data: CategoryCreateInput) {
    return this.db.category.create({ data: { ...data, userId } });
  }

  update(id: string, userId: string, data: CategoryUpdateInput) {
    return this.db.category.updateMany({ where: this.scopeToUser(userId, { id }), data });
  }

  /** Regra 7: lança P2003 (FK restrict) se houver atividades vinculadas — o controller trata e bloqueia. */
  async destroy(id: string, userId: string) {
    const owned = await this.db.category.findFirst({ where: this.scopeToUser(userId, { id }), select: { id: true } });
    if (!owned) return null;
    return this.db.category.delete({ where: { id } });
  }

  countActivities(id: string) {
    return this.db.activity.count({ where: { categoryId: id } });
  }
}

export const CategoryModel = new CategoryModelImpl();
