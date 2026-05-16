import React, { useCallback, useState } from "react";
import { FunctionsHttpError } from "@supabase/functions-js";
import { supabase } from "@/app/lib/supabase-client";
import { cn } from "@/app/components/ui/utils";
import { SmartDialog } from "@/app/components/ui/SmartDialog";
import { Scale } from "lucide-react";

type AddLawInvokeBody = {
    law_name: string;
    article_number: string;
    content: string;
};

type AdminLawEntryTab = "single" | "bulk";

type BulkProgress = {
    total: number;
    processed: number;
    success: number;
    failed: number;
};

type AddLawResponse = {
    ok?: boolean;
    error?: string;
    message?: string;
    details?: string;
    record?: unknown;
    deletedCount?: number;
};

function formatInvokeError(err: unknown): string {
    if (err && typeof err === "object" && "message" in err) {
        return String((err as { message: unknown }).message);
    }
    return String(err);
}

async function errorBodyFromHttpError(
    err: FunctionsHttpError,
): Promise<string | null> {
    const res = err.context;
    if (!(res instanceof Response)) return null;
    try {
        const body = (await res.clone().json()) as {
            error?: unknown;
            ok?: unknown;
        };
        if (typeof body.error === "string" && body.error.trim()) {
            return body.error;
        }
    } catch {
        /* ليس JSON */
    }
    return null;
}

export interface AdminLawEntryProps {
    /** لفئات إضافية على الحاوية الخارجية */
    className?: string;
}

/**
 * لوحة إدخال مواد قانونية عبر دالة Edge `add-law`.
 * مكوّن مستقل: يستورد عميل Supabase فقط ولا يعدّل التوجيه أو الشاشات الأخرى.
 */
