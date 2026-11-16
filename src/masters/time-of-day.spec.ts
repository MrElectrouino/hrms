import { timeOfDay } from './time-of-day';

describe('timeOfDay', () => {
  it('keeps the clock time whatever timezone the server runs in', () => {
    expect(timeOfDay('10:00').toISOString()).toBe('1970-01-01T10:00:00.000Z');
    expect(timeOfDay('00:05').toISOString()).toBe('1970-01-01T00:05:00.000Z');
    expect(timeOfDay('23:59').toISOString()).toBe('1970-01-01T23:59:00.000Z');
    expect(timeOfDay('09:30:00').toISOString()).toBe('1970-01-01T09:30:00.000Z');
  });
  it('reads back as the same HH:mm', () => {
    expect(timeOfDay('18:45').toISOString().slice(11, 16)).toBe('18:45');
  });
});
