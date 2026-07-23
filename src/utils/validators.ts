import { z } from 'zod';

// Regras de negócio 1 e 2 (seção 5 da documentação)
export const registerSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe a senha.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
});

// Regra 1: mesma exigência de senha do cadastro (mínimo 8 caracteres).
export const resetPasswordSchema = z
  .object({
    senha: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  });

// Regra 6: cor em hexadecimal, nome obrigatório
// Regra 9: valor numérico opcional (custo, depósito, etc.) com rótulo próprio
// Regra 10: duração padrão opcional para atividades da categoria
export const categorySchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria.'),
  descricao: z.string().trim().optional().or(z.literal('')),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar em formato hexadecimal (#RRGGBB).'),
  tempoDesejadoMin: z.coerce.number().int().positive().optional().or(z.literal('')),
  possuiValor: z.string().optional(), // checkbox: 'on' quando marcado, ausente quando desmarcado
  valorLabel: z.string().trim().max(80, 'Rótulo do valor deve ter no máximo 80 caracteres.').optional().or(z.literal('')),
  valorPadrao: z.coerce.number().positive().optional().or(z.literal('')),
  duracaoPadraoMin: z.coerce.number().int().positive().optional().or(z.literal('')),
});

// Regra 4: nome, categoria, data e hora de início obrigatórios
// Regra 9: valor numérico opcional, só relevante quando a categoria tiver possuiValor = true
export const activitySchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da atividade.'),
  categoryId: z.string().uuid('Selecione uma categoria.'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de início inválida.'),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de fim inválida.'),
  descricao: z.string().trim().optional().or(z.literal('')),
  valor: z.coerce.number().positive().optional().or(z.literal('')),
});

// Registro rápido de atividade "em andamento" (sem hora de fim ainda) — data/horaInicio são
// implícitos (agora), só nome e categoria são pedidos ao usuário.
export const startActivitySchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da atividade.'),
  categoryId: z.string().uuid('Selecione uma categoria.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
export type StartActivityInput = z.infer<typeof startActivitySchema>;
