import React from 'react';

/** هيكل خفيف يطابق صفوف التحكم — يظهر فقط إن سبق الإصبع تحميل الـ chunk */
export function AlertControlsRouteFallback() {
    return (
        <div
            className="space-y-3 py-1"
            data-testid="notification-alert-controls-loading"
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">جاري تحميل تحكم التنبيهات</span>
            <div className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.04] animate-pulse" />
            <div className="h-24 rounded-xl border border-white/[0.06] bg-white/[0.03] animate-pulse" />
            <div className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.04] animate-pulse" />
            <div className="h-11 rounded-xl border border-white/[0.06] bg-white/[0.04] animate-pulse" />
        </div>
    );
}
