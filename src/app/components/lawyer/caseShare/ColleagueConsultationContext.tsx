import React, {
    createContext,
    lazy,
    Suspense,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';

import type { DossierShareSource } from '@/app/services/caseShare/caseShareTypes';

const LazyColleagueConsultationFlow = lazy(() =>
    import('./ColleagueConsultationFlow').then((m) => ({
        default: m.ColleagueConsultationFlow,
    })),
);

type ColleagueConsultationContextValue = {
    openConsultation: () => void;
};

const ColleagueConsultationContext = createContext<ColleagueConsultationContextValue | null>(null);

export function useColleagueConsultation(): ColleagueConsultationContextValue | null {
    return useContext(ColleagueConsultationContext);
}

type ColleagueConsultationProviderProps = {
    source?: DossierShareSource;
    children: React.ReactNode;
};

/** Provider خفيف — Flow يُحمَّل عند أول openConsultation فقط (لا على cold-open الإضبارة). */
export function ColleagueConsultationProvider({
    source,
    children,
}: ColleagueConsultationProviderProps) {
    const [open, setOpen] = useState(false);

    const openConsultation = useCallback(() => {
        setOpen(true);
    }, []);

    const value = useMemo(() => ({ openConsultation }), [openConsultation]);

    return (
        <ColleagueConsultationContext.Provider value={value}>
            {children}
            {open ? (
                <Suspense fallback={null}>
                    <LazyColleagueConsultationFlow
                        open={open}
                        onClose={() => setOpen(false)}
                        source={source}
                    />
                </Suspense>
            ) : null}
        </ColleagueConsultationContext.Provider>
    );
}
