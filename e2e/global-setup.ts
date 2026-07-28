import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

async function ensureDatabaseExists(databaseUrl: string) {
  const target = new URL(databaseUrl);
  const dbName = target.pathname.replace(/^\//, '');

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount === 0) {
      // Nome do banco vem só do .env.test local (não é input de usuário), mas mesmo assim não dá
      // pra parametrizar o nome do banco num CREATE DATABASE — identifier, não valor.
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Roda uma vez antes de toda a suíte E2E: garante o banco "_e2e" (cria se faltar), aplica as
 * migrations e limpa as tabelas — cada spec assume um banco vazio, popula o que precisa via
 * e2e/helpers/auth.ts (não reaproveita o usuário seed de dev, pra não colidir com uso manual do
 * banco de dev em paralelo).
 */
export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada — crie um .env.test na raiz do projeto (ver .env.example).');
  }
  if (!databaseUrl.includes('_e2e')) {
    throw new Error(
      `DATABASE_URL de teste precisa apontar pra um banco cujo nome contenha "_e2e" (valor atual: ${databaseUrl}). ` +
        'Proteção contra rodar os testes E2E (que fazem TRUNCATE) por engano no banco de dev.',
    );
  }

  await ensureDatabaseExists(databaseUrl);

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('TRUNCATE TABLE activities, categories, password_reset_tokens, users RESTART IDENTITY CASCADE');
  } finally {
    await client.end();
  }
}
