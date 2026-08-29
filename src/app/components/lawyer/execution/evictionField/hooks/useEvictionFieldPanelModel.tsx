/**
 * Composes eviction-field priority hooks into one bag for the orchestrator.
 */
import type { EvictionFieldProceduresPanelProps } from '../types';
import { useEvictionFieldPanelState } from './useEvictionFieldPanelState';
import { useEvictionFieldDecisions } from './useEvictionFieldDecisions';
import { useEvictionFieldActions } from './useEvictionFieldActions';
import { useEvictionFieldBranchRenderers } from './useEvictionFieldBranchRenderers';

export function useEvictionFieldPanelModel(props: EvictionFieldProceduresPanelProps) {
    void props.premisesUse;
    const state = useEvictionFieldPanelState(props);
    const decisions = useEvictionFieldDecisions(props, state);
    const actions = useEvictionFieldActions(props, state, decisions);
    const renderers = useEvictionFieldBranchRenderers(props, state, decisions, actions);

    return {
        ...props,
        residentialGracePeriodSaved: props.residentialGracePeriodSaved ?? false,
        showBreakInventoryRequest: props.showBreakInventoryRequest ?? true,
        showEvictionFieldworkRequests: props.showEvictionFieldworkRequests ?? true,
        heirsNotificationDateYmd: props.heirsNotificationDateYmd ?? '',
        executionData: props.executionData ?? null,
        isMaritalFurnitureClaim: props.isMaritalFurnitureClaim ?? false,
        maritalFurnitureItems: props.maritalFurnitureItems ?? [],
        ...state,
        ...decisions,
        ...actions,
        ...renderers,
    };
}

export type EvictionFieldPanelModel = ReturnType<typeof useEvictionFieldPanelModel>;
