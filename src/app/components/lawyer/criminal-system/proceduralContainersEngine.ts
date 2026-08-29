import type { ProceduralLinkKind } from './proceduralItemLink';
import { normalizeProceduralItemLink } from './proceduralItemLink';
import {
    actionStatusLabel,
    type ProceduralContainer,
    type ProceduralSubItem,
} from './proceduralContainersModel';
import { normalizeFollowUpDate, todayIsoDate } from './proceduralContainersNormalize';
import {
    containerBreadcrumbTitle,
    formatProceduralBreadcrumbLine,
    formatProceduralNumberChain,
} from './proceduralContainersPlacement';
import type { ProceduralSubItemKind } from './proceduralContainersSearch';

export type {
    AddChildKind,
    ProceduralActionItem,
    ProceduralActionStatus,
    ProceduralBranchRole,
    ProceduralContainer,
    ProceduralContextRef,
    ProceduralNestedContainerItem,
    ProceduralNoteItem,
    ProceduralPathStatus,
    ProceduralSubItem,
    ProceduralSubItemPatch,
} from './proceduralContainersModel';

export {
    ACTION_STATUS_OPTIONS,
    CONTAINER_COLOR_PRESETS,
    CONTAINER_ICON_PRESETS,
    actionStatusLabel,
    branchRoleLabel,
    isActionStatus,
    isBranchRole,
    isPathStatus,
    pathStatusLabel,
} from './proceduralContainersModel';

export {
    advanceActionToNextPhase,
    appendSubItem,
    cloneContainer,
    cloneProceduralActionItem,
    cloneProceduralNoteItem,
    createProceduralId,
    deleteContainerFromTree,
    duplicateSubItemInTree,
    findContainerInTree,
    getRootContainers,
    insertNestedContainer,
    insertNestedContainerAt,
    insertRootContainer,
    insertRootContainerAt,
    mapContainerTree,
    moveContainerInTree,
    moveSubItemInTree,
    normalizeColor,
    normalizeIcon,
    removeSubItemFromTree,
    reorderRootContainers,
    updateSubItemInTree,
} from './proceduralContainersTreeOps';

export {
    formatTagsInput,
    isFollowUpDueOrOverdue,
    migrateLegacyPathsToContainers,
    normalizeFollowUpDate,
    normalizeProceduralContainers,
    normalizeProceduralTags,
    parseTagsInput,
    todayIsoDate,
} from './proceduralContainersNormalize';

export type {
    ProceduralParentNumber,
    ProceduralPlacementContext,
} from './proceduralContainersPlacement';

export {
    buildProceduralPlacementContext,
    childProceduralNumber,
    formatProceduralBreadcrumbLine,
    formatProceduralNumberChain,
} from './proceduralContainersPlacement';

export type {
    ProceduralNavTarget,
    ProceduralSearchHit,
    ProceduralSearchVisibility,
    ProceduralSubItemKind,
} from './proceduralContainersSearch';

export {
    buildProceduralSearchVisibility,
    collectAllContainerIds,
    findActionAnchorInTree,
    findContainerAnchorInTree,
    findSubItemAnchorInTree,
    searchProceduralTree,
} from './proceduralContainersSearch';

/** إدخال مستخلص لمركز المتابعة — بدون تغيير نموذج البيانات */
export type ProceduralAttentionEntry = {
    actionId: string;
    parentId: string;
    title: string;
    followUpDate?: string;
    pathLabel: string;
};

type ProceduralAttentionBoard = {
    overdue: ProceduralAttentionEntry[];
    upcoming: ProceduralAttentionEntry[];
    noDate: ProceduralAttentionEntry[];
    total: number;
};

function walkInProgressActions(
    container: ProceduralContainer,
    pathParts: string[],
    sink: ProceduralAttentionEntry[],
) {
    const pathLabel = [...pathParts, container.title].join(' › ');
    for (const item of container.subItems) {
        if (item.type === 'action' && item.status === 'in_progress') {
            const followUpDate = normalizeFollowUpDate(item.followUpDate, 'in_progress');
            sink.push({
                actionId: item.id,
                parentId: container.id,
                title: item.title,
                followUpDate,
                pathLabel,
            });
        } else if (item.type === 'container') {
            walkInProgressActions(item.container, [...pathParts, container.title], sink);
        }
    }
}

