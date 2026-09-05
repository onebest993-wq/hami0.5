/** فتح مودال مهلة التخلية السكنية من أي سطح (محضر / موافقة منفذ) */
export const OPEN_EVICTION_RESIDENTIAL_GRACE_EVENT = 'hami-open-eviction-residential-grace';

export type OpenEvictionResidentialGraceDetail = {
    edit?: boolean;
    decisionId?: string;
    /** أغلق مركز القرارات إن كان مفتوحاً */
    closeDecisions?: boolean;
};

export function dispatchOpenEvictionResidentialGrace(
    detail: OpenEvictionResidentialGraceDetail = {},
): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(
            new CustomEvent(OPEN_EVICTION_RESIDENTIAL_GRACE_EVENT, { detail }),
        );
    } catch {
        /* ignore */
    }
}
