import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendarBridgePersistence';
import type { CaseStage, FileData } from '../../LawyerShared';
import { buildInitialParentDataFromFile } from '../smartFile/parentDataInit';
import { buildInitialStagesFromFile, resolveInitialStageIndex } from '../smartFile/stageInit';
import { resolveDisplayParties } from '../smartFile/resolveDisplayParties';

type ParentData = ReturnType<typeof buildInitialParentDataFromFile>;

export function resolveStableStageIndex(
    prevStages: CaseStage[],
    incomingStages: CaseStage[],
    prevIdx: number,
    fallbackIdx: number,
): number {
    const prevStageId = String(prevStages?.[prevIdx]?.id ?? '').trim();
    if (prevStageId) {
        const matchedIdx = incomingStages.findIndex((stage) => String(stage?.id ?? '').trim() === prevStageId);
        if (matchedIdx >= 0) return matchedIdx;
    }
    if (prevIdx >= 0 && prevIdx < incomingStages.length) return prevIdx;
    return fallbackIdx >= 0 && fallbackIdx < incomingStages.length ? fallbackIdx : 0;
}

export function resolveStableViewingStageIndex(
    prevStages: CaseStage[],
    incomingStages: CaseStage[],
    prevViewingIdx: number,
    prevActiveIdx: number,
    fallbackIdx: number,
): number {
    const prevViewingStageId = String(prevStages?.[prevViewingIdx]?.id ?? '').trim();
    const prevActiveStageId = String(prevStages?.[prevActiveIdx]?.id ?? '').trim();

    // إذا كان المستخدم يتابع المرحلة النشطة نفسها، فاتبع المرحلة النشطة الجديدة.
    if (prevViewingStageId && prevViewingStageId === prevActiveStageId) {
        return fallbackIdx >= 0 && fallbackIdx < incomingStages.length ? fallbackIdx : 0;
    }

    return resolveStableStageIndex(prevStages, incomingStages, prevViewingIdx, fallbackIdx);
}

