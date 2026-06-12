/** حالة التوجيه عند فتح مركز القرارات والطعون */
export type DecisionsModalBootTab = 'current' | 'previous' | 'appeals';

export interface DecisionsModalBootState {
    hubTab: 'appeals' | null;
    listTab: DecisionsModalBootTab | null;
    scrollDecisionId: string | null;
    scrollAppealId: string | null;
}

export const EMPTY_DECISIONS_MODAL_BOOT_STATE: DecisionsModalBootState = {
    hubTab: null,
    listTab: null,
    scrollDecisionId: null,
    scrollAppealId: null,
};

export function resolveDecisionsModalBootState(opts?: {
    tab?: DecisionsModalBootTab | null;
    decisionId?: string | null;
}): DecisionsModalBootState {
    const tab = opts?.tab ?? null;
    const did = String(opts?.decisionId ?? '').trim() || null;

    if (tab === 'appeals') {
        return {
            hubTab: 'appeals',
            listTab: 'appeals',
            scrollDecisionId: null,
            scrollAppealId: did,
        };
    }
    if (tab === 'current' || tab === 'previous') {
        return {
            hubTab: null,
            listTab: tab,
            scrollDecisionId: did,
            scrollAppealId: null,
        };
    }
    return {
        hubTab: null,
        listTab: null,
        scrollDecisionId: did,
        scrollAppealId: null,
    };
}
