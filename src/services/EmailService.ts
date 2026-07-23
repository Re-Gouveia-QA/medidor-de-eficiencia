import nodemailer from 'nodemailer';
import { env } from '../config/env';

/** Envio de e-mail transacional (recuperação de senha) via SMTP genérico — sem vendor lock-in. */

function createTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    connectionTimeout: 10_000, // falha rápido em vez de travar até o timeout default do nodemailer
  });
}

/**
 * Não estende BaseModel/BaseController pelo mesmo motivo que GoogleAuthService:
 * não acessa o banco e nunca é destacado como handler de rota do Express.
 */
class EmailServiceImpl {
  isConfigured(): boolean {
    return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM);
  }

  /**
   * Em dev sem SMTP configurado, loga o link no console em vez de falhar — permite testar o
   * fluxo de recuperação de senha localmente sem precisar de credenciais SMTP reais.
   */
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!this.isConfigured()) {
      console.log(`[EmailService] SMTP não configurado. Link de redefinição de senha para ${to}: ${resetUrl}`);
      return;
    }

    await createTransport().sendMail({
      from: env.SMTP_FROM,
      to,
      subject: 'Redefinição de senha — Medidor de Eficiência',
      text: `Recebemos um pedido para redefinir sua senha. Acesse o link abaixo para escolher uma nova senha (válido por 1 hora):\n\n${resetUrl}\n\nSe você não pediu isso, ignore este e-mail.`,
    });
  }
}

export const EmailService = new EmailServiceImpl();
