import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { HR_USER_TYPES } from './hr-write.guard';

const DENIED = 'You do not have access to this branch';

function assertBranch(user: CurrentUserPayload, branchId: number | null | undefined) {
  if (user.branchAccess === null) return;
  if (branchId === null || branchId === undefined || !user.branchAccess.includes(branchId)) {
    throw new ForbiddenException(DENIED);
  }
}

/**
 * Routes with an employee id (`:id`).
 *  - HR and System Admin may open any employee (within their branches, when restricted).
 *  - Everyone else may open their own record, or the record of someone who reports to them.
 */
@Injectable()
export class EmployeeBranchGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as CurrentUserPayload | undefined;
    if (!user) return true;
    const id = Number(req.params?.id);
    if (!Number.isInteger(id)) return true;
    const isHr = HR_USER_TYPES.includes(user.userTypeId);
    if (isHr && user.branchAccess === null) return true;
    const employee = await this.prisma.employee.findUnique({ where: { id }, select: { branchId: true, profileId: true, reportingToId: true } });
    if (!employee) return true; // the handler reports "not found"
    if (employee.profileId === user.profileId) return true; // always your own record
    if (!isHr) {
      const me = await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true } });
      if (!me || employee.reportingToId !== me.id) throw new ForbiddenException('You can only open your own record or your team\'s');
    }
    assertBranch(user, employee.branchId);
    return true;
  }
}

/**
 * Document routes: `:id` is a document id, and a create call carries `profileId` in the body.
 * The document's employee must belong to one of the account's branches.
 */
@Injectable()
export class DocumentBranchGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as CurrentUserPayload | undefined;
    if (!user || user.branchAccess === null) return true;

    let profileId: number | undefined;
    if (/^\d+$/.test(String(req.params?.id ?? ''))) {
      const doc = await this.prisma.document.findUnique({ where: { id: BigInt(req.params.id) }, select: { profileId: true } });
      if (!doc) return true;
      profileId = doc.profileId;
    } else if (req.body && req.body.profileId !== undefined) {
      profileId = Number(req.body.profileId);
    }
    if (profileId === undefined || !Number.isInteger(profileId)) return true;

    const employee = await this.prisma.employee.findUnique({ where: { profileId }, select: { branchId: true } });
    assertBranch(user, employee?.branchId);
    return true;
  }
}

/** Same check for routes that carry the employee in the body (`employeeId`). */
@Injectable()
export class EmployeeBodyBranchGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as CurrentUserPayload | undefined;
    if (!user || user.branchAccess === null) return true;
    const id = Number(req.body?.employeeId);
    if (!Number.isInteger(id)) return true;
    const employee = await this.prisma.employee.findUnique({ where: { id }, select: { branchId: true } });
    if (!employee) return true;
    assertBranch(user, employee.branchId);
    return true;
  }
}

/**
 * Documents: HR works with everyone's. Anyone else sees and adds documents for their own profile only,
 * cannot change or remove one, and has no access to the expiry reports or the scheduler.
 */
@Injectable()
export class DocumentAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as CurrentUserPayload | undefined;
    if (!user || HR_USER_TYPES.includes(user.userTypeId)) return true;

    const method = String(req.method).toUpperCase();
    const path = String(req.route?.path ?? req.path ?? '');
    const tail = path.replace(/^.*\/documents/, '');
    const idRaw = req.params?.id;

    // Collection routes
    if (idRaw === undefined) {
      if (tail === '' || tail === '/') {
        if (method === 'GET') return true; // the service narrows the list to your own documents
        if (method === 'POST' && Number(req.body?.profileId) === user.profileId) return true;
      }
      throw new ForbiddenException('Only HR can use this');
    }

    // A single document
    if (/^\d+$/.test(String(idRaw))) {
      const doc = await this.prisma.document.findUnique({ where: { id: BigInt(idRaw) }, select: { profileId: true } });
      if (!doc) return true; // the handler reports "not found"
      if (doc.profileId !== user.profileId) throw new ForbiddenException('You can only use your own documents');
      if (method === 'PATCH' || method === 'DELETE') throw new ForbiddenException('Only HR can change or remove a document');
    }
    return true;
  }
}
