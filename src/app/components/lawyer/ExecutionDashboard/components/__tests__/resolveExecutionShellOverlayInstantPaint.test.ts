import { describe, expect, it, vi } from 'vitest';
import { resolveExecutionShellOverlayInstantPaint } from '../resolveExecutionShellOverlayInstantPaint';

describe('resolveExecutionShellOverlayInstantPaint', () => {
    it('notes overlay closes via the explicit closer', () => {
        const onCloseNotesModal = vi.fn();
        const paint = resolveExecutionShellOverlayInstantPaint({
            showNotesModal: true,
            onCloseNotesModal,
            setShowNotesModal: vi.fn(),
        });
        expect(paint.kind).toBe('notes');
        expect(paint.title).toBe('سجل الملاحظات والمهام');
        paint.onClose();
        expect(onCloseNotesModal).toHaveBeenCalledTimes(1);
    });

    it('eviction expense overlay is named and closable', () => {
        const setShowEvictionExpenseModal = vi.fn();
        const paint = resolveExecutionShellOverlayInstantPaint({
            showEvictionExpenseModal: true,
            setShowEvictionExpenseModal,
        });
        expect(paint.kind).toBe('named');
        expect(paint.title).toBe('مصاريف التخلية');
        paint.onClose();
        expect(setShowEvictionExpenseModal).toHaveBeenCalledWith(false);
    });

    it('seized-property step overlay is named and closable', () => {
        const setSeizedPropertyStepModalOpen = vi.fn();
        const paint = resolveExecutionShellOverlayInstantPaint({
            seizedPropertyStepModalOpen: true,
            setSeizedPropertyStepModalOpen,
        });
        expect(paint.kind).toBe('named');
        expect(paint.title).toBe('تسجيل خطوة العقار المحجوز');
        paint.onClose();
        expect(setSeizedPropertyStepModalOpen).toHaveBeenCalledWith(false);
    });
});
