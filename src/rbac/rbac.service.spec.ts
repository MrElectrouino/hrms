import { BadRequestException, ConflictException } from '@nestjs/common';
import { RbacService } from './rbac.service';

const item = (id: number, parentId: number | null, displayOrder = id, extra: Record<string, unknown> = {}) => ({
  id,
  parentId,
  name: `Item ${id}`,
  pageUrl: `/item-${id}`,
  iconClass: null,
  displayOrder,
  isMainMenu: true,
  isActive: true,
  ...extra,
});

const items = [item(1, null), item(2, 1), item(3, 1), item(4, null)];

const base = (menuItemId: number, extra: Record<string, unknown> = {}) => ({
  menuItemId,
  pageUrlOverride: null,
  isCreate: false,
  isEdit: false,
  isDelete: false,
  ...extra,
});

function makeService(opts: {
  items?: any[];
  base?: any[];
  overrides?: any[];
}) {
  const all = opts.items ?? [];
  const prisma: any = {
    menuItem: {
      // getMyMenu asks for active items only; the other queries ask by id.
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        if (where?.id?.in) return all.filter((i) => where.id.in.includes(i.id));
        return all.filter((i) => (where?.isActive === true ? i.isActive : true));
      }),
      findUnique: jest.fn().mockImplementation(({ where }: any) => all.find((i) => i.id === where.id) ?? null),
      update: jest.fn(),
    },
    menuUserTypePermission: { findMany: jest.fn().mockResolvedValue(opts.base ?? []) },
    menuUserOverride: { findMany: jest.fn().mockResolvedValue(opts.overrides ?? []) },
    userType: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    user: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    $transaction: jest.fn(),
  };
  const audit = { log: jest.fn() };
  return { service: new RbacService(prisma, audit as any), prisma };
}

describe('RbacService.getMyMenu', () => {
  const items = [item(1, null), item(2, 1), item(3, 1), item(4, null)];

  it('shows a group header for a visible child and builds the tree', async () => {
    const { service } = makeService({ items, base: [base(2)] });
    const tree = await service.getMyMenu(1, 1);

    expect(tree.map((n) => n.id)).toEqual([1]);
    expect(tree[0].children.map((n) => n.id)).toEqual([2]);
    // The header is there only to reach the child; it grants no rights of its own.
    expect(tree[0].permissions).toEqual({ isCreate: false, isEdit: false, isDelete: false });
  });

  it('removes an item when a per-user override excludes it, and drops its header if empty', async () => {
    const { service } = makeService({
      items,
      base: [base(2), base(4)],
      overrides: [{ menuItemId: 2, isInclude: false, pageUrlOverride: null }],
    });
    const tree = await service.getMyMenu(1, 1);
    expect(tree.map((n) => n.id)).toEqual([4]);
  });

  it('adds an item to a user even when the user type does not grant it', async () => {
    const { service } = makeService({
      items,
      base: [],
      overrides: [{ menuItemId: 4, isInclude: true, pageUrlOverride: null }],
    });
    const tree = await service.getMyMenu(1, 1);
    expect(tree.map((n) => n.id)).toEqual([4]);
  });

  it('applies page URL precedence: user override, then type override, then the item', async () => {
    const typeOnly = makeService({ items, base: [base(4, { pageUrlOverride: '/type' })] });
    expect((await typeOnly.service.getMyMenu(1, 1))[0].pageUrl).toBe('/type');

    const withUserOverride = makeService({
      items,
      base: [base(4, { pageUrlOverride: '/type' })],
      overrides: [{ menuItemId: 4, isInclude: true, pageUrlOverride: '/user' }],
    });
    expect((await withUserOverride.service.getMyMenu(1, 1))[0].pageUrl).toBe('/user');
  });

  it('hides an item whose parent is inactive instead of showing it at the top level', async () => {
    const withInactiveParent = [item(1, null, 1, { isActive: false }), item(2, 1)];
    const { service } = makeService({ items: withInactiveParent, base: [base(2)] });
    expect(await service.getMyMenu(1, 1)).toEqual([]);
  });
});

describe('RbacService permissions and menu items', () => {
  it('rejects the same menu item twice in one permissions request', async () => {
    const { service } = makeService({ items });
    await expect(
      service.setMenuPermissions(1, [{ menuItemId: 1 }, { menuItemId: 1 }] as any, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a menu item that does not exist', async () => {
    const { service } = makeService({ items: [item(1, null)] });
    await expect(service.setMenuPermissions(1, [{ menuItemId: 99 }] as any, 1)).rejects.toThrow(
      'Menu item 99 not found',
    );
  });

  it('refuses to make a menu item its own ancestor', async () => {
    const chain = [item(1, null), item(2, 1), item(3, 2)];
    const { service } = makeService({ items: chain });
    // Moving 1 under 3 would make 3 -> 2 -> 1 -> 3.
    await expect(service.updateMenuItem(1, { parentId: 3 } as any, 1)).rejects.toThrow(ConflictException);
  });

  it('refuses a menu item as its own parent', async () => {
    const { service } = makeService({ items: [item(1, null)] });
    await expect(service.updateMenuItem(1, { parentId: 1 } as any, 1)).rejects.toThrow(BadRequestException);
  });
});
