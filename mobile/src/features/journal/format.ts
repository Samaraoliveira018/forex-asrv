export const BREAK_EVEN_TOLERANCE = 0.3;

export function isBreakEven(value: number): boolean {
  return Math.abs(value) <= BREAK_EVEN_TOLERANCE;
}

export function money(value: number, hidden = false): string {
  if (hidden) return '••••••';
  if (isBreakEven(value)) return 'US$ 0,00';
  const sign = value < 0 ? '- ' : '';
  return `${sign}US$ ${Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function signedMoney(value: number, hidden = false): string {
  if (hidden) return '••••••';
  if (isBreakEven(value)) return 'US$ 0,00';
  return `${value > 0 ? '+ ' : '- '}US$ ${Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function signedValue(value: number, hidden = false): string {
  if (hidden) return '••••••';
  if (isBreakEven(value)) {
    return `${value < 0 ? '-' : '+'} US$ ${Math.abs(value).toFixed(2)} (BE)`;
  }
  return `${value > 0 ? '+ ' : '- '}${Math.abs(value).toFixed(2)}`;
}

export function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function signedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/** Exibe a data ISO como dd/mm/aa. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : isoDate;
}

/** Máscara de digitação: 271026 -> 27/10/26. */
export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(Boolean);
  return parts.join('/');
}

/** Converte dd/mm/aa em ISO YYYY-MM-DD (null quando a data é inválida). */
export function parseDateInput(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function numberFrom(value: string): number {
  return Number(value.replace(',', '.'));
}
