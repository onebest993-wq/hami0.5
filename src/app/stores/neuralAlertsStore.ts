import { create } from 'zustand';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import { pickDefaultHorizonFilter } from '@/app/services/alertTimeClassification';

type HorizonCounts = Record<AlertTimeHorizon, number>;

export type HomeHubPanel = 'alerts' | 'linking';

interface NeuralAlertsState {
    activeFilter: AlertTimeHorizon;
    setActiveFilter: (filter: AlertTimeHorizon) => void;
    homeHubPanel: HomeHubPanel;
    setHomeHubPanel: (panel: HomeHubPanel) => void;
}

export const useNeuralAlertsStore = create<NeuralAlertsState>((set) => ({
    activeFilter: 'urgent',
    setActiveFilter: (filter) => set({ activeFilter: filter }),
    homeHubPanel: 'alerts',
    setHomeHubPanel: (panel) => set({ homeHubPanel: panel }),
}));

export function syncHorizonFilterIfEmpty(
    counts: HorizonCounts,
    current: AlertTimeHorizon,
): AlertTimeHorizon | null {
    if (counts[current] > 0) return null;
    return pickDefaultHorizonFilter(counts);
}
