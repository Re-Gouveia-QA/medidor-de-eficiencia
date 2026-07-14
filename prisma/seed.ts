import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash('senha12345', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@medidor.dev' },
    update: {},
    create: { nome: 'Usuário Demo', email: 'demo@medidor.dev', senhaHash },
  });

  const categorias = [
    { nome: 'Trabalho', cor: '#2563EB', descricao: 'Atividades profissionais' },
    { nome: 'Estudos', cor: '#16A34A', descricao: 'Cursos, leituras e prática' },
    {
      nome: 'Lazer',
      cor: '#F59E0B',
      descricao: 'Descanso e diversão',
      duracaoPadraoMin: 60, // toda atividade de lazer sugere 1h de duração
    },
    {
      nome: 'Deslocamento',
      cor: '#9333EA',
      descricao: 'Trajetos para o trabalho ou compromissos',
      possuiValor: true,
      valorLabel: 'Custo da passagem (R$)',
      valorPadrao: 4.4,
    },
    {
      nome: 'Poupança',
      cor: '#0D9488',
      descricao: 'Depósitos em conta de investimento',
      possuiValor: true,
      valorLabel: 'Valor do depósito (R$)',
    },
  ];

  for (const c of categorias) {
    await prisma.category.upsert({
      where: { userId_nome: { userId: user.id, nome: c.nome } },
      update: {},
      create: { ...c, userId: user.id },
    });
  }

  console.log('Seed concluído. Login: demo@medidor.dev / senha12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
