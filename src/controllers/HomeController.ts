import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ActivityModel } from '../models/ActivityModel';
import { CategoryModel } from '../models/CategoryModel';

/**
 * Estende BaseController por uniformidade de hierarquia com os demais
 * controllers (mesmo padrão de ReportController), ainda que esta rota não
 * use parseOrRedirect — não há body a validar aqui, só dados a montar pra
 * renderização.
 */
class HomeControllerImpl extends BaseController {
  index = async (req: Request, res: Response) => {
    const dataHojeRaw = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: req.userTimezone,
    });
    const [emAndamento, categorias] = await Promise.all([
      ActivityModel.findInProgress(req.currentUser!.id),
      CategoryModel.listByUser(req.currentUser!.id),
    ]);
    res.render('home/index', {
      title: 'Página inicial',
      userName: req.currentUser?.nome ?? '',
      dataHoje: dataHojeRaw.charAt(0).toUpperCase() + dataHojeRaw.slice(1),
      emAndamento,
      categorias,
    });
  };
}

export const HomeController = new HomeControllerImpl();
