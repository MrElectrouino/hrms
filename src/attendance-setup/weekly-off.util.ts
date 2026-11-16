import { Prisma } from '@prisma/client';

/** 0 = Sunday ... 6 = Saturday, the same as JavaScript's getUTCDay(). */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** "Saturday, Sunday" style text for a list of weekday numbers, in week order starting Monday. */
export function describeDays(days: number[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.filter((d) => days.includes(d)).map((d) => DAY_NAMES[d]).join(', ');
}

/** Problems with a set of weekly off days. Empty = fine. */
export function validateDays(days: number[]): string[] {
  const problems: string[] = [];
  if (!days.length) problems.push('Choose at least one day');
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) problems.push('Days must be Sunday to Saturday');
  if (new Set(days).size !== days.length) problems.push('A day is listed twice');
  if (new Set(days).size >= 7) problems.push('At least one day of the week must be a working day');
  return problems;
}

type Db = Pick<Prisma.TransactionClient, 'employeeWeeklyOff'>;

const dayBefore = (d: Date) => new Date(d.getTime() - 86_400_000);

/**
 * Makes `templateId` (or nothing, when null) the employee's weekly off from `from` on.
 * Earlier assignments keep their history: one that is still running is ended the day before.
 * Returns false when nothing needed changing.
 */
export async function assignWeeklyOff(db: Db, employeeId: number, templateId: number | null, from: Date): Promise<boolean> {
  const running = await db.employeeWeeklyOff.findMany({
    where: { employeeId, OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] },
    orderBy: { effectiveFrom: 'asc' },
  });
  const current = running.find((a) => a.effectiveFrom <= from);
  if (current && current.templateId === templateId && current.effectiveTo === null && running.length === 1) return false;
  if (!current && templateId === null && running.length === 0) return false;

  for (const a of running) {
    if (a.effectiveFrom >= from) await db.employeeWeeklyOff.delete({ where: { id: a.id } });
    else await db.employeeWeeklyOff.update({ where: { id: a.id }, data: { effectiveTo: dayBefore(from) } });
  }
  if (templateId !== null) await db.employeeWeeklyOff.create({ data: { employeeId, templateId, effectiveFrom: from } });
  return true;
}
