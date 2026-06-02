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

function normalizeArabicDigits(input: string): string {
    return input
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function extractArticleSortNumber(articleNumber: string): number | null {
    const normalized = normalizeArabicDigits(String(articleNumber ?? "").trim());
    const m = normalized.match(/\d+/);
    if (!m) return null;
    const n = Number.parseInt(m[0], 10);
    return Number.isFinite(n) ? n : null;
}

function parseOptionalArticleBound(raw: unknown): number | null {
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return Math.trunc(raw);
    }
    if (typeof raw === "string" && raw.trim()) {
        const n = Number.parseInt(raw.trim(), 10);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

const DELETE_CHUNK_SIZE = 100;

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
        const payload = await req.json().catch(() => ({}));
        const lawName = typeof payload?.law_name === "string" ? payload.law_name.trim() : "";
        if (!lawName) {
            return jsonResponse(
                {
                    ok: false,
                    error: "law_name مطلوب لتحديد التبويب المستهدف للحذف.",
                },
                200,
                req,
            );
        }

        const articleFrom = parseOptionalArticleBound(payload?.article_from);
        const articleTo = parseOptionalArticleBound(payload?.article_to);
        const hasRange = articleFrom !== null || articleTo !== null;

        if (hasRange && (articleFrom === null || articleTo === null)) {
            return jsonResponse(
                {
                    ok: false,
                    error: "لحذف نطاق محدد، أرسل article_from و article_to معاً.",
                },
                200,
                req,
            );
        }

        if (hasRange && articleFrom! > articleTo!) {
            return jsonResponse(
                {
                    ok: false,
                    error: "article_from يجب أن يكون أصغر من أو يساوي article_to.",
                },
                200,
                req,
            );
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        if (!hasRange) {
            const { count, error: countError } = await supabase
                .from("iraqi_laws")
                .select("id", { count: "exact", head: true })
                .eq("law_name", lawName);
            if (countError) throw new Error(countError.message);

            const { error: deleteError } = await supabase
                .from("iraqi_laws")
                .delete()
                .eq("law_name", lawName);
            if (deleteError) throw new Error(deleteError.message);

            return jsonResponse(
                {
                    ok: true,
                    message: `تم تنظيف مواد (${lawName}) بنجاح.`,
                    deletedCount: count ?? 0,
                },
                200,
                req,
            );
        }

        const { data: rows, error: selectError } = await supabase
            .from("iraqi_laws")
            .select("id, article_number")
            .eq("law_name", lawName)
            .limit(10000);
        if (selectError) throw new Error(selectError.message);

        const idsToDelete = (rows ?? [])
            .filter((row) => {
                const n = extractArticleSortNumber(String(row.article_number ?? ""));
                return n !== null && n >= articleFrom! && n <= articleTo!;
            })
            .map((row) => String(row.id));

        if (idsToDelete.length === 0) {
            return jsonResponse(
                {
                    ok: true,
                    message: `لا توجد مواد ضمن النطاق ${articleFrom}–${articleTo} في (${lawName}).`,
                    deletedCount: 0,
                    article_from: articleFrom,
                    article_to: articleTo,
                },
                200,
                req,
            );
        }

        for (let i = 0; i < idsToDelete.length; i += DELETE_CHUNK_SIZE) {
            const chunk = idsToDelete.slice(i, i + DELETE_CHUNK_SIZE);
            const { error: deleteError } = await supabase
                .from("iraqi_laws")
                .delete()
                .in("id", chunk);
            if (deleteError) throw new Error(deleteError.message);
        }

        return jsonResponse(
            {
                ok: true,
                message: `تم حذف ${idsToDelete.length} مادة (من ${articleFrom} إلى ${articleTo}) من (${lawName}).`,
                deletedCount: idsToDelete.length,
                article_from: articleFrom,
                article_to: articleTo,
            },
            200,
            req,
        );
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonResponse({ ok: false, error: msg }, 200, req);
    }
});
