import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { MenuPermissionItemDto } from './dto/menu-permission-item.dto';
import { MenuOverrideItemDto } from './dto/menu-override-item.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';

export interface MenuNode {
  id: number;
  name: string;
  pageUrl?: string | null;
  iconClass?: string | null;
  displayOrder: number;
  isMainMenu: boolean;
  isActive: boolean;
  permissions?: {
    isCreate: boolean;
    isEdit: boolean;
    isDelete: boolean;
  };
  override?: {
    isInclude: boolean;
  };
  children: MenuNode[];
}

interface MenuRow {
  id: number;
  parentId: number | null;
  name: string;
  pageUrl: string | null;
  iconClass: string | null;
  displayOrder: number;
  isMainMenu: boolean;
  isActive: boolean;
}

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listUserTypes() {
    return this.prisma.userType.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async listRoles() {
    return this.prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async listMenuItems() {
    return this.prisma.menuItem.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async getMenuTree() {
    const items = await this.prisma.menuItem.findMany({ orderBy: { displayOrder: 'asc' } });
    return this.buildTree(items);
  }

  // ---------------------------------------------------------------------------
  // Menu items (menu management)
  // ---------------------------------------------------------------------------

  async createMenuItem(dto: CreateMenuItemDto, actorProfileId?: number, ip?: string) {
    if (dto.parentId != null) {
      await this.assertMenuItemExists(dto.parentId);
    }

    const item = await this.prisma.menuItem.create({
      data: {
        name: dto.name.trim(),
        pageUrl: dto.pageUrl ?? null,
        iconClass: dto.iconClass ?? null,
        displayOrder: dto.displayOrder,
        parentId: dto.parentId ?? null,
        isMainMenu: dto.isMainMenu ?? true,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      actorProfileId,
      action: 'MENU_ITEM_CREATED',
      entityType: 'MenuItem',
      entityId: String(item.id),
      ipAddress: ip,
    });
    return item;
  }

  async updateMenuItem(id: number, dto: UpdateMenuItemDto, actorProfileId?: number, ip?: string) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menu item not found');

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.assertMenuItemExists(dto.parentId);
      await this.assertNoCycle(id, dto.parentId);
    }

    const item = await this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.pageUrl !== undefined ? { pageUrl: dto.pageUrl } : {}),
        ...(dto.iconClass !== undefined ? { iconClass: dto.iconClass } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.isMainMenu !== undefined ? { isMainMenu: dto.isMainMenu } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.audit.log({
      actorProfileId,
      action: 'MENU_ITEM_UPDATED',
      entityType: 'MenuItem',
      entityId: String(id),
      ipAddress: ip,
      metadata: { changes: Object.keys(dto) },
    });
    return item;
  }

  // ---------------------------------------------------------------------------
  // Role rights by user type (menu permissions)
  // ---------------------------------------------------------------------------

  async getMenuPermissions(userTypeId: number) {
    await this.assertUserTypeExists(userTypeId);
    return this.prisma.menuUserTypePermission.findMany({
      where: { userTypeId },
      include: {
        menuItem: { select: { id: true, name: true, pageUrl: true, displayOrder: true } },
      },
    });
  }

  async setMenuPermissions(
    userTypeId: number,
    permissions: MenuPermissionItemDto[],
    actorProfileId?: number,
    ip?: string,
  ) {
    await this.assertUserTypeExists(userTypeId);
    await this.assertMenuItemsExist(permissions.map((p) => p.menuItemId));

    await this.prisma.$transaction([
      this.prisma.menuUserTypePermission.deleteMany({ where: { userTypeId } }),
      this.prisma.menuUserTypePermission.createMany({
        data: permissions.map((p) => ({
          userTypeId,
          menuItemId: p.menuItemId,
          pageUrlOverride: p.pageUrlOverride ?? null,
          isCreate: p.isCreate ?? false,
          isEdit: p.isEdit ?? false,
          isDelete: p.isDelete ?? false,
        })),
      }),
    ]);

    await this.audit.log({
      actorProfileId,
      action: 'MENU_PERMISSIONS_UPDATED',
      entityType: 'UserType',
      entityId: String(userTypeId),
      ipAddress: ip,
      metadata: { count: permissions.length },
    });

    return this.getMenuPermissions(userTypeId);
  }

  // ---------------------------------------------------------------------------
  // Per-user menu overrides
  // ---------------------------------------------------------------------------

  async getMenuOverrides(userId: number) {
    await this.assertUserExists(userId);
    return this.prisma.menuUserOverride.findMany({
      where: { userId },
      include: {
        menuItem: { select: { id: true, name: true, pageUrl: true, displayOrder: true } },
      },
    });
  }

  async setMenuOverrides(
    userId: number,
    overrides: MenuOverrideItemDto[],
    actorProfileId?: number,
    ip?: string,
  ) {
    await this.assertUserExists(userId);
    await this.assertMenuItemsExist(overrides.map((o) => o.menuItemId));

    await this.prisma.$transaction([
      this.prisma.menuUserOverride.deleteMany({ where: { userId } }),
      this.prisma.menuUserOverride.createMany({
        data: overrides.map((o) => ({
          userId,
          menuItemId: o.menuItemId,
          isInclude: o.isInclude,
          pageUrlOverride: o.pageUrlOverride ?? null,
        })),
      }),
    ]);

    await this.audit.log({
      actorProfileId,
      action: 'MENU_OVERRIDES_UPDATED',
      entityType: 'User',
      entityId: String(userId),
      ipAddress: ip,
      metadata: { count: overrides.length },
    });

    return this.getMenuOverrides(userId);
  }

  // ---------------------------------------------------------------------------
  // Effective menu for the signed-in user (GetSiteUserMenuItem, BR-UM-30)
  // ---------------------------------------------------------------------------

  /**
   * Visible items = the user type's base rights, adjusted by the user's
   * per-item include/exclude overrides. Group headers are shown when a visible
   * item sits under them, so a page is never reachable only through a hidden
   * parent. An item whose parent chain contains a missing or inactive item is hidden.
   */
  async getMyMenu(userId: number, userTypeId: number): Promise<MenuNode[]> {
    const [allItems, basePermissions, overrides] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.menuUserTypePermission.findMany({ where: { userTypeId } }),
      this.prisma.menuUserOverride.findMany({ where: { userId } }),
    ]);

    const itemById = new Map<number, MenuRow>(allItems.map((i) => [i.id, i]));
    const baseMap = new Map(basePermissions.map((p) => [p.menuItemId, p]));
    const overrideMap = new Map(overrides.map((o) => [o.menuItemId, o]));

    const visible = new Set<number>();
    for (const item of allItems) {
      const base = baseMap.get(item.id);
      const override = overrideMap.get(item.id);
      const included = override ? override.isInclude : !!base;
      if (!included || !this.hasActiveAncestorChain(item, itemById)) continue;

      let current: MenuRow | undefined = item;
      while (current && !visible.has(current.id)) {
        visible.add(current.id);
        current = current.parentId !== null ? itemById.get(current.parentId) : undefined;
      }
    }

    const nodes = allItems
      .filter((item) => visible.has(item.id))
      .map((item) => {
        const base = baseMap.get(item.id);
        const override = overrideMap.get(item.id);
        return {
          ...item,
          effectivePageUrl: override?.pageUrlOverride ?? base?.pageUrlOverride ?? item.pageUrl,
          permissions: base
            ? { isCreate: base.isCreate, isEdit: base.isEdit, isDelete: base.isDelete }
            : { isCreate: false, isEdit: false, isDelete: false },
          override: override ? { isInclude: override.isInclude } : undefined,
        };
      });

    return this.buildTreeWithExtras(nodes);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private hasActiveAncestorChain(item: MenuRow, itemById: Map<number, MenuRow>): boolean {
    const seen = new Set<number>([item.id]);
    let parentId = item.parentId;
    while (parentId !== null) {
      if (seen.has(parentId)) return false; // cycle
      const parent = itemById.get(parentId);
      if (!parent) return false; // missing or inactive ancestor
      seen.add(parentId);
      parentId = parent.parentId;
    }
    return true;
  }

  private async assertNoCycle(itemId: number, newParentId: number) {
    if (itemId === newParentId) {
      throw new BadRequestException('A menu item cannot be its own parent');
    }
    let cursor: number | null = newParentId;
    const seen = new Set<number>();
    while (cursor !== null) {
      if (cursor === itemId) {
        throw new ConflictException('This change would create a menu loop');
      }
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const parent: { parentId: number | null } | null = await this.prisma.menuItem.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = parent?.parentId ?? null;
    }
  }

  private async assertMenuItemExists(id: number) {
    const exists = await this.prisma.menuItem.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException(`Menu item ${id} not found`);
  }

  private async assertMenuItemsExist(menuItemIds: number[]) {
    const unique = new Set(menuItemIds);
    if (unique.size !== menuItemIds.length) {
      throw new BadRequestException('Each menu item may appear only once in a request');
    }
    const found = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true },
    });
    const valid = new Set(found.map((i) => i.id));
    const missing = menuItemIds.find((id) => !valid.has(id));
    if (missing !== undefined) {
      throw new NotFoundException(`Menu item ${missing} not found`);
    }
  }

  private async assertUserTypeExists(userTypeId: number) {
    const exists = await this.prisma.userType.findUnique({ where: { id: userTypeId } });
    if (!exists) throw new NotFoundException('User type not found');
  }

  private async assertUserExists(userId: number) {
    const exists = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) throw new NotFoundException('User not found');
  }

  private buildTree(items: MenuRow[]): MenuNode[] {
    const nodes = items.map((item) => ({
      id: item.id,
      name: item.name,
      pageUrl: item.pageUrl,
      iconClass: item.iconClass,
      displayOrder: item.displayOrder,
      isMainMenu: item.isMainMenu,
      isActive: item.isActive,
      parentId: item.parentId,
    }));
    return this.nest(nodes);
  }

  private buildTreeWithExtras(
    items: Array<MenuRow & { effectivePageUrl?: string | null; permissions?: any; override?: any }>,
  ): MenuNode[] {
    const nodes = items.map((item) => ({
      id: item.id,
      name: item.name,
      pageUrl: item.effectivePageUrl ?? item.pageUrl,
      iconClass: item.iconClass,
      displayOrder: item.displayOrder,
      isMainMenu: item.isMainMenu,
      isActive: item.isActive,
      permissions: item.permissions,
      override: item.override,
      parentId: item.parentId,
    }));
    return this.nest(nodes);
  }

  private nest(
    nodes: Array<Omit<MenuNode, 'children'> & { parentId: number | null }>,
  ): MenuNode[] {
    const byId = new Map<number, MenuNode>();
    for (const { parentId: _parentId, ...node } of nodes) {
      byId.set(node.id, { ...node, children: [] });
    }

    const roots: MenuNode[] = [];
    for (const node of nodes) {
      const built = byId.get(node.id)!;
      const parent = node.parentId !== null ? byId.get(node.parentId) : undefined;
      if (parent) {
        parent.children.push(built);
      } else {
        roots.push(built);
      }
    }
    return roots;
  }
}
