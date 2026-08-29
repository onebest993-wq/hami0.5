import type React from 'react';
import type {
    SeizedMovable,
    SeizedProperty,
    SeizedAsset,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
} from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { UnifiedSeizureLogEntryFooterProps } from './UnifiedSeizureLogEntryFooterProps';

export type UnifiedSeizureLogFooterBranchCtx = {
    props: UnifiedSeizureLogEntryFooterProps;
    entry: UnifiedSeizureLogEntry;
    seizedPropertiesForSeizureLog: SeizedProperty[];
    seizedMovablesForSeizureLog: SeizedMovable[];
    realEstateSeizureRegistryAssets: unknown[];
    movableSeizureRegistryAssets: SeizedAsset[];
    salarySeizureTabRows: SeizedAsset[];
    thirdPartySeizureRegistryAssets: ThirdPartySeizureAsset[];
    thirdPartySeizuresUi: ThirdPartySeizure[];
    movableInlineSaveCtx: MovableInlineSaveContext;
    salaryAssetOverrides: Record<string, SeizedAsset>;
    setSalaryAssetOverrides: React.Dispatch<React.SetStateAction<Record<string, SeizedAsset>>>;
};
