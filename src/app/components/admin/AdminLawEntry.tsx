// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/app/components/ui/utils";
import { SmartDialog } from "@/app/components/ui/SmartDialog";
import { SecureAPIClient, SecureFetchError } from "@/app/services/SecureAPIClient";
import { Pin, Scale } from "lucide-react";
import { IRAQI_LAW_CANONICAL_NAMES, CIVIL_LAW_CANONICAL_NAMES, EXECUTION_LAW_CANONICAL_NAME, isAllowedIraqiLawName, resolveLawCodeTypeFromName, resolveCivilLawCodeTypeFromName } from "@/app/constants/iraqiLawCatalog";
import { invalidateLegalCodeArticlesCache } from "@/app/components/lawyer/criminal-system/legalCodes/legalCodesDataCache";
import { invalidateExecutionLawRemoteCache } from "@/app/utils/executionLawRemoteCache";
import { invalidateCivilLawRemoteCache } from "@/app/utils/civilLawRemoteCache";
import { invalidatePersonalStatusLawRemoteCache } from "@/app/utils/personalStatusLawRemoteCache";
import {
    PERSONAL_STATUS_LAW_CANONICAL_NAMES,
    resolvePersonalStatusLawCodeType,
} from "@/app/constants/personalStatusLawCatalog";
import {
    articleNumberInRange,
    clearPinnedLawFilter,
    extractArticleSortNumber,
    LAW_STRUCTURE,
    LAW_STRUCTURE_SECTION_IDS,
    normalizeArabicDigits,
    readPinnedLawFilter,
    writePinnedLawFilter,
    type LawStructureSectionId,
    type PinnedLawFilterPath,
} from "@/app/components/admin/lawStructure";
import {
    parseBulkLawJsonText,
    summarizeBulkLawParse,
    type BulkLawInvokeRow,
} from "@/app/components/admin/adminBulkLawImport";

type AddLawInvokeBody = {
    law_name: string;
    article_number: string;
    content: string;
};

function parseSecureApiErrorMessage(err: unknown): string {
    if (!(err instanceof SecureFetchError)) {
        return err instanceof Error ? err.message : String(err);
    }
    const text = err.bodyText?.trim() ?? "";
    if (text) {
        try {
            const body = JSON.parse(text) as { error?: string; details?: string };
            const parts = [body.error, body.details].filter(
                (part): part is string => typeof part === "string" && part.trim().length > 0,
            );
            if (parts.length > 0) return parts.join(" — ");
        } catch {
            if (text.length < 240) return text;
        }
    }
    if (err.status === 401) {
        return "غير مصرح: استخدم «الدخول كمدير أعلى» أو سجّل دخولاً صالحاً ثم أعد المحاولة.";
    }
    if (err.status === 403) {
        return "ليس لديك صلاحية إدخال القوانين.";
    }
    if (err.status === 503) {
        return "قاعدة البيانات غير مهيأة: أضف SUPABASE_SERVICE_ROLE_KEY في ملف .env ثم أعد تشغيل npm run dev.";
    }
    return err.message || `خطأ HTTP ${err.status}`;
}

type AdminLawEntryTab = "single" | "bulk" | "browse";

type BrowseLawRow = {
    id: string;
    lawName: string;
    articleNumber: string;
    content: string;
};

const BROWSE_TABLE_PAGE_SIZE = 40;
type LawDomain = "execution" | "criminal" | "civil" | "personal";
type CriminalLawTab = "penal" | "procedure" | "juvenile";
type CivilLawTab = "civil_procedure" | "evidence";
type PersonalLawTab = "personal_status_188" | "personal_status_supplementary" | "jaafari_code";

