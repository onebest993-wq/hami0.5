import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { useHomeHubOverlaySheet } from '../hooks/useHomeHubOverlaySheet';
import { HomeHubAlertRow } from './HomeHubAlertRow';
import { HomeHubRadarRow, HomeHubRadarRowIcon } from './HomeHubRadarRow';
import { HomeHubOverlaySheetHandle } from './HomeHubOverlaySheetHandle';
import '../homeHubCardFx.css';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubUrgentMoreOverlayProps = {
    open: boolean;
    radarEvents: CalendarRadarEvent[];
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onClose: () => void;
    onNavigate: (routePath: string) => void;
    onDismissRadar?: (eventId: string) => void;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
};

export function HomeHubUrgentMoreOverlay({
    open,
    radarEvents,
    carouselAlerts,
    sourceById,
    onClose,
    onNavigate,
    onDismissRadar,
    onDismissAlert,
    onOpenEntity,
}: HomeHubUrgentMoreOverlayProps) {
    const { requestBack } = useHomeHubOverlaySheet(open, onClose, 'home-hub-urgent-more');

    const total = radarEvents.length + carouselAlerts.length;
    if (!open || total === 0) return null;

    const handleNavigate = (routePath: string) => {
        onNavigate(routePath);
        onClose();
    };

    const layer = (
        <div
            className="hami-hub-radar-overlay"
            data-testid="home-hub-urgent-more-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`تنبيهات عاجلة — ${total} عنصر`}
            dir="rtl"
        >
            <button
                type="button"
                className="hami-hub-radar-overlay__backdrop"
                aria-label="إغلاق قائمة التنبيهات العاجلة"
                onClick={requestBack}
            />
            <div
                className="hami-hub-radar-overlay__sheet hami-sovereign-glass hami-sovereign-rim"
                data-testid="home-hub-urgent-more-panel"
            >
                <div className="hami-hub-radar-overlay__rim" aria-hidden />
                <HomeHubOverlaySheetHandle enabled={open} onClose={requestBack} />

                <header className="hami-hub-radar-overlay__head">
                    <div className="hami-hub-radar-overlay__head-main">
                        <HomeHubRadarRowIcon urgent />
                        <div className="min-w-0">
                            <p className="hami-hub-radar-overlay__title">عاجل</p>
                            <p className="hami-hub-radar-overlay__subtitle">اليوم وغداً · {total} عنصر</p>
                        </div>
                    </div>
                    <div className="hami-hub-radar-overlay__head-actions">
                        <span className="hami-hub-radar-overlay__count-badge">{total}</span>
                        <button
                            type="button"
                            className={`hami-hub-radar-overlay__close ${HUB_CONTENT_BUTTON_A11Y}`}
                            aria-label="إغلاق"
                            onClick={requestBack}
                        >
                            <X size={18} strokeWidth={2.2} aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="hami-hub-radar-overlay__body">
                    <ul className="hami-hub-radar-overlay__list">
                        {radarEvents.map((ev) => (
                            <HomeHubRadarRow
                                key={ev.id}
                                ev={ev}
                                onNavigate={handleNavigate}
                                onDismiss={onDismissRadar}
                            />
                        ))}
                        {carouselAlerts.map((alert) => {
                            const source = sourceById.get(alert.id);
                            if (!source) return null;
                            return (
                                <HomeHubAlertRow
                                    key={alert.id}
                                    alert={alert}
                                    source={source}
                                    onDismiss={(id) => onDismissAlert?.(id)}
                                    onNavigate={onOpenEntity}
                                />
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : null;
}
