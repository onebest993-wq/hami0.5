import { isAllowedIraqiLawName } from '@/app/constants/iraqiLawCatalog';
import { normalizeArabicDigits } from '@/app/utils/articleNumberRange';
import { dispatchLawsCatalogChanged } from '@/app/kernel/laws/lawCatalogSync';
import { SecureAPIClient, SecureFetchError } from '@/app/services/SecureAPIClient';
import { hqMutatingFetch } from '@/app/services/admin/hqSecureFetch';
import type {
    AddLawInvokeBody,
    AddLawInvokeResult,
    AddLawResponse,
    BrowseLawRow,
    ClearLawsInvokeBody,
    ImportBundleResponse,
    LawsListResponse,
} from '@/app/components/admin/adminLawEntryTypes';

export function parseSecureApiErrorMessage(err: unknown): string {
    if (!(err instanceof SecureFetchError)) {
        return err instanceof Error ? err.message : String(err);
    }
    const text = err.bodyText?.trim() ?? '';
    if (text) {
        try {
            const body = JSON.parse(text) as { error?: string; details?: string };
            const parts = [body.error, body.details].filter(
                (part): part is string => typeof part === 'string' && part.trim().length > 0,
            );
            if (parts.length > 0) return parts.join(' — ');
        } catch {
            if (text.length < 240) return text;
        }
    }
    if (err.status === 401) {
        return 'غير مصرح: استخدم «الدخول كمدير أعلى» أو سجّل دخولاً صالحاً ثم أعد المحاولة.';
    }
    if (err.status === 403) {
        return 'ليس لديك صلاحية إدخال القوانين.';
    }
    if (err.status === 503) {
        return 'قاعدة البيانات غير مهيأة: أضف مفتاح خدمة Supabase في ملف .env ثم أعد تشغيل npm run dev.';
    }
    return err.message || `خطأ HTTP ${err.status}`;
}

export function refreshLawReaderCaches(lawName: string): void {
    dispatchLawsCatalogChanged(lawName);
}

export function mapBrowseLawRows(items: LawsListResponse['items']): BrowseLawRow[] {
    const rows = Array.isArray(items) ? items : [];
    const mapped: BrowseLawRow[] = rows
        .map((row) => ({
            id: String(row?.id ?? `${row?.law_name}-${row?.article_number}`),
            lawName: String(row?.law_name ?? '').trim(),
            articleNumber: String(row?.article_number ?? '').trim() || '—',
            content: String(row?.content ?? '').trim() || '—',
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
    return Array.from(dedup.values());
}

export async function invokeAddLaw(body: AddLawInvokeBody): Promise<AddLawInvokeResult> {
    let data: AddLawResponse | null;
    try {
        data = await hqMutatingFetch<AddLawResponse>('/api/laws/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    } catch (e) {
        throw new Error(parseSecureApiErrorMessage(e));
    }
    if (!data) {
        throw new Error('لم تُرجع الخادم أي بيانات.');
    }
    if (data.ok === false) {
        const parts = [
            typeof data.error === 'string' ? data.error : null,
            typeof data.details === 'string' ? data.details : null,
        ].filter(Boolean);
        throw new Error(parts.join(' — ') || 'رفض الخادم العملية.');
    }
    if (data.ok === true) {
        return {
            message:
                typeof data.message === 'string' && data.message.trim()
                    ? data.message
                    : 'تم حفظ المادة بنجاح.',
        };
    }
    throw new Error('استجابة غير متوقعة من الخادم.');
}

export async function invokeImportLawBundle(
    lawName: string,
    articles: Array<{ article_number: string; content: string }>,
): Promise<ImportBundleResponse> {
    const data = await hqMutatingFetch<ImportBundleResponse>('/api/laws/import-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ law_name: lawName, articles }),
    });
    if (!data || data.ok === false) {
        throw new Error(data?.error || data?.details || 'فشل الرفع الجماعي.');
    }
    return data;
}

export async function invokeListLaws(): Promise<BrowseLawRow[]> {
    const data = await SecureAPIClient.fetchSecure<LawsListResponse>('/api/laws/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    if (!data || data.ok === false) {
        throw new Error((data?.error || data?.details || 'تعذر تحميل المواد.').trim());
    }
    return mapBrowseLawRows(data.items);
}

export async function invokeClearLaws(body: ClearLawsInvokeBody): Promise<AddLawResponse> {
    const data = await hqMutatingFetch<AddLawResponse>('/api/laws/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!data) {
        throw new Error('لم تُرجع الخادم أي بيانات.');
    }
    if (data.ok === false) {
        throw new Error(data.error || 'فشل تنظيف قاعدة البيانات.');
    }
    return data;
}
