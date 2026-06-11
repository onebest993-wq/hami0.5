/**
 * Edge Function: add-law
 * إدخال مواد قانونية عراقية (نص فقط — بدون تضمين متجهات).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_IRAQI_LAW_NAMES = new Set([
    "قانون التنفيذ العراقي رقم 45 لسنة 1980",
    "قانون العقوبات العراقي رقم 111 لسنة 1969",
    "قانون أصول المحاكمات الجزائية العراقي رقم 23 لسنة 1971",
    "قانون رعاية الأحداث العراقي رقم 76 لسنة 1983",
]);

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

    const law_name = typeof lawNameRaw === "string"
        ? lawNameRaw.trim()
        : "";
    const article_number = articleRaw === null || articleRaw === undefined
        ? ""
        : String(articleRaw).trim();
    const content = typeof contentRaw === "string" ? contentRaw.trim() : "";

    if (!law_name) {
        return jsonResponse(
            { ok: false, error: "الحقل law_name مطلوب وغير فارغ." },
            400,
            req,
        );
    }
    if (!ALLOWED_IRAQI_LAW_NAMES.has(law_name)) {
        return jsonResponse(
            {
                ok: false,
                error: "اسم القانون غير مسموح. استخدم أحد القوانين المعتمدة في النظام فقط.",
            },
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

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const row = {
        law_name,
        article_number,
        content,
    };

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
            message: "تم حفظ المادة بنجاح.",
            record: data,
        },
        200,
        req,
    );
});
