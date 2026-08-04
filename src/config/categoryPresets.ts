/**
 * Modelos prontos de categorias por caso de uso (ver .claude/plans/category-setup-templates-2026-08-04.md).
 * Configuração estática — presets são dados do sistema, não do usuário, então não há model/migration
 * própria: `SetupController` cria as categorias via `CategoryModel.create` já existente.
 *
 * `nome`/`descricao` das categorias ficam em pt-BR literal (mesmo padrão de `prisma/seed.ts`) — são
 * dados do usuário a partir do momento em que são criados, editáveis por ele depois, não texto de
 * interface. `titleKey`/`descriptionKey`/`usageKey` são chaves de i18n (resolvidas via `t()` no
 * controller/view, mesmo padrão de `validators.ts`), porque essas sim são copy de interface.
 */

export interface CategoryPresetCategory {
  nome: string;
  cor: string;
  descricao?: string;
  tempoDesejadoMin?: number;
  possuiValor?: boolean;
  valorLabel?: string;
  valorPadrao?: number;
  duracaoPadraoMin?: number;
}

export interface CategoryPreset {
  id: string;
  titleKey: string;
  descriptionKey: string;
  usageKey: string;
  categorias: CategoryPresetCategory[];
}

export const categoryPresets: CategoryPreset[] = [
  {
    id: 'estudante',
    titleKey: 'categories.setup.estudante.title',
    descriptionKey: 'categories.setup.estudante.description',
    usageKey: 'categories.setup.estudante.usage',
    categorias: [
      { nome: 'Aulas', cor: '#2563EB', descricao: 'Aulas presenciais ou online, gravadas ou ao vivo' },
      {
        nome: 'Estudo e Revisão',
        cor: '#16A34A',
        descricao: 'Leitura de matéria, resumos, revisão de conteúdo',
        tempoDesejadoMin: 120,
      },
      { nome: 'Trabalhos e Provas', cor: '#F59E0B', descricao: 'Produção de trabalhos, provas e avaliações' },
      { nome: 'Leitura', cor: '#9333EA', descricao: 'Livros e materiais complementares', duracaoPadraoMin: 30 },
    ],
  },
  {
    id: 'concurseiro',
    titleKey: 'categories.setup.concurseiro.title',
    descriptionKey: 'categories.setup.concurseiro.description',
    usageKey: 'categories.setup.concurseiro.usage',
    categorias: [
      {
        nome: 'Teoria',
        cor: '#0D9488',
        descricao: 'Estudo de matéria nova, videoaulas, apostilas',
        tempoDesejadoMin: 90,
      },
      { nome: 'Revisão', cor: '#2563EB', descricao: 'Revisão espaçada do que já foi estudado', tempoDesejadoMin: 60 },
      {
        nome: 'Questões',
        cor: '#DC2626',
        descricao: 'Resolução de exercícios e questões de provas anteriores',
        tempoDesejadoMin: 60,
      },
      {
        nome: 'Redação',
        cor: '#9333EA',
        descricao: 'Prática de redação/discursiva, quando aplicável ao concurso',
        duracaoPadraoMin: 60,
      },
      { nome: 'Simulado', cor: '#F59E0B', descricao: 'Simulados completos, cronometrados' },
    ],
  },
  {
    id: 'financas-pessoais',
    titleKey: 'categories.setup.financasPessoais.title',
    descriptionKey: 'categories.setup.financasPessoais.description',
    usageKey: 'categories.setup.financasPessoais.usage',
    categorias: [
      {
        nome: 'Receitas',
        cor: '#16A34A',
        descricao: 'Salário, freelas, outras entradas',
        possuiValor: true,
        valorLabel: 'Valor recebido (R$)',
      },
      {
        nome: 'Contas fixas',
        cor: '#DC2626',
        descricao: 'Aluguel, contas, assinaturas',
        possuiValor: true,
        valorLabel: 'Valor pago (R$)',
      },
      {
        nome: 'Compras e lazer',
        cor: '#F59E0B',
        descricao: 'Gastos variáveis do dia a dia',
        possuiValor: true,
        valorLabel: 'Valor gasto (R$)',
      },
      {
        nome: 'Poupança e investimentos',
        cor: '#0D9488',
        descricao: 'Depósitos em poupança, aportes',
        possuiValor: true,
        valorLabel: 'Valor investido (R$)',
      },
    ],
  },
  {
    id: 'academia',
    titleKey: 'categories.setup.academia.title',
    descriptionKey: 'categories.setup.academia.description',
    usageKey: 'categories.setup.academia.usage',
    categorias: [
      { nome: 'Musculação', cor: '#2563EB', duracaoPadraoMin: 60 },
      { nome: 'Cardio', cor: '#DC2626', duracaoPadraoMin: 30 },
      { nome: 'Alongamento e mobilidade', cor: '#16A34A', duracaoPadraoMin: 15 },
      { nome: 'Aula em grupo', cor: '#9333EA', descricao: 'Crossfit, funcional, spinning, etc.', duracaoPadraoMin: 45 },
    ],
  },
  {
    id: 'diario-pessoal',
    titleKey: 'categories.setup.diarioPessoal.title',
    descriptionKey: 'categories.setup.diarioPessoal.description',
    usageKey: 'categories.setup.diarioPessoal.usage',
    categorias: [
      { nome: 'Reflexão do dia', cor: '#2563EB', descricao: 'O que aconteceu, o que você sentiu', duracaoPadraoMin: 10 },
      { nome: 'Gratidão', cor: '#F59E0B', duracaoPadraoMin: 5 },
      { nome: 'Humor e emoções', cor: '#9333EA', duracaoPadraoMin: 5 },
      {
        nome: 'Metas e planejamento',
        cor: '#16A34A',
        descricao: 'O que você quer fazer amanhã/essa semana',
        duracaoPadraoMin: 10,
      },
    ],
  },
];

export function findCategoryPreset(id: string): CategoryPreset | undefined {
  return categoryPresets.find((preset) => preset.id === id);
}
