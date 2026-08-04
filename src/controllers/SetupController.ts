import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { CategoryModel } from '../models/CategoryModel';
import { categoryPresets, findCategoryPreset } from '../config/categoryPresets';

class SetupControllerImpl extends BaseController {
  index = (_req: Request, res: Response) => {
    res.render('categories/setup-index', {
      title: res.locals.t('categories.setup.index.title'),
      presets: categoryPresets,
    });
  };

  show = (req: Request, res: Response) => {
    const preset = findCategoryPreset(req.params.presetId);
    if (!preset) {
      req.flash('error', res.locals.t('categories.setup.notFound'));
      return res.redirect('/categories/setup');
    }
    res.render('categories/setup-show', {
      title: res.locals.t(preset.titleKey),
      preset,
    });
  };

  apply = async (req: Request, res: Response) => {
    const preset = findCategoryPreset(req.params.presetId);
    if (!preset) {
      req.flash('error', res.locals.t('categories.setup.notFound'));
      return res.redirect('/categories/setup');
    }

    let created = 0;
    for (const categoria of preset.categorias) {
      try {
        await CategoryModel.create(req.currentUser!.id, categoria);
        created += 1;
      } catch {
        // regra 6: nome já existe pra esse usuário — mantém a categoria existente, segue pras próximas
      }
    }

    const skipped = preset.categorias.length - created;
    req.flash('success', res.locals.t('categories.setup.applied', { created, skipped }));
    res.redirect('/categories');
  };
}

export const SetupController = new SetupControllerImpl();
