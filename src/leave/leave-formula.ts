/**
 * A tiny, safe calculator for leave formulas such as "workdays * 30 / 365". It understands numbers, the variables below,
 * + - * / ( ) and the functions min(), max(), round(), floor(), ceil(). Nothing is ever run as code.
 *
 * The formula is worked out for each block of days (a month, or part of a month when the service slab changes) and the
 * results are added up. Variables:
 *   workdays      days of the block the person is employed (calendar days)
 *   yearDays      days in the leave year (365 or 366)
 *   annualDays    the days a year for the person's service (from the rule's slabs, or the rule's own number)
 *   serviceMonths whole months of service at the start of the block
 */
export const FORMULA_VARIABLES = ['workdays', 'yearDays', 'annualDays', 'serviceMonths'] as const;
export type FormulaVars = Record<(typeof FORMULA_VARIABLES)[number], number>;

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const v = Number(src.slice(i, j));
      if (Number.isNaN(v)) throw new Error(`"${src.slice(i, j)}" is not a number`);
      out.push({ t: 'num', v });
      i = j;
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j;
    } else if ('+-*/(),'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else throw new Error(`The character "${c}" is not allowed`);
  }
  return out;
}

const FUNCS: Record<string, (...a: number[]) => number> = { min: Math.min, max: Math.max, round: Math.round, floor: Math.floor, ceil: Math.ceil };

export function evalFormula(src: string, vars: FormulaVars): number {
  const toks = tokenize(src);
  if (!toks.length) throw new Error('The formula is empty');
  let p = 0;
  const isOp = (...ops: string[]) => {
    const t = toks[p];
    return !!t && t.t === 'op' && ops.includes(t.v);
  };
  const eat = (v?: string): Tok => {
    const t = toks[p];
    if (!t || (v !== undefined && !(t.t === 'op' && t.v === v))) throw new Error(v ? `Expected "${v}"` : 'The formula ends too early');
    p++;
    return t;
  };
  const expr = (): number => {
    let x = term();
    while (isOp('+', '-')) x = eat().v === '+' ? x + term() : x - term();
    return x;
  };
  const term = (): number => {
    let x = unary();
    while (isOp('*', '/')) {
      const op = eat().v;
      const y = unary();
      if (op === '/' && y === 0) throw new Error('The formula divides by zero');
      x = op === '*' ? x * y : x / y;
    }
    return x;
  };
  const unary = (): number => {
    if (isOp('-')) {
      eat();
      return -unary();
    }
    return atom();
  };
  const atom = (): number => {
    const t = eat();
    if (t.t === 'num') return t.v;
    if (t.t === 'op' && t.v === '(') {
      const x = expr();
      eat(')');
      return x;
    }
    if (t.t === 'id') {
      if (isOp('(')) {
        const f = FUNCS[t.v];
        if (!f) throw new Error(`Unknown function "${t.v}"`);
        eat('(');
        const args = [expr()];
        while (isOp(',')) {
          eat(',');
          args.push(expr());
        }
        eat(')');
        return f(...args);
      }
      if (!(FORMULA_VARIABLES as readonly string[]).includes(t.v)) throw new Error(`Unknown name "${t.v}". Use: ${FORMULA_VARIABLES.join(', ')}`);
      return vars[t.v as keyof FormulaVars];
    }
    throw new Error(`Unexpected "${t.v}"`);
  };
  const result = expr();
  if (p < toks.length) throw new Error(`Unexpected "${toks[p].v}"`);
  if (!Number.isFinite(result)) throw new Error('The formula does not give a number');
  return result;
}

/** Null when the formula is fine, otherwise a plain-language problem. */
export function checkFormula(src: string): string | null {
  try {
    evalFormula(src, { workdays: 30, yearDays: 365, annualDays: 30, serviceMonths: 12 });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/* ------------------------------------------------------------------ carry forward by employee category */

/** KEEP: stays as the same leave. UNPAID_LEAVE: becomes days of another (unpaid) leave type. LEAVE_SALARY: paid out, recorded for payroll. LAPSE: lost. */
export type CarryAction = 'KEEP' | 'UNPAID_LEAVE' | 'LEAVE_SALARY' | 'LAPSE';
export interface CarryRule {
  /** The Employee Category text (for example "Blue Collar"). Empty or "*" matches everybody else. */
  category: string;
  action: CarryAction;
  /** For UNPAID_LEAVE: the leave type the days become. */
  targetLeaveTypeId?: number | null;
}

/** The rule for this person's category: an exact category match first, then a catch-all, otherwise KEEP. */
export function pickCarryRule(rules: CarryRule[], category: string | null): CarryRule {
  const c = (category ?? '').trim().toLowerCase();
  return (
    rules.find((r) => c && r.category.trim().toLowerCase() === c) ??
    rules.find((r) => !r.category.trim() || r.category.trim() === '*') ?? { category: '*', action: 'KEEP' }
  );
}
