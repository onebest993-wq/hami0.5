import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import {
    filterTimelineEventsForInabaDossier,
    stampInabaTimelineEventMetadata,
} from '@/app/domain/execution/dossier/ExecutionDossierScope';
import type { SubExecutionFile } from './types';

const SUB_DOSSIER_OPENED_THREAD_PREFIX = 'sub_dossier_opened:';

/** حدث افتتاح الإضبارة الفرعية — أول سجل زمني لها */
export function buildSubDossierOpenedTimelineEvent(
    subFileId: string,
    parentId: string,
    directorate?: string
): TimelineEvent {
    const subId = String(subFileId || '').trim();
    const pId = String(parentId || '').trim();
    const now = new Date().toISOString();
    const ymd = getLocalTodayYmd();
    const dirLabel = String(directorate || '').trim();
    const base: TimelineEvent = {
        id: `sub-open-${subId}-${ymd}`,
        type: 'other',
        title: 'فتح الإضبارة الفرعية',
        description: dirLabel
            ? `تم فتح الإضبارة الفرعية — الدائرة المناب إليها: ${dirLabel}`
            : 'تم فتح الإضبارة الفرعية',
        timestamp: now,
        date: ymd,
        source: 'نظام الإضبارة',
        metadata: {
            timelineThreadKey: `${SUB_DOSSIER_OPENED_THREAD_PREFIX}${subId}`,
            dossierLifecycle: 'sub_dossier_opened',
        },
    } as TimelineEvent;
    return stampInabaTimelineEventMetadata(base, subId, pId);
}

export function ensureSubDossierOpenedTimelineEvent(
    events: TimelineEvent[],
    subFileId: string,
    parentId: string,
    directorate?: string
): TimelineEvent[] {
    const subId = String(subFileId || '').trim();
    const threadKey = `${SUB_DOSSIER_OPENED_THREAD_PREFIX}${subId}`;
    const list = Array.isArray(events) ? [...events] : [];
    const hasOpen = list.some(
        (e) => String((e as { metadata?: Record<string, unknown> })?.metadata?.timelineThreadKey || '') === threadKey
    );
    if (hasOpen) return filterTimelineEventsForInabaDossier(list, subId);
    const opened = buildSubDossierOpenedTimelineEvent(subId, parentId, directorate);
    return filterTimelineEventsForInabaDossier([opened, ...list], subId);
}

function copyPartyContextFromParent(parentFile: ExecutionFile): Partial<ExecutionFile> {
    const clone = <T>(v: T | undefined): T | undefined =>
        v != null ? (JSON.parse(JSON.stringify(v)) as T) : undefined;
    const creditors = clone(parentFile.creditors) ?? [];
    const debtors = clone(parentFile.debtors) ?? [];
    const parties =
        Array.isArray(parentFile.parties) && parentFile.parties.length > 0
            ? clone(parentFile.parties)!
            : ([...creditors, ...debtors] as ExecutionFile['parties']);
    return {
        creditors,
        debtors,
        parties,
        party_multiplicity: clone(parentFile.party_multiplicity),
        creditor_party_death_case: clone(parentFile.creditor_party_death_case),
        debtor_party_death_case: clone(parentFile.debtor_party_death_case),
        party_death_case: clone(parentFile.party_death_case),
    };
}

/** عرض إضبارة الإنابة — إضبارة جديدة فارغة + الكفيل (مالي/إجرائي) فقط */
export function buildInabaDelegationViewFile(
    parentFile: ExecutionFile,
    subFile: SubExecutionFile,
    parentId: string
): ExecutionFile {
    const gf = parentFile.guarantor_followup
        ? (JSON.parse(JSON.stringify(parentFile.guarantor_followup)) as ExecutionFile['guarantor_followup'])
        : undefined;
    const pg = parentFile.procedural_guarantee
        ? (JSON.parse(JSON.stringify(parentFile.procedural_guarantee)) as ExecutionFile['procedural_guarantee'])
        : undefined;
    const subTimelineRaw = Array.isArray(subFile.timelineEvents) ? subFile.timelineEvents : [];
    const dirLabel = String(
        subFile.delegationTargetDirectorate || subFile.directorate || parentFile.directorate || ''
    ).trim();
    const subTimeline = ensureSubDossierOpenedTimelineEvent(
        subTimelineRaw,
        subFile.id,
        parentId,
        dirLabel
    );
    const subDecisions = Array.isArray(subFile.decisions) ? [...subFile.decisions] : [];
    const partyCtx = copyPartyContextFromParent(parentFile);
    const subFileNumber = String(subFile.fileNumber || '').trim();
    const subFileYear = String((subFile as { fileYear?: string }).fileYear || '').trim();

    return {
        type: parentFile.type,
        id: subFile.id,
        parentId,
        fileNumber: subFileNumber,
        fileYear: subFileYear,
        directorate: (subFile.delegationTargetDirectorate || subFile.directorate || parentFile.directorate) as ExecutionFile['directorate'],
        debtorCourt: subFile.debtorCourt || parentFile.debtorCourt,
        ...partyCtx,
        debtAmount: parentFile.debtAmount,
        claimType: parentFile.claimType,
        status: subFile.status || parentFile.status,
        dossier_lifecycle_status: subFile.dossier_lifecycle_status || 'active',
        debtor_summons_marker: null,
        timelineEvents: subTimeline,
        decisions: subDecisions as ExecutionFile['decisions'],
        caseNotesLog: [],
        caseTasksPending: [],
        linkedDossiers: [],
        linkToken: undefined,
        delegationTargetDirectorate: subFile.delegationTargetDirectorate,
        delegationPurpose: subFile.delegationPurpose,
        ...(gf ? { guarantor_followup: gf } : {}),
        ...(pg ? { procedural_guarantee: pg } : {}),
        hasGuarantor: Boolean(
            parentFile.hasGuarantor || gf?.details_saved || pg?.committed_to_followup
        ),
        seizedAssets: [],
        realEstateSeizureAssets: [],
        thirdPartySeizureAssets: [],
        activeCoerciveActions: [],
        seizureDraftsByDecisionId: {},
        createdAt: subFile.createdAt,
        updatedAt: subFile.updatedAt,
    } as ExecutionFile;
}

export function persistParentExecutionFile(parentId: string, file: ExecutionFile) {
    const pid = String(parentId || '').trim();
    if (!pid) return;
    try {
        storageCache.set(executionStorageKey(pid), file);
    } catch {
        /* ignore */
    }
}
