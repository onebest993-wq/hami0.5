import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefetchDockWidgetIntent } from '@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch';

vi.mock('@/app/hooks/lawyerDashboard/repositoryIntentWarm', () => ({
    warmRepositoryHubOnHover: vi.fn(),
    warmRepositoryOnOpen: vi.fn(),
}));
vi.mock('@/app/hooks/lawyerDashboard/notepadIntentWarm', () => ({
    warmNotepadOnHover: vi.fn(),
}));
vi.mock('@/app/hooks/lawyerDashboard/vaultIntentWarm', () => ({
    warmVaultOnHover: vi.fn(),
}));
vi.mock('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm', () => ({
    warmFieldTasksOnHover: vi.fn(),
    warmFieldTasksOnOpen: vi.fn(),
}));

describe('prefetchDockWidgetIntent repository split', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('hover على dockRepository يحمّل hub فقط', async () => {
        const intent = await import('@/app/hooks/lawyerDashboard/repositoryIntentWarm');
        const notepad = await import('@/app/hooks/lawyerDashboard/notepadIntentWarm');
        const vault = await import('@/app/hooks/lawyerDashboard/vaultIntentWarm');
        prefetchDockWidgetIntent('dockRepository', 'hover');
        await vi.waitFor(() => expect(intent.warmRepositoryHubOnHover).toHaveBeenCalledTimes(1));
        expect(intent.warmRepositoryOnOpen).not.toHaveBeenCalled();
        expect(notepad.warmNotepadOnHover).not.toHaveBeenCalled();
        expect(vault.warmVaultOnHover).not.toHaveBeenCalled();
    });

    it('open على dockRepository يحمّل المسار الكامل', async () => {
        const intent = await import('@/app/hooks/lawyerDashboard/repositoryIntentWarm');
        prefetchDockWidgetIntent('dockRepository', 'open');
        await vi.waitFor(() => expect(intent.warmRepositoryOnOpen).toHaveBeenCalledTimes(1));
    });

    it('dockNotepad يسخّن المستودع الموحّد وليس vault مستقلاً', async () => {
        const intent = await import('@/app/hooks/lawyerDashboard/repositoryIntentWarm');
        const vault = await import('@/app/hooks/lawyerDashboard/vaultIntentWarm');
        prefetchDockWidgetIntent('dockNotepad', 'hover');
        await vi.waitFor(() => expect(intent.warmRepositoryHubOnHover).toHaveBeenCalledTimes(1));
        expect(vault.warmVaultOnHover).not.toHaveBeenCalled();
    });
});
