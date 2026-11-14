import { ForbiddenException } from '@nestjs/common';
import { DocumentAccessGuard, EmployeeBranchGuard } from './branch-access.guard';
import { HrWriteGuard } from './hr-write.guard';
import { UserType } from '../constants/user-types';

const ctx = (req: Record<string, unknown>) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;
const user = (userTypeId: number, extra: Record<string, unknown> = {}) => ({ userId: 1, profileId: 100, userTypeId, sessionId: '1', mustChangePassword: false, branchAccess: null, activeBranchIds: null, ...extra });

describe('HrWriteGuard', () => {
  const guard = new HrWriteGuard();
  it('lets anyone read', () => {
    expect(guard.canActivate(ctx({ method: 'GET', user: user(UserType.Executive) }))).toBe(true);
  });
  it('only HR and System Admin may write', () => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      expect(() => guard.canActivate(ctx({ method, user: user(UserType.Executive) }))).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx({ method, user: user(UserType.Manager) }))).toThrow(ForbiddenException);
      expect(guard.canActivate(ctx({ method, user: user(UserType.HRAdmin) }))).toBe(true);
      expect(guard.canActivate(ctx({ method, user: user(UserType.SystemAdmin) }))).toBe(true);
    }
  });
});

describe('EmployeeBranchGuard', () => {
  const employees: Record<number, { branchId: number | null; profileId: number; reportingToId: number | null }> = {
    5: { branchId: 1, profileId: 100, reportingToId: 9 }, // the caller's own record
    6: { branchId: 1, profileId: 200, reportingToId: 7 }, // reports to the caller (employee id 7)
    8: { branchId: 2, profileId: 300, reportingToId: null }, // someone else
  };
  const prisma = {
    employee: {
      findUnique: jest.fn(async ({ where }: any) => (where.id ? employees[where.id] ?? null : where.profileId === 100 ? { id: 7 } : null)),
    },
  } as any;
  const guard = new EmployeeBranchGuard(prisma);
  const call = (u: any, id: number | undefined) => guard.canActivate(ctx({ user: u, params: id === undefined ? {} : { id: String(id) } }));

  it('HR with no branch limit goes straight through', async () => {
    prisma.employee.findUnique.mockClear();
    expect(await call(user(UserType.HRAdmin), 8)).toBe(true);
    expect(prisma.employee.findUnique).not.toHaveBeenCalled();
  });
  it('anyone can open their own record', async () => {
    expect(await call(user(UserType.Executive), 5)).toBe(true);
  });
  it('a manager can open the record of someone who reports to them, nobody else', async () => {
    expect(await call(user(UserType.Manager), 6)).toBe(true);
    await expect(call(user(UserType.Manager), 8)).rejects.toThrow(ForbiddenException);
  });
  it('a regular user cannot open another employee', async () => {
    await expect(call(user(UserType.Executive), 8)).rejects.toThrow(ForbiddenException);
  });
  it('HR limited to some branches cannot open an employee of another branch', async () => {
    await expect(call(user(UserType.HRAdmin, { branchAccess: [1] }), 8)).rejects.toThrow(ForbiddenException);
    expect(await call(user(UserType.HRAdmin, { branchAccess: [1] }), 6)).toBe(true);
  });
  it('routes without an employee id are not checked here', async () => {
    expect(await call(user(UserType.Executive), undefined)).toBe(true);
  });
});

describe('DocumentAccessGuard', () => {
  const prisma = { document: { findUnique: jest.fn(async ({ where }: any) => (where.id === BigInt(1) ? { profileId: 100 } : where.id === BigInt(2) ? { profileId: 200 } : null)) } } as any;
  const guard = new DocumentAccessGuard(prisma);
  const call = (u: any, method: string, path: string, extra: Record<string, unknown> = {}) => guard.canActivate(ctx({ user: u, method, route: { path }, params: extra.params ?? {}, body: extra.body ?? {} }));
  const emp = user(UserType.Executive);

  it('HR can do everything', async () => {
    expect(await call(user(UserType.HRAdmin), 'GET', '/documents/expiring')).toBe(true);
    expect(await call(user(UserType.HRAdmin), 'DELETE', '/documents/:id', { params: { id: '2' } })).toBe(true);
  });
  it('anyone can list (narrowed by the service) and add a document for themselves', async () => {
    expect(await call(emp, 'GET', '/documents')).toBe(true);
    expect(await call(emp, 'POST', '/documents', { body: { profileId: 100 } })).toBe(true);
  });
  it('but not add one for somebody else, or use the expiry reports and scheduler', async () => {
    await expect(call(emp, 'POST', '/documents', { body: { profileId: 200 } })).rejects.toThrow(ForbiddenException);
    await expect(call(emp, 'GET', '/documents/expiring')).rejects.toThrow(ForbiddenException);
    await expect(call(emp, 'GET', '/documents/expired')).rejects.toThrow(ForbiddenException);
    await expect(call(emp, 'POST', '/documents/scheduler/run')).rejects.toThrow(ForbiddenException);
  });
  it('reads and attaches files to their own document only', async () => {
    expect(await call(emp, 'GET', '/documents/:id', { params: { id: '1' } })).toBe(true);
    expect(await call(emp, 'POST', '/documents/:id/files', { params: { id: '1' } })).toBe(true);
    await expect(call(emp, 'GET', '/documents/:id', { params: { id: '2' } })).rejects.toThrow(ForbiddenException);
    await expect(call(emp, 'GET', '/documents/:id/files/:fileId/download', { params: { id: '2' } })).rejects.toThrow(ForbiddenException);
  });
  it('cannot change or remove a document, even their own', async () => {
    await expect(call(emp, 'PATCH', '/documents/:id', { params: { id: '1' } })).rejects.toThrow(ForbiddenException);
    await expect(call(emp, 'DELETE', '/documents/:id', { params: { id: '1' } })).rejects.toThrow(ForbiddenException);
    await expect(call(emp, 'DELETE', '/documents/:id/files/:fileId', { params: { id: '1' } })).rejects.toThrow(ForbiddenException);
  });
});
