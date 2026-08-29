import { useMemo } from 'react';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureUtils';
import type {
    RealEstateSeizureAsset,
    SeizedAsset,
    ThirdPartySeizureAsset,
} from '@/app/types/execution';

export { isSalarySeizureAsset };

export function useSeizureRegistryAssets(
    seizedAssets: SeizedAsset[] | undefined | null,
    realEstateSeizureAssets: RealEstateSeizureAsset[] | undefined | null,
    thirdPartySeizureAssets: ThirdPartySeizureAsset[] | undefined | null,
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
