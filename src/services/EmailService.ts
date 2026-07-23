import { env } from '../config/env';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/** Converte "Nome <email@dominio>" (formato do antigo SMTP_FROM) em {name, email} para a API da Brevo. */
function parseSender(raw: string): { name?: string; email: string } {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (!match) return { email: raw.trim() };
  return { name: match[1].trim().replace(/^"|"$/g, '') || undefined, email: match[2].trim() };
}

/**
 * Envio de e-mail transacional (recuperação de senha) via API HTTP da Brevo (porta 443).
 * Não estende BaseModel/BaseController pelo mesmo motivo que GoogleAuthService: não acessa
 * o banco e nunca é destacado como handler de rota do Express.
 *
 * Era SMTP puro (porta 587, sem vendor lock-in) até isso derrubar com ETIMEDOUT em produção
 * (Railway) mesmo com IPv4 forçado e sem restrição de IP na Brevo — a rede de saída do Railway
 * trava/bloqueia a conexão SMTP. HTTPS não tem esse problema. É uma troca deliberada: perde a
 * neutralidade de provedor (amarra ao formato da API da Brevo), ganha confiabilidade real.
 */
class EmailServiceImpl {
  isConfigured(): boolean {
    return Boolean(env.BREVO_API_KEY && env.SMTP_FROM);
  }

  /** Em dev sem API key configurada, loga o link no console em vez de falhar. */
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!this.isConfigured()) {
      console.log(`[EmailService] Brevo não configurado. Link de redefinição de senha para ${to}: ${resetUrl}`);
      return;
    }

    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseSender(env.SMTP_FROM!),
        to: [{ email: to }],
        subject: 'Redefinição de senha — Medidor de Eficiência',
        textContent: `Recebemos um pedido para redefinir sua senha. Acesse o link abaixo para escolher uma nova senha (válido por 1 hora):\n\n${resetUrl}\n\nSe você não pediu isso, ignore este e-mail.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Brevo API retornou ${res.status}: ${await res.text()}`);
    }
  }
}

export const EmailService = new EmailServiceImpl();
