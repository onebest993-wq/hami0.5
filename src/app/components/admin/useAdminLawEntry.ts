import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type MutableRefObject,
} from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    articleNumberInRange,
    clearPinnedLawFilter,
    extractArticleSortNumber,
    LAW_STRUCTURE,
    readPinnedLawFilter,
    writePinnedLawFilter,
    type LawStructureSectionId,
    type PinnedLawFilterPath,
} from '@/app/components/admin/lawStructure';
import {
    parseBulkLawJsonText,
    summarizeBulkLawParse,
    type BulkLawInvokeRow,
} from '@/app/components/admin/adminBulkLawImport';
import {
    BROWSE_TABLE_PAGE_SIZE,
    EMPTY_BULK_PROGRESS,
    resolveAdminLawTargetName,
    type AdminLawEntryTab,
    type BrowseLawRow,
    type BulkProgress,
    type CivilLawTab,
    type ClearLawsInvokeBody,
    type CriminalLawTab,
    type LawDomain,
    type PersonalLawTab,
} from '@/app/components/admin/adminLawEntryTypes';
import {
    invokeAddLaw,
    invokeClearLaws,
    invokeImportLawBundle,
    invokeListLaws,
    refreshLawReaderCaches,
} from '@/app/components/admin/adminLawEntryApi';
import { dispatchHqStatusRefresh } from '@/app/components/admin/hqStatusEvents';

