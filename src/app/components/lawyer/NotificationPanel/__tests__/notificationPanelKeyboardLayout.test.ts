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

    it('يمرّر الحقل داخل .hami-notif-scroll لا عبر scrollIntoView للصفحة', () => {
        const root = document.createElement('div');
        const scroller = document.createElement('div');
        scroller.className = 'hami-notif-scroll';
        Object.defineProperty(scroller, 'clientHeight', { value: 200 });
        scroller.getBoundingClientRect = () =>
            ({ top: 0, height: 200, bottom: 200, left: 0, right: 0, width: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
        const input = document.createElement('input');
        input.getBoundingClientRect = () =>
            ({ top: 180, height: 44, bottom: 224, left: 0, right: 0, width: 100, x: 0, y: 180, toJSON: () => ({}) }) as DOMRect;
        const scrollIntoView = vi.fn();
        input.scrollIntoView = scrollIntoView;
        scroller.appendChild(input);
        root.appendChild(scroller);
        document.body.appendChild(root);
        input.focus();

        scrollNotificationPanelFocusedFieldIntoView(root);
        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(scroller.scrollTop).not.toBe(0);

        scrollIntoView.mockClear();
        const outside = document.createElement('input');
        document.body.appendChild(outside);
        outside.focus();
        const before = scroller.scrollTop;
        scrollNotificationPanelFocusedFieldIntoView(root);
        expect(scroller.scrollTop).toBe(before);

        root.remove();
        outside.remove();
    });
});
