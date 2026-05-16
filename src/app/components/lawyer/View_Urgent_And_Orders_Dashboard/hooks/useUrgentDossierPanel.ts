import { useCallback, useMemo, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { resetActiveOrderFilePanelCache } from '../../DeferredActiveOrderFile';
import type { UrgentCase } from '../../Component_Urgent_Card';
import { mergeUrgentCasePatch } from '../mergeCasePatch';

type UseUrgentDossierPanelArgs = {
    cases: UrgentCase[];
    setCases: Dispatch<SetStateAction<UrgentCase[]>>;
    pendingCasesPersistRef: MutableRefObject<boolean>;
};

export function useUrgentDossierPanel({ cases, setCases, pendingCasesPersistRef }: UseUrgentDossierPanelArgs) {
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCaseForDetails, setSelectedCaseForDetails] = useState<string | null>(null);
    const [dossierMountKey, setDossierMountKey] = useState(0);

    const selectedCaseFile = useMemo(() => {
        if (!selectedCaseForDetails) return null;
        return cases.find((c) => c.id === selectedCaseForDetails) ?? { id: selectedCaseForDetails };
    }, [cases, selectedCaseForDetails]);

    const closeDossierPanel = useCallback(() => {
        setShowDetailsModal(false);
        setSelectedCaseForDetails(null);
    }, []);

    const retryDossierPanel = useCallback(() => {
        resetActiveOrderFilePanelCache();
        setDossierMountKey((k) => k + 1);
    }, []);

    const handleCaseClick = useCallback((caseId: string) => {
        setSelectedCaseForDetails(caseId);
        setShowDetailsModal(true);
    }, []);

    const openDossierForCase = useCallback((caseId: string) => {
        setSelectedCaseForDetails(caseId);
        setShowDetailsModal(true);
    }, []);

    const handleCaseUpdated = useCallback(
        (caseId: string, patch: Record<string, unknown>) => {
            setCases((prev) => {
                const next = prev.map((c) => (c.id === caseId ? mergeUrgentCasePatch(c, patch) : c));
                pendingCasesPersistRef.current = true;
                return next;
            });
        },
        [pendingCasesPersistRef, setCases],
    );

    return {
        showDetailsModal,
        selectedCaseForDetails,
        dossierMountKey,
        selectedCaseFile,
        closeDossierPanel,
        retryDossierPanel,
        handleCaseClick,
        openDossierForCase,
        handleCaseUpdated,
    };
}