/** تسطيح الشجرة وتصنيف إجراءات قيد المتابعة حسب موعد المراجعة */
export function buildProceduralAttentionBoard(
    roots: ProceduralContainer[],
    todayIso = todayIsoDate(),
): ProceduralAttentionBoard {
    const flat: ProceduralAttentionEntry[] = [];
    for (const root of roots) {
        walkInProgressActions(root, [], flat);
    }
    const overdue: ProceduralAttentionEntry[] = [];
    const upcoming: ProceduralAttentionEntry[] = [];
    const noDate: ProceduralAttentionEntry[] = [];
    for (const entry of flat) {
        const fu = entry.followUpDate;
        if (!fu) {
            noDate.push(entry);
            continue;
        }
        if (fu < todayIso) overdue.push(entry);
        else upcoming.push(entry);
    }
    return {
        overdue,
        upcoming,
        noDate,
        total: flat.length,
    };
}

/** مرجع عكسي من طلب/تايم لاين إلى عنصر في مسارات التتبع */
export type ProceduralLinkReference = {
    itemType: ProceduralSubItemKind;
    itemId: string;
    title: string;
    numberChain: string;
    breadcrumbLine: string;
};

/** عناصر المسار التي تشير إلى سجل طلب أو حدث تايم لاين */
export function findProceduralReferencesToLink(
    roots: ProceduralContainer[],
    target: { kind: ProceduralLinkKind; id: string },
): ProceduralLinkReference[] {
    const kind = target.kind;
    const id = String(target.id ?? '').trim();
    if (!id) return [];
    const out: ProceduralLinkReference[] = [];

    const walkSubItems = (
        subItems: ProceduralSubItem[],
        indexChain: number[],
        breadcrumb: string[],
    ) => {
        for (let i = 0; i < subItems.length; i++) {
            const item = subItems[i];
            const chain = [...indexChain, i + 1];
            const crumbs = breadcrumb;
            if (item.type === 'note' || item.type === 'action') {
                const link = normalizeProceduralItemLink(item.link);
                if (link?.kind === kind && link.id === id) {
                    out.push({
                        itemType: item.type,
                        itemId: item.id,
                        title: item.title,
                        numberChain: formatProceduralNumberChain(chain),
                        breadcrumbLine: formatProceduralBreadcrumbLine(crumbs),
                    });
                }
            } else if (item.type === 'container') {
                walkSubItems(item.container.subItems, chain, [
                    ...crumbs,
                    containerBreadcrumbTitle(item.container),
                ]);
            }
        }
    };

    for (let ri = 0; ri < roots.length; ri++) {
        const root = roots[ri];
        walkSubItems(root.subItems, [ri + 1], [containerBreadcrumbTitle(root)]);
    }
    return out;
}

/** نص مرتب للطباعة أو النسخ — بدون تغيير التخزين */
export function formatProceduralPathsForExport(roots: ProceduralContainer[]): string {
    const lines: string[] = ['مسارات التتبع', ''];

    const indent = (depth: number) => '  '.repeat(Math.max(0, depth));

    const walkSubItems = (subItems: ProceduralSubItem[], depth: number, prefix: string) => {
        subItems.forEach((item, idx) => {
            const num = prefix ? `${prefix}.${idx + 1}` : String(idx + 1);
            if (item.type === 'note') {
                lines.push(`${indent(depth)}${num} [ملاحظة] ${item.title}`);
                if (item.body) lines.push(`${indent(depth + 1)}${item.body}`);
            } else if (item.type === 'action') {
                lines.push(
                    `${indent(depth)}${num} [إجراء] ${item.title} — ${item.date} (${actionStatusLabel(item.status)})`,
                );
            } else {
                lines.push(`${indent(depth)}${num} [مرحلة] ${item.container.title}`);
                walkSubItems(item.container.subItems, depth + 1, num);
            }
        });
    };

    roots.forEach((root, ri) => {
        const status = root.pathStatus === 'completed' ? 'منتهٍ' : 'نشط';
        lines.push(`${ri + 1}. ${root.title} (${status})`);
        walkSubItems(root.subItems, 1, String(ri + 1));
        lines.push('');
    });

    return lines.join('\n').trim();
}
