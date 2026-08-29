import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { createProceduralTimelineAppointmentHandlers } from './createProceduralTimelineAppointmentHandlers';
import { createProceduralTimelineActionHandlers } from './createProceduralTimelineActionHandlers';
import { createProceduralTimelineNoteDocPaymentHandlers } from './createProceduralTimelineNoteDocPaymentHandlers';

export function useProceduralTimelineActions(options: UseSmartFileProceduralActionsOptions) {
    return {
        ...createProceduralTimelineAppointmentHandlers(options),
        ...createProceduralTimelineActionHandlers(options),
        ...createProceduralTimelineNoteDocPaymentHandlers(options),
    };
}
