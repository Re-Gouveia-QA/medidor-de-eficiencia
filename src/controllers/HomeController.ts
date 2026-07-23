import { Request, Response } from 'express';
import { ActivityModel } from '../models/ActivityModel';
import { CategoryModel } from '../models/CategoryModel';

export const HomeController = {
  async index(req: Request, res: Response) {
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
  },
};
