/**
 * Placement / breadcrumb / number-chain helpers for procedural containers.
 * Display-only numbering — not persisted. Re-exported from proceduralContainersEngine.
 */
import type { ProceduralContainer, ProceduralSubItem } from './proceduralContainersModel';

/** سلسلة ترقيم هيكلي للعرض فقط — لا تُخزَّن. */
export type ProceduralParentNumber = number[];

export type ProceduralPlacementContext = {
    /** عناوين المسار من الجذر إلى حاوية الإدراج */
    breadcrumb: string[];
    /** سلسلة رقمية: 1.2.3 */
    numberChain: string;
    /** سطر واحد للمودال: عنوان أ > عنوان ب */
    breadcrumbLine: string;
};

export function formatProceduralNumberChain(chain: ProceduralParentNumber): string {
    return chain.filter((n) => Number.isFinite(n) && n > 0).join('.');
}

/** يمدّد سلسلة الأب برقم الطفل حسب ترتيبه في subItems (يبدأ من 1). */
export function childProceduralNumber(
    parentNumber: ProceduralParentNumber,
    subItemIndex: number,
): ProceduralParentNumber {
    return [...parentNumber, subItemIndex + 1];
}

export function formatProceduralBreadcrumbLine(segments: string[]): string {
    return segments.map((s) => String(s ?? '').trim()).filter(Boolean).join(' › ');
}

export function containerBreadcrumbTitle(c: ProceduralContainer): string {
    return String(c.title ?? '').trim() || '—';
}

/** سياق الإدراج داخل حاوية أب — للواجهة فقط (بدون تغيير المخطط). */
export function buildProceduralPlacementContext(
    roots: ProceduralContainer[],
    parentContainerId: string,
): ProceduralPlacementContext | null {
    const targetId = String(parentContainerId ?? '').trim();
    if (!targetId) return null;

    const searchInSubItems = (
        subItems: ProceduralSubItem[],
        indexChain: number[],
        breadcrumb: string[],
    ): ProceduralPlacementContext | null => {
        for (let i = 0; i < subItems.length; i++) {
            if (subItems[i].type !== 'container') continue;
            const c = subItems[i].container;
            const chain = [...indexChain, i + 1];
            const crumbs = [...breadcrumb, containerBreadcrumbTitle(c)];
            if (c.id === targetId) {
                const numberChain = formatProceduralNumberChain(chain);
                return {
                    breadcrumb: crumbs,
                    numberChain,
                    breadcrumbLine: formatProceduralBreadcrumbLine(crumbs),
                };
            }
            const hit = searchInSubItems(c.subItems, chain, crumbs);
            if (hit) return hit;
        }
        return null;
    };

    for (let ri = 0; ri < roots.length; ri++) {
        const root = roots[ri];
        const rootChain = [ri + 1];
        const rootCrumb = containerBreadcrumbTitle(root);
        if (root.id === targetId) {
            const numberChain = formatProceduralNumberChain(rootChain);
            return {
                breadcrumb: [rootCrumb],
                numberChain,
                breadcrumbLine: formatProceduralBreadcrumbLine([rootCrumb]),
            };
        }
        const hit = searchInSubItems(root.subItems, rootChain, [rootCrumb]);
        if (hit) return hit;
    }
    return null;
}
