import { useCallback, useEffect, useState } from 'react';
import type { ArchiveDossierViewMode } from '../components/ArchiveDossierToolbar';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';

function prefetchCriminalListPath(): void {
    void import('@/app/utils/lazyComponentsIntent')
        .then((m) => m.prefetchCriminalListPath())
        .catch(() => undefined);
}

type DossierSearchProps = {
    dossierSearchQuery?: string;
    onDossierSearchQueryChange?: (query: string) => void;
    dossierViewMode?: ArchiveDossierViewMode;
    onDossierViewModeChange?: (mode: ArchiveDossierViewMode) => void;
};

export function useLawsuitArchivePortalDossierState({
    initialLawsuitJurisdictionTab,
    dossierSearchQuery: dossierSearchQueryProp,
    onDossierSearchQueryChange,
    dossierViewMode: dossierViewModeProp,
    onDossierViewModeChange,
}: DossierSearchProps & {
    initialLawsuitJurisdictionTab?: LawsuitJurisdictionTab;
}) {
    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [lawsuitJurisdictionTab, setLawsuitJurisdictionTab] = useState<LawsuitJurisdictionTab>(
        initialLawsuitJurisdictionTab ?? 'all',
    );
    const viewingCriminal = lawsuitJurisdictionTab === 'criminal';
    const [internalViewMode, setInternalViewMode] = useState<ArchiveDossierViewMode>('grid');

    const dossierSearchQuery = dossierSearchQueryProp ?? internalSearchQuery;
    const setDossierSearchQuery = useCallback(
        (query: string) => {
            if (dossierSearchQueryProp === undefined) setInternalSearchQuery(query);
            onDossierSearchQueryChange?.(query);
        },
        [dossierSearchQueryProp, onDossierSearchQueryChange],
    );

    const dossierViewMode = dossierViewModeProp ?? internalViewMode;
    const setDossierViewMode = useCallback(
        (mode: ArchiveDossierViewMode) => {
            if (dossierViewModeProp === undefined) setInternalViewMode(mode);
            onDossierViewModeChange?.(mode);
        },
        [dossierViewModeProp, onDossierViewModeChange],
    );

    const [criminalCardsReady, setCriminalCardsReady] = useState(
        () => (initialLawsuitJurisdictionTab ?? 'all') === 'criminal',
    );

    useEffect(() => {
        if (initialLawsuitJurisdictionTab) {
            setLawsuitJurisdictionTab(initialLawsuitJurisdictionTab);
        }
    }, [initialLawsuitJurisdictionTab]);

    const setLawsuitJurisdictionTabWithPrefetch = useCallback((value: LawsuitJurisdictionTab) => {
        if (value === 'criminal') prefetchCriminalListPath();
        setLawsuitJurisdictionTab(value);
        if (value === 'criminal' || value === 'all') {
            setCriminalCardsReady(true);
        }
    }, []);

    useEffect(() => {
        if (lawsuitJurisdictionTab === 'criminal') {
            prefetchCriminalListPath();
            setCriminalCardsReady(true);
            return;
        }
        if (lawsuitJurisdictionTab !== 'all') {
            setCriminalCardsReady(false);
            return;
        }
        setCriminalCardsReady(false);
        let cancelled = false;
        const id = window.requestAnimationFrame(() => {
            if (!cancelled) setCriminalCardsReady(true);
        });
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(id);
        };
    }, [lawsuitJurisdictionTab]);

    return {
        dossierSearchQuery,
        setDossierSearchQuery,
        lawsuitJurisdictionTab,
        setLawsuitJurisdictionTab: setLawsuitJurisdictionTabWithPrefetch,
        viewingCriminal,
        dossierViewMode,
        setDossierViewMode,
        criminalCardsReady,
    };
}
