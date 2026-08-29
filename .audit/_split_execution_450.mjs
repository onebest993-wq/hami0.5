import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function write(rel, contents) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contents.replace(/\n/g, '\n'));
    const lines = contents.split(/\r?\n/).length;
    console.log(lines, rel);
}

// --- phone body keys ---
{
    const keysPath = path.join(
        root,
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.ts',
    );
    const src = fs.readFileSync(keysPath, 'utf8');
    const arrMatch = src.match(/export const EXECUTION_PHONE_BODY_PROP_KEYS = \[([\s\S]*?)\] as const;/);
    if (!arrMatch) throw new Error('phone keys array not found — already split?');
    const keys = [...arrMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const mid = Math.ceil(keys.length / 2);
    const head = keys.slice(0, mid);
    const tail = keys.slice(mid);
    const emitPart = (name, part) =>
        `/** جزء من EXECUTION_PHONE_BODY_PROP_KEYS — يُزامَن عبر scripts/sync-phone-body-missing-keys.mjs */\nexport const ${name} = [\n${part
            .map((k) => `    '${k}',`)
            .join('\n')}\n] as const;\n`;
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.head.ts',
        emitPart('EXECUTION_PHONE_BODY_PROP_KEYS_HEAD', head),
    );
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.tail.ts',
        emitPart('EXECUTION_PHONE_BODY_PROP_KEYS_TAIL', tail),
    );
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.ts',
        `/** مفاتيح جسم الدashboard — مُولَّد/مُزامَن عبر scripts/sync-phone-body-missing-keys.mjs */
import { EXECUTION_PHONE_BODY_PROP_KEYS_HEAD } from './executionPhoneBodyPropKeys.head';
import { EXECUTION_PHONE_BODY_PROP_KEYS_TAIL } from './executionPhoneBodyPropKeys.tail';

export const EXECUTION_PHONE_BODY_PROP_KEYS = [
    ...EXECUTION_PHONE_BODY_PROP_KEYS_HEAD,
    ...EXECUTION_PHONE_BODY_PROP_KEYS_TAIL,
] as const;

export type ExecutionPhoneBodyPropKey = (typeof EXECUTION_PHONE_BODY_PROP_KEYS)[number];
`,
    );
}

