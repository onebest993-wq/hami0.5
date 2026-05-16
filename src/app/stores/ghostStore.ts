import { create } from 'zustand';

export type InsightType = 'alert' | 'suggestion' | 'info';

export interface Insight {
  id: string;
  title: string;
  message: string;
  type: InsightType;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: number;
}

interface GhostState {
  insights: Insight[];
  isAnalyzing: boolean;
  addInsight: (insight: Omit<Insight, 'id' | 'timestamp'>) => void;
  removeInsight: (id: string) => void;
  setAnalyzing: (status: boolean) => void;
  clearInsights: () => void;
}

export const useGhostStore = create<GhostState>((set) => ({
  insights: [],
  isAnalyzing: false,
  addInsight: (insight) => 
    set((state) => {
      const next = [
        {
          ...insight,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
        },
        ...state.insights,
      ];
      return { insights: next.length > 50 ? next.slice(0, 50) : next };
    }),
  removeInsight: (id) =>
    set((state) => ({
      insights: state.insights.filter((i) => i.id !== id),
    })),
  setAnalyzing: (status) => set({ isAnalyzing: status }),
  clearInsights: () => set({ insights: [] }),
}));
