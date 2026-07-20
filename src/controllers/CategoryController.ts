import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { CategoryModel } from '../models/CategoryModel';
import { categorySchema, CategoryInput } from '../utils/validators';
import { formatNumber } from '../utils/format';

interface CategoryFormData {
  nome: string;
  descricao?: string;
  cor: string;
  tempoDesejadoMin?: number;
  possuiValor: boolean;
  valorLabel?: string;
  valorPadrao?: number;
  duracaoPadraoMin?: number;
}

/** Deriva os campos gravados a partir do body já validado pelo Zod (checkbox → boolean, '' → undefined). */
function toCategoryData(raw: CategoryInput): CategoryFormData {
  const { nome, descricao, cor, tempoDesejadoMin, possuiValor, valorLabel, valorPadrao, duracaoPadraoMin } = raw;
  const habilitaValor = possuiValor === 'on';
  return {
    nome,
    descricao: descricao || undefined,
    cor,
    tempoDesejadoMin: tempoDesejadoMin === '' ? undefined : Number(tempoDesejadoMin) || undefined,
    possuiValor: habilitaValor,
    valorLabel: habilitaValor && valorLabel ? valorLabel : undefined,
    valorPadrao: habilitaValor && valorPadrao !== '' ? Number(valorPadrao) : undefined,
    duracaoPadraoMin: duracaoPadraoMin === '' ? undefined : Number(duracaoPadraoMin) || undefined,
  };
}

class CategoryControllerImpl extends BaseController {
  index = async (req: Request, res: Response) => {
    const categorias = await CategoryModel.listByUser(req.currentUser!.id);
    res.render('categories/index', { title: 'Categorias', categorias, formatNumber });
  };

  create = (_req: Request, res: Response) => {
    res.render('categories/create', { title: 'Nova categoria', categoria: null });
  };

  store = async (req: Request, res: Response) => {
    const raw = this.parseOrRedirect(req, res, categorySchema, '/categories/new');
    if (!raw) return;
    try {
      await CategoryModel.create(req.currentUser!.id, toCategoryData(raw));
      req.flash('success', 'Categoria criada com sucesso.');
      res.redirect('/categories');
    } catch {
      req.flash('error', 'Você já possui uma categoria com esse nome.'); // regra 6
      res.redirect('/categories/new');
    }
  };

  edit = async (req: Request, res: Response) => {
    const categoria = await CategoryModel.findById(req.params.id, req.currentUser!.id);
    if (!categoria) {
      req.flash('error', 'Categoria não encontrada.');
      return res.redirect('/categories');
    }
    res.render('categories/create', { title: 'Editar categoria', categoria });
  };

  update = async (req: Request, res: Response) => {
    const redirectTo = `/categories/${req.params.id}/edit`;
    const raw = this.parseOrRedirect(req, res, categorySchema, redirectTo);
    if (!raw) return;
    const data = toCategoryData(raw);
    try {
      await CategoryModel.update(req.params.id, req.currentUser!.id, {
        ...data,
        descricao: data.descricao ?? null,
        tempoDesejadoMin: data.tempoDesejadoMin ?? null,
        valorLabel: data.valorLabel ?? null,
        valorPadrao: data.valorPadrao ?? null,
        duracaoPadraoMin: data.duracaoPadraoMin ?? null,
      });
      req.flash('success', 'Categoria atualizada.');
      res.redirect('/categories');
    } catch {
      req.flash('error', 'Você já possui uma categoria com esse nome.');
      res.redirect(redirectTo);
    }
  };

  destroy = async (req: Request, res: Response) => {
    // RF12: confirma que a categoria pertence ao usuário antes de revelar qualquer dado dela
    // (contagem de atividades) ou tentar excluí-la.
    const categoria = await CategoryModel.findById(req.params.id, req.currentUser!.id);
    if (!categoria) {
      req.flash('error', 'Categoria não encontrada.');
      return res.redirect('/categories');
    }
    // Regra 7: bloquear exclusão de categoria com atividades vinculadas
    const total = await CategoryModel.countActivities(categoria.id);
    if (total > 0) {
      req.flash(
        'error',
        `Não é possível excluir: existem ${total} atividade(s) vinculadas a esta categoria.`,
      );
      return res.redirect('/categories');
    }
    const deleted = await CategoryModel.destroy(categoria.id, req.currentUser!.id);
    if (!deleted) {
      req.flash('error', 'Categoria não encontrada.');
      return res.redirect('/categories');
    }
    req.flash('success', 'Categoria excluída.');
    res.redirect('/categories');
  };
}

export const CategoryController = new CategoryControllerImpl();
