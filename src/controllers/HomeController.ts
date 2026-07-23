import { Request, Response } from 'express';

export const HomeController = {
  index(req: Request, res: Response) {
    const dataHojeRaw = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: req.userTimezone,
    });
    res.render('home/index', {
      title: 'Página inicial',
      userName: req.currentUser?.nome ?? '',
      dataHoje: dataHojeRaw.charAt(0).toUpperCase() + dataHojeRaw.slice(1),
    });
  },
};
