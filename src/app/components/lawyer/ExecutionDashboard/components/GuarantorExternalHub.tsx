import React from 'react';
import {
    GuarantorFollowupStandaloneCard,
    type GuarantorFollowupStandaloneCardProps,
} from './GuarantorFollowupStandaloneCard';
import { hasActiveFinancialGuarantorFollowup, shouldShowGuarantorExternalHub } from './guarantorExternalUtils';

export type GuarantorExternalHubProps = Omit<
    GuarantorFollowupStandaloneCardProps,
    'expanded' | 'onExpandedChange' | 'embedded' | 'hideChrome'
>;

export const GuarantorExternalHub: React.FC<GuarantorExternalHubProps> = ({
    executionData,
    ...financialProps
}) => {
    const hubVisible = shouldShowGuarantorExternalHub(executionData);
    const [expanded, setExpanded] = React.useState(false);

    React.useEffect(() => {
        const onFinancialCommitted = () => setExpanded(true);
        window.addEventListener('hami-guarantor-followup-committed', onFinancialCommitted);
        return () => window.removeEventListener('hami-guarantor-followup-committed', onFinancialCommitted);
    }, []);

    if (!hubVisible || !hasActiveFinancialGuarantorFollowup(executionData)) {
        return null;
    }

    return (
        <GuarantorFollowupStandaloneCard
            executionData={executionData}
            expanded={expanded}
            onExpandedChange={setExpanded}
            {...financialProps}
        />
    );
};
