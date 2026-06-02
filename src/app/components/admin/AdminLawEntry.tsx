import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/functions-js";
import { supabase } from "@/app/lib/supabase-client";
import { cn } from "@/app/components/ui/utils";
import { SmartDialog } from "@/app/components/ui/SmartDialog";
import { Pin, Scale } from "lucide-react";
import { IRAQI_LAW_CANONICAL_NAMES, resolveLawCodeTypeFromName } from "@/app/constants/iraqiLawCatalog";
import { invalidateLegalCodeArticlesCache } from "@/app/components/lawyer/criminal-system/legalCodes/legalCodesDataCache";
import {
    articleNumberInRange,
    clearPinnedLawFilter,
    extractArticleSortNumber,
    LAW_STRUCTURE,
    LAW_STRUCTURE_SECTION_IDS,
    readPinnedLawFilter,
    writePinnedLawFilter,
    type LawStructureSectionId,
    type PinnedLawFilterPath,
} from "@/app/components/admin/lawStructure";

type AddLawInvokeBody = {
    law_name: string;
    article_number: string;
    content: string;
    skip_embedding?: boolean;
};

type AdminLawEntryTab = "single" | "bulk" | "browse";

type BrowseLawRow = {
    id: string;
    lawName: string;
    articleNumber: string;
    content: string;
};

const BROWSE_TABLE_PAGE_SIZE = 40;
type LawDomain = "execution" | "criminal";
type CriminalLawTab = "penal" | "procedure" | "juvenile";

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
    embedding_fallback_used?: boolean;
};

type ClearLawsInvokeBody = {
    law_name: string;
    article_from?: number;
    article_to?: number;
};

type AddLawInvokeResult = {
    message: string;
    embeddingFallbackUsed: boolean;
};

function isEmbeddingFailureMessage(msg: string): boolean {
    const text = String(msg || "").toLowerCase();
    return text.includes("فشل توليد التضمين") ||
        text.includes("gemini-embedding-001") ||
        text.includes("denied access") ||
        text.includes("quota");
}

const LAW_DOMAIN_LABELS: Record<LawDomain, string> = {
    execution: "قسم التنفيذ",
    criminal: "القسم القضائي الجزائي",
};

const CRIMINAL_LAW_TAB_LABELS: Record<CriminalLawTab, string> = {
    penal: "قانون العقوبات",
    procedure: "أصول المحاكمات الجزائية",
    juvenile: "قانون رعاية الأحداث",
};

const LAW_NAME_BY_TARGET: Record<LawDomain, string | null> & Record<CriminalLawTab, string> = {
    execution: "قانون التنفيذ العراقي رقم 45 لسنة 1980",
    criminal: null,
    penal: "قانون العقوبات العراقي رقم 111 لسنة 1969",
    procedure: "قانون أصول المحاكمات الجزائية العراقي رقم 23 لسنة 1971",
    juvenile: "قانون رعاية الأحداث العراقي رقم 76 لسنة 1983",
};
function refreshLegalCodesReaderCache(lawName: string): void {
    const codeType = resolveLawCodeTypeFromName(lawName);
    if (codeType) invalidateLegalCodeArticlesCache(codeType);
}

function formatInvokeError(err: unknown): string {
    if (err && typeof err === "object" && "message" in err) {
        return String((err as { message: unknown }).message);
    }
    return String(err);
}

/** يقبل article_number كنص أو رقم (مثل 1 أو "المادة 1"). */
function normalizeBulkArticleNumber(raw: unknown): string {
    if (typeof raw === "string") return raw.trim();
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return String(Math.trunc(raw));
    }
    return "";
}

