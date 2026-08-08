import { describe, expect, it, beforeEach } from 'vitest';
import { dashboardViewFingerprint } from '@/app/hooks/lawyerDashboard/dashboardViewFingerprint';
import { resetDashboardShellFingerprintCacheForTests } from '@/app/hooks/lawyerDashboard/dashboardShellFingerprintCache';
import type { Orchestration } from '@/app/hooks/lawyerDashboard/dashboardViewFingerprint.types';

function baseOrchestration(overrides: Partial<Orchestration> = {}): Orchestration {
    return {
        user: { id: 'user-1' },
        theme: { primary: '#E6C673', bg: '#0A0F1C' },
        shapeClass: 'rounded-3xl',
        appLock: { locked: false },
        pendingFieldTasksCount: 0,
        overlays: {
            activeTab: 'home',
            showSettings: false,
            showCommunity: false,
            showLawsuitsWorkspace: false,
            lawsuitsWorkspaceTab: 'civil',
            lawsuitsDossierSection: 'all',
            showTransactions: false,
            showGlobalSearch: false,
            showDocs: false,
            fieldTasksSheetOpen: false,
            showTasksManager: false,
            tasksManagerFocusTaskId: undefined,
            transactionsFocusId: undefined,
            criminalDashboardCaseId: null,
            calendarSearchFocus: null,
            communityDeepLink: null,
        },
        workspace: {
            files: [],
            executionFiles: [],
            globalNotes: [],
            activeFile: null,
            isNotepadOpen: false,
            isNewCaseModalOpen: false,
            isExecutionModalOpen: false,
        },
        appAlerts: {
            visibleAppAlerts: [{ id: 'a1', title: 't', message: 'm', type: 'info' } as never],
            appAlertsLoading: false,
            appAlertsError: null,
        },
        notifications: {
            showNotifications: false,
            notificationsUnreadCount: 0,
        },
        dashboardSettings: {
            showSettings: false,
        },
        archiveAndSync: { archiveType: null },
        settings: {
            appearance: { theme: 'dark', backgroundPreset: 'none', wallpaperStamp: 0 },
            performance: { litePerformance: 'auto' },
        },
        clusterScanSources: {
            lawsuitFiles: [],
            executionFiles: [],
            criminalCases: [],
            urgentCases: [],
            threadingTransactions: [],
            threadingTasks: [],
            notes: [],
            fieldTasks: [],
            vaultDocs: [],
            calendarEvents: [],
            ready: true,
        },
        ...overrides,
    } as Orchestration;
}

describe('dashboardViewFingerprint', () => {
    beforeEach(() => {
        resetDashboardShellFingerprintCacheForTests();
    });

    it('returns stable fingerprint for identical orchestration', () => {
        const a = baseOrchestration();
        const b = baseOrchestration();
        expect(dashboardViewFingerprint(a)).toBe(dashboardViewFingerprint(b));
    });

    it('changes when alert ids change on home tab', () => {
        const base = dashboardViewFingerprint(baseOrchestration());
        const changed = dashboardViewFingerprint(
            baseOrchestration({
                appAlerts: {
                    visibleAppAlerts: [{ id: 'a2', title: 't', message: 'm', type: 'info' } as never],
                    appAlertsLoading: false,
                    appAlertsError: null,
                },
            }),
        );
        expect(changed).not.toBe(base);
    });

    it('ignores alert changes when active tab is not home', () => {
        const scheduleBase = baseOrchestration({
            overlays: { ...baseOrchestration().overlays, activeTab: 'schedule' },
        });
        const fp1 = dashboardViewFingerprint(scheduleBase);
        const fp2 = dashboardViewFingerprint(
            baseOrchestration({
                overlays: { ...baseOrchestration().overlays, activeTab: 'schedule' },
                appAlerts: {
                    visibleAppAlerts: [{ id: 'a99', title: 't', message: 'm', type: 'info' } as never],
                    appAlertsLoading: false,
                    appAlertsError: null,
                },
            }),
        );
        expect(fp2).toBe(fp1);
    });

    it('changes when archiveType changes', () => {
        const base = dashboardViewFingerprint(baseOrchestration());
        const execution = dashboardViewFingerprint(
            baseOrchestration({
                archiveAndSync: { archiveType: 'execution' },
            }),
        );
        expect(execution).not.toBe(base);
    });

    it('changes when execution trash/archive lifecycle changes without length change', () => {
        const activeOnly = baseOrchestration({
            workspace: {
                ...baseOrchestration().workspace,
                executionFiles: [
                    { id: 'ex-1', type: 'execution', status: 'active', caseNo: '1/2026' } as never,
                ],
            },
        });
        const trashed = baseOrchestration({
            workspace: {
                ...baseOrchestration().workspace,
                executionFiles: [
                    {
                        id: 'ex-1',
                        type: 'execution',
                        status: 'active',
                        caseNo: '1/2026',
                        executionTrashDeletedAt: '2026-06-25T12:00:00.000Z',
                    } as never,
                ],
            },
        });
        expect(dashboardViewFingerprint(activeOnly)).not.toBe(dashboardViewFingerprint(trashed));
    });

    it('changes when calendar search focus changes', () => {
        const base = dashboardViewFingerprint(baseOrchestration());
        const focused = dashboardViewFingerprint(
            baseOrchestration({
                overlays: {
                    ...baseOrchestration().overlays,
                    calendarSearchFocus: { date: '2026-01-01', eventId: 'ev-1' },
                },
            }),
        );
        expect(focused).not.toBe(base);
    });

    it('changes when notification panel open state changes', () => {
        const closed = dashboardViewFingerprint(baseOrchestration());
        const open = dashboardViewFingerprint(
            baseOrchestration({
                notifications: {
                    showNotifications: true,
                    notificationsUnreadCount: 0,
                },
            }),
        );
        expect(open).not.toBe(closed);
    });

    it('changes when global search open state changes', () => {
        const closed = dashboardViewFingerprint(baseOrchestration());
        const open = dashboardViewFingerprint(
            baseOrchestration({
                overlays: {
                    ...baseOrchestration().overlays,
                    showGlobalSearch: true,
                },
            }),
        );
        expect(open).not.toBe(closed);
    });
});
