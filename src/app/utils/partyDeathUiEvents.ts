/** أحداث واجهة وفاة الخصوم / إحلال الورثة — بلا اعتماديات ثقيلة */

export const HAMI_OPEN_PARTY_DEATH_MODAL = 'hami-open-party-death-modal';
export const HAMI_OPEN_HEIRS_NOTIFICATION_CENTER = 'hami-open-heirs-notification-center';
export const HAMI_PREFETCH_PARTY_DEATH_HANDLERS = 'hami-prefetch-party-death-handlers';

export type PartyDeathUiParty = 'creditor' | 'debtor';

export function dispatchOpenPartyDeathModal(input: {
    executionId?: string;
    party: PartyDeathUiParty;
    decisionId?: string | null;
}): void {
    try {
        window.dispatchEvent(
            new CustomEvent(HAMI_OPEN_PARTY_DEATH_MODAL, {
                detail: {
                    executionId: String(input.executionId ?? '').trim(),
                    party: input.party,
                    decisionId: String(input.decisionId ?? '').trim() || null,
                },
            }),
        );
    } catch {
        /* ignore */
    }
}

export function dispatchOpenHeirsNotificationCenter(input?: {
    executionId?: string;
    heirNames?: string[];
}): void {
    try {
        window.dispatchEvent(
            new CustomEvent(HAMI_OPEN_HEIRS_NOTIFICATION_CENTER, {
                detail: {
                    executionId: String(input?.executionId ?? '').trim(),
                    heirNames: Array.isArray(input?.heirNames)
                        ? input.heirNames.map((n) => String(n || '').trim()).filter(Boolean)
                        : [],
                },
            }),
        );
    } catch {
        /* ignore */
    }
}

export function dispatchPrefetchPartyDeathHandlers(): void {
    try {
        window.dispatchEvent(new CustomEvent(HAMI_PREFETCH_PARTY_DEATH_HANDLERS));
    } catch {
        /* ignore */
    }
}
