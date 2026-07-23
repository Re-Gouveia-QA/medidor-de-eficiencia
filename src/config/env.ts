import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET deve ter ao menos 16 caracteres'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  // Recuperação de senha — envio de e-mail via API HTTP da Brevo (porta 443). Não é mais SMTP
  // puro (porta 587): o SMTP travava com ETIMEDOUT a partir do Railway (rede de saída bloqueia/
  // restringe a porta, mesmo com IPv4 forçado e sem restrição de IP na Brevo) — ver EmailService.ts.
  BREVO_API_KEY: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // URL pública da aplicação, usada para montar o link de redefinição de senha no e-mail.
  APP_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
