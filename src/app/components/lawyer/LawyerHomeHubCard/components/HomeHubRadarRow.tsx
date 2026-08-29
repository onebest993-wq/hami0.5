import { CalendarClock } from '@/app/components/ui/icons/CalendarClock';
import { X } from '@/app/components/ui/icons/X';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import {
    resolveHomeHubRadarDismissAriaLabel,
    resolveHomeHubRadarItemAriaLabel,
} from '@/app/services/alerts/homeHubCardLogic';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { HUB_CONTENT_BUTTON_A11Y } from '../homeHub/homeHubA11y';

type HomeHubRadarRowProps = {
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
    const openPress = useScrollSafePress({
        onPress: () => onNavigate(ev.routePath),
    });
    const dismissPress = useScrollSafePress({
        onPress: () => onDismiss?.(ev.id),
    });

    return (
        <li
            className="hami-hub-radar__row [content-visibility:auto] [contain-intrinsic-size:auto_52px]"
            dir="rtl"
        >
            <button
                type="button"
                dir="rtl"
                data-testid={`home-hub-radar-item-${ev.id}`}
                aria-label={resolveHomeHubRadarItemAriaLabel(ev)}
                className={`hami-hub-radar__open ${HUB_CONTENT_BUTTON_A11Y}`}
                {...openPress}
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
                    title={dismissLabel}
                    aria-label={dismissLabel}
                    className={`hami-hub-radar__dismiss ${HUB_CONTENT_BUTTON_A11Y}`}
                    {...dismissPress}
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
