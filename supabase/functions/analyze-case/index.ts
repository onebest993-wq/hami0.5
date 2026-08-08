/**
 * Edge Function: analyze-case (RAG + تحليل قضائي)
 * استرجاع من iraqi_laws عبر match_laws ثم توليد JSON عبر Gemini (حامي) مع تاريخ محادثة اختياري.
 *
 * أسرار: GEMINI_API_KEY (أو GOOGLE_API_KEY)، SUPABASE_URL، SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const GEMINI_MODELS_BASE =
    "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBEDDING_MODEL = "models/gemini-embedding-001";
const OPENROUTER_MODELS = [
    "qwen/qwen3.6-plus-preview:free",
    "z-ai/glm-4.5-air:free",
    "stepfun/step-3.5-flash:free",
] as const;

const EMBEDDING_DIM = 768;

type MatchedLawRow = {
    id?: string;
    law_name?: string;
    article_number?: string;
    content?: string;
    title?: string;
    chunk?: string;
    text?: string;
    similarity?: number;
    hybrid_score?: number;
};

type GeminiContent = {
    role: "user" | "model";
    parts: { text: string }[];
};

type RetrievedChunk = {
    law_name: string | null;
    article_number: string | null;
    content: string;
    similarity: number | null;
    hybrid_score: number | null;
    id: string | null;
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

function modelGenerateUrl(modelId: string, apiKey: string): string {
    return `${GEMINI_MODELS_BASE}/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function isRetryableWithOtherModel(msg: string): boolean {
    return /not found|not supported|404\b|429|Too Many Requests|quota exceeded|Quota exceeded|RESOURCE_EXHAUSTED|generate_content_free_tier|limit:\s*0\b|rate limit|exceeded your current quota/i
        .test(msg);
}

function friendlyFinalError(lastFailure: string): string {
    if (
        /429|quota exceeded|Quota exceeded|Too Many Requests|generate_content_free_tier|RESOURCE_EXHAUSTED|exceeded your current quota|rate limit/i
            .test(lastFailure)
    ) {
        return "حصة الطلبات المجانية لـ Gemini غير متاحة مؤقتاً لهذا المفتاح (حد الطلبات أو الرموز). انتظر دقيقة ثم أعد المحاولة، أو جرّب تفعيل الفوترة في Google AI Studio (aistudio.google.com) / Google Cloud، أو أنشئ مفتاح API جديداً لمشروع آخر.";
    }
    return lastFailure;
}

function buildSystemPrompt(contextText: string): string {
    return `أنت "حامي"، مستشار قانوني عراقي يمتلك قدرات عقلية وتحليلية خارقة (مهارات Gemini).
قاعدتك الذهبية: ذكاؤك حر، ولكن مصادرك مقيدة. المادة العلمية الوحيدة المسموح لك باستخراج النصوص والأرقام منها هي هذا السياق فقط: ${contextText}.

خطوات عملك (وصفة الطبخ):

1) المكونات الأساسية (لا مجال للتأليف):
عندما يسألك المستخدم عن مسألة، ابحث في السياق المرفق. إذا وجدت النص أو القرار التمييزي، اقتبسه حرفياً. يُمنع منعاً باتاً اختراع مادة قانونية أو قرار غير موجود في السياق.

2) التوابل والمهارة (الذكاء والتحليل):
بعد اقتباس المادة، استخدم ذكاءك الخارق لشرحها بأسلوب المحامي المتمرس. فكك طلاسمها، اربطها بالواقع العملي العراقي، استنتج منها الحلول، وقدم للمستخدم نصيحة استراتيجية مبنية على هذا النص.

3) الشفافية التامة:
إذا كان سؤال المستخدم خارج نطاق السياق المرفق، استخدم لباقتك للإجابة قائلاً:
"المواد المتوفرة في حقيبتي حالياً لا تغطي هذا النص صراحةً، ولكن بالاستناد إلى القواعد العامة..."
ثم أكمل بذكاء.

يجب أن يكون الرد بصيغة JSON نظيفة حصراً (بدون علامات markdown):
{
  "title": "عنوان الدعوى",
  "category": "التصنيف",
  "reply": "التكييف القانوني والإجراء المبني على النصوص المسترجعة فقط.",
  "summary": ["نقطة 1", "نقطة 2"],
  "actions": [{"id": "action1", "label": "اقتراح لسؤال قادم"}],
  "isDocument": false
}`;
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

async function fetchGeminiEmbedding(
    text: string,
    apiKey: string,
): Promise<number[]> {
    const modelId = "gemini-embedding-001";
    const url =
        `${GEMINI_EMBED_BASE}/${modelId}:embedContent?key=${
            encodeURIComponent(apiKey)
        }`;
    const body: Record<string, unknown> = {
        model: EMBEDDING_MODEL,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: EMBEDDING_DIM,
    };
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(
            `${modelId}: ${
                extractGeminiErrorMessage(data) ?? `HTTP ${res.status}`
            }`,
        );
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
    return values;
}

/** تنسيق المتجه لـ PostgREST / rpc (نفس generatedVector كنص vector) */
function vectorLiteral(values: number[]): string {
    return `[${values.join(",")}]`;
}

