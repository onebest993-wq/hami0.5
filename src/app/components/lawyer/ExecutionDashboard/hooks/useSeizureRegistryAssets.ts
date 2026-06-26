import { useMemo } from 'react';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureUtils';

export { isSalarySeizureAsset };

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
