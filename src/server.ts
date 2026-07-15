import { createApp } from './app';
import { env } from './config/env';

// Rede de segurança: registra (sem derrubar o processo) qualquer rejeição de Promise que
// escape do tratamento de rotas — com express-async-errors, isso não deveria vir de rotas HTTP.
process.on('unhandledRejection', (reason) => {
  console.error('Rejeição de Promise não tratada:', reason);
});

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ Medidor de Eficiência rodando em http://localhost:${env.PORT}`);
});
