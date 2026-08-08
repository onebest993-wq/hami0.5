import { describe, expect, it, vi } from 'vitest';
import { buildExecutionViewData } from '@/app/application/execution/dossier/buildExecutionViewData';
import type { ExecutionFile } from '@/app/types/execution';

vi.mock('@/app/application/execution/dossier/buildExecutionViewData', () => ({
    buildExecutionViewData: vi.fn(),
}));

describe('useExecutionData wiring', () => {
    it('delegates dossier resolution to buildExecutionViewData', async () => {
        const { useExecutionData } = await import('../useExecutionData');
        const file = { id: 'exec-1', creditors: [], debtors: [] } as ExecutionFile;
        vi.mocked(buildExecutionViewData).mockReturnValue(file);

        const { renderHook } = await import('@testing-library/react');
        const { result } = renderHook(() =>
            useExecutionData(null, file, 'exec-1', 3, false),
        );

        expect(buildExecutionViewData).toHaveBeenCalledWith({
            currentFile: null,
            file,
            executionId: 'exec-1',
            executionStorageTick: 3,
            preferStoreCurrentFile: false,
        });
        expect(result.current?.id).toBe('exec-1');
    });
});
