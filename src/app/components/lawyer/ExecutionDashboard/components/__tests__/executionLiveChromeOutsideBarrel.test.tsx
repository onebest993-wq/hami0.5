import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DossierActionsModal } from '../DossierActionsModal';
import { SeizureRequestSubjectModal } from '../SeizureRequestSubjectModal';
import { VisitationWorkspaceSheet } from '../visitationSchedule/VisitationWorkspaceSheet';
import { MaritalFurnitureWorkspaceSheet } from '../maritalFurniture/MaritalFurnitureWorkspaceSheet';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';
import { EXEC_MODAL_CLOSE_BTN_CLASS } from '../../executionModalMobileShell';

describe('execution live chrome outside the overlays barrel', () => {
    it('إجراء الإضبارة: رجوع النظام + هدف لمس 44px', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(
            <DossierActionsModal
                open
                actionType="renew"
                onClose={onClose}
                onConfirm={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: 'إغلاق' }).className).toContain(
            'min-h-[44px]',
        );
        expect(EXEC_MODAL_CLOSE_BTN_CLASS).toMatch(/min-h-\[44px\]/);
        expect(consumeNativeBackForTests()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('موضوع الحجز: رجوع النظام + هدف لمس 44px', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(
            <SeizureRequestSubjectModal
                open
                title="طلب حجز عقار"
                placeholder="موضوع"
                subjectDraft=""
                onClose={onClose}
                onSubjectDraftChange={vi.fn()}
                onSubmit={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: 'إغلاق' }).className).toContain(
            'min-h-[44px]',
        );
        expect(consumeNativeBackForTests()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ورقة المشاهدة: رجوع النظام يعمل', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(
            <VisitationWorkspaceSheet
                open
                onClose={onClose}
                ready
                activeTab="appointment"
                onTabChange={vi.fn()}
            >
                <div>body</div>
            </VisitationWorkspaceSheet>,
        );

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ورقة الأثاث الزوجية: رجوع النظام يعمل', () => {
        resetNativeBackHandlersForTests();
        const onClose = vi.fn();
        render(
            <MaritalFurnitureWorkspaceSheet open onClose={onClose} headerActions={null}>
                <div>body</div>
            </MaritalFurnitureWorkspaceSheet>,
        );

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
