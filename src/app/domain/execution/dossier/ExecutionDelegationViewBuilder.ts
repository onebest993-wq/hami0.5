import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    filterTimelineEventsForInabaDossier,
    stampInabaTimelineEventMetadata,
} from './ExecutionDossierScope';

type ExecutionFileLegacyShape = ExecutionFile & {
    type?: string;
    parentId?: string;
    debtorCourt?: string;
    parties?: unknown[];
    creditor_party_death_case?: unknown;
    debtor_party_death_case?: unknown;
    party_death_case?: unknown;
    guarantor_followup?: { details_saved?: boolean } | null;
    procedural_guarantee?: { committed_to_followup?: boolean } | null;
    hasGuarantor?: boolean;
    decisions?: unknown[];
};

export const SUB_DOSSIER_OPENED_THREAD_PREFIX = 'sub_dossier_opened:';

export type ExecutionDelegationSubFile = {
    id: string;
    fileNumber: string;
    fileYear?: string;
    parentFileId?: string;
    debtorCourt?: string;
    directorate?: string;
    creditors?: unknown[];
    debtors?: unknown[];
    debtAmount?: number;
    claimType?: string;
    status?: string;
    dossier_lifecycle_status?: string;
    debtor_summons_marker?: unknown;
    decisions: unknown[];
    timelineEvents: TimelineEvent[];
    createdAt: string;
    updatedAt: string;
    delegationTargetDirectorate?: string;
    delegationPurpose?: string;
};

function cloneValue<T>(value: T | undefined): T | undefined {
    return value != null ? (JSON.parse(JSON.stringify(value)) as T) : undefined;
}

function copyPartyContextFromParent(parentFile: ExecutionFileLegacyShape): Record<string, unknown> {
    const creditors = cloneValue(parentFile.creditors) ?? [];
    const debtors = cloneValue(parentFile.debtors) ?? [];
    const parties =
        Array.isArray(parentFile.parties) && parentFile.parties.length > 0
            ? cloneValue(parentFile.parties)!
            : [...creditors, ...debtors];
    return {
        creditors,
        debtors,
        parties,
        party_multiplicity: cloneValue(parentFile.party_multiplicity),
        creditor_party_death_case: cloneValue(parentFile.creditor_party_death_case),
        debtor_party_death_case: cloneValue(parentFile.debtor_party_death_case),
        party_death_case: cloneValue(parentFile.party_death_case),
    };
}

export function buildSubDossierOpenedTimelineEvent(
    subFileId: string,
    parentId: string,
    directorate?: string,
): TimelineEvent {
    const resolvedSubId = String(subFileId || '').trim();
    const resolvedParentId = String(parentId || '').trim();
    const now = new Date().toISOString();
    const ymd = getLocalTodayYmd();
    const directorateLabel = String(directorate || '').trim();
    const base: TimelineEvent = {
        id: `sub-open-${resolvedSubId}-${ymd}`,
        type: 'other',
        title: 'فتح الإضبارة الفرعية',
        description: directorateLabel
            ? `تم فتح الإضبارة الفرعية — الدائرة المناب إليها: ${directorateLabel}`
            : 'تم فتح الإضبارة الفرعية',
        timestamp: now,
        date: ymd,
        source: 'نظام الإضبارة',
        metadata: {
            timelineThreadKey: `${SUB_DOSSIER_OPENED_THREAD_PREFIX}${resolvedSubId}`,
            dossierLifecycle: 'sub_dossier_opened',
        },
    } as TimelineEvent;

    return stampInabaTimelineEventMetadata(base, resolvedSubId, resolvedParentId);
}

export function ensureSubDossierOpenedTimelineEvent(
    events: TimelineEvent[],
    subFileId: string,
    parentId: string,
    directorate?: string,
): TimelineEvent[] {
    const resolvedSubId = String(subFileId || '').trim();
    const threadKey = `${SUB_DOSSIER_OPENED_THREAD_PREFIX}${resolvedSubId}`;
    const list = Array.isArray(events) ? [...events] : [];
    const hasOpen = list.some(
        (event) =>
            String((event as { metadata?: Record<string, unknown> })?.metadata?.timelineThreadKey || '') === threadKey,
    );
    if (hasOpen) return filterTimelineEventsForInabaDossier(list, resolvedSubId);

    const opened = buildSubDossierOpenedTimelineEvent(resolvedSubId, parentId, directorate);
    return filterTimelineEventsForInabaDossier([opened, ...list], resolvedSubId);
}

export function buildInabaDelegationViewFile(
    parentFile: ExecutionFile,
    subFile: ExecutionDelegationSubFile,
    parentId: string,
): ExecutionFile {
    const parent = parentFile as ExecutionFileLegacyShape;
    const guarantorFollowup = parent.guarantor_followup
        ? (JSON.parse(JSON.stringify(parent.guarantor_followup)) as ExecutionFileLegacyShape['guarantor_followup'])
        : undefined;
    const proceduralGuarantee = parent.procedural_guarantee
        ? (JSON.parse(JSON.stringify(parent.procedural_guarantee)) as ExecutionFileLegacyShape['procedural_guarantee'])
        : undefined;
    const subTimelineRaw = Array.isArray(subFile.timelineEvents) ? subFile.timelineEvents : [];
    const directorateLabel = String(
        subFile.delegationTargetDirectorate || subFile.directorate || parent.directorate || '',
    ).trim();
    const subTimeline = ensureSubDossierOpenedTimelineEvent(
        subTimelineRaw,
        subFile.id,
        parentId,
        directorateLabel,
    );
    const subDecisions = Array.isArray(subFile.decisions) ? [...subFile.decisions] : [];
    const partyContext = copyPartyContextFromParent(parent);
    const subFileNumber = String(subFile.fileNumber || '').trim();
    const subFileYear = String(subFile.fileYear || '').trim();

    return {
        type: parent.type,
        id: subFile.id,
        parentId,
        fileNumber: subFileNumber,
        fileYear: subFileYear,
        directorate: (subFile.delegationTargetDirectorate || subFile.directorate || parent.directorate) as ExecutionFile['directorate'],
        debtorCourt: subFile.debtorCourt || parent.debtorCourt,
        ...partyContext,
        debtAmount: parent.debtAmount,
        claimType: parent.claimType,
        status: subFile.status || parent.status,
        dossier_lifecycle_status: subFile.dossier_lifecycle_status || 'active',
        debtor_summons_marker: null,
        timelineEvents: subTimeline,
        decisions: subDecisions as ExecutionFileLegacyShape['decisions'],
        caseNotesLog: [],
        caseTasksPending: [],
        linkedDossiers: [],
        linkToken: undefined,
        delegationTargetDirectorate: subFile.delegationTargetDirectorate,
        delegationPurpose: subFile.delegationPurpose,
        ...(guarantorFollowup ? { guarantor_followup: guarantorFollowup } : {}),
        ...(proceduralGuarantee ? { procedural_guarantee: proceduralGuarantee } : {}),
        hasGuarantor: Boolean(
            parent.hasGuarantor || guarantorFollowup?.details_saved || proceduralGuarantee?.committed_to_followup,
        ),
        seizedAssets: [],
        realEstateSeizureAssets: [],
        thirdPartySeizureAssets: [],
        activeCoerciveActions: [],
        seizureDraftsByDecisionId: {},
        createdAt: subFile.createdAt,
        updatedAt: subFile.updatedAt,
    } as unknown as ExecutionFile;
}
