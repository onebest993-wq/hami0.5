import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CalendarBridge } from '@/app/services/calendarBridge';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendarBridgePersistence';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import type { CaseStage, FileData } from '../../LawyerShared';
import { buildInitialParentDataFromFile } from '../smartFile/parentDataInit';
import { buildInitialStagesFromFile, resolveInitialStageIndex } from '../smartFile/stageInit';
import { resolveDisplayParties } from '../smartFile/resolveDisplayParties';

type ParentData = ReturnType<typeof buildInitialParentDataFromFile>;

export function useSmartFileModalFileSync(params: {
    file: FileData | null | undefined;
    parentData: ParentData;
    setParentData: React.Dispatch<React.SetStateAction<ParentData>>;
    stages: CaseStage[];
    setStages: React.Dispatch<React.SetStateAction<CaseStage[]>>;
    viewingStageIndex: number;
    setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
    setViewingStageIndex: React.Dispatch<React.SetStateAction<number>>;
    saveToCloud: (
        nextStages: CaseStage[],
        nextParent: ParentData,
        stageIndex: number,
    ) => void;
    calendarUserId?: string;
}) {
    const {
        file,
        parentData,
        setParentData,
        stages,
        setStages,
        viewingStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        saveToCloud,
        calendarUserId,
    } = params;

    const externalFileFingerprint = useMemo(() => {
        const f = file as FileData;
        const fileStages = Array.isArray(f?.stages) ? f.stages : [];
        const activeIdx =
            typeof f?.activeStageIndex === 'number' && f.activeStageIndex >= 0
                ? f.activeStageIndex
                : Math.max(0, fileStages.length - 1);
        const activeStage = fileStages[activeIdx];
        return JSON.stringify({
            id: f?.id,
            caseNo: f?.caseNo,
            court: f?.court,
            judge: f?.judge,
            consolidationSecondaryRefs: f?.consolidationSecondaryRefs,
            caseLinks: f?.caseLinks,
            timelineCount: Array.isArray(activeStage?.timeline) ? activeStage.timeline.length : 0,
            stagesCount: fileStages.length,
        });
    }, [file]);

    const lastExternalFileFingerprintRef = useRef<string | null>(null);
    const hydratedStagePartyKeysRef = useRef(new Set<string>());

    useEffect(() => {
        hydratedStagePartyKeysRef.current.clear();
    }, [file?.id]);

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
        const updatedStages = [...stages];
        updatedStages[viewingStageIndex] = { ...stage!, parties: resolved };
        setStages(updatedStages);
        const nextParent = { ...parentData, parties: resolved };
        setParentData(nextParent);
        saveToCloud(updatedStages, nextParent, viewingStageIndex);
    }, [
        file,
        parentData,
        saveToCloud,
        setParentData,
        setStages,
        stages,
        viewingStageIndex,
    ]);

    const lawsuitFileId = String(parentData?.id ?? file?.id ?? '');

    const onCalendarUnlink = useCallback(
        (unlinkParams: { sourceEventId: string }) => {
            CalendarBridge.remove('lawsuit', lawsuitFileId, unlinkParams.sourceEventId, calendarUserId);
        },
        [calendarUserId, lawsuitFileId],
    );

    useEffect(() => {
        const handler = (ev: Event) => {
            const detail = (ev as CustomEvent<CalendarSourcePatchDetail>).detail;
            if (!detail || detail.sourceModule !== 'lawsuit') return;
            if (String(detail.sourceEntityId) !== lawsuitFileId) return;
            const raw = loadLawsuitFilesRaw();
            const row = raw.find(
                (f) => f && typeof f === 'object' && String((f as { id?: unknown }).id) === lawsuitFileId,
            );
            if (!row || typeof row !== 'object') return;
            const nextStages = (row as { stages?: unknown }).stages;
            if (Array.isArray(nextStages)) {
                setStages(nextStages as CaseStage[]);
            }
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
        setActiveStageIndex((prevIdx) => {
            const sameFile = String(file?.id ?? '') === String(parentData?.id ?? '');
            if (sameFile && prevIdx > nextIdx) return prevIdx;
            return nextIdx;
        });
        setViewingStageIndex((prevIdx) => {
            const sameFile = String(file?.id ?? '') === String(parentData?.id ?? '');
            if (sameFile && prevIdx > nextIdx) return prevIdx;
            return nextIdx;
        });
    }, [
        externalFileFingerprint,
        file,
        parentData?.id,
        setActiveStageIndex,
        setParentData,
        setStages,
        setViewingStageIndex,
    ]);

    return { lawsuitFileId, onCalendarUnlink };
}
