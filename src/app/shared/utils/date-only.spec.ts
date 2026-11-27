import { addDaysToDateOnly, localDateOnlyFromInstant, toLocalDateOnly } from './date-only';

describe('date-only helpers', () => {
  it('preserves the local calendar date at the end of the day', () => {
    expect(toLocalDateOnly(new Date(2026, 10, 27, 23, 59, 59))).toBe('2026-11-27');
  });

  it('adds calendar days across year and leap-day boundaries', () => {
    expect(addDaysToDateOnly('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateOnly('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('converts a timestamp to the device local calendar date', () => {
    const instant = new Date(2026, 10, 27, 23, 30).toISOString();
    expect(localDateOnlyFromInstant(instant)).toBe('2026-11-27');
  });
});
