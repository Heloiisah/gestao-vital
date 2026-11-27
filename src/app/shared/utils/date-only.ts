export function toLocalDateOnly(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = new Date(year, month - 1, day + days, 12);
  return toLocalDateOnly(date);
}

export function localDateOnlyFromInstant(instant: string): string {
  return toLocalDateOnly(new Date(instant));
}
