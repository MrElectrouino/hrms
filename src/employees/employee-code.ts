/**
 * Branch wise employee codes: the branch prefix plus a running number ("EA-" gives EA-001, EA-002 ...).
 * The next number is one more than the highest number already used with that prefix, so codes typed by hand
 * (for example EA-315 from the old system) are respected and never repeated.
 */
export function nextCodeNumber(existingCodes: string[], prefix: string): number {
  let highest = 0;
  const p = prefix.toUpperCase();
  for (const code of existingCodes) {
    const c = code.toUpperCase();
    if (!c.startsWith(p)) continue;
    const rest = c.slice(p.length);
    if (/^\d+$/.test(rest)) highest = Math.max(highest, Number(rest));
  }
  return highest + 1;
}

/** At least three digits (EA-007), more when the number needs them (EA-1042). */
export const formatEmployeeCode = (prefix: string, n: number): string => `${prefix.toUpperCase()}${String(n).padStart(3, '0')}`;
