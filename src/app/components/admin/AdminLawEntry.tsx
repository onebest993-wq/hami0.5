import { cn } from '@/app/components/ui/utils';
import { Pin } from '@/app/components/ui/icons/Pin';
import { Scale } from '@/app/components/ui/icons/Scale';
import {
    BROWSE_TABLE_PAGE_SIZE,
    CIVIL_LAW_TAB_LABELS,
    CRIMINAL_LAW_TAB_LABELS,
    LAW_DOMAIN_LABELS,
    PERSONAL_LAW_TAB_LABELS,
    type CivilLawTab,
    type CriminalLawTab,
    type PersonalLawTab,
} from '@/app/components/admin/adminLawEntryTypes';
import { LAW_STRUCTURE, LAW_STRUCTURE_SECTION_IDS } from '@/app/components/admin/lawStructure';
import { useAdminLawEntry } from '@/app/components/admin/useAdminLawEntry';

export interface AdminLawEntryProps {
    /** لفئات إضافية على الحاوية الخارجية */
    className?: string;
}

/**
 * لوحة إدخال مواد قانونية عبر BFF `/api/laws/*` (WIFE + platform admin).
 */
export function AdminLawEntry({ className }: AdminLawEntryProps) {
    const {
        activeTab,
        setActiveTab,
        hierarchySectionId,
        setHierarchySectionId,
        hierarchyFilterId,
        setHierarchyFilterId,
        pinnedFilterPath,
        browseLoading,
        browseLoadError,
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
        bulkLoading,
        bulkJson,
        setBulkJson,
        bulkJsonFileName,
        setBulkJsonFileName,
        bulkJsonFileInputRef,
        bulkProgress,
        bulkErrorHint,
        setBulkErrorHint,
        success,
        setSuccess,
        error,
        setError,
        clearLoading,
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
        handleSubmit,
        handleBulkJsonFileChange,
        handleBulkSubmit,
        handleClearDatabase,
    } = useAdminLawEntry();

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
                                value={resolvedLawName ?? ""}
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