/** آخر رسالة user من body (للتضمين والاستعلام) */
function extractLastUserMessage(body: Record<string, unknown>): string {
    const messages = body.messages;
    if (Array.isArray(messages)) {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (!m || typeof m !== "object" || Array.isArray(m)) continue;
            const o = m as Record<string, unknown>;
            const role = typeof o.role === "string" ? o.role : "";
            const content = typeof o.content === "string" ? o.content : "";
            if (role === "user" && content.trim()) return content.trim();
        }
    }
    const story = body.story;
    return typeof story === "string" ? story.trim() : "";
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

/** تحويل messages إلى صيغة Gemini؛ وإلا قصة واحدة من story أو آخر سؤال */
function buildGeminiContents(
    body: Record<string, unknown>,
    fallbackText: string,
): GeminiContent[] {
    const messages = body.messages;
    if (Array.isArray(messages) && messages.length > 0) {
        const out: GeminiContent[] = [];
        for (const m of messages) {
            if (!m || typeof m !== "object" || Array.isArray(m)) continue;
            const o = m as Record<string, unknown>;
            const roleRaw = typeof o.role === "string" ? o.role : "";
            const content = typeof o.content === "string" ? o.content.trim() : "";
            if (!content) continue;
            if (roleRaw === "system") continue;
            let role: "user" | "model" | null = null;
            if (roleRaw === "user") role = "user";
            else if (roleRaw === "assistant" || roleRaw === "model") {
                role = "model";
            }
            if (!role) continue;
            out.push({ role, parts: [{ text: content }] });
        }
        if (out.length > 0) {
            if (out[0].role === "model") {
                out.unshift({
                    role: "user",
                    parts: [{
                        text: "تابع المحادثة وفق التعليمات النظامية أعلاه.",
                    }],
                });
            }
            return out;
        }
    }
    const story =
        typeof body.story === "string" && body.story.trim()
            ? body.story.trim()
            : fallbackText;
    return [{
        role: "user",
        parts: [{ text: `قصة الموكل / وقائع الدعوى:\n\n${story}` }],
    }];
}

function buildContextText(chunks: RetrievedChunk[]): string {
    if (!chunks.length) {
        return "لم يتم العثور على مواد قانونية مطابقة في مكتبة iraqi_laws ضمن عتبة التشابه الحالية (لا يوجد نص تشريعي مسترجع للاعتماد عليه).";
    }
    return chunks
        .map((r, idx) => {
            const lawName = r.law_name || `مادة مسترجعة ${idx + 1}`;
            const article = r.article_number || "غير محدد";
            const content = r.content || "";
            return `### [${idx + 1}] ${lawName} — رقم المادة: ${article}\n${content}`;
        })
        .join("\n\n---\n\n");
}

function buildFallbackReplyText(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
        return "تم استرجاع النصوص القانونية بنجاح، ولكن الشرح الذكي غير متاح مؤقتاً. لم يتم العثور على مواد مطابقة بشكل واضح لهذا السؤال حالياً.";
    }
    const displayChunks = chunks.length > 0 ? [chunks[0]] : [];
    const lines = displayChunks.map((chunk, idx) => {
        const law = chunk.law_name || "قانون غير محدد";
        const article = chunk.article_number || "مادة غير محددة";
        return `${idx + 1}) ${law} — ${article}\n${chunk.content}`;
    });
    return `تم استرجاع النصوص القانونية بنجاح، ولكن الشرح الذكي غير متاح مؤقتاً. إليك المواد المباشرة:\n\n${lines.join("\n\n")}`;
}

