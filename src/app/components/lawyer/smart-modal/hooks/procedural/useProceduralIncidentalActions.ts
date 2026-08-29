import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { createProceduralIncidentalCaseHandlers } from './createProceduralIncidentalCaseHandlers';
import { createProceduralIncidentalJurisdictionHandlers } from './createProceduralIncidentalJurisdictionHandlers';
import { createProceduralIncidentalLinkHandlers } from './createProceduralIncidentalLinkHandlers';

export function useProceduralIncidentalActions(options: UseSmartFileProceduralActionsOptions) {
    return {
        ...createProceduralIncidentalCaseHandlers(options),
        ...createProceduralIncidentalJurisdictionHandlers(options),
        ...createProceduralIncidentalLinkHandlers(options),
    };
}
