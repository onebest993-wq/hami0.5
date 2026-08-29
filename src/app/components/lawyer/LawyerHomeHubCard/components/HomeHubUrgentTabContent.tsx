import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import type { HomeHubUrgentOverflowSplit } from '../homeHub/homeHubTabOverflow';
import { HomeHubAlertRow } from './HomeHubAlertRow';
import { HomeHubRadarRow } from './HomeHubRadarRow';

type HomeHubUrgentTabContentProps = {
    split: HomeHubUrgentOverflowSplit;
    sourceById: Map<string, SecretaryAlert>;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onNavigate: (routePath: string) => void;
    onDismissRadar?: (eventId: string) => void;
    onTogglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
};

export function HomeHubUrgentTabContent({
    split,
    sourceById,
    onDismissAlert,
    onOpenEntity,
    onNavigate,
    onDismissRadar,
    onTogglePin,
    isPinned,
}: HomeHubUrgentTabContentProps) {
    const { previewRadar, previewAlerts } = split;

    if (previewRadar.length === 0 && previewAlerts.length === 0) {
        return null;
    }

    return (
        <div className="hami-hub-alerts-feed__scroll">
            <ul className="hami-hub-alerts-list" data-testid="home-hub-urgent-feed">
                {previewRadar.map((ev) => (
                    <HomeHubRadarRow key={ev.id} ev={ev} onNavigate={onNavigate} onDismiss={onDismissRadar} />
                ))}
                {previewAlerts.map((alert) => {
                    const source = sourceById.get(alert.id);
                    if (!source) return null;
                    return (
                        <HomeHubAlertRow
                            key={alert.id}
                            alert={alert}
                            source={source}
                            onDismiss={(id) => onDismissAlert?.(id)}
                            onNavigate={onOpenEntity}
                            onTogglePin={onTogglePin}
                            isPinned={isPinned}
                        />
                    );
                })}
            </ul>
        </div>
    );
}