export function useAdminLawEntry() {
    const initialPin = readPinnedLawFilter();
    const [activeTab, setActiveTab] = useState<AdminLawEntryTab>('single');
    const [hierarchySectionId, setHierarchySectionId] = useState<LawStructureSectionId>(
        initialPin?.sectionId ?? 'penal',
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
    const [activeDomain, setActiveDomain] = useState<LawDomain>('execution');
    const [activeCriminalLawTab, setActiveCriminalLawTab] = useState<CriminalLawTab>('penal');
    const [activeCivilLawTab, setActiveCivilLawTab] = useState<CivilLawTab>('civil_procedure');
    const [activePersonalLawTab, setActivePersonalLawTab] =
        useState<PersonalLawTab>('personal_status_188');
    const [articleNumber, setArticleNumber] = useState('');
    const [content, setContent] = useState('');
    const [singleLoading, setSingleLoading] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkJson, setBulkJson] = useState('');
    const [bulkJsonFileName, setBulkJsonFileName] = useState<string | null>(null);
    const bulkJsonFileInputRef = useRef<HTMLInputElement>(null);
    const [bulkProgress, setBulkProgress] = useState<BulkProgress>(EMPTY_BULK_PROGRESS);
    const [bulkErrorHint, setBulkErrorHint] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clearLoading, setClearLoading] = useState(false);
    const [clearArticleFrom, setClearArticleFrom] = useState('');
    const [clearArticleTo, setClearArticleTo] = useState('');

    const resolvedLawName = resolveAdminLawTargetName(
        activeDomain,
        activeCriminalLawTab,
        activeCivilLawTab,
        activePersonalLawTab,
    );

    const activeHierarchySection = LAW_STRUCTURE[hierarchySectionId];
    const activeHierarchyFilter =
        activeHierarchySection.filters.find((f) => f.id === hierarchyFilterId) ?? null;

    const bulkParsePreview = useMemo(() => {
        const trimmed = bulkJson.trim();
        if (!trimmed) return null;
        return parseBulkLawJsonText(trimmed, String(resolvedLawName ?? ''));
    }, [bulkJson, resolvedLawName]);

    const bulkParseSummary = useMemo(() => {
        if (!bulkParsePreview) return null;
        return summarizeBulkLawParse(bulkParsePreview);
    }, [bulkParsePreview]);

    const loadBrowseArticles = useCallback(async () => {
        setBrowseLoading(true);
        setBrowseLoadError(null);
        try {
            setBrowseRows(await invokeListLaws());
        } catch (e) {
            setBrowseLoadError(e instanceof Error ? e.message : 'تعذر تحميل المواد.');
        } finally {
            setBrowseLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab !== 'browse' || hasLoadedBrowseRef.current) return;
        hasLoadedBrowseRef.current = true;
        void loadBrowseArticles();
    }, [activeTab, loadBrowseArticles]);

    useEffect(() => {
        if (activeTab !== 'browse') return;
        setBrowseVisibleCount(BROWSE_TABLE_PAGE_SIZE);
    }, [activeTab, hierarchySectionId, hierarchyFilterId]);

    const hierarchyFilteredRows = useMemo(() => {
        const lawName = activeHierarchySection.lawName;
        let rows = browseRows.filter((r) => r.lawName === lawName);
        if (activeHierarchyFilter) {
            const { from, to } = activeHierarchyFilter;
            rows = rows.filter((r) => articleNumberInRange(r.articleNumber, from, to));
        }
        return rows.slice().sort((a, b) => {
            const aNum = extractArticleSortNumber(a.articleNumber);
            const bNum = extractArticleSortNumber(b.articleNumber);
            if (aNum !== null && bNum !== null && aNum !== bNum) return aNum - bNum;
            if (aNum !== null && bNum === null) return -1;
            if (aNum === null && bNum !== null) return 1;
            return a.articleNumber.localeCompare(b.articleNumber, 'ar');
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

    const handleSubmit = useCallback(async () => {
        const law_name = String(resolvedLawName ?? '').trim();
        const article_number = articleNumber.trim();
        const contentTrimmed = content.trim();

        if (!law_name || !article_number || !contentTrimmed) {
            setError('يرجى تعبئة رقم المادة والنص الحرفي بعد اختيار القسم القانوني.');
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
            dispatchHqStatusRefresh();
            setArticleNumber('');
            setContent('');
            hasLoadedBrowseRef.current = false;
            if (activeTab === 'browse') void loadBrowseArticles();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'خطأ غير متوقع أثناء الإرسال.');
        } finally {
            setSingleLoading(false);
        }
    }, [resolvedLawName, articleNumber, content, activeTab, loadBrowseArticles]);

    const handleBulkJsonFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.json')) {
            setError('ارفع ملف JSON فقط (.json).');
            setSuccess(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            setBulkJson(text);
            setBulkJsonFileName(file.name);
            setSuccess(null);
            setError(null);
            setBulkErrorHint(null);
        };
        reader.onerror = () => {
            setError('تعذر قراءة الملف.');
            setSuccess(null);
        };
        reader.readAsText(file, 'utf-8');
    }, []);

    const handleBulkSubmit = useCallback(async () => {
        setError(null);
        setSuccess(null);
        setBulkErrorHint(null);

        const parsed = parseBulkLawJsonText(bulkJson, String(resolvedLawName ?? ''));
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }

        const items: BulkLawInvokeRow[] = parsed.items;
        const skippedCount = parsed.skipped.length;
        if (skippedCount > 0) {
            setBulkErrorHint(
                `تخطّي ${skippedCount} عنصر من ${parsed.rawCount} (مثال: ${parsed.skipped[0]?.reason ?? ''})`,
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
            const data = await invokeImportLawBundle(
                String(resolvedLawName ?? '').trim(),
                items.map((item) => ({
                    article_number: item.article_number,
                    content: item.content,
                })),
            );
            const imported = data.imported ?? items.length;
            setBulkProgress({
                rawTotal: parsed.rawCount,
                total: items.length,
                skipped: skippedCount,
                processed: items.length,
                success: imported,
                failed: 0,
            });
            refreshLawReaderCaches(String(resolvedLawName ?? '').trim());
            dispatchHqStatusRefresh();
            setSuccess(
                data.message ??
                    `تم رفع ${imported} مادة بنجاح${
                        skippedCount > 0 ? ` (تخطّي ${skippedCount} من ${parsed.rawCount})` : ''
                    }.`,
            );
            setBulkJson('');
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
        if (activeTab === 'browse') void loadBrowseArticles();
    }, [bulkJson, resolvedLawName, activeTab, loadBrowseArticles]);

    const handleClearDatabase = useCallback(async () => {
        const targetLawName = String(resolvedLawName ?? '').trim();
        if (!targetLawName) {
            setError('تعذر تحديد القسم القانوني الحالي للحذف.');
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
                setError('لحذف نطاق محدد، أدخل رقم مادة البداية والنهاية (مثل 1 و 300).');
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
            const data = await invokeClearLaws(clearBody);
            const deletedCount = data.deletedCount ?? 0;
            if (deletedCount === 0) {
                setSuccess(
                    `لم تُعثر على مواد محذوفة لـ (${targetLawName}) في قاعدة البيانات — ربما كانت فارغة مسبقاً. إن ما زلت ترى مواداً في إضبارة التنفيذ فهي من الملف المحلي المدمج وليست من قاعدة البيانات.`,
                );
            } else {
                setSuccess(`تم حذف مواد (${targetLawName}) بنجاح. العدد المحذوف: ${deletedCount}.`);
            }
            refreshLawReaderCaches(targetLawName);
            dispatchHqStatusRefresh();
            setBulkProgress(EMPTY_BULK_PROGRESS);
            setBulkJson('');
            setBulkJsonFileName(null);
            setArticleNumber('');
            setContent('');
            hasLoadedBrowseRef.current = false;
            if (activeTab === 'browse') void loadBrowseArticles();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'خطأ غير متوقع أثناء التنظيف.');
        } finally {
            setClearLoading(false);
        }
    }, [activeTab, clearArticleFrom, clearArticleTo, loadBrowseArticles, resolvedLawName]);

    return {
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
        hasLoadedBrowseRef: hasLoadedBrowseRef as MutableRefObject<boolean>,
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
    };
}
