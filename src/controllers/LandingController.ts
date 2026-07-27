import { Request, Response } from 'express';
import { BaseController } from './BaseController';

/**
 * Home pública (visitante sem sessão) — ver .claude/plans/home-landing-page-2026-07-27.md.
 * `/` continua mostrando o dashboard normal (HomeController) pra quem está autenticado; o
 * branching entre os dois fica em src/routes/index.ts, não aqui.
 * Estende BaseController por uniformidade de hierarquia com os demais controllers (mesmo padrão
 * de HomeController/ReportController), ainda que esta rota não use parseOrRedirect.
 */
class LandingControllerImpl extends BaseController {
  show = (_req: Request, res: Response) => {
    res.render('marketing/landing', {
      title: res.locals.t('marketing.hero.title'),
      description: res.locals.t('marketing.metaDescription'),
      layout: 'layouts/marketing',
    });
  };
}

export const LandingController = new LandingControllerImpl();
