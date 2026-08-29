import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarRadarEvent, WorkspacePinnedItem } from '@/app/workspace/types';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { HomeHubAlertRow } from './HomeHubAlertRow';
import { HomeHubMoreOverlayShell } from './HomeHubMoreOverlayShell';
import { HomeHubRadarRow, HomeHubRadarRowIcon } from './HomeHubRadarRow';

type HomeHubUrgentMoreOverlayProps = {
    open: boolean;
    radarEvents: CalendarRadarEvent[];
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onClose: () => void;
    onNavigate: (routePath: string) => void;
    onDismissRadar?: (eventId: string) => void;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onTogglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
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
    onTogglePin,
    isPinned,
}: HomeHubUrgentMoreOverlayProps) {
    const total = radarEvents.length + carouselAlerts.length;

    const handleNavigate = (routePath: string) => {
        onNavigate(routePath);
        onClose();
    };

    const handleOpenEntity = (alert: SecretaryAlert) => {
        onOpenEntity(alert);
        onClose();
    };

    return (
        <HomeHubMoreOverlayShell
            open={open && total > 0}
            overlayId="home-hub-urgent-more"
            onClose={onClose}
            testId="home-hub-urgent-more-overlay"
            panelTestId="home-hub-urgent-more-panel"
            ariaLabel={`تنبيهات عاجلة — ${total} عنصر`}
            backdropAriaLabel="إغلاق قائمة التنبيهات العاجلة"
            title="عاجل"
            subtitle={`اليوم وغداً · ${total} عنصر`}
            count={total}
            leading={<HomeHubRadarRowIcon urgent />}
        >
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
                            onNavigate={handleOpenEntity}
                            onTogglePin={onTogglePin}
                            isPinned={isPinned}
                        />
                    );
                })}
            </ul>
        </HomeHubMoreOverlayShell>
    );
}
