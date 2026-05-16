import { create } from 'zustand';
import { RagMemoryEngine, RagResult } from '../infrastructure/RagRepository';

interface RagState {
    results: RagResult[];
    isSearching: boolean;
    searchError: string | null;
    
    // Actions
    searchLegalMemory: (query: string) => Promise<void>;
    clearResults: () => void;
}

export const useRagStore = create<RagState>((set) => ({
    results: [],
    isSearching: false,
    searchError: null,

    searchLegalMemory: async (query: string) => {
        if (!query.trim()) return;
        
        set({ isSearching: true, searchError: null });
        try {
            const matches = await RagMemoryEngine.search(query);
            set({ results: matches, isSearching: false });
        } catch (err: any) {
            set({ isSearching: false, searchError: err.message });
        }
    },

    clearResults: () => set({ results: [], searchError: null })
}));
