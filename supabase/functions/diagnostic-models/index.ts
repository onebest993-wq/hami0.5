/**
 * Edge Function: diagnostic-models
 * Returns Gemini models that support `embedContent` for current server key.
 */
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
              ].join(", ");

    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": allowHeaders,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

type ListedModel = {
    name?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
};

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeadersFor(req) });
    }

    if (req.method !== "GET" && req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405, req);
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        return jsonResponse(
            {
                error: "GEMINI_API_KEY غير مضبوط في أسرار المشروع.",
            },
            500,
            req,
        );
    }

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models?key=${
            encodeURIComponent(apiKey)
        }`;

    let res: Response;
    try {
        res = await fetch(url, { method: "GET" });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonResponse(
            { error: `فشل الاتصال بـ Gemini API: ${msg}` },
            502,
            req,
        );
    }

    const rawJson: unknown = await res.json().catch(() => null);
    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        if (rawJson && typeof rawJson === "object") {
            const err = (rawJson as { error?: { message?: string } }).error;
            if (err?.message) message = err.message;
        }
        return jsonResponse(
            {
                error: message,
                upstream: rawJson,
            },
            200,
            req,
        );
    }

    const models = rawJson && typeof rawJson === "object" &&
            Array.isArray((rawJson as { models?: unknown[] }).models)
        ? (rawJson as { models: ListedModel[] }).models
        : [];

    const embeddingModels = models
        .filter((m) => Array.isArray(m.supportedGenerationMethods))
        .filter((m) =>
            (m.supportedGenerationMethods as string[]).includes("embedContent")
        )
        .map((m) => ({
            name: m.name ?? null,
            displayName: m.displayName ?? null,
            supportedGenerationMethods: m.supportedGenerationMethods ?? [],
        }));

    return jsonResponse(
        {
            totalModels: models.length,
            embeddingModelCount: embeddingModels.length,
            embeddingModels,
        },
        200,
        req,
    );
});
