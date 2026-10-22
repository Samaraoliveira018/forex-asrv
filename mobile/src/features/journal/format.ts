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

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
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
