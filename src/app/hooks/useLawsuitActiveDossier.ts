import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { isFileData, isRecord, resolveOpenableFileData } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { persistLawsuitFiles } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { syncLawsuitFileToCalendar } from '@/app/services/calendar/dossierSyncLazy';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { openLawsuitDossierWithContract } from '@/app/runtime/lawsuitOpenContract';

function saveCaseDeferred(userId: string, caseData: Record<string, unknown>): void {
    void import('@/app/services/lawyerDbRuntime')
        .then(({ LawyerDB }) => LawyerDB.saveCase(userId, caseData))
        .catch(debug.error);
}

type ActiveFile = FileData | ExecutionFile | null;
type CaseLinkPeerNav = { first: FileData; second: FileData } | null;

export type UseLawsuitActiveDossierOptions = {
    files: FileData[];
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    activeFile: ActiveFile;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    selectCase: (caseId: string) => void;
    openExecutionArchiveFile: (file: unknown) => boolean | Promise<boolean>;
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
            if (!isRealSignedIn(userId)) {
                SmartToast.error('يلزم تسجيل الدخول لفتح الإضبارة');
                return false;
            }
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
            openLawsuitDossierWithContract(() => {
                selectCase(resolved.id.toString());
                setActiveFile(resolved);
            });
            return true;
        },
        [files, openExecutionArchiveFile, selectCase, setActiveFile, userId],
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

            // ربط الحكم بالدعوى الأم نادر — لا يسحب incidentalCaseLinking إلى stem LD
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

                        const parentFile = files.find((f) => f.id === childLink.parentFileId);
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

                        setFiles((prev) =>
                            persistLawsuitFiles(
                                prev.map((f) =>
                                    f.id === parentIncidentalPatch.id ? parentIncidentalPatch : f,
                                ),
                            ),
                        );
                        setActiveFile((prev) =>
                            prev && prev.id === parentIncidentalPatch.id
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
                    })
                    .catch(debug.error);
            }
        },
        [files, refreshAppAlerts, setActiveFile, setFiles, userId],
    );

    const [caseLinkNav, setCaseLinkNav] = useState<CaseLinkPeerNav>(null);

    useEffect(() => {
        const file = activeFile && isFileData(activeFile) ? activeFile : null;
        if (!file) {
            setCaseLinkNav(null);
            return;
        }
        let cancelled = false;
        void import('@/app/components/lawyer/smart-modal/smartFile/caseLinking')
            .then((m) => {
                if (!cancelled) {
                    setCaseLinkNav(m.resolveCaseLinkPeerNav(file, files));
                }
            })
            .catch(debug.error);
        return () => {
            cancelled = true;
        };
    }, [activeFile, files]);

    return {
        openArchiveFile,
        handleUpdateFile,
        caseLinkNav,
    };
}
