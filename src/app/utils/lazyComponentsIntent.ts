import type { ExecutionDashboardPrefetchMode } from '@/app/runtime/executionDashboardLoader';

type WorkspaceWarmOptions = {
    includeSecondary?: boolean;
    secondaryDelayMs?: number;
};

function loadLazyComponents() {
    return import('@/app/utils/lazyComponents');
}

function loadExecutionWorkspaceWarm() {
    return import('@/app/runtime/executionWorkspaceWarm');
}

function loadLawsuitWorkspaceWarm() {
    return import('@/app/runtime/lawsuitWorkspaceWarm');
}

function loadProfileSettingsSheetLoader() {
    return import('@/app/runtime/profileSettingsSheetLoader');
}

function loadRoyalLawyerProfileLoader() {
    return import('@/app/runtime/royalLawyerProfileLoader');
}

function loadHubArchiveLoader() {
    return import('@/app/runtime/hubArchiveLoader');
}

function loadCriminalBridgeEvent() {
    return import('@/app/slices/criminal/bridgeEvent');
}

export function prefetchArchivePortal(): void {
    if (typeof window === 'undefined') return;
    void loadHubArchiveLoader()
        .then((m) => m.prefetchLawsuitArchiveHubModule())
        .catch(() => undefined);
}

export function warmExecutionDossier(mode: ExecutionDashboardPrefetchMode = 'intent'): void {
    void loadExecutionWorkspaceWarm()
        .then((m) => m.warmExecutionDossier(mode))
        .catch(() => undefined);
}

export function warmExecutionWorkspace(options?: WorkspaceWarmOptions): void {
    void loadExecutionWorkspaceWarm()
        .then((m) => m.warmExecutionWorkspace(options))
        .catch(() => undefined);
}

export function warmLawsuitWorkspace(options?: WorkspaceWarmOptions): void {
    void loadLawsuitWorkspaceWarm()
        .then((m) => m.warmLawsuitWorkspace(options))
        .catch(() => undefined);
}

/** مسار القائمة فقط — جسر + قشرة، بلا سحب ResolvedRuntime أثناء تصفّح البطاقات */
export function prefetchCriminalListPath(): void {
    if (typeof window === 'undefined') return;
    void loadCriminalBridgeEvent()
        .then((m) => m.requestCriminalDashboardBridgeActivate())
        .catch(() => undefined);
    void import('@/app/runtime/criminalDashboardLoader')
        .then((m) => m.prefetchCriminalDashboardChromeWarm())
        .catch(() => undefined);
}

/** نية فتح إضبارة — تحميل الوحدة الكاملة */
export function prefetchCriminalDashboard(): void {
    if (typeof window === 'undefined') return;
    void loadCriminalBridgeEvent()
        .then((m) => m.requestCriminalDashboardBridgeActivate())
        .catch(() => undefined);
    void import('@/app/runtime/criminalDashboardLoader')
        .then((m) => m.prefetchCriminalDashboardPhased())
        .catch(() => undefined);
}

export function prefetchLawyerHomeHubCard(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/homeHubCardLoader').then((m) => m.prefetchLawyerHomeHubCardModule());
}

export function prefetchNotificationPanel(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.prefetchNotificationPanel();
    });
}

export function prefetchVoiceRecorderModal(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.prefetchVoiceRecorderModal();
    });
}

export function warmNotepadAndProfile(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.warmNotepadAndProfile(userId);
    });
}

export function warmSettingsShell(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.warmSettingsShell();
    });
}

export function warmTasksWorkspace(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.warmTasksWorkspace();
    });
}

export function prefetchTransactionsHub(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.prefetchTransactionsHub();
    });
}

export function prefetchSmartRepositoryModal(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.prefetchSmartRepositoryModal();
    });
}

export function prefetchProfileSettingsSheet(): void {
    if (typeof window === 'undefined') return;
    /* الورقة فقط — التبويبات static داخل الورقة؛ المحررات عند توسيع البلوك */
    void loadProfileSettingsSheetLoader()
        .then((m) => m.prefetchProfileSettingsSheetModule())
        .catch(() => undefined);
}

export function prefetchRoyalLawyerProfile(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    void loadRoyalLawyerProfileLoader()
        .then((m) => m.prefetchRoyalLawyerProfile(userId))
        .catch(() => undefined);
}

export function loadProfileSettingsSheetModule() {
    return loadProfileSettingsSheetLoader().then((m) => m.loadProfileSettingsSheetModule());
}

export function warmLawyerHomeShellCritical(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.warmLawyerHomeShellCritical();
    });
}

export function warmLawyerHomeShellSecondary(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.warmLawyerHomeShellSecondary();
    });
}

export function prefetchLawyerHomeShellWidgets(): void {
    if (typeof window === 'undefined') return;
    void loadLazyComponents().then((m) => {
        m.prefetchLawyerHomeShellWidgets();
    });
}
