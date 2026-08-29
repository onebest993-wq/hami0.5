import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import type { HomeHubUpcomingOverflowSplit } from '../homeHub/homeHubTabOverflow';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import { HomeHubAlertRow } from './HomeHubAlertRow';

type HomeHubAlertsListProps = {
    split: HomeHubUpcomingOverflowSplit;
    sourceById: Map<string, SecretaryAlert>;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onTogglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
};

export function HomeHubAlertsList({
    split,
    sourceById,
    onDismissAlert,
    onOpenEntity,
    onTogglePin,
    isPinned,
}: HomeHubAlertsListProps) {
    const { previewAlerts } = split;

    if (previewAlerts.length === 0) return null;

    return (
        <div className="hami-hub-alerts-feed__scroll">
            <ul className="hami-hub-alerts-list" data-testid="home-hub-alerts-list">
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
