import { CalendarClock, X } from '@/app/components/ui/lucideIcons';
import {
    resolveHomeHubRadarDismissAriaLabel,
    resolveHomeHubRadarItemAriaLabel,
} from '@/app/services/alerts/homeHubCardLogic';
import type { CalendarRadarEvent } from '@/app/workspace/types';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubRadarRowProps = {
    ev: CalendarRadarEvent;
    onNavigate: (routePath: string) => void;
    onDismiss?: (eventId: string) => void;
};

export function HomeHubRadarRow({ ev, onNavigate, onDismiss }: HomeHubRadarRowProps) {
    const dismissLabel = resolveHomeHubRadarDismissAriaLabel(ev);
    const isExpired = ev.dateLabel === 'انتهى';
    const caseNo = String(ev.caseNo ?? '').trim();
    const court = String(ev.sourcePlace ?? '').trim();
    const headlineSuffix = caseNo || court;
    const courtInDetails = caseNo && court ? court : '';

    return (
        <li
            className="hami-hub-radar__row [content-visibility:auto] [contain-intrinsic-size:auto_44px]"
            dir="rtl"
        >
            <button
                type="button"
                dir="rtl"
                data-testid={`home-hub-radar-item-${ev.id}`}
                onClick={() => onNavigate(ev.routePath)}
                aria-label={resolveHomeHubRadarItemAriaLabel(ev)}
                className={`hami-hub-radar__open ${HUB_CONTENT_BUTTON_A11Y}`}
            >
                <span className="hami-hub-radar__headline">
                    <span className="hami-hub-radar__title-text">{ev.title}</span>
                    {headlineSuffix ? (
                        <>
                            <span className="hami-hub-radar__headline-sep" aria-hidden>·</span>
                            <span className="hami-hub-radar__place">{headlineSuffix}</span>
                        </>
                    ) : null}
                </span>
                {(ev.dateLabel || ev.sourceModuleLabel || courtInDetails) ? (
                    <span className="hami-hub-radar__details">
                        {ev.dateLabel ? (
                            <span
                                className={`hami-hub-radar__date${isExpired ? ' hami-hub-radar__date--expired' : ''}`}
                            >
                                {ev.dateLabel}
                            </span>
                        ) : null}
                        {ev.dateLabel && (ev.sourceModuleLabel || courtInDetails) ? (
                            <span className="hami-hub-radar__meta-sep" aria-hidden>·</span>
                        ) : null}
                        {ev.sourceModuleLabel ? (
                            <span className="hami-hub-radar__source">{ev.sourceModuleLabel}</span>
                        ) : null}
                        {ev.sourceModuleLabel && courtInDetails ? (
                            <span className="hami-hub-radar__meta-sep" aria-hidden>·</span>
                        ) : null}
                        {courtInDetails ? (
                            <span className="hami-hub-radar__court">{courtInDetails}</span>
                        ) : null}
                    </span>
                ) : null}
            </button>
            {onDismiss ? (
                <button
                    type="button"
                    data-testid={`home-hub-radar-dismiss-${ev.id}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(ev.id);
                    }}
                    title={dismissLabel}
                    aria-label={dismissLabel}
                    className={`hami-hub-radar__dismiss ${HUB_CONTENT_BUTTON_A11Y}`}
                >
                    <X size={12} strokeWidth={2.1} aria-hidden />
                </button>
            ) : null}
        </li>
    );
}

export function HomeHubRadarRowIcon({ urgent = false }: { urgent?: boolean }) {
    return (
        <span
            className={`hami-hub-radar__icon${urgent ? ' hami-hub-radar__icon--urgent' : ''}`}
            aria-hidden
        >
            <CalendarClock size={12} strokeWidth={2.2} />
        </span>
    );
}
