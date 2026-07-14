import { describe, expect, it } from 'vitest';
import { calcDurationMin, combineDateTime, formatMinutes } from '../src/utils/time';

describe('calcDurationMin (regra 5: duração calculada pelo sistema)', () => {
  it('calcula a duração em minutos', () => {
    const inicio = combineDateTime('2026-07-14', '09:00');
    const fim = combineDateTime('2026-07-14', '10:30');
    expect(calcDurationMin(inicio, fim)).toBe(90);
  });

  it('rejeita hora de fim anterior à hora de início (regra 4)', () => {
    const inicio = combineDateTime('2026-07-14', '10:00');
    const fim = combineDateTime('2026-07-14', '09:00');
    expect(() => calcDurationMin(inicio, fim)).toThrow();
  });

  it('rejeita hora de fim igual à hora de início', () => {
    const t = combineDateTime('2026-07-14', '10:00');
    expect(() => calcDurationMin(t, t)).toThrow();
  });
});

describe('formatMinutes', () => {
  it('formata minutos, horas e combinações', () => {
    expect(formatMinutes(45)).toBe('45min');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(150)).toBe('2h 30min');
  });
});
