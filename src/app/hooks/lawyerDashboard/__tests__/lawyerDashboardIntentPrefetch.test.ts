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
}));

import { warmRepositoryHubOnHover, warmRepositoryOnOpen } from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';
import { warmNotepadOnHover } from '@/app/hooks/lawyerDashboard/notepadIntentWarm';
import { warmVaultOnHover } from '@/app/hooks/lawyerDashboard/vaultIntentWarm';

describe('prefetchDockWidgetIntent repository split', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('hover على dockRepository يحمّل hub فقط', () => {
        prefetchDockWidgetIntent('dockRepository', 'hover');
        expect(warmRepositoryHubOnHover).toHaveBeenCalledTimes(1);
        expect(warmRepositoryOnOpen).not.toHaveBeenCalled();
        expect(warmNotepadOnHover).not.toHaveBeenCalled();
        expect(warmVaultOnHover).not.toHaveBeenCalled();
    });

    it('open على dockRepository يحمّل المسار الكامل', () => {
        prefetchDockWidgetIntent('dockRepository', 'open');
        expect(warmRepositoryOnOpen).toHaveBeenCalledTimes(1);
    });

    it('dockNotepad لا يحمّل vault', () => {
        prefetchDockWidgetIntent('dockNotepad', 'hover');
        expect(warmNotepadOnHover).toHaveBeenCalledTimes(1);
        expect(warmVaultOnHover).not.toHaveBeenCalled();
    });
});
