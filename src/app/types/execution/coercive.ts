/**
 * Coercive action types.
 */

// ═══════════════════════════════════════════════════════════════════════════
// COERCIVE ACTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type CoerciveActionType = 
    | 'seizure'
    | 'arrest'
    | 'travel_ban'
    | 'summons'
    | 'imprisonment';

export interface CoerciveAction {
    id: string;
    type: CoerciveActionType;
    title: string;
    description: string;
    date: string;
    status: 'pending' | 'executed' | 'cancelled';
    targetDebtor: string;
}
