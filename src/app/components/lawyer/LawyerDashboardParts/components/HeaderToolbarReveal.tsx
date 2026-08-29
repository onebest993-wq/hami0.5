import React, { memo } from 'react';

type HeaderToolbarRevealProps = {
    open: boolean;
    unreadCount: number;
    onToggle: () => void;
};

export const HeaderToolbarReveal = memo(function HeaderToolbarReveal({
    open,
    unreadCount,
    onToggle,
}: HeaderToolbarRevealProps) {
    const label = open ? 'إخفاء أدوات اللوحة' : 'إظهار أدوات اللوحة';
    const showPip = !open && unreadCount > 0;

    return (
        <button
            type="button"
            className="hami-header-tools-reveal"
            data-testid="header-tools-reveal"
            aria-expanded={open}
            aria-controls="header-toolbar-tools"
            aria-label={label}
            title={label}
            onClick={onToggle}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
            {/* السهم فوق العلامة — ترتيب عمودي ثابت بلا تداخل أفقي */}
            <svg
                className="hami-header-tools-reveal__caret"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
            >
                <path d="M5.2 8.4 12 16.35 18.8 8.4Z" />
            </svg>
            <svg
                className="hami-header-tools-reveal__burst"
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
            >
                <path d="M12 2.4 13.85 7.1 12 9.05 10.15 7.1Z" />
                <path d="M21.6 12 16.9 13.85 14.95 12 16.9 10.15Z" />
                <path d="M12 21.6 10.15 16.9 12 14.95 13.85 16.9Z" />
                <path d="M2.4 12 7.1 10.15 9.05 12 7.1 13.85Z" />
                <rect x="10.55" y="10.55" width="2.9" height="2.9" rx="0.35" />
            </svg>
            {showPip ? (
                <span className="hami-header-tools-reveal__pip" aria-hidden>
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            ) : null}
        </button>
    );
});
