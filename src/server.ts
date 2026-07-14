import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ Medidor de Eficiência rodando em http://localhost:${env.PORT}`);
});
