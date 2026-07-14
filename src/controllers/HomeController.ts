import { Request, Response } from 'express';

export const HomeController = {
  index(req: Request, res: Response) {
    res.render('home/index', {
      title: 'Página inicial',
      userName: req.currentUser?.nome ?? '',
    });
  },
};
