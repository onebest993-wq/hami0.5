import type { SeizedProperty } from '@/app/types/execution';
import type { FinalizeCoerciveSeizureInput } from './executionDashboardCoerciveFinalizeTypes';
import {
    buildNextSeizedAssets,
    commitCoerciveFinalize,
    resolveFinalizeIdentity,
} from './executionDashboardCoerciveFinalizeShared';
import { upsertSeizedPropertyFromDetails } from '../../helpers/seizureRegistryBridge';

export function finalizeCoercivePropertySeizure(input: FinalizeCoerciveSeizureInput): void {
    const { decisionRowId, assetId } = resolveFinalizeIdentity(input);
    const mergedDesc =
        String(input.details.description || '').trim() ||
        `رقم العقار: ${input.details.propertyNumber || ''}\nالمقاطعة: ${input.details.propertyDistrict || ''}\nالنوع: ${input.details.propertyType || ''}`.trim();

    const nextAssets = buildNextSeizedAssets({
        seizedAssets: input.seizedAssets,
        assetId,
        baseAssetType: 'real_estate',
        actionType: input.actionType,
        decisionRowId,
        details: input.details,
        mergedDesc,
    });

    const prevProps = (input.executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
    const persistPatch: Record<string, unknown> = {
        seizedProperties: upsertSeizedPropertyFromDetails(prevProps, decisionRowId, {
            propertyNumber: String(input.details.propertyNumber || '').trim(),
            propertyDistrict: String(input.details.propertyDistrict || '').trim(),
            propertyType: String(input.details.propertyType || '').trim(),
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
