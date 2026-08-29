import type { EvictionProceduresSectionProps } from './evictionProceduresTypes';
import { useEvictionProceduresSectionStateImpl } from './useEvictionProceduresSectionStateImpl';

export function useEvictionProceduresSectionState(props: EvictionProceduresSectionProps) {
    return useEvictionProceduresSectionStateImpl(props);
}

export type { EvictionProceduresSectionState } from './useEvictionProceduresSectionStateImpl';
