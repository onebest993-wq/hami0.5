import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const panel = join(root, 'src/app/components/lawyer/NotificationPanel');

function read(rel: string): string {
    return readFileSync(join(panel, rel), 'utf8');
}

describe('كثافة سطح الإشعارات — خفيف احترافي', () => {
    it('الورقة والبطاقة: rounded-xl وظل خفيف بلا زوايا ثقيلة', () => {
        const breakpoints = read('styles/notificationPanel.sheet.breakpoints.css');
        expect(breakpoints).toContain('border-radius: 0.75rem 0.75rem 0 0');
        expect(breakpoints).toContain('border-radius: 0.75rem');
        expect(breakpoints).not.toContain('1.65rem');
        expect(breakpoints).not.toContain('1.5rem');

        const chrome = read('styles/notificationPanel.sheet.chrome.css');
        expect(chrome).toContain('box-shadow: 0 -6px 18px');
        expect(chrome).not.toContain('0 -12px 40px');
        expect(chrome).toContain('translate3d(0, 28%, 0)');
        expect(chrome).toContain('min-height: 44px');

        const cards = read('styles/notificationPanel.sheet.cards.css');
        expect(cards).toContain('border-radius: 0.75rem');
        expect(cards).toContain('contain-intrinsic-size: auto 76px');
        expect(cards).not.toContain('92px');
        expect(cards).toContain('content-visibility: auto');

        const slot = read('utils/notificationListWindow.ts');
        expect(slot).toContain('NOTIFICATION_LIST_CARD_SLOT_PX = 76');
    });

    it('لا حركة ميتة ولا أيقونة نوع مزدوجة ولا blur على الخطأ', () => {
        expect(existsSync(join(panel, 'utils/pickTypeIcon.ts'))).toBe(false);

        const chromeHook = read('hooks/useNotificationPanelChrome.ts');
        expect(chromeHook).toContain('useMobileKeyboardInset(isOpen, true,');
        expect(chromeHook).toContain('ignoreTasksDatePickerGrace: true');
        expect(chromeHook).not.toContain('overlayTransition');
        expect(chromeHook).not.toContain('sheetEnterTransition');

        const index = read('index.tsx');
        expect(index).not.toContain('overlayTransition');
        expect(index).not.toContain('sheetEnterTransition');

        const rootComp = read('components/NotificationPanelRoot.tsx');
        expect(rootComp).not.toContain('AnimatePresence');
        expect(rootComp).not.toContain('overlayMotionRuntime');

        const card = read('components/NotificationCard.tsx');
        expect(card).not.toContain('pickTypeIcon');
        expect(card).not.toContain("from '@/app/motion/overlayMotionRuntime'");
        expect(card).toContain('min-h-[44px]');
        expect(card).toContain('bg-[#E6C673]');
        expect(card).not.toMatch(/\bجديد\b/);

        const error = read('NotificationErrorBoundary.tsx');
        expect(error).not.toContain('backdrop-blur');
        expect(error).not.toContain('rounded-t-[28px]');
        expect(error).toContain('min-h-[44px]');
        expect(error).toContain('rounded-xl');
        expect(error).toContain('z-[200]');
    });

    it('الهيدر والقائمة والمشاركة والمنبثق مضغوطة مع لمس 44px', () => {
        const inbox = read('components/NotificationHeaderInbox.tsx');
        expect(inbox).toContain('px-3 pb-2');
        expect(inbox).toContain('min-h-[44px]');
        expect(inbox).not.toContain('px-4 pb-2.5');

        const tabs = read('components/NotificationTabs.tsx');
        expect(tabs).toContain('px-3 py-2');
        expect(tabs).toContain('min-h-[44px]');
        expect(tabs).not.toContain('px-4 py-3');

        const list = read('components/NotificationList.tsx');
        expect(list).toContain('space-y-3');
        expect(list).not.toContain('space-y-5');

        const share = read('components/CaseShareCard.tsx');
        expect(share).toContain('rounded-xl');
        expect(share).not.toContain('rounded-2xl');
        expect(share.match(/min-h-\[44px\]/g)?.length).toBeGreaterThanOrEqual(4);

        const popups = read('components/IncomingNotificationPopups.tsx');
        expect(popups).toContain('rounded-xl');
        expect(popups).toContain('min-h-[44px]');
        expect(popups).toContain('safe-area-inset-top');
        expect(popups).not.toContain('rounded-2xl');

        const alerts = read('styles/notificationPanel.alerts.css');
        expect(alerts).toContain('font-size: 16px');
        expect(alerts).toContain('border-radius: 0.75rem');

        const android = read('styles/notificationPanel.android.css');
        expect(android).toContain('backdrop-filter: none');
        expect(android).toContain('0 -6px 16px');

        const sheet = read('components/NotificationPanelSheet.tsx');
        expect(sheet).toContain('info.offset.y > 108');
    });

    it('القشرة الفورية تطابق الورقة الحيّة', () => {
        const constants = readFileSync(
            join(root, 'src/app/runtime/notificationInstantPaintConstants.ts'),
            'utf8',
        );
        expect(constants).toContain("NOTIFICATION_INSTANT_SHEET_RADIUS = '0.75rem 0.75rem 0 0'");
        expect(constants).toContain("NOTIFICATION_INSTANT_SHEET_BG = '#0b1021'");
        expect(constants).toContain("NOTIFICATION_INSTANT_TITLE_SIZE = '1.0625rem'");
        expect(constants).toContain("NOTIFICATION_INSTANT_TITLE_WEIGHT = '600'");

        const bridge = readFileSync(
            join(root, 'src/app/runtime/notificationInstantPaintBridge.ts'),
            'utf8',
        );
        expect(bridge).toContain('NOTIFICATION_INSTANT_SHEET_RADIUS');
        expect(bridge).toContain('NOTIFICATION_INSTANT_SHEET_BG');
        expect(bridge).toContain('NOTIFICATION_INSTANT_TITLE_SIZE');
        expect(bridge).toContain('NOTIFICATION_INSTANT_TITLE_WEIGHT');
        expect(bridge).not.toContain('#080D18');
        expect(bridge).not.toContain('1.35rem');
        expect(bridge).not.toContain('font-weight:800');
    });
});
