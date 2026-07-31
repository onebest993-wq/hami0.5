import type { SeizedMovable } from '@/app/types/execution';
import type { FinalizeCoerciveSeizureInput } from './executionDashboardCoerciveFinalizeTypes';
import {
    buildNextSeizedAssets,
    commitCoerciveFinalize,
    resolveFinalizeIdentity,
} from './executionDashboardCoerciveFinalizeShared';
import { upsertSeizedMovableFromDetails } from '../../helpers/seizureRegistryBridge';

export function finalizeCoerciveMovableSeizure(input: FinalizeCoerciveSeizureInput): void {
    const { decisionRowId, assetId } = resolveFinalizeIdentity(input);
    const cust = String(input.details.judicialCustodianName || '').trim();
    const mergedDesc =
        String(input.details.description || '').trim() ||
        [
            `وصف المال المنقول: ${String(input.details.movableDescription || input.details.movableAssetType || input.details.vehicleDescription || '').trim()}`,
            `المكان: ${String(input.details.movableLocation || '').trim()}`,
            cust ? `الحارس القضائي: ${cust}` : null,
        ]
            .filter(Boolean)
            .join('\n')
            .trim();

    const nextAssets = buildNextSeizedAssets({
        seizedAssets: input.seizedAssets,
        assetId,
        baseAssetType: 'movable',
        actionType: input.actionType,
        decisionRowId,
        details: input.details,
        mergedDesc,
    });

    const prevMov = (input.executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
    const persistPatch: Record<string, unknown> = {
        seizedMovables: upsertSeizedMovableFromDetails(prevMov, decisionRowId, {
            movableDescription: String(
                input.details.movableDescription || input.details.movableAssetType || input.details.vehicleDescription || '',
            ).trim(),
            movableLocation: String(input.details.movableLocation || '').trim(),
            judicialCustodianName: cust,
        }),
    };

    commitCoerciveFinalize({
        source: input,
        decisionRowId,
        assetId,
        mergedDesc,
        nextAssets,
        persistPatch,
    });
}
