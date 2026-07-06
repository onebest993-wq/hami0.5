import React from 'react';

const BRAND_MARK_SRC = '/hami-logo-transparent.png';
const DEVELOPER_NAME = 'أحمد مهدي كريو';
const DEVELOPER_ROLE = 'المطور المستقل';

export type HamiWordmarkBootPhase = 'enter' | 'idle' | 'exit';

type HamiWordmarkBootProps = {
    phase?: HamiWordmarkBootPhase;
    className?: string;
};

/** شعار الإقلاع الكامل مع توقيع المطور دون قص أو chunk إضافي */
export function HamiWordmarkBoot({
    phase = 'enter',
    className = '',
}: HamiWordmarkBootProps): React.ReactElement {
    return (
        <div
            className={`hami-boot-wordmark-stage hami-boot-wordmark-stage--${phase} ${className}`.trim()}
            data-testid="hami-wordmark-boot"
            aria-hidden
        >
            <div className="hami-boot-brand-mark-shell">
                <img
                    className="hami-boot-brand-mark"
                    src={BRAND_MARK_SRC}
                    alt=""
                    loading="eager"
                    decoding="async"
                    draggable={false}
                />
            </div>
            <div className="hami-boot-brand-credit" aria-label={`المطور المستقل ${DEVELOPER_NAME}`}>
                <span className="hami-boot-brand-credit-role">{DEVELOPER_ROLE}</span>
                <strong className="hami-boot-brand-credit-name">{DEVELOPER_NAME}</strong>
            </div>
        </div>
    );
}