// --- collectHandlerClusterContext barrel ---
{
    const collectPath = path.join(
        root,
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/collectHandlerClusterContext.ts',
    );
    const src = fs.readFileSync(collectPath, 'utf8');
    const coreMatch = src.match(/export const HANDLER_CLUSTER_CORE_KEY_NAMES = \[([\s\S]*?)\] as const;/);
    if (!coreMatch) throw new Error('core key names not found');
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/handlerClusterCoreKeyNames.ts',
        `/** مفاتي core المتبقية (مرجع للتوليد) */\nexport const HANDLER_CLUSTER_CORE_KEY_NAMES = [${coreMatch[1]}] as const;\n`,
    );

    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/handlerClusterFoundationKeys.ts',
        `export const FOUNDATION_HANDLER_CLUSTER_KEYS = [
    'decisionsStorageExecutionId',
    'decisionsReloadEpoch',
    'executionData',
    'executionDataRef',
    'executionId',
    'parentDossierId',
    'persistExecutionMerge',
    'showToast',
    'setTimelineEvents',
    'pushTimelineEventRef',
    'realEstateSeizureAssets',
    'realEstateSeizureModalDecisionId',
    'realEstateSeizureSnapshotRef',
    'nextTimelineId',
    'setRealEstateSeizureAssets',
    'setShowRealEstateSeizureModal',
    'getLocalTodayYmd',
    'setThirdPartySeizuresUi',
    'linkSeizureAuctionToAppointments',
    'pushSeizureAuctionCalendarAppointment',
] as const;

export const FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS = [
    'executionDataRef',
    'executionId',
    'parentDossierId',
    'persistExecutionMerge',
    'setTimelineEvents',
    'pushTimelineEventRef',
] as const;
`,
    );

    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/collectFollowupAdminSpecialHandlerClusterContext.ts',
        `import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS } from './handlerClusterFoundationKeys';

const FOLLOWUP_ADMIN_SPECIAL_HANDLER_CLUSTER_KEYS = Array.from(
    new Set([
        ...FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS,
        'decisionsStorageExecutionId',
        'executionData',
        'nextTimelineId',
        'showToast',
        'specialRequestContent',
        'specialRequestDate',
        'specialRequestManualTitle',
        'setSpecialRequestContent',
        'setSpecialRequestDate',
        'setSpecialRequestManualTitle',
        'setSpecialRequestTemplatePick',
    ]),
) as string[];

export function collectFollowupAdminSpecialHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(handlerClusterSourceBags(spreads), FOLLOWUP_ADMIN_SPECIAL_HANDLER_CLUSTER_KEYS);
}
`,
    );

    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/collectFollowupDossierControlsHandlerClusterContext.ts',
        `import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS } from './handlerClusterFoundationKeys';

const FOLLOWUP_DOSSIER_CONTROLS_HANDLER_CLUSTER_KEYS = Array.from(
    new Set([
        ...FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS,
        'executionData',
        'decisionsStorageExecutionId',
        'isInabaActive',
        'isUnifiedTabActive',
        'parentExecutionFile',
        'setDossierActionModalOpen',
        'setDossierActionModalSaving',
        'setDossierActionModalType',
        'setExecutionStorageTick',
        'nextTimelineId',
        'persistExecutionMerge',
        'showToast',
    ]),
) as string[];

export function collectFollowupDossierControlsHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(
        handlerClusterSourceBags(spreads),
        FOLLOWUP_DOSSIER_CONTROLS_HANDLER_CLUSTER_KEYS,
    );
}
`,
    );

    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/collectFollowupOtherPartyHandlerClusterContext.ts',
        `import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS } from './handlerClusterFoundationKeys';

const FOLLOWUP_OTHER_PARTY_HANDLER_CLUSTER_KEYS = Array.from(
    new Set([
        ...FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS,
        'executionData',
        'executionDataRef',
        'executionId',
        'decisionsStorageExecutionId',
        'isRepresentingDebtor',
        'openDecisionsModalWithBoot',
        'timelineEvents',
        'nextTimelineId',
        'persistExecutionMerge',
        'showToast',
    ]),
) as string[];

export function collectFollowupOtherPartyHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(handlerClusterSourceBags(spreads), FOLLOWUP_OTHER_PARTY_HANDLER_CLUSTER_KEYS);
}
`,
    );

    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/collectDossierSupportHandlerClusterContext.ts',
        `import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { FOUNDATION_HANDLER_CLUSTER_KEYS } from './handlerClusterFoundationKeys';

const DOSSIER_SUPPORT_HANDLER_CLUSTER_KEYS = Array.from(
    new Set([
        ...FOUNDATION_HANDLER_CLUSTER_KEYS,
        'classification',
        'closeDossierLifecyclePanel',
        'directorate',
        'docNumber',
        'dossierDateDraft',
        'dossierFileKey',
        'dossierPendingStatus',
        'dossierReasonDraft',
        'evictionFullAddressField',
        'evictionPremisesUseRaw',
        'evictionPropertyDistrict',
        'evictionPropertyNumber',
        'evictionPropertyTypeField',
        'fileNumber',
        'fileYear',
        'financialLedgerRef',
        'isEvictionExecutionModule',
        'judgmentDate',
        'onUpdate',
        'parentExecutionFile',
        'reconcileDossierLifecycle',
        'seizedAssetsSnapshotRef',
        'setDossierDateDraft',
        'setDossierLifecyclePanelPhase',
        'setDossierPendingStatus',
        'setDossierReasonDraft',
        'setExecutionStorageTick',
    ]),
) as string[];

export function collectDossierSupportHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(handlerClusterSourceBags(spreads), DOSSIER_SUPPORT_HANDLER_CLUSTER_KEYS);
}
`,
    );

    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/collectHandlerClusterContext.ts',
        `/** Phase C Slice 23 — تجميع ctx لـ handler cluster من orchestrators + core */
export type { HandlerClusterContextSpreads } from './handlerClusterContextShared';
export { collectFullHandlerClusterContext as collectHandlerClusterContext } from './handlerClusterContextShared';
export { collectFollowupAdminSpecialHandlerClusterContext } from './collectFollowupAdminSpecialHandlerClusterContext';
export { collectFollowupDossierControlsHandlerClusterContext } from './collectFollowupDossierControlsHandlerClusterContext';
export { collectFollowupOtherPartyHandlerClusterContext } from './collectFollowupOtherPartyHandlerClusterContext';
export { collectSeizureHeavyHandlerClusterContext } from './collectSeizureHeavyHandlerClusterContext';
export { collectDossierSupportHandlerClusterContext } from './collectDossierSupportHandlerClusterContext';
export { HANDLER_CLUSTER_CORE_KEY_NAMES } from './handlerClusterCoreKeyNames';
`,
    );
}

console.log('done');
