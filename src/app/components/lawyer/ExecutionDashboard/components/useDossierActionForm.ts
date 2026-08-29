import { useMemo, useState, useCallback, useEffect } from 'react';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { purgeExpiredExecutionsFromTrash, isExecutionInTrash } from '@/app/utils/executionTrash';
import type { ExecutionFile } from '@/app/types/execution';
import type { DossierActionPayload, DossierActionType } from './DossierActionTypes';

export function useDossierActionForm(
    actionType: DossierActionType,
    active: boolean,
    currentFileId?: string,
    inabaTargets?: { id: string; directorate: string }[]
) {
    const [delegationTargetDirectorate, setDelegationTargetDirectorate] = useState('');
    const [delegationPurpose, setDelegationPurpose] = useState('');
    const [selectedOwnId, setSelectedOwnId] = useState('');
    const [transferTargetDirectorate, setTransferTargetDirectorate] = useState('');
    const [renewalReason, setRenewalReason] = useState('');
    const [inabaSubFileId, setInabaSubFileId] = useState('');
    const [inabaSubject, setInabaSubject] = useState('');

    const resetFields = useCallback(() => {
        setDelegationTargetDirectorate('');
        setDelegationPurpose('');
        setSelectedOwnId('');
        setTransferTargetDirectorate('');
        setRenewalReason('');
        setInabaSubFileId('');
        setInabaSubject('');
    }, []);

    useEffect(() => {
        if (!active) resetFields();
    }, [active, actionType, resetFields]);

    const today = new Date().toISOString().slice(0, 10);
    const availableDossiers = useMemo(() => {
        if (!active || actionType !== 'unify') return [] as ExecutionFile[];
        try {
            const cached = loadExecutionFilesRaw();
            const allFiles: ExecutionFile[] = Array.isArray(cached) ? (cached as ExecutionFile[]) : [];
            const cleanFiles = purgeExpiredExecutionsFromTrash(allFiles);
            const currentId = String(currentFileId || '').trim();
            const seen = new Set<string>();
            return cleanFiles.filter((d) => {
                const id = String(d?.id || '').trim();
                if (!id) return false;
                if (seen.has(id)) return false;
                seen.add(id);
                if (currentId && id === currentId) return false;
                if (isExecutionInTrash(d)) return false;
                const isActive = d.dossier_lifecycle_status === 'active' || !d.dossier_lifecycle_status;
                if (!isActive) return false;
                const hasValidNumber = d.fileNumber && String(d.fileNumber).trim().length > 0;
                if (!hasValidNumber) return false;
                const notAlreadyChild = !d.parentId;
                if (!notAlreadyChild) return false;
                return true;
            });
        } catch {
            return [] as ExecutionFile[];
        }
    }, [active, actionType, currentFileId]);

    const buildPayload = useCallback((): DossierActionPayload => {
        const payload: DossierActionPayload = { actionType };
        if (actionType === 'delegation') {
            payload.delegationTargetDirectorate = delegationTargetDirectorate.trim();
            payload.delegationPurpose = delegationPurpose.trim();
        } else if (actionType === 'unify') {
            payload.unificationTargetType = 'own';
            payload.unificationTargetId = selectedOwnId.trim();
            const selected = availableDossiers.find((d) => String(d.id) === String(selectedOwnId));
            payload.unificationTargetMeta = {
                directorate: (selected?.directorate as string) || undefined,
                fileNumber: selected?.fileNumber || undefined,
                fileYear: selected?.fileYear || undefined,
            };
        } else if (actionType === 'transfer') {
            payload.transferTargetDirectorate = transferTargetDirectorate.trim();
        } else if (actionType === 'renew') {
            payload.renewalReason = renewalReason.trim();
        } else if (actionType === 'inaba_correspondence') {
            const targets = Array.isArray(inabaTargets) ? inabaTargets : [];
            const selectedId = String(inabaSubFileId || '').trim() || String(targets[0]?.id || '').trim();
            const selected = targets.find((t) => String(t.id) === selectedId) || targets[0];
            payload.inabaCorrespondenceSubFileId = selectedId;
            payload.inabaCorrespondenceDirectorate = String(selected?.directorate || '').trim();
            payload.inabaCorrespondenceSubject = inabaSubject.trim();
        }
        return payload;
    }, [
        actionType,
        delegationTargetDirectorate,
        delegationPurpose,
        selectedOwnId,
        transferTargetDirectorate,
        renewalReason,
        inabaSubFileId,
        inabaSubject,
        availableDossiers,
        inabaTargets,
    ]);

    const isConfirmDisabled = useMemo(() => {
        if (actionType === 'delegation') {
            return !delegationTargetDirectorate.trim() || !delegationPurpose.trim();
        }
        if (actionType === 'unify') return !selectedOwnId.trim();
        if (actionType === 'transfer') return !transferTargetDirectorate.trim();
        if (actionType === 'renew') return !renewalReason.trim();
        if (actionType === 'inaba_correspondence') {
            const targets = Array.isArray(inabaTargets) ? inabaTargets : [];
            const selectedId = String(inabaSubFileId || '').trim() || String(targets[0]?.id || '').trim();
            return !selectedId || !inabaSubject.trim();
        }
        return false;
    }, [
        actionType,
        delegationTargetDirectorate,
        delegationPurpose,
        selectedOwnId,
        transferTargetDirectorate,
        renewalReason,
        inabaSubFileId,
        inabaSubject,
        inabaTargets,
    ]);

    return {
        today,
        availableDossiers,
        resetFields,
        buildPayload,
        isConfirmDisabled,
        delegationTargetDirectorate,
        setDelegationTargetDirectorate,
        delegationPurpose,
        setDelegationPurpose,
        selectedOwnId,
        setSelectedOwnId,
        transferTargetDirectorate,
        setTransferTargetDirectorate,
        renewalReason,
        setRenewalReason,
        inabaSubFileId,
        setInabaSubFileId,
        inabaSubject,
        setInabaSubject,
    };
}
