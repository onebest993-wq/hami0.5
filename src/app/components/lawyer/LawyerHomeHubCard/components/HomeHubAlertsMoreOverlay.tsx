import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { useHomeHubOverlaySheet } from '../hooks/useHomeHubOverlaySheet';
import { HomeHubAlertRow } from './HomeHubAlertRow';
import { HomeHubOverlaySheetHandle } from './HomeHubOverlaySheetHandle';
import '../homeHubCardFx.css';

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubAlertsMoreOverlayProps = {
    open: boolean;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onClose: () => void;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
};

export function HomeHubAlertsMoreOverlay({
    open,
    carouselAlerts,
    sourceById,
    onClose,
    onDismissAlert,
    onOpenEntity,
}: HomeHubAlertsMoreOverlayProps) {
    const { requestBack } = useHomeHubOverlaySheet(open, onClose, 'home-hub-alerts-more');

    if (!open || carouselAlerts.length === 0) return null;

    const layer = (
        <div
            className="hami-hub-radar-overlay"
            data-testid="home-hub-alerts-more-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`مواعيد قادمة — ${carouselAlerts.length} عنصر`}
            dir="rtl"
        >
            <button
                type="button"
                className="hami-hub-radar-overlay__backdrop"
                aria-label="إغلاق قائمة المواعيد القادمة"
                onClick={requestBack}
            />
            <div
                className="hami-hub-radar-overlay__sheet hami-sovereign-glass hami-sovereign-rim"
                data-testid="home-hub-alerts-more-panel"
            >
                <div className="hami-hub-radar-overlay__rim" aria-hidden />
                <HomeHubOverlaySheetHandle enabled={open} onClose={requestBack} />

                <header className="hami-hub-radar-overlay__head">
                    <div className="hami-hub-radar-overlay__head-main">
                        <div className="min-w-0">
                            <p className="hami-hub-radar-overlay__title">قادم</p>
                            <p className="hami-hub-radar-overlay__subtitle">
                                ما بعد غد · {carouselAlerts.length} عنصر
                            </p>
                        </div>
                    </div>
                    <div className="hami-hub-radar-overlay__head-actions">
                        <span className="hami-hub-radar-overlay__count-badge">{carouselAlerts.length}</span>
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
