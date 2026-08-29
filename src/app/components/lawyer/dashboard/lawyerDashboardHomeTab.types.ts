import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ThemeKey } from '../LawyerShared';
import type { CommandCenterNote } from '../commandCenterTypes';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';

export type LawyerDashboardHomeTabProps = {
    visible: boolean;
    calendarUserId: string | null;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
    alertsLoading: boolean;
    alertsError: string | null;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert: (alertId: string) => void;
    onAlertResolved: (alert: SecretaryAlert) => void;
    onOpenCommunity: () => void;
    onOpenProfile?: () => void;
    onPrimeProfile?: () => void;
    /** تسخين أعمق عند الضغط — يوازي onProfilePointerDown في الهيدر */
    onPrimeProfilePress?: () => void;
    userMetadata?: Record<string, unknown>;
    theme: (typeof import('../LawyerShared').THEMES)[ThemeKey];
    onOpenArchive: (id: string) => void;
    userId: string;
    shellAuthUserId?: string | null;
    onOpenCalendar: () => void;
    onOpenFieldTasksSheet: () => void;
    pendingFieldTasksCount: number;
    onOpenFullNotepad: () => void;
    onOpenRepository?: (opts?: {
        tab?: 'notepad' | 'vault';
        scanner?: boolean;
        notepadMode?: 'list' | 'create';
    }) => void;
    onOpenVault: () => void;
    onAddNote: (note: CommandCenterNote) => void;
    /** true فقط من MainView التفاعلي — Minimal/FirstPaint لا يكشفان البحر */
    announceBootReveal?: boolean;
};
