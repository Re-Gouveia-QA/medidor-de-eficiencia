import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ActivityModel } from '../models/ActivityModel';
import { CategoryModel } from '../models/CategoryModel';
import { activitySchema } from '../utils/validators';
import { formatMinutes, formatTimeInZone } from '../utils/time';
import { formatNumber } from '../utils/format';

/** RF12: garante que a categoria pertence ao usuário; se não, já envia o redirect de erro. */
async function resolveOwnedCategory(req: Request, res: Response, categoryId: string, redirectTo: string) {
  const categoria = await CategoryModel.findById(categoryId, req.currentUser!.id);
  if (!categoria) {
    req.flash('error', 'Categoria inválida.');
    res.redirect(redirectTo);
    return undefined;
  }
  return categoria;
}

/** Normaliza o campo de valor já coagido pelo Zod (número, '' ou undefined) para número ou undefined. */
function parseValorInput(raw: number | '' | undefined): number | undefined {
  return raw === '' || raw === undefined ? undefined : raw;
}

class ActivityControllerImpl extends BaseController {
  index = async (req: Request, res: Response) => {
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
      formatNumber,
      formatTime: (d: Date) => formatTimeInZone(d, req.userTimezone),
    });
  };

  create = async (req: Request, res: Response) => {
    const categorias = await CategoryModel.listByUser(req.currentUser!.id);
    if (categorias.length === 0) {
      req.flash('error', 'Cadastre ao menos uma categoria antes de registrar atividades.');
      return res.redirect('/categories/new');
    }
    res.render('activities/create', {
      title: 'Registrar atividade',
      categorias,
      atividade: null,
      formatTime: (d: Date) => formatTimeInZone(d, req.userTimezone),
    });
  };

  store = async (req: Request, res: Response) => {
    const data = this.parseOrRedirect(req, res, activitySchema, '/activities/new');
    if (!data) return;
    const categoria = await resolveOwnedCategory(req, res, data.categoryId, '/activities/new');
    if (!categoria) return;
    // Regra 9: se o valor não foi informado, usa o valor padrão da categoria (quando houver)
    const valorInformado = parseValorInput(data.valor);
    const valor =
      valorInformado ?? (categoria.possuiValor && categoria.valorPadrao != null ? categoria.valorPadrao.toNumber() : undefined);
    try {
      await ActivityModel.create(req.currentUser!.id, { ...data, valor, timezone: req.userTimezone });
      req.flash('success', 'Atividade registrada com sucesso.');
      res.redirect('/activities');
    } catch (e) {
      req.flash('error', e instanceof Error ? e.message : 'Erro ao registrar atividade.');
      res.redirect('/activities/new');
    }
  };

  edit = async (req: Request, res: Response) => {
    const [atividade, categorias] = await Promise.all([
      ActivityModel.findById(req.params.id, req.currentUser!.id),
      CategoryModel.listByUser(req.currentUser!.id),
    ]);
    if (!atividade) {
      req.flash('error', 'Atividade não encontrada.');
      return res.redirect('/activities');
    }
    res.render('activities/create', {
      title: 'Editar atividade',
      categorias,
      atividade,
      formatTime: (d: Date) => formatTimeInZone(d, req.userTimezone),
    });
  };

  update = async (req: Request, res: Response) => {
    const redirectTo = `/activities/${req.params.id}/edit`;
    const data = this.parseOrRedirect(req, res, activitySchema, redirectTo);
    if (!data) return;
    const categoria = await resolveOwnedCategory(req, res, data.categoryId, redirectTo);
    if (!categoria) return;
    const valor = parseValorInput(data.valor) ?? null;
    try {
      await ActivityModel.update(req.params.id, req.currentUser!.id, { ...data, valor, timezone: req.userTimezone });
      req.flash('success', 'Atividade atualizada.');
      res.redirect('/activities');
    } catch (e) {
      req.flash('error', e instanceof Error ? e.message : 'Erro ao atualizar atividade.');
      res.redirect(redirectTo);
    }
  };

  destroy = async (req: Request, res: Response) => {
    const { count } = await ActivityModel.destroy(req.params.id, req.currentUser!.id);
    if (count === 0) {
      req.flash('error', 'Atividade não encontrada.');
      return res.redirect('/activities');
    }
    req.flash('success', 'Atividade excluída.');
    res.redirect('/activities');
  };
}

export const ActivityController = new ActivityControllerImpl();
