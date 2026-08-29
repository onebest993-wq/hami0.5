import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { isRecord, resolveOpenableFileData } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { persistLawsuitFiles } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { commitLawsuitPersistOrWarn } from '@/app/hooks/lawsuitCommitWarn';
import { syncLawsuitFileToCalendar } from '@/app/services/calendar/dossierSyncLazy';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import { openLawsuitDossierWithContract } from '@/app/runtime/lawsuitOpenContract';
import { saveCaseDeferred } from '@/app/hooks/lawsuitPersistDeferred';
import type { CaseLinkBrowseSession } from '@/app/hooks/useLawsuitActiveDossierCaseLink';
import { normalizeFileId } from '@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking';

type ActiveFile = FileData | ExecutionFile | null;

type OpenUpdateDeps = {
    files: FileData[];
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    selectCase: (caseId: string) => void;
    openExecutionArchiveFile: (file: unknown) => boolean | Promise<boolean>;
    caseLinkBrowse: CaseLinkBrowseSession | null;
    setCaseLinkBrowse: Dispatch<SetStateAction<CaseLinkBrowseSession | null>>;
    scrubOpenTarget: (resolved: FileData) => FileData;
};

export function useLawsuitActiveDossierOpenUpdate({
    files,
    setFiles,
    setActiveFile,
    userId,
    refreshAppAlerts,
    selectCase,
    openExecutionArchiveFile,
    caseLinkBrowse,
    setCaseLinkBrowse,
    scrubOpenTarget,
}: OpenUpdateDeps) {
    const openArchiveFile = useCallback(
        (f: unknown): boolean => {
            if (!hasLocalAppSession(userId)) {
                SmartToast.error('تعذّر فتح الإضبارة — لا توجد جلسة محلية');
                return false;
            }
            setCaseLinkBrowse(null);
            if (isRecord(f) && f.type === 'execution') {
                const opened = openExecutionArchiveFile(f);
                if (opened && typeof (opened as Promise<boolean>).then === 'function') {
                    void (opened as Promise<boolean>);
                    return true;
                }
                return Boolean(opened);
            }
            const resolved = resolveOpenableFileData(f, files);
            if (!resolved) {
                SmartToast.error('تعذّر فتح الإضبارة — تحقق من بيانات الملف');
                return false;
            }
            const openTarget = scrubOpenTarget(resolved);
            if (openTarget.id !== resolved.id) {
                SmartToast.info('هذه الإضبارة مُوحَّدة — فُتحت الإضبارة الموحّدة');
            }
            openLawsuitDossierWithContract(() => {
                selectCase(openTarget.id.toString());
                setActiveFile(openTarget);
            });
            return true;
        },
        [
            files,
            openExecutionArchiveFile,
            scrubOpenTarget,
            selectCase,
            setActiveFile,
            setCaseLinkBrowse,
            userId,
        ],
    );

    const handleUpdateFile = useCallback(
        (updatedFile: FileData) => {
            if (caseLinkBrowse) return;

            const updatedId = String((updatedFile as FileData & { id?: unknown }).id ?? '');
            const normalizedFile: FileData = {
                ...updatedFile,
                parties: Array.isArray(updatedFile.parties) ? updatedFile.parties : [],
            } as FileData;
            const mergeFile = (prev: FileData): FileData => ({ ...prev, ...normalizedFile, id: prev.id });

            const before = files.find((f) => String(f.id) === updatedId);
            const childLink = normalizedFile.incidentalLink;

            setFiles((prev) => {
                const withChild = prev.map((f) => (String(f.id) === updatedId ? mergeFile(f) : f));
                return persistLawsuitFiles(withChild);
            });

            setActiveFile((prev) => {
                if (prev && String(prev.id) === updatedId) {
                    return mergeFile(prev as FileData);
                }
                return normalizedFile;
            });

            if (userId) {
                saveCaseDeferred(userId, normalizedFile as unknown as Record<string, unknown>);
            }
            syncLawsuitFileToCalendar(normalizedFile as unknown as Record<string, unknown>, userId);
            void refreshAppAlerts();
            void commitLawsuitPersistOrWarn('التعديل', [normalizedFile.id], {
                requireActiveFileId: normalizedFile.id,
            });

            if (childLink && before) {
                void import('@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking')
                    .then((m) => {
                        const beforeJudgment = m.readActiveStageJudgment(before);
                        const afterJudgment = m.readActiveStageJudgment(normalizedFile);
                        const judgmentJustClosed =
                            afterJudgment?.isClosed &&
                            afterJudgment.finalDecision &&
                            (!beforeJudgment?.isClosed ||
                                beforeJudgment.finalDecision !== afterJudgment.finalDecision);
                        if (!judgmentJustClosed) return;

                        const parentLinkId = normalizeFileId(childLink.parentFileId);
                        const parentFile = files.find(
                            (f) => normalizeFileId(f.id) === parentLinkId,
                        );
                        if (!parentFile) return;

                        const parentIncidentalPatch = m.patchParentIncidentalFromChildJudgment(
                            parentFile,
                            childLink.incidentalId,
                            {
                                finalDecision: afterJudgment.finalDecision!,
                                linkedCaseNo: String(normalizedFile.caseNo || '').trim(),
                                judgmentDate: afterJudgment.decisionDate,
                            },
                        ) as FileData | null;
                        if (!parentIncidentalPatch) return;

                        const patchedParentId = normalizeFileId(parentIncidentalPatch.id);
                        setFiles((prev) =>
                            persistLawsuitFiles(
                                prev.map((f) =>
                                    normalizeFileId(f.id) === patchedParentId
                                        ? parentIncidentalPatch
                                        : f,
                                ),
                            ),
                        );
                        setActiveFile((prev) =>
                            prev && normalizeFileId(prev.id) === patchedParentId
                                ? parentIncidentalPatch
                                : prev,
                        );

                        const label =
                            childLink.type === 'counter' ? 'الدعوى المتقابلة' : 'الدعوى المنضمة';
                        SmartToast.success(
                            `تم حسم ${label} — نُقلت نتيجة الحكم من الإضبارة المرتبطة ✅`,
                        );
                        if (userId) {
                            saveCaseDeferred(
                                userId,
                                parentIncidentalPatch as unknown as Record<string, unknown>,
                            );
                        }
                        syncLawsuitFileToCalendar(
                            parentIncidentalPatch as unknown as Record<string, unknown>,
                            userId,
                        );
                        void commitLawsuitPersistOrWarn(
                            'تحديث الدعوى الأصلية',
                            [parentIncidentalPatch.id],
                            { requireActiveFileId: parentIncidentalPatch.id },
                        );
                    })
                    .catch(debug.error);
            }
        },
        [caseLinkBrowse, files, refreshAppAlerts, setActiveFile, setFiles, userId],
    );

    return { openArchiveFile, handleUpdateFile };
}
