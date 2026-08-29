import {
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
    type MouseEvent,
} from 'react';
import { SETTING_FOCUS_RING } from './settings-ui/tokens';
import { SettingsToggleTrack } from './settings-ui/SettingsToggleTrack';

/** احتياط — يمنع تعليق المفتاح إذا علّق onCommit (بيومتري/حوار) */
const ASYNC_TOGGLE_SAFETY_MS = 120_000;

export type AsyncSettingToggleProps = {
    checked: boolean;
    /** يُنفَّذ الإجراء الكامل (حوار/بصمة) — false = رفض/إلغاء */
    onCommit: (next: boolean) => Promise<boolean | void>;
    disabled?: boolean;
    label?: string;
    testId?: string;
    'aria-labelledby'?: string;
};

/**
 * مفتاح إعدادات غير متزامن — بلا optimistic UI.
 * الحالة المعروضة = checked من المصدر حتى ينجح onCommit.
 */
export const AsyncSettingToggle = memo(function AsyncSettingToggle({
    checked,
    onCommit,
    disabled,
    label,
    testId,
    'aria-labelledby': ariaLabelledBy,
}: AsyncSettingToggleProps) {
    const [pending, setPending] = useState(false);
    const pendingRef = useRef(false);
    const busy = pending || Boolean(disabled);

    useEffect(() => {
        if (!pending) return;
        const timer = window.setTimeout(() => {
            pendingRef.current = false;
            setPending(false);
        }, ASYNC_TOGGLE_SAFETY_MS);
        return () => window.clearTimeout(timer);
    }, [pending]);

    const runCommit = useCallback(
        async (next: boolean) => {
            if (pendingRef.current || disabled) return;

            pendingRef.current = true;
            setPending(true);
            try {
                await onCommit(next);
            } finally {
                pendingRef.current = false;
                setPending(false);
            }
        },
        [disabled, onCommit],
    );

    const commitFromGesture = useCallback(
        (next: boolean) => {
            if (busy) return;
            void runCommit(next);
        },
        [busy, runCommit],
    );

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        commitFromGesture(!checked);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-busy={pending || undefined}
            aria-disabled={busy || undefined}
            aria-label={label}
            aria-labelledby={ariaLabelledBy}
            disabled={pending || Boolean(disabled)}
            data-testid={testId}
            onClick={handleClick}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            className={`relative z-[2] inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full touch-manipulation ${SETTING_FOCUS_RING} ${busy ? 'opacity-60' : ''}`}
        >
            <SettingsToggleTrack on={checked} />
        </button>
    );
});
