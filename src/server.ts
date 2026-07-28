import dns from 'node:dns';
import { createApp } from './app';
import { env } from './config/env';

// Alguns provedores de hospedagem (ex.: Railway) dão ao container um endereço IPv6 sem rota de
// saída real — o Node tenta IPv6 primeiro por padrão e a conexão trava até estourar o timeout,
// em vez de cair para IPv4 rapidamente. Isso já causou ETIMEDOUT no envio de e-mail via SMTP
// (nodemailer) mesmo com as credenciais e a rede de destino corretas. Forçar IPv4 evita a espera.
dns.setDefaultResultOrder('ipv4first');

// Rede de segurança: registra (sem derrubar o processo) qualquer rejeição de Promise que
// escape do tratamento de rotas — com express-async-errors, isso não deveria vir de rotas HTTP.
process.on('unhandledRejection', (reason) => {
  console.error('Rejeição de Promise não tratada:', reason);
});

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ Sketch your time rodando em http://localhost:${env.PORT}`);
});