function extractTextFromGeminiPayload(data: unknown): string | null {
    if (!data || typeof data !== "object") return null;
    const root = data as Record<string, unknown>;
    const candidates = root.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    const first = candidates[0] as Record<string, unknown>;
    const content = first.content as Record<string, unknown> | undefined;
    const parts = content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) return null;
    const chunks: string[] = [];
    for (const part of parts) {
        if (!part || typeof part !== "object") continue;
        const t = (part as Record<string, unknown>).text;
        if (typeof t === "string" && t.length > 0) chunks.push(t);
    }
    const joined = chunks.join("").trim();
    return joined.length > 0 ? joined : null;
}

function stripJsonFences(raw: string): string {
    let t = raw.trim();
    if (t.startsWith("```")) {
        t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    }
    return t.trim();
}

function extractBalancedJsonObject(raw: string): string | null {
    const s = stripJsonFences(raw);
    try {
        JSON.parse(s);
        return s;
    } catch {
        /* continue */
    }
    const start = s.indexOf("{");
    if (start < 0) return null;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < s.length; i++) {
        const c = s[i];
        if (inStr) {
            if (esc) esc = false;
            else if (c === "\\") esc = true;
            else if (c === '"') inStr = false;
            continue;
        }
        if (c === '"') {
            inStr = true;
            continue;
        }
        if (c === "{") depth++;
        else if (c === "}") {
            depth--;
            if (depth === 0) {
                const slice = s.slice(start, i + 1);
                try {
                    JSON.parse(slice);
                    return slice;
                } catch {
                    return null;
                }
            }
        }
    }
    return null;
}

function summaryFromUnknown(value: unknown, replyFallback: string): string[] | null {
    const clip = (s: string, n: number) => {
        const t = s.trim();
        if (t.length <= n) return t;
        return `${t.slice(0, n)}…`;
    };
    if (value === undefined || value === null) {
        const s = replyFallback.trim();
        if (!s) return null;
        const sentences = s.split(/[.!?]\s+/u).map((x) => x.trim()).filter(Boolean);
        if (sentences.length >= 2) return [clip(sentences[0], 200), clip(sentences[1], 200)];
        return [clip(s, 180), "تأكد من المستندات والمواعيد والاختصاص قبل أي إيداع."];
    }
    if (typeof value === "string") {
        const parts = value
            .split(/\n|؛|•|\r/u)
            .map((x) => x.replace(/^\d+[\).\s-]+/u, "").trim())
            .filter(Boolean);
        if (parts.length >= 2) return parts.slice(0, 3);
        if (parts.length === 1) {
            return [parts[0], clip(replyFallback, 140) || "تابع الإجراء وفق المدة والاختصاص."];
        }
        return null;
    }
    if (Array.isArray(value)) {
        const items = value
            .map((x) => (typeof x === "string" ? x.trim() : ""))
            .filter((s) => s.length > 0);
        if (items.length === 0) return summaryFromUnknown(null, replyFallback);
        if (items.length === 1) {
            return [
                items[0],
                clip(replyFallback, 140) || "تحقق من المستندات والمواعيد الاستئنافية.",
            ];
        }
        return items.slice(0, 3);
    }
    return null;
}

type ParsedActionItem = { id: string; label: string };

function normalizeActionObjects(value: unknown): ParsedActionItem[] | null {
    if (!Array.isArray(value) || value.length < 1) return null;
    const out: ParsedActionItem[] = [];
    for (let i = 0; i < value.length && out.length < 8; i++) {
        const x = value[i];
        if (x && typeof x === "object" && !Array.isArray(x)) {
            const o = x as Record<string, unknown>;
            const idRaw = typeof o.id === "string" ? o.id.trim() : "";
            const label = typeof o.label === "string" ? o.label.trim() : "";
            if (!label) continue;
            const id = idRaw || `action_${out.length + 1}`;
            out.push({ id, label });
        } else if (typeof x === "string" && x.trim()) {
            out.push({ id: `action_${out.length + 1}`, label: x.trim() });
        }
    }
    return out.length >= 1 ? out : null;
}

