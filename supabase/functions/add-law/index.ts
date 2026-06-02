/**
 * Edge Function: add-law
 * إدخال مواد قانونية عراقية مع تضمين Gemini (بدون OpenAI).
 *
 * أسرار مطلوبة:
 * - GEMINI_API_KEY (أو GOOGLE_API_KEY)
 * - SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY (يُحقنان تلقائياً في Edge Functions)
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_EMBED_BASE =
    "https://generativelanguage.googleapis.com/v1beta/models";
const EMBEDDING_MODEL = "models/gemini-embedding-001";

const EMBEDDING_DIM = 768;

function corsHeadersFor(req: Request): Record<string, string> {
    const requested = req.headers.get("access-control-request-headers");
    const allowHeaders =
        requested && requested.trim().length > 0
            ? requested
            : [
                  "authorization",
                  "x-client-info",
                  "apikey",
                  "content-type",
                  "x-csrf-token",
                  "X-CSRF-Token",
              ].join(", ");

    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": allowHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
    };
}

function jsonResponse(
    body: Record<string, unknown>,
    status: number,
    req: Request,
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeadersFor(req),
            "Content-Type": "application/json; charset=utf-8",
        },
    });
}

function getGeminiApiKey(): string | undefined {
    return Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");
}

async function fetchGeminiEmbedding(
    text: string,
    apiKey: string,
): Promise<{ values: number[]; modelUsed: string }> {
    const modelId = "gemini-embedding-001";
    const url =
        `${GEMINI_EMBED_BASE}/${modelId}:embedContent?key=${
            encodeURIComponent(apiKey)
        }`;

    const body: Record<string, unknown> = {
        model: EMBEDDING_MODEL,
        content: {
            parts: [{ text }],
        },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBEDDING_DIM,
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
        const msg = extractGeminiErrorMessage(data) ??
            `HTTP ${res.status}`;
        throw new Error(`${modelId}: ${msg}`);
    }

    const values = extractEmbeddingValues(data);
    if (!values.length) {
        throw new Error(`${modelId}: لا يوجد متجه في الاستجابة`);
    }

    if (values.length !== EMBEDDING_DIM) {
        throw new Error(
            `${modelId}: بعد المتجه ${values.length} بدلاً من ${EMBEDDING_DIM}`,
        );
    }

    return { values, modelUsed: modelId };
}

function extractGeminiErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const err = o.error as Record<string, unknown> | undefined;
    const msg = err?.message;
    return typeof msg === "string" ? msg : null;
}

function extractEmbeddingValues(data: unknown): number[] {
    if (!data || typeof data !== "object") return [];
    const root = data as Record<string, unknown>;
    const emb = root.embedding as Record<string, unknown> | undefined;
    const values = emb?.values;
    if (!Array.isArray(values)) return [];
    const out: number[] = [];
    for (const v of values) {
        if (typeof v === "number" && Number.isFinite(v)) out.push(v);
    }
    return out;
}

/** تنسيق متوافق مع عمود pgvector في PostgREST */
function vectorLiteral(values: number[]): string {
    return `[${values.join(",")}]`;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeadersFor(req) });
    }

    if (req.method !== "POST") {
        return jsonResponse(
            { ok: false, error: "الطريقة غير مسموحة. استخدم POST." },
            405,
            req,
        );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
        return jsonResponse(
            {
                ok: false,
                error: "إعدادات Supabase غير مكتملة (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
            },
            500,
            req,
        );
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        return jsonResponse(
            {
                ok: false,
                error: "مفتاح Gemini غير مضبوط. عيّن GEMINI_API_KEY أو GOOGLE_API_KEY في أسرار الدالة.",
            },
            500,
            req,
        );
    }

    let payload: unknown;
    try {
        payload = await req.json();
    } catch {
        return jsonResponse(
            { ok: false, error: "جسم الطلب ليس JSON صالحاً." },
            400,
            req,
        );
    }

    if (!payload || typeof payload !== "object") {
        return jsonResponse(
            { ok: false, error: "يتوقع كائن JSON في جسم الطلب." },
            400,
            req,
        );
    }

    const p = payload as Record<string, unknown>;
    const lawNameRaw = p.law_name;
    const articleRaw = p.article_number;
    const contentRaw = p.content;
    const skipEmbeddingRaw = p.skip_embedding;

    const law_name = typeof lawNameRaw === "string"
        ? lawNameRaw.trim()
        : "";
    const article_number = articleRaw === null || articleRaw === undefined
        ? ""
        : String(articleRaw).trim();
    const content = typeof contentRaw === "string" ? contentRaw.trim() : "";
    const skipEmbedding = skipEmbeddingRaw === true;

    if (!law_name) {
        return jsonResponse(
            { ok: false, error: "الحقل law_name مطلوب وغير فارغ." },
            400,
            req,
        );
    }
    if (!article_number) {
        return jsonResponse(
            { ok: false, error: "الحقل article_number مطلوب وغير فارغ." },
            400,
            req,
        );
    }
    if (!content) {
        return jsonResponse(
            { ok: false, error: "الحقل content مطلوب وغير فارغ." },
            400,
            req,
        );
    }

    let embedding: number[] | null = null;
    let modelUsed: string | null = null;
    let embeddingFallbackUsed = false;
    let embeddingWarning: string | null = null;
    if (!skipEmbedding) {
        try {
            const r = await fetchGeminiEmbedding(content, apiKey);
            embedding = r.values;
            modelUsed = r.modelUsed;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            embeddingFallbackUsed = true;
            embeddingWarning = `Fallback: تعذر توليد embedding للمادة ${article_number}: ${msg}`;
            // تحذير سيرفر فقط: لا نوقف مسار الحفظ.
            console.warn(embeddingWarning);
        }
    } else {
        embeddingFallbackUsed = true;
        embeddingWarning = `Skip embedding requested for article ${article_number}.`;
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const row: Record<string, unknown> = {
        law_name,
        article_number,
        content,
    };
    if (embedding && embedding.length > 0) {
        row.embedding = vectorLiteral(embedding);
    }

    const { data, error } = await supabase
        .from("iraqi_laws")
        .insert(row)
        .select("id, law_name, article_number")
        .single();

    if (error) {
        return jsonResponse(
            {
                ok: false,
                error: "فشل حفظ السجل في قاعدة البيانات.",
                details: error.message,
            },
            500,
            req,
        );
    }

    return jsonResponse(
        {
            ok: true,
            message: embeddingFallbackUsed
                ? "تم حفظ المادة بنجاح (مع الاحتفاظ بالنصوص محلياً)."
                : "تم حفظ المادة والتضمين بنجاح.",
            embedding_model: modelUsed,
            embedding_dimensions: embedding ? EMBEDDING_DIM : 0,
            embedding_fallback_used: embeddingFallbackUsed,
            embedding_warning: embeddingWarning,
            record: data,
        },
        200,
        req,
    );
});
