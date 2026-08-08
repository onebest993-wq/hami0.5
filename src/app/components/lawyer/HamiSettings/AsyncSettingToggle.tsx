import {
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
    type MouseEvent,
    type PointerEvent,
} from 'react';

const SETTING_FOCUS_RING =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1021]';

/** احتياط — يمنع تعليق المفتاح إذا علّق onCommit (نافذة بيومترية/جسر Capacitor) */
const PENDING_SAFETY_MS = 20_000;

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
    const pointerCommitRef = useRef(false);
    const busy = pending || Boolean(disabled);

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

    useEffect(() => {
        if (!pending) return;
        const timer = window.setTimeout(() => {
            if (!pendingRef.current) return;
            pendingRef.current = false;
            setPending(false);
        }, PENDING_SAFETY_MS);
        return () => window.clearTimeout(timer);
    }, [pending]);

    const commitFromGesture = useCallback(
        (next: boolean) => {
            if (busy) return;
            void runCommit(next);
        },
        [busy, runCommit],
    );

    const resetPointerGesture = useCallback(() => {
        pointerCommitRef.current = false;
    }, []);

    const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || busy) return;
        pointerCommitRef.current = true;
        event.stopPropagation();
        commitFromGesture(!checked);
    };

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (pointerCommitRef.current) {
            pointerCommitRef.current = false;
            return;
        }
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
            data-testid={testId}
            onPointerDown={handlePointerDown}
            onPointerCancel={resetPointerGesture}
            onClick={handleClick}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            className={`relative z-[2] inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full touch-manipulation active:scale-[0.97] ${SETTING_FOCUS_RING} ${busy ? 'opacity-60' : ''}`}
        >
            <div
                aria-hidden
                className={`pointer-events-none relative h-7 w-12 rounded-full hami-settings-toggle-track ${checked ? 'bg-[#E6C673] shadow-[0_0_12px_rgba(230,198,115,0.35)]' : 'bg-white/10'}`}
            >
                <div
                    className={`pointer-events-none absolute top-1 right-1 h-5 w-5 rounded-full bg-white shadow-md hami-settings-toggle-thumb ${checked ? '-translate-x-5' : 'translate-x-0'}`}
                />
            </div>
        </button>
    );
});
