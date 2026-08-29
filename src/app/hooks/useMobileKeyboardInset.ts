import { useEffect, useState } from 'react';
import { purgeStaticBootShellAfterBoot } from '@/app/bootstrap/bootStaticShell';
import { isTasksDatePickerGraceActive } from '@/app/components/lawyer/dashboard/tasksManager/tasksDatePickerGrace';
import { isHamiNativeShell } from '@/app/runtime/hamiNativeShell';

/**
 * ارتفاع لوحة المفاتيح الافتراضية (px) — لرفع bottom sheet فوق الكيبورد على iOS/Android.
 * يعود 0 على سطح المكتب أو عند عدم دعم visualViewport.
 *
 * على Capacitor مع KeyboardResize.Body: نعتمد أولاً ارتفاع إضافة Keyboard
 * حتى لا نضاعف الرفع إذا بقي visualViewport يبلّغ عن فجوة بعد انكماش body.
 *
 * @param enabled عطّل المستمعين عندما الطبقة مغلقة/دافئة مخفية (توفير بطارية).
 */
export function useMobileKeyboardInset(enabled = true, snap = false): number {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        if (!enabled) {
            setInset(0);
            return;
        }

        let frame = 0;
        let pluginHeight = 0;
        let cancelled = false;
        let removePluginListeners: (() => void) | null = null;

        const commit = (target: number) => {
            if (cancelled) return;
            const next = target > 48 ? Math.round(target) : 0;
            if (next > 0) {
                purgeStaticBootShellAfterBoot();
            }
            setInset((prev) => {
                if (next === 0) return 0;
                if (snap) return next;
                if (Math.abs(prev - next) < 6) return next;
                return Math.round(prev + (next - prev) * 0.42);
            });
        };

        const readVisualGap = (): number => {
            const vv = window.visualViewport;
            if (!vv) return 0;
            return window.innerHeight - vv.height - vv.offsetTop;
        };

        const updateFromViewport = () => {
            if (isTasksDatePickerGraceActive()) return;
            /* إضافة Keyboard نشطة على الأصلي — لا تخلط مع فجوة viewport */
            if (pluginHeight > 0) {
                commit(pluginHeight);
                return;
            }
            commit(readVisualGap());
        };

        const scheduleViewportUpdate = () => {
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updateFromViewport);
        };

        const vv = window.visualViewport;
        if (vv) {
            vv.addEventListener('resize', scheduleViewportUpdate);
            /* على الأصلي Keyboard plugin هو المصدر — scroll في visualViewport يستهلك بطارية بلا فائدة */
            if (!isHamiNativeShell()) {
                vv.addEventListener('scroll', scheduleViewportUpdate);
            }
            scheduleViewportUpdate();
        }

        if (isHamiNativeShell()) {
            void import('@capacitor/keyboard')
                .then(async ({ Keyboard }) => {
                    if (cancelled) return;
                    const show = await Keyboard.addListener('keyboardWillShow', (info) => {
                        pluginHeight = Math.round(info.keyboardHeight || 0);
                        commit(pluginHeight);
                    });
                    const hide = await Keyboard.addListener('keyboardWillHide', () => {
                        pluginHeight = 0;
                        commit(0);
                    });
                    removePluginListeners = () => {
                        void show.remove();
                        void hide.remove();
                    };
                })
                .catch(() => {
                    /* ويب/شيم — ابقَ على visualViewport فقط */
                });
        }

        return () => {
            cancelled = true;
            if (frame) cancelAnimationFrame(frame);
            vv?.removeEventListener('resize', scheduleViewportUpdate);
            if (!isHamiNativeShell()) {
                vv?.removeEventListener('scroll', scheduleViewportUpdate);
            }
            removePluginListeners?.();
        };
    }, [enabled, snap]);

    return enabled ? inset : 0;
}
