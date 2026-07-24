import { describe, expect, it } from 'vitest';
import { buildLineChartGeometry } from '../src/utils/chart';

describe('buildLineChartGeometry (relatório valor x tempo)', () => {
  it('retorna geometria vazia sem pontos', () => {
    expect(buildLineChartGeometry([])).toEqual({ points: '', circles: [], minY: 0, maxY: 0 });
  });

  it('ponto único: sem linha (points vazio), 1 círculo centralizado', () => {
    const geometry = buildLineChartGeometry([{ x: 100, y: 5 }], { width: 200, height: 100, padding: 20 });
    expect(geometry.points).toBe('');
    expect(geometry.circles).toEqual([{ x: 100, y: 50 }]);
    expect(geometry.minY).toBe(5);
    expect(geometry.maxY).toBe(5);
  });

  it('todos os valores de y iguais: centraliza verticalmente sem dividir por zero', () => {
    const geometry = buildLineChartGeometry(
      [{ x: 0, y: 10 }, { x: 100, y: 10 }],
      { width: 200, height: 100, padding: 0 },
    );
    expect(geometry.circles.every((c) => c.y === 50)).toBe(true);
    expect(geometry.points).not.toBe('');
  });

  it('caso normal: normaliza x/y pro viewBox, maior valor de y fica no topo (menor y em SVG)', () => {
    const geometry = buildLineChartGeometry(
      [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      { width: 100, height: 100, padding: 0 },
    );
    expect(geometry.circles[0]).toEqual({ x: 0, y: 100 });
    expect(geometry.circles[1]).toEqual({ x: 100, y: 0 });
    expect(geometry.points).toBe('0,100 100,0');
    expect(geometry.minY).toBe(0);
    expect(geometry.maxY).toBe(100);
  });
});
