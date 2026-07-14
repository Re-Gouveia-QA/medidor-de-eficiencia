/**
 * Utilidades de data/hora.
 * RNF05: datas/horários armazenados em UTC e exibidos no fuso do usuário.
 * Regra 5: a duração é sempre calculada pelo sistema.
 */

/** Combina uma data (YYYY-MM-DD) e hora (HH:mm) em um Date UTC. */
export function combineDateTime(dateISO: string, timeHHmm: string): Date {
  return new Date(`${dateISO}T${timeHHmm}:00.000Z`);
}

/**
 * Calcula a duração em minutos entre início e fim.
 * Regra 4: hora de fim deve ser posterior à hora de início.
 * @throws Error se fim <= início
 */
export function calcDurationMin(inicio: Date, fim: Date): number {
  const diffMs = fim.getTime() - inicio.getTime();
  if (diffMs <= 0) {
    throw new Error('A hora de fim deve ser posterior à hora de início.');
  }
  return Math.round(diffMs / 60_000);
}

/** Formata minutos como "Xh Ym" para exibição. */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
