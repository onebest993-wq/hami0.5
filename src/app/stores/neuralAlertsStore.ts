import { create } from 'zustand';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import { pickDefaultHorizonFilter } from '@/app/services/alertTimeClassification';

type HorizonCounts = Record<AlertTimeHorizon, number>;

interface NeuralAlertsState {
    activeFilter: AlertTimeHorizon;
    setActiveFilter: (filter: AlertTimeHorizon) => void;
}

export const useNeuralAlertsStore = create<NeuralAlertsState>((set) => ({
    activeFilter: 'urgent',
    setActiveFilter: (filter) => set({ activeFilter: filter }),
}));

export function syncHorizonFilterIfEmpty(
    counts: HorizonCounts,
    current: AlertTimeHorizon,
): AlertTimeHorizon | null {
    if (counts[current] > 0) return null;
    return pickDefaultHorizonFilter(counts);
}
