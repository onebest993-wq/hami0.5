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
import type { CaseLinkPeerNav } from '@/app/components/lawyer/smart-modal/smartFile/caseLinking';
import {
    cloneFileForCaseLinkBrowse,
    removeInternalCaseLinkFromOrigin,
    resolveCaseLinkBrowseUi,
    resolveOutboundCaseLink,
    scrubPeerCaseLinkPollution,
} from '@/app/components/lawyer/smart-modal/smartFile/caseLinking';
import { normalizeFileId } from '@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking';
import { resolveConsolidationMergedOpenTarget } from '@/app/components/lawyer/smart-modal/smartFile/caseConsolidationLinking';
import { findLawsuitFileById } from '@/app/hooks/caseLinkingRuntime';

function saveCaseDeferred(userId: string, caseData: Record<string, unknown>): void {
    void import('@/app/services/lawyerDbRuntime')
        .then(({ LawyerDB }) => LawyerDB.saveCase(userId, caseData))
        .catch(debug.error);
}

type ActiveFile = FileData | ExecutionFile | null;

export type CaseLinkBrowseSession = {
    originFileId: number;
    originCaseNo: string;
    snapshot: FileData;
};

export type UseLawsuitActiveDossierOptions = {
    files: FileData[];
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    activeFile: ActiveFile;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    selectCase: (caseId: string) => void;
    openExecutionArchiveFile: (file: unknown) => boolean | Promise<boolean>;
    onOpenLinkedCriminalCase?: (criminalId: string) => void;
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
    onOpenLinkedCriminalCase,
}: UseLawsuitActiveDossierOptions) {
    const [caseLinkBrowse, setCaseLinkBrowse] = useState<CaseLinkBrowseSession | null>(null);

    const clearCaseLinkBrowse = useCallback(() => {
        setCaseLinkBrowse(null);
    }, []);

    const returnFromCaseLinkBrowse = useCallback(() => {
        if (!caseLinkBrowse) return;
        const origin = findLawsuitFileById(files, caseLinkBrowse.originFileId);
        setCaseLinkBrowse(null);
        if (origin) {
            setActiveFile(origin);
            selectCase(String(origin.id));
        }
    }, [caseLinkBrowse, files, selectCase, setActiveFile]);

    const handleUnlinkCaseLink = useCallback(
        (peer: { peerFileId?: number; peerCriminalId?: string }) => {
            const originId =
                caseLinkBrowse?.originFileId ??
                (activeFile && isFileData(activeFile) ? Number(activeFile.id) : null);
            if (originId == null || Number.isNaN(originId)) {
                SmartToast.error('تعذّر تحديد الإضبارة الأصلية');
                return;
            }

            const origin = findLawsuitFileById(files, originId);
            if (!origin) {
                SmartToast.error('تعذّر العثور على الإضبارة الأصلية');
                return;
            }

            const updatedOrigin = removeInternalCaseLinkFromOrigin(
                origin,
                peer.peerFileId,
                peer.peerCriminalId,
            );
            if (!updatedOrigin) {
                SmartToast.error('تعذّر فك الربط — تحقق من بيانات الربط');
                return;
            }

            setFiles((prev) =>
                persistLawsuitFiles(
                    prev.map((f) => (String(f.id) === String(originId) ? updatedOrigin : f)),
                ),
            );
            setCaseLinkBrowse(null);
            setActiveFile(updatedOrigin);
            selectCase(String(updatedOrigin.id));

            if (userId) {
                saveCaseDeferred(userId, updatedOrigin as unknown as Record<string, unknown>);
            }
            syncLawsuitFileToCalendar(updatedOrigin as unknown as Record<string, unknown>, userId);
            void refreshAppAlerts();
            SmartToast.success('تم فك ربط الدعوى — إضبارة المخزن لم تُمس');
        },
        [
            activeFile,
            caseLinkBrowse,
            files,
            refreshAppAlerts,
            selectCase,
            setActiveFile,
            setFiles,
            userId,
        ],
    );

    const openArchiveFile = useCallback(
        (f: unknown): boolean => {
            if (!isRealSignedIn(userId)) {
                SmartToast.error('يلزم تسجيل الدخول لفتح الإضبارة');
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
            const openTarget = scrubPeerCaseLinkPollution(
                resolveConsolidationMergedOpenTarget(files, resolved),
                files,
            );
            if (openTarget.id !== resolved.id) {
                SmartToast.info('هذه الإضبارة مُوحَّدة — فُتحت الإضبارة الموحّدة');
            }
            openLawsuitDossierWithContract(() => {
                selectCase(openTarget.id.toString());
                setActiveFile(openTarget);
            });
            return true;
        },
        [files, openExecutionArchiveFile, selectCase, setActiveFile, userId],
    );

    const handleOpenLinkedFile = useCallback(
        (linkedFileId: number, linkedCriminalId?: string) => {
            if (caseLinkBrowse) return;

            const activeId = activeFile && isFileData(activeFile) ? activeFile.id : null;
            if (activeId == null) {
                SmartToast.error('تعذّر تحديد الإضبارة الحالية');
                return;
            }

            const liveDossier =
                findLawsuitFileById(files, activeId) ?? (isFileData(activeFile) ? activeFile : null);
            if (!liveDossier) {
                SmartToast.error('تعذّر تحديد الإضبارة الحالية');
                return;
            }

            const outbound = resolveCaseLinkBrowseUi(liveDossier, liveDossier, files);
            const criminalId = String(linkedCriminalId ?? outbound?.peerCriminalId ?? '').trim();
            const isCriminalLink =
                outbound?.peerDossierKind === 'criminal' &&
                criminalId &&
                (!linkedCriminalId || criminalId === String(linkedCriminalId).trim());

            if (isCriminalLink) {
                if (!onOpenLinkedCriminalCase) {
                    SmartToast.error('تعذّر فتح الإضبارة الجزائية المربوطة');
                    return;
                }
                onOpenLinkedCriminalCase(criminalId);
                return;
            }

            const peerId = normalizeFileId(linkedFileId);
            const isCaseLinkBrowseNav =
                peerId !== null &&
                outbound != null &&
                normalizeFileId(outbound.peerFileId) === peerId;

            if (isCaseLinkBrowseNav) {
                const peer = findLawsuitFileById(files, peerId);
                if (!peer) {
                    SmartToast.error('تعذّر العثور على الدعوى المربوطة');
                    return;
                }
                const snapshot = cloneFileForCaseLinkBrowse(peer);
                setCaseLinkBrowse({
                    originFileId: Number(liveDossier.id),
                    originCaseNo: String(liveDossier.caseNo ?? '').trim(),
                    snapshot,
                });
                setActiveFile(snapshot);
                return;
            }

            const target = findLawsuitFileById(files, linkedFileId);
            if (!target) {
                SmartToast.error('تعذّر العثور على الإضبارة المرتبطة');
                return;
            }
            const openTarget = resolveConsolidationMergedOpenTarget(files, target);
            if (openTarget.id !== target.id) {
                SmartToast.info('هذه الإضبارة مُوحَّدة — فُتحت الإضبارة الموحّدة');
            }
            setCaseLinkBrowse(null);
            openLawsuitDossierWithContract(() => {
                selectCase(String(openTarget.id));
                setActiveFile(openTarget);
            });
        },
        [activeFile, caseLinkBrowse, files, onOpenLinkedCriminalCase, selectCase, setActiveFile],
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
        [caseLinkBrowse, files, refreshAppAlerts, setActiveFile, setFiles, userId],
    );

    const [caseLinkNav, setCaseLinkNav] = useState<CaseLinkPeerNav | null>(null);

    useEffect(() => {
        if (caseLinkBrowse) {
            setCaseLinkNav(null);
            return;
        }
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
    }, [activeFile, caseLinkBrowse, files]);

    const caseLinkViewOnly = Boolean(caseLinkBrowse);

    return {
        openArchiveFile,
        handleUpdateFile,
        handleOpenLinkedFile,
        caseLinkNav,
        caseLinkBrowse,
        caseLinkViewOnly,
        returnFromCaseLinkBrowse,
        clearCaseLinkBrowse,
        handleUnlinkCaseLink,
    };
}
