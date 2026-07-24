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
  // setUTCFullYear (ao contrário de Date.UTC/do construtor Date) não tem a regra legada que
  // interpreta ano de 0-99 como 1900+ano — importante porque activitySchema só valida 4 dígitos
  // no ano, não um intervalo realista (ex.: "0099-01-01" passaria).
  const asUtc = new Date(0);
  asUtc.setUTCFullYear(get('year'), get('month') - 1, get('day'));
  asUtc.setUTCHours(get('hour'), get('minute'), get('second'), 0);
  return asUtc.getTime() - instant.getTime();
}

/**
 * Combina uma data (YYYY-MM-DD) e hora (HH:mm) — interpretadas como horário local no fuso
 * informado (RNF05) — no instante UTC correspondente. Calcula o offset do fuso a partir do
 * instante ingênuo (tratando o horário digitado como se já fosse UTC) e corrige uma vez.
 *
 * Limitação conhecida: no fuso horário de verão (DST), há uma janela de ~1h, duas vezes por
 * ano, em que essa correção única não é exata — a hora "de fim de semana" em que os relógios
 * mudam. Para um horário inexistente (ex.: 02:30 numa zona que pula de 02:00 para 03:00), o
 * resultado desliza para depois do salto (mesma convenção adotada por libs de fuso horário
 * mais completas); para um horário ambíguo (a hora repetida no "voltar" do horário de verão),
 * assume-se o offset anterior à transição. Confirmado experimentalmente: uma correção "dupla"
 * (recalcular o offset no instante já corrigido) piora o resultado nesses casos em vez de
 * melhorar, então não foi adotada — precisão total exigiria uma tzdb completa (ex.:
 * IANA tzdata via alguma lib), fora de escopo aqui. Sem `timeZone`, equivale ao horário já em
 * UTC (offset zero, sem essa limitação) — mesmo comportamento de antes desta função existir.
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

/** Formata um instante UTC como dd/MM no fuso do usuário (RNF05) — usado nas marcações de eixo
 * do gráfico de linha (valor x tempo), onde o horário exato já fica disponível no tooltip. */
export function formatDateShortInZone(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit' }).format(date);
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
