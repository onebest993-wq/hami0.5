import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(resolve(root, rel), 'utf8');
}

describe('tasks mobile honesty', () => {
    it('الإيماءات: سحب الستارة + رجوع أصلي + حافة الشاشة دون مضاعفة أندرويد', () => {
        const handle = read(
            'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetDragHandle.tsx',
        );
        expect(handle).toContain('useSheetSwipeDismiss');
        expect(handle).toContain('min-h-[44px]');
        expect(handle).toContain('hami-field-tasks-swipe-handle');
        const sheet = read('src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx');
        expect(sheet).toContain('FieldTasksSheetDragHandle');
        expect(sheet).toContain('useBodyScrollLock(open)');
        const escape = read(
            'src/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape.ts',
        );
        expect(escape).toContain('registerNativeBackHandler');
        expect(escape).toContain('consumeBackStack');
        expect(escape).toContain('isTasksOverlayEscapeBlocked');
        const edge = read('src/app/runtime/overlayEdgeBackGesture.ts');
        expect(edge).toContain("'data-hami-tasks-manager-open'");
        expect(edge).toContain("'data-hami-field-tasks-open'");
        expect(edge).toContain('isAndroidNativeShell');
        expect(edge).toContain('fromInlineStart');
    });

    it('لوحة المفاتيح: inset للستارة والأجندة والحوار + حقول 16px', () => {
        const sheet = read('src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx');
        expect(sheet).toContain('useMobileKeyboardInset(open)');
        const overlay = read('src/app/components/lawyer/dashboard/TasksManagerOverlay.tsx');
        expect(overlay).toContain('useMobileKeyboardInset(open, true)');
        expect(overlay).toContain('useBodyScrollLock(open)');
        const dialog = read(
            'src/app/components/lawyer/dashboard/tasksManager/TasksManagerDialogContent.tsx',
        );
        expect(dialog).toContain('useMobileKeyboardInset');
        expect(dialog).toContain('min-h-[44px]');
        const week = read(
            'src/app/components/lawyer/dashboard/tasksManager/WeeklyAgendaSection.tsx',
        );
        expect(week).toContain('enterKeyHint="done"');
        const theme = read(
            'src/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme.ts',
        );
        expect(theme).toContain('text-base text-[#F4F4F5] min-h-[44px]');
        expect(theme).not.toContain("text-sm text-[#F4F4F5] ' +");
    });

    it('safe-area وdvh وقفل التمرير وتقليل الحركة', () => {
        const sheet = read('src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx');
        expect(sheet).toContain('pb-[max(0px,env(safe-area-inset-bottom))]');
        const overlay = read('src/app/components/lawyer/dashboard/TasksManagerOverlay.tsx');
        expect(overlay).toContain('h-[100dvh]');
        expect(overlay).toContain('overscroll-none');
        expect(overlay).toContain('HAMI_OVERLAY_SAFE_INSETS_CLASS');
        expect(overlay).toContain('data-hami-overlay-safe="1"');
        const chrome = read(
            'src/app/components/lawyer/dashboard/fieldTasks/fieldTasksChrome.css',
        );
        expect(chrome).toContain('prefers-reduced-motion: reduce');
        expect(chrome).toContain('overscroll-behavior-y: contain');
        expect(chrome).toContain('-webkit-overflow-scrolling: touch');
        expect(chrome).toContain('.hami-field-tasks-swipe-handle');
        expect(chrome).toContain('touch-action: pan-y');
        const manager = read('src/app/components/lawyer/dashboard/TasksManager.tsx');
        expect(manager).toContain('useReduceMotion');
        const week = read(
            'src/app/components/lawyer/dashboard/tasksManager/WeeklyAgendaSection.tsx',
        );
        expect(week).toContain('useReduceMotion');
        const theme = read(
            'src/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme.ts',
        );
        expect(theme).toContain('touch-pan-y');
    });

    it('قارئ الشاشة ومتابعة الإصبع وربط بلاطة المنزل', () => {
        const hook = read('src/app/hooks/useSheetSwipeDismiss.ts');
        expect(hook).toContain('onPointerMove');
        expect(hook).toContain('setPointerCapture');
        expect(hook).toContain('onOffsetChange');
        expect(hook).toContain('follow');
        const handle = read(
            'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetDragHandle.tsx',
        );
        expect(handle).toContain('aria-label="اسحب للأسفل لإغلاق الستارة"');
        expect(handle).toContain('follow: !reduceMotion');
        expect(handle).toContain('role="button"');
        const sheet = read('src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx');
        expect(sheet).toContain('FieldTasksSheetDragHandle');
        expect(sheet).toContain('translate3d');
        expect(sheet).toContain('hami-field-tasks-sheet--dragging');
        expect(sheet).toContain('إغلاق مهام اليوم الميدانية');
        expect(sheet).toContain('role="status"');
        expect(sheet).toContain('field-tasks-sheet-swipe-hint');
        const chrome = read(
            'src/app/components/lawyer/dashboard/fieldTasks/fieldTasksChrome.css',
        );
        expect(chrome).toContain('.hami-field-tasks-sheet--dragging');
        const card = read(
            'src/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard.tsx',
        );
        expect(card).toContain('إنهاء ${task.title}');
        expect(card).toContain('إعادة فتح ${task.title}');
        const dock = read('src/app/services/settings/dockShellAria.ts');
        expect(dock).toContain('مهام اليوم الميدانية');
        expect(dock).not.toContain('fieldTasksSheetOpen');
    });
});
