/**
 * Utilidades de data/hora.
 * RNF05: datas/horários armazenados em UTC e exibidos no fuso do usuário.
 * Regra 5: a duração é sempre calculada pelo sistema.
 */

export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Offset (ms) do fuso em relação a UTC no instante informado (já considera DST).
 * Só usa Intl — sem dependência de lib de fuso horário.
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - instant.getTime();
}

/**
 * Combina uma data (YYYY-MM-DD) e hora (HH:mm) — interpretadas como horário local no fuso
 * informado (RNF05) — no instante UTC correspondente. Calcula o offset do fuso num instante
 * aproximado e corrige uma vez; impreciso apenas na hora exata de uma transição de DST
 * (raríssimo, aceitável sem uma tzdb completa). Sem `timeZone`, equivale ao horário já em UTC
 * (offset zero) — mesmo comportamento de antes desta função existir.
 */
export function combineDateTime(dateISO: string, timeHHmm: string, timeZone: string = DEFAULT_TIMEZONE): Date {
  const naiveUtc = new Date(`${dateISO}T${timeHHmm}:00.000Z`);
  const offsetMs = timeZoneOffsetMs(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offsetMs);
}

/** Formata um instante UTC como HH:mm no fuso do usuário (RNF05). */
export function formatTimeInZone(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    date,
  );
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
