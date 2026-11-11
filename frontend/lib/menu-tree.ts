import { MenuFlags } from './api';
import { MenuItemRow } from './admin-api';

export type Selection = Record<number, MenuFlags>;

const NO_FLAGS: MenuFlags = { isCreate: false, isEdit: false, isDelete: false };

/** Children grouped by parent id (null = top level), ordered by displayOrder. */
export function childrenByParent(items: MenuItemRow[]): Map<number | null, MenuItemRow[]> {
  const map = new Map<number | null, MenuItemRow[]>();
  for (const item of [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)) {
    const list = map.get(item.parentId) ?? [];
    list.push(item);
    map.set(item.parentId, list);
  }
  return map;
}

export function descendantIds(id: number, items: MenuItemRow[]): number[] {
  const children = childrenByParent(items);
  const out: number[] = [];
  const stack = [...(children.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    out.push(next.id);
    stack.push(...(children.get(next.id) ?? []));
  }
  return out;
}

export function ancestorIds(id: number, items: MenuItemRow[]): number[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: number[] = [];
  let parentId = byId.get(id)?.parentId ?? null;
  // Bounded walk: the server rejects cycles, but a bad row must not hang the page.
  for (let guard = 0; parentId !== null && guard < items.length; guard++) {
    out.push(parentId);
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return out;
}

/**
 * Tick or untick a menu row with the legacy cascade (BR-UM-21):
 * ticking a row ticks its children and its ancestors; unticking it unticks its
 * children, and an ancestor is unticked once none of its children remain ticked.
 */
export function toggleSelection(
  selection: Selection,
  id: number,
  checked: boolean,
  items: MenuItemRow[],
): Selection {
  const next: Selection = { ...selection };

  if (checked) {
    for (const target of [id, ...descendantIds(id, items), ...ancestorIds(id, items)]) {
      next[target] = next[target] ?? { ...NO_FLAGS };
    }
    return next;
  }

  for (const target of [id, ...descendantIds(id, items)]) {
    delete next[target];
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  let parentId = byId.get(id)?.parentId ?? null;
  while (parentId !== null) {
    const hasTickedChild = items.some((i) => i.parentId === parentId && next[i.id]);
    if (hasTickedChild) break;
    delete next[parentId];
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return next;
}

/** Flat list of every row with its depth, for indented display. */
export function flattenWithDepth(items: MenuItemRow[]): Array<{ item: MenuItemRow; depth: number }> {
  const children = childrenByParent(items);
  const out: Array<{ item: MenuItemRow; depth: number }> = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const item of children.get(parentId) ?? []) {
      out.push({ item, depth });
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
