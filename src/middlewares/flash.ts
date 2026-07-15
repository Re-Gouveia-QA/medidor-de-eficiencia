import { NextFunction, Request, Response } from 'express';

type FlashStore = Record<string, string[]>;

/**
 * Substitui connect-flash (sem manutenção desde 2014; usa a API depreciada `util.isArray`
 * do Node internamente). Cobre o único uso feito neste projeto: req.flash(type, message)
 * grava uma mensagem na sessão; req.flash(type) lê e limpa as mensagens daquele tipo.
 */
export function flash(req: Request, _res: Response, next: NextFunction) {
  req.flash = ((type: string, message?: string) => {
    const session = req.session as unknown as { flash?: FlashStore };
    session.flash = session.flash ?? {};

    if (message !== undefined) {
      const messages = (session.flash[type] ??= []);
      messages.push(message);
      return messages.length;
    }

    const messages = session.flash[type] ?? [];
    delete session.flash[type];
    return messages;
  }) as Request['flash'];
  next();
}
