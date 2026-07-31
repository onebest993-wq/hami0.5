import { useCallback, useMemo } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { FileData } from '../../LawyerShared';
import {
    listConsolidationCandidates,
    resolveOpenLawsuitFileIdentity,
} from '../smartFile/caseConsolidationLinking';
import { normalizeFileId } from '../smartFile/incidentalCaseLinking';
import { listCaseLinkCandidates } from '../smartFile/caseLinking';
import { buildInitialParentDataFromFile } from '../smartFile/parentDataInit';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import type { SmartFileModalProps } from '../smartFile/smartFileModalTypes';

type ParentData = ReturnType<typeof buildInitialParentDataFromFile>;

export function useSmartFileConsolidationLinking(params: {
    file: FileData | null | undefined;
    parentData: ParentData;
    lawsuitFiles?: SmartFileModalProps['lawsuitFiles'];
    onLinkWithExistingCase?: SmartFileModalProps['onLinkWithExistingCase'];
    onStartConsolidationNewCase?: SmartFileModalProps['onStartConsolidationNewCase'];
    onConsolidateWithExisting?: SmartFileModalProps['onConsolidateWithExisting'];
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
        setShowCaseLinkModal,
        setShowCaseConsolidationModal,
    } = params;

    const lawsuitPool = useMemo(() => {
        const raw =
            lawsuitFiles ??
            (Array.isArray(loadLawsuitFilesRaw()) ? (loadLawsuitFilesRaw() as FileData[]) : []);
        return Array.isArray(raw) ? raw : [];
    }, [lawsuitFiles]);

    const openFileIdentity = useMemo(
        () => resolveOpenLawsuitFileIdentity(file, parentData, lawsuitPool),
        [file, parentData, lawsuitPool],
    );

    const consolidationCandidates = useMemo(() => {
        if (openFileIdentity.fileId === null) return [];
        return listConsolidationCandidates(lawsuitPool, openFileIdentity.fileId);
    }, [lawsuitPool, openFileIdentity.fileId]);

    const caseLinkCandidates = useMemo(() => {
        if (openFileIdentity.fileId === null) return [];
        return listCaseLinkCandidates(lawsuitPool, openFileIdentity.fileId);
    }, [lawsuitPool, openFileIdentity.fileId]);

    const handleCaseLinkExisting = useCallback(
        (data: { secondaryFileId: number; linkDate: string; reason?: string }) => {
            const primaryId = openFileIdentity.fileId;
            if (primaryId === null) return;
            onLinkWithExistingCase?.(primaryId, data.secondaryFileId, {
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
            onStartConsolidationNewCase?.({
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
            onConsolidateWithExisting?.(primaryFileId, data.secondaryFileId, {
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
