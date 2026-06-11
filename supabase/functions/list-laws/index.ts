import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_IRAQI_LAW_NAMES = [
    "قانون التنفيذ العراقي رقم 45 لسنة 1980",
    "قانون العقوبات العراقي رقم 111 لسنة 1969",
    "قانون أصول المحاكمات الجزائية العراقي رقم 23 لسنة 1971",
    "قانون رعاية الأحداث العراقي رقم 76 لسنة 1983",
] as const;

function corsHeadersFor(req: Request): Record<string, string> {
    const requested = req.headers.get("access-control-request-headers");
    const allowHeaders = requested && requested.trim().length > 0
        ? requested
        : ["authorization", "x-client-info", "apikey", "content-type"].join(", ");
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

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeadersFor(req) });
    }
    if (req.method !== "POST") {
        return jsonResponse({ ok: false, error: "Use POST." }, 405, req);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
        return jsonResponse({ ok: false, error: "Supabase env missing." }, 500, req);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    let lawNameFilter: string | null = null;
    try {
        const body = await req.json() as { law_name?: unknown };
        const raw = String(body?.law_name ?? "").trim();
        if (raw.length > 0) {
            if (!ALLOWED_IRAQI_LAW_NAMES.includes(raw as typeof ALLOWED_IRAQI_LAW_NAMES[number])) {
                return jsonResponse(
                    { ok: false, error: "Law name is not in the allowed catalog." },
                    400,
                    req,
                );
            }
            lawNameFilter = raw;
        }
    } catch {
        /* body فارغ — جلب القوانين المسموح بها فقط */
    }

    let query = supabase
        .from("iraqi_laws")
        .select("id, law_name, article_number, content");
    if (lawNameFilter) {
        query = query.eq("law_name", lawNameFilter);
    } else {
        query = query.in("law_name", [...ALLOWED_IRAQI_LAW_NAMES]);
    }
    const { data, error } = await query
        .order("law_name", { ascending: true })
        .order("article_number", { ascending: true });

    if (error) {
        return jsonResponse(
            { ok: false, error: "Failed to fetch laws.", details: error.message },
            500,
            req,
        );
    }

    return jsonResponse({ ok: true, items: Array.isArray(data) ? data : [] }, 200, req);
});

