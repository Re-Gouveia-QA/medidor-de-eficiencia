import { prisma } from '../config/database';

/**
 * RF12: todo acesso a dado de usuário deve ser escopado por userId — nunca expor
 * registro de outro usuário. Subclasses de dados por-usuário não usam `prisma`
 * diretamente; usam `this.scopeToUser(userId, where)`, que sempre funde `userId`
 * no filtro. Isso torna estruturalmente impossível uma subclasse montar uma query
 * sem o escopo por acidente (a omissão que já causou vazamento antes desta refatoração).
 */
export abstract class BaseModel {
  protected readonly db = prisma;

  protected scopeToUser<TWhere extends object>(
    userId: string,
    where: TWhere = {} as TWhere,
  ): TWhere & { userId: string } {
    return { ...where, userId };
  }
}
