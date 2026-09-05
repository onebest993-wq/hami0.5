import { describe, expect, it, vi } from 'vitest';
import { toastAfterExecutionPersist } from '../toastAfterExecutionPersist';

describe('toastAfterExecutionPersist', () => {
    it('يعلن الفشل ولا ينادي النجاح إن رجع الدمج false', () => {
        const showToast = vi.fn();
        expect(toastAfterExecutionPersist(false, showToast, 'تم الحفظ')).toBe(false);
        expect(showToast).toHaveBeenCalledWith('تعذّر الحفظ — أعد المحاولة', 'error');
    });

    it('يعلن النجاح عند true أو void (مسار ui-first)', () => {
        const showToast = vi.fn();
        expect(toastAfterExecutionPersist(true, showToast, 'تم الحفظ')).toBe(true);
        expect(showToast).toHaveBeenCalledWith('تم الحفظ', 'success');
        showToast.mockClear();
        expect(toastAfterExecutionPersist(undefined, showToast, 'تم الحفظ')).toBe(true);
        expect(showToast).toHaveBeenCalledWith('تم الحفظ', 'success');
    });

    it('يؤجّل توست النجاح حتى يكتمل وعد الدمج', async () => {
        const showToast = vi.fn();
        let resolvePersist: (value: boolean) => void = () => undefined;
        const pending = new Promise<boolean>((resolve) => {
            resolvePersist = resolve;
        });
        expect(toastAfterExecutionPersist(pending, showToast, 'تم الحفظ')).toBe(true);
        expect(showToast).not.toHaveBeenCalled();
        resolvePersist(true);
        await pending;
        await Promise.resolve();
        expect(showToast).toHaveBeenCalledWith('تم الحفظ', 'success');
    });
});
