import { Request, Response } from 'express';
import { ActivityModel } from '../models/ActivityModel';
import { CategoryModel } from '../models/CategoryModel';
import { activitySchema } from '../utils/validators';
import { formatMinutes } from '../utils/time';

export const ActivityController = {
  async index(req: Request, res: Response) {
    const { inicio, fim, categoria } = req.query as Record<string, string | undefined>;
    const [atividades, categorias] = await Promise.all([
      ActivityModel.listByUser(req.currentUser!.id, { inicio, fim, categoryId: categoria }),
      CategoryModel.listByUser(req.currentUser!.id),
    ]);
    res.render('activities/index', {
      title: 'Atividades',
      atividades,
      categorias,
      filtros: { inicio: inicio ?? '', fim: fim ?? '', categoria: categoria ?? '' },
      formatMinutes,
    });
  },

  async create(req: Request, res: Response) {
    const categorias = await CategoryModel.listByUser(req.currentUser!.id);
    if (categorias.length === 0) {
      req.flash('error', 'Cadastre ao menos uma categoria antes de registrar atividades.');
      return res.redirect('/categories/new');
    }
    res.render('activities/create', { title: 'Registrar atividade', categorias, atividade: null });
  },

  async store(req: Request, res: Response) {
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) {
      req.flash('error', parsed.error.errors[0].message);
      return res.redirect('/activities/new');
    }
    // RF12: garante que a categoria pertence ao usuário
    const categoria = await CategoryModel.findById(parsed.data.categoryId, req.currentUser!.id);
    if (!categoria) {
      req.flash('error', 'Categoria inválida.');
      return res.redirect('/activities/new');
    }
    // Regra 9: se o valor não foi informado, usa o valor padrão da categoria (quando houver)
    const valorInformado =
      parsed.data.valor === '' || parsed.data.valor === undefined ? undefined : Number(parsed.data.valor);
    const valor =
      valorInformado ?? (categoria.possuiValor && categoria.valorPadrao != null ? categoria.valorPadrao.toNumber() : undefined);
    try {
      await ActivityModel.create(req.currentUser!.id, { ...parsed.data, valor });
      req.flash('success', 'Atividade registrada com sucesso.');
      res.redirect('/activities');
    } catch (e) {
      req.flash('error', e instanceof Error ? e.message : 'Erro ao registrar atividade.');
      res.redirect('/activities/new');
    }
  },

  async edit(req: Request, res: Response) {
    const [atividade, categorias] = await Promise.all([
      ActivityModel.findById(req.params.id, req.currentUser!.id),
      CategoryModel.listByUser(req.currentUser!.id),
    ]);
    if (!atividade) {
      req.flash('error', 'Atividade não encontrada.');
      return res.redirect('/activities');
    }
    res.render('activities/create', { title: 'Editar atividade', categorias, atividade });
  },

  async update(req: Request, res: Response) {
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) {
      req.flash('error', parsed.error.errors[0].message);
      return res.redirect(`/activities/${req.params.id}/edit`);
    }
    // RF12: garante que a categoria pertence ao usuário (evita associar a atividade a categoria de outro usuário)
    const categoria = await CategoryModel.findById(parsed.data.categoryId, req.currentUser!.id);
    if (!categoria) {
      req.flash('error', 'Categoria inválida.');
      return res.redirect(`/activities/${req.params.id}/edit`);
    }
    const valor = parsed.data.valor === '' || parsed.data.valor === undefined ? null : Number(parsed.data.valor);
    try {
      await ActivityModel.update(req.params.id, req.currentUser!.id, { ...parsed.data, valor });
      req.flash('success', 'Atividade atualizada.');
      res.redirect('/activities');
    } catch (e) {
      req.flash('error', e instanceof Error ? e.message : 'Erro ao atualizar atividade.');
      res.redirect(`/activities/${req.params.id}/edit`);
    }
  },

  async destroy(req: Request, res: Response) {
    await ActivityModel.destroy(req.params.id, req.currentUser!.id);
    req.flash('success', 'Atividade excluída.');
    res.redirect('/activities');
  },
};
