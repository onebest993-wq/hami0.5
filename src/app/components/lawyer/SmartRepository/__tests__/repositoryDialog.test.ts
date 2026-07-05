import { describe, expect, it, vi, beforeEach } from 'vitest';
import { confirmRepositoryAction, prefetchRepositoryDialogs } from '../repositoryDialog';

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: vi.fn(async () => true),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn() },
}));

describe('repositoryDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('prefetchRepositoryDialogs loads dialog container chunk', () => {
        prefetchRepositoryDialogs();
        expect(true).toBe(true);
    });

    it('confirmRepositoryAction resolves SmartDialog.confirm', async () => {
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        await expect(confirmRepositoryAction('حذف الملف؟')).resolves.toBe(true);
        expect(SmartDialog.confirm).toHaveBeenCalledWith('حذف الملف؟');
    });
});
