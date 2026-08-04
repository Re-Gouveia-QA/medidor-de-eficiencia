import { describe, expect, it } from 'vitest';
import { categoryPresets, findCategoryPreset } from '../../src/config/categoryPresets';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

describe('Dado o catálogo de presets de categorias', () => {
  it('Então cada preset tem id único e pelo menos uma categoria', () => {
    const ids = categoryPresets.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    categoryPresets.forEach((preset) => {
      expect(preset.categorias.length).toBeGreaterThan(0);
    });
  });

  it('Então toda cor de categoria é um hexadecimal válido (mesmo regex de validators.ts)', () => {
    categoryPresets.forEach((preset) => {
      preset.categorias.forEach((categoria) => {
        expect(categoria.cor).toMatch(HEX_COLOR);
      });
    });
  });

  it('Então os nomes de categoria dentro de cada preset são únicos', () => {
    categoryPresets.forEach((preset) => {
      const nomes = preset.categorias.map((categoria) => categoria.nome);
      expect(new Set(nomes).size).toBe(nomes.length);
    });
  });

  describe('Quando busca um preset por id existente', () => {
    it('Então retorna o preset correspondente', () => {
      const preset = findCategoryPreset('estudante');
      expect(preset?.id).toBe('estudante');
    });
  });

  describe('Quando busca um preset por id inexistente', () => {
    it('Então retorna undefined', () => {
      expect(findCategoryPreset('inexistente')).toBeUndefined();
    });
  });
});
