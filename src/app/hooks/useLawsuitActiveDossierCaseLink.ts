import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { isFileData } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { persistLawsuitFiles } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { commitLawsuitPersistOrWarn } from '@/app/hooks/lawsuitCommitWarn';
import { syncLawsuitFileToCalendar } from '@/app/services/calendar/dossierSyncLazy';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { openLawsuitDossierWithContract } from '@/app/runtime/lawsuitOpenContract';
import type { CaseLinkPeerNav } from '@/app/components/lawyer/smart-modal/smartFile/caseLinking';
import {
    cloneFileForCaseLinkBrowse,
    removeInternalCaseLinkFromOrigin,
    resolveCaseLinkBrowseUi,
    scrubPeerCaseLinkPollution,
} from '@/app/components/lawyer/smart-modal/smartFile/caseLinking';
import { normalizeFileId } from '@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking';
import { resolveConsolidationMergedOpenTarget } from '@/app/components/lawyer/smart-modal/smartFile/consolidationOpenTarget';
import { findLawsuitFileById } from '@/app/hooks/caseLinkingRuntime';
import { saveCaseDeferred } from '@/app/hooks/lawsuitPersistDeferred';

type ActiveFile = FileData | ExecutionFile | null;

export type CaseLinkBrowseSession = {
    originFileId: number;
    originCaseNo: string;
    snapshot: FileData;
};

type CaseLinkDeps = {
    files: FileData[];
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    activeFile: ActiveFile;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    selectCase: (caseId: string) => void;
    onOpenLinkedCriminalCase?: (criminalId: string) => void;
};

export function useLawsuitActiveDossierCaseLink({
    files,
    setFiles,
    activeFile,
    setActiveFile,
    userId,
    refreshAppAlerts,
    selectCase,
    onOpenLinkedCriminalCase,
}: CaseLinkDeps) {
    const [caseLinkBrowse, setCaseLinkBrowse] = useState<CaseLinkBrowseSession | null>(null);
    const [caseLinkNav, setCaseLinkNav] = useState<CaseLinkPeerNav | null>(null);

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
            void (async () => {
                const ok = await commitLawsuitPersistOrWarn('فك الربط', [updatedOrigin.id], {
                    requireActiveFileId: updatedOrigin.id,
                });
                if (ok) {
                    SmartToast.success('تم فك ربط الدعوى — إضبارة المخزن لم تُمس');
                }
            })();
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

    return {
        caseLinkBrowse,
        setCaseLinkBrowse,
        caseLinkNav,
        caseLinkViewOnly: Boolean(caseLinkBrowse),
        clearCaseLinkBrowse,
        returnFromCaseLinkBrowse,
        handleUnlinkCaseLink,
        handleOpenLinkedFile,
        scrubOpenTarget: (resolved: FileData) =>
            scrubPeerCaseLinkPollution(
                resolveConsolidationMergedOpenTarget(files, resolved),
                files,
            ),
    };
}
