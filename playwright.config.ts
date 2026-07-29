import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Carrega .env.test ANTES de tudo — inclusive antes do webServer nascer — pra garantir que o
// dev server suba apontando pro banco "_e2e", nunca pro banco de dev (.env). dotenv não
// sobrescreve variáveis já setadas no processo, então isso tem prioridade sobre um .env solto.
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const PORT = process.env.PORT ?? '3100';
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Porta própria (3100), diferente da porta de dev (3000) — evita que o Playwright "reaproveite"
  // por engano um servidor de dev já rodando (que estaria apontando pro banco de dev, não pro _e2e).
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: process.env as Record<string, string>,
  },
});
