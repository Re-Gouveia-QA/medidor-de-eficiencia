/** Utilidades de formatação de exibição (não usar para valores de formulário — inputs numéricos precisam do ponto decimal). */

type Numeric = number | string | { toNumber(): number } | null | undefined;

/** Formata um valor numérico no padrão pt-BR (vírgula decimal, 2 casas). */
export function formatNumber(value: Numeric): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'object' ? value.toNumber() : Number(value);
  if (Number.isNaN(n)) return '';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
