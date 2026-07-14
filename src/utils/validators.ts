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

// Regra 6: cor em hexadecimal, nome obrigatório
export const categorySchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria.'),
  descricao: z.string().trim().optional().or(z.literal('')),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar em formato hexadecimal (#RRGGBB).'),
  tempoDesejadoMin: z.coerce.number().int().positive().optional().or(z.literal('')),
});

// Regra 4: nome, categoria, data e hora de início obrigatórios
export const activitySchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da atividade.'),
  categoryId: z.string().uuid('Selecione uma categoria.'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de início inválida.'),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de fim inválida.'),
  descricao: z.string().trim().optional().or(z.literal('')),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
