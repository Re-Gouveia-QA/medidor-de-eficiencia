import ptBR from './pt-BR.json';
import enUS from './en-US.json';

/**
 * Fase 0 do RNF04 (i18n en-US) — só a home usa `t()` por enquanto (ver
 * .claude/plans/i18n-en-us-2026-07-24.md). Sem lib externa: dicionário JSON + interpolação
 * simples `{{var}}`, combina com o resto do app (EJS + CSS puro, sem build step de front-end).
 */
export type Locale = 'pt-BR' | 'en-US';

export const DEFAULT_LOCALE: Locale = 'pt-BR';
export const LOCALES: Locale[] = ['pt-BR', 'en-US'];

const dictionaries: Record<Locale, Record<string, string>> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

export function isValidLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

/** Traduz `key` no `locale` dado, interpolando `{{nome}}` a partir de `vars`. Sem tradução
 * encontrada, cai de volta pra própria key — visível o suficiente em dev pra notar uma chave
 * faltando, sem quebrar a renderização da página em produção. */
export function createTranslator(locale: Locale) {
  const dict = dictionaries[locale];
  return (key: string, vars?: Record<string, string | number>): string => {
    let text = dict[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{{${name}}}`, String(value));
      }
    }
    return text;
  };
}