function normalizeBulkContent(raw: unknown): string {
    if (typeof raw === "string") return raw.trim();
    return "";
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
    const initialPin = readPinnedLawFilter();
    const [activeTab, setActiveTab] = useState<AdminLawEntryTab>("single");
    const [hierarchySectionId, setHierarchySectionId] = useState<LawStructureSectionId>(
        initialPin?.sectionId ?? "penal",
    );
    const [hierarchyFilterId, setHierarchyFilterId] = useState<string | null>(
        initialPin?.filterId ?? null,
    );
    const [pinnedFilterPath, setPinnedFilterPath] = useState<PinnedLawFilterPath | null>(
        initialPin,
    );
    const [browseRows, setBrowseRows] = useState<BrowseLawRow[]>([]);
    const [browseLoading, setBrowseLoading] = useState(false);
    const [browseLoadError, setBrowseLoadError] = useState<string | null>(null);
    const [browseVisibleCount, setBrowseVisibleCount] = useState(BROWSE_TABLE_PAGE_SIZE);
    const hasLoadedBrowseRef = useRef(false);
    const [activeDomain, setActiveDomain] = useState<LawDomain>("execution");
    const [activeCriminalLawTab, setActiveCriminalLawTab] =
        useState<CriminalLawTab>("penal");
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
    const [clearArticleFrom, setClearArticleFrom] = useState("");
    const [clearArticleTo, setClearArticleTo] = useState("");
    const [bulkEmbeddingStats, setBulkEmbeddingStats] = useState<{
        smartEmbedded: number;
        fallbackSaved: number;
    } | null>(null);

    const resolvedLawName =
        activeDomain === "execution"
            ? LAW_NAME_BY_TARGET.execution
            : LAW_NAME_BY_TARGET[activeCriminalLawTab];

    const activeHierarchySection = LAW_STRUCTURE[hierarchySectionId];
    const activeHierarchyFilter = activeHierarchySection.filters.find(
        (f) => f.id === hierarchyFilterId,
    ) ?? null;

    const loadBrowseArticles = useCallback(async () => {
        setBrowseLoading(true);
        setBrowseLoadError(null);
        try {
            const { data, error: fnError } = await supabase.functions.invoke<{
                ok?: boolean;
                error?: string;
                details?: string;
                items?: Array<{
                    id?: string;
                    law_name?: string;
                    article_number?: string;
                    content?: string;
                }>;
            }>("list-laws", { body: {} });
            if (fnError) {
                throw new Error(fnError.message || "تعذر تحميل المواد.");
            }
            if (!data || data.ok === false) {
                throw new Error(
                    (data?.error || data?.details || "تعذر تحميل المواد.").trim(),
                );
            }
            const rows = Array.isArray(data.items) ? data.items : [];
            const mapped: BrowseLawRow[] = rows
                .map((row) => ({
                    id: String(row?.id ?? `${row?.law_name}-${row?.article_number}`),
                    lawName: String(row?.law_name ?? "").trim(),
                    articleNumber: String(row?.article_number ?? "").trim() || "—",
                    content: String(row?.content ?? "").trim() || "—",
                }))
                .filter((r) => r.lawName.length > 0);
            setBrowseRows(mapped);
        } catch (e) {
            setBrowseLoadError(e instanceof Error ? e.message : "تعذر تحميل المواد.");
        } finally {
            setBrowseLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab !== "browse" || hasLoadedBrowseRef.current) return;
        hasLoadedBrowseRef.current = true;
        void loadBrowseArticles();
    }, [activeTab, loadBrowseArticles]);

    useEffect(() => {
        if (activeTab !== "browse") return;
        setBrowseVisibleCount(BROWSE_TABLE_PAGE_SIZE);
    }, [activeTab, hierarchySectionId, hierarchyFilterId]);

    const hierarchyFilteredRows = useMemo(() => {
        const lawName = activeHierarchySection.lawName;
        let rows = browseRows.filter((r) => r.lawName === lawName);
        if (activeHierarchyFilter) {
            const { from, to } = activeHierarchyFilter;
            rows = rows.filter((r) =>
                articleNumberInRange(r.articleNumber, from, to),
            );
        }
        return rows.slice().sort((a, b) => {
            const aNum = extractArticleSortNumber(a.articleNumber);
            const bNum = extractArticleSortNumber(b.articleNumber);
            if (aNum !== null && bNum !== null && aNum !== bNum) return aNum - bNum;
            if (aNum !== null && bNum === null) return -1;
            if (aNum === null && bNum !== null) return 1;
            return a.articleNumber.localeCompare(b.articleNumber, "ar");
        });
    }, [activeHierarchyFilter, activeHierarchySection.lawName, browseRows]);

    const visibleHierarchyRows = useMemo(
        () => hierarchyFilteredRows.slice(0, browseVisibleCount),
        [hierarchyFilteredRows, browseVisibleCount],
    );

    const handlePinHierarchyFilter = useCallback(
        (sectionId: LawStructureSectionId, filterId: string) => {
            const path: PinnedLawFilterPath = { sectionId, filterId };
            writePinnedLawFilter(path);
            setPinnedFilterPath(path);
            setHierarchySectionId(sectionId);
            setHierarchyFilterId(filterId);
        },
        [],
    );

    const handleUnpinHierarchyFilter = useCallback(() => {
        clearPinnedLawFilter();
        setPinnedFilterPath(null);
    }, []);

    const invokeAddLaw = useCallback(async (body: AddLawInvokeBody): Promise<AddLawInvokeResult> => {
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
            return {
                message: typeof data.message === "string" && data.message.trim()
                    ? data.message
                    : "تم حفظ المادة في قاعدة البيانات الذكية بنجاح.",
                embeddingFallbackUsed: data.embedding_fallback_used === true,
            };
        }

        throw new Error("استجابة غير متوقعة من الخادم.");
    }, []);

    const invokeAddLawTextOnlyFallback = useCallback(
        async (body: AddLawInvokeBody): Promise<AddLawInvokeResult> => {
            return await invokeAddLaw({
                ...body,
                skip_embedding: true,
            });
        },
        [invokeAddLaw],
    );

    const handleSubmit = useCallback(async () => {
        const law_name = String(resolvedLawName ?? "").trim();
        const article_number = articleNumber.trim();
        const contentTrimmed = content.trim();

        if (!law_name || !article_number || !contentTrimmed) {
            setError("يرجى تعبئة رقم المادة والنص الحرفي بعد اختيار القسم القانوني.");
            setSuccess(null);
            return;
        }

        setError(null);
        setSuccess(null);
        setBulkEmbeddingStats(null);
        setSingleLoading(true);

        try {
            const result = await invokeAddLaw({
                law_name,
                article_number,
                content: contentTrimmed,
            });
            setSuccess(result.message);
            refreshLegalCodesReaderCache(law_name);
            setArticleNumber("");
            setContent("");
            hasLoadedBrowseRef.current = false;
            if (activeTab === "browse") void loadBrowseArticles();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (isEmbeddingFailureMessage(msg)) {
                try {
                    const fallbackResult = await invokeAddLawTextOnlyFallback({
                        law_name,
                        article_number,
                        content: contentTrimmed,
                    });
                    setSuccess(fallbackResult.message);
                    refreshLegalCodesReaderCache(law_name);
                    setArticleNumber("");
                    setContent("");
                } catch (fallbackErr) {
                    setError(
                        fallbackErr instanceof Error
                            ? fallbackErr.message
                            : "خطأ غير متوقع أثناء الحفظ المحلي.",
                    );
                }
            } else {
                setError(msg || "خطأ غير متوقع أثناء الإرسال.");
            }
        } finally {
            setSingleLoading(false);
        }
    }, [
        resolvedLawName,
        articleNumber,
        content,
        invokeAddLaw,
        invokeAddLawTextOnlyFallback,
        activeTab,
        loadBrowseArticles,
    ]);

    const sleep = useCallback(
        (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
        [],
    );

    const handleBulkSubmit = useCallback(async () => {
        setError(null);
        setSuccess(null);
        setBulkEmbeddingStats(null);

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
            const law_name = String(resolvedLawName ?? "").trim();
            const article_number = normalizeBulkArticleNumber(o.article_number);
            const bodyContent = normalizeBulkContent(o.content);
            if (!law_name || !article_number || !bodyContent) {
                setError(
                    `العنصر رقم ${i + 1} ناقص. يجب أن يحتوي article_number (نص أو رقم) و content، مع اختيار القسم القانوني الصحيح (مثل «قانون رعاية الأحداث»).`,
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
        let fallbackSavedCount = 0;
        const failedMessages: string[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const result = await invokeAddLaw(items[i]);
                successCount++;
                if (result.embeddingFallbackUsed) {
                    fallbackSavedCount++;
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (isEmbeddingFailureMessage(msg)) {
                    try {
                        await invokeAddLawTextOnlyFallback(items[i]);
                        successCount++;
                        fallbackSavedCount++;
                    } catch (fallbackErr) {
                        failedCount++;
                        const fbMsg = fallbackErr instanceof Error
                            ? fallbackErr.message
                            : String(fallbackErr);
                        failedMessages.push(`فشل المادة ${i + 1}: ${fbMsg}`);
                    }
                } else {
                    failedCount++;
                    failedMessages.push(`فشل المادة ${i + 1}: ${msg}`);
                }
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
            refreshLegalCodesReaderCache(String(resolvedLawName ?? "").trim());
            setSuccess("تم رفع المواد بنجاح (مع الاحتفاظ بالنصوص محلياً).");
            setBulkEmbeddingStats({
                smartEmbedded: Math.max(0, successCount - fallbackSavedCount),
                fallbackSaved: fallbackSavedCount,
            });
            setBulkJson("");
        } else {
            setError(
                `اكتمل الرفع مع أخطاء: نجح ${successCount} وفشل ${failedCount} من ${items.length}. ${
                    failedMessages[0] ?? ""
                }`,
            );
            if (successCount > 0) {
                refreshLegalCodesReaderCache(String(resolvedLawName ?? "").trim());
                setSuccess(`تم رفع ${successCount} مادة بنجاح.`);
                setBulkEmbeddingStats({
                    smartEmbedded: Math.max(0, successCount - fallbackSavedCount),
                    fallbackSaved: fallbackSavedCount,
                });
            }
        }

        setBulkLoading(false);
        hasLoadedBrowseRef.current = false;
        if (activeTab === "browse") void loadBrowseArticles();
    }, [
        bulkJson,
        resolvedLawName,
        invokeAddLaw,
        sleep,
        invokeAddLawTextOnlyFallback,
        activeTab,
        loadBrowseArticles,
    ]);

    const handleClearDatabase = useCallback(async () => {
        const targetLawName = String(resolvedLawName ?? "").trim();
        if (!targetLawName) {
            setError("تعذر تحديد القسم القانوني الحالي للحذف.");
            setSuccess(null);
            return;
        }
        const fromRaw = clearArticleFrom.trim();
        const toRaw = clearArticleTo.trim();
        const hasRange = Boolean(fromRaw || toRaw);
        const article_from = fromRaw ? Number.parseInt(fromRaw, 10) : null;
        const article_to = toRaw ? Number.parseInt(toRaw, 10) : null;
        if (hasRange) {
            if (
                article_from === null ||
                article_to === null ||
                !Number.isFinite(article_from) ||
                !Number.isFinite(article_to) ||
                article_from > article_to
            ) {
                setError("لحذف نطاق محدد، أدخل رقم مادة البداية والنهاية (مثل 1 و 300).");
                setSuccess(null);
                return;
            }
        }
        const confirmed = await SmartDialog.confirm(
            hasRange
                ? `تحذير: سيتم حذف مواد (${targetLawName}) من المادة ${article_from} إلى ${article_to}. هل أنت متأكد؟`
                : `تحذير: سيتم حذف جميع مواد (${targetLawName}) فقط. هل أنت متأكد؟`,
        );
        if (!confirmed) return;
        setError(null);
        setSuccess(null);
        setBulkEmbeddingStats(null);
        setClearLoading(true);
        try {
            const clearBody: ClearLawsInvokeBody = hasRange
                ? { law_name: targetLawName, article_from: article_from!, article_to: article_to! }
                : { law_name: targetLawName };
            const { data, error: fnError } = await supabase.functions.invoke<AddLawResponse, ClearLawsInvokeBody>(
                "clear-laws",
                { body: clearBody },
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
                `تم حذف مواد (${targetLawName}) بنجاح. العدد المحذوف: ${data.deletedCount ?? 0}.`,
            );
            refreshLegalCodesReaderCache(targetLawName);
            setBulkProgress({ total: 0, processed: 0, success: 0, failed: 0 });
            setBulkJson("");
            setArticleNumber("");
            setContent("");
            hasLoadedBrowseRef.current = false;
            if (activeTab === "browse") void loadBrowseArticles();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "خطأ غير متوقع أثناء التنظيف.",
            );
        } finally {
            setClearLoading(false);
        }
    }, [activeTab, clearArticleFrom, clearArticleTo, loadBrowseArticles, resolvedLawName]);

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
                <div className="space-y-3 rounded-2xl border border-[#E6C673]/20 bg-[#05060D]/70 p-3">
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#E6C673]/20 bg-[#05060D]/70 p-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveDomain("execution");
                                setSuccess(null);
                                setError(null);
                                setBulkEmbeddingStats(null);
                            }}
                            disabled={singleLoading || bulkLoading}
                            className={cn(
                                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                                activeDomain === "execution"
                                    ? "bg-[#E6C673] text-[#05060D]"
                                    : "text-[#E6C673] hover:bg-[#E6C673]/10",
                            )}
                        >
                            {LAW_DOMAIN_LABELS.execution}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveDomain("criminal");
                                setSuccess(null);
                                setError(null);
                                setBulkEmbeddingStats(null);
                            }}
                            disabled={singleLoading || bulkLoading}
                            className={cn(
                                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                                activeDomain === "criminal"
                                    ? "bg-[#E6C673] text-[#05060D]"
                                    : "text-[#E6C673] hover:bg-[#E6C673]/10",
                            )}
                        >
                            {LAW_DOMAIN_LABELS.criminal}
                        </button>
                    </div>

                    {activeDomain === "criminal" && (
                        <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-[#0A0F1C]/80 p-2 sm:grid-cols-3">
                            {(Object.keys(CRIMINAL_LAW_TAB_LABELS) as CriminalLawTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => {
                                        setActiveCriminalLawTab(tab);
                                        setSuccess(null);
                                        setError(null);
                                        setBulkEmbeddingStats(null);
                                    }}
                                    disabled={singleLoading || bulkLoading}
                                    className={cn(
                                        "rounded-lg px-3 py-2 text-xs font-bold transition",
                                        activeCriminalLawTab === tab
                                            ? "bg-[#E6C673] text-[#05060D]"
                                            : "text-[#E6C673] hover:bg-[#E6C673]/10",
                                    )}
                                >
                                    {CRIMINAL_LAW_TAB_LABELS[tab]}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100">
                        الوجهة الحالية للحقن: {resolvedLawName}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#E6C673]/20 bg-[#05060D]/70 p-1.5 sm:grid-cols-3">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("single");
                            setError(null);
                            setSuccess(null);
                            setBulkEmbeddingStats(null);
                        }}
                        disabled={singleLoading || bulkLoading || browseLoading}
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
                            setBulkEmbeddingStats(null);
                        }}
                        disabled={singleLoading || bulkLoading || browseLoading}
                        className={cn(
                            "rounded-lg px-3 py-2 text-sm font-semibold transition",
                            activeTab === "bulk"
                                ? "bg-[#E6C673] text-[#05060D]"
                                : "text-[#E6C673] hover:bg-[#E6C673]/10",
                        )}
                    >
                        إدخال جماعي (JSON)
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("browse");
                            setError(null);
                            setSuccess(null);
                            setBulkEmbeddingStats(null);
                        }}
                        disabled={singleLoading || bulkLoading}
                        className={cn(
                            "rounded-lg px-3 py-2 text-sm font-semibold transition",
                            activeTab === "browse"
                                ? "bg-[#E6C673] text-[#05060D]"
                                : "text-[#E6C673] hover:bg-[#E6C673]/10",
                        )}
                    >
                        استعراض وتصفية
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
                                placeholder="يُحدد تلقائياً حسب القسم المختار"
                                value={resolvedLawName}
                                onChange={() => void 0}
                                disabled
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

                {activeTab === "browse" && (
                    <div className="space-y-4 rounded-2xl border border-[#E6C673]/20 bg-[#05060D]/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-[#E6C673]">
                                التصفية الهرمية للمواد المحقونة
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    hasLoadedBrowseRef.current = false;
                                    void loadBrowseArticles();
                                }}
                                disabled={browseLoading}
                                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/5 disabled:opacity-60"
                            >
                                {browseLoading ? "جاري التحديث…" : "تحديث الجدول"}
                            </button>
                        </div>

                        {/* Primary Filter Bar — الأقسام العامة */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {LAW_STRUCTURE_SECTION_IDS.map((sectionId) => {
                                const section = LAW_STRUCTURE[sectionId];
                                return (
                                    <button
                                        key={sectionId}
                                        type="button"
                                        onClick={() => {
                                            setHierarchySectionId(sectionId);
                                            setHierarchyFilterId(null);
                                        }}
                                        className={cn(
                                            "rounded-lg border px-3 py-2 text-xs font-bold transition",
                                            hierarchySectionId === sectionId
                                                ? "border-[#E6C673] bg-[#E6C673] text-[#05060D]"
                                                : "border-white/10 text-[#E6C673] hover:bg-[#E6C673]/10",
                                        )}
                                    >
                                        {section.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Secondary Filter Bar — أزرار النطاق */}
                        <div className="space-y-2 rounded-xl border border-white/10 bg-[#0A0F1C]/80 p-2">
                            <p className="text-xs font-semibold text-gray-400">
                                تصنيفات {activeHierarchySection.label}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {activeHierarchySection.filters.map((filter) => {
                                    const isActive = hierarchyFilterId === filter.id;
                                    const isPinned =
                                        pinnedFilterPath?.sectionId === hierarchySectionId &&
                                        pinnedFilterPath?.filterId === filter.id;
                                    return (
                                        <div
                                            key={filter.id}
                                            className={cn(
                                                "inline-flex items-center gap-1 rounded-lg border",
                                                isActive
                                                    ? "border-[#E6C673] bg-[#E6C673]/15"
                                                    : "border-white/10 bg-white/[0.03]",
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setHierarchyFilterId(filter.id)}
                                                className={cn(
                                                    "px-3 py-2 text-xs font-bold transition",
                                                    isActive
                                                        ? "text-[#E6C673]"
                                                        : "text-white/80 hover:text-[#E6C673]",
                                                )}
                                            >
                                                {filter.label}
                                                <span className="mr-1 text-[10px] font-medium text-gray-400">
                                                    ({filter.from}–{filter.to === 9999 ? "∞" : filter.to})
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                title={
                                                    isPinned
                                                        ? "إلغاء التثبيت"
                                                        : "تثبيت هذا النطاق"
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isPinned) {
                                                        handleUnpinHierarchyFilter();
                                                    } else {
                                                        handlePinHierarchyFilter(
                                                            hierarchySectionId,
                                                            filter.id,
                                                        );
                                                    }
                                                }}
                                                className={cn(
                                                    "rounded-lg p-2 transition",
                                                    isPinned
                                                        ? "text-[#E6C673]"
                                                        : "text-white/40 hover:text-[#E6C673]",
                                                )}
                                            >
                                                <Pin
                                                    className={cn(
                                                        "h-3.5 w-3.5",
                                                        isPinned && "fill-current",
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {pinnedFilterPath ? (
                                <p className="text-[11px] text-emerald-300/90">
                                    مثبت: {LAW_STRUCTURE[pinnedFilterPath.sectionId].label} —{" "}
                                    {LAW_STRUCTURE[pinnedFilterPath.sectionId].filters.find(
                                        (f) => f.id === pinnedFilterPath.filterId,
                                    )?.label ?? pinnedFilterPath.filterId}
                                </p>
                            ) : null}
                        </div>

                        {browseLoadError ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                {browseLoadError}
                            </p>
                        ) : null}

                        <div className="overflow-hidden rounded-xl border border-white/10">
                            <div className="flex items-center justify-between border-b border-white/10 bg-[#0A0F1C]/90 px-3 py-2">
                                <span className="text-xs font-bold text-white/80">
                                    {activeHierarchyFilter
                                        ? `المواد ${activeHierarchyFilter.from}–${
                                              activeHierarchyFilter.to === 9999
                                                  ? "∞"
                                                  : activeHierarchyFilter.to
                                          }`
                                        : "اختر نطاقاً لعرض المواد"}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {hierarchyFilteredRows.length} مادة
                                </span>
                            </div>
                            {browseLoading ? (
                                <p className="px-4 py-6 text-center text-sm text-gray-400">
                                    جاري تحميل المواد…
                                </p>
                            ) : !activeHierarchyFilter ? (
                                <p className="px-4 py-6 text-center text-sm text-gray-400">
                                    اختر زر تصنيف خاص لعرض المواد ضمن النطاق العددي.
                                </p>
                            ) : visibleHierarchyRows.length === 0 ? (
                                <p className="px-4 py-6 text-center text-sm text-gray-400">
                                    لا توجد مواد في هذا النطاق للقسم المحدد.
                                </p>
                            ) : (
                                <div className="max-h-[420px] overflow-y-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead className="sticky top-0 bg-[#0A0F1C] text-xs text-[#E6C673]/90">
                                            <tr>
                                                <th className="px-3 py-2 font-bold">رقم المادة</th>
                                                <th className="px-3 py-2 font-bold">النص</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleHierarchyRows.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="border-t border-white/5 hover:bg-white/[0.03]"
                                                >
                                                    <td className="whitespace-nowrap px-3 py-2 align-top font-bold text-[#E6C673]">
                                                        {row.articleNumber}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs leading-relaxed text-white/85">
                                                        {row.content.length > 220
                                                            ? `${row.content.slice(0, 220)}…`
                                                            : row.content}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {hierarchyFilteredRows.length > visibleHierarchyRows.length ? (
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setBrowseVisibleCount(
                                            (v) => v + BROWSE_TABLE_PAGE_SIZE,
                                        )
                                    }
                                    className="rounded-lg border border-[#E6C673]/30 px-4 py-2 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/10"
                                >
                                    تحميل المزيد
                                </button>
                            </div>
                        ) : null}
                    </div>
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
                                placeholder={`[\n  { \"article_number\": \"المادة 1\", \"content\": \"النص...\" },\n  { \"article_number\": 2, \"content\": \"النص...\" }\n]\n\nملاحظة: law_name يُحدد تلقائياً حسب القسم/التبويب الحالي. article_number يقبل نصاً أو رقماً.`}
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
                    <div className="space-y-2">
                        <p
                            className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
                            role="status"
                        >
                            {success}
                        </p>
                        {bulkEmbeddingStats ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 backdrop-blur-sm">
                                    ✨ بتضمين ذكي: {bulkEmbeddingStats.smartEmbedded}
                                </span>
                                <span className="inline-flex items-center rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-sm">
                                    📝 نص محلي فقط: {bulkEmbeddingStats.fallbackSaved}
                                </span>
                            </div>
                        ) : null}
                    </div>
                )}

                {error && (
                    <p
                        className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300"
                        role="alert"
                    >
                        {error}
                    </p>
                )}

                {activeTab !== "browse" ? (
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
                ) : null}

                {activeTab !== "browse" ? (
                <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-xs text-gray-400">
                        من مادة (اختياري)
                        <input
                            type="number"
                            min={1}
                            value={clearArticleFrom}
                            onChange={(e) => setClearArticleFrom(e.target.value)}
                            disabled={singleLoading || bulkLoading || clearLoading}
                            className="rounded-lg border border-white/10 bg-[#05060D]/80 px-3 py-2 text-sm text-white"
                            placeholder="1"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-gray-400">
                        إلى مادة (اختياري)
                        <input
                            type="number"
                            min={1}
                            value={clearArticleTo}
                            onChange={(e) => setClearArticleTo(e.target.value)}
                            disabled={singleLoading || bulkLoading || clearLoading}
                            className="rounded-lg border border-white/10 bg-[#05060D]/80 px-3 py-2 text-sm text-white"
                            placeholder="300"
                        />
                    </label>
                </div>
                ) : null}

                {activeTab !== "browse" ? (
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
                        : clearArticleFrom.trim() && clearArticleTo.trim()
                        ? "حذف نطاق المواد المحدد"
                        : "حذف جميع المواد القانونية"}
                </button>
                ) : null}
            </div>
        </section>
    );
}
