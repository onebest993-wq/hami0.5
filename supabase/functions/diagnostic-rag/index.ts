import { createClient } from "npm:@supabase/supabase-js@2";

const EMBEDDING_DIM = 768;
const EMBED_MODEL_ID = "gemini-embedding-001";

function jsonResponse(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
    });
}

function extractEmbeddingValues(data: unknown): number[] {
    if (!data || typeof data !== "object") return [];
    const root = data as Record<string, unknown>;
    const emb = root.embedding as Record<string, unknown> | undefined;
    const values = emb?.values;
    if (!Array.isArray(values)) return [];
    return values.filter((v): v is number =>
        typeof v === "number" && Number.isFinite(v)
    );
}

function vectorLiteral(values: number[]): string {
    return `[${values.join(",")}]`;
}

Deno.serve(async (req: Request) => {
    if (req.method !== "POST") {
        return jsonResponse({ error: "Use POST with { prompt }" }, 405);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim() ||
        Deno.env.get("GOOGLE_API_KEY")?.trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!apiKey || !supabaseUrl || !serviceKey) {
        return jsonResponse({ error: "Missing env secrets." }, 500);
    }

    const body = await req.json().catch(() => null) as { prompt?: string } | null;
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return jsonResponse({ error: "prompt required" }, 400);

    const embedUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL_ID}:embedContent?key=${
            encodeURIComponent(apiKey)
        }`;
    const embedRes = await fetch(embedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: prompt }] },
            taskType: "RETRIEVAL_QUERY",
            outputDimensionality: EMBEDDING_DIM,
        }),
    });
    const embedJson: unknown = await embedRes.json().catch(() => null);
    if (!embedRes.ok) {
        return jsonResponse({ error: "embed failed", embedJson }, 200);
    }

    const values = extractEmbeddingValues(embedJson);
    if (values.length !== EMBEDDING_DIM) {
        return jsonResponse(
            { error: `embedding dim ${values.length}`, embedJson },
            200,
        );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const payload = {
        query_embedding: vectorLiteral(values),
        query_text: prompt,
        match_threshold: 0.3,
        match_count: 5,
    };
    const rpcCandidates = ["hybrid_search_laws", "match_documents", "match_laws"] as const;
    let rpcUsed: string | null = null;
    let rows: unknown[] = [];
    let lastError = "";
    for (const rpc of rpcCandidates) {
        const { data, error } = await supabase.rpc(rpc, payload);
        if (error) {
            lastError = `${rpc}: ${error.message}`;
            continue;
        }
        rpcUsed = rpc;
        rows = Array.isArray(data) ? data : [];
        break;
    }
    return jsonResponse({ rpcUsed, count: rows.length, rows, lastError }, 200);
});
