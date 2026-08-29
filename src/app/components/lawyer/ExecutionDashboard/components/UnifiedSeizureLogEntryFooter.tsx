import React from 'react';
import type { SeizedAsset } from '@/app/types/execution';
import type { UnifiedSeizureLogEntryFooterProps } from './unifiedSeizureLogEntryFooter/UnifiedSeizureLogEntryFooterProps';
import {
    list,
    mergeSeizedMovables,
    mergeSeizedProperties,
    resolveMovableInlineSaveCtxForUnifiedLog,
} from './unifiedSeizureLogEntryFooter/unifiedSeizureLogEntryFooterHelpers';
import { renderPropertySeizureLogFooterBranches } from './unifiedSeizureLogEntryFooter/renderPropertySeizureLogFooterBranches';
import { renderMovableSeizureLogFooterBranches } from './unifiedSeizureLogEntryFooter/renderMovableSeizureLogFooterBranches';
import { renderSalaryThirdPartySeizureLogFooterBranches } from './unifiedSeizureLogEntryFooter/renderSalaryThirdPartySeizureLogFooterBranches';

export type { UnifiedSeizureLogEntryFooterProps } from './unifiedSeizureLogEntryFooter/UnifiedSeizureLogEntryFooterProps';

export function UnifiedSeizureLogEntryFooter(props: UnifiedSeizureLogEntryFooterProps) {
    const [salaryAssetOverrides, setSalaryAssetOverrides] = React.useState<Record<string, SeizedAsset>>({});
    const seizedPropertiesForSeizureLog = mergeSeizedProperties(
        list(props.seizedPropertiesForSeizureLog),
        props.executionData,
    );
    const seizedMovablesForSeizureLog = mergeSeizedMovables(
        list(props.seizedMovablesForSeizureLog),
        props.executionData,
    );
    const realEstateSeizureRegistryAssets = list(props.realEstateSeizureRegistryAssets);
    const movableSeizureRegistryAssets = list(props.movableSeizureRegistryAssets);
    const salarySeizureTabRows = list(props.salarySeizureTabRows);
    const thirdPartySeizureRegistryAssets = list(props.thirdPartySeizureRegistryAssets);
    const thirdPartySeizuresUi = list(props.thirdPartySeizuresUi);
    const movableInlineSaveCtx = React.useMemo(
        () =>
            resolveMovableInlineSaveCtxForUnifiedLog(
                props.movableInlineSaveCtx,
                seizedMovablesForSeizureLog,
                props.persistExecutionMerge,
            ),
        [
            props.movableInlineSaveCtx,
            seizedMovablesForSeizureLog,
            props.persistExecutionMerge,
        ],
    );
    const { entry } = props;
    const ctx = {
        props,
        entry,
        seizedPropertiesForSeizureLog,
        seizedMovablesForSeizureLog,
        realEstateSeizureRegistryAssets,
        movableSeizureRegistryAssets,
        salarySeizureTabRows,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        movableInlineSaveCtx,
        salaryAssetOverrides,
        setSalaryAssetOverrides,
    };

    const propertyNode = renderPropertySeizureLogFooterBranches(ctx);
    if (propertyNode !== undefined) return propertyNode;
    const movableNode = renderMovableSeizureLogFooterBranches(ctx);
    if (movableNode !== undefined) return movableNode;
    const salaryNode = renderSalaryThirdPartySeizureLogFooterBranches(ctx);
    if (salaryNode !== undefined) return salaryNode;
    return null;
}
