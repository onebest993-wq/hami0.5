import { useCallback, useEffect, type KeyboardEvent, type RefObject } from 'react';
import { dismissActiveSmartDialog, isSmartDialogOpen } from '@/app/components/ui/smartDialogBus';
import {
    readSettingsEscapeGuards,
    resolveSettingsEscapeAction,
} from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';
import { isSettingsFilePickerGraceActive } from '@/app/components/lawyer/HamiSettings/settingsFilePickerGrace';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function runSettingsEscape(onClose: () => void): void {
    const guards = readSettingsEscapeGuards();
    const action = resolveSettingsEscapeAction({
        smartDialogOpen: isSmartDialogOpen(),
        wipeCountdownActive: guards.wipeCountdownActive,
        backupUiOpen: guards.backupUiOpen,
    });
    if (action === 'dismiss-dialog') {
        dismissActiveSmartDialog();
        return;
    }
    if (action === 'cancel-wipe-countdown') {
        guards.cancelWipeCountdown?.();
        return;
    }
    if (action === 'dismiss-backup-ui') {
        guards.dismissBackupUi?.();
        return;
    }
    onClose();
}

export function useSettingsShellEscape(onClose: () => void, enabled = true): void {
    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            runSettingsEscape(onClose);
        };
        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            runSettingsEscape(onClose);
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [enabled, onClose]);
}

export function useSettingsShellFocusTrap(
    shellRef: RefObject<HTMLDivElement | null>,
    onClose: () => void,
    enabled = true,
) {
    useSettingsShellEscape(onClose, enabled);

    useEffect(() => {
        if (!enabled || !shellRef.current) return;
        const root = shellRef.current;

        const onFocusIn = (e: FocusEvent) => {
            if (isSettingsFilePickerGraceActive()) return;
            const target = e.target;
            if (!(target instanceof Node) || root.contains(target)) return;
            if (target instanceof HTMLInputElement && target.type === 'file') return;
            e.stopPropagation();
            const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                (el) => el.offsetParent !== null,
            );
            focusables[0]?.focus();
        };

        document.addEventListener('focusin', onFocusIn, true);
        const closeBtn = root.querySelector<HTMLElement>('[data-testid="settings-shell-close"]');
        const focusRaf = requestAnimationFrame(() => {
            /* لا تسرق التركيز في التبديل السريع إن كان داخل الصدفة أصلاً */
            if (root.contains(document.activeElement)) return;
            closeBtn?.focus({ preventScroll: true });
        });

        return () => {
            cancelAnimationFrame(focusRaf);
            document.removeEventListener('focusin', onFocusIn, true);
        };
    }, [enabled, shellRef]);

    const onKeyDownCapture = useCallback(
        (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !shellRef.current) return;
            const root = shellRef.current;
            const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                (el) => el.offsetParent !== null,
            );
            if (focusables.length === 0) return;
            const first = focusables[0]!;
            const last = focusables[focusables.length - 1]!;
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey) {
                if (active === first || !root.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                e.preventDefault();
                first.focus();
            }
        },
        [shellRef],
    );

    return { onKeyDownCapture };
}
