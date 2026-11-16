/**
 * A "time of day" (HH:mm) as stored in a Postgres TIME column: a date on 1 January 1970 in UTC.
 * Always UTC. Without the Z the server's own timezone would shift the time (10:00 became 04:30 on a server in UTC+5:30).
 */
export function timeOfDay(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm.length === 5 ? `${hhmm}:00` : hhmm}.000Z`);
}
