import { useCallback, useState } from 'react';

/**
 * Draft map for third-party funds received amounts.
 * Owned separately from the removed unified seizure log UI.
 */
export function useThirdPartyFundsDraft() {
    const [thirdPartyFundsDraftById, setThirdPartyFundsDraftById] = useState<Record<string, string>>(
        {},
    );

    const clearThirdPartyFundsDraft = useCallback((seizureId: string) => {
        const id = String(seizureId || '').trim();
        if (!id) return;
        setThirdPartyFundsDraftById((prevDrafts) => {
            if (!(id in prevDrafts)) return prevDrafts;
            const next = { ...prevDrafts };
            delete next[id];
            return next;
        });
    }, []);

    return {
        thirdPartyFundsDraftById,
        setThirdPartyFundsDraftById,
        clearThirdPartyFundsDraft,
    };
}
