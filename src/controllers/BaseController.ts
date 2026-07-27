import { Request, Response } from 'express';
import { ZodSchema } from 'zod';

/**
 * Controllers estendem esta classe e expõem cada rota como um class field de
 * arrow function (`store = async (req, res) => {...}`), nunca como método de
 * protótipo comum. As rotas registram os handlers de forma destacada
 * (`router.post('/', CategoryController.store)`), e um método de protótipo
 * perderia o binding de `this` nesse caso — arrow function como campo de
 * instância mantém `this` correto independente de como o Express invoca.
 *
 * Não é um boundary de segurança: autenticação/autorização continuam nos
 * middlewares (`requireAuth`/`requireAdmin`), não aqui. Esta classe só reduz
 * a duplicação do fluxo parse → validar → flash → redirect.
 */
export abstract class BaseController {
  /**
   * Faz parse do body com o schema Zod; em falha, já envia flash de erro + redirect.
   * `parsed.error.errors[0].message` é uma chave de i18n, não o texto final — os schemas em
   * `validators.ts` são singletons de módulo sem acesso a `res.locals.t` no momento em que são
   * definidos (ver comentário lá). Só aqui, já dentro da requisição, a chave vira texto traduzido.
   */
  protected parseOrRedirect<T>(req: Request, res: Response, schema: ZodSchema<T>, redirectTo: string): T | undefined {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      req.flash('error', res.locals.t(parsed.error.errors[0].message));
      res.redirect(redirectTo);
      return undefined;
    }
    return parsed.data;
  }
}
