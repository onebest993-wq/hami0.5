import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SmartDialog } from "@/app/components/ui/SmartDialog";
import { SecureAPIClient, SecureFetchError } from "@/app/services/SecureAPIClient";
import { IRAQI_LAW_CANONICAL_NAMES, CIVIL_LAW_CANONICAL_NAMES, EXECUTION_LAW_CANONICAL_NAME, isAllowedIraqiLawName, resolveLawCodeTypeFromName, resolveCivilLawCodeTypeFromName } from "@/app/constants/iraqiLawCatalog";
import { invalidateLegalCodeArticlesCache } from "@/app/slices/criminal/legalCodes";
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
        return 'قاعدة البيانات غير مهيأة: أضف مفتاح خدمة Supabase في ملف .env ثم أعد تشغيل npm run dev.';
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

export const BROWSE_TABLE_PAGE_SIZE = 40;
export type LawDomain = "execution" | "criminal" | "civil" | "personal";
export type CriminalLawTab = "penal" | "procedure" | "juvenile";
export type CivilLawTab = "civil_procedure" | "evidence";
export type PersonalLawTab = "personal_status_188" | "personal_status_supplementary" | "jaafari_code";

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

export const LAW_DOMAIN_LABELS: Record<LawDomain, string> = {
    execution: "قسم التنفيذ",
    criminal: "القسم القضائي الجزائي",
    civil: "الدعاوى المدنية",
    personal: "الأحوال الشخصية",
};

export const CRIMINAL_LAW_TAB_LABELS: Record<CriminalLawTab, string> = {
    penal: "قانون العقوبات",
    procedure: "أصول المحاكمات الجزائية",
    juvenile: "قانون رعاية الأحداث",
};

export const CIVIL_LAW_TAB_LABELS: Record<CivilLawTab, string> = {
    civil_procedure: "المرافعات المدنية",
    evidence: "قانون الإثبات",
};

export const PERSONAL_LAW_TAB_LABELS: Record<PersonalLawTab, string> = {
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

export function useAdminLawEntry(_className?: string) {
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
        if (parsed.ok === false) {
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


    return {
        initialPin,
        activeTab,
        setActiveTab,
        hierarchySectionId,
        setHierarchySectionId,
        hierarchyFilterId,
        setHierarchyFilterId,
        pinnedFilterPath,
        setPinnedFilterPath,
        browseRows,
        setBrowseRows,
        browseLoading,
        setBrowseLoading,
        browseLoadError,
        setBrowseLoadError,
        browseVisibleCount,
        setBrowseVisibleCount,
        hasLoadedBrowseRef,
        activeDomain,
        setActiveDomain,
        activeCriminalLawTab,
        setActiveCriminalLawTab,
        activeCivilLawTab,
        setActiveCivilLawTab,
        activePersonalLawTab,
        setActivePersonalLawTab,
        articleNumber,
        setArticleNumber,
        content,
        setContent,
        singleLoading,
        setSingleLoading,
        bulkLoading,
        setBulkLoading,
        bulkJson,
        setBulkJson,
        bulkJsonFileName,
        setBulkJsonFileName,
        bulkJsonFileInputRef,
        bulkProgress,
        setBulkProgress,
        bulkErrorHint,
        setBulkErrorHint,
        success,
        setSuccess,
        error,
        setError,
        clearLoading,
        setClearLoading,
        clearArticleFrom,
        setClearArticleFrom,
        clearArticleTo,
        setClearArticleTo,
        resolvedLawName,
        activeHierarchySection,
        activeHierarchyFilter,
        bulkParsePreview,
        bulkParseSummary,
        loadBrowseArticles,
        hierarchyFilteredRows,
        visibleHierarchyRows,
        handlePinHierarchyFilter,
        handleUnpinHierarchyFilter,
        invokeAddLaw,
        handleSubmit,
        handleBulkJsonFileChange,
        handleBulkSubmit,
        handleClearDatabase,
    };
}