export function AdminLawEntry({ className }: AdminLawEntryProps) {
    const [activeTab, setActiveTab] = useState<AdminLawEntryTab>("single");
    const [lawName, setLawName] = useState("");
    const [articleNumber, setArticleNumber] = useState("");
    const [content, setContent] = useState("");
    const [singleLoading, setSingleLoading] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkJson, setBulkJson] = useState("");
    const [bulkProgress, setBulkProgress] = useState<BulkProgress>({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
    });
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clearLoading, setClearLoading] = useState(false);

    const invokeAddLaw = useCallback(async (body: AddLawInvokeBody) => {
        const { data, error: fnError } = await supabase.functions.invoke<
            AddLawResponse
        >("add-law", { body });

        if (fnError) {
            if (fnError instanceof FunctionsHttpError) {
                const fromBody = await errorBodyFromHttpError(fnError);
                if (fromBody) {
                    throw new Error(fromBody);
                }
            }
            throw new Error(
                formatInvokeError(fnError) ||
                    "فشل الاتصال بدالة add-law (تحقق من النشر والجلسة).",
            );
        }

        if (!data) {
            throw new Error("لم تُرجع الخادم أي بيانات.");
        }

        if (data.ok === false) {
            const parts = [
                typeof data.error === "string" ? data.error : null,
                typeof data.details === "string" ? data.details : null,
            ].filter(Boolean);
            throw new Error(parts.join(" — ") || "رفض الخادم العملية.");
        }

        if (data.ok === true) {
            return typeof data.message === "string" && data.message.trim()
                ? data.message
                : "تم حفظ المادة في قاعدة البيانات الذكية بنجاح.";
        }

        throw new Error("استجابة غير متوقعة من الخادم.");
    }, []);

    const handleSubmit = useCallback(async () => {
        const law_name = lawName.trim();
        const article_number = articleNumber.trim();
        const contentTrimmed = content.trim();

        if (!law_name || !article_number || !contentTrimmed) {
            setError("يرجى تعبئة اسم القانون ورقم المادة والنص الحرفي.");
            setSuccess(null);
            return;
        }

        setError(null);
        setSuccess(null);
        setSingleLoading(true);

        try {
            const message = await invokeAddLaw({
                law_name,
                article_number,
                content: contentTrimmed,
            });
            setSuccess(message);
            setArticleNumber("");
            setContent("");
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "خطأ غير متوقع أثناء الإرسال.",
            );
        } finally {
            setSingleLoading(false);
        }
    }, [lawName, articleNumber, content, invokeAddLaw]);

    const sleep = useCallback(
        (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
        [],
    );

    const handleBulkSubmit = useCallback(async () => {
        setError(null);
        setSuccess(null);

        let parsed: unknown;
        try {
            parsed = JSON.parse(bulkJson);
        } catch {
            setError("صيغة JSON غير صحيحة. تأكد من أن النص عبارة عن Array صالح.");
            return;
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
            setError("أدخل مصفوفة JSON تحتوي مادة واحدة على الأقل.");
            return;
        }

        const items: AddLawInvokeBody[] = [];
        for (let i = 0; i < parsed.length; i++) {
            const row = parsed[i];
            if (!row || typeof row !== "object" || Array.isArray(row)) {
                setError(`العنصر رقم ${i + 1} ليس كائناً صحيحاً.`);
                return;
            }
            const o = row as Record<string, unknown>;
            const law_name = typeof o.law_name === "string"
                ? o.law_name.trim()
                : "";
            const article_number = typeof o.article_number === "string"
                ? o.article_number.trim()
                : "";
            const bodyContent = typeof o.content === "string"
                ? o.content.trim()
                : "";
            if (!law_name || !article_number || !bodyContent) {
                setError(
                    `العنصر رقم ${i + 1} ناقص. يجب أن يحتوي law_name و article_number و content.`,
                );
                return;
            }
            items.push({ law_name, article_number, content: bodyContent });
        }

        setBulkLoading(true);
        setBulkProgress({
            total: items.length,
            processed: 0,
            success: 0,
            failed: 0,
        });

        let successCount = 0;
        let failedCount = 0;
        const failedMessages: string[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                await invokeAddLaw(items[i]);
                successCount++;
            } catch (e) {
                failedCount++;
                const msg = e instanceof Error ? e.message : String(e);
                failedMessages.push(`فشل المادة ${i + 1}: ${msg}`);
            }

            setBulkProgress({
                total: items.length,
                processed: i + 1,
                success: successCount,
                failed: failedCount,
            });

            if (i < items.length - 1) {
                await sleep(500);
            }
        }

        if (failedCount === 0) {
            setSuccess(`اكتمل الرفع الجماعي بنجاح: ${successCount} من ${items.length}.`);
            setBulkJson("");
        } else {
            setError(
                `اكتمل الرفع مع أخطاء: نجح ${successCount} وفشل ${failedCount} من ${items.length}. ${
                    failedMessages[0] ?? ""
                }`,
            );
            if (successCount > 0) {
                setSuccess(`تم رفع ${successCount} مادة بنجاح.`);
            }
        }

        setBulkLoading(false);
    }, [bulkJson, invokeAddLaw, sleep]);

    const handleClearDatabase = useCallback(async () => {
        const confirmed = await SmartDialog.confirm(
            "تحذير: سيتم حذف جميع المواد القانونية من قاعدة البيانات. هل أنت متأكد؟",
        );
        if (!confirmed) return;
        setError(null);
        setSuccess(null);
        setClearLoading(true);
        try {
            const { data, error: fnError } = await supabase.functions.invoke<AddLawResponse>(
                "clear-laws",
                { body: {} },
            );
            if (fnError) {
                throw new Error(
                    formatInvokeError(fnError) || "فشل الاتصال بدالة clear-laws.",
                );
            }
            if (!data) {
                throw new Error("لم تُرجع الخادم أي بيانات.");
            }
            if (data.ok === false) {
                throw new Error(data.error || "فشل تنظيف قاعدة البيانات.");
            }
            setSuccess(
                `تم حذف جميع المواد القانونية بنجاح. العدد المحذوف: ${data.deletedCount ?? 0}.`,
            );
            setBulkProgress({ total: 0, processed: 0, success: 0, failed: 0 });
            setBulkJson("");
            setArticleNumber("");
            setContent("");
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "خطأ غير متوقع أثناء التنظيف.",
            );
        } finally {
            setClearLoading(false);
        }
    }, []);

    return (
        <section
            dir="rtl"
            className={cn(
                "w-full max-w-3xl rounded-[24px] border border-[#E6C673]/25 bg-[#0A0F1C]/90 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl md:p-8",
                className,
            )}
        >
            <header className="mb-6 flex items-start gap-3 border-b border-[#E6C673]/15 pb-4">
                <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 text-[#E6C673]"
                    aria-hidden
                >
                    <Scale className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white md:text-xl">
                        إدخال مواد القانون العراقي
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                        يُحفظ النص ويُولَّد تضمين ذكي عبر الخادم (Gemini) ثم يُخزَّن
                        في قاعدة البيانات.
                    </p>
                </div>
            </header>

            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#E6C673]/20 bg-[#05060D]/70 p-1.5">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("single");
                            setError(null);
                            setSuccess(null);
                        }}
                        disabled={singleLoading || bulkLoading}
                        className={cn(
                            "rounded-lg px-3 py-2 text-sm font-semibold transition",
                            activeTab === "single"
                                ? "bg-[#E6C673] text-[#05060D]"
                                : "text-[#E6C673] hover:bg-[#E6C673]/10",
                        )}
                    >
                        إدخال مادة مفردة
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("bulk");
                            setError(null);
                            setSuccess(null);
                        }}
                        disabled={singleLoading || bulkLoading}
                        className={cn(
                            "rounded-lg px-3 py-2 text-sm font-semibold transition",
                            activeTab === "bulk"
                                ? "bg-[#E6C673] text-[#05060D]"
                                : "text-[#E6C673] hover:bg-[#E6C673]/10",
                        )}
                    >
                        إدخال جماعي (JSON)
                    </button>
                </div>

                {activeTab === "single" && (
                    <>
                        <div>
                            <label
                                htmlFor="admin-law-name"
                                className="mb-1.5 block text-sm font-medium text-[#E6C673]/90"
                            >
                                اسم القانون
                            </label>
                            <input
                                id="admin-law-name"
                                type="text"
                                autoComplete="off"
                                placeholder="مثال: قانون التنفيذ العراقي رقم 45 لسنة 1980"
                                value={lawName}
                                onChange={(e) => {
                                    setLawName(e.target.value);
                                    setSuccess(null);
                                    setError(null);
                                }}
                                disabled={singleLoading || bulkLoading}
                                className="w-full rounded-xl border border-white/10 bg-[#05060D]/80 px-4 py-3 text-sm text-white outline-none ring-[#E6C673]/30 transition-[border-color,box-shadow] placeholder:text-gray-500 focus:border-[#E6C673]/45 focus:ring-2 disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="admin-law-article"
                                className="mb-1.5 block text-sm font-medium text-[#E6C673]/90"
                            >
                                رقم المادة
                            </label>
                            <input
                                id="admin-law-article"
                                type="text"
                                autoComplete="off"
                                placeholder="مثال: المادة 9"
                                value={articleNumber}
                                onChange={(e) => {
                                    setArticleNumber(e.target.value);
                                    setSuccess(null);
                                    setError(null);
                                }}
                                disabled={singleLoading || bulkLoading}
                                className="w-full rounded-xl border border-white/10 bg-[#05060D]/80 px-4 py-3 text-sm text-white outline-none ring-[#E6C673]/30 transition-[border-color,box-shadow] placeholder:text-gray-500 focus:border-[#E6C673]/45 focus:ring-2 disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="admin-law-content"
                                className="mb-1.5 block text-sm font-medium text-[#E6C673]/90"
                            >
                                النص الحرفي للمادة
                            </label>
                            <textarea
                                id="admin-law-content"
                                rows={12}
                                placeholder="الصق أو اكتب نص المادة كما ورد في المصدر الرسمي…"
                                value={content}
                                onChange={(e) => {
                                    setContent(e.target.value);
                                    setSuccess(null);
                                    setError(null);
                                }}
                                disabled={singleLoading || bulkLoading}
                                className="min-h-[220px] w-full resize-y rounded-xl border border-white/10 bg-[#05060D]/80 px-4 py-3 text-sm leading-relaxed text-white outline-none ring-[#E6C673]/30 transition-[border-color,box-shadow] placeholder:text-gray-500 focus:border-[#E6C673]/45 focus:ring-2 disabled:opacity-60"
                            />
                        </div>
                    </>
                )}

                {activeTab === "bulk" && (
                    <>
                        <div>
                            <label
                                htmlFor="admin-law-bulk-json"
                                className="mb-1.5 block text-sm font-medium text-[#E6C673]/90"
                            >
                                إدخال جماعي بصيغة JSON Array
                            </label>
                            <textarea
                                id="admin-law-bulk-json"
                                rows={14}
                                placeholder={`[\n  { \"law_name\": \"اسم القانون\", \"article_number\": \"المادة 1\", \"content\": \"النص...\" },\n  { \"law_name\": \"اسم القانون\", \"article_number\": \"المادة 2\", \"content\": \"النص...\" }\n]`}
                                value={bulkJson}
                                onChange={(e) => {
                                    setBulkJson(e.target.value);
                                    setSuccess(null);
                                    setError(null);
                                }}
                                disabled={singleLoading || bulkLoading}
                                className="min-h-[260px] w-full resize-y rounded-xl border border-white/10 bg-[#05060D]/80 px-4 py-3 font-mono text-sm leading-relaxed text-white outline-none ring-[#E6C673]/30 transition-[border-color,box-shadow] placeholder:text-gray-500 focus:border-[#E6C673]/45 focus:ring-2 disabled:opacity-60"
                            />
                        </div>

                        {(bulkLoading || bulkProgress.processed > 0) && (
                            <div className="rounded-xl border border-[#E6C673]/25 bg-[#0B1120] p-3">
                                <p className="mb-2 text-sm text-[#E6C673]">
                                    تم رفع {bulkProgress.success} من {bulkProgress.total}
                                    {" "}({bulkProgress.processed} معالجة، {bulkProgress.failed} فشل)
                                </p>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full bg-gradient-to-l from-[#c4a85a] to-[#E6C673] transition-all"
                                        style={{
                                            width: `${
                                                bulkProgress.total > 0
                                                    ? (bulkProgress.processed /
                                                        bulkProgress.total) *
                                                        100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}

                {success && (
                    <p
                        className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
                        role="status"
                    >
                        {success}
                    </p>
                )}

                {error && (
                    <p
                        className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300"
                        role="alert"
                    >
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={activeTab === "single" ? handleSubmit : handleBulkSubmit}
                    disabled={singleLoading || bulkLoading || clearLoading}
                    className={cn(
                        "w-full rounded-xl py-3.5 text-sm font-bold transition-[opacity,transform,box-shadow] active:scale-[0.99]",
                        "bg-gradient-to-l from-[#c4a85a] to-[#E6C673] text-[#05060D]",
                        "shadow-[0_4px_24px_rgba(230,198,115,0.25)]",
                        "hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C673]",
                        (singleLoading || bulkLoading) && "cursor-not-allowed opacity-70",
                    )}
                >
                    {singleLoading || bulkLoading
                        ? activeTab === "single"
                            ? "جاري الحفظ والتضمين…"
                            : "جاري الرفع الجماعي…"
                        : activeTab === "single"
                        ? "حفظ المادة في قاعدة البيانات الذكية"
                        : "بدء الرفع الجماعي"}
                </button>

                <button
                    type="button"
                    onClick={handleClearDatabase}
                    disabled={singleLoading || bulkLoading || clearLoading}
                    className={cn(
                        "w-full rounded-xl py-3 text-sm font-bold transition-[opacity,transform] active:scale-[0.99]",
                        "border border-red-500/50 bg-red-900/25 text-red-200 hover:bg-red-900/35",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400",
                        (singleLoading || bulkLoading || clearLoading) &&
                            "cursor-not-allowed opacity-70",
                    )}
                >
                    {clearLoading
                        ? "جاري تنظيف قاعدة البيانات…"
                        : "حذف جميع المواد القانونية"}
                </button>
            </div>
        </section>
    );
}
