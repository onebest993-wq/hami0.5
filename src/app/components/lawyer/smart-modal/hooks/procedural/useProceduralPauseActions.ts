import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { createProceduralPauseHandlers } from './createProceduralPauseHandlers';
import { createProceduralInterruptionHandlers } from './createProceduralInterruptionHandlers';
import { createProceduralExtraordinaryAppealHandlers } from './createProceduralExtraordinaryAppealHandlers';
import { createProceduralProvisionalInterlocutoryHandlers } from './createProceduralProvisionalInterlocutoryHandlers';

export function useProceduralPauseActions(options: UseSmartFileProceduralActionsOptions) {
    return {
        ...createProceduralPauseHandlers(options),
        ...createProceduralInterruptionHandlers(options),
        ...createProceduralExtraordinaryAppealHandlers(options),
        ...createProceduralProvisionalInterlocutoryHandlers(options),
    };
}