export function useSmartFileModalFileSync(params: {
    file: FileData | null | undefined;
    parentData: ParentData;
    setParentData: React.Dispatch<React.SetStateAction<ParentData>>;
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    viewingStageIndex: number;
    setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
    setViewingStageIndex: React.Dispatch<React.SetStateAction<number>>;
    calendarUserId?: string;
}) {
    const {
        file,
        parentData,
        setParentData,
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        calendarUserId,
    } = params;

    const externalFileFingerprint = useMemo(() => {
        const f = file as FileData & { updatedAt?: string | number };
        const fileStages = Array.isArray(f?.stages) ? f.stages : [];
        const activeIdx =
            typeof f?.activeStageIndex === 'number' && f.activeStageIndex >= 0
                ? f.activeStageIndex
                : Math.max(0, fileStages.length - 1);
        const activeStage = fileStages[activeIdx] as
            | (CaseStage & {
                  fastTrackPetitions?: unknown[];
                  attachments?: unknown[];
                  tasks?: unknown[];
                  incidentalCases?: unknown[];
              })
            | undefined;
        return JSON.stringify({
            id: f?.id,
            caseNo: f?.caseNo,
            court: f?.court,
            judge: f?.judge,
            updatedAt: f?.updatedAt ?? null,
            status: f?.status ?? null,
            consolidationSecondaryRefs: f?.consolidationSecondaryRefs,
            mergedConsolidatedFileIds: f?.mergedConsolidatedFileIds,
            caseLinks: f?.caseLinks,
            timelineCount: Array.isArray(activeStage?.timeline) ? activeStage.timeline.length : 0,
            petitionsCount: Array.isArray(activeStage?.fastTrackPetitions)
                ? activeStage.fastTrackPetitions.length
                : 0,
            attachmentsCount: Array.isArray(activeStage?.attachments)
                ? activeStage.attachments.length
                : 0,
            tasksCount: Array.isArray(activeStage?.tasks) ? activeStage.tasks.length : 0,
            incidentalCount: Array.isArray(activeStage?.incidentalCases)
                ? activeStage.incidentalCases.length
                : 0,
            partiesCount: Array.isArray(activeStage?.parties) ? activeStage.parties.length : 0,
            stagesCount: fileStages.length,
            activeStageIndex: activeIdx,
        });
    }, [file]);

    const lastExternalFileFingerprintRef = useRef<string | null>(null);
    const hydratedStagePartyKeysRef = useRef(new Set<string>());

    useEffect(() => {
        hydratedStagePartyKeysRef.current.clear();
    }, [file?.id]);

    /**
     * تعبئة أحزاب العرض في الذاكرة فقط عند فراغ المرحلة —
     * لا saveToCloud عند الفتح (يمنع سباق مع تعديلات المستخدم).
     */
    useEffect(() => {
        const stageKey = `${String(file?.id ?? 'unknown')}:${viewingStageIndex}`;
        if (hydratedStagePartyKeysRef.current.has(stageKey)) return;

        const stage = stages[viewingStageIndex];
        const resolved = resolveDisplayParties({
            displayStage: stage,
            file,
            parentData,
            allStages: stages,
        });
        if (resolved.length === 0) return;

        const currentParties = stage?.parties;
        if (Array.isArray(currentParties) && currentParties.length > 0) {
            hydratedStagePartyKeysRef.current.add(stageKey);
            return;
        }

        hydratedStagePartyKeysRef.current.add(stageKey);
        setStages((prev) =>
            prev.map((s, i) => (i === viewingStageIndex ? { ...s, parties: resolved } : s)),
        );
        setParentData((prev) =>
            Array.isArray(prev.parties) && prev.parties.length > 0
                ? prev
                : { ...prev, parties: resolved },
        );
    }, [file, parentData, setParentData, setStages, stages, viewingStageIndex]);

    const lawsuitFileId = String(parentData?.id ?? file?.id ?? '');

    const onCalendarUnlink = useCallback(
        (unlinkParams: { sourceEventId: string }) => {
            void import('@/app/services/calendar/bridge/legacyCalendarBridge')
                .then((m) => {
                    m.CalendarBridge.remove(
                        'lawsuit',
                        lawsuitFileId,
                        unlinkParams.sourceEventId,
                        calendarUserId,
                    );
                })
                .catch(() => undefined);
        },
        [calendarUserId, lawsuitFileId],
    );

    useEffect(() => {
        const handler = (ev: Event) => {
            const detail = (ev as CustomEvent<CalendarSourcePatchDetail>).detail;
            if (!detail || detail.sourceModule !== 'lawsuit') return;
            if (String(detail.sourceEntityId) !== lawsuitFileId) return;
            void import('@/app/utils/lawsuitFilesStorage')
                .then((m) => {
                    const raw = m.loadLawsuitFilesRaw();
                    const row = raw.find(
                        (f) =>
                            f &&
                            typeof f === 'object' &&
                            String((f as { id?: unknown }).id) === lawsuitFileId,
                    );
                    if (!row || typeof row !== 'object') return;
                    const nextStages = (row as { stages?: unknown }).stages;
                    if (Array.isArray(nextStages)) {
                        setStages(nextStages as CaseStage[]);
                    }
                })
                .catch(() => undefined);
        };
        window.addEventListener(CALENDAR_SOURCE_PATCHED_EVENT, handler);
        return () => window.removeEventListener(CALENDAR_SOURCE_PATCHED_EVENT, handler);
    }, [lawsuitFileId, setStages]);

    useEffect(() => {
        if (lastExternalFileFingerprintRef.current === null) {
            lastExternalFileFingerprintRef.current = externalFileFingerprint;
            return;
        }
        if (lastExternalFileFingerprintRef.current === externalFileFingerprint) return;
        lastExternalFileFingerprintRef.current = externalFileFingerprint;

        const nextParent = buildInitialParentDataFromFile(file);
        const incomingStages = buildInitialStagesFromFile(file);
        const nextIdx = resolveInitialStageIndex(file, incomingStages.length, incomingStages);

        setParentData(nextParent);
        setStages((prev) => {
            const sameFile =
                String(file?.id ?? '') === String(parentData?.id ?? '')
                || (file?.id == null && prev.length > 0);
            if (sameFile && prev.length > incomingStages.length) {
                return prev;
            }
            return incomingStages;
        });
        setActiveStageIndex(nextIdx);
        setViewingStageIndex((prevIdx) => {
            const sameFile = String(file?.id ?? '') === String(parentData?.id ?? '');
            if (sameFile) {
                return resolveStableViewingStageIndex(
                    stages,
                    incomingStages,
                    prevIdx,
                    activeStageIndex,
                    nextIdx,
                );
            }
            return nextIdx;
        });
    }, [
        activeStageIndex,
        externalFileFingerprint,
        file,
        parentData?.id,
        setActiveStageIndex,
        setParentData,
        setStages,
        setViewingStageIndex,
        stages,
    ]);

    return { lawsuitFileId, onCalendarUnlink };
}
