/**
 * Edge Function: spark-text-audit
 * تدقيق شكلي للنصوص المحفوظة — بدون استنتاج قانوني.
 * أسرار: GEMINI_API_KEY (أو GOOGLE_API_KEY)
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

function parseAuditJson(raw: string): {
    present: string[];
    missing: string[];
    summary: string;
} | null {
    const trimmed = raw.trim();
    const jsonBlock = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonBlock) return null;
    try {
        const parsed = JSON.parse(jsonBlock[0]) as Record<string, unknown>;
        const present = Array.isArray(parsed.present)
            ? parsed.present.map(String).filter(Boolean)
            : [];
        const missing = Array.isArray(parsed.missing)
            ? parsed.missing.map(String).filter(Boolean)
            : [];
        const summary = String(parsed.summary ?? "").trim();
        if (!summary && !missing.length) return null;
        return { present, missing, summary };
    } catch {
        return null;
    }
}

async function generateAudit(
    apiKey: string,
    prompt: string,
): Promise<{ text: string } | { error: string }> {
    const url = `${GEMINI_GEN_BASE}/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 512,
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text.trim()) return { error: "empty model response" };
    return { text };
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

    const text = String(body.text ?? "").trim();
    const fieldType = String(body.fieldType ?? "note");
    const caseNo = String(body.caseNo ?? "").trim();
    const court = String(body.court ?? "").trim();

    if (text.length < 12) {
        return jsonResponse({ error: "text too short" }, 400, req);
    }

    const prompt = `أنت مساعد شكلي لمحامٍ عراقي. مهمتك فقط فحص اكتمال العناصر الإجرائية الظاهرة في النص.
ممنوع: تقديم رأي قانوني، تفسير مواد، أو اقتراح نتيجة للدعوى.
أجب بـ JSON فقط بالشكل:
{"present":["..."],"missing":["..."],"summary":"جملة هادئة واحدة بالعربية"}

نوع الحقل: ${fieldType}
رقم القضية المرجعي (إن وُجد): ${caseNo || "غير متوفر"}
المحكمة المرجعية (إن وُجدت): ${court || "غير متوفرة"}

ابحث فقط عن ذكر صريح أو غياب واضح لـ:
- أسماء الأطراف أو صفتهم
- رقم القضية أو المحكمة (إن كان النص دعوى/طلباً)
- تاريخ أو موعد إن كان النص يتعلق بإجراء زمني
- موضوع الطلب بشكل محدد

النص:
"""
${text.slice(0, 12000)}
"""`;

    const gen = await generateAudit(apiKey, prompt);
    if ("error" in gen) {
        return jsonResponse({ error: gen.error }, 502, req);
    }

    const audit = parseAuditJson(gen.text);
    if (!audit) {
        return jsonResponse({ error: "parse failed", raw: gen.text.slice(0, 500) }, 200, req);
    }

    return jsonResponse(audit, 200, req);
});
