import { Request, Response } from 'express';
import { CategoryModel } from '../models/CategoryModel';
import { categorySchema } from '../utils/validators';

function parseInput(body: unknown) {
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { nome, descricao, cor, tempoDesejadoMin, possuiValor, valorLabel, valorPadrao, duracaoPadraoMin } =
    parsed.data;
  const habilitaValor = possuiValor === 'on';
  return {
    data: {
      nome,
      descricao: descricao || undefined,
      cor,
      tempoDesejadoMin: tempoDesejadoMin === '' ? undefined : Number(tempoDesejadoMin) || undefined,
      possuiValor: habilitaValor,
      valorLabel: habilitaValor && valorLabel ? valorLabel : undefined,
      valorPadrao: habilitaValor && valorPadrao !== '' ? Number(valorPadrao) : undefined,
      duracaoPadraoMin: duracaoPadraoMin === '' ? undefined : Number(duracaoPadraoMin) || undefined,
    },
  };
}

export const CategoryController = {
  async index(req: Request, res: Response) {
    const categorias = await CategoryModel.listByUser(req.currentUser!.id);
    res.render('categories/index', { title: 'Categorias', categorias });
  },

  create(_req: Request, res: Response) {
    res.render('categories/create', { title: 'Nova categoria', categoria: null });
  },

  async store(req: Request, res: Response) {
    const result = parseInput(req.body);
    if ('error' in result) {
      req.flash('error', result.error!);
      return res.redirect('/categories/new');
    }
    try {
      await CategoryModel.create(req.currentUser!.id, result.data!);
      req.flash('success', 'Categoria criada com sucesso.');
      res.redirect('/categories');
    } catch {
      req.flash('error', 'Você já possui uma categoria com esse nome.'); // regra 6
      res.redirect('/categories/new');
    }
  },

  async edit(req: Request, res: Response) {
    const categoria = await CategoryModel.findById(req.params.id, req.currentUser!.id);
    if (!categoria) {
      req.flash('error', 'Categoria não encontrada.');
      return res.redirect('/categories');
    }
    res.render('categories/create', { title: 'Editar categoria', categoria });
  },

  async update(req: Request, res: Response) {
    const result = parseInput(req.body);
    if ('error' in result) {
      req.flash('error', result.error!);
      return res.redirect(`/categories/${req.params.id}/edit`);
    }
    try {
      await CategoryModel.update(req.params.id, req.currentUser!.id, {
        ...result.data!,
        tempoDesejadoMin: result.data!.tempoDesejadoMin ?? null,
        valorLabel: result.data!.valorLabel ?? null,
        valorPadrao: result.data!.valorPadrao ?? null,
        duracaoPadraoMin: result.data!.duracaoPadraoMin ?? null,
      });
      req.flash('success', 'Categoria atualizada.');
      res.redirect('/categories');
    } catch {
      req.flash('error', 'Você já possui uma categoria com esse nome.');
      res.redirect(`/categories/${req.params.id}/edit`);
    }
  },

  async destroy(req: Request, res: Response) {
    // Regra 7: bloquear exclusão de categoria com atividades vinculadas
    const total = await CategoryModel.countActivities(req.params.id);
    if (total > 0) {
      req.flash(
        'error',
        `Não é possível excluir: existem ${total} atividade(s) vinculadas a esta categoria.`,
      );
      return res.redirect('/categories');
    }
    await CategoryModel.destroy(req.params.id, req.currentUser!.id);
    req.flash('success', 'Categoria excluída.');
    res.redirect('/categories');
  },
};
