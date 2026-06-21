import React, { memo } from 'react';
import type { DossierShareSource } from '@/app/services/caseShare/caseShareTypes';
import { ColleagueConsultationProvider } from './ColleagueConsultationContext';

type ColleagueConsultationBarProps = {
    source: DossierShareSource;
    className?: string;
};

/**
 * @deprecated استخدم ColleagueConsultationProvider + ColleagueConsultationHeaderButton في الترويسة.
 */
export const ColleagueConsultationBar = memo(function ColleagueConsultationBar({
    source,
    children,
}: ColleagueConsultationBarProps & { children?: React.ReactNode }) {
    return <ColleagueConsultationProvider source={source}>{children}</ColleagueConsultationProvider>;
});
