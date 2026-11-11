import { serializeBigInt } from './response.interceptor';

describe('serializeBigInt', () => {
  it('converts BigInt values at any depth to strings', () => {
    const input = { id: 1, profile: { photoFileId: BigInt(42), files: [{ id: BigInt(7) }] }, total: BigInt('9007199254740993') };
    const out = serializeBigInt(input);
    expect(out).toEqual({ id: 1, profile: { photoFileId: '42', files: [{ id: '7' }] }, total: '9007199254740993' });
    expect(() => JSON.stringify(out)).not.toThrow();
  });

  it('keeps Dates, nulls and primitives unchanged', () => {
    const d = new Date('2026-11-11T00:00:00Z');
    const out = serializeBigInt({ at: d, n: null, s: 'x', b: true, u: undefined });
    expect(out.at).toBe(d);
    expect(out).toMatchObject({ n: null, s: 'x', b: true });
  });
});
