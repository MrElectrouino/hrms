import { generateTemporaryPassword } from './crypto.util';

const RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

describe('generateTemporaryPassword', () => {
  it('always meets the password rules', () => {
    for (let i = 0; i < 500; i++) expect(generateTemporaryPassword()).toMatch(RULES);
  });
  it('has the requested length (at least 8) and no look-alike characters', () => {
    expect(generateTemporaryPassword()).toHaveLength(14);
    expect(generateTemporaryPassword(20)).toHaveLength(20);
    expect(generateTemporaryPassword(3)).toHaveLength(8);
    for (let i = 0; i < 200; i++) expect(generateTemporaryPassword()).not.toMatch(/[0O1lI]/);
  });
  it('is different every time', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateTemporaryPassword()));
    expect(seen.size).toBe(200);
  });
});
