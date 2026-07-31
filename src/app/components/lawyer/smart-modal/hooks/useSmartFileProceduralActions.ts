





import type { UseSmartFileProceduralActionsOptions } from '../smartFile/proceduralTypes';






import { useProceduralTaskActions } from './procedural/useProceduralTaskActions';
import { useProceduralIncidentalActions } from './procedural/useProceduralIncidentalActions';
import { useProceduralTimelineActions } from './procedural/useProceduralTimelineActions';
import { useProceduralPauseActions } from './procedural/useProceduralPauseActions';
import { useProceduralLifecycleActions } from './procedural/useProceduralLifecycleActions';

export function useSmartFileProceduralActions(options: UseSmartFileProceduralActionsOptions) {
    return {
        ...useProceduralTaskActions(options),
        ...useProceduralIncidentalActions(options),
        ...useProceduralTimelineActions(options),
        ...useProceduralPauseActions(options),
        ...useProceduralLifecycleActions(options),
    };
}
