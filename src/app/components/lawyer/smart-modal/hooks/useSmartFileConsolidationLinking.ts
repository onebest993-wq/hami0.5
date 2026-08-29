import { useCallback, useEffect, useMemo, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { FileData } from '../../LawyerShared';
import {
    listConsolidationCandidates,
    resolveOpenLawsuitFileIdentity,
} from '../smartFile/caseConsolidationLinking';
import { normalizeFileId } from '../smartFile/incidentalCaseLinking';
import {
    listCaseLinkCandidates,
    mergeCaseLinkCandidates,
    readLinkedCriminalIdsFromDossier,
    type CaseLinkCandidate,
    type CaseLinkPeerSelection,
} from '../smartFile/caseLinking';
import { buildInitialParentDataFromFile } from '../smartFile/parentDataInit';
import type { SmartFileModalProps } from '../smartFile/smartFileModalTypes';

type ParentData = ReturnType<typeof buildInitialParentDataFromFile>;

export function useSmartFileConsolidationLinking(params: {
    file: FileData | null | undefined;
    parentData: ParentData;
    lawsuitFiles?: SmartFileModalProps['lawsuitFiles'];
    onLinkWithExistingCase?: SmartFileModalProps['onLinkWithExistingCase'];
    onStartConsolidationNewCase?: SmartFileModalProps['onStartConsolidationNewCase'];
    onConsolidateWithExisting?: SmartFileModalProps['onConsolidateWithExisting'];
    showCaseLinkModal?: boolean;
    setShowCaseLinkModal: (open: boolean) => void;
    setShowCaseConsolidationModal: (open: boolean) => void;
}) {
    const {
        file,
        parentData,
        lawsuitFiles,
        onLinkWithExistingCase,
        onStartConsolidationNewCase,
        onConsolidateWithExisting,
        showCaseLinkModal,
        setShowCaseLinkModal,
        setShowCaseConsolidationModal,
    } = params;

    const lawsuitPool = useMemo(() => {
        return Array.isArray(lawsuitFiles) ? lawsuitFiles : [];
    }, [lawsuitFiles]);

    const openFileIdentity = useMemo(
        () => resolveOpenLawsuitFileIdentity(file, parentData, lawsuitPool),
        [file, parentData, lawsuitPool],
    );

    const consolidationCandidates = useMemo(() => {
        if (openFileIdentity.fileId === null) return [];
        return listConsolidationCandidates(lawsuitPool, openFileIdentity.fileId);
    }, [lawsuitPool, openFileIdentity.fileId]);

    const [criminalCandidates, setCriminalCandidates] = useState<CaseLinkCandidate[]>([]);

    useEffect(() => {
        if (!showCaseLinkModal) return undefined;
        let cancelled = false;
        const linkedCriminalIds = file ? readLinkedCriminalIdsFromDossier(file) : new Set<string>();
        void import('../smartFile/caseLinkCriminalPeers')
            .then((m) => {
                if (cancelled) return;
                setCriminalCandidates(m.buildCriminalCaseLinkCandidates(linkedCriminalIds));
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [showCaseLinkModal, file]);

    const caseLinkCandidates = useMemo(() => {
        if (openFileIdentity.fileId === null) return [];
        const lawsuitCandidates = listCaseLinkCandidates(lawsuitPool, openFileIdentity.fileId);
        return mergeCaseLinkCandidates(lawsuitCandidates, criminalCandidates);
    }, [lawsuitPool, openFileIdentity.fileId, criminalCandidates]);

    const handleCaseLinkExisting = useCallback(
        (data: { peer: CaseLinkPeerSelection; linkDate: string; reason?: string }) => {
            const primaryId = openFileIdentity.fileId;
            if (primaryId === null) {
                SmartToast.error('تعذّر تحديد الإضبارة الحالية');
                return;
            }
            if (!onLinkWithExistingCase) {
                SmartToast.error('تعذّر ربط الدعوى — المسار غير متصل');
                return;
            }
            onLinkWithExistingCase(primaryId, data.peer, {
                linkDate: data.linkDate,
                reason: data.reason,
            });
            setShowCaseLinkModal(false);
        },
        [openFileIdentity.fileId, onLinkWithExistingCase, setShowCaseLinkModal],
    );

    const handleConsolidationCreateNew = useCallback(
        (meta: { consolidationDate: string; notes?: string }) => {
            const primaryFileId = openFileIdentity.fileId;
            if (primaryFileId === null) {
                SmartToast.error('تعذّر تحديد الإضبارة الحالية');
                return;
            }
            const primaryCaseNo = openFileIdentity.caseNo;
            if (!onStartConsolidationNewCase) {
                SmartToast.error('تعذّر فتح نموذج التوحيد — المسار غير متصل');
                return;
            }
            onStartConsolidationNewCase({
                primaryFileId,
                primaryCaseNo,
                consolidationDate: meta.consolidationDate,
                notes: meta.notes,
            });
            setShowCaseConsolidationModal(false);
        },
        [
            openFileIdentity.fileId,
            openFileIdentity.caseNo,
            onStartConsolidationNewCase,
            setShowCaseConsolidationModal,
        ],
    );

    const handleConsolidationMergeExisting = useCallback(
        (data: { secondaryFileId: number; consolidationDate: string; notes?: string }) => {
            const primaryFileId = openFileIdentity.fileId;
            if (primaryFileId === null) {
                SmartToast.error('تعذّر تحديد الإضبارة الحالية');
                return;
            }
            if (normalizeFileId(data.secondaryFileId) === primaryFileId) {
                SmartToast.error('لا يمكن توحيد الإضبارة مع نفسها');
                return;
            }
            if (!onConsolidateWithExisting) {
                SmartToast.error('تعذّر تنفيذ التوحيد — المسار غير متصل');
                return;
            }
            onConsolidateWithExisting(primaryFileId, data.secondaryFileId, {
                consolidationDate: data.consolidationDate,
                notes: data.notes,
            });
            setShowCaseConsolidationModal(false);
        },
        [openFileIdentity.fileId, onConsolidateWithExisting, setShowCaseConsolidationModal],
    );

    return {
        openFileIdentity,
        consolidationCandidates,
        caseLinkCandidates,
        handleCaseLinkExisting,
        handleConsolidationCreateNew,
        handleConsolidationMergeExisting,
    };
}

