import React, {
    createContext,
    lazy,
    Suspense,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { DossierShareSource } from '@/app/services/caseShare/caseShareTypes';

const LazyColleagueConsultationFlow = lazy(() =>
    import('./ColleagueConsultationFlow').then((m) => ({
        default: m.ColleagueConsultationFlow,
    })),
);

export function prefetchColleagueConsultationFlow(): void {
    if (typeof window === 'undefined') return;
    void import('./ColleagueConsultationFlow').catch(() => undefined);
}

type ColleagueConsultationContextValue = {
    openConsultation: () => void;
};

const ColleagueConsultationContext = createContext<ColleagueConsultationContextValue | null>(null);

export function useColleagueConsultation(): ColleagueConsultationContextValue | null {
    return useContext(ColleagueConsultationContext);
}

type ColleagueConsultationProviderProps = {
    source?: DossierShareSource;
    resolveSource?: () => Promise<DossierShareSource> | DossierShareSource;
    children: React.ReactNode;
};

/**
 * Provider — الـ Flow يُحمَّل عند الفتح فقط (بدون سحب شبكة/سحابة/تقويم مع أول إطار الإضبارة).
 */
export function ColleagueConsultationProvider({
    source,
    resolveSource,
    children,
}: ColleagueConsultationProviderProps) {
    const [open, setOpen] = useState(false);
    const [resolvedSource, setResolvedSource] = useState<DossierShareSource | undefined>(undefined);

    const openConsultation = useCallback(() => {
        prefetchColleagueConsultationFlow();
        setOpen(true);
        if (source) return;
        if (!resolveSource) return;
        void Promise.resolve(resolveSource())
            .then((next) => setResolvedSource(next))
            .catch(() => undefined);
    }, [resolveSource, source]);

    const closeConsultation = useCallback(() => {
        setOpen(false);
    }, []);

    const value = useMemo(() => ({ openConsultation }), [openConsultation]);
    const effectiveSource = source ?? resolvedSource;

    return (
        <ColleagueConsultationContext.Provider value={value}>
            {children}
            {open && typeof document !== 'undefined'
                ? createPortal(
                      <Suspense fallback={null}>
                          <LazyColleagueConsultationFlow
                              open={open}
                              onClose={closeConsultation}
                              source={effectiveSource}
                          />
                      </Suspense>,
                      document.body,
                  )
                : null}
        </ColleagueConsultationContext.Provider>
    );
}
