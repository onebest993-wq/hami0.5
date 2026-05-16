/**
 * Edge Function: gemini-chat (RAG)
 * Embedding -> Vector Search RPC -> Inject legal context -> Gemini Generation.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const GEMINI_GEN_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBEDDING_DIM = 768;
const MATCH_THRESHOLD = 0.3;
const MATCH_COUNT = 5;
const EMBEDDING_MODEL = "models/gemini-embedding-001";
const OPENROUTER_MODELS = [
    "qwen/qwen3.6-plus-preview:free",
    "z-ai/glm-4.5-air:free",
    "stepfun/step-3.5-flash:free",
] as const;

const SEARCH_RPC_CANDIDATES = ["match_documents", "match_laws"] as const;

type GeminiContent = {
    role: "user" | "model";
    parts: { text: string }[];
};

type LawRow = {
    id?: string;
    law_name?: string;
    article_number?: string;
    content?: string;
    title?: string;
    text?: string;
    chunk?: string;
    similarity?: number;
    hybrid_score?: number;
};

type RetrievedChunk = {
    law_name: string | null;
    article_number: string | null;
    content: string;
    similarity: number | null;
    hybrid_score: number | null;
};

function normalizeKeyPart(value: string | null | undefined): string {
    return normalizeArabicDigits(value ?? "")
        .replace(/[إأآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[^\p{L}\p{N}]+/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function dedupeRetrievedChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
    const seen = new Set<string>();
    const seenByArticleContent = new Set<string>();
    const out: RetrievedChunk[] = [];
    for (const chunk of chunks) {
        const lawKey = normalizeKeyPart(chunk.law_name);
        const articleKey = normalizeKeyPart(chunk.article_number);
        const contentKey = normalizeKeyPart(chunk.content);
        const key = `${lawKey}-${articleKey}`;
        const fallbackKey = `${articleKey}-${contentKey}`;
        if (seen.has(key) || seenByArticleContent.has(fallbackKey)) continue;
        seen.add(key);
        seenByArticleContent.add(fallbackKey);
        out.push(chunk);
    }
    return out;
}

function hasArticleInChunks(chunks: RetrievedChunk[], articleNumber: string): boolean {
    const target = articleNumber.trim();
    if (!target) return false;
    for (const chunk of chunks) {
        const article = normalizeArabicDigits(chunk.article_number ?? "");
        const content = normalizeArabicDigits(chunk.content ?? "");
        if (article.includes(target)) return true;
        if (new RegExp(`(?:الماده|ماده|المادة|مادة)\\s*${target}\\b`, "i").test(content)) {
            return true;
        }
    }
    return false;
}

function friendlyFinalError(lastFailure: string): string {
    if (
        /429|quota exceeded|Quota exceeded|Too Many Requests|generate_content_free_tier|RESOURCE_EXHAUSTED/i
            .test(lastFailure)
    ) {
        return "حصة الطلبات المجانية لـ Gemini غير متاحة مؤقتاً لهذا المفتاح (حد الطلبات أو الرموز). انتظر دقيقة ثم أعد المحاولة، أو راجع الحصص والفوترة في Google AI Studio (aistudio.google.com).";
    }
    return lastFailure;
}

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
    return Deno.env.get("GEMINI_API_KEY")?.trim() ||
        Deno.env.get("GOOGLE_API_KEY")?.trim();
}

function extractPrompt(body: Record<string, unknown>): string {
    const promptRaw = body.prompt;
    if (typeof promptRaw === "string" && promptRaw.trim()) return promptRaw.trim();
    const messages = body.messages;
    if (Array.isArray(messages)) {
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (!msg || typeof msg !== "object" || Array.isArray(msg)) continue;
            const o = msg as Record<string, unknown>;
            const role = typeof o.role === "string" ? o.role : "";
            const content = typeof o.content === "string" ? o.content.trim() : "";
            if (role === "user" && content) return content;
        }
    }
    return "";
}

function buildAugmentedSearchQuery(
    body: Record<string, unknown>,
    prompt: string,
): string {
    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) return prompt;
    const userHistory: string[] = [];
    for (const msg of messages) {
        if (!msg || typeof msg !== "object" || Array.isArray(msg)) continue;
        const o = msg as Record<string, unknown>;
        const role = typeof o.role === "string" ? o.role : "";
        const content = typeof o.content === "string" ? o.content.trim() : "";
        if (role !== "user" || !content) continue;
        userHistory.push(content);
    }
    if (userHistory.length === 0) return prompt;
    const latest = userHistory[userHistory.length - 1] ?? "";
    const prev = userHistory[userHistory.length - 2] ?? "";
    const parts = latest === prompt
        ? [prev, latest]
        : [latest, prompt];
    const merged = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    return merged || prompt;
}

function buildContextString(retrievedChunks: RetrievedChunk[]): string {
    if (!retrievedChunks.length) return "لا توجد نصوص قانونية مسترجعة.";
    return retrievedChunks.map((chunk, idx) => {
        const law = chunk.law_name || "قانون غير محدد";
        const article = chunk.article_number || "مادة غير محددة";
        return `[${idx + 1}] اسم القانون: ${law}\nرقم المادة: ${article}\nالنص: ${chunk.content}`;
    }).join("\n\n---\n\n");
}

function buildFinalPrompt(): string {
    return `أنت "حامي"، مستشار قانوني عراقي فخم.
تم تزويدك بـ "حقيبة نصوص قانونية" (Context).
يجب عليك الإجابة حصراً بناءً على هذه النصوص.
إذا سألك المستخدم عن مادة (مثل المادة 5)، ابحث عنها داخل الحقيبة واقتبسها حرفياً.
لا تعتذر أبداً إلا إذا كانت المادة غير موجودة فعلياً في النص المرفق.`;
}

function buildInjectedUserMessage(userQuery: string, contextText: string): string {
    return `رسالة المستخدم: ${userQuery}

--- النصوص القانونية المتوفرة (حقيبتك): ---
${contextText}`;
}

function normalizeArabicDigits(input: string): string {
    return input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function normalizeArabicArticleNumber(query: string): string {
    if (!query.trim()) return query;
    let out = normalizeArabicDigits(query);
    const replacements: Array<[RegExp, string]> = [
        [/(?<![\p{L}\p{N}_])(أول|اول|أولا|اولا|الأولى|الاولى|الأول|الاول|اولى)(?![\p{L}\p{N}_])/giu, "1"],
        [/(?<![\p{L}\p{N}_])(ثاني|ثانيا|الثاني|الثانية|ثانيه)(?![\p{L}\p{N}_])/giu, "2"],
        [/(?<![\p{L}\p{N}_])(ثالث|ثالثا|الثالث|الثالثة|ثالثه)(?![\p{L}\p{N}_])/giu, "3"],
        [/(?<![\p{L}\p{N}_])(رابع|رابعا|الرابع|الرابعة|رابعه)(?![\p{L}\p{N}_])/giu, "4"],
        [/(?<![\p{L}\p{N}_])(خامس|خامسا|الخامس|الخامسة|خامسه)(?![\p{L}\p{N}_])/giu, "5"],
        [/(?<![\p{L}\p{N}_])(سادس|سادسا|السادس|السادسة|سادسه)(?![\p{L}\p{N}_])/giu, "6"],
        [/(?<![\p{L}\p{N}_])(سابع|سابعا|السابع|السابعة|سابعه)(?![\p{L}\p{N}_])/giu, "7"],
        [/(?<![\p{L}\p{N}_])(ثامن|ثامنا|الثامن|الثامنة|ثامنه)(?![\p{L}\p{N}_])/giu, "8"],
        [/(?<![\p{L}\p{N}_])(تاسع|تاسعا|التاسع|التاسعة|تاسعه)(?![\p{L}\p{N}_])/giu, "9"],
        [/(?<![\p{L}\p{N}_])(عاشر|عاشرا|العاشر|العاشرة|عاشره)(?![\p{L}\p{N}_])/giu, "10"],
    ];
    for (const [pattern, value] of replacements) {
        out = out.replace(pattern, value);
    }
    return out.replace(/\s+/g, " ").trim();
}

function normalizeArabicText(input: string): string {
    return normalizeArabicDigits(input)
        .replace(/[إأآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenizeArabic(input: string): string[] {
    return normalizeArabicText(input)
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
}

function buildSearchQueries(queryText: string): string[] {
    const raw = queryText.trim();
    if (!raw) return [""];
    const stop = new Set([
        "العراقي",
        "عراقي",
        "قانون",
        "القانون",
        "التنفيذ",
        "المدني",
        "الجزائي",
        "ماهي",
        "ما",
        "هي",
        "هل",
        "كم",
        "ماهو",
        "ماهوه",
    ]);
    const tokens = tokenizeArabic(raw);
    const relaxedTokens = tokens.filter((t) => !stop.has(t));
    const relaxed = relaxedTokens.join(" ").trim();
    const out = [raw];
    if (relaxed && relaxed !== raw) out.push(relaxed);
    return out;
}

function extractRequestedArticleNumber(text: string): string | null {
    const normalized = normalizeArabicDigits(text);
    const m = normalized.match(/(?:الماده|ماده|المادة|مادة)\s*(\d{1,4})/i);
    return m?.[1] ?? null;
}

function extractGeminiErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== "object") return null;
    const root = data as Record<string, unknown>;
    const err = root.error as Record<string, unknown> | undefined;
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

function vectorLiteral(values: number[]): string {
    return `[${values.join(",")}]`;
}

async function fetchEmbedding(prompt: string, apiKey: string): Promise<number[]> {
    const modelId = "gemini-embedding-001";
    const url =
        `${GEMINI_EMBED_BASE}/${modelId}:embedContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
        model: EMBEDDING_MODEL,
        content: { parts: [{ text: prompt }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: EMBEDDING_DIM,
    };
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(
            `${modelId}: ${extractGeminiErrorMessage(json) ?? `HTTP ${res.status}`}`,
        );
    }
    const values = extractEmbeddingValues(json);
    if (values.length !== EMBEDDING_DIM) {
        throw new Error(
            `${modelId}: بعد التضمين ${values.length} وليس ${EMBEDDING_DIM}`,
        );
    }
    return values;
}

async function retrieveLegalContext(
    supabase: SupabaseClient,
    queryEmbedding: number[],
    queryText: string,
): Promise<{ rows: LawRow[]; rpcUsed: string }> {
    const queryVariants = buildSearchQueries(queryText);
    let hybridLastError = "";
    for (const q of queryVariants) {
        const hybridPayload = {
            query_embedding: vectorLiteral(queryEmbedding),
            query_text: q,
            match_threshold: MATCH_THRESHOLD,
            match_count: MATCH_COUNT,
        };
        const { data: hybridData, error: hybridError } = await supabase.rpc(
            "hybrid_search_laws",
            hybridPayload,
        );
        if (hybridError) {
            hybridLastError = hybridError.message;
            continue;
        }
        const rows = Array.isArray(hybridData) ? (hybridData as LawRow[]) : [];
        if (rows.length > 0 || q === queryVariants[queryVariants.length - 1]) {
            return {
                rows,
                rpcUsed: q === queryText
                    ? "hybrid_search_laws"
                    : "hybrid_search_laws:relaxed_query",
            };
        }
    }

    const fallbackPayload = {
        query_embedding: vectorLiteral(queryEmbedding),
        match_threshold: MATCH_THRESHOLD,
        match_count: MATCH_COUNT,
    };
    let lastErr = `hybrid_search_laws: ${hybridLastError || "no rows returned"}`;
    for (const rpcName of SEARCH_RPC_CANDIDATES) {
        const { data, error } = await supabase.rpc(rpcName, fallbackPayload);
        if (error) {
            lastErr = `${lastErr} | ${rpcName}: ${error.message}`;
            continue;
        }
        return {
            rows: Array.isArray(data) ? (data as LawRow[]) : [],
            rpcUsed: rpcName,
        };
    }
    throw new Error(lastErr || "فشل البحث الهجين/المتجهي في قاعدة البيانات");
}

function contextFromRows(rows: LawRow[]): string {
    if (!rows.length) {
        return "لا توجد مواد مسترجعة من قاعدة البيانات لهذه الصيغة.";
    }
    return rows.map((row, idx) => {
        const lawName = row.law_name || row.title || `مادة مسترجعة ${idx + 1}`;
        const article = row.article_number || "غير محدد";
        const text = row.content || row.chunk || row.text || "";
        return `- [${idx + 1}] القانون: ${lawName}\n  المادة: ${article}\n  النص: ${text}`;
    }).join("\n\n");
}

function buildEmergencyFallbackText(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
        return "تم استرجاع النصوص القانونية بنجاح، ولكن الشرح الذكي غير متاح مؤقتاً. لم يتم العثور على مواد مطابقة بشكل واضح لهذا السؤال حالياً.";
    }
    const displayChunks = chunks.length > 0 ? [chunks[0]] : [];
    const lines = displayChunks.map((chunk, idx) => {
        const law = chunk.law_name || "قانون غير محدد";
        const article = chunk.article_number || "مادة غير محددة";
        const content = (chunk.content || "").trim();
        return `${idx + 1}) ${law} — ${article}\n${content}`;
    });
    return `تم استرجاع النصوص القانونية بنجاح، ولكن الشرح الذكي غير متاح مؤقتاً. إليك المواد المباشرة:\n\n${lines.join("\n\n")}`;
}

function extractGeneratedText(data: unknown): string | null {
    if (!data || typeof data !== "object") return null;
    const root = data as Record<string, unknown>;
    const candidates = root.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    const first = candidates[0] as Record<string, unknown>;
    const content = first.content as Record<string, unknown> | undefined;
    const parts = content?.parts;
    if (!Array.isArray(parts)) return null;
    const chunks: string[] = [];
    for (const p of parts) {
        if (!p || typeof p !== "object") continue;
        const t = (p as Record<string, unknown>).text;
        if (typeof t === "string" && t.trim()) chunks.push(t.trim());
    }
    const finalText = chunks.join("\n").trim();
    return finalText || null;
}

async function generateWithRag(
    openrouterApiKey: string,
    systemPrompt: string,
    injectedUserMessage: string,
): Promise<{ text: string; model: string }> {
    const failures: string[] = [];
    for (const modelId of OPENROUTER_MODELS) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openrouterApiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://hami-app.com",
                "X-Title": "Hami Legal AI",
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: injectedUserMessage },
                ],
                temperature: 0.3,
            }),
        });
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) {
            console.error("OpenRouter Error:", data);
            const msg = data && typeof data === "object" &&
                    "error" in data &&
                    typeof (data as Record<string, unknown>).error === "object"
                ? (((data as { error?: { message?: string } }).error?.message) ??
                    "Failed to fetch from OpenRouter")
                : "Failed to fetch from OpenRouter";
            failures.push(`${modelId}: ${msg}`);
            continue;
        }
        const aiReply = data && typeof data === "object" &&
                "choices" in data &&
                Array.isArray((data as Record<string, unknown>).choices) &&
                (data as Record<string, unknown>).choices.length > 0
            ? ((((data as { choices: Array<{ message?: { content?: string } }> })
                .choices[0]?.message?.content) ?? "") as string)
            : "";
        if (!aiReply.trim()) {
            failures.push(`${modelId}: لا يوجد مخرجات من OpenRouter.`);
            continue;
        }
        return { text: aiReply.trim(), model: modelId };
    }
    throw new Error(failures.join(" | ") || "فشل كل الموديلات المجانية المتاحة مؤقتاً.");
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeadersFor(req) });
    }
    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405, req);
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        return jsonResponse(
            { error: "إعداد الخادم ناقص: لم يُعيَّن GEMINI_API_KEY في الأسرار." },
            500,
            req,
        );
    }
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY")?.trim();
    if (!openrouterApiKey) {
        return jsonResponse(
            { error: "Missing OPENROUTER_API_KEY" },
            500,
            req,
        );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!supabaseUrl || !serviceKey) {
        return jsonResponse(
            { error: "إعداد الخادم ناقص: SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY." },
            500,
            req,
        );
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "جسم الطلب ليس JSON صالحاً" }, 400, req);
    }
    if (!body || typeof body !== "object") {
        return jsonResponse({ error: "جسم الطلب غير صالح" }, 400, req);
    }
    const bodyObj = body as Record<string, unknown>;
    const prompt = extractPrompt(bodyObj);
    if (!prompt) {
        return jsonResponse(
            { error: "أرسل prompt أو آخر رسالة user ضمن messages." },
            400,
            req,
        );
    }

    try {
        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const augmentedQuery = buildAugmentedSearchQuery(bodyObj, prompt);
        const normalizedQueryForDB = normalizeArabicArticleNumber(augmentedQuery);
        const queryEmbedding = await fetchEmbedding(prompt, apiKey);
        const { rows, rpcUsed } = await retrieveLegalContext(
            supabase,
            queryEmbedding,
            normalizedQueryForDB,
        );
        const retrievedChunksRaw: RetrievedChunk[] = rows.map((row) => ({
            law_name: row.law_name ?? row.title ?? null,
            article_number: row.article_number ?? null,
            content: row.content ?? row.chunk ?? row.text ?? "",
            similarity: row.similarity ?? null,
            hybrid_score: typeof row.hybrid_score === "number" ? row.hybrid_score : null,
        }));
        const retrievedChunks = dedupeRetrievedChunks(retrievedChunksRaw);
        console.log("Retrieved Context: ", retrievedChunks);
        const contextText = buildContextString(retrievedChunks);
        console.log("Retrieved Laws:", contextText);
        const systemPrompt = buildFinalPrompt();
        const injectedUserMessage = buildInjectedUserMessage(augmentedQuery, contextText);

        let result: { text: string; model: string };
        try {
            result = await generateWithRag(
                openrouterApiKey,
                systemPrompt,
                injectedUserMessage,
            );
        } catch (llmError) {
            const fallbackText = buildEmergencyFallbackText(retrievedChunks);
            const llmMsg = llmError instanceof Error
                ? llmError.message
                : String(llmError);
            return jsonResponse(
                {
                    text: fallbackText,
                    model: "fallback-template",
                    isFallback: true,
                    rag: {
                        rpc: rpcUsed,
                        matchCount: retrievedChunks.length,
                        augmentedQuery: normalizedQueryForDB,
                        retrievedChunks,
                        fallbackReason: llmMsg,
                    },
                },
                200,
                req,
            );
        }

        return jsonResponse(
            {
                text: result.text,
                model: result.model,
                isFallback: false,
                rag: {
                    rpc: rpcUsed,
                    matchCount: retrievedChunks.length,
                    augmentedQuery: normalizedQueryForDB,
                    retrievedChunks,
                },
            },
            200,
            req,
        );
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // 200 حتى يصل جسم { error } للعميل عبر invoke
        return jsonResponse({ error: msg }, 200, req);
    }
});