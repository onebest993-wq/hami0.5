import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeadersFor(req) });
    }
    if (req.method !== "POST") {
        return jsonResponse({ ok: false, error: "Method not allowed" }, 405, req);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!supabaseUrl || !serviceKey) {
        return jsonResponse(
            {
                ok: false,
                error: "إعداد الخادم ناقص: SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY.",
            },
            500,
            req,
        );
    }

    try {
        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { count, error: countError } = await supabase
            .from("iraqi_laws")
            .select("id", { count: "exact", head: true });
        if (countError) throw new Error(countError.message);

        const { error: deleteError } = await supabase
            .from("iraqi_laws")
            .delete()
            .neq("id", 0);
        if (deleteError) throw new Error(deleteError.message);

        return jsonResponse(
            {
                ok: true,
                message: "تم تنظيف قاعدة البيانات القانونية بنجاح.",
                deletedCount: count ?? 0,
            },
            200,
            req,
        );
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonResponse({ ok: false, error: msg }, 200, req);
    }
});
