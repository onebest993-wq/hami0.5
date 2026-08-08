import {
    getGoverningSeizureDecisionBySubtype,
    getExecutorDecisionRowById,
} from '@/app/utils/executorSeizureDecisionQueue';

export const SEIZURE_INLINE_FOCUS_EVENT = {
    property: 'hami-focus-seizure-property-inline',
    movable: 'hami-focus-seizure-movable-inline',
    thirdParty: 'hami-focus-seizure-third-party-inline',
    notice: 'hami-focus-seizure-notice-inline',
} as const;

export const SEIZURE_CLOSE_UNIFIED_LOG_EVENT = 'hami-close-unified-seizure-log';

export type SeizureInlineFocusDetail = {
    executionId?: string;
    decisionId?: string;
    subject?: string;
};

export function executionIdMatchesFocusEvent(
    allowedIds: readonly string[],
    eventExecutionId: string | undefined,
): boolean {
    const evId = String(eventExecutionId ?? '').trim();
    if (!evId) return false;
    return allowedIds.some((id) => id === evId);
}

export function resolveGoverningMovableDecision(
    executionId: string,
    decisions: Record<string, unknown>[],
    preferredDecisionId?: string | null,
): Record<string, unknown> | null {
    const forced = String(preferredDecisionId || '').trim();
    if (forced) {
        const fromList = decisions.find((row) => String((row as { id?: string }).id || '').trim() === forced);
        if (fromList) return fromList;
        const fromStorage = getExecutorDecisionRowById(executionId, forced);
        if (fromStorage) return fromStorage;
    }
    const auction = getGoverningSeizureDecisionBySubtype(executionId, 'movable_auction', decisions);
    if (auction) return auction;
    return getGoverningSeizureDecisionBySubtype(executionId, 'movable', decisions);
}

export function resolveGoverningPropertyDecision(
    executionId: string,
    decisions: Record<string, unknown>[],
    preferredDecisionId?: string | null,
): Record<string, unknown> | null {
    const forced = String(preferredDecisionId || '').trim();
    if (forced) {
        const fromList = decisions.find((row) => String((row as { id?: string }).id || '').trim() === forced);
        if (fromList) return fromList;
        const fromStorage = getExecutorDecisionRowById(executionId, forced);
        if (fromStorage) return fromStorage;
    }
    return getGoverningSeizureDecisionBySubtype(executionId, 'property', decisions);
}

export function resolveGoverningThirdPartyDecision(
    executionId: string,
    decisions: Record<string, unknown>[],
    preferredDecisionId?: string | null,
): Record<string, unknown> | null {
    const forced = String(preferredDecisionId || '').trim();
    if (forced) {
        const fromList = decisions.find((row) => String((row as { id?: string }).id || '').trim() === forced);
        if (fromList) return fromList;
        const fromStorage = getExecutorDecisionRowById(executionId, forced);
        if (fromStorage) return fromStorage;
    }
    return getGoverningSeizureDecisionBySubtype(executionId, 'third_party', decisions);
}
