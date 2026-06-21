import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { DossierShareSource } from '@/app/services/caseShare/caseShareTypes';

import { ColleagueConsultationFlow } from './ColleagueConsultationFlow';



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



export function ColleagueConsultationProvider({ source, children }: ColleagueConsultationProviderProps) {

    const [open, setOpen] = useState(false);



    const openConsultation = useCallback(() => {

        setOpen(true);

    }, []);



    const value = useMemo(() => ({ openConsultation }), [openConsultation]);



    return (

        <ColleagueConsultationContext.Provider value={value}>

            {children}

            <ColleagueConsultationFlow open={open} onClose={() => setOpen(false)} source={source} />

        </ColleagueConsultationContext.Provider>

    );

}

