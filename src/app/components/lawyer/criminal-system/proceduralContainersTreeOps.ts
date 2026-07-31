import {
    ProceduralSubItem,
    ProceduralContainer,
    ProceduralSubItemPatch,
    cloneProceduralNoteItem,
    cloneProceduralActionItem,
} from './proceduralContainersModel';

import {
    createProceduralId,
    normalizeColor,
    normalizeIcon,
    cloneContainer,
    findContainerInTree,
    mapContainerTree,
    deleteContainerFromTree,
} from './proceduralContainersNormalize';

export function insertRootContainer(roots: ProceduralContainer[], container: ProceduralContainer): ProceduralContainer[] {
    return [...roots, { ...container, parentId: null }];
}

export function insertNestedContainer(
    roots: ProceduralContainer[],
    parentId: string,
    child: ProceduralContainer,
): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        return {
            ...c,
            subItems: [
                ...c.subItems,
                { type: 'container', container: { ...child, parentId: parentId } },
            ],
        };
    });
}

export function appendSubItem(roots: ProceduralContainer[], parentId: string, item: ProceduralSubItem): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        return { ...c, subItems: [...c.subItems, item] };
    });
}

/** نسخ ملاحظة/إجراء وإدراجه مباشرة أسفل الأصل */
export function duplicateSubItemInTree(
    roots: ProceduralContainer[],
    parentId: string,
    itemId: string,
): ProceduralContainer[] | null {
    let ok = false;
    const next = mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        const idx = c.subItems.findIndex((item) => subItemMatchesId(item, itemId));
        if (idx < 0) return c;
        const item = c.subItems[idx];
        if (item.type === 'note') {
            const copy = cloneProceduralNoteItem(item);
            const subItems = [...c.subItems];
            subItems.splice(idx + 1, 0, copy);
            ok = true;
            return { ...c, subItems };
        }
        if (item.type === 'action') {
            const copy = cloneProceduralActionItem(item);
            const subItems = [...c.subItems];
            subItems.splice(idx + 1, 0, copy);
            ok = true;
            return { ...c, subItems };
        }
        return c;
    });
    return ok ? next : null;
}

function subItemMatchesId(item: ProceduralSubItem, itemId: string): boolean {
    if (item.type === 'container') return item.container.id === itemId;
    return item.id === itemId;
}

export function updateSubItemInTree(
    roots: ProceduralContainer[],
    parentId: string,
    itemId: string,
    patch: ProceduralSubItemPatch,
): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        return {
            ...c,
            subItems: c.subItems.map((item) => {
                if (!subItemMatchesId(item, itemId)) return item;
                if (item.type === 'note') return { ...item, ...patch, type: 'note' as const };
                if (item.type === 'action') return { ...item, ...patch, type: 'action' as const };
                return item;
            }),
        };
    });
}

export function removeSubItemFromTree(roots: ProceduralContainer[], parentId: string, itemId: string): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        return {
            ...c,
            subItems: c.subItems.filter((item) => {
                if (item.type === 'container') return item.container.id !== itemId;
                return item.id !== itemId;
            }),
        };
    });
}

/** نقل عنصر بين حاويات أو إعادة ترتيب داخل نفس الحاوية */
export function moveSubItemInTree(
    roots: ProceduralContainer[],
    fromParentId: string,
    toParentId: string,
    itemId: string,
    toIndex: number,
): ProceduralContainer[] {
    let moving: ProceduralSubItem | null = null;
    let afterRemove = mapContainerTree(roots, (c) => {
        if (c.id !== fromParentId) return c;
        const idx = c.subItems.findIndex((it) => {
            if (it.type === 'container') return it.container.id === itemId;
            return it.id === itemId;
        });
        if (idx < 0) return c;
        moving = c.subItems[idx]!;
        return { ...c, subItems: c.subItems.filter((_, i) => i !== idx) };
    });
    if (!moving) return roots;
    const item = moving;
    return mapContainerTree(afterRemove, (c) => {
        if (c.id !== toParentId) return c;
        const next = [...c.subItems];
        const safeIdx = Math.max(0, Math.min(toIndex, next.length));
        next.splice(safeIdx, 0, item);
        return { ...c, subItems: next };
    });
}

export function insertRootContainerAt(
    roots: ProceduralContainer[],
    container: ProceduralContainer,
    index: number,
): ProceduralContainer[] {
    const next = [...roots, { ...container, parentId: null }];
    const safeIdx = Math.max(0, Math.min(index, next.length - 1));
    const [row] = next.splice(next.length - 1, 1);
    next.splice(safeIdx, 0, row);
    return next;
}

export function insertNestedContainerAt(
    roots: ProceduralContainer[],
    parentId: string,
    child: ProceduralContainer,
    index: number,
): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        const next = [...c.subItems];
        const safeIdx = Math.max(0, Math.min(index, next.length));
        next.splice(safeIdx, 0, { type: 'container', container: { ...child, parentId } });
        return { ...c, subItems: next };
    });
}

/** نقل حاوية بين الجذر والتداخل */
export function moveContainerInTree(
    roots: ProceduralContainer[],
    containerId: string,
    newParentId: string | null,
    toIndex: number,
): ProceduralContainer[] {
    const hit = findContainerInTree(roots, containerId);
    if (!hit) return roots;
    const moving = cloneContainer(hit.container);
    let next = deleteContainerFromTree(roots, containerId);
    if (newParentId === null) {
        return insertRootContainerAt(next, { ...moving, parentId: null }, toIndex);
    }
    return insertNestedContainerAt(next, newParentId, moving, toIndex);
}

export function reorderRootContainers(
    roots: ProceduralContainer[],
    fromId: string,
    toId: string,
): ProceduralContainer[] {
    const list = [...roots];
    const fromIdx = list.findIndex((c) => c.id === fromId);
    const toIdx = list.findIndex((c) => c.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return roots;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    return list;
}

export function advanceActionToNextPhase(
    roots: ProceduralContainer[],
    parentId: string,
    actionId: string,
    opts?: { spawnChildContainer?: { title: string; color?: string; icon?: string } },
): ProceduralContainer[] {
    let updated = updateSubItemInTree(roots, parentId, actionId, {
        status: 'done',
        followUpDate: undefined,
    });
    if (opts?.spawnChildContainer?.title?.trim()) {
        const child: ProceduralContainer = {
            id: createProceduralId(),
            title: opts.spawnChildContainer.title.trim(),
            color: normalizeColor(opts.spawnChildContainer.color),
            icon: normalizeIcon(opts.spawnChildContainer.icon),
            parentId: parentId,
            subItems: [],
        };
        updated = insertNestedContainer(updated, parentId, child);
    }
    return updated;
}

