import type {
    ExecutionFile,
    RealEstateSeizureAsset,
    SeizedMovable,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
} from '@/app/types/execution';
import type { SeizedAsset } from '@/app/types/execution';

export type UnifiedSeizureLogBuildInput = {
    viewExecutionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId?: string;
    executionId?: string;
    activeDebtorIsDeceased: boolean;
    realEstateSeizureRegistryAssets: readonly RealEstateSeizureAsset[] | readonly unknown[];
    salarySeizureRegistryAssets: readonly SeizedAsset[] | readonly unknown[];
    movableSeizureRegistryAssets: readonly SeizedAsset[] | readonly unknown[];
    seizedMovablesForSeizureLog: SeizedMovable[];
    thirdPartySeizureRegistryAssets: readonly ThirdPartySeizureAsset[] | readonly unknown[];
    thirdPartySeizuresUi: ThirdPartySeizure[];
};

export type UnifiedSeizureTabCounts = {
    property: number;
    salary: number;
    movable: number;
    third_party: number;
};
