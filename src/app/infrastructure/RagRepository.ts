import { supabase } from '../lib/supabase-client';

export interface RagResult {
    id: string;
    score: number;
    metadata: {
        text: string;
        source?: string;
        page?: number;
        law_article?: string;
        type?: 'law' | 'cassation' | 'procedure';
        [key: string]: any;
    };
}

/**
 * 🧠 RagMemoryEngine (Repository)
 * 
 * The bridge between the Lawyer Dashboard and the Pinecone Vector Database.
 * It does NOT generate embeddings locally. It asks the Secure Server to do it.
 */
export const RagMemoryEngine = {
    
    /**
     * Semantic Search: Ask the Ghost a question, get legal documents back.
     * @param query The natural language question (e.g., "ما هو حكم السارق ليلا؟")
     * @param filter Optional metadata filters (e.g., only 'cassation' decisions)
     */
    search: async (query: string, filter?: any): Promise<RagResult[]> => {
        try {
            console.log("🧠 [RagEngine] Searching Pinecone for:", query);
            
            const { data, error } = await supabase.functions.invoke('make-server-f09713ba/legal-memory-search', {
                body: { 
                    query, 
                    filter,
                    topK: 10 
                }
            });

            if (error) throw error;
            
            return data.matches || [];
        } catch (err) {
            console.error("🧠 [RagEngine] Search Failed:", err);
            // Fallback for demo if server is cold or keys missing, 
            // but in production this should fail loudly.
            return [];
        }
    },

    /**
     * Ingestion: Simulates uploading a document to the memory.
     * (Note: Real ingestion usually happens via a background job, but this is the interface)
     */
    memorize: async (text: string, metadata: any) => {
        // Implementation would go here calling an /upsert endpoint
        console.log("🧠 [RagEngine] Memorizing:", metadata);
    }
};
