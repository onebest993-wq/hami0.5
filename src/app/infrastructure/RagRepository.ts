export interface RagResult {
    id: string;
    score: number;
    metadata: {
        text: string;
        source?: string;
        page?: number;
        law_article?: string;
        type?: 'law' | 'cassation' | 'procedure';
        [key: string]: unknown;
    };
}

/** V1 stub — semantic/RAG search disabled. */
export const RagMemoryEngine = {
    search: async (_query: string, _filter?: unknown): Promise<RagResult[]> => {
        return [];
    },

    memorize: async (_text: string, _metadata: unknown) => {
        /* no-op */
    },
};
