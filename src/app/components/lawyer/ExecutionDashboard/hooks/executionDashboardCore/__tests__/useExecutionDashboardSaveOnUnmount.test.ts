import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardSaveOnUnmount } from '../useExecutionDashboardRuntimeSyncEffects';

describe('useExecutionDashboardSaveOnUnmount', () => {
    it('saves only on real unmount with the latest callback — never on identity churn', () => {
        const firstSave = vi.fn();
        const secondSave = vi.fn();

        const { rerender, unmount } = renderHook(
            ({ save }: { save: () => void }) =>
                useExecutionDashboardSaveOnUnmount(save, 'ex-1'),
            { initialProps: { save: firstSave } },
        );

        // تغيّر هوية الـ callback (useCallback deps) كان يشغّل الحفظ بإغلاق قديم —
        // انحدار انبعاث الأعلام: يجب ألا يُحفظ أي شيء أثناء الجلسة.
        rerender({ save: secondSave });
        rerender({ save: firstSave });
        rerender({ save: secondSave });
        expect(firstSave).not.toHaveBeenCalled();
        expect(secondSave).not.toHaveBeenCalled();

        unmount();
        expect(firstSave).not.toHaveBeenCalled();
        expect(secondSave).toHaveBeenCalledTimes(1);
    });

    it('saves the previous file snapshot once when the active file id changes (inaba switch)', () => {
        const parentSave = vi.fn();
        const subFileSave = vi.fn();

        const { rerender, unmount } = renderHook(
            ({ save, fileId }: { save: () => void; fileId: string }) =>
                useExecutionDashboardSaveOnUnmount(save, fileId),
            { initialProps: { save: parentSave, fileId: 'parent-1' } },
        );

        // عند التبديل يُبنى callback جديد بلقطة الملف الجديد في نفس الـ render —
        // يجب أن يحفظ الـ cleanup لقطة الملف السابق لا الجديد.
        rerender({ save: subFileSave, fileId: 'sub-1' });
        expect(parentSave).toHaveBeenCalledTimes(1);
        expect(subFileSave).not.toHaveBeenCalled();

        unmount();
        expect(parentSave).toHaveBeenCalledTimes(1);
        expect(subFileSave).toHaveBeenCalledTimes(1);
    });
});
