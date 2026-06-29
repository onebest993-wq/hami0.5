import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { isFileData, isRecord, resolveOpenableFileData } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { persistLawsuitFiles } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import {
    patchParentIncidentalFromChildJudgment,
    readActiveStageJudgment,
} from '@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking';
import { resolveCaseLinkPeerNav } from '@/app/components/lawyer/smart-modal/smartFile/caseLinking';
import { syncLawsuitFileToCalendar } from '@/app/services/calendarDossierSync';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { warmLawsuitWorkspace } from '@/app/utils/lazyComponents';

type ActiveFile = FileData | ExecutionFile | null;

export type UseLawsuitActiveDossierOptions = {
    files: FileData[];
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    activeFile: ActiveFile;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    selectCase: (caseId: string) => void;
    openExecutionArchiveFile: (file: unknown) => boolean;
};

export function useLawsuitActiveDossier({
    files,
    setFiles,
    activeFile,
    setActiveFile,
    userId,
    refreshAppAlerts,
    selectCase,
    openExecutionArchiveFile,
}: UseLawsuitActiveDossierOptions) {
    const openArchiveFile = useCallback(
        (f: unknown): boolean => {
            if (isRecord(f) && f.type === 'execution') {
                return openExecutionArchiveFile(f);
            }
            const resolved = resolveOpenableFileData(f, files);
            if (!resolved) {
                SmartToast.error('تعذّر فتح الإضبارة — تحقق من بيانات الملف');
                return false;
            }
            warmLawsuitWorkspace();
            selectCase(resolved.id.toString());
            setActiveFile(resolved);
            return true;
        },
        [files, openExecutionArchiveFile, selectCase, setActiveFile],
    );

    const handleUpdateFile = useCallback(
        (updatedFile: FileData) => {
            const updatedId = String((updatedFile as FileData & { id?: unknown }).id ?? '');
            const normalizedFile: FileData = {
                ...updatedFile,
                parties: Array.isArray(updatedFile.parties) ? updatedFile.parties : [],
            } as FileData;
            const mergeFile = (prev: FileData): FileData => ({ ...prev, ...normalizedFile, id: prev.id });

            const before = files.find((f) => String(f.id) === updatedId);

            let parentIncidentalPatch: FileData | null = null;
            const childLink = normalizedFile.incidentalLink;
            if (childLink && before) {
                const beforeJudgment = readActiveStageJudgment(before);
                const afterJudgment = readActiveStageJudgment(normalizedFile);
                const judgmentJustClosed =
                    afterJudgment?.isClosed &&
                    afterJudgment.finalDecision &&
                    (!beforeJudgment?.isClosed ||
                        beforeJudgment.finalDecision !== afterJudgment.finalDecision);
                if (judgmentJustClosed) {
                    const parentFile = files.find((f) => f.id === childLink.parentFileId);
                    if (parentFile) {
                        parentIncidentalPatch = patchParentIncidentalFromChildJudgment(
                            parentFile,
                            childLink.incidentalId,
                            {
                                finalDecision: afterJudgment.finalDecision!,
                                linkedCaseNo: String(normalizedFile.caseNo || '').trim(),
                                judgmentDate: afterJudgment.decisionDate,
                            },
                        ) as FileData | null;
                    }
                }
            }

            setFiles((prev) => {
                const withChild = prev.map((f) => (String(f.id) === updatedId ? mergeFile(f) : f));
                const next = parentIncidentalPatch
                    ? withChild.map((f) =>
                          f.id === parentIncidentalPatch!.id ? parentIncidentalPatch! : f,
                      )
                    : withChild;
                return persistLawsuitFiles(next);
            });

            setActiveFile((prev) => {
                if (parentIncidentalPatch && prev && prev.id === parentIncidentalPatch.id) {
                    return parentIncidentalPatch;
                }
                if (prev && String(prev.id) === updatedId) {
                    return mergeFile(prev as FileData);
                }
                return normalizedFile;
            });

            if (parentIncidentalPatch) {
                const label =
                    childLink?.type === 'counter' ? 'الدعوى المتقابلة' : 'الدعوى المنضمة';
                SmartToast.success(`تم حسم ${label} — نُقلت نتيجة الحكم من الإضبارة المرتبطة ✅`);
                if (userId) {
                    void import('@/app/services/lawyer-cloud').then(({ LawyerDB }) => {
                        LawyerDB.saveCase(
                            userId,
                            parentIncidentalPatch as unknown as Record<string, unknown>,
                        ).catch(debug.error);
                    });
                }
                syncLawsuitFileToCalendar(
                    parentIncidentalPatch as unknown as Record<string, unknown>,
                    userId,
                );
            }

            if (userId) {
                void import('@/app/services/lawyer-cloud').then(({ LawyerDB }) => {
                    LawyerDB.saveCase(
                        userId,
                        normalizedFile as unknown as Record<string, unknown>,
                    ).catch(debug.error);
                });
            }
            syncLawsuitFileToCalendar(normalizedFile as unknown as Record<string, unknown>, userId);

            void refreshAppAlerts();
        },
        [files, refreshAppAlerts, setActiveFile, setFiles, userId],
    );

    const caseLinkNav = useMemo(
        () =>
            resolveCaseLinkPeerNav(
                activeFile && isFileData(activeFile) ? activeFile : null,
                files,
            ),
        [activeFile, files],
    );

    return {
        openArchiveFile,
        handleUpdateFile,
        caseLinkNav,
    };
}
