import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import { HomeHubAlertRow } from './HomeHubAlertRow';
import { HomeHubMoreOverlayShell } from './HomeHubMoreOverlayShell';

type HomeHubAlertsMoreOverlayProps = {
    open: boolean;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onClose: () => void;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onTogglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
};

export function HomeHubAlertsMoreOverlay({
    open,
    carouselAlerts,
    sourceById,
    onClose,
    onDismissAlert,
    onOpenEntity,
    onTogglePin,
    isPinned,
}: HomeHubAlertsMoreOverlayProps) {
    const handleOpenEntity = (alert: SecretaryAlert) => {
        onOpenEntity(alert);
        onClose();
    };

    return (
        <HomeHubMoreOverlayShell
            open={open && carouselAlerts.length > 0}
            overlayId="home-hub-alerts-more"
            onClose={onClose}
            testId="home-hub-alerts-more-overlay"
            panelTestId="home-hub-alerts-more-panel"
            ariaLabel={`مواعيد قادمة — ${carouselAlerts.length} عنصر`}
            backdropAriaLabel="إغلاق قائمة المواعيد القادمة"
            title="قادم"
            subtitle={`ما بعد غد · ${carouselAlerts.length} عنصر`}
            count={carouselAlerts.length}
        >
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
