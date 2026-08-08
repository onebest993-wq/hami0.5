import { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { CaseStage, IncidentalCase } from '../../LawyerShared';
import type { IncidentalSpawnContext } from '../smartFile/incidentalCaseLinking';
import { normalizeFileId } from '../smartFile/incidentalCaseLinking';

export type UseSmartFileIncidentalSpawnParams = {
    fileId: string | number;
    fileCaseNo: string | undefined;
    currentStageCaseNo: string | undefined;
    /** المرحلة المعروضة حالياً في الإضبارة (وليس المرحلة النشطة فقط) */
    spawnStage: CaseStage | undefined;
    viewingStageIndex: number;
    fileFallback?: { court?: string; judge?: string; docType?: string };
    handleAddIncidentalCase: (caseData: IncidentalCase) => void;
    onSpawnLinkedIncidentalCase?: (ctx: IncidentalSpawnContext) => void;
    setShowIncidentalModal: (open: boolean) => void;
    setEditingIncidental: (c: IncidentalCase | null) => void;
};

function summarizeSpawnPartyName(
    type: 'joined' | 'counter',
    stage: CaseStage | undefined,
): string {
    const parties = Array.isArray(stage?.parties) ? stage.parties : [];
    const names = parties
        .map((p) => String(p.name ?? '').trim())
        .filter(Boolean);
    if (names.length === 0) {
        return type === 'joined' ? 'دعوى منضمة' : 'دعوى متقابلة';
    }
    if (names.length <= 2) return names.join(' — ');
    return `${names.slice(0, 2).join(' — ')} (+${names.length - 2})`;
}

export function useSmartFileIncidentalSpawn({
    fileId,
    fileCaseNo,
    currentStageCaseNo,
    spawnStage,
    viewingStageIndex,
    fileFallback,
    handleAddIncidentalCase,
    onSpawnLinkedIncidentalCase,
    setShowIncidentalModal,
    setEditingIncidental,
}: UseSmartFileIncidentalSpawnParams) {
    return useCallback(
        (data: { type: 'joined' | 'counter'; details?: string; incidentalId: string }) => {
            const parentFileId = normalizeFileId(fileId);
            if (parentFileId === null) {
                SmartToast.error('تعذّر تحديد الإضبارة الحالية');
                return;
            }
            const parentCaseNo = String(currentStageCaseNo || fileCaseNo || '').trim();
            const partyName = summarizeSpawnPartyName(data.type, spawnStage);

            handleAddIncidentalCase({
                id: data.incidentalId,
                type: data.type,
                partyName,
                details: data.details || '',
                date: getLocalTodayYmd(),
                status: 'active',
            } as IncidentalCase);

            setShowIncidentalModal(false);
            setEditingIncidental(null);

            if (!onSpawnLinkedIncidentalCase) {
                SmartToast.error('تعذّر فتح نموذج الإضبارة المرتبطة');
                return;
            }

            const stageOverride = spawnStage
                ? {
                      stageIndex: viewingStageIndex,
                      stageName: String(spawnStage.stageName ?? '').trim(),
                      court: String(spawnStage.court ?? fileFallback?.court ?? '').trim(),
                      judge: String(spawnStage.judge ?? fileFallback?.judge ?? '').trim(),
                      docType: String(spawnStage.docType ?? fileFallback?.docType ?? '').trim(),
                      retrialTargetStage: String(spawnStage.retrialTargetStage ?? '').trim() || undefined,
                      parties: Array.isArray(spawnStage.parties) ? spawnStage.parties : [],
                  }
                : undefined;

            onSpawnLinkedIncidentalCase({
                parentFileId,
                parentCaseNo,
                incidentalId: data.incidentalId,
                type: data.type,
                stageOverride,
            });
        },
        [
            fileId,
            fileCaseNo,
            currentStageCaseNo,
            spawnStage,
            viewingStageIndex,
            fileFallback,
            handleAddIncidentalCase,
            onSpawnLinkedIncidentalCase,
            setShowIncidentalModal,
            setEditingIncidental,
        ],
    );
}
