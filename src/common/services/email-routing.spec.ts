import { routeEmail } from './email-routing';

const msg = { to: 'asha@example.test', subject: 'Reset your HRMS password', text: 'Hello', html: '<p>Hello</p>' };

describe('routeEmail', () => {
  it('sends everything to the test mailbox outside production, and says who it was for', () => {
    const r = routeEmail(msg, 'development', 'tester@example.test');
    expect(r.to).toBe('tester@example.test');
    expect(r.subject).toBe('[DEV → asha@example.test] Reset your HRMS password');
    expect(r.text).toContain('meant for asha@example.test');
    expect(r.text).toContain('Hello');
    expect(r.html).toContain('meant for asha@example.test');
    expect(r.html).toContain('<p>Hello</p>');
  });
  it('lists every original recipient', () => {
    const r = routeEmail({ ...msg, to: ['a@x.test', 'b@x.test'] }, 'test', 'tester@example.test');
    expect(r.to).toBe('tester@example.test');
    expect(r.subject).toContain('a@x.test, b@x.test');
  });
  it('never redirects in production, even if the setting is present', () => {
    expect(routeEmail(msg, 'production', 'tester@example.test')).toBe(msg);
  });
  it('does nothing when no test mailbox is set', () => {
    expect(routeEmail(msg, 'development', '')).toBe(msg);
    expect(routeEmail(msg, 'development', '   ')).toBe(msg);
  });
  it('keeps a message that has only text or only html', () => {
    expect(routeEmail({ to: 'a@x.test', subject: 's', text: 't' }, 'development', 'tester@example.test').html).toBeUndefined();
    expect(routeEmail({ to: 'a@x.test', subject: 's', html: '<b>h</b>' }, 'development', 'tester@example.test').text).toBeUndefined();
  });
  it('escapes the original address in the html note', () => {
    expect(routeEmail({ to: 'a<b>@x.test', subject: 's', html: '<p>x</p>' }, 'development', 'tester@example.test').html).toContain('a&lt;b&gt;@x.test');
  });
});
