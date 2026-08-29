import { describe, expect, it, vi } from 'vitest';
import {
    resolveNotificationPanelSheetStyle,
    scrollNotificationPanelFocusedFieldIntoView,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationPanelKeyboardLayout';

describe('notificationPanelKeyboardLayout', () => {
    it('لا يرفع الورقة على سطح المكتب أو بدون كيبورد', () => {
        expect(resolveNotificationPanelSheetStyle(0, false)).toEqual({});
        expect(resolveNotificationPanelSheetStyle(280, true)).toEqual({});
    });

    it('يرفع الورقة ويقلّص الارتفاع فوق الكيبورد على الموبايل', () => {
        const style = resolveNotificationPanelSheetStyle(280, false);
        expect(style.marginBottom).toBe(280);
        expect(String(style.maxHeight)).toContain('280px');
        expect(String(style.maxHeight)).toContain('92dvh');
    });

    it('يمرّر الحقل النشط داخل اللوحة فقط', () => {
        const root = document.createElement('div');
        const input = document.createElement('input');
        root.appendChild(input);
        document.body.appendChild(root);
        input.focus();
        const scrollIntoView = vi.fn();
        input.scrollIntoView = scrollIntoView;

        scrollNotificationPanelFocusedFieldIntoView(root);
        expect(scrollIntoView).toHaveBeenCalled();

        scrollIntoView.mockClear();
        const outside = document.createElement('input');
        document.body.appendChild(outside);
        outside.focus();
        scrollNotificationPanelFocusedFieldIntoView(root);
        expect(scrollIntoView).not.toHaveBeenCalled();

        root.remove();
        outside.remove();
    });
});
