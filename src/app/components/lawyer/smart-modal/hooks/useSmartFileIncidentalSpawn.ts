import { useCallback } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { IncidentalCase } from '../../LawyerShared';
import type { IncidentalSpawnContext } from '../smartFile/incidentalCaseLinking';

export type UseSmartFileIncidentalSpawnParams = {
    fileId: string | number;
    fileCaseNo: string | undefined;
    currentStageCaseNo: string | undefined;
    handleAddIncidentalCase: (caseData: IncidentalCase) => void;
    onSpawnLinkedIncidentalCase?: (ctx: IncidentalSpawnContext) => void;
    setShowIncidentalModal: (open: boolean) => void;
    setEditingIncidental: (c: IncidentalCase | null) => void;
};

export function useSmartFileIncidentalSpawn({
    fileId,
    fileCaseNo,
    currentStageCaseNo,
    handleAddIncidentalCase,
    onSpawnLinkedIncidentalCase,
    setShowIncidentalModal,
    setEditingIncidental,
}: UseSmartFileIncidentalSpawnParams) {
    return useCallback(
        (data: { type: 'joined' | 'counter'; details?: string; incidentalId: string }) => {
            const parentFileId = Number(fileId);
            const parentCaseNo = String(currentStageCaseNo || fileCaseNo || '').trim();
            const label = data.type === 'joined' ? 'دعوى منضمة' : 'دعوى متقابلة';

            handleAddIncidentalCase({
                id: data.incidentalId,
                type: data.type,
                partyName: label,
                details: data.details || '',
                date: getLocalTodayYmd(),
                status: 'active',
            } as IncidentalCase);

            setShowIncidentalModal(false);
            setEditingIncidental(null);

            onSpawnLinkedIncidentalCase?.({
                parentFileId,
                parentCaseNo,
                incidentalId: data.incidentalId,
                type: data.type,
            });
        },
        [
            fileId,
            fileCaseNo,
            currentStageCaseNo,
            handleAddIncidentalCase,
            onSpawnLinkedIncidentalCase,
            setShowIncidentalModal,
            setEditingIncidental,
        ],
    );
}