type BulkProgress = {
    rawTotal: number;
    total: number;
    skipped: number;
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

type ImportBundleResponse = {
    ok?: boolean;
    error?: string;
    message?: string;
    details?: string;
    imported?: number;
    rawCount?: number;
    skipped?: number;
    skippedDetails?: Array<{ index: number; reason: string }>;
};

type ClearLawsInvokeBody = {
    law_name: string;
    article_from?: number;
    article_to?: number;
};

type AddLawInvokeResult = {
    message: string;
};

const LAW_DOMAIN_LABELS: Record<LawDomain, string> = {
    execution: "قسم التنفيذ",
    criminal: "القسم القضائي الجزائي",
    civil: "الدعاوى المدنية",
    personal: "الأحوال الشخصية",
};

const CRIMINAL_LAW_TAB_LABELS: Record<CriminalLawTab, string> = {
    penal: "قانون العقوبات",
    procedure: "أصول المحاكمات الجزائية",
    juvenile: "قانون رعاية الأحداث",
};

const CIVIL_LAW_TAB_LABELS: Record<CivilLawTab, string> = {
    civil_procedure: "المرافعات المدنية",
    evidence: "قانون الإثبات",
};

const PERSONAL_LAW_TAB_LABELS: Record<PersonalLawTab, string> = {
    personal_status_188: "قانون 188",
    personal_status_supplementary: "قوانين تطبيقية",
    jaafari_code: "المدونة الجعفرية",
};

const LAW_NAME_BY_TARGET: Record<LawDomain, string | null> & Record<CriminalLawTab, string> & Record<CivilLawTab, string> & Record<PersonalLawTab, string> = {
    execution: EXECUTION_LAW_CANONICAL_NAME,
    criminal: null,
    civil: null,
    personal: null,
    penal: IRAQI_LAW_CANONICAL_NAMES.penal,
    procedure: IRAQI_LAW_CANONICAL_NAMES.procedure,
    juvenile: IRAQI_LAW_CANONICAL_NAMES.juvenile,
    civil_procedure: CIVIL_LAW_CANONICAL_NAMES.civil_procedure,
    evidence: CIVIL_LAW_CANONICAL_NAMES.evidence,
    personal_status_188: PERSONAL_STATUS_LAW_CANONICAL_NAMES.personal_status_188,
    personal_status_supplementary: PERSONAL_STATUS_LAW_CANONICAL_NAMES.personal_status_supplementary,
    jaafari_code: PERSONAL_STATUS_LAW_CANONICAL_NAMES.jaafari_code,
};
function refreshLawReaderCaches(lawName: string): void {
    const codeType = resolveLawCodeTypeFromName(lawName);
    if (codeType) invalidateLegalCodeArticlesCache(codeType);
    const civilCodeType = resolveCivilLawCodeTypeFromName(lawName);
    if (civilCodeType) invalidateCivilLawRemoteCache(civilCodeType);
    const personalCodeType = resolvePersonalStatusLawCodeType(lawName);
    if (personalCodeType) invalidatePersonalStatusLawRemoteCache(personalCodeType);
    if (lawName === EXECUTION_LAW_CANONICAL_NAME) invalidateExecutionLawRemoteCache();
}

export interface AdminLawEntryProps {
    /** لفئات إضافية على الحاوية الخارجية */
    className?: string;
}

/**
 * لوحة إدخال مواد قانونية عبر BFF `/api/laws/*` (WIFE + platform admin).
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
    const [activeCivilLawTab, setActiveCivilLawTab] =
        useState<CivilLawTab>("civil_procedure");
    const [activePersonalLawTab, setActivePersonalLawTab] =
        useState<PersonalLawTab>("personal_status_188");
    const [lawName, setLawName] = useState("");
    const [articleNumber, setArticleNumber] = useState("");
    const [content, setContent] = useState("");
    const [singleLoading, setSingleLoading] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkJson, setBulkJson] = useState("");
    const [bulkJsonFileName, setBulkJsonFileName] = useState<string | null>(null);
    const bulkJsonFileInputRef = useRef<HTMLInputElement>(null);
    const [bulkProgress, setBulkProgress] = useState<BulkProgress>({
        rawTotal: 0,
        total: 0,
        skipped: 0,
        processed: 0,
        success: 0,
        failed: 0,
    });
    const [bulkErrorHint, setBulkErrorHint] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clearLoading, setClearLoading] = useState(false);
    const [clearArticleFrom, setClearArticleFrom] = useState("");
    const [clearArticleTo, setClearArticleTo] = useState("");

    const resolvedLawName =
        activeDomain === "execution"
            ? LAW_NAME_BY_TARGET.execution
            : activeDomain === "criminal"
              ? LAW_NAME_BY_TARGET[activeCriminalLawTab]
              : activeDomain === "civil"
                ? LAW_NAME_BY_TARGET[activeCivilLawTab]
                : LAW_NAME_BY_TARGET[activePersonalLawTab];

    const activeHierarchySection = LAW_STRUCTURE[hierarchySectionId];
    const activeHierarchyFilter = activeHierarchySection.filters.find(
        (f) => f.id === hierarchyFilterId,
    ) ?? null;

    const bulkParsePreview = useMemo(() => {
        const trimmed = bulkJson.trim();
        if (!trimmed) return null;
        return parseBulkLawJsonText(trimmed, String(resolvedLawName ?? ""));
    }, [bulkJson, resolvedLawName]);

    const bulkParseSummary = useMemo(() => {
        if (!bulkParsePreview) return null;
        return summarizeBulkLawParse(bulkParsePreview);
    }, [bulkParsePreview]);

    const loadBrowseArticles = useCallback(async () => {
        setBrowseLoading(true);
        setBrowseLoadError(null);
        try {
            const data = await SecureAPIClient.fetchSecure<{
                ok?: boolean;
                error?: string;
                details?: string;
                items?: Array<{
                    id?: string;
                    law_name?: string;
                    article_number?: string;
                    content?: string;
                }>;
            }>('/api/laws/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
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
                .filter((r) => r.lawName.length > 0 && isAllowedIraqiLawName(r.lawName));
            const dedup = new Map<string, BrowseLawRow>();
            for (const row of mapped) {
                const key = `${row.lawName}::${normalizeArabicDigits(row.articleNumber)}`;
                const prev = dedup.get(key);
                if (!prev || row.content.length > prev.content.length) {
                    dedup.set(key, row);
                }
            }
            setBrowseRows(Array.from(dedup.values()));
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
        let data: AddLawResponse | null;
        try {
            data = await SecureAPIClient.fetchSecure<AddLawResponse>('/api/laws/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch (e) {
            throw new Error(parseSecureApiErrorMessage(e));
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
                    : "تم حفظ المادة بنجاح.",
            };
        }

        throw new Error("استجابة غير متوقعة من الخادم.");
    }, []);

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
        setSingleLoading(true);

        try {
            const result = await invokeAddLaw({
                law_name,
                article_number,
                content: contentTrimmed,
            });
            setSuccess(result.message);
            refreshLawReaderCaches(law_name);
            setArticleNumber("");
            setContent("");
            hasLoadedBrowseRef.current = false;
            if (activeTab === "browse") void loadBrowseArticles();
        } catch (e) {
            setError(e instanceof Error ? e.message : "خطأ غير متوقع أثناء الإرسال.");
        } finally {
            setSingleLoading(false);
        }
    }, [
        resolvedLawName,
        articleNumber,
        content,
        invokeAddLaw,
        activeTab,
        loadBrowseArticles,
    ]);

    const handleBulkJsonFileChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!file.name.toLowerCase().endsWith(".json")) {
                setError("ارفع ملف JSON فقط (.json).");
                setSuccess(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const text = typeof reader.result === "string" ? reader.result : "";
                setBulkJson(text);
                setBulkJsonFileName(file.name);
                setSuccess(null);
                setError(null);
                setBulkErrorHint(null);
            };
            reader.onerror = () => {
                setError("تعذر قراءة الملف.");
                setSuccess(null);
            };
            reader.readAsText(file, "utf-8");
        },
        [],
    );

    const handleBulkSubmit = useCallback(async () => {
        setError(null);
        setSuccess(null);
        setBulkErrorHint(null);

        const parsed = parseBulkLawJsonText(bulkJson, String(resolvedLawName ?? ""));
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }

        const items: BulkLawInvokeRow[] = parsed.items;
        const skippedCount = parsed.skipped.length;
        if (skippedCount > 0) {
            setBulkErrorHint(
                `تخطّي ${skippedCount} عنصر من ${parsed.rawCount} (مثال: ${parsed.skipped[0]?.reason ?? ""})`,
            );
        }

        setBulkLoading(true);
        setBulkProgress({
            rawTotal: parsed.rawCount,
            total: items.length,
            skipped: skippedCount,
            processed: 0,
            success: 0,
            failed: 0,
        });

        try {
            const data = await SecureAPIClient.fetchSecure<ImportBundleResponse>(
                "/api/laws/import-bundle",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        law_name: String(resolvedLawName ?? "").trim(),
                        articles: items.map((item) => ({
                            article_number: item.article_number,
                            content: item.content,
                        })),
                    }),
                },
            );

            if (!data || data.ok === false) {
                throw new Error(data?.error || data?.details || "فشل الرفع الجماعي.");
            }

            const imported = data.imported ?? items.length;
            setBulkProgress({
                rawTotal: parsed.rawCount,
                total: items.length,
                skipped: skippedCount,
                processed: items.length,
                success: imported,
                failed: 0,
            });
            refreshLawReaderCaches(String(resolvedLawName ?? "").trim());
            setSuccess(
                data.message
                    ?? `تم رفع ${imported} مادة بنجاح${skippedCount > 0 ? ` (تخطّي ${skippedCount} من ${parsed.rawCount})` : ""}.`,
            );
            setBulkJson("");
            setBulkJsonFileName(null);
            setBulkJsonFileName(null);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(`فشل الرفع الجماعي: ${msg}`);
            setBulkErrorHint(msg);
            setBulkProgress((prev) => ({
                ...prev,
                processed: prev.total,
                failed: prev.total - prev.success,
            }));
        }

        setBulkLoading(false);
        hasLoadedBrowseRef.current = false;
        if (activeTab === "browse") void loadBrowseArticles();
    }, [
        bulkJson,
        resolvedLawName,
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
        setClearLoading(true);
        try {
            const clearBody: ClearLawsInvokeBody = hasRange
                ? { law_name: targetLawName, article_from: article_from!, article_to: article_to! }
                : { law_name: targetLawName };
            const data = await SecureAPIClient.fetchSecure<AddLawResponse>('/api/laws/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clearBody),
            });
            if (!data) {
                throw new Error("لم تُرجع الخادم أي بيانات.");
            }
            if (data.ok === false) {
                throw new Error(data.error || "فشل تنظيف قاعدة البيانات.");
            }
            const deletedCount = data.deletedCount ?? 0;
            if (deletedCount === 0) {
                setSuccess(
                    `لم تُعثر على مواد محذوفة لـ (${targetLawName}) في قاعدة البيانات — ربما كانت فارغة مسبقاً. إن ما زلت ترى مواداً في إضبارة التنفيذ فهي من الملف المحلي المدمج وليست من قاعدة البيانات.`,
                );
            } else {
                setSuccess(
                    `تم حذف مواد (${targetLawName}) بنجاح. العدد المحذوف: ${deletedCount}.`,
                );
            }
            refreshLawReaderCaches(targetLawName);
            setBulkProgress({
                rawTotal: 0,
                total: 0,
                skipped: 0,
                processed: 0,
                success: 0,
                failed: 0,
            });
            setBulkJson("");
            setBulkJsonFileName(null);
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
                        يُحفظ النص في قاعدة البيانات مع التصنيف القانوني.
                    </p>
                </div>
            </header>

            <div className="space-y-5">
                <div className="space-y-3 rounded-2xl border border-[#E6C673]/20 bg-[#05060D]/70 p-3">
                    <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#E6C673]/20 bg-[#05060D]/70 p-1.5 sm:grid-cols-2 lg:grid-cols-4">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveDomain("execution");
                                setSuccess(null);
                                setError(null);
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
                        <button
                            type="button"
                            onClick={() => {
                                setActiveDomain("civil");
                                setSuccess(null);
                                setError(null);
                            }}
                            disabled={singleLoading || bulkLoading}
                            className={cn(
                                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                                activeDomain === "civil"
                                    ? "bg-[#E6C673] text-[#05060D]"
                                    : "text-[#E6C673] hover:bg-[#E6C673]/10",
                            )}
                        >
                            {LAW_DOMAIN_LABELS.civil}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveDomain("personal");
                                setSuccess(null);
                                setError(null);
                            }}
                            disabled={singleLoading || bulkLoading}
                            className={cn(
                                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                                activeDomain === "personal"
                                    ? "bg-[#E6C673] text-[#05060D]"
                                    : "text-[#E6C673] hover:bg-[#E6C673]/10",
                            )}
                        >
                            {LAW_DOMAIN_LABELS.personal}
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

                    {activeDomain === "civil" && (
                        <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-[#0A0F1C]/80 p-2 sm:grid-cols-2">
                            {(Object.keys(CIVIL_LAW_TAB_LABELS) as CivilLawTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => {
                                        setActiveCivilLawTab(tab);
                                        setSuccess(null);
                                        setError(null);
                                    }}
                                    disabled={singleLoading || bulkLoading}
                                    className={cn(
                                        "rounded-lg px-3 py-2 text-xs font-bold transition",
                                        activeCivilLawTab === tab
                                            ? "bg-[#E6C673] text-[#05060D]"
                                            : "text-[#E6C673] hover:bg-[#E6C673]/10",
                                    )}
                                >
                                    {CIVIL_LAW_TAB_LABELS[tab]}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeDomain === "personal" && (
                        <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-[#0A0F1C]/80 p-2 sm:grid-cols-3">
                            {(Object.keys(PERSONAL_LAW_TAB_LABELS) as PersonalLawTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => {
                                        setActivePersonalLawTab(tab);
                                        setSuccess(null);
                                        setError(null);
                                    }}
                                    disabled={singleLoading || bulkLoading}
                                    className={cn(
                                        "rounded-lg px-3 py-2 text-xs font-bold transition",
                                        activePersonalLawTab === tab
                                            ? "bg-[#E6C673] text-[#05060D]"
                                            : "text-[#E6C673] hover:bg-[#E6C673]/10",
                                    )}
                                >
                                    {PERSONAL_LAW_TAB_LABELS[tab]}
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
                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <label
                                    htmlFor="admin-law-bulk-json"
                                    className="block text-sm font-medium text-[#E6C673]/90"
                                >
                                    إدخال جماعي بصيغة JSON
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={bulkJsonFileInputRef}
                                        type="file"
                                        accept=".json,application/json"
                                        className="hidden"
                                        onChange={handleBulkJsonFileChange}
                                        disabled={singleLoading || bulkLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => bulkJsonFileInputRef.current?.click()}
                                        disabled={singleLoading || bulkLoading}
                                        className="rounded-lg border border-[#E6C673]/30 px-3 py-1.5 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/10 disabled:opacity-60"
                                    >
                                        رفع ملف JSON
                                    </button>
                                    {bulkJsonFileName ? (
                                        <span className="text-xs text-white/60">{bulkJsonFileName}</span>
                                    ) : null}
                                </div>
                            </div>
                            <textarea
                                id="admin-law-bulk-json"
                                rows={14}
                                placeholder={`[\n  { \"المادة\": 1, \"النص\": \"...\" },\n  { \"article_number\": \"2\", \"content\": \"...\" },\n  { \"المادة\": 3, \"نص المادة\": \"...\" }\n]\n\nأو حزمة: { \"articles\": [ ... ] } أو { \"articles\": { \"1\": \"نص...\" } }\n\nlaw_name من القسم المختار — يُفضّل رفع الملف كاملاً بدل اللصق.`}
                                value={bulkJson}
                                onChange={(e) => {
                                    setBulkJson(e.target.value);
                                    setBulkJsonFileName(null);
                                    setSuccess(null);
                                    setError(null);
                                    setBulkErrorHint(null);
                                }}
                                disabled={singleLoading || bulkLoading}
                                className="min-h-[260px] w-full resize-y rounded-xl border border-white/10 bg-[#05060D]/80 px-4 py-3 font-mono text-sm leading-relaxed text-white outline-none ring-[#E6C673]/30 transition-[border-color,box-shadow] placeholder:text-gray-500 focus:border-[#E6C673]/45 focus:ring-2 disabled:opacity-60"
                            />
                            {bulkParseSummary && !bulkLoading ? (
                                <p
                                    className={cn(
                                        "mt-2 text-xs leading-relaxed",
                                        bulkParsePreview?.ok ? "text-emerald-300" : "text-amber-300",
                                    )}
                                    role="status"
                                >
                                    {bulkParseSummary}
                                </p>
                            ) : null}
                        </div>

                        {(bulkLoading || bulkProgress.processed > 0) && (
                            <div className="rounded-xl border border-[#E6C673]/25 bg-[#0B1120] p-3">
                                <p className="mb-2 text-sm text-[#E6C673]">
                                    تم رفع {bulkProgress.success} من {bulkProgress.total} صالح
                                    {bulkProgress.rawTotal > bulkProgress.total
                                        ? ` (الملف: ${bulkProgress.rawTotal}، تخطّي: ${bulkProgress.skipped})`
                                        : ""}
                                    {" "}— {bulkProgress.processed} معالجة، {bulkProgress.failed} فشل
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
                                {bulkErrorHint ? (
                                    <p className="mt-2 text-xs leading-relaxed text-red-300" role="alert">
                                        {bulkErrorHint}
                                    </p>
                                ) : null}
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
                            ? "جاري الحفظ…"
                            : "جاري الرفع الجماعي…"
                        : activeTab === "single"
                        ? "حفظ المادة"
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
