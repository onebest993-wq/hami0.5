import type {
    ProceduralActionItem,
    ProceduralContainer,
    ProceduralNoteItem,
} from '../../proceduralContainersEngine';
import {
    formatProceduralLinkDisplay,
    isProceduralLinkBroken,
    normalizeProceduralContextValue,
    resolveLiveLinkLabel,
    type ProceduralItemLink,
} from '../../proceduralItemLink';

export function findEditingContainerInTree(
    list: ProceduralContainer[],
    containerId: string,
): ProceduralContainer | null {
    for (const c of list) {
        if (c.id === containerId) return c;
        for (const item of c.subItems) {
            if (item.type === 'container') {
                const hit = findEditingContainerInTree([item.container], containerId);
                if (hit) return hit;
            }
        }
    }
    return null;
}

export function buildProceduralContextDisplay(
    item: ProceduralNoteItem | ProceduralActionItem,
    linkResolverInput: Parameters<typeof resolveLiveLinkLabel>[1],
): { line: string | null; link?: ProceduralItemLink; linkBroken?: boolean } {
    const ctx = normalizeProceduralContextValue(item.link, item.contextRef, item.contextNote);
    const live = ctx.link != null ? resolveLiveLinkLabel(ctx.link, linkResolverInput) : undefined;
    const line = formatProceduralLinkDisplay(ctx, live);
    const linkBroken = ctx.link != null ? isProceduralLinkBroken(ctx.link, linkResolverInput) : false;
    return { line, link: ctx.link, linkBroken };
}
