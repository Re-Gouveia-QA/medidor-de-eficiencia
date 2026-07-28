import { z } from 'zod';

/**
 * As mensagens abaixo são chaves de i18n (`src/i18n/*.json`), não texto de exibição direto: os
 * schemas Zod são singletons de módulo (criados uma vez no import, não por requisição), então não
 * têm acesso a `req.userLocale`/`res.locals.t` no momento em que são definidos. Em vez de tornar
 * cada schema uma função de `locale` (mudança maior, schemas deixariam de ser reutilizáveis como
 * valor estático), o Zod só carrega a *chave* da mensagem — quem traduz de fato é
 * `BaseController.parseOrRedirect`, que já roda dentro de uma requisição e tem `res.locals.t`
 * disponível. Zod trata `message` como texto opaco, então isso funciona sem nenhuma mudança na
 * lib: a chave só vira texto legível no ponto em que é efetivamente exibida ao usuário.
 */

// Regras de negócio 1 e 2 (seção 5 da documentação)
export const registerSchema = z.object({
  nome: z.string().trim().min(2, 'validation.nameRequired'),
  email: z.string().trim().toLowerCase().email('validation.emailInvalid'),
  senha: z.string().min(8, 'validation.passwordMinLength'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('validation.emailInvalid'),
  senha: z.string().min(1, 'validation.passwordRequired'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('validation.emailInvalid'),
});

// Regra 1: mesma exigência de senha do cadastro (mínimo 8 caracteres).
export const resetPasswordSchema = z
  .object({
    senha: z.string().min(8, 'validation.passwordMinLength'),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'validation.passwordsMismatch',
    path: ['confirmarSenha'],
  });

// Regra 6: cor em hexadecimal, nome obrigatório
// Regra 9: valor numérico opcional (custo, depósito, etc.) com rótulo próprio
// Regra 10: duração padrão opcional para atividades da categoria
export const categorySchema = z.object({
  nome: z.string().trim().min(1, 'validation.categoryNameRequired'),
  descricao: z.string().trim().optional().or(z.literal('')),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'validation.colorFormat'),
  tempoDesejadoMin: z.coerce.number().int().positive().optional().or(z.literal('')),
  possuiValor: z.string().optional(), // checkbox: 'on' quando marcado, ausente quando desmarcado
  valorLabel: z.string().trim().max(80, 'validation.valueLabelMaxLength').optional().or(z.literal('')),
  valorPadrao: z.coerce.number().positive().optional().or(z.literal('')),
  duracaoPadraoMin: z.coerce.number().int().positive().optional().or(z.literal('')),
});

// Regra 4: nome, categoria, data e hora de início obrigatórios
// Regra 9: valor numérico opcional, só relevante quando a categoria tiver possuiValor = true
export const activitySchema = z.object({
  nome: z.string().trim().min(1, 'validation.activityNameRequired'),
  categoryId: z.string().uuid('validation.categoryRequired'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.dateInvalid'),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'validation.startTimeInvalid'),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, 'validation.endTimeInvalid'),
  descricao: z.string().trim().optional().or(z.literal('')),
  valor: z.coerce.number().positive().optional().or(z.literal('')),
});

// Registro rápido de atividade "em andamento" (sem hora de fim ainda) — data/horaInicio são
// implícitos (agora), só nome e categoria são pedidos ao usuário.
export const startActivitySchema = z.object({
  nome: z.string().trim().min(1, 'validation.activityNameRequired'),
  categoryId: z.string().uuid('validation.categoryRequired'),
});

// "Finalizar com detalhes" (extensão de 2026-07-28 da atividade em andamento): descricao/valor
// opcionais, mesmo formato de activitySchema — o form pode vir totalmente vazio (botão
// "Finalizar" rápido, sem abrir os detalhes).
export const finishDetailsSchema = z.object({
  descricao: z.string().trim().optional().or(z.literal('')),
  valor: z.coerce.number().positive().optional().or(z.literal('')),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
export type StartActivityInput = z.infer<typeof startActivitySchema>;
export type FinishDetailsInput = z.infer<typeof finishDetailsSchema>;
