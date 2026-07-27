/** Utilidades de formatação de exibição (não usar para valores de formulário — inputs numéricos precisam do ponto decimal). */
import { DEFAULT_LOCALE, Locale } from '../i18n';

type Numeric = number | string | { toNumber(): number } | null | undefined;

/** Formata um valor numérico no padrão do locale (RNF04) — vírgula decimal em pt-BR, ponto em en-US. */
export function formatNumber(value: Numeric, locale: Locale = DEFAULT_LOCALE): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'object' ? value.toNumber() : Number(value);
  if (Number.isNaN(n)) return '';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
