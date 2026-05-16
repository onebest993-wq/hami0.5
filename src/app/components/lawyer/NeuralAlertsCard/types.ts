import type { LucideIcon } from 'lucide-react';

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActionType = 'openDrafter' | 'openScanner' | 'openChecklist' | 'sendWhatsApp' | 'sendAutoReminder';

export interface SmartAlert {
    id: string;
    title: string;
    description: string;
    priority: AlertPriority;
    actionType: ActionType;
    actionLabel: string;
    payload: Record<string, unknown>;
    timestamp: number;
    clientName?: string;
    caseNo?: string;
    timeLabel?: string;
    colorTheme?: 'blue' | 'green' | 'purple' | 'amber';
    icon?: LucideIcon;
}
