export const HOME_SECTION_IDS = ['alerts', 'hub', 'notepad'] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const HOME_SECTION_ORDER_DEFAULT: HomeSectionId[] = ['alerts', 'hub', 'notepad'];

/** Normalize persisted order — ignores legacy lawsuit/transaction ids from old settings UI. */
export function normalizeHomeSectionOrder(raw: unknown): HomeSectionId[] {
    if (!Array.isArray(raw)) return [...HOME_SECTION_ORDER_DEFAULT];
    const valid = new Set<string>(HOME_SECTION_IDS);
    const out: HomeSectionId[] = [];
    for (const id of raw) {
        if (typeof id === 'string' && valid.has(id) && !out.includes(id as HomeSectionId)) {
            out.push(id as HomeSectionId);
        }
    }
    return out.length > 0 ? out : [...HOME_SECTION_ORDER_DEFAULT];
}
