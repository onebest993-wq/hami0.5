import type { UseSmartFileProceduralActionsOptions } from '../smartFile/proceduralTypes';
import { useProceduralTaskActions } from './procedural/useProceduralTaskActions';
import { useProceduralIncidentalActions } from './procedural/useProceduralIncidentalActions';
import { useProceduralFastTrackActions } from './procedural/useProceduralFastTrackActions';
import { useProceduralAttachmentActions } from './procedural/useProceduralAttachmentActions';
import { useProceduralTimelineActions } from './procedural/useProceduralTimelineActions';
import { useProceduralPauseActions } from './procedural/useProceduralPauseActions';
import { useProceduralLifecycleActions } from './procedural/useProceduralLifecycleActions';

export function useSmartFileProceduralActions(options: UseSmartFileProceduralActionsOptions) {
    return {
        ...useProceduralTaskActions(options),
        ...useProceduralIncidentalActions(options),
        ...useProceduralFastTrackActions(options),
        ...useProceduralAttachmentActions(options),
        ...useProceduralTimelineActions(options),
        ...useProceduralPauseActions(options),
        ...useProceduralLifecycleActions(options),
    };
}
