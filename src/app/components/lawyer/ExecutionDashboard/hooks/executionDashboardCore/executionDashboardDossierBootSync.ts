/** boot / inaba / subfile — منطق نقي (موجة 13) */
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';
import {
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
} from '@/app/domain/execution/dossier/ExecutionDossierScope';
import { ensureSubDossierOpenedTimelineEvent, isInabaSubFileId } from '@/app/stores';

export function buildLegacyDecisionMigrationSources(input: {
    decisionsStorageExecutionId: string;
    executionId?: string;
    fileId?: string;
    activeSubFileId: string | null | undefined;
    activeTabId: string;
    currentFileId: string;
}): string[] {
    const target = String(input.decisionsStorageExecutionId || '').trim();
    if (!target || target === 'default' || target === 'undefined') return [];

    const legacyBase = String(input.executionId ?? input.fileId ?? '').trim();
    const legacySub = input.activeSubFileId ? `${legacyBase || target}__sub__${input.activeSubFileId}` : '';
    const tabId = String(input.activeTabId || '').trim();
    const baseId = String(input.currentFileId || '').trim();
    const legacyTab = tabId && baseId && tabId !== baseId ? tabId : '';

    return [legacyBase, legacySub, legacyTab]
        .map((x) => String(x || '').trim())
        .filter((x) => x && x !== 'default' && x !== 'undefined' && x !== target);
}

export function scopeTimelineEventsOnExecutionSwitch(
    executionData: ExecutionFile,
    activeSubFileId: string | null | undefined,
    parentDossierId: string,
): TimelineEvent[] {
    const raw = Array.isArray(executionData.timelineEvents) ? executionData.timelineEvents : [];
    const directorate = String(
        executionData.directorate ||
            (executionData as { delegationTargetDirectorate?: string }).delegationTargetDirectorate ||
            '',
    );

    if (isInabaSubFileId(executionData.id) && activeSubFileId && parentDossierId) {
        return ensureSubDossierOpenedTimelineEvent(
            filterTimelineEventsForInabaDossier(raw, activeSubFileId),
            activeSubFileId,
            parentDossierId,
            directorate,
        );
    }

    if (activeSubFileId && isInabaSubFileId(activeSubFileId)) {
        return filterTimelineEventsForInabaDossier(raw, activeSubFileId);
    }

    return raw;
}

function subDossierOpenedThreadKey(activeSubFileId: string): string {
    return `sub_dossier_opened:${activeSubFileId}`;
}

export function timelineHasSubDossierOpenedEvent(
    events: TimelineEvent[],
    activeSubFileId: string,
): boolean {
    const threadKey = subDossierOpenedThreadKey(activeSubFileId);
    return events.some(
        (e) =>
            String((e as { metadata?: Record<string, unknown> })?.metadata?.timelineThreadKey || '') ===
            threadKey,
    );
}

export type ExecutionFileLocalHydratePatch = {
    timelineEvents: TimelineEvent[];
    caseNotesLog: NonNullable<ExecutionFile['caseNotesLog']>;
    caseTasksPending: NonNullable<ExecutionFile['caseTasksPending']>;
    seizedAssets: SeizedAsset[];
    seizureDraftsByDecisionId: Record<string, SeizedAsset>;
    activeCoerciveActions: string[];
    realEstateSeizureAssets: ExecutionFile['realEstateSeizureAssets'];
};

export function buildExecutionFileLocalHydratePatch(
    executionData: ExecutionFile,
    activeSubFileId: string | null | undefined,
    parentDossierId: string,
): ExecutionFileLocalHydratePatch {
    const notes = executionData.caseNotesLog;
    const tasks = executionData.caseTasksPending;
    return {
        timelineEvents: scopeTimelineEventsOnExecutionSwitch(
            executionData,
            activeSubFileId,
            parentDossierId,
        ),
        caseNotesLog: Array.isArray(notes) ? notes : [],
        caseTasksPending: Array.isArray(tasks) ? tasks : [],
        seizedAssets: Array.isArray(executionData.seizedAssets) ? executionData.seizedAssets : [],
        seizureDraftsByDecisionId: executionData.seizureDraftsByDecisionId ?? {},
        activeCoerciveActions: Array.isArray(executionData.activeCoerciveActions)
            ? executionData.activeCoerciveActions
            : [],
        realEstateSeizureAssets: Array.isArray(executionData.realEstateSeizureAssets)
            ? executionData.realEstateSeizureAssets
            : [],
    };
}

export function buildExecutionFileCoerciveRefreshPatch(executionData: ExecutionFile): {
    seizedAssets: SeizedAsset[];
    activeCoerciveActions: string[];
    seizureDraftsByDecisionId: Record<string, SeizedAsset>;
    forcedAttendanceIssued: boolean;
    activeNoticeState: ExecutionFile['activeNoticeState'];
    caseTasksPending: NonNullable<ExecutionFile['caseTasksPending']>;
} {
    const dr = executionData.seizureDraftsByDecisionId;
    const ac = executionData.activeCoerciveActions;
    return {
        seizedAssets: Array.isArray(executionData.seizedAssets) ? executionData.seizedAssets : [],
        activeCoerciveActions: Array.isArray(ac) ? [...ac] : [],
        seizureDraftsByDecisionId:
            dr && typeof dr === 'object' && !Array.isArray(dr) ? (dr as Record<string, SeizedAsset>) : {},
        forcedAttendanceIssued:
            typeof executionData.forcedAttendanceIssued === 'boolean'
                ? executionData.forcedAttendanceIssued
                : false,
        activeNoticeState: executionData.activeNoticeState ?? null,
        caseTasksPending: Array.isArray(executionData.caseTasksPending)
            ? executionData.caseTasksPending
            : [],
    };
}
