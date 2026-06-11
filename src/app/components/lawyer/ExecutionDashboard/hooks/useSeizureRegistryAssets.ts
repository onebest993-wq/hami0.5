import { useMemo } from 'react';

export function isSalarySeizureAsset(asset: unknown): boolean {
    if (!asset || typeof asset !== 'object') return false;
    const a = asset as Record<string, unknown>;
    const det =
        typeof a.details === 'object' && a.details && !Array.isArray(a.details)
            ? (a.details as Record<string, unknown>)
            : null;
    const kind = String(det?.seizureUiKind || '').trim();
    if (kind === 'salary') return true;
    return /راتب|خُمس|خمس|salary/i.test(String(a.type || ''));
}

export function useSeizureRegistryAssets(
    seizedAssets: any[] | undefined | null,
    realEstateSeizureAssets: any[] | undefined | null,
    thirdPartySeizureAssets: any[] | undefined | null,
) {
    const salarySeizureRegistryAssets = useMemo(
        () => (seizedAssets || []).filter(isSalarySeizureAsset),
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
