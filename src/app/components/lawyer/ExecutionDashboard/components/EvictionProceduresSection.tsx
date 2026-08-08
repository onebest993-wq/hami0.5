import React from 'react';
import { EvictionProceduresSectionBody } from './evictionProcedures/EvictionProceduresSectionBody';
import { useEvictionProceduresSectionState } from './evictionProcedures/useEvictionProceduresSectionState';
import type { EvictionProceduresSectionProps } from './evictionProcedures/evictionProceduresTypes';

export type { EvictionProceduresSectionProps } from './evictionProcedures/evictionProceduresTypes';

export const EvictionProceduresSection: React.FC<EvictionProceduresSectionProps> = (props) => {
    const state = useEvictionProceduresSectionState(props);
    return <EvictionProceduresSectionBody {...state} />;
};
