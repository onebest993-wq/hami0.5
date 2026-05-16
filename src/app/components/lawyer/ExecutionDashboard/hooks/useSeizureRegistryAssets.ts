import { useMemo } from 'react';

export function useSeizureRegistryAssets(
    seizedAssets: any[] | undefined | null,
    realEstateSeizureAssets: any[] | undefined | null,
    thirdPartySeizureAssets: any[] | undefined | null,
) {
    const salarySeizureRegistryAssets = useMemo(
        () =>
            (seizedAssets || []).filter((a) => {
                if (String(a?.status || '') === 'pending') return false;
                const det =
                    typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                        ? (a.details as Record<string, unknown>)
                        : null;
                const kind = String(det?.seizureUiKind || '').trim();
                if (kind === 'salary') return true;
                return /راتب|خُمس|خمس|salary/i.test(String(a.type || ''));
            }),
        [seizedAssets]
    );

    const realEstateSeizureRegistryAssets = useMemo(
        () => (realEstateSeizureAssets || []).slice(),
        [realEstateSeizureAssets]
    );

    const thirdPartySeizureRegistryAssets = useMemo(
        () => (thirdPartySeizureAssets || []).slice(),
        [thirdPartySeizureAssets]
    );

    return { salarySeizureRegistryAssets, realEstateSeizureRegistryAssets, thirdPartySeizureRegistryAssets };
}
