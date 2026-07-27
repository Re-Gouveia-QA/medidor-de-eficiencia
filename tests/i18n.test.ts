import { describe, expect, it } from 'vitest';
import { createTranslator, isValidLocale } from '../src/i18n';

describe('i18n (Fase 0 — RNF04)', () => {
  it('traduz uma chave conhecida em cada locale suportado', () => {
    expect(createTranslator('pt-BR')('home.startForm.submit')).toBe('Iniciar');
    expect(createTranslator('en-US')('home.startForm.submit')).toBe('Start');
  });

  it('interpola variáveis {{var}} no texto traduzido', () => {
    expect(createTranslator('pt-BR')('home.greeting', { name: 'Ana' })).toBe('Bem-vindo(a) de volta, Ana');
    expect(createTranslator('en-US')('home.greeting', { name: 'Ana' })).toBe('Welcome back, Ana');
  });

  it('cai de volta pra própria key quando a tradução não existe', () => {
    expect(createTranslator('pt-BR')('chave.inexistente')).toBe('chave.inexistente');
  });

  it('isValidLocale aceita só os locales suportados', () => {
    expect(isValidLocale('pt-BR')).toBe(true);
    expect(isValidLocale('en-US')).toBe(true);
    expect(isValidLocale('fr-FR')).toBe(false);
    expect(isValidLocale('')).toBe(false);
  });
});
