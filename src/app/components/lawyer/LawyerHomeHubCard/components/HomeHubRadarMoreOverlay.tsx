import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import { formatHomeHubRadarOverflowLabel } from '@/app/services/alerts/homeHubCardLogic';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { useHomeHubOverlaySheet } from '../hooks/useHomeHubOverlaySheet';
import { HomeHubRadarRow, HomeHubRadarRowIcon } from './HomeHubRadarRow';
import { HomeHubOverlaySheetHandle } from './HomeHubOverlaySheetHandle';
import '../homeHubCardFx.css';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubRadarMoreOverlayProps = {
    open: boolean;
    events: CalendarRadarEvent[];
    onClose: () => void;
    onNavigate: (routePath: string) => void;
    onDismiss?: (eventId: string) => void;
};

export function HomeHubRadarMoreOverlay({
    open,
    events,
    onClose,
    onNavigate,
    onDismiss,
}: HomeHubRadarMoreOverlayProps) {
    const { requestBack } = useHomeHubOverlaySheet(open, onClose, 'home-hub-radar-more');

    if (!open || events.length === 0) return null;

    const overflowLabel = formatHomeHubRadarOverflowLabel(events.length);

    const handleNavigate = (routePath: string) => {
        onNavigate(routePath);
        onClose();
    };

    const layer = (
        <div
            className="hami-hub-radar-overlay"
            data-testid="home-hub-radar-more-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`رادار 48 ساعة — ${overflowLabel}`}
            dir="rtl"
        >
            <button
                type="button"
                className="hami-hub-radar-overlay__backdrop"
                aria-label="إغلاق قائمة التنبيهات الإضافية"
                onClick={requestBack}
            />
            <div
                id="home-hub-radar-more-panel"
                className="hami-hub-radar-overlay__sheet hami-sovereign-glass hami-sovereign-rim"
                data-testid="home-hub-radar-more-panel"
            >
                <div className="hami-hub-radar-overlay__rim" aria-hidden />
                <HomeHubOverlaySheetHandle enabled={open} onClose={requestBack} />

                <header className="hami-hub-radar-overlay__head">
                    <div className="hami-hub-radar-overlay__head-main">
                        <HomeHubRadarRowIcon />
                        <div className="min-w-0">
                            <p className="hami-hub-radar-overlay__title">رادار 48 ساعة</p>
                            <p className="hami-hub-radar-overlay__subtitle">{overflowLabel}</p>
                        </div>
                    </div>
                    <div className="hami-hub-radar-overlay__head-actions">
                        <span className="hami-hub-radar-overlay__count-badge" aria-hidden>
                            {events.length}
                        </span>
                        <button
                            type="button"
                            data-testid="home-hub-radar-more-close"
                            className={`hami-hub-radar-overlay__close ${HUB_CONTENT_BUTTON_A11Y}`}
                            aria-label="إغلاق"
                            onClick={requestBack}
                        >
                            <X size={17} strokeWidth={2.1} aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="hami-hub-radar-overlay__body">
                    <ul className="hami-hub-radar-overlay__list">
                        {events.map((ev) => (
                            <HomeHubRadarRow
                                key={ev.id}
                                ev={ev}
                                onNavigate={handleNavigate}
                                onDismiss={onDismiss}
                            />
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
