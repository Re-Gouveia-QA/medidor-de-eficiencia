import { describe, expect, it } from 'vitest';
import { calcDurationMin, combineDateTime, formatMinutes, formatTimeInZone } from '../src/utils/time';

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

describe('combineDateTime + formatTimeInZone (RNF05: fuso do usuário)', () => {
  it('sem timezone, mantém o comportamento antigo (horário já em UTC)', () => {
    const d = combineDateTime('2026-07-15', '08:00');
    expect(d.toISOString()).toBe('2026-07-15T08:00:00.000Z');
  });

  it('converte horário local (fuso com offset negativo) para o instante UTC correto', () => {
    // America/Sao_Paulo é UTC-3 (sem horário de verão desde 2019): 08:00 local = 11:00 UTC.
    const d = combineDateTime('2026-07-15', '08:00', 'America/Sao_Paulo');
    expect(d.toISOString()).toBe('2026-07-15T11:00:00.000Z');
  });

  it('converte horário local (fuso com offset positivo) para o instante UTC correto', () => {
    // Asia/Tokyo é UTC+9: 08:00 local = 23:00 UTC do dia anterior.
    const d = combineDateTime('2026-07-15', '08:00', 'Asia/Tokyo');
    expect(d.toISOString()).toBe('2026-07-14T23:00:00.000Z');
  });

  it('round-trip: formatTimeInZone devolve o mesmo horário que foi digitado', () => {
    const d = combineDateTime('2026-07-15', '08:00', 'America/Sao_Paulo');
    expect(formatTimeInZone(d, 'America/Sao_Paulo')).toBe('08:00');
  });

  it('formatTimeInZone sem timezone formata em UTC (compatível com o comportamento antigo)', () => {
    const d = combineDateTime('2026-07-15', '08:00');
    expect(formatTimeInZone(d)).toBe('08:00');
  });
});
