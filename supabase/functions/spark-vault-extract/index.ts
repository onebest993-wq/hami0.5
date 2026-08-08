/**
 * Edge Function: spark-vault-extract
 * استخراج نص من صور المرفقات — OCR بصري عبر Gemini (بدون رأي قانوني).
 */
const GEMINI_GEN_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL_ID = "gemini-2.0-flash";

function corsHeaders(req: Request): Record<string, string> {
    const requested = req.headers.get("access-control-request-headers");
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
            requested && requested.trim().length > 0
                ? requested
                : "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
}

function jsonResponse(body: unknown, status: number, req: Request): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
}

async function extractFromImage(
    apiKey: string,
    mimeType: string,
    base64Data: string,
    maxChars: number,
): Promise<{ text: string; summary: string } | { error: string }> {
    const url = `${GEMINI_GEN_BASE}/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const prompt =
        "استخرج النص العربي/الإنجليزي الظاهر في هذه الصورة كما هو. لا تفسّر ولا تقدّم رأياً قانونياً. أجب بـ JSON فقط: {\"text\":\"...\",\"summary\":\"جملة قصيرة عن نوع المستند\"}";

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType || "image/jpeg",
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: "application/json",
            },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        return { error: `Gemini ${res.status}: ${errText.slice(0, 400)}` };
    }

    const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonBlock = raw.trim().match(/\{[\s\S]*\}/);
    if (!jsonBlock) return { error: "parse failed" };
    try {
        const parsed = JSON.parse(jsonBlock[0]) as Record<string, unknown>;
        const text = String(parsed.text ?? "").trim().slice(0, maxChars);
        const summary = String(parsed.summary ?? "").trim();
        if (!text) return { error: "empty text" };
        return { text, summary };
    } catch {
        return { error: "parse failed" };
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(req) });
    }
    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405, req);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY") ?? "";
    if (!apiKey) {
        return jsonResponse({ error: "GEMINI_API_KEY not configured" }, 503, req);
    }

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, req);
    }

    const base64Data = String(body.base64Data ?? "").trim();
    const mimeType = String(body.mimeType ?? "image/jpeg");
    const maxChars = Math.min(12_000, Math.max(500, Number(body.maxChars ?? 12_000)));

    if (base64Data.length < 32) {
        return jsonResponse({ error: "base64Data too short" }, 400, req);
    }

    const result = await extractFromImage(apiKey, mimeType, base64Data, maxChars);
    if ("error" in result) {
        return jsonResponse({ error: result.error }, 502, req);
    }

    return jsonResponse(result, 200, req);
});