function parseAnalysisJson(text: string): {
    title: string;
    category: string;
    reply: string;
    summary: string[];
    actions: ParsedActionItem[];
    isDocument: boolean;
} | null {
    const jsonSlice = extractBalancedJsonObject(text);
    if (!jsonSlice) return null;
    try {
        const parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
        const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
        const category = typeof parsed.category === "string" ? parsed.category.trim() : "";
        const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
        const summary = summaryFromUnknown(parsed.summary, reply);
        let actions = normalizeActionObjects(parsed.actions);
        const isDocument =
            typeof parsed.isDocument === "boolean" ? parsed.isDocument : false;
        if (!title || !category || !reply || !summary) return null;
        if (!actions?.length) {
            actions = [
                {
                    id: "verify_law_text",
                    label: "مراجعة النص في المصدر النافذ (وقائع/تشريع) قبل الإجراء",
                },
            ];
        }
        return { title, category, reply, summary, actions, isDocument };
    } catch {
        return null;
    }
}

async function callGeminiGenerate(
    openrouterApiKey: string,
    systemPrompt: string,
    augmentedQuery: string,
): Promise<
    | { ok: true; text: string; modelId: string }
    | { ok: false; error: string; modelId?: string }
> {
    const failures: string[] = [];
    for (const modelId of OPENROUTER_MODELS) {
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: augmentedQuery },
        ];

        let response: Response;
        try {
            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openrouterApiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://hami-app.com",
                    "X-Title": "Hami Legal AI",
                },
                body: JSON.stringify({
                    model: modelId,
                    messages,
                    temperature: 0.3,
                }),
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            failures.push(`${modelId}: فشل الاتصال بـ OpenRouter: ${msg}`);
            continue;
        }

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
        return { ok: true, text: aiReply.trim(), modelId };
    }
    return {
        ok: false,
        error: failures.join(" | ") || "فشل جميع نماذج OpenRouter المجانية.",
    };
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeadersFor(req) });
    }

    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405, req);
    }

    try {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            console.error("[analyze-case] GEMINI_API_KEY missing");
            return jsonResponse(
                {
                    error:
                        "إعداد الخادم ناقص: لم يُعيَّن GEMINI_API_KEY في أسرار المشروع.",
                },
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
            console.error("[analyze-case] Supabase env missing");
            return jsonResponse(
                {
                    error:
                        "إعداد الخادم ناقص: SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY.",
                },
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
        const queryText = extractLastUserMessage(bodyObj);
        const augmentedQuery = buildAugmentedSearchQuery(bodyObj, queryText);
        const normalizedQueryForDB = normalizeArabicArticleNumber(augmentedQuery);
        if (!queryText) {
            return jsonResponse(
                {
                    error:
                        "أرسل نصاً غير فارغ في الحقل story أو آخر رسالة user ضمن messages.",
                },
                400,
                req,
            );
        }

        const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        let generatedVector: number[];
        try {
            generatedVector = await fetchGeminiEmbedding(queryText, apiKey);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[analyze-case] embedding failed:", msg);
            return jsonResponse(
                { error: `فشل تضمين السؤال للبحث: ${msg}` },
                200,
                req,
            );
        }

        const queryVariants = buildSearchQueries(normalizedQueryForDB);
        const rpcCandidates = ["match_documents", "match_laws"] as const;
        let rows: MatchedLawRow[] = [];
        let rpcUsed: string | null = null;
        let lastRpcErr = "";

        for (const q of queryVariants) {
            const hybridPayload = {
                query_embedding: vectorLiteral(generatedVector),
                query_text: q,
                match_threshold: 0.3,
                match_count: 5,
            };
            const { data: hybridRows, error: hybridErr } = await supabase.rpc(
                "hybrid_search_laws",
                hybridPayload,
            );
            if (hybridErr) {
                lastRpcErr = `hybrid_search_laws: ${hybridErr.message}`;
                continue;
            }
            rows = Array.isArray(hybridRows) ? (hybridRows as MatchedLawRow[]) : [];
            rpcUsed = q === queryText
                ? "hybrid_search_laws"
                : "hybrid_search_laws:relaxed_query";
            if (rows.length > 0) break;
        }

        const fallbackPayload = {
            query_embedding: vectorLiteral(generatedVector),
            match_threshold: 0.3,
            match_count: 5,
        };
        if (!rpcUsed) {
            for (const rpcName of rpcCandidates) {
                const { data: matchRows, error: rpcError } = await supabase.rpc(
                    rpcName,
                    fallbackPayload,
                );
                if (rpcError) {
                    lastRpcErr = `${lastRpcErr} | ${rpcName}: ${rpcError.message}`;
                    continue;
                }
                rows = Array.isArray(matchRows)
                    ? (matchRows as MatchedLawRow[])
                    : [];
                rpcUsed = rpcName;
                break;
            }
        }
        if (!rpcUsed) {
            console.error("[analyze-case] vector RPC failed:", lastRpcErr);
            return jsonResponse(
                {
                    error:
                        `فشل البحث في المكتبة القانونية: ${lastRpcErr}. تأكد من وجود RPC match_documents أو match_laws.`,
                },
                200,
                req,
            );
        }
        const retrievedChunksRaw: RetrievedChunk[] = rows.map((r) => ({
            law_name: r.law_name ?? r.title ?? null,
            article_number: r.article_number ?? null,
            content: r.content ?? r.chunk ?? r.text ?? "",
            similarity: r.similarity ?? null,
            hybrid_score: typeof r.hybrid_score === "number" ? r.hybrid_score : null,
            id: typeof r.id === "string" ? r.id : r.id ? String(r.id) : null,
        }));
        const retrievedChunks = dedupeRetrievedChunks(retrievedChunksRaw);
        console.log("Retrieved Context: ", retrievedChunks);
        const contextText = buildContextText(retrievedChunks);
        const systemPrompt = buildSystemPrompt(contextText);

        const gen = await callGeminiGenerate(
            openrouterApiKey,
            systemPrompt,
            augmentedQuery,
        );
        if (!gen.ok) {
            return jsonResponse(
                {
                    title: "استجابة طوارئ",
                    category: "بحث تشريعي",
                    reply: buildFallbackReplyText(retrievedChunks),
                    summary: [
                        "تم تفعيل وضع الطوارئ وعرض النصوص المسترجعة مباشرة.",
                        "عند عودة خدمة التوليد سيعود التحليل القضائي التفصيلي.",
                    ],
                    actions: [
                        {
                            id: "retry_analysis",
                            label: "إعادة المحاولة بعد لحظات",
                        },
                    ],
                    isDocument: false,
                    isFallback: true,
                    rag: {
                        matchCount: retrievedChunks.length,
                        augmentedQuery: normalizedQueryForDB,
                        lawIds: retrievedChunks.map((r) => r.id).filter(Boolean),
                        rpc: rpcUsed,
                        fallbackReason: gen.error,
                    },
                },
                200,
                req,
            );
        }

        const analysis = parseAnalysisJson(gen.text);
        if (!analysis) {
            console.warn(
                `[analyze-case] model=${gen.modelId} JSON parse failed`,
            );
            return jsonResponse(
                {
                    error:
                        "تعذر تحليل الرد: الصيغة ليست JSON متوقعاً (title, category, reply, summary[], actions[{id,label}], isDocument).",
                    raw: gen.text.slice(0, 2000),
                },
                200,
                req,
            );
        }

        return jsonResponse(
            {
                title: analysis.title,
                category: analysis.category,
                reply: analysis.reply,
                summary: analysis.summary,
                actions: analysis.actions,
                isDocument: analysis.isDocument,
                isFallback: false,
                rag: {
                    matchCount: retrievedChunks.length,
                    augmentedQuery: normalizedQueryForDB,
                    lawIds: retrievedChunks.map((r) => r.id).filter(Boolean),
                    modelId: gen.modelId,
                    rpc: rpcUsed,
                },
            },
            200,
            req,
        );
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[analyze-case] unhandled:", e);
        return jsonResponse(
            { error: `خطأ داخلي غير متوقع: ${msg}` },
            500,
            req,
        );
    }
});
