import { useCallback, useEffect, useState } from 'react';
import type { ArchiveDossierViewMode } from '../components/ArchiveDossierToolbar';
import { prefetchCriminalDashboard } from '@/app/utils/lazyComponentsIntent';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';

type DossierSearchProps = {
    dossierSearchOpen?: boolean;
    onDossierSearchOpenChange?: (open: boolean) => void;
    dossierSearchQuery?: string;
    onDossierSearchQueryChange?: (query: string) => void;
    dossierViewMode?: ArchiveDossierViewMode;
    onDossierViewModeChange?: (mode: ArchiveDossierViewMode) => void;
};

export function useLawsuitArchivePortalDossierState({
    initialLawsuitJurisdictionTab,
    dossierSearchOpen: dossierSearchOpenProp,
    onDossierSearchOpenChange,
    dossierSearchQuery: dossierSearchQueryProp,
    onDossierSearchQueryChange,
    dossierViewMode: dossierViewModeProp,
    onDossierViewModeChange,
}: DossierSearchProps & {
    initialLawsuitJurisdictionTab?: LawsuitJurisdictionTab;
}) {
    const [internalSearchOpen, setInternalSearchOpen] = useState(false);
    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [lawsuitJurisdictionTab, setLawsuitJurisdictionTab] = useState<LawsuitJurisdictionTab>(
        initialLawsuitJurisdictionTab ?? 'all',
    );
    const viewingCriminal = lawsuitJurisdictionTab === 'criminal';
    const [internalViewMode, setInternalViewMode] = useState<ArchiveDossierViewMode>('grid');

    const dossierSearchOpen = dossierSearchOpenProp ?? internalSearchOpen;
    const setDossierSearchOpen = useCallback(
        (open: boolean | ((prev: boolean) => boolean)) => {
            const next = typeof open === 'function' ? open(dossierSearchOpen) : open;
            if (dossierSearchOpenProp === undefined) setInternalSearchOpen(next);
            onDossierSearchOpenChange?.(next);
        },
        [dossierSearchOpen, dossierSearchOpenProp, onDossierSearchOpenChange],
    );

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
        if (value === 'criminal') prefetchCriminalDashboard();
        setLawsuitJurisdictionTab(value);
        if (value === 'criminal' || value === 'all') {
            setCriminalCardsReady(true);
        }
    }, []);

    useEffect(() => {
        if (lawsuitJurisdictionTab === 'criminal') {
            prefetchCriminalDashboard();
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
        dossierSearchOpen,
        setDossierSearchOpen,
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
