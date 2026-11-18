import { isAwaitingApproval } from './attendance-rules';

describe('isAwaitingApproval', () => {
  const approvedAt = new Date('2026-11-17T14:00:00Z');

  it('is never pending when the policy does not require approval', () => {
    expect(isAwaitingApproval(null, false)).toBe(false);
    expect(isAwaitingApproval(approvedAt, false)).toBe(false);
  });

  it('is pending until approved when the policy requires approval', () => {
    expect(isAwaitingApproval(null, true)).toBe(true);
    expect(isAwaitingApproval(approvedAt, true)).toBe(false);
  });

  it('keeps the old behaviour when the record has no policy', () => {
    expect(isAwaitingApproval(null, undefined)).toBe(true);
    expect(isAwaitingApproval(approvedAt, undefined)).toBe(false);
  });
});
