import React, { useCallback, useMemo } from 'react';
import type { SparkNudge } from '@/app/spark/types';
import { SparkMark } from '@/app/spark/ui/SparkMark';

export type SparkSmartBadgeProps = {
    nudge: SparkNudge;
    onFollow?: () => void;
    onLater?: () => void;
    onDismiss?: () => void;
    /** banner = شريط كامل في المحتوى؛ popover = داخل نافذة منبثقة من الشريحة */
    layout?: 'banner' | 'popover';
};

export function SparkSmartBadge({
    nudge,
    onFollow,
    onLater,
    onDismiss,
    layout = 'banner',
}: SparkSmartBadgeProps) {
    const handleFollow = useCallback(() => {
        onFollow?.();
    }, [onFollow]);

    const presenceLine = useMemo(() => {
        if (!nudge.presence) return '';
        const message = nudge.message;
        const present = nudge.presence.present
            .map((item) => item.trim())
            .filter((item) => item && !message.includes(item));
        const missing = nudge.presence.missing
            .map((item) => item.trim())
            .filter((item) => item && !message.includes(item));
        return [
            present.length > 0 ? `موجود: ${present.join(' · ')}` : null,
            missing.length > 0 ? `غير مسجّل: ${missing.join(' · ')}` : null,
        ]
            .filter(Boolean)
            .join(' · ');
    }, [nudge.message, nudge.presence]);

    const isPopover = layout === 'popover';

    const rootClass = isPopover
        ? 'min-w-0'
        : 'mb-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-2';

    const actionsPad = isPopover ? '' : 'pr-[18px]';
    const presencePad = isPopover ? '' : 'pr-[18px]';

    return (
        <div
            className={rootClass}
            dir="rtl"
            data-testid="spark-smart-badge"
            role="status"
            aria-live="polite"
            aria-label="تنبيه من السكرتير الذكي"
        >
            <div className="flex items-start gap-1.5">
                {!isPopover ? (
                    <span
                        className="mt-px inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center text-[#E6C673]/88"
                        title="سكرتير ذكي"
                    >
                        <SparkMark size={15} />
                    </span>
                ) : null}
                <p className="min-w-0 flex-1 text-[11px] leading-[1.55] text-white/88">{nudge.message}</p>
            </div>

            {presenceLine ? (
                <p className={`mt-1.5 text-[9px] leading-relaxed text-white/45 ${presencePad}`}>
                    {presenceLine}
                </p>
            ) : null}

            <div className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 ${actionsPad}`}>
                {nudge.action && onFollow ? (
                    <button
                        type="button"
                        onClick={handleFollow}
                        className="min-h-[32px] touch-manipulation rounded-md bg-[#E6C673]/12 px-2.5 py-1 text-[10px] font-semibold text-[#E6C673] active:bg-[#E6C673]/20"
                    >
                        {nudge.action.label}
                    </button>
                ) : null}
                {onLater ? (
                    <button
                        type="button"
                        onClick={onLater}
                        className="min-h-[32px] touch-manipulation px-1 py-1 text-[10px] text-white/48 active:text-white/68"
                    >
                        لاحقاً
                    </button>
                ) : null}
                {onDismiss ? (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="min-h-[32px] touch-manipulation px-1 py-1 text-[10px] text-white/36 active:text-white/55"
                    >
                        تجاهل
                    </button>
                ) : null}
            </div>
        </div>
    );
}
