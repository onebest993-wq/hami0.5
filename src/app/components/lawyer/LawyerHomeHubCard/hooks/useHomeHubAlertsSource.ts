import { useMemo } from 'react';
import { computeHomeHubAlertsTabBadgeOffPanel } from '@/app/services/alerts/homeHubCardLogic';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useNeuralAlertsStore } from '@/app/stores/neuralAlertsStore';
import { useNeuralAlertsFromSecretary } from '../../NeuralAlertsCard/useNeuralAlertsFromSecretary';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { useHomeHubHorizonSync } from './useHomeHubHorizonSync';

export type HomeHubAlertsSource = {
    horizonCounts: Record<AlertTimeHorizon, number>;
    carouselTotal: number;
    alertsForFilter: (filter: AlertTimeHorizon) => SmartAlert[];
    sourcesForFilter: (filter: AlertTimeHorizon) => SecretaryAlert[];
    activeFilter: AlertTimeHorizon;
    setActiveFilter: (filter: AlertTimeHorizon) => void;
    urgentSecretaryAlerts: SecretaryAlert[];
    provisionalAlertsTabCount: number;
};

/** مصدر التنبيهات قبل معرفة اللوحة النشطة — شارات + مزامنة أفق. */
export function useHomeHubAlertsSource(secretaryAlerts: SecretaryAlert[]): HomeHubAlertsSource {
    const {
        counts: horizonCounts,
        carouselTotal,
        alertsForFilter,
        sourcesForFilter,
    } = useNeuralAlertsFromSecretary(secretaryAlerts);

    const activeFilter = useNeuralAlertsStore((s) => s.activeFilter);
    const setActiveFilter = useNeuralAlertsStore((s) => s.setActiveFilter);

    useHomeHubHorizonSync({
        carouselTotal,
        horizonCounts,
        activeFilter,
        setActiveFilter,
    });

    const urgentSecretaryAlerts = useMemo(
        () => sourcesForFilter('urgent'),
        [sourcesForFilter],
    );

    const provisionalAlertsTabCount = useMemo(
        () => computeHomeHubAlertsTabBadgeOffPanel(urgentSecretaryAlerts),
        [urgentSecretaryAlerts],
    );

    return {
        horizonCounts,
        carouselTotal,
        alertsForFilter,
        sourcesForFilter,
        activeFilter,
        setActiveFilter,
        urgentSecretaryAlerts,
        provisionalAlertsTabCount,
    };
}
