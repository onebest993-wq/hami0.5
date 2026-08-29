import { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CaseStage, IncidentalCase } from '../../LawyerShared';
import type { IncidentalSpawnContext } from '../smartFile/incidentalCaseLinking';
import { normalizeFileId } from '../smartFile/incidentalCaseLinking';

type UseSmartFileIncidentalSpawnParams = {
    fileId: string | number;
    fileCaseNo: string | undefined;
    currentStageCaseNo: string | undefined;
    /** المرحلة المعروضة حالياً في الإضبارة (وليس المرحلة النشطة فقط) */
    spawnStage: CaseStage | undefined;
    viewingStageIndex: number;
    fileFallback?: { court?: string; judge?: string; docType?: string };
    onSpawnLinkedIncidentalCase?: (ctx: IncidentalSpawnContext) => void;
    setShowIncidentalModal: (open: boolean) => void;
    setEditingIncidental: (c: IncidentalCase | null) => void;
};

export function useSmartFileIncidentalSpawn({
    fileId,
    fileCaseNo,
    currentStageCaseNo,
    spawnStage,
    viewingStageIndex,
    fileFallback,
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

            // لا نُنشئ الصف الحادث هنا — يُنشأ عند نجاح NewCase عبر patchIncidentalLinkedFile(createIfMissing)
            // حتى لا تبقى يتيمة بلا linkedFileId عند الإلغاء.
            onSpawnLinkedIncidentalCase({
                parentFileId,
                parentCaseNo,
                incidentalId: data.incidentalId,
                type: data.type,
                details: data.details,
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
            onSpawnLinkedIncidentalCase,
            setShowIncidentalModal,
            setEditingIncidental,
        ],
    );
}
