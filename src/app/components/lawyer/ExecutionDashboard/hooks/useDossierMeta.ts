import { useState, useCallback } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

export function useDossierMeta(
    executionData: ExecutionFile | null | undefined,
    directorate: string,
    fileNumber: string,
    fileYear: string,
    docNumber: string,
    judgmentDate: string,
    classification: string,
    evictionPropertyNumber: string,
    evictionPropertyDistrict: string,
    evictionPropertyTypeField: string,
    evictionFullAddressField: string,
    evictionPremisesUseRaw: string | undefined,
    isEvictionExecutionModule: boolean,
    persistExecutionMerge: (patch: Record<string, unknown>) => void,
    showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void,
) {
    const [showEditDossierMetaModal, setShowEditDossierMetaModal] = useState(false);
    const [dossierMetaDraft, setDossierMetaDraft] = useState<Record<string, string> | null>(null);

    const openEditDossierMeta = useCallback(() => {
        setDossierMetaDraft({
            directorate: String(executionData?.directorate ?? directorate ?? ''),
            fileNumber: String(fileNumber ?? ''),
            fileYear: String((executionData as ExecutionFile)?.fileYear ?? fileYear ?? ''),
            docNumber: String(docNumber ?? ''),
            judgmentDate: String(judgmentDate ?? '').slice(0, 10),
            classification: String(classification ?? ''),
            property_number: String(evictionPropertyNumber ?? ''),
            district: String(evictionPropertyDistrict ?? ''),
            property_type: String(evictionPropertyTypeField ?? ''),
            full_address: String(evictionFullAddressField ?? ''),
            eviction_premises_use:
                evictionPremisesUseRaw === 'residential'
                    ? 'residential'
                    : evictionPremisesUseRaw === 'commercial'
                      ? 'commercial'
                      : '',
        });
        setShowEditDossierMetaModal(true);
    }, [
        classification,
        directorate,
        docNumber,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        evictionPropertyDistrict,
        evictionPropertyNumber,
        evictionPropertyTypeField,
        executionData,
        fileNumber,
        fileYear,
        judgmentDate,
    ]);

    const saveDossierMetaDraft = useCallback(() => {
        if (!dossierMetaDraft) return;
        const ep = dossierMetaDraft.eviction_premises_use;
        const base = {
            directorate: dossierMetaDraft.directorate as ExecutionFile['directorate'],
            fileNumber: dossierMetaDraft.fileNumber,
            fileYear: dossierMetaDraft.fileYear,
            docNumber: dossierMetaDraft.docNumber,
            judgmentDate: dossierMetaDraft.judgmentDate,
            classification: dossierMetaDraft.classification,
        };
        if (isEvictionExecutionModule) {
            persistExecutionMerge({
                ...base,
                property_number: dossierMetaDraft.property_number,
                district: dossierMetaDraft.district,
                property_type: dossierMetaDraft.property_type,
                full_address: dossierMetaDraft.full_address,
                eviction_premises_use:
                    ep === 'residential' || ep === 'commercial'
                        ? (ep as 'commercial' | 'residential')
                        : undefined,
            });
        } else {
            persistExecutionMerge(base);
        }
        setShowEditDossierMetaModal(false);
        setDossierMetaDraft(null);
        showToast('تم حفظ بيانات الإضبارة', 'success');
    }, [dossierMetaDraft, isEvictionExecutionModule, persistExecutionMerge, showToast]);

    return {
        showEditDossierMetaModal,
        dossierMetaDraft,
        setShowEditDossierMetaModal,
        setDossierMetaDraft,
        openEditDossierMeta,
        saveDossierMetaDraft,
    };
}
