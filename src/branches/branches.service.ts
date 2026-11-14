import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

/** Branches are parameters of type "Branch" (Masters > Parameters); this only reads them. */
@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  private async visibleBranches(onlyIds: number[] | null) {
    const rows = await this.prisma.parameter.findMany({
      where: { isVisible: true, parameterType: { name: 'Branch' }, ...(onlyIds ? { id: { in: onlyIds } } : {}) },
      orderBy: [{ displayOrder: 'asc' }, { text: 'asc' }],
      select: { id: true, text: true, code: true },
    });
    return rows.map((r) => ({ id: r.id, code: r.code ?? '', name: r.text, countryCode: null as string | null }));
  }

  /** Branches the signed-in account can work in (for the header switcher). */
  async mine(user: CurrentUserPayload) {
    return { restricted: user.branchAccess !== null, branches: await this.visibleBranches(user.branchAccess) };
  }

  /** Every active branch, for assigning branch access to an account. */
  async all() {
    return this.visibleBranches(null);
  }
}
